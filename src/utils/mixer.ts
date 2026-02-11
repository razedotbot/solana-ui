import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import type { SenderResult } from "./types";
import { BASE_CURRENCIES, API_ENDPOINTS, OPERATION_DELAYS, type BaseCurrencyConfig } from "./constants";
import { parseTransactionArray, type RawTransactionResponse } from "./transactionParsing";
import { sendTransactions, getServerBaseUrl, checkRateLimit, resolveBaseCurrency, prepareTransactionBundles } from "./trading";

interface WalletMixing {
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
    ? `${baseUrl}${API_ENDPOINTS.SOL_MIXER}`
    : `${baseUrl}${API_ENDPOINTS.TOKEN_MIXER}`;

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

  const data = (await response.json()) as RawTransactionResponse;

  if (!data.success) {
    throw new Error(
      data.error || "Failed to get partially signed transactions",
    );
  }

  return parseTransactionArray(data);
};

/**
 * Complete transaction signing with sender and recipient keys
 * First transaction: signed by depositor (sender)
 * Second transaction: signed by receiver (recipient)
 */
const completeTransactionSigning = (
  partiallySignedTransactionsBase58: string[],
  senderKeypair: Keypair,
  recipientKeypairs: Map<string, Keypair>,
): string[] => {
  return partiallySignedTransactionsBase58.map((txBase58, index) => {
    // Deserialize transaction
    const txBuffer = bs58.decode(txBase58);
    const transaction = VersionedTransaction.deserialize(txBuffer);
    // Determine which keypair to use based on transaction index
    if (index === 0) {
      // First transaction: signed by depositor (sender)
      transaction.sign([senderKeypair]);
    } else if (index === 1 && recipientKeypairs.size > 0) {
      // Second transaction: signed by receiver (recipient)
      const recipientKeypair = Array.from(recipientKeypairs.values())[0]; // Get the first (and should be only) recipient keypair
      transaction.sign([recipientKeypair]);
    } else {
      // For any additional transactions, fall back to analyzing required signers
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
      transaction.sign(requiredSigners);
    }

    // Serialize and encode the fully signed transaction
    return bs58.encode(transaction.serialize());
  });
};

/**
 * Execute base currency mixing to a single recipient (SOL, USDC, USD1)
 */
export const mixBaseCurrencyToSingleRecipient = async (
  senderWallet: WalletMixing,
  recipientWallet: WalletMixing,
  baseCurrency?: BaseCurrencyConfig,
): Promise<{ success: boolean; result?: unknown; error?: string }> => {
  try {
    const currency = resolveBaseCurrency(baseCurrency);
    // Convert single recipient wallet to backend format
    const recipients = [
      {
        address: recipientWallet.address,
        amount: recipientWallet.amount,
      },
    ];

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

    // Create a map with the single recipient keypair
    const recipientKeypairsMap = new Map<string, Keypair>();
    const recipientKeypair = Keypair.fromSecretKey(
      bs58.decode(recipientWallet.privateKey),
    );
    recipientKeypairsMap.set(
      recipientKeypair.publicKey.toBase58(),
      recipientKeypair,
    );

    // Step 3: Complete transaction signing with sender and recipient keys
    const fullySignedTransactions = completeTransactionSigning(
      partiallySignedTransactions,
      senderKeypair,
      recipientKeypairsMap,
    );
    // Step 4: Prepare mixing bundles
    const mixingBundles = prepareTransactionBundles(fullySignedTransactions);

    // Step 5: Send bundles
    const results: SenderResult[] = [];
    for (let i = 0; i < mixingBundles.length; i++) {
      const bundle = mixingBundles[i];
      await checkRateLimit();
      const result = await sendTransactions(bundle.transactions);
      results.push(result);

      // Add delay between bundles (except after the last one)
      if (i < mixingBundles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, OPERATION_DELAYS.INTER_BUNDLE_MS));
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
 * Execute base currency mixing (kept for backward compatibility)
 */
export const mixBaseCurrency = async (
  senderWallet: WalletMixing,
  recipientWallets: WalletMixing[],
  baseCurrency?: BaseCurrencyConfig,
): Promise<{ success: boolean; result?: unknown; error?: string }> => {
  // If only one recipient, use the optimized single recipient function
  if (recipientWallets.length === 1) {
    return await mixBaseCurrencyToSingleRecipient(
      senderWallet,
      recipientWallets[0],
      baseCurrency,
    );
  }

  // For multiple recipients, delegate to batch processing
  const batchResult = await batchMixBaseCurrency(
    senderWallet,
    recipientWallets,
    baseCurrency,
  );
  return {
    success: batchResult.success,
    result: batchResult.results,
    error: batchResult.error,
  };
};


/**
 * Validate mixing inputs for single recipient
 */
export const validateSingleMixingInputs = (
  senderWallet: WalletMixing,
  recipientWallet: WalletMixing,
  senderBalance: number,
  baseCurrencySymbol: string = "SOL",
): { valid: boolean; error?: string } => {
  // Check if sender wallet is valid
  if (!senderWallet.address || !senderWallet.privateKey) {
    return { valid: false, error: "Invalid sender wallet" };
  }

  // Check if recipient wallet is valid
  if (
    !recipientWallet.address ||
    !recipientWallet.privateKey ||
    !recipientWallet.amount
  ) {
    return { valid: false, error: "Invalid recipient wallet data" };
  }

  if (
    isNaN(parseFloat(recipientWallet.amount)) ||
    parseFloat(recipientWallet.amount) <= 0
  ) {
    return { valid: false, error: "Invalid amount: " + recipientWallet.amount };
  }

  // Calculate required amount
  const amount = parseFloat(recipientWallet.amount);

  // Check if sender has enough balance (including some extra for fees)
  const estimatedFee = 0.01; // Rough estimate for fees
  if (amount + estimatedFee > senderBalance) {
    return {
      valid: false,
      error: `Insufficient balance. Need at least ${amount + estimatedFee} ${baseCurrencySymbol}, but have ${senderBalance} ${baseCurrencySymbol}`,
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
  const estimatedFee = 0.01 * recipientWallets.length; // Rough estimate for fees
  if (totalAmount + estimatedFee > senderBalance) {
    return {
      valid: false,
      error: `Insufficient balance. Need at least ${totalAmount + estimatedFee} ${baseCurrencySymbol}, but have ${senderBalance} ${baseCurrencySymbol}`,
    };
  }

  return { valid: true };
};

/**
 * Batch mix base currency to multiple recipients, processing ONE RECIPIENT AT A TIME
 */
export const batchMixBaseCurrency = async (
  senderWallet: WalletMixing,
  recipientWallets: WalletMixing[],
  baseCurrency?: BaseCurrencyConfig,
): Promise<{ success: boolean; results?: unknown[]; error?: string }> => {
  try {
    const currency = resolveBaseCurrency(baseCurrency);
    // Return early if no recipients
    if (recipientWallets.length === 0) {
      return { success: true, results: [] };
    }

    // Process each recipient individually
    const results: unknown[] = [];
    for (let i = 0; i < recipientWallets.length; i++) {
      const recipientWallet = recipientWallets[i];
      // Execute mixing to single recipient
      const result = await mixBaseCurrencyToSingleRecipient(
        senderWallet,
        recipientWallet,
        currency,
      );

      if (!result.success) {
        return {
          success: false,
          results,
          error: `Mixing to recipient ${i + 1} (${recipientWallet.address}) failed: ${result.error}`,
        };
      }

      // Add result
      results.push(result.result);

      // Add delay between recipients (except after the last one)
      if (i < recipientWallets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, OPERATION_DELAYS.BATCH_INTERVAL_MS));
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

