import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { sendTransactions } from "./transactionService";
import type { BundleResult as SharedBundleResult } from "./types";
import { getServerBaseUrl, splitLargeBundles } from "./trading";

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRY_ATTEMPTS = 50;
const MAX_CONSECUTIVE_ERRORS = 3;
const BASE_RETRY_DELAY = 200;

// ============================================================================
// Types
// ============================================================================

type BundleResult = SharedBundleResult;

export type PlatformType = "pumpfun" | "bonk" | "meteoraDBC" | "meteoraCPAMM";

export interface WalletForCreate {
  address: string;
  privateKey: string;
  amount: number;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  imageUrl: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface MeteoraDBCConfig {
  configAddress?: string;
  jitoTipAmountSOL?: number;
}

export interface MeteoraCPAMMConfig {
  configAddress?: string;
  jitoTipAmountSOL?: number;
  initialLiquiditySOL?: number;
  initialTokenPercent?: number;
}

export interface BonkConfig {
  jitoTipAmountSOL?: number;
}

export interface CreateConfig {
  platform: PlatformType;
  token: TokenMetadata;
  pumpType?: boolean;
  pumpAdvanced?: boolean;
  bonkType?: "meme" | "tech";
  bonkAdvanced?: boolean;
  bonkConfig?: BonkConfig;
  meteoraDBCConfig?: MeteoraDBCConfig;
  meteoraCPAMMConfig?: MeteoraCPAMMConfig;
}

// Stage information for multi-bundle MeteoraDBC deployment
export interface MeteoraDBCStage {
  name: string;
  description: string;
  transactions: string[];
  requiresConfirmation: boolean;
  waitForActivation?: boolean;
}

export interface CreateBundle {
  transactions: string[];
}

export interface CreateResult {
  success: boolean;
  mintAddress?: string;
  poolId?: string;
  lookupTableAddress?: string;
  result?: unknown;
  error?: string;
  stageResults?: StageResult[];
}

export interface StageResult {
  stageName: string;
  success: boolean;
  bundleId?: string;
  error?: string;
}

interface SendBundleResult {
  success: boolean;
  result?: BundleResult;
  bundleId?: string;
  error?: string;
}

interface BundleResultWithId extends BundleResult {
  jito?: string;
  bundleId?: string;
}

interface PartiallyPreparedResponse {
  success: boolean;
  error?: string;
  data?: {
    bundles?: Array<CreateBundle | string[]>;
    transactions?: string[];
    stages?: MeteoraDBCStage[];
    mint?: string;
    poolId?: string;
    lookupTableAddress?: string;
    mintPrivateKey?: string;
    isAdvancedMode?: boolean;
    bundlesSent?: number;
    results?: Array<Record<string, unknown>>;
  };
  bundles?: Array<CreateBundle | string[]>;
  transactions?: string[];
  stages?: MeteoraDBCStage[];
  mint?: string;
  poolId?: string;
  lookupTableAddress?: string;
  mintPrivateKey?: string;
  isAdvancedMode?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getRetryDelay = (attempt: number): number => {
  const jitter = 0.85 + Math.random() * 0.3;
  return Math.floor(BASE_RETRY_DELAY * Math.pow(1.5, attempt) * jitter);
};


/**
 * Send transactions and wrap result with success/error handling
 */
const sendTransactionsWithResult = async (
  transactions: string[],
): Promise<SendBundleResult> => {
  try {
    const result = await sendTransactions(transactions);

    // Extract bundle ID from result
    const resultWithId = result as BundleResultWithId | undefined;
    const bundleId = resultWithId?.jito || resultWithId?.bundleId;

    return {
      success: true,
      result: result,
      bundleId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Wait for LUT activation
 */
const waitForLutActivation = async (): Promise<void> => {

  // Always wait exactly 5 seconds instead of using bundle-status to confirm LUT transaction
  await new Promise((resolve) => setTimeout(resolve, 5000));

};

/**
 * Send first bundle with extensive retry logic
 */
const sendFirstBundle = async (
  transactions: string[],
): Promise<SendBundleResult> => {
  let attempt = 0;
  let consecutiveErrors = 0;

  while (
    attempt < MAX_RETRY_ATTEMPTS &&
    consecutiveErrors < MAX_CONSECUTIVE_ERRORS
  ) {
    const result = await sendTransactionsWithResult(transactions);

    if (result.success) {
      return result;
    }

    consecutiveErrors++;
    const waitTime = getRetryDelay(attempt);
    await new Promise((resolve) => setTimeout(resolve, waitTime));

    attempt++;
  }

  return {
    success: false,
    error: `Failed to send first bundle after ${attempt} attempts`,
  };
};

/**
 * Get partially prepared create transactions from backend
 */
const getPartiallyPreparedTransactions = async (
  wallets: WalletForCreate[],
  config: CreateConfig,
): Promise<{
  bundles: CreateBundle[];
  stages?: MeteoraDBCStage[];
  mint?: string;
  poolId?: string;
  lookupTableAddress?: string;
  mintPrivateKey?: string;
  isAdvancedMode?: boolean;
}> => {
  const baseUrl = getServerBaseUrl();

  const requestBody: Record<string, unknown> = {
    platform: config.platform,
    token: config.token,
    wallets: wallets.map((w) => ({
      address: w.address,
      amount: w.amount,
    })),
  };

  if (config.platform === "pumpfun") {
    if (config.pumpType !== undefined) {
      requestBody["pumpType"] = config.pumpType;
    }
    if (config.pumpAdvanced !== undefined) {
      requestBody["pumpAdvanced"] = config.pumpAdvanced;
    }
  }
  if (config.platform === "bonk") {
    if (config.bonkType) {
      requestBody["bonkType"] = config.bonkType;
    }
    if (config.bonkAdvanced !== undefined) {
      requestBody["bonkAdvanced"] = config.bonkAdvanced;
    }
    if (config.bonkConfig) {
      requestBody["bonkConfig"] = config.bonkConfig;
    }
  }
  if (config.platform === "meteoraDBC" && config.meteoraDBCConfig) {
    requestBody["meteoraDBCConfig"] = config.meteoraDBCConfig;
  }
  if (config.platform === "meteoraCPAMM" && config.meteoraCPAMMConfig) {
    requestBody["meteoraCPAMMConfig"] = config.meteoraCPAMMConfig;
  }

  const response = await fetch(`${baseUrl}/v2/sol/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = (await response.json()) as PartiallyPreparedResponse;

  if (!data.success) {
    throw new Error(
      data.error || "Failed to get partially prepared transactions",
    );
  }

  // Extract common fields
  const mint = data.data?.mint || data.mint;
  const poolId = data.data?.poolId || data.poolId;
  const lookupTableAddress =
    data.data?.lookupTableAddress || data.lookupTableAddress;
  const mintPrivateKey = data.data?.mintPrivateKey || data.mintPrivateKey;
  const isAdvancedMode = data.data?.isAdvancedMode || data.isAdvancedMode;
  const stages = data.data?.stages || data.stages;

  // Handle advanced mode with stages (MeteoraDBC 6-20 wallets)
  if (stages && Array.isArray(stages) && stages.length > 0) {
    return {
      bundles: [], // Advanced mode uses stages instead
      stages,
      mint,
      poolId,
      lookupTableAddress,
      mintPrivateKey,
      isAdvancedMode: true,
    };
  }

  // Handle bundles (both simple and advanced mode for pumpfun)
  let bundles: CreateBundle[] = [];

  if (data.data?.bundles && Array.isArray(data.data.bundles)) {
    bundles = data.data.bundles.map((bundle: CreateBundle | string[]) =>
      Array.isArray(bundle) ? { transactions: bundle } : bundle,
    );
  } else if (
    data.data?.transactions &&
    Array.isArray(data.data.transactions)
  ) {
    bundles = [{ transactions: data.data.transactions }];
  } else if (data.bundles && Array.isArray(data.bundles)) {
    bundles = data.bundles.map((bundle: CreateBundle | string[]) =>
      Array.isArray(bundle) ? { transactions: bundle } : bundle,
    );
  } else if (data.transactions && Array.isArray(data.transactions)) {
    bundles = [{ transactions: data.transactions }];
  } else {
    throw new Error("No transactions returned from backend");
  }

  // isAdvancedMode can be true for pumpfun with multiple bundles
  const finalIsAdvancedMode = isAdvancedMode || bundles.length > 1;

  return {
    bundles,
    mint,
    poolId,
    lookupTableAddress,
    mintPrivateKey,
    isAdvancedMode: finalIsAdvancedMode,
  };
};

/**
 * Complete bundle signing with wallet keypairs
 */
const completeBundleSigning = (
  bundle: CreateBundle,
  walletKeypairs: Keypair[],
  additionalKeypairs: Keypair[] = [],
  isFirstBundle: boolean = false,
): CreateBundle => {
  if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
    return { transactions: [] };
  }

  const allKeypairs = [...walletKeypairs, ...additionalKeypairs];

  const signedTransactions = bundle.transactions.map((txBase58, index) => {
    let txBuffer: Uint8Array;
    try {
      txBuffer = bs58.decode(txBase58);
    } catch {
      txBuffer = new Uint8Array(Buffer.from(txBase58, "base64"));
    }

    const transaction = VersionedTransaction.deserialize(txBuffer);

    // Check if already has signatures (partially signed by server)
    if (isFirstBundle && index === 0) {
      const hasSignature = transaction.signatures.some(
        (sig) => !sig.every((byte) => byte === 0),
      );

      if (hasSignature) {
        const requiredSigners: Keypair[] = [];
        for (const accountKey of transaction.message.staticAccountKeys) {
          const pubkeyStr = accountKey.toBase58();
          const matchingKeypair = allKeypairs.find(
            (kp) => kp.publicKey.toBase58() === pubkeyStr,
          );

          if (matchingKeypair) {
            const signerIndex =
              transaction.message.staticAccountKeys.findIndex((key) =>
                key.equals(matchingKeypair.publicKey),
              );

            if (
              signerIndex >= 0 &&
              transaction.signatures[signerIndex] &&
              transaction.signatures[signerIndex].every((byte) => byte === 0)
            ) {
              requiredSigners.push(matchingKeypair);
            }
          }
        }

        if (requiredSigners.length > 0) {
          transaction.sign(requiredSigners);
        }
        return bs58.encode(transaction.serialize());
      }
    }

    // Standard signing - only sign with keys that are ACTUAL SIGNERS in the transaction
    // The number of required signers is in the message header
    const numRequiredSignatures =
      transaction.message.header.numRequiredSignatures;
    const signerAccountKeys = transaction.message.staticAccountKeys.slice(
      0,
      numRequiredSignatures,
    );

    const signers: Keypair[] = [];
    for (const accountKey of signerAccountKeys) {
      const pubkeyStr = accountKey.toBase58();
      const matchingKeypair = allKeypairs.find(
        (kp) => kp.publicKey.toBase58() === pubkeyStr,
      );
      if (matchingKeypair && !signers.includes(matchingKeypair)) {
        // Only add if signature slot is empty (not already signed)
        const signerIndex = transaction.message.staticAccountKeys.findIndex(
          (key) => key.equals(matchingKeypair.publicKey),
        );
        if (
          signerIndex >= 0 &&
          signerIndex < transaction.signatures.length &&
          transaction.signatures[signerIndex].every((byte) => byte === 0)
        ) {
          signers.push(matchingKeypair);
        }
      }
    }

    if (signers.length > 0) {
      transaction.sign(signers);
    }
    return bs58.encode(transaction.serialize());
  });

  return { transactions: signedTransactions };
};


/**
 * Execute advanced mode MeteoraDBC deployment with multi-stage bundles
 */
const executeAdvancedModeCreate = async (
  stages: MeteoraDBCStage[],
  walletKeypairs: Keypair[],
  mintKeypair: Keypair | null,
  mint?: string,
  poolId?: string,
  lookupTableAddress?: string,
): Promise<CreateResult> => {
  const stageResults: StageResult[] = [];
  const additionalKeypairs = mintKeypair ? [mintKeypair] : [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    // Sign transactions for this stage
    const signedBundle = completeBundleSigning(
      { transactions: stage.transactions },
      walletKeypairs,
      additionalKeypairs,
      i === 0 || stage.name === "Deployment", // First stage or deployment stage may be partially signed
    );

    if (signedBundle.transactions.length === 0) {
      const error = `Failed to sign transactions for stage: ${stage.name}`;
      stageResults.push({ stageName: stage.name, success: false, error });
      return {
        success: false,
        mintAddress: mint,
        poolId,
        lookupTableAddress,
        error,
        stageResults,
      };
    }

    // Send the bundle
    const sendResult = await sendFirstBundle(signedBundle.transactions);

    if (!sendResult.success) {
      const error = `Failed to send bundle for stage: ${stage.name} - ${sendResult.error}`;
      stageResults.push({ stageName: stage.name, success: false, error });
      return {
        success: false,
        mintAddress: mint,
        poolId,
        lookupTableAddress,
        error,
        stageResults,
      };
    }

    stageResults.push({
      stageName: stage.name,
      success: true,
      bundleId: sendResult.bundleId,
    });

    // Wait for confirmation if required
    if (stage.requiresConfirmation) {
      // For LUT stages, wait for activation
      if (stage.waitForActivation) {
        await waitForLutActivation();
      }
    }

    // Small delay between stages
    if (i < stages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }


  return {
    success: true,
    mintAddress: mint,
    poolId,
    lookupTableAddress,
    stageResults,
    result: {
      totalStages: stages.length,
      stageResults,
    },
  };
};

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Execute token creation/deployment operation
 */
export const executeCreate = async (
  wallets: WalletForCreate[],
  config: CreateConfig,
): Promise<CreateResult> => {
  try {
    // Step 1: Get partially prepared bundles/stages from backend
    const {
      bundles: partiallyPreparedBundles,
      stages,
      mint,
      poolId,
      lookupTableAddress,
      mintPrivateKey,
      isAdvancedMode,
    } = await getPartiallyPreparedTransactions(wallets, config);

    // Create keypairs from private keys
    const walletKeypairs = wallets.map((wallet) =>
      Keypair.fromSecretKey(bs58.decode(wallet.privateKey)),
    );

    // Create mint keypair if provided (for advanced mode)
    let mintKeypair: Keypair | null = null;
    if (mintPrivateKey) {
      try {
        mintKeypair = Keypair.fromSecretKey(bs58.decode(mintPrivateKey));
      } catch (ignore) {
        // Invalid mint private key, will proceed without it
      }
    }

    // Handle advanced mode (MeteoraDBC with 6-20 wallets)
    if (isAdvancedMode && stages && stages.length > 0) {
      return await executeAdvancedModeCreate(
        stages,
        walletKeypairs,
        mintKeypair,
        mint,
        poolId,
        lookupTableAddress,
      );
    }

    // Simple mode: single bundle flow
    if (partiallyPreparedBundles.length === 0) {
      return {
        success: false,
        error: "No transactions generated.",
      };
    }

    // Split and sign all bundles
    const splitBundles = splitLargeBundles(partiallyPreparedBundles);
    const additionalKeypairs = mintKeypair ? [mintKeypair] : [];
    const signedBundles = splitBundles.map((bundle, index) =>
      completeBundleSigning(
        bundle,
        walletKeypairs,
        additionalKeypairs,
        index === 0,
      ),
    );


    // Filter out empty bundles
    const validSignedBundles = signedBundles.filter(
      (bundle) => bundle.transactions.length > 0,
    );

    if (validSignedBundles.length === 0) {
      return {
        success: false,
        error: "Failed to sign any transactions",
      };
    }

    // Send bundles
    const firstBundleResult = await sendFirstBundle(
      validSignedBundles[0].transactions,
    );

    if (!firstBundleResult.success) {
      return {
        success: false,
        mintAddress: mint,
        error: `First bundle failed: ${firstBundleResult.error || "Unknown error"}`,
      };
    }


    // Send remaining bundles
    const results: BundleResult[] = firstBundleResult.result
      ? [firstBundleResult.result]
      : [];
    let successCount = 1;
    let failureCount = 0;

    for (let i = 1; i < validSignedBundles.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100 * i));

      const result = await sendTransactionsWithResult(
        validSignedBundles[i].transactions,
      );
      if (result.success && result.result) {
        results.push(result.result);
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      success: successCount > 0,
      mintAddress: mint,
      poolId,
      lookupTableAddress,
      result: {
        totalBundles: validSignedBundles.length,
        successCount,
        failureCount,
        results,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * Validate create inputs
 */
export const validateCreateInputs = (
  wallets: WalletForCreate[],
  config: CreateConfig,
  walletBalances: Map<string, number>,
): { valid: boolean; error?: string } => {
  if (
    !["pumpfun", "bonk", "meteoraDBC", "meteoraCPAMM"].includes(config.platform)
  ) {
    return { valid: false, error: "Invalid platform" };
  }

  if (!config.token.name || !config.token.symbol || !config.token.imageUrl) {
    return {
      valid: false,
      error: "Token name, symbol, and image are required",
    };
  }

  if (!wallets.length) {
    return { valid: false, error: "At least one wallet is required" };
  }

  // Pump.fun and MeteoraDBC support up to 20 wallets in advanced mode
  // MeteoraCPAMM supports up to 20 wallets
  // Bonk supports up to 20 wallets in advanced mode
  const maxWallets = (() => {
    if (config.platform === "pumpfun" && config.pumpAdvanced) return 20;
    if (config.platform === "bonk" && config.bonkAdvanced) return 20;
    if (config.platform === "bonk") return 5;
    if (config.platform === "meteoraDBC") return 20;
    if (config.platform === "meteoraCPAMM") return 20;
    return 5;
  })();
  if (wallets.length > maxWallets) {
    return {
      valid: false,
      error: `Maximum ${maxWallets} wallets allowed for ${config.platform}${config.pumpAdvanced ? " (advanced mode)" : ""}`,
    };
  }

  for (const wallet of wallets) {
    if (!wallet.address || !wallet.privateKey) {
      return { valid: false, error: "Invalid wallet data" };
    }

    if (wallet.amount <= 0) {
      return { valid: false, error: "Invalid wallet amount" };
    }

    const balance = walletBalances.get(wallet.address) || 0;
    if (balance < wallet.amount) {
      return {
        valid: false,
        error: `Wallet ${wallet.address.substring(0, 6)}... has insufficient balance`,
      };
    }
  }

  return { valid: true };
};

/**
 * Helper function to create config with defaults
 */
export const createDeployConfig = (params: {
  platform: PlatformType;
  token: TokenMetadata;
  pumpType?: boolean;
  pumpAdvanced?: boolean;
  bonkType?: "meme" | "tech";
  meteoraDBCConfig?: MeteoraDBCConfig;
  meteoraCPAMMConfig?: MeteoraCPAMMConfig;
  bonkAdvanced?: boolean;
  bonkConfig?: BonkConfig;
}): CreateConfig => {
  return {
    platform: params.platform,
    token: params.token,
    pumpType: params.pumpType,
    pumpAdvanced: params.pumpAdvanced,
    bonkType: params.bonkType,
    bonkAdvanced: params.bonkAdvanced,
    bonkConfig: params.bonkConfig,
    meteoraDBCConfig: params.meteoraDBCConfig,
    meteoraCPAMMConfig: params.meteoraCPAMMConfig,
  };
};

// Default MeteoraDBC pool config addresses
export const METEORA_DBC_CONFIGS = {
  standard: "FiENCCbPi3rFh5pW2AJ59HC53yM32qRTLqNKBFbgevo1",
};

// Default MeteoraCPAMM pool config addresses
export const METEORA_CPAMM_CONFIGS = {
  standard: "FzvMYBQ29z2J21QPsABpJYYxQBEKGsxA6w6J2HYceFj8",
};
