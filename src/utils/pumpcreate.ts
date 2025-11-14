import { Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import type { ApiResponse, BundleResult, ServerConfig } from '../types/api';

// Constants for rate limiting
const MAX_BUNDLES_PER_SECOND = 2;
const MAX_RETRY_ATTEMPTS = 50;
const MAX_CONSECUTIVE_ERRORS = 3;
const BASE_RETRY_DELAY = 200; // milliseconds

// Rate limiting state (same as in pumpbuy)
const rateLimitState = {
  count: 0,
  lastReset: Date.now(),
  maxBundlesPerSecond: MAX_BUNDLES_PER_SECOND
};

// Interfaces
export interface WalletForPumpCreate {
  address: string;
  privateKey: string;
}

export interface TokenCreationConfig {
  mintPubkey: string;
  config: Record<string, unknown>; // The full config object
}

export interface PumpCreateBundle {
  transactions: string[]; // Base58 encoded transaction data
}

interface PartiallyPreparedResponse {
  success: boolean;
  error?: string;
  bundles?: Array<PumpCreateBundle | string[]>;
  transactions?: string[];
}

interface ExecutePumpCreateResult {
  success: boolean;
  mintAddress?: string;
  result?: {
    totalBundles: number;
    successCount: number;
    failureCount: number;
    results: BundleResult[];
  };
  error?: string;
}

interface SendBundleResult {
  success: boolean;
  result?: BundleResult;
  error?: string;
}

/**
 * Check rate limit and wait if necessary
 */
const checkRateLimit = async (): Promise<void> => {
  const now = Date.now();
  
  if (now - rateLimitState.lastReset >= 1000) {
    rateLimitState.count = 0;
    rateLimitState.lastReset = now;
  }
  
  if (rateLimitState.count >= rateLimitState.maxBundlesPerSecond) {
    const waitTime = 1000 - (now - rateLimitState.lastReset);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    rateLimitState.count = 0;
    rateLimitState.lastReset = Date.now();
  }
  
  rateLimitState.count++;
};

/**
 * Send bundle to Jito block engine through backend proxy with improved error handling
 */
const sendBundle = async (encodedBundle: string[]): Promise<BundleResult> => {
  try {
    const windowWithConfig = window as Window & Partial<ServerConfig>;
    const baseUrl = windowWithConfig.tradingServerUrl?.replace(/\/+$/, '') || '';
    
    // Send to our backend proxy instead of directly to Jito
    const response = await fetch(`${baseUrl}/solana/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: encodedBundle
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: ApiResponse<BundleResult> = await response.json() as ApiResponse<BundleResult>;
    
    if (data.error) {
      throw new Error(data.error || 'Unknown error from bundle server');
    }
    
    return data.result as BundleResult;
  } catch (error) {
    console.error('Error sending bundle:', error);
    throw error;
  }
};

/**
 * Exponential backoff delay with jitter
 */
const getRetryDelay = (attempt: number): number => {
  // Base delay with exponential increase and random jitter (±15%)
  const jitter = 0.85 + (Math.random() * 0.3);
  return Math.floor(BASE_RETRY_DELAY * Math.pow(1.5, attempt) * jitter);
};

/**
 * Get partially prepared pump create transactions from backend
 */
const getPartiallyPreparedTransactions = async (
  walletAddresses: string[], 
  tokenCreationConfig: TokenCreationConfig,
  amounts?: number[]
): Promise<PumpCreateBundle[]> => {
  try {
    
    
    const response = await fetch(`https://utils.fury.bot/solana/pumpfun/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddresses,
        mintPubkey: tokenCreationConfig.mintPubkey,
        config: tokenCreationConfig.config,
        amounts: amounts // Optional custom amounts per wallet
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: PartiallyPreparedResponse = await response.json() as PartiallyPreparedResponse;
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially prepared transactions');
    }
    
    // Handle different response formats to ensure compatibility
    const responseData = (data as unknown as { data?: { bundles?: Array<PumpCreateBundle | string[]>; transactions?: string[] } }).data;
    
    if (responseData?.bundles && Array.isArray(responseData.bundles)) {
      // Wrap any bundle that is a plain array
      return responseData.bundles.map((bundle: PumpCreateBundle | string[]) =>
        Array.isArray(bundle) ? { transactions: bundle } : bundle
      );
    } else if (responseData?.transactions && Array.isArray(responseData.transactions)) {
      // New format: single flat array of transactions in data.data.transactions
      console.info(`Received ${responseData.transactions.length} transactions in nested data format`);
      return [{ transactions: responseData.transactions }];
    } else if (data.bundles && Array.isArray(data.bundles)) {
      // Wrap any bundle that is a plain array
      return data.bundles.map((bundle: PumpCreateBundle | string[]) =>
        Array.isArray(bundle) ? { transactions: bundle } : bundle
      );
    } else if (data.transactions && Array.isArray(data.transactions)) {
      // New format: single flat array of transactions in data.transactions
      // Create a single bundle with all transactions
      console.info(`Received ${data.transactions.length} transactions in flat array format`);
      return [{ transactions: data.transactions }];
    } else {
      throw new Error('No transactions returned from backend');
    }
  } catch (error) {
    console.error('Error getting partially prepared transactions:', error);
    throw error;
  }
};

/**
 * Complete bundle signing, handling the special case of the first transaction
 * in the first bundle that is partially signed by PumpFun API
 */
const completeBundleSigning = (
  bundle: PumpCreateBundle, 
  walletKeypairs: Keypair[],
  isFirstBundle: boolean = false
): PumpCreateBundle => {
  // Check if the bundle has a valid transactions array
  if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
    console.error("Invalid bundle format, transactions property is missing or not an array:", bundle);
    return { transactions: [] };
  }

  const signedTransactions = bundle.transactions.map((txBase58, index) => {
    // Deserialize transaction
    const txBuffer = bs58.decode(txBase58);
    const transaction = VersionedTransaction.deserialize(txBuffer);
    
    // Special handling for first transaction in first bundle (already partially signed by PumpFun API)
    if (isFirstBundle && index === 0) {
      // Check if it has at least one signature already
      const hasSignature = transaction.signatures.some(sig => 
        !sig.every(byte => byte === 0)
      );
      
      if (hasSignature) {
        console.info("First transaction already partially signed by PumpFun API, preserving signature");
        
        // Find remaining required signers
        const requiredSigners: Keypair[] = [];
        for (const accountKey of transaction.message.staticAccountKeys) {
          const pubkeyStr = accountKey.toBase58();
          const matchingKeypair = walletKeypairs.find(
            kp => kp.publicKey.toBase58() === pubkeyStr
          );
          
          // Only add keypairs that need to sign but haven't yet
          if (matchingKeypair) {
            const signerIndex = transaction.message.staticAccountKeys.findIndex(
              key => key.equals(matchingKeypair.publicKey)
            );
            
            // Check if this signer's signature is empty
            if (signerIndex >= 0 && 
                transaction.signatures[signerIndex] && 
                transaction.signatures[signerIndex].every(byte => byte === 0)) {
              requiredSigners.push(matchingKeypair);
            }
          }
        }
        
        // Sign with required signers
        transaction.sign(requiredSigners);
        return bs58.encode(transaction.serialize());
      }
    }
    
    // Standard signing for other transactions
    const signers: Keypair[] = [];
    for (const accountKey of transaction.message.staticAccountKeys) {
      const pubkeyStr = accountKey.toBase58();
      const matchingKeypair = walletKeypairs.find(
        kp => kp.publicKey.toBase58() === pubkeyStr
      );
      if (matchingKeypair && !signers.includes(matchingKeypair)) {
        signers.push(matchingKeypair);
      }
    }
    
    // Sign the transaction
    transaction.sign(signers);
    
    // Serialize and encode the fully signed transaction
    return bs58.encode(transaction.serialize());
  });
  
  return { transactions: signedTransactions };
};

/**
 * Execute pump create operation on the frontend with improved reliability
 */
export const executePumpCreate = async (
  wallets: WalletForPumpCreate[],
  tokenCreationConfig: TokenCreationConfig,
  customAmounts?: number[]
): Promise<ExecutePumpCreateResult> => {
  try {
    const configData = tokenCreationConfig.config;
    const tokenCreation = configData?.['tokenCreation'] as Record<string, unknown> | undefined;
    const isMayhemMode = (tokenCreation?.['isMayhemMode'] as boolean) || false;
    console.info(`Preparing to create token ${tokenCreationConfig.mintPubkey} using ${wallets.length} wallets${isMayhemMode ? ' (Mayhem Mode enabled)' : ''}`);
    
    // Extract wallet addresses
    const walletAddresses = wallets.map(wallet => wallet.address);
    
    // Step 1: Get partially prepared bundles from backend
    const partiallyPreparedBundles = await getPartiallyPreparedTransactions(
      walletAddresses,
      tokenCreationConfig,
      customAmounts
    );
    console.info(`Received ${partiallyPreparedBundles.length} bundles from backend`);
    
    // Step 2: Create keypairs from private keys
    const walletKeypairs = wallets.map(wallet => 
      Keypair.fromSecretKey(bs58.decode(wallet.privateKey))
    );
    
    // Step 3: Complete transaction signing for each bundle
    const signedBundles = partiallyPreparedBundles.map((bundle, index) =>
      completeBundleSigning(bundle, walletKeypairs, index === 0) // Mark first bundle
    );
    console.info(`Completed signing for ${signedBundles.length} bundles`);
    
    // Step 4: Send each bundle with improved retry logic and dynamic delays
    const results: BundleResult[] = [];
    let successCount = 0;
    const failureCount = 0;
    
    // Send first bundle - critical for token creation
    if (signedBundles.length > 0) {
      const firstBundleResult = await sendFirstBundle(signedBundles[0]);
      if (firstBundleResult.success && firstBundleResult.result) {
        results.push(firstBundleResult.result);
        successCount++;
        console.info("✅ First bundle landed successfully!");
      } else {
        console.error("❌ Critical error: First bundle failed to land:", firstBundleResult.error);
        return {
          success: false,
          mintAddress: tokenCreationConfig.mintPubkey,
          error: `First bundle failed: ${firstBundleResult.error || 'Unknown error'}`
        };
      }
    }
    
    
    return {
      success: successCount > 0,
      mintAddress: tokenCreationConfig.mintPubkey,
      result: {
        totalBundles: signedBundles.length,
        successCount,
        failureCount,
        results
      }
    };
  } catch (error) {
    console.error('Pump create error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Send first bundle with extensive retry logic - this is critical for success
 */
const sendFirstBundle = async (bundle: PumpCreateBundle): Promise<SendBundleResult> => {
  console.info(`Sending first bundle with ${bundle.transactions.length} transactions (critical)...`);
  
  let attempt = 0;
  let consecutiveErrors = 0;
  
  while (attempt < MAX_RETRY_ATTEMPTS && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
    try {
      // Apply rate limiting
      await checkRateLimit();
      
      // Send the bundle
      const result = await sendBundle(bundle.transactions);
      
      // Success!
      console.info(`First bundle sent successfully on attempt ${attempt + 1}`);
      return { success: true, result };
    } catch (error) {
      consecutiveErrors++;
      
      // Determine wait time with exponential backoff
      const waitTime = getRetryDelay(attempt);
      
      console.warn(`First bundle attempt ${attempt + 1} failed. Retrying in ${waitTime}ms...`, error);
      
      // Wait before trying again
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    attempt++;
  }
  
  return { 
    success: false, 
    error: `Failed to send first bundle after ${attempt} attempts` 
  };
};
