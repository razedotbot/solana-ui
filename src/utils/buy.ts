import { Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { loadConfigFromCookies, loadUserFromCookies } from '../Utils';
import { brand } from '../config/brandConfig';

// Constants
const MAX_BUNDLES_PER_SECOND = 2;
const MAX_TRANSACTIONS_PER_BUNDLE = 5;

// Rate limiting state
const rateLimitState = {
  count: 0,
  lastReset: Date.now(),
  maxBundlesPerSecond: MAX_BUNDLES_PER_SECOND
};

// Interfaces
export interface WalletBuy {
  address: string;
  privateKey: string;
}

export type BundleMode = 'single' | 'batch' | 'all-in-one';

export interface BuyConfig {
  tokenAddress: string;
  protocol: 'auto';
  solAmount: number;
  amounts?: number[]; // Optional custom amounts per wallet
  slippageBps?: number; // Slippage in basis points (e.g., 100 = 1%)
  jitoTipLamports?: number; // Custom Jito tip in lamports
  bundleMode?: BundleMode; // Bundle execution mode: 'single', 'batch', or 'all-in-one'
  batchDelay?: number; // Delay between batches in milliseconds (for batch mode)
  singleDelay?: number; // Delay between wallets in milliseconds (for single mode)
}

export interface BuyBundle {
  transactions: string[]; // Base58 encoded transaction data
  serverResponse?: any; // For self-hosted server responses
}

export interface BuyResult {
  success: boolean;
  result?: any;
  error?: string;
}

// Define interface for bundle result from sending
interface BundleResult {
  jsonrpc: string;
  id: number;
  result?: string;
  error?: {
    code: number;
    message: string;
  };
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
 * Send bundle to Jito block engine through our backend proxy
 */
const sendBundle = async (encodedBundle: string[]): Promise<BundleResult> => {
  try {
    const config = loadConfigFromCookies();
    let baseUrl = '';
    
    // Check if self-hosted trading server is enabled
    if (config?.tradingServerEnabled === 'true' && config?.tradingServerUrl) {
      baseUrl = config.tradingServerUrl.replace(/\/+$/, '');
    } else {
      baseUrl = (window as any).tradingServerUrl?.replace(/\/+$/, '') || '';
    }
    
    // Send to our backend proxy instead of directly to Jito
    const response = await fetch(`${baseUrl}/api/transactions/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: encodedBundle
      }),
    });

    const data = await response.json();
    
    return data.result;
  } catch (error) {
    console.error('Error sending bundle:', error);
    throw error;
  }
};

/**
 * Get partially prepared transactions from the unified buy endpoint
 * Step 1: Gather Transactions - Request transaction bundles from the API
 */
const getPartiallyPreparedTransactions = async (
  wallets: WalletBuy[], 
  config: BuyConfig
): Promise<BuyBundle[]> => {
  try {
    const appConfig = loadConfigFromCookies();
    let baseUrl = '';
    
    // Check if self-hosted trading server is enabled
    if (appConfig?.tradingServerEnabled === 'true' && appConfig?.tradingServerUrl) {
      baseUrl = appConfig.tradingServerUrl.replace(/\/+$/, '');
    } else {
      baseUrl = (window as any).tradingServerUrl?.replace(/\/+$/, '') || '';
    }
    
    // Prepare request body according to the unified endpoint specification
    const requestBody: any = {
      tokenAddress: config.tokenAddress,
      protocol: config.protocol,
      solAmount: config.solAmount
    };
    
    // If self-hosted trading server is enabled, send private keys instead of addresses
    if (appConfig?.tradingServerEnabled === 'true') {
      // For self-hosted server, send private keys so server can sign and send
      requestBody.walletPrivateKeys = wallets.map(wallet => wallet.privateKey);
    } else {
      // For regular server, send wallet addresses
      requestBody.walletAddresses = wallets.map(wallet => wallet.address);
    }

    // Add optional parameters if provided
    if (config.amounts) {
      requestBody.amounts = config.amounts;
    }
    
    if (config.slippageBps !== undefined) {
      requestBody.slippageBps = config.slippageBps;
    } else {
      // Use default slippage from app config if available
      const appConfig = loadConfigFromCookies();
      if (appConfig?.slippageBps) {
        requestBody.slippageBps = parseInt(appConfig.slippageBps);
      }
    }
    
    // Use custom Jito tip if provided, otherwise use default from config
    if (config.jitoTipLamports !== undefined) {
      requestBody.jitoTipLamports = config.jitoTipLamports;
    } else {
      const feeInSol = appConfig?.transactionFee || '0.005';
      requestBody.jitoTipLamports = Math.floor(parseFloat(feeInSol) * 1_000_000_000);
    }
    
    // Add telegram parameter from user cookie
    const user = loadUserFromCookies();
    if (user) {
      requestBody.telegram = user;
    }
    
    const response = await fetch(`${baseUrl}/api/tokens/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': brand.api.key
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially prepared transactions');
    }
    
    // Handle different response formats to ensure compatibility
    if (appConfig?.tradingServerEnabled === 'true' && data.data) {
      // Self-hosted server response format: { success: true, data: { bundlesSent: 1, results: [...] } }
      console.log('Self-hosted server response:', data);
      return [{ transactions: [], serverResponse: data.data }];
    } else if (data.bundles && Array.isArray(data.bundles)) {
      // Wrap any bundle that is a plain array
      return data.bundles.map((bundle: any) =>
        Array.isArray(bundle) ? { transactions: bundle } : bundle
      );
    } else if (data.transactions && Array.isArray(data.transactions)) {
      // If we get a flat array of transactions, create a single bundle
      return [{ transactions: data.transactions }];
    } else if (data.data && data.data.transactions && Array.isArray(data.data.transactions)) {
      // Handle the documented response format: { success: true, data: { transactions: [...] } }
      return [{ transactions: data.data.transactions }];
    } else if (Array.isArray(data)) {
      // Legacy format where data itself is an array
      return [{ transactions: data }];
    } else {
      throw new Error('No transactions returned from backend');
    }
  } catch (error) {
    console.error('Error getting partially prepared transactions:', error);
    throw error;
  }
};

/**
 * Complete bundle signing
 * Step 2: Sign Transactions - Sign the transactions with your wallet keypairs
 */
const completeBundleSigning = (
  bundle: BuyBundle, 
  walletKeypairs: Keypair[]
): BuyBundle => {
  // Check if the bundle has a valid transactions array
  if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
    console.error("Invalid bundle format, transactions property is missing or not an array:", bundle);
    return { transactions: [] };
  }

  const signedTransactions = bundle.transactions.map(txBase58 => {
    try {
      // Decode the base64/base58 transaction
      let txBuffer: Uint8Array;
      try {
        // Try base58 first (most common)
        txBuffer = bs58.decode(txBase58);
      } catch {
        // If base58 fails, try base64
        txBuffer = new Uint8Array(Buffer.from(txBase58, 'base64'));
      }
      
      // Deserialize transaction
      const transaction = VersionedTransaction.deserialize(txBuffer);
      
      // Extract required signers from staticAccountKeys
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
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  });
  
  return { transactions: signedTransactions };
};

/**
 * Split large bundles into smaller ones with maximum MAX_TRANSACTIONS_PER_BUNDLE transactions
 * Preserves the original order of transactions across the split bundles
 */
const splitLargeBundles = (bundles: BuyBundle[]): BuyBundle[] => {
  const result: BuyBundle[] = [];
  
  for (const bundle of bundles) {
    if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
      continue;
    }
    
    // If the bundle is small enough, just add it to the result
    if (bundle.transactions.length <= MAX_TRANSACTIONS_PER_BUNDLE) {
      result.push(bundle);
      continue;
    }
    
    // Split the large bundle into smaller ones while preserving transaction order
    for (let i = 0; i < bundle.transactions.length; i += MAX_TRANSACTIONS_PER_BUNDLE) {
      const chunkTransactions = bundle.transactions.slice(i, i + MAX_TRANSACTIONS_PER_BUNDLE);
      result.push({ transactions: chunkTransactions });
    }
  }
  
  return result;
};

/**
 * Execute buy in single mode - prepare and send each wallet separately
 */
const executeBuySingleMode = async (
  wallets: WalletBuy[],
  config: BuyConfig
): Promise<BuyResult> => {
  const singleDelay = config.singleDelay || 200; // Default 200ms delay between wallets
  let results: BundleResult[] = [];
  let successfulWallets = 0;
  let failedWallets = 0;

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    console.log(`Processing wallet ${i + 1}/${wallets.length}: ${wallet.address.substring(0, 8)}...`);

    try {
      // Get transactions for single wallet
      const partiallyPreparedBundles = await getPartiallyPreparedTransactions([wallet], config);
      
      if (partiallyPreparedBundles.length === 0) {
        console.warn(`No transactions for wallet ${wallet.address}`);
        failedWallets++;
        continue;
      }

      // Create keypair for this wallet
      const walletKeypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));

      // Sign and send each bundle for this wallet
      for (const bundle of partiallyPreparedBundles) {
        const signedBundle = completeBundleSigning(bundle, [walletKeypair]);
        
        if (signedBundle.transactions.length > 0) {
          await checkRateLimit();
          const result = await sendBundle(signedBundle.transactions);
          results.push(result);
        }
      }

      successfulWallets++;
      
      // Add configurable delay between wallets (except after the last one)
      if (i < wallets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, singleDelay));
      }
    } catch (error) {
      console.error(`Error processing wallet ${wallet.address}:`, error);
      failedWallets++;
    }
  }

  return {
    success: successfulWallets > 0,
    result: results,
    error: failedWallets > 0 ? `${failedWallets} wallets failed, ${successfulWallets} succeeded` : undefined
  };
};

/**
 * Execute buy in batch mode - prepare 5 wallets per bundle and send with custom delay
 */
const executeBuyBatchMode = async (
  wallets: WalletBuy[],
  config: BuyConfig
): Promise<BuyResult> => {
  const batchSize = 5;
  const batchDelay = config.batchDelay || 1000; // Default 1 second delay
  let results: BundleResult[] = [];
  let successfulBatches = 0;
  let failedBatches = 0;

  // Split wallets into batches
  const batches: WalletBuy[][] = [];
  for (let i = 0; i < wallets.length; i += batchSize) {
    batches.push(wallets.slice(i, i + batchSize));
  }

  console.log(`Processing ${batches.length} batches of up to ${batchSize} wallets each`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length} with ${batch.length} wallets`);

    try {
      // Get transactions for this batch
      const partiallyPreparedBundles = await getPartiallyPreparedTransactions(batch, config);
      
      if (partiallyPreparedBundles.length === 0) {
        console.warn(`No transactions for batch ${i + 1}`);
        failedBatches++;
        continue;
      }

      // Create keypairs for this batch
      const walletKeypairs = batch.map(wallet => 
        Keypair.fromSecretKey(bs58.decode(wallet.privateKey))
      );

      // Split bundles and sign them
      const splitBundles = splitLargeBundles(partiallyPreparedBundles);
      const signedBundles = splitBundles.map(bundle =>
        completeBundleSigning(bundle, walletKeypairs)
      );

      // Send all bundles for this batch
      for (const bundle of signedBundles) {
        if (bundle.transactions.length > 0) {
          await checkRateLimit();
          const result = await sendBundle(bundle.transactions);
          results.push(result);
        }
      }

      successfulBatches++;
      
      // Add delay between batches (except after the last one)
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    } catch (error) {
      console.error(`Error processing batch ${i + 1}:`, error);
      failedBatches++;
    }
  }

  return {
    success: successfulBatches > 0,
    result: results,
    error: failedBatches > 0 ? `${failedBatches} batches failed, ${successfulBatches} succeeded` : undefined
  };
};

/**
 * Execute buy in all-in-one mode - prepare all wallets and send all bundles simultaneously
 */
const executeBuyAllInOneMode = async (
  wallets: WalletBuy[],
  config: BuyConfig
): Promise<BuyResult> => {
  console.log(`Preparing all ${wallets.length} wallets for simultaneous execution`);

  const appConfig = loadConfigFromCookies();
  
  // Get all transactions at once
  const partiallyPreparedBundles = await getPartiallyPreparedTransactions(wallets, config);
  
  if (partiallyPreparedBundles.length === 0) {
    return {
      success: false,
      error: 'No transactions generated.'
    };
  }

  // If self-hosted trading server is enabled, the server handles everything
  if (appConfig?.tradingServerEnabled === 'true') {
    console.log('Self-hosted server handled signing and sending');
    // Return the server response directly
    if (partiallyPreparedBundles.length > 0 && partiallyPreparedBundles[0].serverResponse) {
      return {
        success: true,
        result: partiallyPreparedBundles[0].serverResponse,
        error: undefined
      };
    }
    return {
      success: true,
      result: partiallyPreparedBundles,
      error: undefined
    };
  }

  // Create all keypairs
  const walletKeypairs = wallets.map(wallet => 
    Keypair.fromSecretKey(bs58.decode(wallet.privateKey))
  );

  // Split and sign all bundles
  const splitBundles = splitLargeBundles(partiallyPreparedBundles);
  const signedBundles = splitBundles.map(bundle =>
    completeBundleSigning(bundle, walletKeypairs)
  );

  // Filter out empty bundles
  const validSignedBundles = signedBundles.filter(bundle => bundle.transactions.length > 0);
  
  if (validSignedBundles.length === 0) {
    return {
      success: false,
      error: 'Failed to sign any transactions'
    };
  }

  console.log(`Sending all ${validSignedBundles.length} bundles simultaneously with 100ms delays`);

  // Send all bundles simultaneously with 100ms delays to avoid rate limits
  const bundlePromises = validSignedBundles.map(async (bundle, index) => {
    // Add 100ms delay for each bundle to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, index * 100));
    
    try {
      const result = await sendBundle(bundle.transactions);
      console.log(`Bundle ${index + 1} sent successfully`);
      return { success: true, result };
    } catch (error) {
      console.error(`Error sending bundle ${index + 1}:`, error);
      return { success: false, error };
    }
  });

  // Wait for all bundles to complete
  const bundleResults = await Promise.allSettled(bundlePromises);
  
  // Process results
  let results: BundleResult[] = [];
  let successfulBundles = 0;
  let failedBundles = 0;

  bundleResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        if (result.value.result) results.push(result.value.result);
        successfulBundles++;
      } else {
        failedBundles++;
      }
    } else {
      console.error(`Bundle ${index + 1} promise rejected:`, result.reason);
      failedBundles++;
    }
  });

  return {
    success: successfulBundles > 0,
    result: results,
    error: failedBundles > 0 ? `${failedBundles} bundles failed, ${successfulBundles} succeeded` : undefined
  };
};

/**
 * Execute unified buy operation for all supported protocols
 * Follows the three-step process:
 * 1. Gather Transactions - Request transaction bundles from the API
 * 2. Sign Transactions - Sign the transactions with your wallet keypairs  
 * 3. Send Bundle - Submit the signed transaction bundles to the network
 */
export const executeBuy = async (
  wallets: WalletBuy[],
  config: BuyConfig
): Promise<BuyResult> => {
  try {
    const appConfig = loadConfigFromCookies();
    let bundleMode = config.bundleMode || 'batch'; // Default to batch mode
    
    // If self-hosted trading server is enabled, force all-in-one mode
    if (appConfig?.tradingServerEnabled === 'true') {
      bundleMode = 'all-in-one';
      console.log(`Self-hosted trading server enabled, forcing all-in-one mode`);
    }
    
    console.log(`Preparing to buy ${config.tokenAddress} using ${config.protocol} protocol with ${wallets.length} wallets in ${bundleMode} mode`);
    
    // Execute based on bundle mode
    switch (bundleMode) {
      case 'single':
        return await executeBuySingleMode(wallets, config);
      
      case 'batch':
        return await executeBuyBatchMode(wallets, config);
      
      case 'all-in-one':
        return await executeBuyAllInOneMode(wallets, config);
      
      default:
        throw new Error(`Invalid bundle mode: ${bundleMode}. Must be 'single', 'batch', or 'all-in-one'`);
    }
  } catch (error) {
    console.error(`${config.protocol} buy error:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Validate buy inputs
 */
export const validateBuyInputs = (
  wallets: WalletBuy[],
  config: BuyConfig,
  walletBalances: Map<string, number>
): { valid: boolean; error?: string } => {
  // Check if config is valid
  if (!config.tokenAddress) {
    return { valid: false, error: 'Invalid token address' };
  }
  
  if (!config.protocol) {
    return { valid: false, error: 'Protocol is required' };
  }
  
  const supportedProtocols = ['auto'];

  if (!supportedProtocols.includes(config.protocol)) {
    return { valid: false, error: `Unsupported protocol: ${config.protocol}. Supported protocols: ${supportedProtocols.join(', ')}` };
  }
  
  if (isNaN(config.solAmount) || config.solAmount <= 0) {
    return { valid: false, error: 'Invalid SOL amount' };
  }
  
  // Validate custom amounts if provided
  if (config.amounts) {
    if (config.amounts.length !== wallets.length) {
      return { valid: false, error: 'Custom amounts array length must match wallets array length' };
    }
    
    for (const amount of config.amounts) {
      if (isNaN(amount) || amount <= 0) {
        return { valid: false, error: 'All custom amounts must be positive numbers' };
      }
    }
  }
  
  // Validate slippage if provided
  if (config.slippageBps !== undefined && (isNaN(config.slippageBps) || config.slippageBps < 0)) {
    return { valid: false, error: 'Invalid slippage value' };
  }
  
  // Check if wallets are valid
  if (!wallets.length) {
    return { valid: false, error: 'No wallets provided' };
  }
  
  for (const wallet of wallets) {
    if (!wallet.address || !wallet.privateKey) {
      return { valid: false, error: 'Invalid wallet data' };
    }
    
    const balance = walletBalances.get(wallet.address) || 0;
    const requiredAmount = config.amounts ? 
      config.amounts[wallets.indexOf(wallet)] : 
      config.solAmount;
      
    if (balance < requiredAmount) {
      return { valid: false, error: `Wallet ${wallet.address.substring(0, 6)}... has insufficient balance` };
    }
  }
  
  return { valid: true };
};

/**
 * Helper function to create buy config with default values
 */
export const createBuyConfig = (config: {
  tokenAddress: string;
  protocol?: BuyConfig['protocol'];
  solAmount: number;
  amounts?: number[];
  slippageBps?: number;
  jitoTipLamports?: number;
  bundleMode?: BundleMode;
  batchDelay?: number;
  singleDelay?: number;
}): BuyConfig => {
  return {
    tokenAddress: config.tokenAddress,
    protocol: config.protocol || 'auto',
    solAmount: config.solAmount,
    amounts: config.amounts,
    slippageBps: config.slippageBps,
    jitoTipLamports: config.jitoTipLamports,
    bundleMode: config.bundleMode || 'batch',
    batchDelay: config.batchDelay,
    singleDelay: config.singleDelay
  };
};