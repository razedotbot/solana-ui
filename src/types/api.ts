/**
 * Shared type definitions for API responses and common structures
 * Used across the Solana trading application
 */

/**
 * Generic API response wrapper
 * Used for responses from the trading server endpoints
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  result?: T; // Some endpoints use 'result' instead of 'data'
}

/**
 * Bundle result from Jito block engine
 * Used when sending transaction bundles through the backend proxy
 */
export interface BundleResult {
  jsonrpc: string;
  id: number;
  result?: string;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Simplified bundle result for success/failure tracking
 * Used in utility functions that process bundle responses
 */
export interface SimpleBundleResult {
  success: boolean;
  signature?: string;
  txid?: string;
  bundleId?: string;
  error?: string;
}

/**
 * Token creation result
 * Used when creating new tokens on various platforms (Pump, Moon, etc.)
 */
export interface TokenCreationResult {
  success: boolean;
  tokenMint?: string;
  signature?: string;
  error?: string;
  details?: string;
}

/**
 * Server configuration
 * Stored on window object for global access
 */
export interface ServerConfig {
  tradingServerUrl: string;
  rpcUrl?: string;
  serverRegion?: string;
}

/**
 * Trading server instance information
 * Used for regional trading server discovery and selection
 */
export interface ServerInfo {
  id: string;
  name: string;
  url: string;
  region: string;
  flag: string;
  ping?: number;
}
/**
 * Bundle response from transaction bundle operations
 * Used when processing bundle results from Jito or other bundlers
 */
export interface BundleResponse {
  bundles?: Array<{
    transactions: string[];
    uuid?: string;
  }>;
  transactions?: string[];
  signature?: string;
  error?: string;
}

/**
 * Token creation response from platform APIs
 * Used when creating tokens on Pump.fun, Moon, Bags, etc.
 */
export interface TokenCreationResponse {
  tokenCreation?: {
    mint: string;
    signature?: string;
    metadataUri?: string;
  };
  mint?: string;
  signature?: string;
  error?: string;
  success?: boolean;
}

/**
 * Extended Window interface with toast notification support
 * Used for global toast notifications across the application
 */
export interface WindowWithToast extends Window {
  showToast?: (message: string, type: 'success' | 'error') => void;
}

/**
 * Preset tab configuration
 * Used for managing preset trading configurations in the UI
 */
export interface PresetTab {
  id: string;
  name: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
}

/**
 * Trading statistics from iframe data
 * Used for tracking trading performance metrics
 */
export interface TradingStats {
  totalBought: number;
  totalSold: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  net: number;
  [key: string]: unknown;
}

/**
 * Wallet information from iframe context
 * Used for displaying wallet data in the trading interface
 */
export interface IframeWallet {
  address: string;
  label?: string;
  balance?: number;
  privateKey?: string;
  [key: string]: unknown;
}

/**
 * Complete iframe data structure
 * Used for communication between iframe and parent window
 */
export interface IframeData {
  tradingStats: {
    bought: number;
    sold: number;
    net: number;
    trades: number;
    timestamp: number;
  } | null;
  solPrice: number | null;
  currentWallets: {
    address: string;
    label?: string;
  }[];
  recentTrades: {
    type: 'buy' | 'sell';
    address: string;
    tokensAmount: number;
    avgPrice: number;
    solAmount: number;
    timestamp: number;
    signature: string;
  }[];
  tokenPrice: {
    tokenPrice: number;
    tokenMint: string;
    timestamp: number;
    tradeType: 'buy' | 'sell';
    volume: number;
  } | null;
  marketCap: number | null;
}
