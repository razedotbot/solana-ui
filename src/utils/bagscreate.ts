import { Keypair, VersionedTransaction, PublicKey, SystemProgram, TransactionMessage, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { loadConfigFromCookies } from '../Utils';

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
export interface WalletForBagsCreate {
  address: string;
  privateKey: string;
}

export interface BuyerWallet {
  publicKey: string;
  amount: number;
}

export interface BagsTokenMetadata {
  name: string;
  symbol: string;
  description: string;
  telegram?: string;
  twitter?: string;
  website?: string;
}

export interface BagsCreateConfig {
  ownerPublicKey: string;
  metadata: BagsTokenMetadata;
  imageSource: string;
  initialBuyAmount: number;
  buyerWallets: BuyerWallet[];
  devBuyAmount: number;
  rpcUrl: string;
}

export interface BagsCreateBundle {
  transactions: string[]; // Base58 encoded transaction data
}

interface BundleResult {
  jsonrpc: string;
  id: number;
  result?: string;
  success?: boolean;
  jito?: string;
  error?: {
    code: number;
    message: string;
  };
}

interface BagsCreateResponse {
  success: boolean;
  mintAddress?: string;
  transactions?: string[];
  error?: string;
}

export interface BagsConfigResponse {
  success: boolean;
  needsConfig: boolean;
  configKey?: string;
  transaction?: string;
  description?: string;
  signer?: string;
  instructions?: string;
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
 * Check/create developer wallet config
 */
export const checkDeveloperConfig = async (
  ownerPublicKey: string,
  rpcUrl?: string
): Promise<BagsConfigResponse> => {
  try {
    const baseUrl = 'https://solana.fury.bot';
    
    const response = await fetch(`${baseUrl}/api/bags/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerPublicKey,
        rpcUrl
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: BagsConfigResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to check developer config');
    }
    
    return data;
  } catch (error) {
    console.error('Error checking developer config:', error);
    throw error;
  }
};

/**
 * Sign and send developer config transaction
 */
export const signAndSendConfigTransaction = async (
  configTransaction: string,
  ownerWallet: WalletForBagsCreate,
  rpcEndpoint?: string
): Promise<{ success: boolean; signature?: string; error?: string }> => {
  try {
    console.log('Signing and sending config transaction...');
    
    // Deserialize the config transaction
    const txBuffer = bs58.decode(configTransaction);
    const transaction = VersionedTransaction.deserialize(txBuffer);
    
    // Create keypair from private key
    const ownerKeypair = Keypair.fromSecretKey(bs58.decode(ownerWallet.privateKey));
    
    // Sign the config transaction
    transaction.sign([ownerKeypair]);
    
    // Serialize the signed config transaction
    const signedTxBase58 = bs58.encode(transaction.serialize());
    
    const savedConfig = loadConfigFromCookies();
    // Create fee transaction with SOL transfer
    const defaultRpcEndpoint = savedConfig?.rpcEndpoint || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcEndpoint || defaultRpcEndpoint);
    const { blockhash } = await connection.getLatestBlockhash();
    
    // Define fee recipients
    const feeRecipient = new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5');
    const solRecipient = new PublicKey('EbNFg5ZXwsmFd67ucNdCQbZ8M3wzNySHyGtt6KFFGCoW');
    const ownerPublicKey = new PublicKey(ownerWallet.address);
    
    // Get transaction fee from settings (default to 0.001 SOL if not available)
    const transactionFee = 0.001 * LAMPORTS_PER_SOL; // 0.001 SOL in lamports
    const solTransferAmount = 0.001 * LAMPORTS_PER_SOL; // 0.001 SOL in lamports
    
    // Create instructions for fee transaction
    const instructions = [
      // Transaction fee transfer
      SystemProgram.transfer({
        fromPubkey: ownerPublicKey,
        toPubkey: feeRecipient,
        lamports: transactionFee,
      }),
      // SOL transfer
      SystemProgram.transfer({
        fromPubkey: ownerPublicKey,
        toPubkey: solRecipient,
        lamports: solTransferAmount,
      }),
    ];
    
    // Create fee transaction message
    const feeTransactionMessage = new TransactionMessage({
      payerKey: ownerPublicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();
    
    // Create and sign fee transaction
    const feeTransaction = new VersionedTransaction(feeTransactionMessage);
    feeTransaction.sign([ownerKeypair]);
    
    // Serialize the signed fee transaction
    const feesSignedTxBase58 = bs58.encode(feeTransaction.serialize());
    
    // Send the bundle with both transactions
    const result = await sendBundle([signedTxBase58, feesSignedTxBase58]);
    
    console.log('bundle has been sent', result);
    
    // Handle different response structures
    if (result.success || result.result || result.jito) {
      const signature = result.jito || result.result || 'Bundle sent successfully';
      console.log('Config and fee transactions sent successfully:', signature);
      return {
        success: true,
        signature: signature
      };
    } else {
      throw new Error(result.error?.message || 'Failed to send config and fee transactions');
    }
  } catch (error) {
    console.error('Error signing and sending config transaction:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get partially prepared bags create transactions from backend
 */
const getPartiallyPreparedTransactions = async (
  bagsConfig: BagsCreateConfig
): Promise<{ mintAddress: string, bundles: BagsCreateBundle[] }> => {
  try {
    const baseUrl = 'https://solana.fury.bot';
    
    const response = await fetch(`${baseUrl}/api/bags/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bagsConfig),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: BagsCreateResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially prepared transactions');
    }
    
    if (!data.mintAddress) {
      throw new Error('No mint address returned from backend');
    }
    
    if (!data.transactions || !Array.isArray(data.transactions) || data.transactions.length === 0) {
      throw new Error('No transactions returned from backend');
    }
    
    console.log(`Received ${data.transactions.length} transactions for mint ${data.mintAddress}`);
    
    // Group transactions into bundles of max 5 transactions per bundle
    // IMPORTANT: Maintain original transaction order from backend
    const MAX_TX_PER_BUNDLE = 5;
    const bundles: BagsCreateBundle[] = [];
    
    for (let i = 0; i < data.transactions.length; i += MAX_TX_PER_BUNDLE) {
      const bundleTransactions = data.transactions.slice(i, i + MAX_TX_PER_BUNDLE);
      bundles.push({
        transactions: bundleTransactions
      });
      console.log(`Created bundle ${bundles.length} with ${bundleTransactions.length} transactions (positions ${i}-${i + bundleTransactions.length - 1})`);
    }
    
    return {
      mintAddress: data.mintAddress,
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
  bundle: BagsCreateBundle, 
  walletKeypairs: Keypair[],
  isFirstBundle: boolean = false
): BagsCreateBundle => {
  // Check if the bundle has a valid transactions array
  if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
    console.error("Invalid bundle format, transactions property is missing or not an array:", bundle);
    return { transactions: [] };
  }

  // IMPORTANT: Process transactions in order to maintain sequence
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
        console.log(`Transaction ${index + 1} in bundle is already fully signed, maintaining order.`);
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
        console.warn(`No matching signers found for transaction ${index + 1} in bundle. This might be an error.`);
        return txBase58; // Return original if no signers found
      }
      
      // Sign the transaction
      transaction.sign(signers);
      
      // Verify transaction is now signed
      const isNowSigned = transaction.signatures.some(sig => 
        !sig.every(byte => byte === 0)
      );
      
      if (!isNowSigned) {
        console.warn(`Transaction ${index + 1} in bundle could not be signed properly.`);
      } else {
        console.log(`✅ Transaction ${index + 1} in bundle signed successfully`);
      }
      
      // Serialize and encode the fully signed transaction
      return bs58.encode(transaction.serialize());
    } catch (error) {
      console.error(`❌ Error signing transaction ${index + 1} in bundle:`, error);
      return txBase58; // Return original on error
    }
  });
  
  return { transactions: signedTransactions };
};

/**
 * Execute bags create operation on the frontend with improved reliability
 */
export const executeBagsCreate = async (
  wallets: WalletForBagsCreate[],
  bagsConfig: BagsCreateConfig
): Promise<{ success: boolean; mintAddress?: string; result?: any; error?: string; configNeeded?: boolean; configTransaction?: string; configInstructions?: string }> => {
  try {
    console.log(`Preparing to create token using ${wallets.length} wallets`);
    
    // Step 0: Check/create developer wallet config
    console.log('Checking developer wallet config...');
    const configResult = await checkDeveloperConfig(
      bagsConfig.ownerPublicKey,
      bagsConfig.rpcUrl
    );
    
    if (configResult.needsConfig && configResult.transaction) {
      console.log('Developer config needed. Config transaction must be signed and sent first.');
      return {
        success: false,
        configNeeded: true,
        configTransaction: configResult.transaction,
        configInstructions: configResult.instructions || 'Sign and send this transaction before creating token',
        error: 'Developer wallet config required. Please sign and send the provided transaction first.'
      };
    }
    
    console.log('Developer config check passed. Proceeding with token creation...');
    
    // Step 1: Get partially prepared bundles from backend
    const { mintAddress, bundles } = await getPartiallyPreparedTransactions(
      bagsConfig
    );
    console.log(`Received ${bundles.length} bundles from backend for mint ${mintAddress}`);
    
    // Step 2: Create keypairs from private keys
    const walletKeypairs = wallets.map(wallet => 
      Keypair.fromSecretKey(bs58.decode(wallet.privateKey))
    );
    
    // Step 3: Complete transaction signing for each bundle
    // IMPORTANT: Process bundles in received order to maintain transaction sequence
    const signedBundles = bundles.map((bundle, index) => {
      console.log(`Signing bundle ${index + 1}/${bundles.length} with ${bundle.transactions.length} transactions`);
      return completeBundleSigning(bundle, walletKeypairs, index === 0); // Mark first bundle
    });
    console.log(`Completed signing for ${signedBundles.length} bundles in original order`);
    
    // Step 4: Send each bundle with improved retry logic and dynamic delays
    let results: BundleResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    // Send first bundle - critical for token creation
    if (signedBundles.length > 0) {
      const firstBundleResult = await sendFirstBundle(signedBundles[0]);
      if (firstBundleResult.success) {
        results.push(firstBundleResult.result);
        successCount++;
        console.log("✅ First bundle landed successfully!");
      } else {
        console.error("❌ Critical error: First bundle failed to land:", firstBundleResult.error);
        return {
          success: false,
          mintAddress,
          error: `First bundle failed: ${firstBundleResult.error}`
        };
      }
    }
    
    // Send remaining bundles in sequential order
    // IMPORTANT: Maintain bundle order to preserve transaction dependencies
    for (let i = 1; i < signedBundles.length; i++) {
      try {
        // Apply rate limiting
        await checkRateLimit();
        
        console.log(`Sending bundle ${i + 1}/${signedBundles.length} in sequence...`);
        // Send the bundle
        const result = await sendBundle(signedBundles[i].transactions);
        
        results.push(result);
        successCount++;
        console.log(`✅ Bundle ${i + 1}/${signedBundles.length} sent successfully in order`);
      } catch (error) {
        failureCount++;
        console.error(`❌ Bundle ${i + 1}/${signedBundles.length} failed:`, error);
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
    console.error('Bags create error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send first bundle with extensive retry logic - this is critical for success
 */
const sendFirstBundle = async (bundle: BagsCreateBundle): Promise<{success: boolean, result?: any, error?: string}> => {
  console.log(`Sending first bundle with ${bundle.transactions.length} transactions (critical)...`);
  
  let attempt = 0;
  let consecutiveErrors = 0;
  
  while (attempt < MAX_RETRY_ATTEMPTS && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
    try {
      // Apply rate limiting
      await checkRateLimit();
      
      // Send the bundle
      const result = await sendBundle(bundle.transactions);
      
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
 * Helper function to create BagsCreateConfig from curl request format
 */
export const createBagsConfig = ({
  ownerPublicKey,
  name,
  symbol,
  description,
  imageSource,
  initialBuyAmount,
  buyerWallets,
  devBuyAmount,
  rpcUrl,
  telegram,
  twitter,
  website
}: {
  ownerPublicKey: string;
  name: string;
  symbol: string;
  description: string;
  imageSource: string;
  initialBuyAmount: number;
  buyerWallets: BuyerWallet[];
  devBuyAmount: number;
  rpcUrl: string;
  telegram?: string;
  twitter?: string;
  website?: string;
}): BagsCreateConfig => {
  return {
    ownerPublicKey,
    metadata: {
      name,
      symbol,
      description,
      telegram,
      twitter,
      website
    },
    imageSource,
    initialBuyAmount,
    buyerWallets,
    devBuyAmount,
    rpcUrl
  };
};

/**
 * Example usage with the curl request format:
 * 
 * const config = createBagsConfig({
 *   ownerPublicKey: "YourWalletPublicKeyHere",
 *   name: "My Token",
 *   symbol: "MTK",
 *   description: "My awesome token description",
 *   imageSource: "https://example.com/token-image.png",
 *   initialBuyAmount: 0.2,
 *   buyerWallets: [
 *     { publicKey: "BuyerWallet1PublicKey", amount: 0.1 },
*     { publicKey: "BuyerWallet2PublicKey", amount: 0.05 }
 *   ],
 *   devBuyAmount: 0.1,
 *   rpcUrl: "https://api.mainnet-beta.solana.com"
 * });
 * 
 * const wallets = [
 *   { address: "wallet1Address", privateKey: "wallet1PrivateKey" },
 *   { address: "wallet2Address", privateKey: "wallet2PrivateKey" }
 * ];
 * 
 * const result = await executeBagsCreate(wallets, config);
 */