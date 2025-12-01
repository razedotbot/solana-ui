/**
 * Iframe Type Definitions
 * 
 * This module contains all iframe and communication type definitions
 * for the Solana trading application, including message types,
 * response types, and iframe state management.
 */

// ============================================================================
// View Types
// ============================================================================

/**
 * Iframe view types
 */
export type ViewType = 'holdings' | 'monitor' | 'token';

// ============================================================================
// Iframe Message Types (Sent TO Iframe)
// ============================================================================

/**
 * Navigate message to change iframe view
 */
export interface NavigateMessage {
  /** Message type identifier */
  type: 'NAVIGATE';
  /** Target view */
  view: 'holdings' | 'token' | 'monitor';
  /** Token mint address for token view */
  tokenMint?: string;
  /** Wallet addresses to include */
  wallets?: Array<string | { address: string; label?: string }>;
}

/**
 * Wallet management messages
 */
export interface AddWalletsMessage {
  /** Message type identifier */
  type: 'ADD_WALLETS';
  /** Wallets to add */
  wallets: Array<string | { address: string; label?: string }>;
}

export interface ClearWalletsMessage {
  /** Message type identifier */
  type: 'CLEAR_WALLETS';
}

export interface GetWalletsMessage {
  /** Message type identifier */
  type: 'GET_WALLETS';
}

/**
 * Wallet message interface for backward compatibility
 * Used by iframeManager for deduplication logic
 */
export interface WalletMessage {
  /** Message type identifier */
  type: 'ADD_WALLETS' | 'CLEAR_WALLETS';
  /** Wallets to add (optional, only present for ADD_WALLETS) */
  wallets?: Array<string | { address: string; label?: string }>;
}

/**
 * Union type for wallet messages (strict typing)
 */
export type WalletMessageUnion = AddWalletsMessage | ClearWalletsMessage;

/**
 * Toggle non-whitelisted trades message
 */
export interface ToggleNonWhitelistedTradesMessage {
  /** Message type identifier */
  type: 'TOGGLE_NON_WHITELISTED_TRADES';
  /** Whether to enable non-whitelisted trades */
  enabled: boolean;
}

/**
 * Quick buy configuration message
 */
export interface SetQuickBuyConfigMessage {
  /** Message type identifier */
  type: 'SET_QUICK_BUY_CONFIG';
  /** Quick buy configuration */
  config: {
    /** Whether quick buy is enabled */
    enabled: boolean;
    /** Buy amount in SOL */
    amount: number;
    /** Minimum amount for range */
    minAmount: number;
    /** Maximum amount for range */
    maxAmount: number;
    /** Whether to use random amount in range */
    useRange: boolean;
  };
}

/**
 * Quick buy activation messages
 */
export interface QuickBuyActivateMessage {
  /** Message type identifier */
  type: 'QUICKBUY_ACTIVATE';
}

export interface QuickBuyDeactivateMessage {
  /** Message type identifier */
  type: 'QUICKBUY_DEACTIVATE';
}

/**
 * Union type of all messages sent TO iframe
 */
export type IframeMessage = 
  | NavigateMessage 
  | AddWalletsMessage
  | ClearWalletsMessage
  | GetWalletsMessage
  | ToggleNonWhitelistedTradesMessage 
  | SetQuickBuyConfigMessage
  | QuickBuyActivateMessage
  | QuickBuyDeactivateMessage;

// ============================================================================
// Iframe Response Types (Received FROM Iframe)
// ============================================================================

/**
 * Iframe ready response
 */
export interface IframeReadyResponse {
  /** Response type identifier */
  type: 'IFRAME_READY';
}

/**
 * Wallets added response
 */
export interface WalletsAddedResponse {
  /** Response type identifier */
  type: 'WALLETS_ADDED';
  /** Whether operation was successful */
  success: boolean;
  /** Number of wallets added */
  count: number;
}

/**
 * Wallets cleared response
 */
export interface WalletsClearedResponse {
  /** Response type identifier */
  type: 'WALLETS_CLEARED';
  /** Whether operation was successful */
  success: boolean;
}

/**
 * Current wallets response
 */
export interface CurrentWalletsResponse {
  /** Response type identifier */
  type: 'CURRENT_WALLETS';
  /** List of current wallets */
  wallets: Array<{ address: string; label?: string }>;
}

/**
 * Whitelist trading stats response
 */
export interface WhitelistTradingStatsResponse {
  /** Response type identifier */
  type: 'WHITELIST_TRADING_STATS';
  /** Trading statistics data */
  data: {
    /** Total bought in SOL */
    bought: number;
    /** Total sold in SOL */
    sold: number;
    /** Net profit/loss */
    net: number;
    /** Number of trades */
    trades: number;
    /** Current SOL price */
    solPrice: number;
    /** Unix timestamp */
    timestamp: number;
  };
}

/**
 * SOL price update response
 */
export interface SolPriceUpdateResponse {
  /** Response type identifier */
  type: 'SOL_PRICE_UPDATE';
  /** Price data */
  data: {
    /** SOL price in USD */
    solPrice: number;
    /** Unix timestamp */
    timestamp: number;
  };
}

/**
 * Whitelist trade response
 */
export interface WhitelistTradeResponse {
  /** Response type identifier */
  type: 'WHITELIST_TRADE';
  /** Trade data */
  data: {
    /** Trade type */
    type: 'buy' | 'sell';
    /** Wallet address */
    address: string;
    /** Amount of tokens */
    tokensAmount: number;
    /** Average price */
    avgPrice: number;
    /** SOL amount */
    solAmount: number;
    /** Unix timestamp */
    timestamp: number;
    /** Transaction signature */
    signature: string;
  };
}

/**
 * Token price update response
 */
export interface TokenPriceUpdateResponse {
  /** Response type identifier */
  type: 'TOKEN_PRICE_UPDATE';
  /** Price data */
  data: {
    /** Token price in SOL */
    tokenPrice: number;
    /** Token mint address */
    tokenMint: string;
    /** Unix timestamp */
    timestamp: number;
    /** Trade type that caused update */
    tradeType: 'buy' | 'sell';
    /** Trade volume */
    volume: number;
  };
}

/**
 * Token selected response
 */
export interface TokenSelectedResponse {
  /** Response type identifier */
  type: 'TOKEN_SELECTED';
  /** Selected token address */
  tokenAddress: string;
}

/**
 * Non-whitelisted trade response
 */
export interface NonWhitelistedTradeResponse {
  /** Response type identifier */
  type: 'NON_WHITELIST_TRADE';
  /** Trade data */
  data: {
    /** Trade type */
    type: 'buy' | 'sell';
    /** Wallet address */
    address: string;
    /** Amount of tokens */
    tokensAmount: number;
    /** Average price */
    avgPrice: number;
    /** SOL amount */
    solAmount: number;
    /** Unix timestamp */
    timestamp: number;
    /** Transaction signature */
    signature: string;
    /** Token mint address */
    tokenMint: string;
    /** Market cap at time of trade */
    marketCap: number;
  };
}

/**
 * Holdings opened response
 */
export interface HoldingsOpenedResponse {
  /** Response type identifier */
  type: 'HOLDINGS_OPENED';
}

/**
 * Token cleared response
 */
export interface TokenClearedResponse {
  /** Response type identifier */
  type: 'TOKEN_CLEARED';
}

/**
 * Navigation complete response
 */
export interface NavigationCompleteResponse {
  /** Response type identifier */
  type: 'NAVIGATION_COMPLETE';
  /** Current view */
  view: string;
  /** Current token mint */
  tokenMint: string | null;
}

/**
 * Union type of all responses FROM iframe
 */
export type IframeResponse = 
  | IframeReadyResponse
  | WalletsAddedResponse
  | WalletsClearedResponse
  | CurrentWalletsResponse
  | WhitelistTradingStatsResponse
  | SolPriceUpdateResponse
  | WhitelistTradeResponse
  | TokenPriceUpdateResponse
  | TokenSelectedResponse
  | NonWhitelistedTradeResponse
  | HoldingsOpenedResponse
  | TokenClearedResponse
  | NavigationCompleteResponse;

// ============================================================================
// Iframe Data Types
// ============================================================================

/**
 * Trading statistics from iframe
 */
export interface TradingStats {
  /** Total bought in SOL */
  bought: number;
  /** Total sold in SOL */
  sold: number;
  /** Net profit/loss */
  net: number;
  /** Number of trades */
  trades: number;
  /** Unix timestamp */
  timestamp: number;
}

/**
 * Wallet information from iframe
 */
export interface IframeWallet {
  /** Wallet address */
  address: string;
  /** Optional label */
  label?: string;
  /** SOL balance */
  balance?: number;
  /** Private key (if available) */
  privateKey?: string;
}

/**
 * Recent trade from iframe
 */
export interface IframeRecentTrade {
  /** Trade type */
  type: 'buy' | 'sell';
  /** Wallet address */
  address: string;
  /** Amount of tokens */
  tokensAmount: number;
  /** Average price */
  avgPrice: number;
  /** SOL amount */
  solAmount: number;
  /** Unix timestamp */
  timestamp: number;
  /** Transaction signature */
  signature: string;
}

/**
 * Token price from iframe
 */
export interface IframeTokenPrice {
  /** Token price in SOL */
  tokenPrice: number;
  /** Token mint address */
  tokenMint: string;
  /** Unix timestamp */
  timestamp: number;
  /** Trade type that caused update */
  tradeType: 'buy' | 'sell';
  /** Trade volume */
  volume: number;
}

/**
 * Complete iframe data structure
 */
export interface IframeData {
  /** Trading statistics */
  tradingStats: TradingStats | null;
  /** Current SOL price */
  solPrice: number | null;
  /** Current wallets */
  currentWallets: IframeWallet[];
  /** Recent trades */
  recentTrades: IframeRecentTrade[];
  /** Token price */
  tokenPrice: IframeTokenPrice | null;
  /** Market cap */
  marketCap: number | null;
}

// ============================================================================
// Iframe State Types
// ============================================================================

/**
 * View state for caching
 */
export interface ViewState {
  /** Trading statistics */
  tradingStats: TradingStats | null;
  /** Current SOL price */
  solPrice: number | null;
  /** Current wallets */
  currentWallets: IframeWallet[];
  /** Recent trades */
  recentTrades: IframeRecentTrade[];
  /** Token price */
  tokenPrice: IframeTokenPrice | null;
  /** Market cap */
  marketCap: number | null;
  /** Cache timestamp */
  timestamp: number;
}

/**
 * Iframe state context type
 */
export interface IframeStateContextType {
  /** Get cached view state */
  getViewState: (view: ViewType, tokenMint?: string) => ViewState | null;
  /** Set view state */
  setViewState: (view: ViewType, state: Partial<ViewState>, tokenMint?: string) => void;
  /** Clear view state */
  clearViewState: (view: ViewType, tokenMint?: string) => void;
  /** Clear all cached states */
  clearAllStates: () => void;
}

// ============================================================================
// Iframe Manager Types
// ============================================================================

/**
 * Queued message for iframe manager
 */
export interface QueuedMessage {
  /** Message to send */
  message: IframeMessage;
  /** Queue timestamp */
  timestamp: number;
}

/**
 * Iframe manager state
 */
export interface IframeManagerState {
  /** Whether iframe is ready */
  isReady: boolean;
  /** Queued messages */
  messageQueue: QueuedMessage[];
  /** Last navigate message sent */
  lastNavigateMessage: NavigateMessage | null;
  /** Last wallet message sent */
  lastWalletMessage: WalletMessage | null;
}

// ============================================================================
// Frame Props Types
// ============================================================================

/**
 * Props for the Frame component
 */
export interface FrameProps {
  /** Whether chart is loading */
  isLoadingChart: boolean;
  /** Current token address */
  tokenAddress: string;
  /** List of wallets */
  wallets: Array<{
    address: string;
    label?: string;
    privateKey?: string;
  }>;
  /** Callback when iframe data updates */
  onDataUpdate?: (data: IframeData) => void;
  /** Callback when token is selected */
  onTokenSelect?: (tokenAddress: string) => void;
  /** Callback when non-whitelisted trade occurs */
  onNonWhitelistedTrade?: (trade: NonWhitelistedTradeResponse['data']) => void;
  /** Whether quick buy is enabled */
  quickBuyEnabled?: boolean;
  /** Quick buy amount */
  quickBuyAmount?: number;
  /** Quick buy minimum amount */
  quickBuyMinAmount?: number;
  /** Quick buy maximum amount */
  quickBuyMaxAmount?: number;
  /** Whether to use quick buy range */
  useQuickBuyRange?: boolean;
}
