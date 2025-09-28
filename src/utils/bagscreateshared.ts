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

// Interfaces for shared fees
export interface WalletForBagsSharedCreate {
  address: string;
  privateKey: string;
}

export interface BuyerWallet {
  publicKey: string;
  amount: number;
}

export interface BagsSharedTokenMetadata {
  name: string;
  symbol: string;
  description: string;
  telegram?: string;
  twitter?: string;
  website?: string;
}

export interface BagsSharedFeesConfig {
  ownerPublicKey: string;
  feeClaimerTwitterHandle: string;
  creatorFeeBps: number;
  feeClaimerFeeBps: number;
  rpcUrl?: string;
}

export interface BagsSharedCreateConfig {
  ownerPublicKey: string;
  configKey: string;
  tokenMintAddress: string; // Use tokenMintAddress to match backend API expectation
  metadataUrl: string; // Required by backend API
  initialBuyAmount: number;
  buyerWallets: BuyerWallet[];
  rpcUrl?: string;
}

// NEW: Interface for step 1 - token creation and fee share configuration
export interface BagsSharedTokenCreateConfig {
  ownerPublicKey: string;
  feeClaimerTwitterHandle: string;
  metadata: {
    name: string;
    symbol: string;
    description?: string;
    telegram?: string;
    twitter?: string;
    website?: string;
  };
  imageSource: string;
  creatorFeeBps?: number;
  feeClaimerFeeBps?: number;
  rpcUrl?: string;
}

// NEW: Response interface for step 1
export interface BagsSharedTokenCreateResponse {
  success: boolean;
  endpoint?: string;
  step?: string;
  tokenInfo?: {
    mintAddress: string;
    metadataUrl: string;
    name: string;
    symbol: string;
    configKey: string;
    mintCreatedInStep1: boolean;
  };
  poolInfo?: {
    bondingCurve: string;
    tokenVault: string;
    solVault: string;
    extractionMethod: string;
  };
  sharedFeesConfig?: {
    enabled: boolean;
    recipients: Array<{
      address: string;
      percentage: number;
      label: string;
    }>;
    totalRecipients: number;
  };
  transactions?: string[];
  bundleOrder?: string[];
  signers?: {
    owner: {
      publicKey: string;
      signs: string[];
    };
  };
  nextStep?: {
    endpoint: string;
    description: string;
    requiredParams: string[];
  };
  urls?: {
    token: string;
    explorer: string;
    meteora: string;
  };
  // Legacy fields for backward compatibility
  tokenMint?: string;
  configKey?: string;
  transaction?: string;
  error?: string;
}

export interface BagsSharedCreateBundle {
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

interface BagsSharedCreateResponse {
  success: boolean;
  mintAddress?: string;
  transactions?: string[];
  error?: string;
  approach?: string;
  // New response format fields
  usedData?: {
    tokenMintAddress: string;
    metadataUrl: string;
    configKey: string;
    ownerPublicKey: string;
    initialBuyAmount: number;
    buyerCount: number;
  };
  poolInfo?: {
    bondingCurve: string;
    tokenVault: string;
    solVault: string;
    extractionMethod: string;
  };
  bundleOrder?: string[];
  transactionDetails?: any[];
  signers?: any;
  summary?: any;
  urls?: {
    token: string;
    explorer: string;
    meteora: string;
  };
}

export interface BagsSharedConfigResponse {
  success: boolean;
  needsConfig: boolean;
  configKey?: string;
  transaction?: string;
  feeShare?: {
    creatorWallet: string;
    feeShareWallet: string;
    feeSplit: {
      creator: number;
      feeClaimer: number;
    };
    twitterHandle: string;
  };
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
 * Check/create shared fees configuration (Step 1-3)
 */
// NEW: Step 1 - Create token and fee share configuration
export const createTokenAndConfig = async (
  config: BagsSharedTokenCreateConfig
): Promise<BagsSharedTokenCreateResponse> => {
  try {
    const baseUrl = 'https://solana.fury.bot';
    
    const response = await fetch(`${baseUrl}/api/bags/config/shared`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: BagsSharedTokenCreateResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create token and config');
    }
    
    // Handle new response format with tokenInfo
    if (data.tokenInfo) {
      // Set legacy fields for backward compatibility
      data.tokenMint = data.tokenInfo.mintAddress;
      data.configKey = data.tokenInfo.configKey;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating token and config:', error);
    throw error;
  }
};

/**
 * Send config transactions with fee transactions in bundles
 */
export const sendLaunchTransactions = async (
  transactions: string[],
  wallets: WalletForBagsSharedCreate[],
  bundleOrder?: string[]
): Promise<{ success: boolean; results?: BundleResult[]; error?: string }> => {
  try {
    console.log(`Sending ${transactions.length} transactions with bundle order:`, bundleOrder);
    
    // Create keypairs from private keys
    const walletKeypairs = wallets.map(wallet => 
      Keypair.fromSecretKey(bs58.decode(wallet.privateKey))
    );
    
    // Find owner wallet (first wallet in the list)
    const ownerWallet = wallets[0];
    if (!ownerWallet) {
      throw new Error('No owner wallet provided');
    }
    
    const results: BundleResult[] = [];
    let successCount = 0;
    
    for (let i = 0; i < transactions.length; i++) {
      try {
        // Apply rate limiting
        await checkRateLimit();
        
        const bundleType = bundleOrder?.[i] || 'unknown';
        console.log(`Processing ${bundleType} transaction ${i + 1}/${transactions.length}`);
        
        // For config transactions, we need to add fee transactions
        if (bundleType === 'config') {
          const result = await signAndSendSharedConfigTransaction(
            transactions[i],
            ownerWallet
          );
          
          if (result.success) {
            results.push({
              jsonrpc: "2.0",
              id: i + 1,
              result: result.signature,
              success: true
            });
            successCount++;
            console.log(`✅ Config transaction ${i + 1} sent successfully`);
          } else {
            throw new Error(result.error || 'Failed to send config transaction');
          }
        } else {
          // Handle other transaction types (launch, buy, etc.)
          // Deserialize transaction
          const txBuffer = bs58.decode(transactions[i]);
          const transaction = VersionedTransaction.deserialize(txBuffer);
          
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
          
          if (signers.length > 0) {
            // Sign the transaction
            transaction.sign(signers);
            console.log(`✅ ${bundleType} transaction ${i + 1} signed with ${signers.length} signers`);
          }
          
          // Serialize and send the transaction
          const signedTxBase58 = bs58.encode(transaction.serialize());
          const result = await sendBundle([signedTxBase58]);
          
          results.push(result);
          successCount++;
          console.log(`✅ ${bundleType} transaction ${i + 1} sent successfully`);
        }
        
      } catch (error) {
        console.error(`❌ Transaction ${i + 1} failed:`, error);
        results.push({ 
          jsonrpc: "2.0", 
          id: i + 1, 
          error: { code: -1, message: error.message } 
        });
      }
    }
    
    return {
      success: successCount > 0,
      results
    };
  } catch (error) {
    console.error('Error sending transactions:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const checkSharedFeesConfig = async (
  sharedFeesConfig: BagsSharedFeesConfig
): Promise<BagsSharedConfigResponse> => {
  try {
    const baseUrl = 'https://solana.fury.bot';
    
    const response = await fetch(`${baseUrl}/api/bags/config/shared`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sharedFeesConfig),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: BagsSharedConfigResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to check shared fees config');
    }
    
    return data;
  } catch (error) {
    console.error('Error checking shared fees config:', error);
    throw error;
  }
};

/**
 * Sign and send shared fees config transaction
 */
export const signAndSendSharedConfigTransaction = async (
  configTransaction: string,
  ownerWallet: WalletForBagsSharedCreate,
  rpcEndpoint?: string
): Promise<{ success: boolean; signature?: string; error?: string }> => {
  try {
    console.log('Signing and sending shared fees config transaction...');
    
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
    const configuredFee = parseFloat(savedConfig?.transactionFee || '0.001');
    const transactionFee = configuredFee * LAMPORTS_PER_SOL; // Use configured fee
    const solTransferAmount = 0.001 * LAMPORTS_PER_SOL; // Use configured fee
    
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
    
    console.log('Shared fees config bundle has been sent', result);
    
    // Handle different response structures
    if (result.success || result.result || result.jito) {
      const signature = result.jito || result.result || 'Bundle sent successfully';
      console.log('Shared fees config and fee transactions sent successfully:', signature);
      return {
        success: true,
        signature: signature
      };
    } else {
      throw new Error(result.error?.message || 'Failed to send shared fees config and fee transactions');
    }
  } catch (error) {
    console.error('Error signing and sending shared fees config transaction:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get partially prepared shared fees create transactions from backend (Step 2)
 */
const getPartiallyPreparedSharedTransactions = async (
  sharedCreateConfig: BagsSharedCreateConfig
): Promise<{ mintAddress: string, bundles: BagsSharedCreateBundle[] }> => {
  try {
    const baseUrl = 'https://solana.fury.bot';
    
    const response = await fetch(`${baseUrl}/api/bags/create/shared`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sharedCreateConfig),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: BagsSharedCreateResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially prepared shared transactions');
    }
    
    // Handle both old and new response formats for mint address
    const mintAddress = data.mintAddress || data.usedData?.tokenMintAddress;
    if (!mintAddress) {
      throw new Error('No mint address returned from shared fees backend');
    }
    
    if (!data.transactions || !Array.isArray(data.transactions) || data.transactions.length === 0) {
      throw new Error('No transactions returned from shared fees backend');
    }
    
    console.log(`Received ${data.transactions.length} shared fees transactions for mint ${mintAddress}`);
    
    // Group transactions into bundles of max 5 transactions per bundle
    // IMPORTANT: Maintain original transaction order from backend
    const MAX_TX_PER_BUNDLE = 5;
    const bundles: BagsSharedCreateBundle[] = [];
    
    for (let i = 0; i < data.transactions.length; i += MAX_TX_PER_BUNDLE) {
      const bundleTransactions = data.transactions.slice(i, i + MAX_TX_PER_BUNDLE);
      bundles.push({
        transactions: bundleTransactions
      });
      console.log(`Created shared fees bundle ${bundles.length} with ${bundleTransactions.length} transactions (positions ${i}-${i + bundleTransactions.length - 1})`);
    }
    
    return {
      mintAddress,
      bundles
    };
  } catch (error) {
    console.error('Error getting partially prepared shared fees transactions:', error);
    throw error;
  }
};

/**
 * Complete bundle signing for shared fees
 */
const completeBundleSigning = (
  bundle: BagsSharedCreateBundle, 
  walletKeypairs: Keypair[],
  isFirstBundle: boolean = false
): BagsSharedCreateBundle => {
  // Check if the bundle has a valid transactions array
  if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
    console.error("Invalid shared fees bundle format, transactions property is missing or not an array:", bundle);
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
        console.log(`Shared fees transaction ${index + 1} in bundle is already fully signed, maintaining order.`);
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
        console.warn(`No matching signers found for shared fees transaction ${index + 1} in bundle. This might be an error.`);
        return txBase58; // Return original if no signers found
      }
      
      // Sign the transaction
      transaction.sign(signers);
      
      // Verify transaction is now signed
      const isNowSigned = transaction.signatures.some(sig => 
        !sig.every(byte => byte === 0)
      );
      
      if (!isNowSigned) {
        console.warn(`Shared fees transaction ${index + 1} in bundle could not be signed properly.`);
      } else {
        console.log(`✅ Shared fees transaction ${index + 1} in bundle signed successfully`);
      }
      
      // Serialize and encode the fully signed transaction
      return bs58.encode(transaction.serialize());
    } catch (error) {
      console.error(`❌ Error signing shared fees transaction ${index + 1} in bundle:`, error);
      return txBase58; // Return original on error
    }
  });
  
  return { transactions: signedTransactions };
};

/**
 * Execute shared fees bags create operation on the frontend with improved reliability
 */
export const executeSharedFeesBagsCreate = async (
  wallets: WalletForBagsSharedCreate[],
  sharedFeesConfig: BagsSharedFeesConfig,
  sharedCreateConfig: BagsSharedCreateConfig,
  skipConfigCheck: boolean = false
): Promise<{ 
  success: boolean; 
  mintAddress?: string; 
  result?: any; 
  error?: string; 
  configNeeded?: boolean; 
  configTransaction?: string; 
  configInstructions?: string;
  feeShare?: any;
}> => {
  try {
    console.log(`Preparing to create shared fees token using ${wallets.length} wallets`);
    
    let updatedCreateConfig = sharedCreateConfig;
    
    if (!skipConfigCheck) {
      // Step 1: Check/create shared fees config
      console.log('Checking shared fees config...');
      const configResult = await checkSharedFeesConfig(sharedFeesConfig);
      
      if (configResult.needsConfig && configResult.transaction) {
        console.log('Shared fees config needed. Config transaction must be signed and sent first.');
        return {
          success: false,
          configNeeded: true,
          configTransaction: configResult.transaction,
          configInstructions: configResult.instructions || 'Sign and send this transaction before creating token',
          feeShare: configResult.feeShare,
          error: 'Shared fees config required. Please sign and send the provided transaction first.'
        };
      }
      
      if (!configResult.configKey) {
        throw new Error('No config key received from shared fees config check');
      }
      
      console.log('Shared fees config check passed. Proceeding with token creation...');
      console.log('Fee sharing details:', configResult.feeShare);
      
      // Update the create config with the config key
      updatedCreateConfig = {
        ...sharedCreateConfig,
        configKey: configResult.configKey
      };
    } else {
      console.log('Skipping config check. Proceeding directly with token creation...');
    }
    
    // Step 2: Get partially prepared bundles from backend
    const { mintAddress, bundles } = await getPartiallyPreparedSharedTransactions(updatedCreateConfig);
    console.log(`Received ${bundles.length} shared fees bundles from backend for mint ${mintAddress}`);
    
    // Step 3: Create keypairs from private keys
    const walletKeypairs = wallets.map(wallet => 
      Keypair.fromSecretKey(bs58.decode(wallet.privateKey))
    );
    
    // Step 4: Complete transaction signing for each bundle
    // IMPORTANT: Process bundles in received order to maintain transaction sequence
    const signedBundles = bundles.map((bundle, index) => {
      console.log(`Signing shared fees bundle ${index + 1}/${bundles.length} with ${bundle.transactions.length} transactions`);
      return completeBundleSigning(bundle, walletKeypairs, index === 0); // Mark first bundle
    });
    console.log(`Completed signing for ${signedBundles.length} shared fees bundles in original order`);
    
    // Step 5: Send each bundle with improved retry logic and dynamic delays
    let results: BundleResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    // Send first bundle - critical for token creation
    if (signedBundles.length > 0) {
      const firstBundleResult = await sendFirstBundle(signedBundles[0]);
      if (firstBundleResult.success) {
        results.push(firstBundleResult.result);
        successCount++;
        console.log("✅ First shared fees bundle landed successfully!");
      } else {
        console.error("❌ Critical error: First shared fees bundle failed to land:", firstBundleResult.error);
        return {
          success: false,
          mintAddress,
          error: `First shared fees bundle failed: ${firstBundleResult.error}`
        };
      }
    }
    
    // Send remaining bundles in sequential order
    // IMPORTANT: Maintain bundle order to preserve transaction dependencies
    for (let i = 1; i < signedBundles.length; i++) {
      try {
        // Apply rate limiting
        await checkRateLimit();
        
        console.log(`Sending shared fees bundle ${i + 1}/${signedBundles.length} in sequence...`);
        // Send the bundle
        const result = await sendBundle(signedBundles[i].transactions);
        
        results.push(result);
        successCount++;
        console.log(`✅ Shared fees bundle ${i + 1}/${signedBundles.length} sent successfully in order`);
      } catch (error) {
        failureCount++;
        console.error(`❌ Shared fees bundle ${i + 1}/${signedBundles.length} failed:`, error);
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
    console.error('Shared fees bags create error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send first bundle with extensive retry logic - this is critical for success
 */
const sendFirstBundle = async (bundle: BagsSharedCreateBundle): Promise<{success: boolean, result?: any, error?: string}> => {
  console.log(`Sending first shared fees bundle with ${bundle.transactions.length} transactions (critical)...`);
  
  let attempt = 0;
  let consecutiveErrors = 0;
  
  while (attempt < MAX_RETRY_ATTEMPTS && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
    try {
      // Apply rate limiting
      await checkRateLimit();
      
      // Send the bundle
      const result = await sendBundle(bundle.transactions);
      
      // Success!
      console.log(`First shared fees bundle sent successfully on attempt ${attempt + 1}`);
      return { success: true, result };
    } catch (error) {
      consecutiveErrors++;
      
      // Determine wait time with exponential backoff
      const waitTime = getRetryDelay(attempt);
      
      console.warn(`First shared fees bundle attempt ${attempt + 1} failed. Retrying in ${waitTime}ms...`, error);
      
      // Wait before trying again
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    attempt++;
  }
  
  return { 
    success: false, 
    error: `Failed to send first shared fees bundle after ${attempt} attempts` 
  };
};

/**
 * Helper function to create BagsSharedFeesConfig
 */
export const createSharedFeesConfig = ({
  ownerPublicKey,
  feeClaimerTwitterHandle,
  creatorFeeBps = 1000, // 10% for creator
  feeClaimerFeeBps = 9000, // 90% for fee claimer
  rpcUrl
}: {
  ownerPublicKey: string;
  feeClaimerTwitterHandle: string;
  creatorFeeBps?: number;
  feeClaimerFeeBps?: number;
  rpcUrl?: string;
}): BagsSharedFeesConfig => {
  return {
    ownerPublicKey,
    feeClaimerTwitterHandle,
    creatorFeeBps,
    feeClaimerFeeBps,
    rpcUrl
  };
};

/**
 * Helper function to create BagsSharedCreateConfig
 */
export const createSharedCreateConfig = ({
  ownerPublicKey,
  configKey,
  tokenMintAddress,
  metadataUrl,
  initialBuyAmount,
  buyerWallets,
  rpcUrl
}: {
  ownerPublicKey: string;
  configKey: string;
  tokenMintAddress: string;
  metadataUrl: string;
  initialBuyAmount: number;
  buyerWallets: BuyerWallet[];
  rpcUrl?: string;
}): BagsSharedCreateConfig => {
  return {
    ownerPublicKey,
    configKey,
    tokenMintAddress,
    metadataUrl,
    initialBuyAmount,
    buyerWallets,
    rpcUrl
  };
};
