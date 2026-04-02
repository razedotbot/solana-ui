import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import type { WalletType } from "./types";
import { loadConfigFromCookies } from "./storage";
import {
  BASE_CURRENCIES,
  DEFAULT_SEND_ENDPOINT,
  RATE_LIMIT,
  TRADING,
  type BaseCurrencyConfig,
} from "./constants";
import type { SenderResult } from "./types";
import { executeBuy, createBuyConfig } from "./buy";
import type { BundleMode } from "./buy";
import { executeSell, createSellConfig } from "./sell";
import { filterActiveWallets } from "./wallet";

// ============================================================================
// Shared Trading Types
// ============================================================================

export interface WindowWithConfig {
  tradingServerUrl?: string;
}

export interface RateLimitState {
  count: number;
  lastReset: number;
  maxBundlesPerSecond: number;
}

export interface TransactionBundle {
  transactions: string[];
}

export interface BatchResult {
  success: boolean;
  results: SenderResult[];
  successCount: number;
  failCount: number;
}

// ============================================================================
// Rate Limiting
// ============================================================================

const rateLimitState: RateLimitState = {
  count: 0,
  lastReset: Date.now(),
  maxBundlesPerSecond: TRADING.MAX_BUNDLES_PER_SECOND,
};

/**
 * Check rate limit and wait if necessary
 */
export const checkRateLimit = async (): Promise<void> => {
  const now = Date.now();

  if (now - rateLimitState.lastReset >= RATE_LIMIT.RESET_INTERVAL_MS) {
    rateLimitState.count = 0;
    rateLimitState.lastReset = now;
  }

  if (rateLimitState.count >= rateLimitState.maxBundlesPerSecond) {
    const waitTime =
      RATE_LIMIT.RESET_INTERVAL_MS - (now - rateLimitState.lastReset);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    rateLimitState.count = 0;
    rateLimitState.lastReset = Date.now();
  }

  rateLimitState.count++;
};

// ============================================================================
// Server URL Resolution
// ============================================================================

/**
 * Get the base URL for trading server
 */
export const getServerBaseUrl = (): string => {
  return (
    (window as WindowWithConfig).tradingServerUrl?.replace(/\/+$/, "") || ""
  );
};

// ============================================================================
// Transaction Sending
// ============================================================================

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: string;
  error?: { message: string; code: number };
}

/**
 * Sends transactions via the user-configured send node (JSON-RPC).
 * Single transaction uses sendTransaction; multiple use sendBundle.
 * @param transactions - Array of base58-encoded serialized transactions
 * @returns Result from the server
 */
/**
 * Send transactions via the configured send node.
 * Accepts base64 or base58-encoded signed transactions (auto-detected).
 * Uses sendTransaction for 1 tx, sendBundle for multiple.
 */
export const sendTransactions = async (
  transactions: string[],
): Promise<SenderResult> => {
  const config = loadConfigFromCookies();
  const endpoint = config?.sendEndpoint || DEFAULT_SEND_ENDPOINT;

  // Normalise to base64: if already base64 keep as-is, else convert from bs58
  const base64Txs = transactions.map((tx) => {
    if (tx.includes("+") || tx.includes("/") || tx.endsWith("=")) {
      return tx;
    }
    try {
      return Buffer.from(bs58.decode(tx)).toString("base64");
    } catch {
      return tx;
    }
  });

  let body: Record<string, unknown>;

  if (base64Txs.length === 1) {
    body = {
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: [base64Txs[0], { encoding: "base64" }],
    };
  } else {
    body = {
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [base64Txs, { encoding: "base64" }],
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = (await response.json()) as JsonRpcResponse;

  if (result.error) {
    throw new Error(result.error.message || "Unknown error sending transactions");
  }

  return { rpc: result.result };
};

// ============================================================================
// Base Currency Resolution
// ============================================================================

/**
 * Resolve base currency from parameter or config, defaulting to SOL
 */
export const resolveBaseCurrency = (
  baseCurrency?: BaseCurrencyConfig,
): BaseCurrencyConfig => {
  if (baseCurrency) return baseCurrency;
  const config = loadConfigFromCookies();
  if (config?.baseCurrencyMint) {
    const found = Object.values(BASE_CURRENCIES).find(
      (c) => c.mint === config.baseCurrencyMint,
    );
    if (found) return found;
  }
  return BASE_CURRENCIES.SOL;
};

// ============================================================================
// Transaction Signing
// ============================================================================

/**
 * Sign a transaction with the provided keypairs
 */
export const signTransaction = (
  txInput: string,
  walletKeypairs: Keypair[],
): string | null => {
  try {
    let txBuffer: Uint8Array;

    // Try base64 first (endpoints return base64 when requested),
    // then fall back to base58
    const isBase64 =
      txInput.includes("+") ||
      txInput.includes("/") ||
      txInput.endsWith("=");

    if (isBase64) {
      txBuffer = new Uint8Array(Buffer.from(txInput, "base64"));
    } else {
      try {
        txBuffer = bs58.decode(txInput);
      } catch {
        txBuffer = new Uint8Array(Buffer.from(txInput, "base64"));
      }
    }

    const transaction = VersionedTransaction.deserialize(txBuffer);

    const signers: Keypair[] = [];
    for (const accountKey of transaction.message.staticAccountKeys) {
      const pubkeyStr = accountKey.toBase58();
      const matchingKeypair = walletKeypairs.find(
        (kp) => kp.publicKey.toBase58() === pubkeyStr,
      );
      if (matchingKeypair && !signers.includes(matchingKeypair)) {
        signers.push(matchingKeypair);
      }
    }

    if (signers.length === 0) {
      return null;
    }

    transaction.sign(signers);
    return bs58.encode(transaction.serialize());
  } catch {
    return null;
  }
};

/**
 * Complete bundle signing for all transactions
 */
export const completeBundleSigning = (
  bundle: TransactionBundle,
  walletKeypairs: Keypair[],
): TransactionBundle => {
  if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
    return { transactions: [] };
  }

  const signedTransactions = bundle.transactions
    .map((tx) => signTransaction(tx, walletKeypairs))
    .filter((tx): tx is string => tx !== null);

  return { transactions: signedTransactions };
};

/**
 * Sign all transactions from bundles and return base64 strings.
 * Keeps base64 encoding throughout — no bs58 roundtrip.
 * Throws if any transaction fails to sign.
 */
export const signAllTransactions = (
  bundles: TransactionBundle[],
  walletKeypairs: Keypair[],
): string[] => {
  const signed: string[] = [];

  for (const bundle of bundles) {
    if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
      continue;
    }

    for (let txIdx = 0; txIdx < bundle.transactions.length; txIdx++) {
      const rawTx = bundle.transactions[txIdx];
      try {
        const isBase64 =
          rawTx.includes("+") || rawTx.includes("/") || rawTx.endsWith("=");
        let txBuffer: Uint8Array;
        if (isBase64) {
          txBuffer = new Uint8Array(Buffer.from(rawTx, "base64"));
        } else {
          try {
            txBuffer = bs58.decode(rawTx);
          } catch {
            txBuffer = new Uint8Array(Buffer.from(rawTx, "base64"));
          }
        }

        console.debug(
          `[signAllTransactions] tx ${txIdx}: encoding=${isBase64 ? "base64" : "base58"}, rawLen=${rawTx.length}, bufferLen=${txBuffer.length}`,
        );

        const transaction = VersionedTransaction.deserialize(txBuffer);

        const signers: Keypair[] = [];
        for (const accountKey of transaction.message.staticAccountKeys) {
          const matchingKeypair = walletKeypairs.find(
            (kp) => kp.publicKey.toBase58() === accountKey.toBase58(),
          );
          if (matchingKeypair && !signers.includes(matchingKeypair)) {
            signers.push(matchingKeypair);
          }
        }

        console.debug(
          `[signAllTransactions] tx ${txIdx}: version=${transaction.version}, signers=${signers.length}, staticKeys=${transaction.message.staticAccountKeys.length}, numSignatures=${transaction.signatures.length}`,
        );

        if (signers.length > 0) {
          transaction.sign(signers);
        }

        const serialized = transaction.serialize();
        console.debug(
          `[signAllTransactions] tx ${txIdx}: serialized OK, size=${serialized.length}/1232`,
        );
        signed.push(Buffer.from(serialized).toString("base64"));
      } catch (err) {
        console.warn(`[signAllTransactions] tx ${txIdx} failed:`, err);
        console.debug(
          `[signAllTransactions] tx ${txIdx} raw (first 80 chars): ${rawTx.substring(0, 80)}...`,
        );
      }
    }
  }

  return signed;
};

// ============================================================================
// Bundle Splitting
// ============================================================================

/**
 * Split large bundles into smaller ones with maximum transactions per bundle
 */
export const splitLargeBundles = (
  bundles: TransactionBundle[],
  maxPerBundle: number = TRADING.MAX_TRANSACTIONS_PER_BUNDLE,
): TransactionBundle[] => {
  const result: TransactionBundle[] = [];

  for (const bundle of bundles) {
    if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
      continue;
    }

    if (bundle.transactions.length <= maxPerBundle) {
      result.push(bundle);
      continue;
    }

    for (let i = 0; i < bundle.transactions.length; i += maxPerBundle) {
      const chunkTransactions = bundle.transactions.slice(i, i + maxPerBundle);
      result.push({ transactions: chunkTransactions });
    }
  }

  return result;
};

/**
 * Wrap an array of signed transactions into a single TransactionBundle.
 * Used by distribute and mixer flows that send all transactions together.
 */
export const prepareTransactionBundles = (
  signedTransactions: string[],
): TransactionBundle[] => {
  return [
    {
      transactions: signedTransactions,
    },
  ];
};

// ============================================================================
// Keypair Creation
// ============================================================================

/**
 * Create keypairs from wallet objects
 */
export const createKeypairs = (
  wallets: { privateKey: string }[],
): Keypair[] => {
  return wallets.map((wallet) =>
    Keypair.fromSecretKey(bs58.decode(wallet.privateKey)),
  );
};

// ============================================================================
// Request Body Helpers
// ============================================================================

const LAMPORTS_PER_SOL = 1_000_000_000;
const MIN_FEE_TIP_LAMPORTS = 1_000_000; // 0.001 SOL

/**
 * Get slippage value from config or use default
 */
export const getSlippageBps = (configSlippage?: number): number => {
  if (configSlippage !== undefined) {
    return configSlippage;
  }

  const appConfig = loadConfigFromCookies();
  if (appConfig?.slippageBps) {
    const parsed = Number.parseInt(appConfig.slippageBps, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return TRADING.DEFAULT_SLIPPAGE_BPS;
};

/**
 * Get fee tip in lamports from settings (min 0.001 SOL = 1,000,000 lamports)
 */
export const getFeeTipLamports = (feeTipLamports?: number): number => {
  if (feeTipLamports !== undefined) {
    return Math.max(feeTipLamports, MIN_FEE_TIP_LAMPORTS);
  }

  const appConfig = loadConfigFromCookies();
  const parsedFeeInSol = Number.parseFloat(appConfig?.transactionFee ?? "");
  const feeInSol = Number.isFinite(parsedFeeInSol)
    ? parsedFeeInSol
    : TRADING.DEFAULT_TRANSACTION_FEE_SOL;

  return Math.max(Math.floor(feeInSol * LAMPORTS_PER_SOL), MIN_FEE_TIP_LAMPORTS);
};

// ============================================================================
// Result Processing
// ============================================================================

/**
 * Process batch results and return summary
 */
export const processBatchResults = (
  senderResults: PromiseSettledResult<{
    success: boolean;
    result?: SenderResult;
  }>[],
): BatchResult => {
  const results: SenderResult[] = [];
  let successCount = 0;
  let failCount = 0;

  senderResults.forEach((result, _index) => {
    if (result.status === "fulfilled") {
      if (result.value.success) {
        if (result.value.result) results.push(result.value.result);
        successCount++;
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }
  });

  return {
    success: successCount > 0,
    results,
    successCount,
    failCount,
  };
};

/**
 * Create error message from batch results
 */
export const createBatchErrorMessage = (
  successCount: number,
  failCount: number,
): string | undefined => {
  if (failCount > 0) {
    return `${failCount} failed, ${successCount} succeeded`;
  }
  return undefined;
};

// ============================================================================
// Trading Configuration Types
// ============================================================================

export type InputMode = "perWallet" | "cumulative";

export interface TradingConfig {
  tokenAddress: string;
  solAmount?: number;
  sellPercent?: number;
  tokensAmount?: number | number[];
  sellInputMode?: InputMode;
  buyInputMode?: InputMode;
  bundleMode?: BundleMode;
  batchDelay?: number;
  singleDelay?: number;
}

export interface FormattedWallet {
  address: string;
  privateKey: string;
}

export interface TradingResult {
  success: boolean;
  error?: string;
}

const parseOptionalInt = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const resolveExecutionOverrides = (
  config: TradingConfig,
): {
  slippageBps?: number;
  feeTipLamports: number;
  bundleMode?: BundleMode;
  batchDelay?: number;
  singleDelay?: number;
} => {
  const appConfig = loadConfigFromCookies();

  return {
    slippageBps: parseOptionalInt(appConfig?.slippageBps),
    feeTipLamports: getFeeTipLamports(),
    bundleMode: config.bundleMode ?? (appConfig?.bundleMode as BundleMode | undefined),
    batchDelay: config.batchDelay ?? parseOptionalInt(appConfig?.batchDelay),
    singleDelay: config.singleDelay ?? parseOptionalInt(appConfig?.singleDelay),
  };
};

// Unified buy function using the new buy.ts
const executeUnifiedBuy = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
): Promise<TradingResult> => {
  try {
    const overrides = resolveExecutionOverrides(config);

    const buyConfig = createBuyConfig({
      tokenAddress: config.tokenAddress,
      amount: config.solAmount!,
      slippageBps: overrides.slippageBps,
      feeTipLamports: overrides.feeTipLamports,
      bundleMode: overrides.bundleMode,
      batchDelay: overrides.batchDelay,
      singleDelay: overrides.singleDelay,
    });

    return await executeBuy(wallets, buyConfig);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

// Unified sell function using the new sell.ts
const executeUnifiedSell = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  tokenBalances?: Map<string, number>,
): Promise<TradingResult> => {
  try {
    const overrides = resolveExecutionOverrides(config);

    let sellPercent = config.sellPercent;
    let tokensAmount: number | number[] | undefined = config.tokensAmount;

    // Convert percentage to per-wallet token amounts when balances are available
    if (sellPercent !== undefined && sellPercent > 0 && !tokensAmount && tokenBalances && tokenBalances.size > 0) {
      const perWalletAmounts: number[] = [];
      let allWalletsHaveBalance = true;

      for (const wallet of wallets) {
        const balance = tokenBalances.get(wallet.address);
        if (balance !== undefined && balance > 0) {
          perWalletAmounts.push(balance * (sellPercent / 100));
        } else {
          allWalletsHaveBalance = false;
          break;
        }
      }

      if (allWalletsHaveBalance && perWalletAmounts.length === wallets.length) {
        tokensAmount = perWalletAmounts;
        sellPercent = undefined;
      }
    }

    const sellConfig = createSellConfig({
      tokenAddress: config.tokenAddress,
      sellPercent: sellPercent,
      tokensAmount: tokensAmount,
      slippageBps: overrides.slippageBps,
      feeTipLamports: overrides.feeTipLamports,
      bundleMode: overrides.bundleMode,
      batchDelay: overrides.batchDelay,
      singleDelay: overrides.singleDelay,
    });

    return await executeSell(wallets, sellConfig);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

// Main trading executor
export const executeTrade = async (
  _dex: string,
  wallets: WalletType[],
  config: TradingConfig,
  isBuyMode: boolean,
  _solBalances: Map<string, number>,
  tokenBalances?: Map<string, number>,
): Promise<TradingResult> => {
  const activeWallets = filterActiveWallets(wallets);

  if (activeWallets.length === 0) {
    return { success: false, error: "Please activate at least one wallet" };
  }

  const formattedWallets = activeWallets.map((wallet) => ({
    address: wallet.address,
    privateKey: wallet.privateKey,
  }));

  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(formattedWallets, config);
    } else {
      return await executeUnifiedSell(formattedWallets, config, tokenBalances);
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

/**
 * Trade history management utilities
 * Stores and retrieves trade history from localStorage
 */

export interface TradeHistoryEntry {
  id: string;
  type: "buy" | "sell";
  tokenAddress: string;
  timestamp: number;
  walletsCount: number;
  amount: number;
  amountType: "sol" | "percentage" | "base-currency" | "tokens";
  baseCurrencyMint?: string;
  success: boolean;
  error?: string;
  bundleMode?: "single" | "batch" | "all-in-one";
}

const STORAGE_KEY = "raze_trade_history";
const MAX_HISTORY_ENTRIES = 50; // Keep last 50 trades

/**
 * Get all trade history entries from localStorage
 */
export const getTradeHistory = (): TradeHistoryEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const history = JSON.parse(stored) as TradeHistoryEntry[];
    // Sort by timestamp descending (newest first)
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
};

/**
 * Add a new trade entry to history
 */
export const addTradeHistory = (
  entry: Omit<TradeHistoryEntry, "id" | "timestamp">,
): void => {
  try {
    const history = getTradeHistory();

    const newEntry: TradeHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
    };

    // Add to beginning of array (newest first)
    history.unshift(newEntry);

    // Keep only the last MAX_HISTORY_ENTRIES entries
    const trimmedHistory = history.slice(0, MAX_HISTORY_ENTRIES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));

    // Dispatch custom event for real-time updates
    window.dispatchEvent(
      new CustomEvent("tradeHistoryUpdated", { detail: newEntry }),
    );
  } catch {
    // Intentionally ignored
  }
};

/**
 * Clear all trade history
 */
export const clearTradeHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("tradeHistoryUpdated"));
  } catch {
    // Intentionally ignored
  }
};

/**
 * Get latest trades (up to limit)
 */
export const getLatestTrades = (limit: number = 10): TradeHistoryEntry[] => {
  const history = getTradeHistory();
  return history.slice(0, limit);
};

/**
 * Get trades for a specific token
 */
export const getTradesForToken = (
  tokenAddress: string,
): TradeHistoryEntry[] => {
  const history = getTradeHistory();
  return history.filter((trade) => trade.tokenAddress === tokenAddress);
};
