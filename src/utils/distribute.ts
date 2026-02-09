import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { sendTransactions } from "./transactionService";
import type { BundleResult } from "./types";
import { BASE_CURRENCIES, type BaseCurrencyConfig } from "./constants";
import { getServerBaseUrl, resolveBaseCurrency, type TransactionBundle } from "./trading";

interface WalletDistribution {
  address: string;
  privateKey: string;
  amount: string;
}


/**
 * Get partially signed transactions from backend
 * The backend will create and sign with dump wallets
 */
const getPartiallySignedTransactions = async (
  senderAddress: string,
  recipients: { address: string; amount: string }[],
  baseCurrency: BaseCurrencyConfig = BASE_CURRENCIES.SOL,
): Promise<string[]> => {
  const baseUrl = getServerBaseUrl();

  const isNativeSOL = baseCurrency.mint === BASE_CURRENCIES.SOL.mint;
  const endpoint = isNativeSOL
    ? `${baseUrl}/v2/sol/distribute`
    : `${baseUrl}/v2/token/distribute`;

  const requestBody: Record<string, unknown> = {
    sender: senderAddress,
    recipients: recipients,
  };

  // Add token mint for non-native currencies
  if (!isNativeSOL) {
    requestBody["tokenMint"] = baseCurrency.mint;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = (await response.json()) as {
    success: boolean;
    error?: string;
    transactions?: string[];
    data?: { transactions?: string[] };
  };

  if (!data.success) {
    throw new Error(
      data.error || "Failed to get partially signed transactions",
    );
  }

  // Handle different response formats
  const transactions =
    (data as unknown as { data?: { transactions?: string[] } }).data
      ?.transactions || data.transactions;

  if (!transactions || !Array.isArray(transactions)) {
    throw new Error("No transactions returned from backend");
  }

  return transactions; // Array of base58 encoded partially signed transactions
};

/**
 * Complete transaction signing with sender and recipient keys
 */
const completeTransactionSigning = (
  partiallySignedTransactionsBase58: string[],
  senderKeypair: Keypair,
  recipientKeypairs: Map<string, Keypair>,
): string[] => {
  return partiallySignedTransactionsBase58.map((txBase58) => {
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
};

/**
 * Prepare distribution bundles
 */
const prepareTransactionBundles = (
  signedTransactions: string[],
): TransactionBundle[] => {
  // For simplicity, we're putting all transactions in a single bundle
  // In a production environment, you might want to split these into multiple bundles
  return [
    {
      transactions: signedTransactions,
    },
  ];
};

/**
 * Execute base currency distribution (SOL, USDC, USD1)
 */
export const distributeBaseCurrency = async (
  senderWallet: WalletDistribution,
  recipientWallets: WalletDistribution[],
  baseCurrency?: BaseCurrencyConfig,
): Promise<{ success: boolean; result?: unknown; error?: string }> => {
  try {
    const currency = resolveBaseCurrency(baseCurrency);
    // Convert wallet data to recipient format for backend
    const recipients = recipientWallets.map((wallet) => ({
      address: wallet.address,
      amount: wallet.amount,
    }));

    // Step 1: Get partially signed transactions from backend
    // These transactions are already signed by dump wallets created on the backend
    const partiallySignedTransactions = await getPartiallySignedTransactions(
      senderWallet.address,
      recipients,
      currency,
    );
    // Step 2: Create keypairs from private keys
    const senderKeypair = Keypair.fromSecretKey(
      bs58.decode(senderWallet.privateKey),
    );

    // Create a map of recipient public keys to keypairs for faster lookups
    const recipientKeypairsMap = new Map<string, Keypair>();
    recipientWallets.forEach((wallet) => {
      const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
      recipientKeypairsMap.set(keypair.publicKey.toBase58(), keypair);
    });

    // Step 3: Complete transaction signing with sender and recipient keys
    const fullySignedTransactions = completeTransactionSigning(
      partiallySignedTransactions,
      senderKeypair,
      recipientKeypairsMap,
    );
    // Step 4: Prepare distribution bundles
    const distributionBundles = prepareTransactionBundles(
      fullySignedTransactions,
    );

    // Step 5: Send bundles
    const results: BundleResult[] = [];
    for (let i = 0; i < distributionBundles.length; i++) {
      const bundle = distributionBundles[i];
      const result = await sendTransactions(bundle.transactions);
      results.push(result);

      // Add delay between bundles (except after the last one)
      if (i < distributionBundles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
      }
    }

    return {
      success: true,
      result: results,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};


/**
 * Validate distribution inputs
 */
export const validateDistributionInputs = (
  senderWallet: WalletDistribution,
  recipientWallets: WalletDistribution[],
  senderBalance: number,
  baseCurrencySymbol: string = "SOL",
): { valid: boolean; error?: string } => {
  // Check if sender wallet is valid
  if (!senderWallet.address || !senderWallet.privateKey) {
    return { valid: false, error: "Invalid sender wallet" };
  }

  // Check if recipient wallets are valid
  if (!recipientWallets.length) {
    return { valid: false, error: "No recipient wallets" };
  }

  for (const wallet of recipientWallets) {
    if (!wallet.address || !wallet.privateKey || !wallet.amount) {
      return { valid: false, error: "Invalid recipient wallet data" };
    }

    if (isNaN(parseFloat(wallet.amount)) || parseFloat(wallet.amount) <= 0) {
      return { valid: false, error: "Invalid amount: " + wallet.amount };
    }
  }

  // Calculate total amount
  const totalAmount = recipientWallets.reduce(
    (sum, wallet) => sum + parseFloat(wallet.amount),
    0,
  );

  // Check if sender has enough balance (including some extra for fees)
  if (totalAmount > senderBalance) {
    return {
      valid: false,
      error: `Insufficient balance. Need at least ${totalAmount} ${baseCurrencySymbol}, but have ${senderBalance} ${baseCurrencySymbol}`,
    };
  }

  return { valid: true };
};
/**
 * Batch distribute base currency to multiple recipients, splitting into groups of max 3 recipients per request
 */
export const batchDistributeBaseCurrency = async (
  senderWallet: WalletDistribution,
  recipientWallets: WalletDistribution[],
  baseCurrency?: BaseCurrencyConfig,
): Promise<{ success: boolean; results?: unknown[]; error?: string }> => {
  try {
    const currency = resolveBaseCurrency(baseCurrency);
    // Return early if no recipients
    if (recipientWallets.length === 0) {
      return { success: true, results: [] };
    }

    // If 3 or fewer recipients, just call distributeBaseCurrency directly
    if (recipientWallets.length <= 3) {
      const result = await distributeBaseCurrency(
        senderWallet,
        recipientWallets,
        currency,
      );
      return {
        success: result.success,
        results: result.success ? [result.result] : [],
        error: result.error,
      };
    }

    // Split recipients into batches of max 3
    const MAX_RECIPIENTS_PER_BATCH = 3;
    const batches: WalletDistribution[][] = [];

    for (
      let i = 0;
      i < recipientWallets.length;
      i += MAX_RECIPIENTS_PER_BATCH
    ) {
      batches.push(recipientWallets.slice(i, i + MAX_RECIPIENTS_PER_BATCH));
    }
    // Execute each batch sequentially
    const results: unknown[] = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      // Execute this batch
      const batchResult = await distributeBaseCurrency(
        senderWallet,
        batch,
        currency,
      );

      if (!batchResult.success) {
        return {
          success: false,
          results,
          error: `Batch ${i + 1} failed: ${batchResult.error}`,
        };
      }

      // Add batch result and update remaining balance
      results.push(batchResult.result);

      // Add delay between batches (except after the last one)
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 second delay between batches
      }
    }

    return {
      success: true,
      results,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

