/**
 * Shared Trading Utilities
 *
 * Common functions used by both buy.ts and sell.ts to avoid code duplication.
 */

import { Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { loadConfigFromCookies } from '../../Utils';
import { TRADING, RATE_LIMIT } from '../constants';
import type { ApiResponse, BundleResult } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface WindowWithConfig {
  tradingServerUrl?: string;
}

export interface RateLimitState {
  count: number;
  lastReset: number;
  maxBundlesPerSecond: number;
}

export interface TransactionBundle {
  transactions: string[];
  serverResponse?: unknown;
}

// ============================================================================
// Rate Limiting
// ============================================================================

const rateLimitState: RateLimitState = {
  count: 0,
  lastReset: Date.now(),
  maxBundlesPerSecond: TRADING.MAX_BUNDLES_PER_SECOND,
};

/**
 * Check rate limit and wait if necessary
 */
export const checkRateLimit = async (): Promise<void> => {
  const now = Date.now();

  if (now - rateLimitState.lastReset >= RATE_LIMIT.RESET_INTERVAL_MS) {
    rateLimitState.count = 0;
    rateLimitState.lastReset = now;
  }

  if (rateLimitState.count >= rateLimitState.maxBundlesPerSecond) {
    const waitTime = RATE_LIMIT.RESET_INTERVAL_MS - (now - rateLimitState.lastReset);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    rateLimitState.count = 0;
    rateLimitState.lastReset = Date.now();
  }

  rateLimitState.count++;
};

// ============================================================================
// Server URL Resolution
// ============================================================================

/**
 * Get the base URL for trading server
 */
export const getServerBaseUrl = (): string => {
  const config = loadConfigFromCookies();

  if (config?.tradingServerEnabled === 'true' && config?.tradingServerUrl) {
    return config.tradingServerUrl.replace(/\/+$/, '');
  }

  return (window as WindowWithConfig).tradingServerUrl?.replace(/\/+$/, '') || '';
};

/**
 * Check if self-hosted trading server is enabled
 */
export const isSelfHostedServer = (): boolean => {
  const config = loadConfigFromCookies();
  return config?.tradingServerEnabled === 'true';
};

// ============================================================================
// Bundle Sending
// ============================================================================

/**
 * Send bundle to Jito block engine through backend proxy
 */
export const sendBundle = async (encodedBundle: string[]): Promise<BundleResult> => {
  try {
    const baseUrl = getServerBaseUrl();

    const response = await fetch(`${baseUrl}/v2/sol/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: encodedBundle,
      }),
    });

    const data = await response.json() as ApiResponse<BundleResult>;
    return data.result as BundleResult;
  } catch (error) {
    console.error('[Trading] Error sending bundle:', error);
    throw error;
  }
};

// ============================================================================
// Transaction Signing
// ============================================================================

/**
 * Sign a transaction with the provided keypairs
 */
export const signTransaction = (
  txBase58: string,
  walletKeypairs: Keypair[]
): string | null => {
  try {
    let txBuffer: Uint8Array;
    try {
      txBuffer = bs58.decode(txBase58);
    } catch {
      txBuffer = new Uint8Array(Buffer.from(txBase58, 'base64'));
    }

    const transaction = VersionedTransaction.deserialize(txBuffer);

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

    if (signers.length === 0) {
      console.warn('[Trading] No matching signers found for transaction');
      return null;
    }

    transaction.sign(signers);
    return bs58.encode(transaction.serialize());
  } catch (error) {
    console.error('[Trading] Error signing transaction:', error);
    return null;
  }
};

/**
 * Complete bundle signing for all transactions
 */
export const completeBundleSigning = (
  bundle: TransactionBundle,
  walletKeypairs: Keypair[]
): TransactionBundle => {
  if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
    console.error('[Trading] Invalid bundle format:', bundle);
    return { transactions: [] };
  }

  const signedTransactions = bundle.transactions
    .map(tx => signTransaction(tx, walletKeypairs))
    .filter((tx): tx is string => tx !== null);

  return { transactions: signedTransactions };
};

// ============================================================================
// Bundle Splitting
// ============================================================================

/**
 * Split large bundles into smaller ones with maximum transactions per bundle
 */
export const splitLargeBundles = (bundles: TransactionBundle[]): TransactionBundle[] => {
  const result: TransactionBundle[] = [];

  for (const bundle of bundles) {
    if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
      continue;
    }

    if (bundle.transactions.length <= TRADING.MAX_TRANSACTIONS_PER_BUNDLE) {
      result.push(bundle);
      continue;
    }

    for (let i = 0; i < bundle.transactions.length; i += TRADING.MAX_TRANSACTIONS_PER_BUNDLE) {
      const chunkTransactions = bundle.transactions.slice(
        i,
        i + TRADING.MAX_TRANSACTIONS_PER_BUNDLE
      );
      result.push({ transactions: chunkTransactions });
    }
  }

  return result;
};

// ============================================================================
// Keypair Creation
// ============================================================================

/**
 * Create keypairs from wallet objects
 */
export const createKeypairs = (wallets: { privateKey: string }[]): Keypair[] => {
  return wallets.map(wallet => Keypair.fromSecretKey(bs58.decode(wallet.privateKey)));
};

// ============================================================================
// Request Body Helpers
// ============================================================================

/**
 * Get slippage value from config or use default
 */
export const getSlippageBps = (configSlippage?: number): number => {
  if (configSlippage !== undefined) {
    return configSlippage;
  }

  const appConfig = loadConfigFromCookies();
  if (appConfig?.slippageBps) {
    return parseInt(appConfig.slippageBps);
  }

  return TRADING.DEFAULT_SLIPPAGE_BPS;
};

/**
 * Get fee in lamports based on wallet count
 */
export const getFeeLamports = (
  walletCount: number,
  jitoTipLamports?: number,
  transactionsFeeLamports?: number
): { jitoTipLamports?: number; transactionsFeeLamports?: number } => {
  const appConfig = loadConfigFromCookies();
  const feeInSol = parseFloat(appConfig?.transactionFee || String(TRADING.DEFAULT_TRANSACTION_FEE_SOL));

  if (walletCount < 2) {
    return {
      transactionsFeeLamports:
        transactionsFeeLamports ?? Math.floor((feeInSol / 3) * 1_000_000_000),
    };
  }

  return {
    jitoTipLamports: jitoTipLamports ?? Math.floor(feeInSol * 1_000_000_000),
  };
};

// ============================================================================
// Result Processing
// ============================================================================

export interface BatchResult {
  success: boolean;
  results: BundleResult[];
  successCount: number;
  failCount: number;
}

/**
 * Process batch results and return summary
 */
export const processBatchResults = (
  bundleResults: PromiseSettledResult<{ success: boolean; result?: BundleResult }>[]
): BatchResult => {
  const results: BundleResult[] = [];
  let successCount = 0;
  let failCount = 0;

  bundleResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        if (result.value.result) results.push(result.value.result);
        successCount++;
      } else {
        failCount++;
      }
    } else {
      console.error(`[Trading] Bundle ${index + 1} promise rejected:`, result.reason);
      failCount++;
    }
  });

  return {
    success: successCount > 0,
    results,
    successCount,
    failCount,
  };
};

/**
 * Create error message from batch results
 */
export const createBatchErrorMessage = (successCount: number, failCount: number): string | undefined => {
  if (failCount > 0) {
    return `${failCount} failed, ${successCount} succeeded`;
  }
  return undefined;
};
