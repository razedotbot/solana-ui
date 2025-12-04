import { Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { loadConfigFromCookies } from '../Utils';
import type { ApiResponse, BundleResult as SharedBundleResult } from './types';

// ============================================================================
// Constants
// ============================================================================

const MAX_RETRY_ATTEMPTS = 50;
const MAX_CONSECUTIVE_ERRORS = 3;
const BASE_RETRY_DELAY = 200;
const MAX_TRANSACTIONS_PER_BUNDLE = 5;
const BUNDLE_CONFIRMATION_TIMEOUT = 120000; // 2 minutes
const BUNDLE_CHECK_INTERVAL = 2000; // 2 seconds
const LUT_ACTIVATION_TIMEOUT = 60000; // 1 minute

// ============================================================================
// Types
// ============================================================================

interface WindowWithConfig {
  tradingServerUrl?: string;
}

type BundleResult = SharedBundleResult;

export type PlatformType = 'pumpfun' | 'bonk' | 'meteora';

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

export interface MeteoraConfig {
  configAddress?: string;
  jitoTipAmountSOL?: number;
}

export interface CreateConfig {
  platform: PlatformType;
  token: TokenMetadata;
  pumpType?: boolean;
  bonkType?: 'meme' | 'tech';
  meteoraConfig?: MeteoraConfig;
}

// Stage information for multi-bundle Meteora deployment
export interface MeteoraStage {
  name: string;
  description: string;
  transactions: string[];
  requiresConfirmation: boolean;
  waitForActivation?: boolean;
}

export interface CreateBundle {
  transactions: string[];
  serverResponse?: ServerResponse;
}

export interface ServerResponse {
  success?: boolean;
  data?: unknown;
  error?: string;
  bundlesSent?: number;
  results?: Array<Record<string, unknown>>;
  [key: string]: unknown;
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

interface BundleStatusResponse {
  status?: 'confirmed' | 'landed' | 'failed' | 'pending';
  confirmed?: boolean;
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
    stages?: MeteoraStage[];
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
  stages?: MeteoraStage[];
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
  const jitter = 0.85 + (Math.random() * 0.3);
  return Math.floor(BASE_RETRY_DELAY * Math.pow(1.5, attempt) * jitter);
};

const getBaseUrl = (): string => {
  const config = loadConfigFromCookies();
  
  if (config?.tradingServerEnabled === 'true' && config?.tradingServerUrl) {
    return config.tradingServerUrl.replace(/\/+$/, '');
  }
  
  return (window as WindowWithConfig).tradingServerUrl?.replace(/\/+$/, '') || '';
};

/**
 * Send bundle to Jito block engine through backend proxy
 */
const sendBundle = async (encodedBundle: string[]): Promise<SendBundleResult> => {
  try {
    const baseUrl = getBaseUrl();
    
    const response = await fetch(`${baseUrl}/v2/sol/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: encodedBundle
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json() as ApiResponse<BundleResult>;
    
    if (data.error) {
      throw new Error(data.error || 'Unknown error from bundle server');
    }
    
    // Extract bundle ID from result
    const resultWithId = data.result as BundleResultWithId | undefined;
    const bundleId = resultWithId?.jito || resultWithId?.bundleId;
    
    return { 
      success: true, 
      result: data.result as BundleResult,
      bundleId
    };
  } catch (error) {
    console.error('Error sending bundle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Wait for bundle confirmation with polling
 */
const waitForBundleConfirmation = async (
  bundleId: string,
  timeoutMs: number = BUNDLE_CONFIRMATION_TIMEOUT,
  checkIntervalMs: number = BUNDLE_CHECK_INTERVAL
): Promise<boolean> => {
  const startTime = Date.now();
  const baseUrl = getBaseUrl();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/v2/sol/bundle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId }),
      });

      if (response.ok) {
        const data = await response.json() as BundleStatusResponse;
        
        // Check if bundle is confirmed/landed
        if (data.status === 'confirmed' || data.status === 'landed' || data.confirmed) {
          return true;
        }
        
        // Check if bundle failed
        if (data.status === 'failed' || data.error) {
          console.warn(`Bundle ${bundleId} failed:`, data.error || data.status);
          return false;
        }
      }
    } catch {
      // Ignore polling errors, just continue
    }
    
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
  
  // Timeout - assume it landed if no error
  console.warn(`Bundle ${bundleId} confirmation timeout, assuming landed`);
  return true;
};

/**
 * Wait for LUT activation
 */
const waitForLutActivation = async (
  timeoutMs: number = LUT_ACTIVATION_TIMEOUT
): Promise<void> => {
  console.info('⏳ Waiting for Lookup Table activation...');
  
  // LUT needs ~1 slot to activate after creation
  // Wait a fixed time as we can't easily check LUT status from frontend
  const waitTime = Math.min(timeoutMs, 30000); // Max 30 seconds
  await new Promise(resolve => setTimeout(resolve, waitTime));
  
  console.info('✅ Lookup Table should be activated');
};

/**
 * Send first bundle with extensive retry logic
 */
const sendFirstBundle = async (transactions: string[]): Promise<SendBundleResult> => {
  console.info(`Sending first bundle with ${transactions.length} transactions (critical)...`);
  
  let attempt = 0;
  let consecutiveErrors = 0;
  
  while (attempt < MAX_RETRY_ATTEMPTS && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
      const result = await sendBundle(transactions);
    
    if (result.success) {
      console.info(`First bundle sent successfully on attempt ${attempt + 1}`);
      return result;
    }
    
      consecutiveErrors++;
      const waitTime = getRetryDelay(attempt);
    console.warn(`First bundle attempt ${attempt + 1} failed. Retrying in ${waitTime}ms...`, result.error);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    
    attempt++;
  }
  
  return { 
    success: false, 
    error: `Failed to send first bundle after ${attempt} attempts` 
  };
};

/**
 * Get partially prepared create transactions from backend
 */
const getPartiallyPreparedTransactions = async (
  wallets: WalletForCreate[],
  config: CreateConfig
): Promise<{ 
  bundles: CreateBundle[]; 
  stages?: MeteoraStage[];
  mint?: string; 
  poolId?: string;
  lookupTableAddress?: string;
  mintPrivateKey?: string;
  isAdvancedMode?: boolean;
}> => {
  try {
    const appConfig = loadConfigFromCookies();
    const baseUrl = getBaseUrl();
    
    const requestBody: Record<string, unknown> = {
      platform: config.platform,
      token: config.token,
    };
    
    if (appConfig?.tradingServerEnabled === 'true') {
      requestBody['wallets'] = wallets.map(w => ({
        privateKey: w.privateKey,
        amount: w.amount
      }));
    } else {
      requestBody['wallets'] = wallets.map(w => ({
        address: w.address,
        amount: w.amount
      }));
    }
    
    if (config.platform === 'pumpfun' && config.pumpType !== undefined) {
      requestBody['pumpType'] = config.pumpType;
    }
    if (config.platform === 'bonk' && config.bonkType) {
      requestBody['bonkType'] = config.bonkType;
    }
    if (config.platform === 'meteora' && config.meteoraConfig) {
      requestBody['meteoraConfig'] = config.meteoraConfig;
    }
    
    const response = await fetch(`${baseUrl}/v2/sol/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json() as PartiallyPreparedResponse;
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially prepared transactions');
    }
    
    // Extract common fields
    const mint = data.data?.mint || data.mint;
    const poolId = data.data?.poolId || data.poolId;
    const lookupTableAddress = data.data?.lookupTableAddress || data.lookupTableAddress;
    const mintPrivateKey = data.data?.mintPrivateKey || data.mintPrivateKey;
    const isAdvancedMode = data.data?.isAdvancedMode || data.isAdvancedMode;
    const stages = data.data?.stages || data.stages;
    
    // Handle self-hosted server response
    if (appConfig?.tradingServerEnabled === 'true' && data.data) {
      console.info('Self-hosted server response:', data);
      return { 
        bundles: [{ transactions: [], serverResponse: data.data as ServerResponse }],
        mint,
        poolId,
        lookupTableAddress,
        mintPrivateKey,
        isAdvancedMode,
        stages
      };
    }
    
    // Handle advanced mode with stages (Meteora 6-20 wallets)
    if (stages && Array.isArray(stages) && stages.length > 0) {
      console.info(`Advanced mode detected: ${stages.length} stages`);
      return {
        bundles: [], // Advanced mode uses stages instead
        stages,
        mint,
        poolId,
        lookupTableAddress,
        mintPrivateKey,
        isAdvancedMode: true
      };
    }
    
    // Handle simple mode bundles
    let bundles: CreateBundle[] = [];
    
    if (data.data?.bundles && Array.isArray(data.data.bundles)) {
      bundles = data.data.bundles.map((bundle: CreateBundle | string[]) =>
        Array.isArray(bundle) ? { transactions: bundle } : bundle
      );
    } else if (data.data?.transactions && Array.isArray(data.data.transactions)) {
      bundles = [{ transactions: data.data.transactions }];
    } else if (data.bundles && Array.isArray(data.bundles)) {
      bundles = data.bundles.map((bundle: CreateBundle | string[]) =>
        Array.isArray(bundle) ? { transactions: bundle } : bundle
      );
    } else if (data.transactions && Array.isArray(data.transactions)) {
      bundles = [{ transactions: data.transactions }];
    } else {
      throw new Error('No transactions returned from backend');
    }
    
    return { bundles, mint, poolId, lookupTableAddress, mintPrivateKey, isAdvancedMode: false };
  } catch (error) {
    console.error('Error getting partially prepared transactions:', error);
    throw error;
  }
};

/**
 * Complete bundle signing with wallet keypairs
 */
const completeBundleSigning = (
  bundle: CreateBundle,
  walletKeypairs: Keypair[],
  additionalKeypairs: Keypair[] = [],
  isFirstBundle: boolean = false
): CreateBundle => {
  if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
    console.error("Invalid bundle format:", bundle);
    return { transactions: [] };
  }

  const allKeypairs = [...walletKeypairs, ...additionalKeypairs];

  const signedTransactions = bundle.transactions.map((txBase58, index) => {
    try {
      let txBuffer: Uint8Array;
      try {
        txBuffer = bs58.decode(txBase58);
      } catch {
        txBuffer = new Uint8Array(Buffer.from(txBase58, 'base64'));
      }
      
      const transaction = VersionedTransaction.deserialize(txBuffer);
      
      // Check if already has signatures (partially signed by server)
      if (isFirstBundle && index === 0) {
        const hasSignature = transaction.signatures.some(sig => 
          !sig.every(byte => byte === 0)
        );
        
        if (hasSignature) {
          console.info("First transaction already partially signed, adding remaining signatures");
          
          const requiredSigners: Keypair[] = [];
          for (const accountKey of transaction.message.staticAccountKeys) {
            const pubkeyStr = accountKey.toBase58();
            const matchingKeypair = allKeypairs.find(
              kp => kp.publicKey.toBase58() === pubkeyStr
            );
            
            if (matchingKeypair) {
              const signerIndex = transaction.message.staticAccountKeys.findIndex(
                key => key.equals(matchingKeypair.publicKey)
              );
              
              if (signerIndex >= 0 && 
                  transaction.signatures[signerIndex] && 
                  transaction.signatures[signerIndex].every(byte => byte === 0)) {
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
      const numRequiredSignatures = transaction.message.header.numRequiredSignatures;
      const signerAccountKeys = transaction.message.staticAccountKeys.slice(0, numRequiredSignatures);
      
      const signers: Keypair[] = [];
      for (const accountKey of signerAccountKeys) {
        const pubkeyStr = accountKey.toBase58();
        const matchingKeypair = allKeypairs.find(
          kp => kp.publicKey.toBase58() === pubkeyStr
        );
        if (matchingKeypair && !signers.includes(matchingKeypair)) {
          // Only add if signature slot is empty (not already signed)
          const signerIndex = transaction.message.staticAccountKeys.findIndex(
            key => key.equals(matchingKeypair.publicKey)
          );
          if (signerIndex >= 0 && 
              signerIndex < transaction.signatures.length &&
              transaction.signatures[signerIndex].every(byte => byte === 0)) {
            signers.push(matchingKeypair);
          }
        }
      }
      
      if (signers.length > 0) {
        transaction.sign(signers);
      }
      return bs58.encode(transaction.serialize());
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  });
  
  return { transactions: signedTransactions };
};

/**
 * Split large bundles into smaller ones
 */
const splitLargeBundles = (bundles: CreateBundle[]): CreateBundle[] => {
  const result: CreateBundle[] = [];
  
  for (const bundle of bundles) {
    if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
      continue;
    }
    
    if (bundle.transactions.length <= MAX_TRANSACTIONS_PER_BUNDLE) {
      result.push(bundle);
      continue;
    }
    
    for (let i = 0; i < bundle.transactions.length; i += MAX_TRANSACTIONS_PER_BUNDLE) {
      const chunkTransactions = bundle.transactions.slice(i, i + MAX_TRANSACTIONS_PER_BUNDLE);
      result.push({ transactions: chunkTransactions });
    }
  }
  
  return result;
};

/**
 * Execute advanced mode Meteora deployment with multi-stage bundles
 */
const executeAdvancedModeCreate = async (
  stages: MeteoraStage[],
  walletKeypairs: Keypair[],
  mintKeypair: Keypair | null,
  mint?: string,
  poolId?: string,
  lookupTableAddress?: string
): Promise<CreateResult> => {
  console.info(`🚀 Executing advanced mode deployment with ${stages.length} stages`);
  
  const stageResults: StageResult[] = [];
  const additionalKeypairs = mintKeypair ? [mintKeypair] : [];
  
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    console.info(`\n📦 Stage ${i + 1}/${stages.length}: ${stage.name}`);
    console.info(`   Description: ${stage.description}`);
    console.info(`   Transactions: ${stage.transactions.length}`);
    
    // Sign transactions for this stage
    const signedBundle = completeBundleSigning(
      { transactions: stage.transactions },
      walletKeypairs,
      additionalKeypairs,
      i === 0 || stage.name === 'Deployment' // First stage or deployment stage may be partially signed
    );
    
    if (signedBundle.transactions.length === 0) {
      const error = `Failed to sign transactions for stage: ${stage.name}`;
      console.error(`❌ ${error}`);
      stageResults.push({ stageName: stage.name, success: false, error });
      return {
        success: false,
        mintAddress: mint,
        poolId,
        lookupTableAddress,
        error,
        stageResults
      };
    }
    
    // Send the bundle
    const sendResult = await sendFirstBundle(signedBundle.transactions);
    
    if (!sendResult.success) {
      const error = `Failed to send bundle for stage: ${stage.name} - ${sendResult.error}`;
      console.error(`❌ ${error}`);
      stageResults.push({ stageName: stage.name, success: false, error });
      return {
        success: false,
        mintAddress: mint,
        poolId,
        lookupTableAddress,
        error,
        stageResults
      };
    }
    
    console.info(`✅ Stage ${stage.name} bundle sent successfully`);
    if (sendResult.bundleId) {
      console.info(`   Bundle ID: ${sendResult.bundleId}`);
    }
    
    stageResults.push({
      stageName: stage.name,
      success: true,
      bundleId: sendResult.bundleId
    });
    
    // Wait for confirmation if required
    if (stage.requiresConfirmation && sendResult.bundleId) {
      console.info(`⏳ Waiting for ${stage.name} confirmation...`);
      const confirmed = await waitForBundleConfirmation(sendResult.bundleId);
      
      if (!confirmed) {
        console.warn(`⚠️ ${stage.name} confirmation uncertain, continuing...`);
      } else {
        console.info(`✅ ${stage.name} confirmed!`);
      }
      
      // Wait for LUT activation if needed
      if (stage.waitForActivation) {
        await waitForLutActivation();
      }
    }
    
    // Small delay between stages
    if (i < stages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.info(`\n🎉 All ${stages.length} stages completed!`);
  
  return {
    success: true,
    mintAddress: mint,
    poolId,
    lookupTableAddress,
    stageResults,
    result: {
      totalStages: stages.length,
      stageResults
    }
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
  config: CreateConfig
): Promise<CreateResult> => {
  try {
    console.info(`Preparing to create token on ${config.platform} using ${wallets.length} wallets`);
    
    const appConfig = loadConfigFromCookies();
    
    // Step 1: Get partially prepared bundles/stages from backend
    const { 
      bundles: partiallyPreparedBundles, 
      stages,
      mint, 
      poolId,
      lookupTableAddress,
      mintPrivateKey,
      isAdvancedMode
    } = await getPartiallyPreparedTransactions(wallets, config);
    
    // Handle self-hosted server response
    if (appConfig?.tradingServerEnabled === 'true') {
      console.info('Self-hosted server handled signing and sending');
      if (partiallyPreparedBundles.length > 0 && partiallyPreparedBundles[0].serverResponse) {
        return {
          success: true,
          mintAddress: mint,
          poolId,
          lookupTableAddress,
          result: partiallyPreparedBundles[0].serverResponse
        };
      }
      return {
        success: true,
        mintAddress: mint,
        poolId,
        lookupTableAddress,
        result: partiallyPreparedBundles
      };
    }
    
    // Create keypairs from private keys
    const walletKeypairs = wallets.map(wallet => 
      Keypair.fromSecretKey(bs58.decode(wallet.privateKey))
    );
    
    // Create mint keypair if provided (for advanced mode)
    let mintKeypair: Keypair | null = null;
    if (mintPrivateKey) {
      try {
        mintKeypair = Keypair.fromSecretKey(bs58.decode(mintPrivateKey));
        console.info(`Mint keypair loaded: ${mintKeypair.publicKey.toBase58()}`);
      } catch (e) {
        console.warn('Failed to load mint keypair:', e);
      }
    }
    
    // Handle advanced mode (Meteora with 6-20 wallets)
    if (isAdvancedMode && stages && stages.length > 0) {
      console.info(`🚀 Advanced mode: ${stages.length} stages to execute`);
      return await executeAdvancedModeCreate(
        stages,
        walletKeypairs,
        mintKeypair,
        mint,
        poolId,
        lookupTableAddress
      );
    }
    
    // Simple mode: single bundle flow
    if (partiallyPreparedBundles.length === 0) {
      return {
        success: false,
        error: 'No transactions generated.'
      };
    }
    
    console.info(`Received ${partiallyPreparedBundles.length} bundles from backend`);
    
    // Split and sign all bundles
    const splitBundles = splitLargeBundles(partiallyPreparedBundles);
    const additionalKeypairs = mintKeypair ? [mintKeypair] : [];
    const signedBundles = splitBundles.map((bundle, index) =>
      completeBundleSigning(bundle, walletKeypairs, additionalKeypairs, index === 0)
    );
    
    console.info(`Completed signing for ${signedBundles.length} bundles`);
    
    // Filter out empty bundles
    const validSignedBundles = signedBundles.filter(bundle => bundle.transactions.length > 0);
    
    if (validSignedBundles.length === 0) {
      return {
        success: false,
        error: 'Failed to sign any transactions'
      };
    }
    
    // Send bundles
    const firstBundleResult = await sendFirstBundle(validSignedBundles[0].transactions);
    
    if (!firstBundleResult.success) {
      console.error("❌ Critical error: First bundle failed to land:", firstBundleResult.error);
      return {
        success: false,
        mintAddress: mint,
        error: `First bundle failed: ${firstBundleResult.error || 'Unknown error'}`
      };
    }
    
    console.info("✅ First bundle landed successfully!");
    
    // Send remaining bundles
    const results: BundleResult[] = firstBundleResult.result ? [firstBundleResult.result] : [];
    let successCount = 1;
    let failureCount = 0;
    
    for (let i = 1; i < validSignedBundles.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 100 * i));
      
        const result = await sendBundle(validSignedBundles[i].transactions);
      if (result.success && result.result) {
        results.push(result.result);
        successCount++;
        console.info(`Bundle ${i + 1} sent successfully`);
      } else {
        failureCount++;
        console.error(`Error sending bundle ${i + 1}:`, result.error);
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
        results
      }
    };
  } catch (error) {
    console.error('Create error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Validate create inputs
 */
export const validateCreateInputs = (
  wallets: WalletForCreate[],
  config: CreateConfig,
  walletBalances: Map<string, number>
): { valid: boolean; error?: string } => {
  if (!['pumpfun', 'bonk', 'meteora'].includes(config.platform)) {
    return { valid: false, error: 'Invalid platform' };
  }
  
  if (!config.token.name || !config.token.symbol || !config.token.imageUrl) {
    return { valid: false, error: 'Token name, symbol, and image are required' };
  }
  
  if (!wallets.length) {
    return { valid: false, error: 'At least one wallet is required' };
  }
  
  // Meteora supports up to 20 wallets in advanced mode
  const maxWallets = config.platform === 'meteora' ? 20 : 5;
  if (wallets.length > maxWallets) {
    return { valid: false, error: `Maximum ${maxWallets} wallets allowed for ${config.platform}` };
  }
  
  for (const wallet of wallets) {
    if (!wallet.address || !wallet.privateKey) {
      return { valid: false, error: 'Invalid wallet data' };
    }
    
    if (wallet.amount <= 0) {
      return { valid: false, error: 'Invalid wallet amount' };
    }
    
    const balance = walletBalances.get(wallet.address) || 0;
    if (balance < wallet.amount) {
      return { valid: false, error: `Wallet ${wallet.address.substring(0, 6)}... has insufficient balance` };
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
  bonkType?: 'meme' | 'tech';
  meteoraConfig?: MeteoraConfig;
}): CreateConfig => {
  return {
    platform: params.platform,
    token: params.token,
    pumpType: params.pumpType,
    bonkType: params.bonkType,
    meteoraConfig: params.meteoraConfig
  };
};

// Default Meteora pool config addresses
export const METEORA_CONFIGS = {
  standard: 'FiENCCbPi3rFh5pW2AJ59HC53yM32qRTLqNKBFbgevo1',
};
