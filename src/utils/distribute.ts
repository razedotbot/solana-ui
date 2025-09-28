import { Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

interface WalletDistribution {
  address: string;
  privateKey: string;
  amount: string;
}

interface DistributionBundle {
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
 * Send bundle to Jito block engine
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
 * Get partially signed transactions from backend
 * The backend will create and sign with dump wallets
 */
const getPartiallySignedTransactions = async (
  senderAddress: string, 
  recipients: { address: string, amount: string }[]
): Promise<string[]> => {
  try {
    const baseUrl = 'https://solana.fury.bot';
    
    const response = await fetch(`${baseUrl}/api/wallets/distribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: senderAddress,
        recipients: recipients
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get partially signed transactions');
    }
    
    return data.transactions; // Array of base58 encoded partially signed transactions
  } catch (error) {
    console.error('Error getting partially signed transactions:', error);
    throw error;
  }
};

/**
 * Complete transaction signing with sender and recipient keys
 */
const completeTransactionSigning = (
  partiallySignedTransactionsBase58: string[], 
  senderKeypair: Keypair,
  recipientKeypairs: Map<string, Keypair>
): string[] => {
  try {
    return partiallySignedTransactionsBase58.map(txBase58 => {
      // Deserialize transaction
      const txBuffer = bs58.decode(txBase58);
      const transaction = VersionedTransaction.deserialize(txBuffer);
      
      // Extract transaction message to determine required signers
      const message = transaction.message;
      const requiredSigners: Keypair[] = [];
      
      // Always add sender keypair as it's always required
      requiredSigners.push(senderKeypair);
      
      // Check if any recipient addresses are required signers
      // This is needed for unwrapping SOL operations
      for (const accountKey of message.staticAccountKeys) {
        const pubkeyStr = accountKey.toBase58();
        if (recipientKeypairs.has(pubkeyStr)) {
          requiredSigners.push(recipientKeypairs.get(pubkeyStr)!);
        }
      }
      
      // Complete the signing for the transaction
      transaction.sign(requiredSigners);
      
      // Serialize and encode the fully signed transaction
      return bs58.encode(transaction.serialize());
    });
  } catch (error) {
    console.error('Error completing transaction signing:', error);
    throw error;
  }
};

/**
 * Prepare distribution bundles
 */
const prepareDistributionBundles = (signedTransactions: string[]): DistributionBundle[] => {
  // For simplicity, we're putting all transactions in a single bundle
  // In a production environment, you might want to split these into multiple bundles
  return [{
    transactions: signedTransactions
  }];
};

/**
 * Execute SOL distribution
 */
export const distributeSOL = async (
  senderWallet: WalletDistribution,
  recipientWallets: WalletDistribution[]
): Promise<{ success: boolean; result?: any; error?: string }> => {
  try {
    console.log(`Preparing to distribute SOL from ${senderWallet.address} to ${recipientWallets.length} recipients`);
    
    // Convert wallet data to recipient format for backend
    const recipients = recipientWallets.map(wallet => ({
      address: wallet.address,
      amount: wallet.amount
    }));
    
    // Step 1: Get partially signed transactions from backend
    // These transactions are already signed by dump wallets created on the backend
    const partiallySignedTransactions = await getPartiallySignedTransactions(
      senderWallet.address, 
      recipients
    );
    console.log(`Received ${partiallySignedTransactions.length} partially signed transactions from backend`);
    
    // Step 2: Create keypairs from private keys
    const senderKeypair = Keypair.fromSecretKey(bs58.decode(senderWallet.privateKey));
    
    // Create a map of recipient public keys to keypairs for faster lookups
    const recipientKeypairsMap = new Map<string, Keypair>();
    recipientWallets.forEach(wallet => {
      const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
      recipientKeypairsMap.set(keypair.publicKey.toBase58(), keypair);
    });
    
    // Step 3: Complete transaction signing with sender and recipient keys
    const fullySignedTransactions = completeTransactionSigning(
      partiallySignedTransactions, 
      senderKeypair, 
      recipientKeypairsMap
    );
    console.log(`Completed signing for ${fullySignedTransactions.length} transactions`);
    
    // Step 4: Prepare distribution bundles
    const distributionBundles = prepareDistributionBundles(fullySignedTransactions);
    console.log(`Prepared ${distributionBundles.length} distribution bundles`);
    
    // Step 5: Send bundles
    let results: BundleResult[] = [];
    for (let i = 0; i < distributionBundles.length; i++) {
      const bundle = distributionBundles[i];
      console.log(`Sending bundle ${i+1}/${distributionBundles.length} with ${bundle.transactions.length} transactions`);
      
      const result = await sendBundle(bundle.transactions);
      results.push(result);
      
      // Add delay between bundles (except after the last one)
      if (i < distributionBundles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    }
    
    return {
      success: true,
      result: results
    };
  } catch (error) {
    console.error('SOL distribution error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Validate distribution inputs
 */
export const validateDistributionInputs = (
  senderWallet: WalletDistribution,
  recipientWallets: WalletDistribution[],
  senderBalance: number
): { valid: boolean; error?: string } => {
  // Check if sender wallet is valid
  if (!senderWallet.address || !senderWallet.privateKey) {
    return { valid: false, error: 'Invalid sender wallet' };
  }
  
  // Check if recipient wallets are valid
  if (!recipientWallets.length) {
    return { valid: false, error: 'No recipient wallets' };
  }
  
  for (const wallet of recipientWallets) {
    if (!wallet.address || !wallet.privateKey || !wallet.amount) {
      return { valid: false, error: 'Invalid recipient wallet data' };
    }
    
    if (isNaN(parseFloat(wallet.amount)) || parseFloat(wallet.amount) <= 0) {
      return { valid: false, error: 'Invalid amount: ' + wallet.amount };
    }
  }
  
  // Calculate total amount
  const totalAmount = recipientWallets.reduce(
    (sum, wallet) => sum + parseFloat(wallet.amount), 0
  );
  
  // Check if sender has enough balance (including some extra for fees)
  const estimatedFee = 0.01; // Rough estimate for fees in SOL
  if (totalAmount + estimatedFee > senderBalance) {
    return {
      valid: false,
      error: `Insufficient balance. Need at least ${totalAmount + estimatedFee} SOL, but have ${senderBalance} SOL`
    };
  }
  
  return { valid: true };
};
/**
 * Batch distribute SOL to multiple recipients, splitting into groups of max 3 recipients per request
 */
export const batchDistributeSOL = async (
  senderWallet: WalletDistribution,
  recipientWallets: WalletDistribution[]
): Promise<{ success: boolean; results?: any[]; error?: string }> => {
  try {
    console.log(`Starting batch SOL distribution to ${recipientWallets.length} recipients`);
    
    // Return early if no recipients
    if (recipientWallets.length === 0) {
      return { success: true, results: [] };
    }
    
    // If 3 or fewer recipients, just call distributeSOL directly
    if (recipientWallets.length <= 3) {
      const result = await distributeSOL(senderWallet, recipientWallets);
      return { 
        success: result.success, 
        results: result.success ? [result.result] : [], 
        error: result.error 
      };
    }
    
    // Split recipients into batches of max 3
    const MAX_RECIPIENTS_PER_BATCH = 3;
    const batches: WalletDistribution[][] = [];
    
    for (let i = 0; i < recipientWallets.length; i += MAX_RECIPIENTS_PER_BATCH) {
      batches.push(recipientWallets.slice(i, i + MAX_RECIPIENTS_PER_BATCH));
    }
    
    console.log(`Split distribution into ${batches.length} batches of max ${MAX_RECIPIENTS_PER_BATCH} recipients each`);
    
    // Execute each batch sequentially
    const results: any[] = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i+1}/${batches.length} with ${batch.length} recipients`);
      
      // Calculate batch total to update remaining balance
      const batchTotal = batch.reduce((sum, wallet) => sum + parseFloat(wallet.amount), 0);
      const estimatedFee = 0.01 * batch.length; // Rough fee estimate per transaction
      
      // Execute this batch
      const batchResult = await distributeSOL(senderWallet, batch);
      
      if (!batchResult.success) {
        return {
          success: false,
          results,
          error: `Batch ${i+1} failed: ${batchResult.error}`
        };
      }
      
      // Add batch result and update remaining balance
      results.push(batchResult.result);
      
      // Add delay between batches (except after the last one)
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay between batches
      }
    }
    
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Batch SOL distribution error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};