import { Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

// Constants for rate limiting
const MAX_BUNDLES_PER_SECOND = 2;
const MAX_RETRY_ATTEMPTS = 50;
const MAX_CONSECUTIVE_ERRORS = 3;
const BASE_RETRY_DELAY = 200; // milliseconds

// Rate limiting state
const rateLimitState = {
  count: 0,
  lastReset: Date.now(),
  maxBundlesPerSecond: MAX_BUNDLES_PER_SECOND
};

// Interfaces
export interface WalletForMoonCreate {
  address: string;
  privateKey: string;
}

export interface TokenCreationConfig {
  config: Record<string, unknown>; // The full config object with tokenCreation metadata
}

export interface MoonCreateBundle {
  transactions: string[]; // Base58 encoded transaction data
}

interface BundleResult {
  jsonrpc: string;
  id: number;
  result?: string;
  error?: {
    code: number;
    message: string;
  };
}

interface MoonCreateResponse {
  success: boolean;
  mintAddress?: string;
  transactions?: string[];
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
    const baseUrl = ((window as Window & { tradingServerUrl?: string }).tradingServerUrl?.replace(/\/+$/, '') || '');
    
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

    const data = await response.json() as { result?: BundleResult; error?: { message?: string } };
    
    if (data.error) {
      throw new Error(data.error.message || 'Unknown error from bundle server');
    }
    
    if (!data.result) {
      throw new Error('No result returned from bundle server');
    }
    
    return data.result;
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
 * Get partially prepared moon create transactions from backend
 */
const getPartiallyPreparedTransactions = async (
  walletAddresses: string[], 
  tokenCreationConfig: TokenCreationConfig,
  amounts?: number[]
): Promise<{ mintAddress: string, bundles: MoonCreateBundle[] }> => {
  try {
    
    
    const response = await fetch(`https://utils.fury.bot/solana/moonshot/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddresses,
        config: tokenCreationConfig.config,
        amounts, // Optional custom amounts per wallet
        rpcUrl: (window as Window & { rpcUrl?: string }).rpcUrl || undefined
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json() as MoonCreateResponse;
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially prepared transactions');
    }
    
    // Handle different response formats
    const responseData = (data as unknown as { data?: { transactions?: string[]; mintAddress?: string } }).data;
    const transactions = responseData?.transactions || (data as unknown as { transactions?: string[] }).transactions;
    const mintAddress = responseData?.mintAddress || data.mintAddress;
    
    if (!mintAddress) {
      throw new Error('No mint address returned from backend');
    }
    
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      throw new Error('No transactions returned from backend');
    }
    
    console.info(`Received ${transactions.length} transactions for mint ${mintAddress}`);
    
    // Group transactions into bundles of max 5 transactions per bundle
    const MAX_TX_PER_BUNDLE = 5;
    const bundles: MoonCreateBundle[] = [];
    
    for (let i = 0; i < transactions.length; i += MAX_TX_PER_BUNDLE) {
      bundles.push({
        transactions: transactions.slice(i, i + MAX_TX_PER_BUNDLE)
      });
    }
    
    return {
      mintAddress,
      bundles
    };
  } catch (error) {
    console.error('Error getting partially prepared transactions:', error);
    throw error;
  }
};

/**
 * Complete bundle signing
 */
const completeBundleSigning = (
  bundle: MoonCreateBundle, 
  walletKeypairs: Keypair[],
  _isFirstBundle: boolean = false
): MoonCreateBundle => {
  // Check if the bundle has a valid transactions array
  if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
    console.error("Invalid bundle format, transactions property is missing or not an array:", bundle);
    return { transactions: [] };
  }

  const signedTransactions = bundle.transactions.map((txBase58, index) => {
    try {
      // Deserialize transaction
      const txBuffer = bs58.decode(txBase58);
      const transaction = VersionedTransaction.deserialize(txBuffer);
      
      // Check if transaction is already fully signed
      const isFullySigned = transaction.signatures.every(sig => 
        !sig.every(byte => byte === 0)
      );
      
      if (isFullySigned) {
        console.info(`Transaction ${index} is already fully signed, skipping.`);
        return txBase58;
      }
      
      // Find signers for this transaction
      const signers: Keypair[] = [];
      for (const accountKey of transaction.message.staticAccountKeys) {
        const pubkeyStr = accountKey.toBase58();
        const matchingKeypair = walletKeypairs.find(
          kp => kp.publicKey.toBase58() === pubkeyStr
        );
        
        if (matchingKeypair && !signers.some(s => s.publicKey.equals(matchingKeypair.publicKey))) {
          signers.push(matchingKeypair);
        }
      }
      
      if (signers.length === 0) {
        console.warn(`No matching signers found for transaction ${index}. This might be an error.`);
        return txBase58; // Return original if no signers found
      }
      
      // Sign the transaction
      transaction.sign(signers);
      
      // Verify transaction is now signed
      const isNowSigned = transaction.signatures.some(sig => 
        !sig.every(byte => byte === 0)
      );
      
      if (!isNowSigned) {
        console.warn(`Transaction ${index} could not be signed properly.`);
      }
      
      // Serialize and encode the fully signed transaction
      return bs58.encode(transaction.serialize());
    } catch (error) {
      console.error(`Error signing transaction ${index}:`, error);
      return txBase58; // Return original on error
    }
  });
  
  return { transactions: signedTransactions };
};

/**
 * Execute moon create operation on the frontend with improved reliability
 */
interface ExecuteResult {
  totalBundles: number;
  successCount: number;
  failureCount: number;
  results: BundleResult[];
}

export const executeMoonCreate = async (
  wallets: WalletForMoonCreate[],
  tokenCreationConfig: TokenCreationConfig,
  customAmounts?: number[]
): Promise<{ success: boolean; mintAddress?: string; result?: ExecuteResult; error?: string }> => {
  try {
    console.info(`Preparing to create token using ${wallets.length} wallets`);
    
    // Extract wallet addresses
    const walletAddresses = wallets.map(wallet => wallet.address);
    
    // Step 1: Get partially prepared bundles from backend
    const { mintAddress, bundles } = await getPartiallyPreparedTransactions(
      walletAddresses,
      tokenCreationConfig,
      customAmounts
    );
    console.info(`Received ${bundles.length} bundles from backend for mint ${mintAddress}`);
    
    // Step 2: Create keypairs from private keys
    const walletKeypairs = wallets.map(wallet => 
      Keypair.fromSecretKey(bs58.decode(wallet.privateKey))
    );
    
    // Step 3: Complete transaction signing for each bundle
    const signedBundles = bundles.map((bundle, index) =>
      completeBundleSigning(bundle, walletKeypairs, index === 0) // Mark first bundle
    );
    console.info(`Completed signing for ${signedBundles.length} bundles`);
    
    // Step 4: Send each bundle with improved retry logic and dynamic delays
    const results: BundleResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    // Send first bundle - critical for token creation
    if (signedBundles.length > 0) {
      const firstBundleResult = await sendFirstBundle(signedBundles[0]);
      if (firstBundleResult.success) {
        results.push(firstBundleResult.result as BundleResult);
        successCount++;
        console.info("✅ First bundle landed successfully!");
      } else {
        console.error("❌ Critical error: First bundle failed to land:", firstBundleResult.error);
        return {
          success: false,
          mintAddress,
          error: `First bundle failed: ${firstBundleResult.error}`
        };
      }
    }
    
    // Send remaining bundles
    for (let i = 1; i < signedBundles.length; i++) {
      try {
        // Apply rate limiting
        await checkRateLimit();
        
        // Send the bundle
        const result = await sendBundle(signedBundles[i].transactions);
        
        results.push(result);
        successCount++;
        console.info(`Bundle ${i + 1}/${signedBundles.length} sent successfully`);
      } catch (error) {
        failureCount++;
        console.error(`Bundle ${i + 1}/${signedBundles.length} failed:`, error);
      }
    }
    
    return {
      success: successCount > 0,
      mintAddress,
      result: {
        totalBundles: signedBundles.length,
        successCount,
        failureCount,
        results
      }
    };
  } catch (error) {
    console.error('Moon create error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Send first bundle with extensive retry logic - this is critical for success
 */
const sendFirstBundle = async (bundle: MoonCreateBundle): Promise<{success: boolean, result?: BundleResult, error?: string}> => {
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