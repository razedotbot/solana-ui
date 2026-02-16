/**
 * Sell Operations
 *
 * Handles all sell transactions for Solana tokens.
 */

import { loadConfigFromCookies } from "./storage";
import { TRADING, BASE_CURRENCIES, API_ENDPOINTS } from "./constants";
import type {
  WalletSell,
  BundleMode,
  SellConfig,
  SellBundle,
  SellResult,
} from "./types";
import { parseTransactionBundles, type RawTransactionResponse } from "./transactionParsing";
import {
  addTradeHistory,
  checkRateLimit,
  getServerBaseUrl,
  completeBundleSigning,
  splitLargeBundles,
  createKeypairs,
  getSlippageBps,
  getFeeTipLamports,
  processBatchResults,
  createBatchErrorMessage,
  sendTransactions,
} from "./trading";

export type {
  WalletSell,
  BundleMode,
  SellConfig,
  SellBundle,
  SellResult,
};

// ============================================================================
// Transaction Preparation
// ============================================================================

/**
 * Get partially prepared sell transactions from backend
 */
const getPartiallyPreparedSellTransactions = async (
  wallets: WalletSell[],
  sellConfig: SellConfig,
): Promise<SellBundle[]> => {

    const baseUrl = getServerBaseUrl();

    const requestBody: Record<string, unknown> = {
      tokenAddress: sellConfig.tokenAddress,
      walletAddresses: wallets.map((wallet) => wallet.address),
    };

    if (sellConfig.tokensAmount !== undefined) {
      requestBody["tokensAmount"] = sellConfig.tokensAmount;
    } else {
      requestBody["percentage"] = sellConfig.sellPercent;
    }

    requestBody["slippageBps"] = getSlippageBps(sellConfig.slippageBps);
    requestBody["feeTipLamports"] = getFeeTipLamports(sellConfig.feeTipLamports);
    requestBody["encoding"] = "base64";

    const endpoint = `${baseUrl}${API_ENDPOINTS.SOL_SELL}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = (await response.json()) as RawTransactionResponse;

    if (!data.success) {
      throw new Error(
        data.error || "Failed to get partially prepared transactions",
      );
    }

    return parseTransactionBundles(data) as SellBundle[];
};

// ============================================================================
// Execution Modes
// ============================================================================

/**
 * Execute sell in single mode - process each wallet separately
 */
const executeSellSingleMode = async (
  wallets: WalletSell[],
  sellConfig: SellConfig,
): Promise<SellResult> => {
  const results: unknown[] = [];
  let successfulWallets = 0;
  let failedWallets = 0;

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];

    try {
      const partiallyPreparedBundles =
        await getPartiallyPreparedSellTransactions([wallet], sellConfig);

      if (partiallyPreparedBundles.length === 0) {
        failedWallets++;
        continue;
      }

      const walletKeypairs = createKeypairs([wallet]);

      for (const bundle of partiallyPreparedBundles) {
        const signedBundle = completeBundleSigning(bundle, walletKeypairs);

        if (signedBundle.transactions.length > 0) {
          await checkRateLimit();
          const result = await sendTransactions(signedBundle.transactions);
          results.push(result);
        }
      }

      successfulWallets++;

      if (i < wallets.length - 1) {
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            sellConfig.singleDelay || TRADING.DEFAULT_SINGLE_DELAY_MS,
          ),
        );
      }
    } catch {
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
 * Execute sell in batch mode - process wallets in batches
 */
const executeSellBatchMode = async (
  wallets: WalletSell[],
  sellConfig: SellConfig,
): Promise<SellResult> => {
  const batchSize = TRADING.MAX_TRANSACTIONS_PER_BUNDLE;
  const batchDelay = sellConfig.batchDelay || TRADING.DEFAULT_BATCH_DELAY_MS;
  const results: unknown[] = [];
  let successfulBatches = 0;
  let failedBatches = 0;

  const batches: WalletSell[][] = [];
  for (let i = 0; i < wallets.length; i += batchSize) {
    batches.push(wallets.slice(i, i + batchSize));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      const partiallyPreparedBundles =
        await getPartiallyPreparedSellTransactions(batch, sellConfig);

      if (partiallyPreparedBundles.length === 0) {
        failedBatches++;
        continue;
      }

      const walletKeypairs = createKeypairs(batch);
      const splitBundles = splitLargeBundles(partiallyPreparedBundles, 4);
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
    } catch {
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
 * Execute sell in all-in-one mode - process all wallets simultaneously
 */
const executeSellAllInOneMode = async (
  wallets: WalletSell[],
  sellConfig: SellConfig,
): Promise<SellResult> => {
  const partiallyPreparedBundles = await getPartiallyPreparedSellTransactions(
    wallets,
    sellConfig,
  );

  if (partiallyPreparedBundles.length === 0) {
    return {
      success: false,
      error: "No transactions generated.",
    };
  }

  const walletKeypairs = createKeypairs(wallets);
  const splitBundles = splitLargeBundles(partiallyPreparedBundles, 4);
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

  const senderResults = await Promise.allSettled(bundlePromises);
  const { success, results, successCount, failCount } =
    processBatchResults(senderResults);

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
 * Execute unified sell operation
 */
export const executeSell = async (
  wallets: WalletSell[],
  sellConfig: SellConfig,
): Promise<SellResult> => {
  const appConfig = loadConfigFromCookies();
  const bundleMode = sellConfig.bundleMode || "batch";
  const outputMint =
    sellConfig.outputMint ||
    appConfig?.baseCurrencyMint ||
    BASE_CURRENCIES.SOL.mint;
  const amount =
    sellConfig.tokensAmount !== undefined
      ? sellConfig.tokensAmount
      : sellConfig.sellPercent;
  const amountType: "base-currency" | "percentage" =
    sellConfig.tokensAmount !== undefined ? "base-currency" : "percentage";

  try {
    let result: SellResult;
    switch (bundleMode) {
      case "single":
        result = await executeSellSingleMode(wallets, sellConfig);
        break;
      case "batch":
        result = await executeSellBatchMode(wallets, sellConfig);
        break;
      case "all-in-one":
        result = await executeSellAllInOneMode(wallets, sellConfig);
        break;
      default:
        throw new Error(`Invalid bundle mode: ${String(bundleMode)}`);
    }

    addTradeHistory({
      type: "sell",
      tokenAddress: sellConfig.tokenAddress,
      walletsCount: wallets.length,
      amount,
      amountType,
      baseCurrencyMint: outputMint,
      success: result.success,
      error: result.error,
      bundleMode,
    });

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error executing sell";

    addTradeHistory({
      type: "sell",
      tokenAddress: sellConfig.tokenAddress,
      walletsCount: wallets.length,
      amount,
      amountType,
      baseCurrencyMint: outputMint,
      success: false,
      error: errorMessage,
      bundleMode,
    });

    return { success: false, error: errorMessage };
  }
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate sell inputs
 */
export const validateSellInputs = (
  wallets: WalletSell[],
  sellConfig: SellConfig,
  tokenBalances: Map<string, number | bigint>,
): { valid: boolean; error?: string } => {
  if (!sellConfig.tokenAddress) {
    return { valid: false, error: "Invalid token address" };
  }

  const hasPercent =
    sellConfig.sellPercent !== undefined && !isNaN(sellConfig.sellPercent);
  const hasAmount =
    sellConfig.tokensAmount !== undefined && !isNaN(sellConfig.tokensAmount);

  if (!hasPercent && !hasAmount) {
    return {
      valid: false,
      error: "Either sellPercent or tokensAmount must be provided",
    };
  }

  if (hasPercent && hasAmount) {
    return {
      valid: false,
      error: "Cannot specify both sellPercent and tokensAmount",
    };
  }

  if (
    hasPercent &&
    (sellConfig.sellPercent <= 0 || sellConfig.sellPercent > 100)
  ) {
    return {
      valid: false,
      error: "Invalid sell percentage (must be between 1-100)",
    };
  }

  if (
    hasAmount &&
    sellConfig.tokensAmount !== undefined &&
    sellConfig.tokensAmount <= 0
  ) {
    return {
      valid: false,
      error: "Invalid tokens amount (must be greater than 0)",
    };
  }

  if (sellConfig.slippageBps !== undefined) {
    if (isNaN(sellConfig.slippageBps) || sellConfig.slippageBps < 0) {
      return { valid: false, error: "Invalid slippage value" };
    }
  }

  if (!wallets.length) {
    return { valid: false, error: "No wallets provided" };
  }

  let hasTokens = false;
  for (const wallet of wallets) {
    if (!wallet.address || !wallet.privateKey) {
      return { valid: false, error: "Invalid wallet data" };
    }

    const balance = tokenBalances.get(wallet.address) || 0;
    if (
      (typeof balance === "bigint" && balance > BigInt(0)) ||
      (typeof balance === "number" && balance > 0)
    ) {
      hasTokens = true;
      break;
    }
  }

  if (!hasTokens) {
    return {
      valid: false,
      error: "None of the wallets have any balance of the specified token",
    };
  }

  return { valid: true };
};

/**
 * Create a sell configuration object
 */
export const createSellConfig = (params: {
  tokenAddress: string;
  sellPercent?: number;
  tokensAmount?: number;
  slippageBps?: number;
  outputMint?: string;
  feeTipLamports?: number;
  bundleMode?: BundleMode;
  batchDelay?: number;
  singleDelay?: number;
}): SellConfig => ({
  tokenAddress: params.tokenAddress,
  sellPercent: params.sellPercent || 0,
  tokensAmount: params.tokensAmount,
  slippageBps: params.slippageBps,
  outputMint: params.outputMint,
  feeTipLamports: params.feeTipLamports,
  bundleMode: params.bundleMode || "batch",
  batchDelay: params.batchDelay,
  singleDelay: params.singleDelay,
});
