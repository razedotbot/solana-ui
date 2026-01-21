import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import type { WalletType } from "./types";
import { loadConfigFromCookies } from "./storage";
import { TRADING, RATE_LIMIT } from "./constants";
import type { BundleResult } from "./types";
import { executeBuy, createBuyConfig } from "./buy";
import type { BundleMode } from "./buy";
import { executeSell, createSellConfig } from "./sell";

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
  serverResponse?: unknown;
}

export interface BatchResult {
  success: boolean;
  results: BundleResult[];
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
  const config = loadConfigFromCookies();

  if (config?.tradingServerEnabled === "true" && config?.tradingServerUrl) {
    return config.tradingServerUrl.replace(/\/+$/, "");
  }

  return (
    (window as WindowWithConfig).tradingServerUrl?.replace(/\/+$/, "") || ""
  );
};

/**
 * Check if self-hosted trading server is enabled
 */
export const isSelfHostedServer = (): boolean => {
  const config = loadConfigFromCookies();
  return config?.tradingServerEnabled === "true";
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
      console.warn("[Trading] No matching signers found for transaction");
      return null;
    }

    transaction.sign(signers);
    return bs58.encode(transaction.serialize());
  } catch (error) {
    console.error("[Trading] Error signing transaction:", error);
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
    console.error("[Trading] Invalid bundle format:", bundle);
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

/**
 * Get slippage value from config or use default
 */
export const getSlippageBps = (configSlippage?: number): number => {
  if (configSlippage !== undefined) {
    return configSlippage;
  }

  const appConfig = loadConfigFromCookies();
  if (appConfig?.slippageBps) {
    return parseInt(appConfig.slippageBps);
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
  const feeInSol = parseFloat(
    appConfig?.transactionFee || String(TRADING.DEFAULT_TRANSACTION_FEE_SOL),
  );

  if (walletCount < 2) {
    return {
      transactionsFeeLamports:
        transactionsFeeLamports ?? Math.floor((feeInSol / 3) * 1_000_000_000),
    };
  }

  return {
    jitoTipLamports: jitoTipLamports ?? Math.floor(feeInSol * 1_000_000_000),
  };
};

// ============================================================================
// Result Processing
// ============================================================================

/**
 * Process batch results and return summary
 */
export const processBatchResults = (
  bundleResults: PromiseSettledResult<{
    success: boolean;
    result?: BundleResult;
  }>[],
): BatchResult => {
  const results: BundleResult[] = [];
  let successCount = 0;
  let failCount = 0;

  bundleResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      if (result.value.success) {
        if (result.value.result) results.push(result.value.result);
        successCount++;
      } else {
        failCount++;
      }
    } else {
      console.error(
        `[Trading] Bundle ${index + 1} promise rejected:`,
        result.reason,
      );
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

// Unified buy function using the new buy.ts
const executeUnifiedBuy = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  slippageBps?: number,
  jitoTipLamports?: number,
  transactionsFeeLamports?: number,
): Promise<TradingResult> => {
  try {
    // Load config once for all settings
    const { loadConfigFromCookies } = await import("./storage");
    const appConfig = loadConfigFromCookies();

    // Use provided slippage or fall back to config default
    let finalSlippageBps = slippageBps;
    if (finalSlippageBps === undefined && appConfig?.slippageBps) {
      finalSlippageBps = parseInt(appConfig.slippageBps);
    }

    // Use provided jito tip or fall back to config default
    let finalJitoTipLamports = jitoTipLamports;
    if (finalJitoTipLamports === undefined && appConfig?.transactionFee) {
      const feeInSol = appConfig.transactionFee;
      finalJitoTipLamports = Math.floor(parseFloat(feeInSol) * 1_000_000_000);
    }

    // Use provided transactions fee or calculate from config
    let finalTransactionsFeeLamports = transactionsFeeLamports;
    if (
      finalTransactionsFeeLamports === undefined &&
      appConfig?.transactionFee
    ) {
      const feeInSol = appConfig.transactionFee;
      finalTransactionsFeeLamports = Math.floor(
        (parseFloat(feeInSol) / 3) * 1_000_000_000,
      );
    }

    // Use provided bundle mode or fall back to config default
    let finalBundleMode = config.bundleMode;
    if (finalBundleMode === undefined && appConfig?.bundleMode) {
      finalBundleMode = appConfig.bundleMode as BundleMode;
    }

    // Use provided delays or fall back to config defaults
    let finalBatchDelay = config.batchDelay;
    if (finalBatchDelay === undefined && appConfig?.batchDelay) {
      finalBatchDelay = parseInt(appConfig.batchDelay);
    }

    let finalSingleDelay = config.singleDelay;
    if (finalSingleDelay === undefined && appConfig?.singleDelay) {
      finalSingleDelay = parseInt(appConfig.singleDelay);
    }

    const buyConfig = createBuyConfig({
      tokenAddress: config.tokenAddress,
      solAmount: config.solAmount!,
      slippageBps: finalSlippageBps,
      jitoTipLamports: finalJitoTipLamports,
      transactionsFeeLamports: finalTransactionsFeeLamports,
      bundleMode: finalBundleMode,
      batchDelay: finalBatchDelay,
      singleDelay: finalSingleDelay,
    });

    return await executeBuy(wallets, buyConfig);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
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
    // Load config once for all settings
    const { loadConfigFromCookies } = await import("./storage");
    const appConfig = loadConfigFromCookies();

    // Use provided slippage or fall back to config default
    let finalSlippageBps = slippageBps;
    if (finalSlippageBps === undefined && appConfig?.slippageBps) {
      finalSlippageBps = parseInt(appConfig.slippageBps);
    }

    // Use provided jito tip or fall back to config default
    let finalJitoTipLamports = jitoTipLamports;
    if (finalJitoTipLamports === undefined && appConfig?.transactionFee) {
      const feeInSol = appConfig.transactionFee;
      finalJitoTipLamports = Math.floor(parseFloat(feeInSol) * 1_000_000_000);
    }

    // Use provided transactions fee or calculate from config
    let finalTransactionsFeeLamports = transactionsFeeLamports;
    if (
      finalTransactionsFeeLamports === undefined &&
      appConfig?.transactionFee
    ) {
      const feeInSol = appConfig.transactionFee;
      finalTransactionsFeeLamports = Math.floor(
        (parseFloat(feeInSol) / 3) * 1_000_000_000,
      );
    }

    // Use provided bundle mode or fall back to config default
    let finalBundleMode = config.bundleMode;
    if (finalBundleMode === undefined && appConfig?.bundleMode) {
      finalBundleMode = appConfig.bundleMode as BundleMode;
    }

    // Use provided delays or fall back to config defaults
    let finalBatchDelay = config.batchDelay;
    if (finalBatchDelay === undefined && appConfig?.batchDelay) {
      finalBatchDelay = parseInt(appConfig.batchDelay);
    }

    let finalSingleDelay = config.singleDelay;
    if (finalSingleDelay === undefined && appConfig?.singleDelay) {
      finalSingleDelay = parseInt(appConfig.singleDelay);
    }

    const sellConfig = createSellConfig({
      tokenAddress: config.tokenAddress,
      sellPercent: config.sellPercent,
      tokensAmount: config.tokensAmount,
      slippageBps: finalSlippageBps,
      outputMint,
      jitoTipLamports: finalJitoTipLamports,
      transactionsFeeLamports: finalTransactionsFeeLamports,
      bundleMode: finalBundleMode,
      batchDelay: finalBatchDelay,
      singleDelay: finalSingleDelay,
    });

    return await executeSell(wallets, sellConfig);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// Main trading executor
export const executeTrade = async (
  _dex: string,
  wallets: WalletType[],
  config: TradingConfig,
  isBuyMode: boolean,
  solBalances: Map<string, number>,
): Promise<TradingResult> => {
  const activeWallets = wallets.filter((wallet) => wallet.isActive);

  if (activeWallets.length === 0) {
    return { success: false, error: "Please activate at least one wallet" };
  }

  const formattedWallets = activeWallets.map((wallet) => ({
    address: wallet.address,
    privateKey: wallet.privateKey,
  }));

  const walletBalances = new Map<string, number>();
  activeWallets.forEach((wallet) => {
    const balance = solBalances.get(wallet.address) || 0;
    walletBalances.set(wallet.address, balance);
  });
  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(formattedWallets, config);
    } else {
      return await executeUnifiedSell(formattedWallets, config);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
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
  amountType: "sol" | "percentage";
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
  } catch (error) {
    console.error("Error reading trade history:", error);
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
  } catch (error) {
    console.error("Error saving trade history:", error);
  }
};

/**
 * Clear all trade history
 */
export const clearTradeHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("tradeHistoryUpdated"));
  } catch (error) {
    console.error("Error clearing trade history:", error);
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
