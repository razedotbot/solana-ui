import { Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

interface WalletMixing {
  address: string;
  privateKey: string;
  amount: string;
}

interface MixingBundle {
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
    
    const response = await fetch(`${baseUrl}/api/wallets/mixer`, {
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
 * First transaction: signed by depositor (sender)
 * Second transaction: signed by receiver (recipient)
 */
const completeTransactionSigning = (
  partiallySignedTransactionsBase58: string[], 
  senderKeypair: Keypair,
  recipientKeypairs: Map<string, Keypair>
): string[] => {
  try {
    return partiallySignedTransactionsBase58.map((txBase58, index) => {
      // Deserialize transaction
      const txBuffer = bs58.decode(txBase58);
      const transaction = VersionedTransaction.deserialize(txBuffer);
      
      console.log(`Signing transaction ${index + 1}/${partiallySignedTransactionsBase58.length}`);
      
      // Determine which keypair to use based on transaction index
      if (index === 0) {
        // First transaction: signed by depositor (sender)
        console.log(`Transaction ${index + 1}: Signing with depositor wallet`);
        transaction.sign([senderKeypair]);
      } else if (index === 1 && recipientKeypairs.size > 0) {
        // Second transaction: signed by receiver (recipient)
        const recipientKeypair = Array.from(recipientKeypairs.values())[0]; // Get the first (and should be only) recipient keypair
        console.log(`Transaction ${index + 1}: Signing with receiver wallet`);
        transaction.sign([recipientKeypair]);
      } else {
        // For any additional transactions, fall back to analyzing required signers
        console.log(`Transaction ${index + 1}: Analyzing required signers`);
        const message = transaction.message;
        const requiredSigners: Keypair[] = [];
        
        // Check which accounts are required signers
        for (const accountKey of message.staticAccountKeys) {
          const pubkeyStr = accountKey.toBase58();
          if (pubkeyStr === senderKeypair.publicKey.toBase58()) {
            requiredSigners.push(senderKeypair);
          } else if (recipientKeypairs.has(pubkeyStr)) {
            requiredSigners.push(recipientKeypairs.get(pubkeyStr)!);
          }
        }
        
        if (requiredSigners.length === 0) {
          // Default to sender if no specific signers found
          requiredSigners.push(senderKeypair);
        }
        
        console.log(`Transaction ${index + 1}: Signing with ${requiredSigners.length} keypair(s)`);
        transaction.sign(requiredSigners);
      }
      
      // Serialize and encode the fully signed transaction
      return bs58.encode(transaction.serialize());
    });
  } catch (error) {
    console.error('Error completing transaction signing:', error);
    throw error;
  }
};

/**
 * Prepare mixing bundles
 */
const prepareMixingBundles = (signedTransactions: string[]): MixingBundle[] => {
  // For simplicity, we're putting all transactions in a single bundle
  // In a production environment, you might want to split these into multiple bundles
  return [{
    transactions: signedTransactions
  }];
};

/**
 * Execute SOL mixing to a single recipient
 */
export const mixSOLToSingleRecipient = async (
  senderWallet: WalletMixing,
  recipientWallet: WalletMixing
): Promise<{ success: boolean; result?: any; error?: string }> => {
  try {
    console.log(`Preparing to mix ${recipientWallet.amount} SOL from ${senderWallet.address} to ${recipientWallet.address}`);
    
    // Convert single recipient wallet to backend format
    const recipients = [{
      address: recipientWallet.address,
      amount: recipientWallet.amount
    }];
    
    // Step 1: Get partially signed transactions from backend
    // These transactions are already signed by dump wallets created on the backend
    const partiallySignedTransactions = await getPartiallySignedTransactions(
      senderWallet.address, 
      recipients
    );
    console.log(`Received ${partiallySignedTransactions.length} partially signed transactions from backend`);
    
    // Step 2: Create keypairs from private keys
    const senderKeypair = Keypair.fromSecretKey(bs58.decode(senderWallet.privateKey));
    
    // Create a map with the single recipient keypair
    const recipientKeypairsMap = new Map<string, Keypair>();
    const recipientKeypair = Keypair.fromSecretKey(bs58.decode(recipientWallet.privateKey));
    recipientKeypairsMap.set(recipientKeypair.publicKey.toBase58(), recipientKeypair);
    
    // Step 3: Complete transaction signing with sender and recipient keys
    const fullySignedTransactions = completeTransactionSigning(
      partiallySignedTransactions, 
      senderKeypair, 
      recipientKeypairsMap
    );
    console.log(`Completed signing for ${fullySignedTransactions.length} transactions`);
    
    // Step 4: Prepare mixing bundles
    const mixingBundles = prepareMixingBundles(fullySignedTransactions);
    console.log(`Prepared ${mixingBundles.length} mixing bundles`);
    
    // Step 5: Send bundles
    let results: BundleResult[] = [];
    for (let i = 0; i < mixingBundles.length; i++) {
      const bundle = mixingBundles[i];
      console.log(`Sending bundle ${i+1}/${mixingBundles.length} with ${bundle.transactions.length} transactions`);
      
      const result = await sendBundle(bundle.transactions);
      results.push(result);
      
      // Add delay between bundles (except after the last one)
      if (i < mixingBundles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    }
    
    return {
      success: true,
      result: results
    };
  } catch (error) {
    console.error('SOL mixing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Legacy function - Execute SOL mixing (kept for backward compatibility)
 */
export const mixSOL = async (
  senderWallet: WalletMixing,
  recipientWallets: WalletMixing[]
): Promise<{ success: boolean; result?: any; error?: string }> => {
  // If only one recipient, use the optimized single recipient function
  if (recipientWallets.length === 1) {
    return await mixSOLToSingleRecipient(senderWallet, recipientWallets[0]);
  }
  
  // For multiple recipients, delegate to batch processing
  const batchResult = await batchMixSOL(senderWallet, recipientWallets);
  return {
    success: batchResult.success,
    result: batchResult.results,
    error: batchResult.error
  };
};

/**
 * Validate mixing inputs for single recipient
 */
export const validateSingleMixingInputs = (
  senderWallet: WalletMixing,
  recipientWallet: WalletMixing,
  senderBalance: number
): { valid: boolean; error?: string } => {
  // Check if sender wallet is valid
  if (!senderWallet.address || !senderWallet.privateKey) {
    return { valid: false, error: 'Invalid sender wallet' };
  }
  
  // Check if recipient wallet is valid
  if (!recipientWallet.address || !recipientWallet.privateKey || !recipientWallet.amount) {
    return { valid: false, error: 'Invalid recipient wallet data' };
  }
  
  if (isNaN(parseFloat(recipientWallet.amount)) || parseFloat(recipientWallet.amount) <= 0) {
    return { valid: false, error: 'Invalid amount: ' + recipientWallet.amount };
  }
  
  // Calculate required amount
  const amount = parseFloat(recipientWallet.amount);
  
  // Check if sender has enough balance (including some extra for fees)
  const estimatedFee = 0.01; // Rough estimate for fees in SOL
  if (amount + estimatedFee > senderBalance) {
    return {
      valid: false,
      error: `Insufficient balance. Need at least ${amount + estimatedFee} SOL, but have ${senderBalance} SOL`
    };
  }
  
  return { valid: true };
};

/**
 * Validate mixing inputs for multiple recipients
 */
export const validateMixingInputs = (
  senderWallet: WalletMixing,
  recipientWallets: WalletMixing[],
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
  const estimatedFee = 0.01 * recipientWallets.length; // Rough estimate for fees in SOL
  if (totalAmount + estimatedFee > senderBalance) {
    return {
      valid: false,
      error: `Insufficient balance. Need at least ${totalAmount + estimatedFee} SOL, but have ${senderBalance} SOL`
    };
  }
  
  return { valid: true };
};

/**
 * Batch mix SOL to multiple recipients, processing ONE RECIPIENT AT A TIME
 */
export const batchMixSOL = async (
  senderWallet: WalletMixing,
  recipientWallets: WalletMixing[]
): Promise<{ success: boolean; results?: any[]; error?: string }> => {
  try {
    console.log(`Starting batch SOL mixing to ${recipientWallets.length} recipients (1 recipient per batch)`);
    
    // Return early if no recipients
    if (recipientWallets.length === 0) {
      return { success: true, results: [] };
    }
    
    // Process each recipient individually
    const results: any[] = [];
    for (let i = 0; i < recipientWallets.length; i++) {
      const recipientWallet = recipientWallets[i];
      console.log(`Processing recipient ${i+1}/${recipientWallets.length}: ${recipientWallet.address} (${recipientWallet.amount} SOL)`);
      
      // Execute mixing to single recipient
      const result = await mixSOLToSingleRecipient(senderWallet, recipientWallet);
      
      if (!result.success) {
        return {
          success: false,
          results,
          error: `Mixing to recipient ${i+1} (${recipientWallet.address}) failed: ${result.error}`
        };
      }
      
      // Add result
      results.push(result.result);
      
      // Add delay between recipients (except after the last one)
      if (i < recipientWallets.length - 1) {
        console.log(`Waiting 3 seconds before processing next recipient...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay between recipients
      }
    }
    
    console.log(`Successfully completed mixing to all ${recipientWallets.length} recipients`);
    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Batch SOL mixing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};