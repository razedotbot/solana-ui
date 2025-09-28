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
export interface WalletForBonkCreate {
  publicKey: string;
  privateKey: string;
  amount?: number; // Optional amount for each wallet
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  decimals?: number;
  supply?: string;
  totalSellA?: string;
  uri: string; // Image URL
  telegram?: string;
  twitter?: string;
  website?: string;
  createdOn?: string;
  type?: 'tech' | 'meme';
}

export interface BonkCreateConfig {
  tokenMetadata: TokenMetadata;
  ownerPublicKey: string;
  initialBuyAmount: number; // SOL amount for initial buy
  type?: 'tech' | 'meme';
}

export interface BonkCreateResponse {
  success: boolean;
  tokenCreation?: {
    transaction: string;
    mint: string;
    poolId: string;
  };
  buyerTransactions?: Array<{
    transaction: string;
    publicKey: string;
    index: number;
  }>;
  tokenInfo?: {
    vaultA: string;
    vaultB: string;
    metadata: {
      name: string;
      symbol: string;
      decimals: number;
    }
  };
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
const sendBundle = async (encodedBundle: string[]): Promise<any> => {
  try {
    const baseUrl = (window as any).tradingServerUrl?.replace(/\/+$/, '') || '';
    
    // Send to our backend proxy instead of directly to Jito
    const response = await fetch(`${baseUrl}/api/transactions/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: encodedBundle
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Unknown error from bundle server');
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
 * Get partially prepared bonk create transactions from backend
 */
const getPartiallyPreparedBonkTransactions = async (
  config: BonkCreateConfig,
  buyerWallets: WalletForBonkCreate[]
): Promise<BonkCreateResponse> => {
  try {
    const baseUrl = 'https://solana.fury.bot';
    
    // Format buyer wallets for the API request
    const formattedBuyerWallets = buyerWallets.map(wallet => ({
      publicKey: wallet.publicKey,
      amount: wallet.amount || config.initialBuyAmount * 1e9 // Convert to lamports if not specified
    }));
    
    const response = await fetch(`${baseUrl}/api/letsbonk/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenMetadata: config.tokenMetadata,
        ownerPublicKey: config.ownerPublicKey,
        buyerWallets: formattedBuyerWallets,
        initialBuyAmount: config.initialBuyAmount,
        type: config.type || config.tokenMetadata.type || 'meme'
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially prepared bonk transactions');
    }
    
    return data as BonkCreateResponse;
    
  } catch (error) {
    console.error('Error getting partially prepared bonk transactions:', error);
    throw error;
  }
};

/**
 * Decode transaction string handling both base58 and base64 formats
 */
const decodeTransaction = (transactionStr: string): Uint8Array => {
  // Try base58 first
  try {
    return bs58.decode(transactionStr);
  } catch (error) {
    try {
      // If base58 fails, try base64
      return Buffer.from(transactionStr, 'base64');
    } catch (error) {
      // If both fail, log more context and rethrow
      console.error('Failed to decode transaction. First few characters:', transactionStr.substring(0, 20));
      throw new Error(`Could not decode transaction: ${error.message}`);
    }
  }
};

/**
 * Sign a transaction for the owner wallet
 */
const signOwnerTransaction = (
  transactionStr: string,
  ownerKeypair: Keypair
): string => {
  try {
    // Decode transaction with improved handling
    const txBuffer = decodeTransaction(transactionStr);
    const transaction = VersionedTransaction.deserialize(txBuffer);
    
    // Find owner's index in account keys
    const ownerPubkey = ownerKeypair.publicKey.toBase58();
    const accountKeys = transaction.message.staticAccountKeys;
    
    const signers: Keypair[] = [];
    for (let i = 0; i < accountKeys.length; i++) {
      if (accountKeys[i].toBase58() === ownerPubkey) {
        signers.push(ownerKeypair);
        break;
      }
    }
    
    // Sign the transaction
    transaction.sign(signers);
    
    // Serialize and encode the signed transaction
    return bs58.encode(transaction.serialize());
  } catch (error) {
    console.error('Error signing owner transaction:', error);
    throw error;
  }
};

/**
 * Sign buyer transactions
 */
const signBuyerTransactions = (
  buyerTransactions: Array<{
    transaction: string;
    publicKey: string;
    index: number;
  }>,
  buyerKeypairs: Map<string, Keypair>
): string[] => {
  return buyerTransactions.map(txInfo => {
    try {
      // Get the appropriate keypair
      const keypair = buyerKeypairs.get(txInfo.publicKey);
      if (!keypair) {
        throw new Error(`No keypair found for buyer: ${txInfo.publicKey}`);
      }
      
      // Decode transaction with improved handling
      const txBuffer = decodeTransaction(txInfo.transaction);
      const transaction = VersionedTransaction.deserialize(txBuffer);
      
      // Sign with the buyer's keypair
      transaction.sign([keypair]);
      
      // Return serialized and encoded transaction
      return bs58.encode(transaction.serialize());
    } catch (error) {
      console.error(`Error signing transaction for buyer ${txInfo.publicKey}:`, error);
      throw error;
    }
  });
};

/**
 * Send first bundle with extensive retry logic - this is critical for success
 */
const sendFirstBundle = async (bundle: string[]): Promise<{success: boolean, result?: any, error?: string}> => {
  console.log(`Sending first bundle with ${bundle.length} transactions (critical)...`);
  
  let attempt = 0;
  let consecutiveErrors = 0;
  
  while (attempt < MAX_RETRY_ATTEMPTS && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
    try {
      // Apply rate limiting
      await checkRateLimit();
      
      // Send the bundle
      const result = await sendBundle(bundle);
      
      // Success!
      console.log(`First bundle sent successfully on attempt ${attempt + 1}`);
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

/**
 * Execute bonk token creation operation
 */
export const executeBonkCreate = async (
  config: BonkCreateConfig,
  ownerWallet: { publicKey: string, privateKey: string },
  buyerWallets: WalletForBonkCreate[]
): Promise<{ 
  success: boolean; 
  mintAddress?: string; 
  poolId?: string;
  result?: any; 
  error?: string 
}> => {
  try {
    console.log(`Preparing to create token with name: ${config.tokenMetadata.name} using ${buyerWallets.length} buyer wallets`);
    
    // Step 1: Get partially prepared transactions from backend
    const preparedData = await getPartiallyPreparedBonkTransactions(
      config,
      buyerWallets
    );
    
    if (!preparedData.success || !preparedData.tokenCreation) {
      throw new Error(preparedData.error || 'Failed to prepare bonk token creation');
    }
    
    console.log(`Token mint address: ${preparedData.tokenCreation.mint}`);
    console.log(`Pool ID: ${preparedData.tokenCreation.poolId}`);
    
    // Step 2: Create keypairs from private keys
    const ownerKeypair = Keypair.fromSecretKey(bs58.decode(ownerWallet.privateKey));
    
    const buyerKeypairsMap = new Map<string, Keypair>();
    buyerWallets.forEach(wallet => {
      buyerKeypairsMap.set(
        wallet.publicKey, 
        Keypair.fromSecretKey(bs58.decode(wallet.privateKey))
      );
    });
    
    // Step 3: Sign transactions
    // Sign owner's token creation transaction
    const signedOwnerTx = signOwnerTransaction(
      preparedData.tokenCreation.transaction,
      ownerKeypair
    );
    
    // Sign buyer transactions if they exist
    const signedBuyerTxs = preparedData.buyerTransactions ? 
      signBuyerTransactions(preparedData.buyerTransactions, buyerKeypairsMap) : 
      [];
    
    // Step 4: Create a single bundle with all transactions
    // Add owner transaction first followed by all buyer transactions
    const allTransactions = [signedOwnerTx, ...signedBuyerTxs];
    
    console.log(`Creating one bundle with ${allTransactions.length} transactions (1 owner + ${signedBuyerTxs.length} buyer transactions)`);
    
    // Step 5: Send the single bundle with all transactions
    // This ensures all transactions land in the same block (like pumpfun)
    const bundleResult = await sendFirstBundle(allTransactions);
    if (!bundleResult.success) {
      return {
        success: false,
        error: bundleResult.error || 'Failed to send transactions bundle'
      };
    }
    
    console.log("✅ All transactions sent successfully in one bundle!");
    
    // Simple result count
    const successCount = 1; // Count as one successful bundle
    const failureCount = 0;
    
    return {
      success: true,
      mintAddress: preparedData.tokenCreation.mint,
      poolId: preparedData.tokenCreation.poolId,
      result: {
        totalBundles: 1, // Only one bundle now
        successCount,
        failureCount
      }
    };
  } catch (error) {
    console.error('Bonk create error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};