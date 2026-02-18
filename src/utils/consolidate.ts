import { Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import type { SenderResult } from "./types";
import { API_ENDPOINTS, OPERATION_DELAYS } from "./constants";
import { parseTransactionArray, type RawTransactionResponse } from "./transactionParsing";
import { sendTransactions, getServerBaseUrl, checkRateLimit, splitLargeBundles } from "./trading";

interface WalletConsolidation {
  address: string;
  privateKey: string;
}

/**
 * Get partially prepared consolidation transactions from backend
 * The backend will create transactions without signing them
 */
const getPartiallyPreparedTransactions = async (
  sourceAddresses: string[],
  receiverAddress: string,
  percentage: number,
): Promise<string[]> => {
  const baseUrl = getServerBaseUrl();

  const endpoint = `${baseUrl}${API_ENDPOINTS.SOL_CONSOLIDATE}`;

  const requestBody: Record<string, unknown> = {
    wallets: sourceAddresses,
    receiver: receiverAddress,
    percentage,
  };

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
      data.error || "Failed to get partially prepared transactions",
    );
  }

  return parseTransactionArray(data);
};

/**
 * Complete transaction signing with source wallets and recipient wallet
 */
const completeTransactionSigning = (
  partiallyPreparedTransactionsBase58: string[],
  sourceKeypairs: Map<string, Keypair>,
  receiverKeypair: Keypair,
): string[] => {
  return partiallyPreparedTransactionsBase58.map((txBase58) => {
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
};


/**
 * Execute base currency consolidation (SOL, USDC, USD1)
 */
export const consolidateBaseCurrency = async (
  sourceWallets: WalletConsolidation[],
  receiverWallet: WalletConsolidation,
  percentage: number,
  _baseCurrency?: unknown,
): Promise<{ success: boolean; result?: unknown; error?: string }> => {
  try {
    // Extract source addresses
    const sourceAddresses = sourceWallets.map((wallet) => wallet.address);

    // Step 1: Get partially prepared transactions from backend
    const partiallyPreparedTransactions =
      await getPartiallyPreparedTransactions(
        sourceAddresses,
        receiverWallet.address,
        percentage,
      );

    // Step 2: Create keypairs from private keys
    const receiverKeypair = Keypair.fromSecretKey(
      bs58.decode(receiverWallet.privateKey),
    );

    // Create a map of source public keys to keypairs for faster lookups
    const sourceKeypairsMap = new Map<string, Keypair>();
    sourceWallets.forEach((wallet) => {
      const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));
      sourceKeypairsMap.set(keypair.publicKey.toBase58(), keypair);
    });

    // Step 3: Complete transaction signing with source and receiver keys
    const fullySignedTransactions = completeTransactionSigning(
      partiallyPreparedTransactions,
      sourceKeypairsMap,
      receiverKeypair,
    );

    // Step 4: Prepare consolidation bundles
    const consolidationBundles = splitLargeBundles([
      { transactions: fullySignedTransactions },
    ]);

    // Step 5: Send bundles
    const results: SenderResult[] = [];
    for (let i = 0; i < consolidationBundles.length; i++) {
      const bundle = consolidationBundles[i];

      await checkRateLimit();
      const result = await sendTransactions(bundle.transactions);
      results.push(result);

      // Add delay between bundles (except after the last one)
      if (i < consolidationBundles.length - 1) {
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
 * Validate consolidation inputs
 */
export const validateConsolidationInputs = (
  sourceWallets: WalletConsolidation[],
  receiverWallet: WalletConsolidation,
  percentage: number,
  sourceBalances: Map<string, number>,
  _currencySymbol?: string,
): { valid: boolean; error?: string } => {
  // Check if receiver wallet is valid
  if (!receiverWallet.address || !receiverWallet.privateKey) {
    return { valid: false, error: "Invalid receiver wallet" };
  }

  // Check if source wallets are valid
  if (!sourceWallets.length) {
    return { valid: false, error: "No source wallets" };
  }

  for (const wallet of sourceWallets) {
    if (!wallet.address || !wallet.privateKey) {
      return { valid: false, error: "Invalid source wallet data" };
    }

    const balance = sourceBalances.get(wallet.address) || 0;
    if (balance <= 0) {
      return {
        valid: false,
        error: `Source wallet ${wallet.address.substring(0, 6)}... has no balance`,
      };
    }
  }

  // Check if percentage is valid
  if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
    return { valid: false, error: "Percentage must be between 1 and 100" };
  }

  return { valid: true };
};
