/**
 * Wallet management utilities.
 * Handles wallet creation, import, and manipulation operations.
 */

import type { Connection } from "@solana/web3.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { encryptData, decryptData } from "./encryption";
import { deriveWalletFromMnemonic } from "./hdWallet";
import { formatAddress } from "./formatting";
import {
  loadWalletsFromCookies,
  saveMasterWallets,
  loadMasterWallets,
} from "./storage";
import type { WalletType, WalletCategory, MasterWallet } from "./types";
import { BASE_CURRENCIES, BALANCE_REFRESH, type BaseCurrencyConfig } from "./constants";

// ============= ID Generation =============

/**
 * Generate unique wallet ID with timestamp and random component.
 */
export function generateWalletId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

// ============= Wallet Operations =============

/**
 * Toggle a wallet's active state.
 */
export function toggleWallet(wallets: WalletType[], id: number): WalletType[] {
  return wallets.map((wallet) =>
    wallet.id === id ? { ...wallet, isActive: !wallet.isActive } : wallet,
  );
}

/**
 * Delete a wallet from the list.
 */
export function deleteWallet(wallets: WalletType[], id: number): WalletType[] {
  return wallets.filter((wallet) => wallet.id !== id);
}

/**
 * Create a new random wallet.
 */
export function createNewWallet(): WalletType {
  const keypair = Keypair.generate();
  const address = keypair.publicKey.toString();
  const privateKey = bs58.encode(keypair.secretKey);

  return {
    id: generateWalletId(),
    address,
    privateKey,
    isActive: false,
    category: "Medium",
    source: "imported",
  };
}

/**
 * Import a wallet from a private key string.
 */
export function importWallet(privateKeyString: string): {
  wallet: WalletType | null;
  error?: string;
} {
  try {
    if (!privateKeyString.trim()) {
      return { wallet: null, error: "Private key cannot be empty" };
    }

    let privateKeyBytes;
    try {
      privateKeyBytes = bs58.decode(privateKeyString);
      if (privateKeyBytes.length !== 64) {
        return { wallet: null, error: "Invalid private key length" };
      }
    } catch {
      return { wallet: null, error: "Invalid private key format" };
    }

    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    const address = keypair.publicKey.toString();

    const wallet: WalletType = {
      id: generateWalletId(),
      address,
      privateKey: privateKeyString,
      isActive: false,
      category: "Medium",
      source: "imported",
    };

    return { wallet };
  } catch {
    return { wallet: null, error: "Failed to import wallet" };
  }
}

/**
 * Get wallet display name (label or formatted address).
 */
export function getWalletDisplayName(wallet: WalletType): string {
  return wallet.label && wallet.label.trim()
    ? wallet.label
    : formatAddress(wallet.address);
}

/**
 * Get all wallets from storage.
 */
export function getWallets(): WalletType[] {
  try {
    return loadWalletsFromCookies();
  } catch {
    return [];
  }
}

/**
 * Get all active wallets from storage.
 */
export function getActiveWallets(): WalletType[] {
  try {
    const wallets = loadWalletsFromCookies();
    return wallets.filter((wallet: WalletType) => wallet.isActive);
  } catch {
    return [];
  }
}

/**
 * Get private keys of all active wallets as comma-separated string.
 */
export function getActiveWalletPrivateKeys(): string {
  try {
    const activeWallets = getActiveWallets();
    return activeWallets.map((wallet) => wallet.privateKey).join(",");
  } catch {
    return "";
  }
}

// ============= Master Wallet Operations =============

/**
 * Create a new master wallet entry.
 */
export function createMasterWallet(
  name: string,
  mnemonic: string,
  color?: string,
): MasterWallet {
  const encryptedMnemonic = encryptData(mnemonic);

  return {
    id: `master_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    encryptedMnemonic,
    accountCount: 0,
    createdAt: Date.now(),
    color,
  };
}

/**
 * Get mnemonic from master wallet (decrypted).
 */
export function getMasterWalletMnemonic(masterWallet: MasterWallet): string {
  try {
    return decryptData(masterWallet.encryptedMnemonic);
  } catch {
    throw new Error("Failed to decrypt mnemonic");
  }
}

/**
 * Update master wallet account count.
 */
export function updateMasterWalletAccountCount(
  masterWallets: MasterWallet[],
  masterWalletId: string,
  accountCount: number,
): MasterWallet[] {
  return masterWallets.map((mw) =>
    mw.id === masterWalletId ? { ...mw, accountCount } : mw,
  );
}

/**
 * Delete a master wallet.
 */
export function deleteMasterWallet(
  masterWallets: MasterWallet[],
  masterWalletId: string,
): MasterWallet[] {
  return masterWallets.filter((mw) => mw.id !== masterWalletId);
}

/**
 * Create HD-derived wallet from master wallet.
 */
export function createHDWalletFromMaster(
  masterWallet: MasterWallet,
  accountIndex: number,
  category: WalletCategory = "Medium",
): WalletType {
  const mnemonic = getMasterWalletMnemonic(masterWallet);
  const derived = deriveWalletFromMnemonic(mnemonic, accountIndex);

  return {
    id: generateWalletId() + accountIndex,
    address: derived.address,
    privateKey: derived.privateKey,
    isActive: false,
    category,
    source: "hd-derived",
    masterWalletId: masterWallet.id,
    derivationIndex: accountIndex,
  };
}

// ============= Balance Operations =============

/**
 * Helper to add timeout to promises.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("RPC request timeout")), timeoutMs),
    ),
  ]);
}

/**
 * Fetch token balance for a wallet.
 */
export async function fetchTokenBalance(
  connection: Connection,
  walletAddress: string,
  tokenMint: string,
): Promise<number> {
  const walletPublicKey = new PublicKey(walletAddress);
  const tokenMintPublicKey = new PublicKey(tokenMint);

  const tokenAccounts = await withTimeout(
    connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { mint: tokenMintPublicKey },
      "processed",
    ),
    1000,
  );

  if (tokenAccounts.value.length === 0) return 0;

  const parsedData = tokenAccounts.value[0].account.data.parsed as {
    info: { tokenAmount: { uiAmount: number | null } };
  };
  const balance = parsedData.info.tokenAmount.uiAmount;
  return balance || 0;
}

/**
 * Fetch SOL balance for a wallet.
 */
export async function fetchSolBalance(
  connection: Connection,
  walletAddress: string,
): Promise<number> {
  const publicKey = new PublicKey(walletAddress);
  const balance = await withTimeout(
    connection.getBalance(publicKey, "processed"),
    1000,
  );
  return balance / 1e9;
}

/**
 * Fetch base currency balance for a wallet.
 * Supports both native SOL and SPL token base currencies (USDC, USD1).
 */
export async function fetchBaseCurrencyBalance(
  connection: Connection,
  walletAddress: string,
  baseCurrency: BaseCurrencyConfig,
): Promise<number> {
  if (baseCurrency.isNative) {
    // Native SOL - use getBalance
    const publicKey = new PublicKey(walletAddress);
    const balance = await withTimeout(
      connection.getBalance(publicKey, "processed"),
      1000,
    );
    return balance / Math.pow(10, baseCurrency.decimals);
  } else {
    // SPL Token (USDC, USD1) - use token account balance
    return await fetchTokenBalance(
      connection,
      walletAddress,
      baseCurrency.mint,
    );
  }
}

/**
 * Options for balance refresh.
 */
export interface BalanceRefreshOptions {
  batchSize?: number;
  delay?: number;
  onlyIfZeroOrNull?: boolean;
  onRateLimitError?: () => void;
}

const isOperationActiveWallet = (wallet: WalletType): boolean =>
  wallet.isActive && !wallet.isArchived;

const isRateLimitErr = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.toLowerCase().includes("rate limit") ||
    msg.toLowerCase().includes("too many requests")
  );
};

/**
 * Fetch both base currency and token balances for all wallets.
 * Uses auto-fallback: parallel → batch → sequential on RPC rate limit errors.
 */
export async function fetchWalletBalances(
  connectionOrRpcManager:
    | Connection
    | { createConnection: () => Promise<Connection> },
  wallets: WalletType[],
  tokenAddress: string,
  setBaseCurrencyBalances: (balances: Map<string, number>) => void,
  setTokenBalances: (balances: Map<string, number>) => void,
  currentBaseCurrencyBalances?: Map<string, number>,
  currentTokenBalances?: Map<string, number>,
  onlyIfZeroOrNullOrOptions: boolean | BalanceRefreshOptions = false,
  baseCurrency: BaseCurrencyConfig = BASE_CURRENCIES.SOL,
): Promise<{
  baseCurrencyBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
}> {
  const options: BalanceRefreshOptions =
    typeof onlyIfZeroOrNullOrOptions === "boolean"
      ? { onlyIfZeroOrNull: onlyIfZeroOrNullOrOptions }
      : onlyIfZeroOrNullOrOptions;

  const {
    batchSize = BALANCE_REFRESH.DEFAULT_BATCH_SIZE,
    delay = BALANCE_REFRESH.DEFAULT_DELAY_MS,
    onlyIfZeroOrNull = false,
    onRateLimitError,
  } = options;

  let rateLimitToastShown = false;

  const newBaseCurrencyBalances = new Map(
    currentBaseCurrencyBalances || new Map<string, number>(),
  );
  const newTokenBalances = new Map(
    currentTokenBalances || new Map<string, number>(),
  );

  const isRpcManager =
    typeof connectionOrRpcManager === "object" &&
    "createConnection" in connectionOrRpcManager;

  const processedWallets = new Set<string>();

  /**
   * Process a single wallet. Returns true on success or non-rate-limit error,
   * false when a rate limit error is detected.
   */
  const processWallet = async (wallet: WalletType): Promise<boolean> => {
    try {
      let connection: Connection;
      if (isRpcManager) {
        connection = await (
          connectionOrRpcManager as {
            createConnection: () => Promise<Connection>;
          }
        ).createConnection();
      } else {
        connection = connectionOrRpcManager;
      }

      const currentBaseCurrencyBalance = currentBaseCurrencyBalances?.get(
        wallet.address,
      );
      const shouldFetchBaseCurrency =
        !onlyIfZeroOrNull ||
        currentBaseCurrencyBalance === undefined ||
        currentBaseCurrencyBalance === null ||
        currentBaseCurrencyBalance === 0;

      if (shouldFetchBaseCurrency) {
        const balance = await fetchBaseCurrencyBalance(
          connection,
          wallet.address,
          baseCurrency,
        );
        newBaseCurrencyBalances.set(wallet.address, balance);
      }

      if (tokenAddress) {
        const currentTokenBalance = currentTokenBalances?.get(wallet.address);
        const shouldFetchToken =
          !onlyIfZeroOrNull ||
          currentTokenBalance === undefined ||
          currentTokenBalance === null ||
          currentTokenBalance === 0;

        if (shouldFetchToken) {
          const tokenBalance = await fetchTokenBalance(
            connection,
            wallet.address,
            tokenAddress,
          );
          newTokenBalances.set(wallet.address, tokenBalance);
        }
      }

      processedWallets.add(wallet.address);
      return true;
    } catch (err) {
      if (isRateLimitErr(err)) {
        if (!rateLimitToastShown && onRateLimitError) {
          rateLimitToastShown = true;
          onRateLimitError();
        }
        return false;
      }
      // Non-rate-limit error: skip wallet but don't trigger fallback
      processedWallets.add(wallet.address);
      return true;
    }
  };

  const updateState = (): void => {
    setBaseCurrencyBalances(new Map(newBaseCurrencyBalances));
    if (tokenAddress) {
      setTokenBalances(new Map(newTokenBalances));
    }
  };

  const getUnprocessed = (): WalletType[] =>
    wallets.filter((w) => !processedWallets.has(w.address));

  // Phase 1: Try parallel (all at once)
  let rateLimitHit = false;
  const parallelResults = await Promise.all(
    wallets.map((wallet) => processWallet(wallet)),
  );
  updateState();

  if (parallelResults.some((ok) => !ok)) {
    rateLimitHit = true;
  }

  // Phase 2: Retry failed wallets in batch mode
  if (rateLimitHit) {
    const remaining = getUnprocessed();
    if (remaining.length > 0) {
      rateLimitHit = false;
      for (let i = 0; i < remaining.length; i += batchSize) {
        const batch = remaining.slice(
          i,
          Math.min(i + batchSize, remaining.length),
        );
        const batchResults = await Promise.all(
          batch.map((wallet) => processWallet(wallet)),
        );
        updateState();
        if (batchResults.some((ok) => !ok)) {
          rateLimitHit = true;
        }
        if (i + batchSize < remaining.length && delay > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  // Phase 3: Retry remaining wallets sequentially
  if (rateLimitHit) {
    const remaining = getUnprocessed();
    for (let i = 0; i < remaining.length; i++) {
      await processWallet(remaining[i]);
      updateState();
      if (i < remaining.length - 1 && delay > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return {
    baseCurrencyBalances: newBaseCurrencyBalances,
    tokenBalances: newTokenBalances,
  };
}

// ============= Wallet Management Utilities =============

/**
 * Handle wallet sorting by balance.
 */
export function handleSortWallets(
  wallets: WalletType[],
  sortDirection: "asc" | "desc",
  setSortDirection: (direction: "asc" | "desc") => void,
  baseCurrencyBalances: Map<string, number>,
  setWallets: (wallets: WalletType[]) => void,
): void {
  const newDirection = sortDirection === "asc" ? "desc" : "asc";
  setSortDirection(newDirection);

  const sortedWallets = [...wallets].sort((a, b) => {
    const balanceA = baseCurrencyBalances.get(a.address) || 0;
    const balanceB = baseCurrencyBalances.get(b.address) || 0;

    if (newDirection === "asc") {
      return balanceA - balanceB;
    } else {
      return balanceB - balanceA;
    }
  });

  setWallets(sortedWallets);
}

/**
 * Clean up wallets by removing empty and duplicate wallets.
 */
export function handleCleanupWallets(
  wallets: WalletType[],
  baseCurrencyBalances: Map<string, number>,
  tokenBalances: Map<string, number>,
  setWallets: (wallets: WalletType[]) => void,
  showToast: (message: string, type: "success" | "error") => void,
): void {
  const seenAddresses = new Set<string>();
  let emptyCount = 0;
  let duplicateCount = 0;

  const cleanedWallets = wallets.filter((wallet) => {
    const baseCurrencyBalance = baseCurrencyBalances.get(wallet.address) || 0;
    const tokenBalance = tokenBalances.get(wallet.address) || 0;

    if (baseCurrencyBalance <= 0 && tokenBalance <= 0) {
      emptyCount++;
      return false;
    }

    if (seenAddresses.has(wallet.address)) {
      duplicateCount++;
      return false;
    }

    seenAddresses.add(wallet.address);
    return true;
  });

  if (emptyCount > 0 || duplicateCount > 0) {
    const messages: string[] = [];
    if (emptyCount > 0) {
      messages.push(`${emptyCount} empty wallet${emptyCount === 1 ? "" : "s"}`);
    }
    if (duplicateCount > 0) {
      messages.push(`${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"}`);
    }
    showToast(`Removed ${messages.join(" and ")}`, "success");
  } else {
    showToast("No empty wallets or duplicates found", "success");
  }

  setWallets(cleanedWallets);
}

// ============= Clipboard & Download =============

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard(
  text: string,
  showToast: (message: string, type: "success" | "error") => void,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied successfully", "success");
    return true;
  } catch {
    return false;
  }
}

/**
 * Download a single wallet's private key.
 */
export function downloadPrivateKey(wallet: WalletType): void {
  const blob = new Blob([wallet.privateKey], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wallet-${wallet.address.slice(0, 8)}.key`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download all wallets as a text file.
 */
export function downloadAllWallets(wallets: WalletType[]): void {
  const formattedText = wallets
    .map((wallet) => `${wallet.address}\n${wallet.privateKey}\n\n`)
    .join("");

  const blob = new Blob([formattedText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wallets.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============= Wallet Filtering Utilities =============

/**
 * Counts the number of active wallets in the provided wallet array.
 * Note: This operates on an in-memory array, not storage.
 * @param wallets Array of wallet objects
 * @returns Number of active wallets (excludes archived wallets)
 */
export const countActiveWallets = (wallets: WalletType[]): number => {
  return wallets.filter(isOperationActiveWallet).length;
};

/**
 * Returns an array of only the active wallets from a provided array.
 * Note: This operates on an in-memory array, not storage.
 * @param wallets Array of wallet objects
 * @returns Array of active wallets (excludes archived wallets)
 */
export const filterActiveWallets = (wallets: WalletType[]): WalletType[] => {
  return wallets.filter(isOperationActiveWallet);
};

// Re-export storage functions for convenience
export { saveMasterWallets, loadMasterWallets };
