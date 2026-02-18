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
export type BundleMode = "single" | "batch" | "all-in-one";

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
  /** Amount of base currency to spend per wallet (SOL, USDC, or USD1) */
  amount: number;
  /** Input mint address for base currency (SOL, USDC, USD1) */
  inputMint?: string;
  /** Optional custom amounts per wallet (overrides amount) */
  amounts?: number[];
  /** Slippage tolerance in basis points (e.g., 100 = 1%) */
  slippageBps?: number;
  /** Fee tip in lamports (min 0.001 SOL = 1,000,000 lamports) */
  feeTipLamports?: number;
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
  /** Specific amount of tokens to sell (alternative to percentage). Single number applies to all wallets; array is per-wallet. */
  tokensAmount?: number | number[];
  /** Slippage tolerance in basis points (e.g., 100 = 1%) */
  slippageBps?: number;
  /** Output token mint (usually SOL) - mainly for Auto */
  outputMint?: string;
  /** Fee tip in lamports (min 0.001 SOL = 1,000,000 lamports) */
  feeTipLamports?: number;
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
 * Transaction bundle for buy operations
 * Contains base58 encoded transactions ready for signing
 */
export interface BuyBundle {
  /** Array of base58 encoded transaction data */
  transactions: string[];
}

/**
 * Transaction bundle for sell operations
 * Contains base58 encoded transactions ready for signing
 */
export interface SellBundle {
  /** Array of base58 encoded transaction data */
  transactions: string[];
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
  type: "buy" | "sell";
  /** Token mint address */
  tokenAddress: string;
  /** Number of wallets involved */
  walletsCount: number;
  /** Amount traded (base currency for buy, percentage or tokens for sell) */
  amount: number;
  /** Type of amount ('base-currency' or 'percentage') */
  amountType: "base-currency" | "percentage";
  /** Base currency mint used for the trade */
  baseCurrencyMint?: string;
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
  type: "buy" | "sell";
  /** Token mint address */
  tokenAddress: string;
  /** Number of wallets involved */
  walletsCount: number;
  /** Amount traded */
  amount: number;
  /** Type of amount */
  amountType: "base-currency" | "percentage";
  /** Base currency mint used */
  baseCurrencyMint?: string;
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
  operationType?: "buy" | "sell";
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
  /** Amount for buy (in base currency) */
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
  type: "buy" | "sell";
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

// ============================================================================
// Limit Order Types
// ============================================================================

export type LimitPriceMode = "marketCap" | "tokenPrice";
export type LimitOrderStatus = "active" | "triggered" | "cancelled" | "failed";

export interface LimitOrder {
  id: string;
  tokenAddress: string;
  side: "buy" | "sell";
  priceMode: LimitPriceMode;
  targetPrice: number;
  amount: number;
  walletAddresses: string[];
  createdAt: number;
  status: LimitOrderStatus;
  resolvedAt?: number;
  error?: string;
  solPriceAtCreation: number;
  marketCapAtCreation: number | null;
}
