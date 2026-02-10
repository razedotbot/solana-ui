import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import type { WalletType } from "./types";
import { loadConfigFromCookies } from "./storage";
import { TRADING, RATE_LIMIT, BASE_CURRENCIES, type BaseCurrencyConfig } from "./constants";
import type { SenderResult } from "./types";
import { executeBuy, createBuyConfig } from "./buy";
import type { BundleMode } from "./buy";
import { executeSell, createSellConfig } from "./sell";
import { filterActiveWallets } from "./wallet";

// Re-export sendTransactions from transactionService for convenience
export { sendTransactions } from "./transactionService";

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
  txBase58: string,
  walletKeypairs: Keypair[],
): string | null => {
  try {
    let txBuffer: Uint8Array;
    try {
      txBuffer = bs58.decode(txBase58);
    } catch {
      txBuffer = new Uint8Array(Buffer.from(txBase58, "base64"));
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

// ============================================================================
// Bundle Splitting
// ============================================================================

/**
 * Split large bundles into smaller ones with maximum transactions per bundle
 */
export const splitLargeBundles = (
  bundles: TransactionBundle[],
): TransactionBundle[] => {
  const result: TransactionBundle[] = [];

  for (const bundle of bundles) {
    if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
      continue;
    }

    if (bundle.transactions.length <= TRADING.MAX_TRANSACTIONS_PER_BUNDLE) {
      result.push(bundle);
      continue;
    }

    for (
      let i = 0;
      i < bundle.transactions.length;
      i += TRADING.MAX_TRANSACTIONS_PER_BUNDLE
    ) {
      const chunkTransactions = bundle.transactions.slice(
        i,
        i + TRADING.MAX_TRANSACTIONS_PER_BUNDLE,
      );
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
 * Get fee in lamports based on wallet count
 */
export const getFeeLamports = (
  walletCount: number,
  jitoTipLamports?: number,
  transactionsFeeLamports?: number,
): { jitoTipLamports?: number; transactionsFeeLamports?: number } => {
  const appConfig = loadConfigFromCookies();
  const parsedFeeInSol = Number.parseFloat(appConfig?.transactionFee ?? "");
  const feeInSol = Number.isFinite(parsedFeeInSol)
    ? parsedFeeInSol
    : TRADING.DEFAULT_TRANSACTION_FEE_SOL;

  if (walletCount < 2) {
    return {
      transactionsFeeLamports:
        transactionsFeeLamports ?? Math.floor((feeInSol / 3) * LAMPORTS_PER_SOL),
    };
  }

  return {
    jitoTipLamports: jitoTipLamports ?? Math.floor(feeInSol * LAMPORTS_PER_SOL),
  };
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

export interface TradingConfig {
  tokenAddress: string;
  solAmount?: number;
  sellPercent?: number;
  tokensAmount?: number;
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

const parseOptionalFeeInSol = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const resolveExecutionOverrides = (
  config: TradingConfig,
  slippageBps?: number,
  jitoTipLamports?: number,
  transactionsFeeLamports?: number,
): {
  slippageBps?: number;
  jitoTipLamports?: number;
  transactionsFeeLamports?: number;
  bundleMode?: BundleMode;
  batchDelay?: number;
  singleDelay?: number;
} => {
  const appConfig = loadConfigFromCookies();
  const configuredFeeInSol = parseOptionalFeeInSol(appConfig?.transactionFee);

  return {
    slippageBps: slippageBps ?? parseOptionalInt(appConfig?.slippageBps),
    jitoTipLamports:
      jitoTipLamports ??
      (configuredFeeInSol !== undefined
        ? Math.floor(configuredFeeInSol * LAMPORTS_PER_SOL)
        : undefined),
    transactionsFeeLamports:
      transactionsFeeLamports ??
      (configuredFeeInSol !== undefined
        ? Math.floor((configuredFeeInSol / 3) * LAMPORTS_PER_SOL)
        : undefined),
    bundleMode: config.bundleMode ?? (appConfig?.bundleMode as BundleMode | undefined),
    batchDelay: config.batchDelay ?? parseOptionalInt(appConfig?.batchDelay),
    singleDelay: config.singleDelay ?? parseOptionalInt(appConfig?.singleDelay),
  };
};

// Unified buy function using the new buy.ts
const executeUnifiedBuy = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  slippageBps?: number,
  jitoTipLamports?: number,
  transactionsFeeLamports?: number,
): Promise<TradingResult> => {
  try {
    const overrides = resolveExecutionOverrides(
      config,
      slippageBps,
      jitoTipLamports,
      transactionsFeeLamports,
    );

    const buyConfig = createBuyConfig({
      tokenAddress: config.tokenAddress,
      amount: config.solAmount!,
      slippageBps: overrides.slippageBps,
      jitoTipLamports: overrides.jitoTipLamports,
      transactionsFeeLamports: overrides.transactionsFeeLamports,
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
  slippageBps?: number,
  outputMint?: string,
  jitoTipLamports?: number,
  transactionsFeeLamports?: number,
): Promise<TradingResult> => {
  try {
    const overrides = resolveExecutionOverrides(
      config,
      slippageBps,
      jitoTipLamports,
      transactionsFeeLamports,
    );

    const sellConfig = createSellConfig({
      tokenAddress: config.tokenAddress,
      sellPercent: config.sellPercent,
      tokensAmount: config.tokensAmount,
      slippageBps: overrides.slippageBps,
      outputMint,
      jitoTipLamports: overrides.jitoTipLamports,
      transactionsFeeLamports: overrides.transactionsFeeLamports,
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
      return await executeUnifiedSell(formattedWallets, config);
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
  amountType: "sol" | "percentage" | "base-currency";
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
