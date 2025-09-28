import { Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
// Note: Import loadConfigFromCookies from your Utils module if available
import { loadConfigFromCookies } from '../Utils';

const MAX_BUNDLES_PER_SECOND = 2;

// Rate limiting state
const rateLimitState = {
  count: 0,
  lastReset: Date.now(),
  maxBundlesPerSecond: MAX_BUNDLES_PER_SECOND
};

export interface WalletInfo {
  address: string;
  privateKey: string;
}

interface TransactionBundle {
  transactions: string[]; // Base58 encoded transactions
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
 * Get default protocol for trading
 */
const getDefaultProtocol = (): string => {
  return 'auto'; // Default protocol, no auto-routing
};

/**
 * Get sell transactions from backend
 */
const getSellTransactions = async (
  sellerAddress: string,
  tokenAddress: string,
  sellPercentage: number,
  protocol: string
): Promise<string[]> => {
  try {
    const baseUrl = (window as any).tradingServerUrl?.replace(/\/+$/, '') || '';
    const config = loadConfigFromCookies();
    const feeInSol = config?.transactionFee || '0.005';
    const feeInLamports = Math.floor(parseFloat(feeInSol) * 1_000_000_000);
    
    const response = await fetch(`${baseUrl}/api/tokens/sell`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': config?.apiKey || ''
      },
      body: JSON.stringify({
        walletAddresses: [sellerAddress],
        tokenAddress,
        protocol: protocol, // Use dynamic protocol
        percentage: sellPercentage,
        jitoTipLamports: feeInLamports
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get sell transactions');
    }
    
    // Extract transactions from the response
    if (data.bundles && Array.isArray(data.bundles)) {
      // Flatten all bundles into a single array of transactions
      return data.bundles.flatMap((bundle: any) => 
        Array.isArray(bundle) ? bundle : bundle.transactions || []
      );
    } else if (data.transactions && Array.isArray(data.transactions)) {
      return data.transactions;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      throw new Error('No transactions returned from sell endpoint');
    }
  } catch (error) {
    console.error('Error getting sell transactions:', error);
    throw error;
  }
};

/**
 * Get distribution transactions from backend (replacing dump transactions)
 */
const getDistributionTransactions = async (
  senderAddress: string,
  receiverAddress: string,
  amount: string
): Promise<string[]> => {
  try {
    const baseUrl = 'https://solana.fury.bot';
    
    const response = await fetch(`${baseUrl}/api/wallets/distribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: senderAddress,
        recipients: [{ address: receiverAddress, amount }]
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get distribution transactions');
    }
    
    return data.transactions || [];
  } catch (error) {
    console.error('Error getting distribution transactions:', error);
    throw error;
  }
};

/**
 * Get buy transactions from backend
 * Updated to use direct SOL amount instead of calculating from percentage
 */
const getBuyTransactions = async (
  buyerAddress: string,
  tokenAddress: string,
  buyAmount: number,
  protocol: string
): Promise<string[]> => {
  try {
    const baseUrl = (window as any).tradingServerUrl?.replace(/\/+$/, '') || '';
    const config = loadConfigFromCookies();
    const feeInSol = config?.transactionFee || '0.005';
    const feeInLamports = Math.floor(parseFloat(feeInSol) * 1_000_000_000);
    
    const response = await fetch(`${baseUrl}/api/tokens/buy`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': config?.apiKey || ''
      },
      body: JSON.stringify({
        walletAddresses: [buyerAddress],
        tokenAddress,
        solAmount: buyAmount, // Direct SOL amount
        protocol: protocol, // Use dynamic protocol
        jitoTipLamports: feeInLamports
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get buy transactions');
    }
    
    // Extract transactions from the response
    if (data.bundles && Array.isArray(data.bundles)) {
      // Flatten all bundles into a single array of transactions
      return data.bundles.flatMap((bundle: any) => 
        Array.isArray(bundle) ? bundle : bundle.transactions || []
      );
    } else if (data.transactions && Array.isArray(data.transactions)) {
      return data.transactions;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      throw new Error('No transactions returned from buy endpoint');
    }
  } catch (error) {
    console.error('Error getting buy transactions:', error);
    throw error;
  }
};

/**
 * Signs a transaction with the provided keypair
 */
const signTransaction = (txBase58: string, keypair: Keypair): string => {
  try {
    // Deserialize transaction
    const txBuffer = bs58.decode(txBase58);
    const transaction = VersionedTransaction.deserialize(txBuffer);
    
    // Sign transaction
    transaction.sign([keypair]);
    
    // Serialize and encode the signed transaction
    return bs58.encode(transaction.serialize());
  } catch (error) {
    console.error('Error signing transaction:', error);
    throw error;
  }
};

/**
 * Signs a transaction with multiple keypairs
 */
const signTransactionMultiple = (txBase58: string, keypairs: Keypair[]): string => {
  try {
    // Deserialize transaction
    const txBuffer = bs58.decode(txBase58);
    const transaction = VersionedTransaction.deserialize(txBuffer);
    
    // Sign transaction
    transaction.sign(keypairs);
    
    // Serialize and encode the signed transaction
    return bs58.encode(transaction.serialize());
  } catch (error) {
    console.error('Error signing transaction with multiple keypairs:', error);
    throw error;
  }
};

/**
 * Execute cleaner operation with direct SOL buy amount
 * 
 * @param sellerWallet - Wallet that will sell tokens
 * @param buyerWallet - Wallet that will receive SOL and buy tokens
 * @param tokenAddress - Token mint address
 * @param sellPercentage - Percentage of tokens to sell (1-100, or 0 to skip selling)
 * @param buyAmount - Direct SOL amount to use for buying (not percentage)
 * @param tokenBalance - Current token balance of the seller wallet (must be provided by parent component)
 * @param extraDistributionSol - Additional SOL to add to buy amount for distribution (default: 0.05)
 */
export const executeCleanerOperation = async (
  sellerWallet: WalletInfo,
  buyerWallet: WalletInfo,
  tokenAddress: string,
  sellPercentage: number,
  buyAmount: number, // Changed from buyPercentage to direct buyAmount
  tokenBalance: number,
  extraDistributionSol: number = 0.05 // Additional SOL to add to buy amount
): Promise<{ success: boolean; result?: any; error?: string }> => {
  try {
    console.log(`Preparing cleaner operation from ${sellerWallet.address} to ${buyerWallet.address} for token ${tokenAddress}`);
    console.log(`Sell percentage: ${sellPercentage}%, Direct buy amount: ${buyAmount} SOL, extra distribution: ${extraDistributionSol} SOL`);
    
    // Create keypairs from private keys
    const sellerKeypair = Keypair.fromSecretKey(bs58.decode(sellerWallet.privateKey));
    const buyerKeypair = Keypair.fromSecretKey(bs58.decode(buyerWallet.privateKey));
    
    // Step 0: Use default protocol for trading
    const protocol = getDefaultProtocol();
    console.log(`Using default protocol: ${protocol}`);
    
    // Determine if this is a sell operation or distribution-only operation
    const shouldSell = sellPercentage > 0;
    let sellTransactions: string[] = [];
    
    if (shouldSell) {
      // Step 1: Calculate amounts based on token balance
      if (tokenBalance <= 0) {
        throw new Error('Seller has no tokens to sell');
      }
      
      const tokenAmountToSell = tokenBalance * (sellPercentage / 100);
      console.log(`Seller token balance: ${tokenBalance}, selling ${sellPercentage}% = ${tokenAmountToSell} tokens`);
      
      // Step 2: Get sell transactions
      console.log('Getting sell transactions...');
      sellTransactions = await getSellTransactions(
        sellerWallet.address,
        tokenAddress,
        sellPercentage,
        protocol // Use dynamic protocol
      );
      console.log(`Received ${sellTransactions.length} sell transaction(s)`);
    } else {
      console.log('Skipping sell transactions (subsequent buyer for this seller)');
    }
    
    // Validate buy amount
    if (buyAmount <= 0 || buyAmount > 100) {
      throw new Error('Buy amount must be between 0.001 and 100 SOL');
    }
    
    // Calculate distribution amount: direct buy amount + extra SOL
    const distributionAmount = (buyAmount + extraDistributionSol).toFixed(9);
    console.log(`Distribution amount: ${buyAmount} + ${extraDistributionSol} = ${distributionAmount} SOL`);
    console.log(`Buy amount: ${buyAmount} SOL (direct amount specified by user)`);
    
    // Step 3: Get distribution transactions (seller to buyer)
    console.log('Getting distribution transactions...');
    const distributionTransactions = await getDistributionTransactions(
      sellerWallet.address,
      buyerWallet.address,
      distributionAmount
    );
    console.log(`Received ${distributionTransactions.length} distribution transaction(s)`);
    
    // Step 4: Get buy transactions with direct SOL amount (always uses fetched protocol)
    console.log('Getting buy transactions...');
    const buyTransactions = await getBuyTransactions(
      buyerWallet.address,
      tokenAddress,
      buyAmount, // Direct SOL amount
      protocol // Use dynamic protocol (fetched above)
    );
    console.log(`Received ${buyTransactions.length} buy transaction(s)`);
    
    // Step 5: Sign all transactions
    console.log('Signing all transactions...');
    
    // Sign sell transactions with seller (only if we have sell transactions)
    const signedSellTransactions = sellTransactions.map(tx => 
      signTransaction(tx, sellerKeypair)
    );
    
    // Sign distribution transactions - these need both seller and buyer signatures
    const signedDistributionTransactions = distributionTransactions.map(tx =>
      signTransactionMultiple(tx, [sellerKeypair, buyerKeypair])
    );
    
    // Sign buy transactions with buyer (and possibly seller as fee payer)
    const signedBuyTransactions = buyTransactions.map(tx => {
      // Check if transaction requires seller as fee payer
      const txBuffer = bs58.decode(tx);
      const transaction = VersionedTransaction.deserialize(txBuffer);
      const sellerPubkey = sellerKeypair.publicKey.toBase58();
      const requiresSellerSig = transaction.message.staticAccountKeys.some(
        key => key.toBase58() === sellerPubkey
      );
      
      if (requiresSellerSig) {
        return signTransactionMultiple(tx, [sellerKeypair, buyerKeypair]);
      } else {
        return signTransaction(tx, buyerKeypair);
      }
    });
    
    // Step 6: Combine all signed transactions into a bundle
    const fullySignedBundle = [
      ...signedSellTransactions, // Will be empty if shouldSell is false
      ...signedDistributionTransactions,
      ...signedBuyTransactions
    ];
    
    console.log(`Bundle ready with ${fullySignedBundle.length} transactions (${signedSellTransactions.length} sell, ${signedDistributionTransactions.length} distribution, ${signedBuyTransactions.length} buy)`);
    
    // Step 7: Send bundle
    console.log("Sending bundle...");
    await checkRateLimit();
    const result = await sendBundle(fullySignedBundle);
    console.log(`Bundle sent successfully:`, result);
    
    return {
      success: true,
      result: {
        bundleResult: result,
        transactionCount: fullySignedBundle.length,
        breakdown: {
          sellTransactions: signedSellTransactions.length,
          distributionTransactions: signedDistributionTransactions.length,
          buyTransactions: signedBuyTransactions.length
        },
        amounts: {
          tokensSold: shouldSell ? tokenBalance * (sellPercentage / 100) : 0,
          solUsedForBuy: buyAmount, // Direct amount
          distributionAmount: parseFloat(distributionAmount),
          extraDistributionSol: extraDistributionSol
        },
        protocol: protocol, // Include the protocol used
        operationType: shouldSell ? 'sell-distribute-buy' : 'distribute-buy'
      }
    };
  } catch (error) {
    console.error('Cleaner operation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Validate cleaner operation inputs
 * Updated to validate direct buy amount instead of buy percentage
 * Updated to allow sellPercentage of 0 (for subsequent buyers of same seller)
 */
export const validateCleanerInputs = (
  sellerWallet: WalletInfo,
  buyerWallet: WalletInfo,
  tokenAddress: string,
  sellPercentage: number,
  buyAmount: number, // Changed from buyPercentage to buyAmount
  tokenBalance: number
): { valid: boolean; error?: string } => {
  // Check if seller wallet is valid
  if (!sellerWallet.address || !sellerWallet.privateKey) {
    return { valid: false, error: 'Invalid seller wallet' };
  }
  
  // Check if buyer wallet is valid
  if (!buyerWallet.address || !buyerWallet.privateKey) {
    return { valid: false, error: 'Invalid buyer wallet' };
  }
  
  // Check if token address is valid
  if (!tokenAddress) {
    return { valid: false, error: 'Token address is required' };
  }
  
  // Check if sell percentage is valid (now allowing 0 for subsequent buyers)
  if (isNaN(sellPercentage) || sellPercentage < 0 || sellPercentage > 100) {
    return { valid: false, error: 'Sell percentage must be between 0 and 100' };
  }
  
  // Check if buy amount is valid (changed from percentage validation)
  if (isNaN(buyAmount) || buyAmount <= 0 || buyAmount > 100) {
    return { valid: false, error: 'Buy amount must be between 0.001 and 100 SOL' };
  }
  
  // Check if seller has tokens (only if selling)
  if (sellPercentage > 0 && (!tokenBalance || tokenBalance <= 0)) {
    return { valid: false, error: 'Seller has no tokens to sell' };
  }
  
  return { valid: true };
};