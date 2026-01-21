/**
 * Sell Operations
 *
 * Handles all sell transactions for Solana tokens.
 */

import { loadConfigFromCookies } from "./storage";
import { TRADING, BASE_CURRENCIES } from "./constants";
import type {
  WalletSell,
  BundleMode,
  SellConfig,
  ServerResponse,
  SellBundle,
  SellResult,
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
  WalletSell,
  BundleMode,
  SellConfig,
  ServerResponse,
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
  try {
    const config = loadConfigFromCookies();
    const baseUrl = getServerBaseUrl();
    const selfHosted = isSelfHostedServer();

    // Determine output mint (what to sell tokens for)
    const outputMint =
      sellConfig.outputMint ||
      config?.baseCurrencyMint ||
      BASE_CURRENCIES.SOL.mint;
    const isNativeSOL = outputMint === BASE_CURRENCIES.SOL.mint;

    const requestBody: Record<string, unknown> = {
      tokenAddress: sellConfig.tokenAddress,
    };

    if (selfHosted) {
      requestBody["walletPrivateKeys"] = wallets.map(
        (wallet) => wallet.privateKey,
      );
    } else {
      requestBody["walletAddresses"] = wallets.map((wallet) => wallet.address);
    }

    if (sellConfig.tokensAmount !== undefined) {
      requestBody["tokensAmount"] = sellConfig.tokensAmount;
    } else {
      requestBody["percentage"] = sellConfig.sellPercent;
    }

    requestBody["slippageBps"] = getSlippageBps(sellConfig.slippageBps);

    const fees = getFeeLamports(
      wallets.length,
      sellConfig.jitoTipLamports,
      sellConfig.transactionsFeeLamports,
    );
    Object.assign(requestBody, fees);

    // Always include outputMint for non-SOL base currencies
    if (!isNativeSOL) {
      requestBody["outputMint"] = outputMint;
    }

    // Use /v2/swap/sell for stablecoins, /v2/sol/sell for SOL
    const endpoint = isNativeSOL
      ? `${baseUrl}/v2/sol/sell`
      : `${baseUrl}/v2/swap/sell`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: ServerResponse = (await response.json()) as ServerResponse;

    if (!data.success) {
      throw new Error(
        (data.error ? String(data.error) : undefined) ||
          "Failed to get partially prepared transactions",
      );
    }

    // Handle self-hosted server response
    if (config?.tradingServerEnabled === "true" && data.data) {
      return [{ transactions: [], serverResponse: data }];
    }

    // Handle various response formats
    if (data.data && typeof data.data === "object" && data.data !== null) {
      const responseData = data.data as {
        bundles?: unknown[];
        transactions?: string[];
      };
      if ("bundles" in responseData && Array.isArray(responseData.bundles)) {
        return responseData.bundles.map((bundle: unknown) =>
          Array.isArray(bundle)
            ? { transactions: bundle as string[] }
            : (bundle as SellBundle),
        );
      }
      if (
        "transactions" in responseData &&
        Array.isArray(responseData.transactions)
      ) {
        return [{ transactions: responseData.transactions }];
      }
    }

    if ("bundles" in data && Array.isArray(data["bundles"])) {
      return (data["bundles"] as unknown[]).map((bundle: unknown) =>
        Array.isArray(bundle)
          ? { transactions: bundle as string[] }
          : (bundle as SellBundle),
      );
    }

    if ("transactions" in data && Array.isArray(data["transactions"])) {
      return [{ transactions: data["transactions"] as string[] }];
    }

    if (Array.isArray(data)) {
      return [{ transactions: data as string[] }];
    }

    throw new Error("No transactions returned from backend");
  } catch (error) {
    console.error(
      "[Sell] Error getting partially prepared sell transactions:",
      error,
    );
    throw error;
  }
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
    } catch (error) {
      console.error(`[Sell] Error processing wallet ${wallet.address}:`, error);
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
  const batchSize = TRADING.DEFAULT_BATCH_SIZE;
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
      console.error(`[Sell] Error processing batch ${i + 1}:`, error);
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
  const config = loadConfigFromCookies();
  const partiallyPreparedBundles = await getPartiallyPreparedSellTransactions(
    wallets,
    sellConfig,
  );

  // Handle self-hosted server response
  if (config?.tradingServerEnabled === "true") {
    if (
      partiallyPreparedBundles.length > 0 &&
      partiallyPreparedBundles[0].serverResponse
    ) {
      const serverResponse = partiallyPreparedBundles[0].serverResponse;
      return {
        success: serverResponse.success ?? false,
        result: serverResponse.data,
        error: serverResponse.success
          ? undefined
          : serverResponse.error
            ? String(serverResponse.error)
            : undefined,
      };
    }
    return {
      success: false,
      error: "No response received from self-hosted server",
    };
  }

  if (partiallyPreparedBundles.length === 0) {
    return {
      success: false,
      error:
        "No transactions generated. Wallets might not have sufficient token balance.",
    };
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
 * Execute unified sell operation
 */
export const executeSell = async (
  wallets: WalletSell[],
  sellConfig: SellConfig,
): Promise<SellResult> => {
  try {
    const config = loadConfigFromCookies();
    let bundleMode = sellConfig.bundleMode || "batch";

    if (config?.tradingServerEnabled === "true") {
      bundleMode = "all-in-one";
    }

    // Get the output mint for trade history
    const outputMint =
      sellConfig.outputMint ||
      config?.baseCurrencyMint ||
      BASE_CURRENCIES.SOL.mint;

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

    const amount =
      sellConfig.tokensAmount !== undefined
        ? sellConfig.tokensAmount
        : sellConfig.sellPercent;
    const amountType: "base-currency" | "percentage" =
      sellConfig.tokensAmount !== undefined ? "base-currency" : "percentage";

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
    const config = loadConfigFromCookies();
    const outputMint =
      sellConfig.outputMint ||
      config?.baseCurrencyMint ||
      BASE_CURRENCIES.SOL.mint;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error executing sell";

    const amount =
      sellConfig.tokensAmount !== undefined
        ? sellConfig.tokensAmount
        : sellConfig.sellPercent;
    const amountType: "base-currency" | "percentage" =
      sellConfig.tokensAmount !== undefined ? "base-currency" : "percentage";

    addTradeHistory({
      type: "sell",
      tokenAddress: sellConfig.tokenAddress,
      walletsCount: wallets.length,
      amount,
      amountType,
      baseCurrencyMint: outputMint,
      success: false,
      error: errorMessage,
      bundleMode: sellConfig.bundleMode || "batch",
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
  jitoTipLamports?: number;
  transactionsFeeLamports?: number;
  bundleMode?: BundleMode;
  batchDelay?: number;
  singleDelay?: number;
}): SellConfig => ({
  tokenAddress: params.tokenAddress,
  sellPercent: params.sellPercent || 0,
  tokensAmount: params.tokensAmount,
  slippageBps: params.slippageBps,
  outputMint: params.outputMint,
  jitoTipLamports: params.jitoTipLamports,
  transactionsFeeLamports: params.transactionsFeeLamports,
  bundleMode: params.bundleMode || "batch",
  batchDelay: params.batchDelay,
  singleDelay: params.singleDelay,
});
