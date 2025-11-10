import { FormattedWallet } from './trading';
import { Transaction, Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

// Type definition for config to avoid circular dependency
interface AppConfig {
  rpcEndpoint?: string;
  transactionFee?: string;
  slippageBps?: string;
}

// Utility function to get default configuration from cookies
const getDefaultConfig = (): AppConfig | null => {
  try {
    // Get config from cookies directly to avoid circular dependency
    const configCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('tradingConfig='));
    
    if (configCookie) {
      const configValue = configCookie.split('=')[1];
      return JSON.parse(decodeURIComponent(configValue));
    }
    return null;
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
};
export interface LimitOrderConfig {
  inputMint: string;
  outputMint: string;
  maker: string;
  makingAmount: string;
  takingAmount: string;
  slippageBps?: number;
  expiredAt?: number; // Unix timestamp
  base?: 'input' | 'output';
}

export interface CreateLimitOrderRequest {
  inputMint: string;
  outputMint: string;
  maker: string;
  makingAmount: string;
  takingAmount: string;
  slippageBps?: number;
  expiredAt?: number;
  rpcUrl?: string;
  includeTip?: boolean;
  jitoTipLamports?: number;
  affiliateAddress?: string;
  affiliateFee?: number;
  authenticated?: boolean;
}

export interface CreateMultipleLimitOrdersRequest {
  orders: LimitOrderConfig[];
  rpcUrl?: string;
  includeTip?: boolean;
  jitoTipLamports?: number;
  affiliateAddress?: string;
  affiliateFee?: number;
  authenticated?: boolean;
}

export interface CancelOrderRequest {
  maker: string;
  order: string;
  computeUnitPrice?: string;
  rpcUrl?: string;
  includeTip?: boolean;
  jitoTipLamports?: number;
  authenticated?: boolean;
}

export interface LimitOrderResponse {
  success: boolean;
  order?: string;
  requestId?: string;
  orderConfig?: any;
  transaction?: string;
  error?: string;
}

export interface MultipleLimitOrdersResponse {
  success: boolean;
  orders?: Array<{
    order: string;
    requestId: string;
    orderConfig: any;
  }>;
  transactions?: string[];
  errors?: string[];
  error?: string;
}

export interface ActiveOrdersResponse {
  success: boolean;
  orders?: {
    orders: Array<{
      publicKey: string;
      account: {
        orderKey: string;
        userPubkey: string;
        maker: string;
        inputMint: string;
        outputMint: string;
        makingAmount: string;
        takingAmount: string;
        rawTakingAmount: string;
        expiredAt: number | null;
        base: 'input' | 'output';
      };
    }>;
  };
  error?: string;
}

export interface CancelOrderResponse {
  success: boolean;
  transaction?: string;
  requestId?: string;
  error?: string;
}

export interface LimitOrderBundle {
  transactions: string[];
}

export interface BundleResult {
  success: boolean;
  bundleId?: string;
  error?: string;
}

export interface BundleSigningRequest {
  orders: Array<{
    order: string;
    requestId: string;
    orderConfig: any;
  }>;
  transactions: string[];
  errors: string[];
}

// API Base URL - This should be configured based on your backend
const getBaseUrl = () => (window as any).tradingServerUrl?.replace(/\/+$/, '') || '';

// Create a single limit order
export const createLimitOrder = async (
  config: CreateLimitOrderRequest
): Promise<LimitOrderResponse> => {
  try {
    const appConfig = getDefaultConfig();
    
    // Apply default values from app config
    const requestConfig: CreateLimitOrderRequest = {
      ...config,
      rpcUrl: config.rpcUrl || appConfig?.rpcEndpoint,
      includeTip: config.includeTip ?? true,
      jitoTipLamports: config.jitoTipLamports ?? (appConfig?.transactionFee ? Math.floor(parseFloat(appConfig.transactionFee) * 1_000_000_000) : 5000000),
      slippageBps: config.slippageBps ?? (appConfig?.slippageBps ? parseInt(appConfig.slippageBps) : 50),
      authenticated: config.authenticated ?? false
    };

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/limit/create-single`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestConfig)
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Create multiple limit orders
export const createMultipleLimitOrders = async (
  wallets: FormattedWallet[],
  orderConfig: Omit<LimitOrderConfig, 'maker'>,
  options?: {
    rpcUrl?: string;
    includeTip?: boolean;
    jitoTipLamports?: number;
    affiliateAddress?: string;
    affiliateFee?: number;
    authenticated?: boolean;
  }
): Promise<MultipleLimitOrdersResponse> => {
  try {
    const appConfig = getDefaultConfig();
    
    // Create orders for each wallet
    const orders: LimitOrderConfig[] = wallets.map(wallet => ({
      ...orderConfig,
      maker: wallet.address
    }));

    const requestConfig: CreateMultipleLimitOrdersRequest = {
      orders,
      rpcUrl: options?.rpcUrl || appConfig?.rpcEndpoint,
      includeTip: options?.includeTip ?? true,
      jitoTipLamports: options?.jitoTipLamports ?? (appConfig?.transactionFee ? Math.floor(parseFloat(appConfig.transactionFee) * 1_000_000_000) : 5000000),
      affiliateAddress: options?.affiliateAddress,
      affiliateFee: options?.affiliateFee,
      authenticated: options?.authenticated ?? false
    };

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/limit/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestConfig)
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Get active orders for a user
export const getActiveOrders = async (
  userAddress: string,
  filters?: {
    inputMint?: string;
    outputMint?: string;
  }
): Promise<ActiveOrdersResponse> => {
  try {
    const params = new URLSearchParams({
      userAddress
    });

    if (filters?.inputMint) {
      params.append('inputMint', filters.inputMint);
    }

    if (filters?.outputMint) {
      params.append('outputMint', filters.outputMint);
    }

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/limit/active?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Cancel a specific order
export const cancelOrder = async (
  config: CancelOrderRequest
): Promise<CancelOrderResponse> => {
  try {
    const appConfig = getDefaultConfig();
    
    const requestConfig: CancelOrderRequest = {
      ...config,
      computeUnitPrice: config.computeUnitPrice || 'auto',
      rpcUrl: config.rpcUrl || appConfig?.rpcEndpoint,
      includeTip: config.includeTip ?? true,
      jitoTipLamports: config.jitoTipLamports ?? (appConfig?.transactionFee ? Math.floor(parseFloat(appConfig.transactionFee) * 1_000_000_000) : 5000000),
      authenticated: config.authenticated ?? false
    };

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/limit/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestConfig)
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Cancel all orders for a user
export const cancelAllOrders = async (
  userAddress: string,
  options?: {
    rpcUrl?: string;
    includeTip?: boolean;
    jitoTipLamports?: number;
    authenticated?: boolean;
  }
): Promise<{ success: boolean; results: CancelOrderResponse[]; error?: string }> => {
  try {
    // First, get all active orders for the user
    const activeOrdersResponse = await getActiveOrders(userAddress);
    
    if (!activeOrdersResponse.success || !activeOrdersResponse.orders?.orders) {
      return {
        success: false,
        results: [],
        error: activeOrdersResponse.error || 'Failed to fetch active orders'
      };
    }

    const orders = activeOrdersResponse.orders.orders;
    
    if (orders.length === 0) {
      return {
        success: true,
        results: [],
        error: 'No active orders to cancel'
      };
    }

    // Cancel each order
    const cancelPromises = orders.map(order =>
      cancelOrder({
        maker: userAddress,
        order: order.publicKey,
        ...options
      })
    );

    const results = await Promise.all(cancelPromises);
    const hasErrors = results.some(result => !result.success);

    return {
      success: !hasErrors,
      results,
      error: hasErrors ? 'Some orders failed to cancel' : undefined
    };
  } catch (error) {
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Utility function to convert SOL amount to lamports
export const solToLamports = (solAmount: number): string => {
  return Math.floor(solAmount * 1_000_000_000).toString();
};

// Utility function to convert lamports to SOL
export const lamportsToSol = (lamports: string): number => {
  return parseInt(lamports) / 1_000_000_000;
};

// Utility function to format token amount based on decimals
export const formatTokenAmount = (amount: string, decimals: number): string => {
  const factor = Math.pow(10, decimals);
  return Math.floor(parseFloat(amount) * factor).toString();
};

// Utility function to calculate price from making and taking amounts
export const calculatePrice = (makingAmount: string, takingAmount: string): number => {
  const making = parseFloat(makingAmount);
  const taking = parseFloat(takingAmount);
  return taking / making;
};

// Utility function to validate limit order configuration
export const validateLimitOrderConfig = (config: LimitOrderConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.inputMint || config.inputMint.trim() === '') {
    errors.push('Input mint is required');
  }

  if (!config.outputMint || config.outputMint.trim() === '') {
    errors.push('Output mint is required');
  }

  if (!config.maker || config.maker.trim() === '') {
    errors.push('Maker address is required');
  }

  if (!config.makingAmount || parseFloat(config.makingAmount) <= 0) {
    errors.push('Making amount must be greater than 0');
  }

  if (!config.takingAmount || parseFloat(config.takingAmount) <= 0) {
    errors.push('Taking amount must be greater than 0');
  }

  if (config.slippageBps !== undefined && (config.slippageBps < 0 || config.slippageBps > 10000)) {
    errors.push('Slippage must be between 0 and 10000 basis points');
  }

  if (config.expiredAt !== undefined && config.expiredAt <= Date.now() / 1000) {
    errors.push('Expiration time must be in the future');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Create a map of wallet addresses to Keypair objects from FormattedWallet array
 */
export const createKeypairMap = (wallets: FormattedWallet[]): Map<string, Keypair> => {
  console.log(`Creating keypair map for ${wallets.length} wallets`);
  const keypairMap = new Map<string, Keypair>();
  
  wallets.forEach((wallet, index) => {
    try {
      // Decode the private key from base58
      const privateKeyBytes = bs58.decode(wallet.privateKey);
      const keypair = Keypair.fromSecretKey(privateKeyBytes);
      
      // Map both the address and public key string to the keypair
      keypairMap.set(wallet.address, keypair);
      keypairMap.set(keypair.publicKey.toBase58(), keypair);
      
      console.log(`✅ Wallet ${index + 1}: ${wallet.address} -> keypair created`);
    } catch (error) {
      console.error(`❌ Error creating keypair for wallet ${index + 1} (${wallet.address}):`, error);
    }
  });
  
  console.log(`Keypair map created with ${keypairMap.size} entries`);
  return keypairMap;
};

/**
 * Send bundle to Jito block engine through backend proxy
 */
const sendBundle = async (encodedBundle: string[]): Promise<BundleResult> => {
  try {
    const baseUrl = getBaseUrl();
    
    if (!baseUrl) {
      return {
        success: false,
        error: 'Trading server URL not configured'
      };
    }

    console.log(`Sending bundle with ${encodedBundle.length} transactions to ${baseUrl}/solana/transactions/send`);
    
    const response = await fetch(`${baseUrl}/solana/transactions/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactions: encodedBundle
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Bundle send failed with status ${response.status}:`, errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    console.log('Bundle send response:', data);
    return data;
  } catch (error) {
    console.error('Error sending bundle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Complete bundle signing for limit orders
 */
export const completeBundleSigning = (
  bundleData: BundleSigningRequest,
  walletKeypairs: Map<string, Keypair>
): LimitOrderBundle => {
  console.log(`Starting bundle signing with ${bundleData.transactions?.length || 0} transactions and ${walletKeypairs.size} wallet keypairs`);
  
  // Check if the bundle has valid transactions array
  if (!bundleData.transactions || !Array.isArray(bundleData.transactions)) {
    console.error("Invalid bundle format, transactions property is missing or not an array:", bundleData);
    return { transactions: [] };
  }

  if (walletKeypairs.size === 0) {
    console.error("No wallet keypairs provided for signing");
    return { transactions: [] };
  }

  const signedTransactions = bundleData.transactions.map((txBase58, index) => {
    try {
      // Decode the base58 transaction (try base58 first, fallback to base64)
      let transactionBuffer: Uint8Array;
      try {
        transactionBuffer = bs58.decode(txBase58);
      } catch {
        // If base58 fails, try base64
        transactionBuffer = new Uint8Array(Buffer.from(txBase58, 'base64'));
      }
      
      // Deserialize as VersionedTransaction (this is what the API returns)
      const transaction = VersionedTransaction.deserialize(transactionBuffer);
      
      // Find required signers from the transaction's static account keys
      const signers: Keypair[] = [];
      
      // Check each account key to see if we have a matching keypair
      transaction.message.staticAccountKeys.forEach(accountKey => {
        const accountKeyStr = accountKey.toBase58();
        const matchingKeypair = walletKeypairs.get(accountKeyStr);
        
        if (matchingKeypair && !signers.some(s => s.publicKey.equals(matchingKeypair.publicKey))) {
          signers.push(matchingKeypair);
        }
      });

      if (signers.length === 0) {
        console.warn(`No matching signers found for transaction ${index}`);
        return txBase58; // Return original if no signers found
      }

      // Sign the versioned transaction
      transaction.sign(signers);
      
      // Return the signed transaction as base58 (expected by the API)
      return bs58.encode(transaction.serialize());
    } catch (error) {
      console.error(`Error signing transaction ${index}:`, error);
      return txBase58; // Return original transaction if signing fails
    }
  });

  return { transactions: signedTransactions };
};

/**
 * Send bundle with orders - complete signing and send to Jito
 */
export const sendBundleWithOrders = async (
  bundleData: BundleSigningRequest,
  walletKeypairs: Map<string, Keypair>
): Promise<BundleResult> => {
  try {
    console.log(`Processing bundle with ${bundleData.orders.length} orders and ${bundleData.transactions.length} transactions`);
    
    // Complete the bundle signing using the internal function
    const signedBundle = completeBundleSigning(bundleData, walletKeypairs);
    
    if (signedBundle.transactions.length === 0) {
      return {
        success: false,
        error: 'Failed to sign any transactions in the bundle'
      };
    }

    console.log(`Successfully signed ${signedBundle.transactions.length} transactions`);
    
    // Send the signed bundle
    const result = await sendBundle(signedBundle.transactions);
    
    if (result.success) {
      console.log('✅ Bundle sent successfully!');
      
      // Log order details for confirmation
      bundleData.orders.forEach((order, index) => {
        console.log(`Order ${index + 1}: ${order.order} (Request ID: ${order.requestId})`);
      });
    } else {
      console.error('❌ Bundle failed to send:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendBundleWithOrders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Complete bundle signing and send with orders - convenience function
 * Takes wallets array and automatically creates keypair map
 */
export const completeBundleSigningAndSend = async (
  bundleData: BundleSigningRequest,
  wallets: FormattedWallet[]
): Promise<BundleResult> => {
  try {
    // Create keypair map from wallets
    const walletKeypairs = createKeypairMap(wallets);
    
    // Send bundle with orders
    return await sendBundleWithOrders(bundleData, walletKeypairs);
  } catch (error) {
    console.error('Error in completeBundleSigningAndSend:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Example usage function - demonstrates how to use the bundle signing functionality
 * with the JSON response format from limit order creation
 */
export const processLimitOrderBundle = async (
  limitOrderResponse: MultipleLimitOrdersResponse,
  wallets: FormattedWallet[]
): Promise<BundleResult> => {
  try {
    console.log('🚀 Starting processLimitOrderBundle...');
    console.log('Response:', limitOrderResponse);
    console.log('Wallets count:', wallets.length);
    
    // Validate the response
    if (!limitOrderResponse.success || !limitOrderResponse.orders || !limitOrderResponse.transactions) {
      console.error('❌ Invalid limit order response format:', {
        success: limitOrderResponse.success,
        hasOrders: !!limitOrderResponse.orders,
        hasTransactions: !!limitOrderResponse.transactions
      });
      return {
        success: false,
        error: 'Invalid limit order response format'
      };
    }

    // Create bundle signing request from the limit order response
    const bundleData: BundleSigningRequest = {
      orders: limitOrderResponse.orders,
      transactions: limitOrderResponse.transactions,
      errors: limitOrderResponse.errors || []
    };

    console.log(`📦 Created bundle data with ${bundleData.orders.length} orders and ${bundleData.transactions.length} transactions`);

    // Complete bundle signing and send
    const result = await completeBundleSigningAndSend(bundleData, wallets);
    
    if (result.success) {
      console.log(`✅ Successfully processed limit order bundle with ${bundleData.orders.length} orders`);
    } else {
      console.error(`❌ Failed to process limit order bundle: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error in processLimitOrderBundle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};


/**
 * Process cancel order transaction - sign and send as bundle
 */
export const processCancelOrderTransaction = async (
  cancelResponse: CancelOrderResponse,
  wallet: FormattedWallet
): Promise<BundleResult> => {
  try {
    console.log('🚀 Processing cancel order transaction...');
    console.log('Cancel response:', cancelResponse);
    
    // Validate the response
    if (!cancelResponse.success || !cancelResponse.transaction) {
      console.error('❌ Invalid cancel order response format:', {
        success: cancelResponse.success,
        hasTransaction: !!cancelResponse.transaction
      });
      return {
        success: false,
        error: 'Invalid cancel order response format'
      };
    }

    // Convert transaction from base64 to base58 if needed
    let transactionBase58 = cancelResponse.transaction;
    try {
      // Try to decode as base58 first
      bs58.decode(cancelResponse.transaction);
      console.log('Transaction is already in base58 format');
    } catch {
      // If base58 decode fails, assume it's base64 and convert to base58
      try {
        console.log('Converting transaction from base64 to base58...');
        const transactionBuffer = new Uint8Array(Buffer.from(cancelResponse.transaction, 'base64'));
        transactionBase58 = bs58.encode(transactionBuffer);
        console.log('✅ Successfully converted transaction to base58');
      } catch (conversionError) {
        console.error('❌ Failed to convert transaction encoding:', conversionError);
        return {
          success: false,
          error: 'Failed to convert transaction encoding from base64 to base58'
        };
      }
    }

    // Create keypair from wallet
    const walletKeypairs = createKeypairMap([wallet]);
    
    if (walletKeypairs.size === 0) {
      return {
        success: false,
        error: 'Failed to create wallet keypair'
      };
    }

    // Create bundle signing request for the cancel transaction (now in base58)
    const bundleData: BundleSigningRequest = {
      orders: [], // No orders for cancel operation
      transactions: [transactionBase58],
      errors: []
    };

    console.log(`📦 Created bundle data with 1 cancel transaction (base58 encoded)`);

    // Complete bundle signing and send
    const result = await sendBundleWithOrders(bundleData, walletKeypairs);
    
    if (result.success) {
      console.log(`✅ Successfully processed cancel order transaction`);
    } else {
      console.error(`❌ Failed to process cancel order transaction: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error in processCancelOrderTransaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Enhanced cancel order function that handles transaction signing and bundle sending
 */
export const cancelOrderWithBundle = async (
  config: CancelOrderRequest,
  wallet: FormattedWallet
): Promise<BundleResult> => {
  try {
    console.log('🚀 Starting cancel order with bundle processing...');
    
    // First, get the cancel transaction from the API
    const cancelResponse = await cancelOrder(config);
    
    if (!cancelResponse.success) {
      return {
        success: false,
        error: cancelResponse.error || 'Failed to get cancel transaction'
      };
    }

    // Process the transaction (sign and send as bundle)
    return await processCancelOrderTransaction(cancelResponse, wallet);
  } catch (error) {
    console.error('Error in cancelOrderWithBundle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
