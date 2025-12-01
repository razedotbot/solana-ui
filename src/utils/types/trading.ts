/**
 * Trading Type Definitions
 * 
 * This module contains all trading-related type definitions
 * for the Solana trading application, including buy/sell operations,
 * bundle configurations, and trading results.
 */

// ============================================================================
// Bundle Mode Types
// ============================================================================

/**
 * Transaction bundle execution mode
 * - 'single': Process each wallet separately with delay between
 * - 'batch': Process wallets in batches of 5 with delay between batches
 * - 'all-in-one': Process all wallets simultaneously
 */
export type BundleMode = 'single' | 'batch' | 'all-in-one';

// ============================================================================
// Script Types
// ============================================================================

/**
 * Script types for different DEX and operation combinations
 * Used to determine which backend endpoint to call
 */
export type ScriptType = 
  | 'buy' | 'sell'
  | 'consolidate' | 'distribute' | 'mixer' | 'cleaner'
  | 'bonkcreate' | 'cookcreate' | 'pumpcreate' | 'mooncreate' | 'boopcreate'
  | 'deploy';

// ============================================================================
// Wallet Trading Types
// ============================================================================

/**
 * Wallet information for buy operations
 * Minimal wallet data needed for trading
 */
export interface WalletBuy {
  /** Solana public key address (base58 encoded) */
  address: string;
  /** Private key for signing transactions (base58 encoded) */
  privateKey: string;
}

/**
 * Wallet information for sell operations
 * Minimal wallet data needed for trading
 */
export interface WalletSell {
  /** Solana public key address (base58 encoded) */
  address: string;
  /** Private key for signing transactions (base58 encoded) */
  privateKey: string;
}

// ============================================================================
// Buy Configuration Types
// ============================================================================

/**
 * Configuration for buy operations
 * Contains all parameters needed to execute a token purchase
 */
export interface BuyConfig {
  /** Token mint address to buy (base58 encoded) */
  tokenAddress: string;
  /** Amount of SOL to spend per wallet */
  solAmount: number;
  /** Optional custom amounts per wallet (overrides solAmount) */
  amounts?: number[];
  /** Slippage tolerance in basis points (e.g., 100 = 1%) */
  slippageBps?: number;
  /** Custom Jito tip in lamports (for multi-wallet bundles) */
  jitoTipLamports?: number;
  /** Transaction fee in lamports (for single wallet operations) */
  transactionsFeeLamports?: number;
  /** Bundle execution mode */
  bundleMode?: BundleMode;
  /** Delay between batches in milliseconds (for batch mode) */
  batchDelay?: number;
  /** Delay between wallets in milliseconds (for single mode) */
  singleDelay?: number;
}

// ============================================================================
// Sell Configuration Types
// ============================================================================

/**
 * Configuration for sell operations
 * Contains all parameters needed to execute a token sale
 */
export interface SellConfig {
  /** Token mint address to sell (base58 encoded) */
  tokenAddress: string;
  /** Percentage of tokens to sell (1-100) */
  sellPercent: number;
  /** Specific amount of tokens to sell (alternative to percentage) */
  tokensAmount?: number;
  /** Slippage tolerance in basis points (e.g., 100 = 1%) */
  slippageBps?: number;
  /** Output token mint (usually SOL) - mainly for Auto */
  outputMint?: string;
  /** Custom Jito tip in lamports (for multi-wallet bundles) */
  jitoTipLamports?: number;
  /** Transaction fee in lamports (for single wallet operations) */
  transactionsFeeLamports?: number;
  /** Bundle execution mode */
  bundleMode?: BundleMode;
  /** Delay between batches in milliseconds (for batch mode) */
  batchDelay?: number;
  /** Delay between wallets in milliseconds (for single mode) */
  singleDelay?: number;
}

// ============================================================================
// Bundle Types
// ============================================================================

/**
 * Server response from trading operations
 * Contains results from self-hosted server or backend
 */
export interface ServerResponse {
  /** Whether the operation was successful */
  success?: boolean;
  /** Response data from the server */
  data?: unknown;
  /** Error message if operation failed */
  error?: string;
  /** Number of bundles sent */
  bundlesSent?: number;
  /** Array of individual results */
  results?: Array<Record<string, unknown>>;
  /** Allow additional properties */
  [key: string]: unknown;
}

/**
 * Transaction bundle for buy operations
 * Contains base58 encoded transactions ready for signing
 */
export interface BuyBundle {
  /** Array of base58 encoded transaction data */
  transactions: string[];
  /** Server response for self-hosted server operations */
  serverResponse?: ServerResponse;
}

/**
 * Transaction bundle for sell operations
 * Contains base58 encoded transactions ready for signing
 */
export interface SellBundle {
  /** Array of base58 encoded transaction data */
  transactions: string[];
  /** Server response for self-hosted server operations */
  serverResponse?: ServerResponse;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of a buy operation
 */
export interface BuyResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Result data from the operation */
  result?: unknown;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Result of a sell operation
 */
export interface SellResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Result data from the operation */
  result?: unknown;
  /** Error message if operation failed */
  error?: string;
}

// ============================================================================
// Trade History Types
// ============================================================================

/**
 * Trade history entry for tracking past operations
 */
export interface TradeHistoryEntry {
  /** Unique identifier for the trade */
  id: string;
  /** Type of trade operation */
  type: 'buy' | 'sell';
  /** Token mint address */
  tokenAddress: string;
  /** Number of wallets involved */
  walletsCount: number;
  /** Amount traded (SOL for buy, percentage or tokens for sell) */
  amount: number;
  /** Type of amount ('sol' or 'percentage') */
  amountType: 'sol' | 'percentage';
  /** Whether the trade was successful */
  success: boolean;
  /** Error message if trade failed */
  error?: string;
  /** Bundle mode used for the trade */
  bundleMode: BundleMode;
  /** Unix timestamp of the trade */
  timestamp: number;
}

/**
 * Input for adding a trade to history
 */
export interface AddTradeHistoryInput {
  /** Type of trade operation */
  type: 'buy' | 'sell';
  /** Token mint address */
  tokenAddress: string;
  /** Number of wallets involved */
  walletsCount: number;
  /** Amount traded */
  amount: number;
  /** Type of amount */
  amountType: 'sol' | 'percentage';
  /** Whether the trade was successful */
  success: boolean;
  /** Error message if trade failed */
  error?: string;
  /** Bundle mode used */
  bundleMode: BundleMode;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of input validation for trading operations
 */
export interface ValidationResult {
  /** Whether the inputs are valid */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
}

// ============================================================================
// Trading State Types
// ============================================================================

/**
 * Current trading state for the UI
 */
export interface TradingState {
  /** Whether a trade is currently in progress */
  isTrading: boolean;
  /** Current operation type */
  operationType?: 'buy' | 'sell';
  /** Progress percentage (0-100) */
  progress?: number;
  /** Status message */
  statusMessage?: string;
}

/**
 * Trading form values
 */
export interface TradingFormValues {
  /** Token address to trade */
  tokenAddress: string;
  /** Amount for buy (in SOL) */
  buyAmount: string;
  /** Percentage for sell (0-100) */
  sellPercentage: string;
  /** Slippage in basis points */
  slippageBps: string;
  /** Selected bundle mode */
  bundleMode: BundleMode;
  /** Whether to use custom amounts per wallet */
  useCustomAmounts: boolean;
  /** Custom amounts per wallet */
  customAmounts?: Map<string, number>;
}

// ============================================================================
// Price and Market Types
// ============================================================================

/**
 * Token price information
 */
export interface TokenPrice {
  /** Token mint address */
  tokenMint: string;
  /** Current price in SOL */
  priceInSol: number;
  /** Current price in USD */
  priceInUsd?: number;
  /** 24h price change percentage */
  change24h?: number;
  /** Unix timestamp of price update */
  timestamp: number;
}

/**
 * Market data for a token
 */
export interface TokenMarketData {
  /** Token mint address */
  tokenMint: string;
  /** Market cap in USD */
  marketCap?: number;
  /** 24h trading volume in USD */
  volume24h?: number;
  /** Total supply */
  totalSupply?: number;
  /** Circulating supply */
  circulatingSupply?: number;
  /** Number of holders */
  holders?: number;
}

// ============================================================================
// Quick Trade Types
// ============================================================================

/**
 * Quick trade execution parameters
 */
export interface QuickTradeParams {
  /** Token address to trade */
  tokenAddress: string;
  /** Trade type */
  type: 'buy' | 'sell';
  /** Amount (SOL for buy, percentage for sell) */
  amount: number;
  /** Wallets to use for the trade */
  walletAddresses: string[];
  /** Optional slippage override */
  slippageBps?: number;
}

/**
 * Quick trade result
 */
export interface QuickTradeResult {
  /** Whether the trade was successful */
  success: boolean;
  /** Number of successful transactions */
  successCount: number;
  /** Number of failed transactions */
  failCount: number;
  /** Error message if all failed */
  error?: string;
  /** Individual transaction results */
  results?: Array<{
    walletAddress: string;
    success: boolean;
    signature?: string;
    error?: string;
  }>;
}
