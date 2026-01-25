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
import { BASE_CURRENCIES, type BaseCurrencyConfig } from "./constants";

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
  } catch (error) {
    console.error("Error importing wallet:", error);
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
  } catch (error) {
    console.error("Error loading wallets:", error);
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
  } catch (error) {
    console.error("Error loading active wallets from cookies:", error);
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
  } catch (error) {
    console.error("Error getting private keys:", error);
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
  } catch (error) {
    console.error("Error decrypting master wallet mnemonic:", error);
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
 * Refresh a wallet's token balance.
 */
export async function refreshWalletBalance(
  wallet: WalletType,
  connection: Connection,
  tokenAddress?: string,
): Promise<WalletType> {
  try {
    if (!tokenAddress) return wallet;

    const tokenBalance = await fetchTokenBalance(
      connection,
      wallet.address,
      tokenAddress,
    );

    return {
      ...wallet,
      tokenBalance: tokenBalance,
    };
  } catch (error) {
    console.error("Error refreshing wallet balance:", error);
    return wallet;
  }
}

/**
 * Balance refresh strategy type.
 */
export type BalanceRefreshStrategy = "sequential" | "batch" | "parallel";

/**
 * Options for balance refresh.
 */
export interface BalanceRefreshOptions {
  strategy?: BalanceRefreshStrategy;
  batchSize?: number;
  delay?: number;
  onlyIfZeroOrNull?: boolean;
  onRateLimitError?: () => void;
}

/**
 * Fetch both base currency and token balances for all wallets with configurable refresh strategy.
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
    strategy = "batch",
    batchSize = 5,
    delay = 50,
    onlyIfZeroOrNull = false,
    onRateLimitError,
  } = options;

  // Track if we've shown the rate limit toast to avoid flooding
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

  const processWallet = async (wallet: WalletType): Promise<void> => {
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
    } catch (error) {
      // Check for rate limit errors (429 or timeout after retries)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        !rateLimitToastShown &&
        onRateLimitError &&
        (errorMessage.includes("429") ||
          errorMessage.toLowerCase().includes("timeout") ||
          errorMessage.toLowerCase().includes("rate limit"))
      ) {
        rateLimitToastShown = true;
        onRateLimitError();
      }
    }
  };

  const updateState = (): void => {
    setBaseCurrencyBalances(new Map(newBaseCurrencyBalances));
    if (tokenAddress) {
      setTokenBalances(new Map(newTokenBalances));
    }
  };

  switch (strategy) {
    case "sequential": {
      for (let i = 0; i < wallets.length; i++) {
        await processWallet(wallets[i]);
        updateState();
        if (i < wallets.length - 1 && delay > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
      }
      break;
    }

    case "batch": {
      for (let i = 0; i < wallets.length; i += batchSize) {
        const batch = wallets.slice(i, Math.min(i + batchSize, wallets.length));
        await Promise.all(batch.map((wallet) => processWallet(wallet)));
        updateState();
        if (i + batchSize < wallets.length && delay > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
      }
      break;
    }

    case "parallel": {
      await Promise.all(wallets.map((wallet) => processWallet(wallet)));
      updateState();
      break;
    }

    default: {
      for (let i = 0; i < wallets.length; i += batchSize) {
        const batch = wallets.slice(i, Math.min(i + batchSize, wallets.length));
        await Promise.all(batch.map((wallet) => processWallet(wallet)));
        updateState();
        if (i + batchSize < wallets.length && delay > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
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
      messages.push(
        `${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"}`,
      );
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
  } catch (error) {
    console.error("Failed to copy:", error);
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
  return wallets.filter((wallet) => wallet.isActive && !wallet.isArchived)
    .length;
};

/**
 * Returns an array of only the active wallets from a provided array.
 * Note: This operates on an in-memory array, not storage.
 * @param wallets Array of wallet objects
 * @returns Array of active wallets (excludes archived wallets)
 */
export const filterActiveWallets = (wallets: WalletType[]): WalletType[] => {
  return wallets.filter((wallet) => wallet.isActive && !wallet.isArchived);
};

// Re-export storage functions for convenience
export { saveMasterWallets, loadMasterWallets };
