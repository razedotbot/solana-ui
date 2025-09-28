import { Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

// Constants
const JITO_ENDPOINT = 'https://mainnet.block-engine.jito.wtf/api/v1/block-engine';
const MAX_BUNDLES_PER_SECOND = 2;

// Rate limiting state
const rateLimitState = {
  count: 0,
  lastReset: Date.now(),
  maxBundlesPerSecond: MAX_BUNDLES_PER_SECOND
};

interface WalletConsolidation {
  address: string;
  privateKey: string;
}

interface ConsolidationBundle {
  transactions: string[]; // Base58 encoded transaction data
}

// Define interface for bundle result
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
    const baseUrl = (window as any).tradingServerUrl?.replace(/\/+$/, '') || '';
    
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
 * Get partially prepared consolidation transactions from backend
 * The backend will create transactions without signing them
 */
const getPartiallyPreparedTransactions = async (
  sourceAddresses: string[], 
  receiverAddress: string,
  percentage: number
): Promise<string[]> => {
  try {
    const baseUrl = 'https://solana.fury.bot';
    
    const response = await fetch(`${baseUrl}/api/wallets/consolidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAddresses,
        receiverAddress,
        percentage
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially prepared transactions');
    }
    
    return data.transactions; // Array of base58 encoded partially prepared transactions
  } catch (error) {
    console.error('Error getting partially prepared transactions:', error);
    throw error;
  }
};

/**
 * Complete transaction signing with source wallets and recipient wallet
 */
const completeTransactionSigning = (
  partiallyPreparedTransactionsBase58: string[], 
  sourceKeypairs: Map<string, Keypair>,
  receiverKeypair: Keypair
): string[] => {
  try {
    return partiallyPreparedTransactionsBase58.map(txBase58 => {
      // Deserialize transaction
      const txBuffer = bs58.decode(txBase58);
      const transaction = VersionedTransaction.deserialize(txBuffer);
      
      // Extract transaction message to determine required signers
      const message = transaction.message;
      const signers: Keypair[] = [];
      
      // Always add receiver keypair as it's the fee payer
      signers.push(receiverKeypair);
      
      // Add source keypairs based on accounts in transaction
      for (const accountKey of message.staticAccountKeys) {
        const pubkeyStr = accountKey.toBase58();
        if (sourceKeypairs.has(pubkeyStr)) {
          signers.push(sourceKeypairs.get(pubkeyStr)!);
        }
      }
      
      // Sign the transaction
      transaction.sign(signers);
      
      // Serialize and encode the fully signed transaction
      return bs58.encode(transaction.serialize());
    });
  } catch (error) {
    console.error('Error completing transaction signing:', error);
    throw error;
  }
};

/**
 * Prepare consolidation bundles
 */
const prepareConsolidationBundles = (signedTransactions: string[]): ConsolidationBundle[] => {
  // For simplicity, we're putting transactions in bundles of MAX_TXS_PER_BUNDLE
  const MAX_TXS_PER_BUNDLE = 5;
  const bundles: ConsolidationBundle[] = [];
  
  for (let i = 0; i < signedTransactions.length; i += MAX_TXS_PER_BUNDLE) {
    const bundleTransactions = signedTransactions.slice(i, i + MAX_TXS_PER_BUNDLE);
    bundles.push({
      transactions: bundleTransactions
    });
  }
  
  return bundles;
};

/**
 * Execute SOL consolidation
 */
export const consolidateSOL = async (
  sourceWallets: WalletConsolidation[],
  receiverWallet: WalletConsolidation,
  percentage: number
): Promise<{ success: boolean; result?: any; error?: string }> => {
  try {
    console.log(`Preparing to consolidate ${percentage}% of SOL from ${sourceWallets.length} wallets to ${receiverWallet.address}`);
    
    // Extract source addresses
    const sourceAddresses = sourceWallets.map(wallet => wallet.address);
    
    // Step 1: Get partially prepared transactions from backend
    const partiallyPreparedTransactions = await getPartiallyPreparedTransactions(
      sourceAddresses,
      receiverWallet.address,
      percentage
    );
    console.log(`Received ${partiallyPreparedTransactions.length} partially prepared transactions from backend`);
    
    // Step 2: Create keypairs from private keys
    const receiverKeypair = Keypair.fromSecretKey(bs58.decode(receiverWallet.privateKey));
    
    // Create a map of source public keys to keypairs for faster lookups
    const sourceKeypairsMap = new Map<string, Keypair>();
    sourceWallets.forEach(wallet => {
      const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
      sourceKeypairsMap.set(keypair.publicKey.toBase58(), keypair);
    });
    
    // Step 3: Complete transaction signing with source and receiver keys
    const fullySignedTransactions = completeTransactionSigning(
      partiallyPreparedTransactions,
      sourceKeypairsMap,
      receiverKeypair
    );
    console.log(`Completed signing for ${fullySignedTransactions.length} transactions`);
    
    // Step 4: Prepare consolidation bundles
    const consolidationBundles = prepareConsolidationBundles(fullySignedTransactions);
    console.log(`Prepared ${consolidationBundles.length} consolidation bundles`);
    
    // Step 5: Send bundles
    let results: BundleResult[] = [];
    for (let i = 0; i < consolidationBundles.length; i++) {
      const bundle = consolidationBundles[i];
      console.log(`Sending bundle ${i+1}/${consolidationBundles.length} with ${bundle.transactions.length} transactions`);
      
      await checkRateLimit();
      const result = await sendBundle(bundle.transactions);
      results.push(result);
      
      // Add delay between bundles (except after the last one)
      if (i < consolidationBundles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    }
    
    return {
      success: true,
      result: results
    };
  } catch (error) {
    console.error('SOL consolidation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Validate consolidation inputs
 */
export const validateConsolidationInputs = (
  sourceWallets: WalletConsolidation[],
  receiverWallet: WalletConsolidation,
  percentage: number,
  sourceBalances: Map<string, number>
): { valid: boolean; error?: string } => {
  // Check if receiver wallet is valid
  if (!receiverWallet.address || !receiverWallet.privateKey) {
    return { valid: false, error: 'Invalid receiver wallet' };
  }
  
  // Check if source wallets are valid
  if (!sourceWallets.length) {
    return { valid: false, error: 'No source wallets' };
  }
  
  for (const wallet of sourceWallets) {
    if (!wallet.address || !wallet.privateKey) {
      return { valid: false, error: 'Invalid source wallet data' };
    }
    
    const balance = sourceBalances.get(wallet.address) || 0;
    if (balance <= 0) {
      return { valid: false, error: `Source wallet ${wallet.address.substring(0, 6)}... has no balance` };
    }
  }
  
  // Check if percentage is valid
  if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
    return { valid: false, error: 'Percentage must be between 1 and 100' };
  }
  
  return { valid: true };
};