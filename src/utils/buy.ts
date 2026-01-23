/**
 * Buy Operations
 *
 * Handles all buy transactions for Solana tokens.
 */

import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { loadConfigFromCookies } from "./storage";
import { TRADING, BASE_CURRENCIES } from "./constants";
import type { ApiResponse } from "./types";
import type {
  WalletBuy,
  BundleMode,
  BuyConfig,
  ServerResponse,
  BuyBundle,
  BuyResult,
} from "./types";
import {
  addTradeHistory,
  checkRateLimit,
  getServerBaseUrl,
  isSelfHostedServer,
  completeBundleSigning,
  splitLargeBundles,
  createKeypairs,
  getSlippageBps,
  getFeeLamports,
  processBatchResults,
  createBatchErrorMessage,
} from "./trading";
import { sendTransactions } from "./transactionService";

export type {
  WalletBuy,
  BundleMode,
  BuyConfig,
  ServerResponse,
  BuyBundle,
  BuyResult,
};

// ============================================================================
// Transaction Preparation
// ============================================================================

/**
 * Get partially prepared transactions from the unified buy endpoint
 */
const getPartiallyPreparedTransactions = async (
  wallets: WalletBuy[],
  config: BuyConfig,
): Promise<BuyBundle[]> => {
  try {
    const appConfig = loadConfigFromCookies();
    const baseUrl = getServerBaseUrl();
    const selfHosted = isSelfHostedServer();

    // Determine if using SOL or stablecoin as input
    const inputMint =
      config.inputMint ||
      appConfig?.baseCurrencyMint ||
      BASE_CURRENCIES.SOL.mint;
    const isNativeSOL = inputMint === BASE_CURRENCIES.SOL.mint;

    const requestBody: Record<string, unknown> = {
      tokenAddress: config.tokenAddress,
      solAmount: config.amount,
    };

    // Add inputMint for non-SOL base currencies
    if (!isNativeSOL) {
      requestBody["inputMint"] = inputMint;
    }

    if (selfHosted) {
      requestBody["walletPrivateKeys"] = wallets.map(
        (wallet) => wallet.privateKey,
      );
    } else {
      requestBody["walletAddresses"] = wallets.map((wallet) => wallet.address);
    }

    if (config.amounts) {
      requestBody["amounts"] = config.amounts;
    }

    requestBody["slippageBps"] = getSlippageBps(config.slippageBps);

    const fees = getFeeLamports(
      wallets.length,
      config.jitoTipLamports,
      config.transactionsFeeLamports,
    );
    Object.assign(requestBody, fees);

    // Use /v2/swap/buy for stablecoins, /v2/sol/buy for SOL
    const endpoint = isNativeSOL
      ? `${baseUrl}/v2/sol/buy`
      : `${baseUrl}/v2/swap/buy`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = (await response.json()) as ApiResponse<{
      bundles?: Array<string[] | BuyBundle>;
      transactions?: string[];
      bundlesSent?: number;
      results?: Array<Record<string, unknown>>;
    }>;

    if (!data.success) {
      throw new Error(
        data.error || "Failed to get partially prepared transactions",
      );
    }

    // Handle self-hosted server response
    if (appConfig?.tradingServerEnabled === "true" && data.data) {
      return [
        { transactions: [], serverResponse: data.data as ServerResponse },
      ];
    }

    // Handle various response formats
    if (data.data?.bundles && Array.isArray(data.data.bundles)) {
      return data.data.bundles.map((bundle: string[] | BuyBundle) =>
        Array.isArray(bundle) ? { transactions: bundle } : bundle,
      );
    }

    if (data.data?.transactions && Array.isArray(data.data.transactions)) {
      return [{ transactions: data.data.transactions }];
    }

    if (
      "transactions" in data &&
      Array.isArray(
        (data as unknown as { transactions: string[] }).transactions,
      )
    ) {
      return [
        {
          transactions: (data as unknown as { transactions: string[] })
            .transactions,
        },
      ];
    }

    if (Array.isArray(data)) {
      return [{ transactions: data as string[] }];
    }

    throw new Error("No transactions returned from backend");
  } catch (error) {
    console.error(
      "[Buy] Error getting partially prepared transactions:",
      error,
    );
    throw error;
  }
};

// ============================================================================
// Execution Modes
// ============================================================================

/**
 * Execute buy in single mode - process each wallet separately
 */
const executeBuySingleMode = async (
  wallets: WalletBuy[],
  config: BuyConfig,
): Promise<BuyResult> => {
  const singleDelay = config.singleDelay || TRADING.DEFAULT_SINGLE_DELAY_MS;
  const results: unknown[] = [];
  let successfulWallets = 0;
  let failedWallets = 0;

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];

    try {
      const partiallyPreparedBundles = await getPartiallyPreparedTransactions(
        [wallet],
        config,
      );

      if (partiallyPreparedBundles.length === 0) {
        failedWallets++;
        continue;
      }

      const walletKeypair = Keypair.fromSecretKey(
        bs58.decode(wallet.privateKey),
      );

      for (const bundle of partiallyPreparedBundles) {
        const signedBundle = completeBundleSigning(bundle, [walletKeypair]);

        if (signedBundle.transactions.length > 0) {
          await checkRateLimit();
          const result = await sendTransactions(signedBundle.transactions);
          results.push(result);
        }
      }

      successfulWallets++;

      if (i < wallets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, singleDelay));
      }
    } catch (error) {
      console.error(`[Buy] Error processing wallet ${wallet.address}:`, error);
      failedWallets++;
    }
  }

  return {
    success: successfulWallets > 0,
    result: results,
    error: createBatchErrorMessage(successfulWallets, failedWallets),
  };
};

/**
 * Execute buy in batch mode - process wallets in batches
 */
const executeBuyBatchMode = async (
  wallets: WalletBuy[],
  config: BuyConfig,
): Promise<BuyResult> => {
  const batchSize = TRADING.DEFAULT_BATCH_SIZE;
  const batchDelay = config.batchDelay || TRADING.DEFAULT_BATCH_DELAY_MS;
  const results: unknown[] = [];
  let successfulBatches = 0;
  let failedBatches = 0;

  const batches: WalletBuy[][] = [];
  for (let i = 0; i < wallets.length; i += batchSize) {
    batches.push(wallets.slice(i, i + batchSize));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      const partiallyPreparedBundles = await getPartiallyPreparedTransactions(
        batch,
        config,
      );

      if (partiallyPreparedBundles.length === 0) {
        failedBatches++;
        continue;
      }

      const walletKeypairs = createKeypairs(batch);
      const splitBundles = splitLargeBundles(partiallyPreparedBundles);
      const signedBundles = splitBundles.map((bundle) =>
        completeBundleSigning(bundle, walletKeypairs),
      );

      for (const bundle of signedBundles) {
        if (bundle.transactions.length > 0) {
          await checkRateLimit();
          const result = await sendTransactions(bundle.transactions);
          results.push(result);
        }
      }

      successfulBatches++;

      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, batchDelay));
      }
    } catch (error) {
      console.error(`[Buy] Error processing batch ${i + 1}:`, error);
      failedBatches++;
    }
  }

  return {
    success: successfulBatches > 0,
    result: results,
    error: createBatchErrorMessage(successfulBatches, failedBatches),
  };
};

/**
 * Execute buy in all-in-one mode - process all wallets simultaneously
 */
const executeBuyAllInOneMode = async (
  wallets: WalletBuy[],
  config: BuyConfig,
): Promise<BuyResult> => {
  const appConfig = loadConfigFromCookies();
  const partiallyPreparedBundles = await getPartiallyPreparedTransactions(
    wallets,
    config,
  );

  if (partiallyPreparedBundles.length === 0) {
    return { success: false, error: "No transactions generated." };
  }

  // Self-hosted server handles everything
  if (appConfig?.tradingServerEnabled === "true") {
    if (partiallyPreparedBundles[0].serverResponse) {
      return {
        success: true,
        result: partiallyPreparedBundles[0].serverResponse,
      };
    }
    return { success: true, result: partiallyPreparedBundles };
  }

  const walletKeypairs = createKeypairs(wallets);
  const splitBundles = splitLargeBundles(partiallyPreparedBundles);
  const signedBundles = splitBundles.map((bundle) =>
    completeBundleSigning(bundle, walletKeypairs),
  );

  const validSignedBundles = signedBundles.filter(
    (bundle) => bundle.transactions.length > 0,
  );

  if (validSignedBundles.length === 0) {
    return { success: false, error: "Failed to sign any transactions" };
  }

  const bundlePromises = validSignedBundles.map(async (bundle, index) => {
    await new Promise((resolve) =>
      setTimeout(resolve, index * TRADING.DEFAULT_BUNDLE_DELAY_MS),
    );

    try {
      const result = await sendTransactions(bundle.transactions);
      return { success: true, result };
    } catch {
      return { success: false };
    }
  });

  const bundleResults = await Promise.allSettled(bundlePromises);
  const { success, results, successCount, failCount } =
    processBatchResults(bundleResults);

  return {
    success,
    result: results,
    error: createBatchErrorMessage(successCount, failCount),
  };
};

// ============================================================================
// Main Export
// ============================================================================

/**
 * Execute unified buy operation
 */
export const executeBuy = async (
  wallets: WalletBuy[],
  config: BuyConfig,
): Promise<BuyResult> => {
  try {
    const appConfig = loadConfigFromCookies();
    let bundleMode = config.bundleMode || "batch";

    if (appConfig?.tradingServerEnabled === "true") {
      bundleMode = "all-in-one";
    }

    // Get the input mint for trade history
    const inputMint =
      config.inputMint ||
      appConfig?.baseCurrencyMint ||
      BASE_CURRENCIES.SOL.mint;

    let result: BuyResult;
    switch (bundleMode) {
      case "single":
        result = await executeBuySingleMode(wallets, config);
        break;
      case "batch":
        result = await executeBuyBatchMode(wallets, config);
        break;
      case "all-in-one":
        result = await executeBuyAllInOneMode(wallets, config);
        break;
      default:
        throw new Error(`Invalid bundle mode: ${bundleMode as string}`);
    }

    addTradeHistory({
      type: "buy",
      tokenAddress: config.tokenAddress,
      walletsCount: wallets.length,
      amount: config.amount,
      amountType: "base-currency",
      baseCurrencyMint: inputMint,
      success: result.success,
      error: result.error,
      bundleMode,
    });

    return result;
  } catch (error) {
    const appConfig = loadConfigFromCookies();
    const inputMint =
      config.inputMint ||
      appConfig?.baseCurrencyMint ||
      BASE_CURRENCIES.SOL.mint;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error executing buy";

    addTradeHistory({
      type: "buy",
      tokenAddress: config.tokenAddress,
      walletsCount: wallets.length,
      amount: config.amount,
      amountType: "base-currency",
      baseCurrencyMint: inputMint,
      success: false,
      error: errorMessage,
      bundleMode: config.bundleMode || "batch",
    });

    return { success: false, error: errorMessage };
  }
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate buy inputs
 */
export const validateBuyInputs = (
  wallets: WalletBuy[],
  config: BuyConfig,
  walletBalances: Map<string, number>,
  baseCurrencySymbol: string = "SOL",
): { valid: boolean; error?: string } => {
  if (!config.tokenAddress) {
    return { valid: false, error: "Invalid token address" };
  }

  if (isNaN(config.amount) || config.amount <= 0) {
    return { valid: false, error: `Invalid ${baseCurrencySymbol} amount` };
  }

  if (config.amounts) {
    if (config.amounts.length !== wallets.length) {
      return {
        valid: false,
        error: "Custom amounts array length must match wallets array length",
      };
    }

    for (const amount of config.amounts) {
      if (isNaN(amount) || amount <= 0) {
        return {
          valid: false,
          error: "All custom amounts must be positive numbers",
        };
      }
    }
  }

  if (
    config.slippageBps !== undefined &&
    (isNaN(config.slippageBps) || config.slippageBps < 0)
  ) {
    return { valid: false, error: "Invalid slippage value" };
  }

  if (!wallets.length) {
    return { valid: false, error: "No wallets provided" };
  }

  for (const wallet of wallets) {
    if (!wallet.address || !wallet.privateKey) {
      return { valid: false, error: "Invalid wallet data" };
    }

    const balance = walletBalances.get(wallet.address) || 0;
    const requiredAmount = config.amounts
      ? config.amounts[wallets.indexOf(wallet)]
      : config.amount;

    if (balance < requiredAmount) {
      return {
        valid: false,
        error: `Wallet ${wallet.address.substring(0, 6)}... has insufficient ${baseCurrencySymbol} balance`,
      };
    }
  }

  return { valid: true };
};

/**
 * Helper function to create buy config with default values
 */
export const createBuyConfig = (config: {
  tokenAddress: string;
  amount: number;
  inputMint?: string;
  amounts?: number[];
  slippageBps?: number;
  jitoTipLamports?: number;
  transactionsFeeLamports?: number;
  bundleMode?: BundleMode;
  batchDelay?: number;
  singleDelay?: number;
}): BuyConfig => ({
  tokenAddress: config.tokenAddress,
  amount: config.amount,
  inputMint: config.inputMint,
  amounts: config.amounts,
  slippageBps: config.slippageBps,
  jitoTipLamports: config.jitoTipLamports,
  transactionsFeeLamports: config.transactionsFeeLamports,
  bundleMode: config.bundleMode || "batch",
  batchDelay: config.batchDelay,
  singleDelay: config.singleDelay,
});
