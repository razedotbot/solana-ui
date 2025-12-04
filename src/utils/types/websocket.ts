/**
 * WebSocket Type Definitions
 * 
 * This module contains all WebSocket and real-time communication
 * type definitions for the Solana trading application, including
 * message types, trade data, and connection configurations.
 */

// ============================================================================
// WebSocket Message Types
// ============================================================================

/**
 * Welcome message received upon WebSocket connection
 */
export interface WebSocketWelcomeMessage {
  /** Message type identifier */
  type: 'welcome';
  /** Optional welcome message text */
  message?: string;
}

/**
 * Connection confirmation message with client ID
 */
export interface WebSocketConnectionMessage {
  /** Message type identifier */
  type: 'connection';
  /** Unique client identifier assigned by server */
  clientId?: string;
}

/**
 * Subscription confirmation message
 */
export interface WebSocketSubscriptionMessage {
  /** Message type identifier */
  type: 'subscription_confirmed' | 'event_subscription_confirmed';
  /** List of subscribed signer addresses */
  signers?: string[];
}

/**
 * Trade/transaction message from WebSocket
 */
export interface WebSocketTradeMessage {
  /** Message type identifier */
  type: 'trade' | 'transaction';
  /** Transaction data object */
  transaction?: TradeTransactionData;
  /** Alternative data field for transaction */
  data?: TradeTransactionData;
  /** Price information */
  priceInfo?: {
    /** Current SOL price in USD */
    solPrice?: number;
  };
  /** Unix timestamp of the trade */
  timestamp?: number;
  /** Transaction signature */
  signature?: string;
  /** Token mint address */
  tokenMint?: string;
  /** Alternative mint field */
  mint?: string;
}

/**
 * Error message from WebSocket
 */
export interface WebSocketErrorMessage {
  /** Message type identifier */
  type: 'error';
  /** Error message text */
  message?: string;
  /** Alternative error field */
  error?: string;
}

/**
 * Union type of all WebSocket message types
 */
export type WebSocketMessage = 
  | WebSocketWelcomeMessage 
  | WebSocketConnectionMessage 
  | WebSocketSubscriptionMessage 
  | WebSocketTradeMessage 
  | WebSocketErrorMessage;

// ============================================================================
// Trade Transaction Data Types
// ============================================================================

/**
 * Raw trade transaction data from WebSocket
 * Contains all possible fields from different message formats
 */
export interface TradeTransactionData {
  /** Token mint address */
  tokenMint?: string;
  /** Alternative mint field */
  mint?: string;
  /** Transaction type (buy/sell) */
  type?: string;
  /** Alternative transaction type field */
  transactionType?: string;
  /** Alternative trade type field */
  tradeType?: string;
  /** Amount of tokens traded */
  tokenAmount?: string | number;
  /** Alternative tokens amount field */
  tokensAmount?: string | number;
  /** Amount of SOL traded */
  solAmount?: string | number;
  /** Average price per token */
  avgPrice?: string | number;
  /** Average price in USD */
  avgPriceUsd?: string | number;
  /** Transaction signature */
  signature?: string;
  /** Signer/trader address */
  signer?: string;
  /** Alternative trader field */
  trader?: string;
  /** Unix timestamp */
  timestamp?: number;
  /** Market cap at time of trade */
  marketCap?: number;
}

// ============================================================================
// Automate WebSocket Types
// ============================================================================

/**
 * Processed trade data for automate feature
 * Normalized from raw WebSocket data
 */
export interface AutomateTrade {
  /** Trade type (buy or sell) */
  type: 'buy' | 'sell';
  /** Trader wallet address */
  address: string;
  /** Amount of tokens traded */
  tokensAmount: number;
  /** Average price per token */
  avgPrice: number;
  /** Amount of SOL traded */
  solAmount: number;
  /** Unix timestamp of the trade */
  timestamp: number;
  /** Transaction signature */
  signature: string;
  /** Token mint address */
  tokenMint: string;
  /** Market cap at time of trade */
  marketCap: number;
  /** Wallet address (same as address) */
  walletAddress?: string;
}

/**
 * Configuration for Automate WebSocket connection
 */
export interface AutomateWebSocketConfig {
  /** Token mint address to subscribe to */
  tokenMint: string;
  /** Current SOL price in USD */
  solPrice: number;
  /** Total token supply */
  tokenSupply: number;
  /** API key for authentication */
  apiKey?: string;
  /** Callback when a trade is received */
  onTrade: (trade: AutomateTrade) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Callback when connection is established */
  onConnect?: () => void;
  /** Callback when connection is lost */
  onDisconnect?: () => void;
}

/**
 * Configuration for Multi-Token WebSocket connection
 * Supports subscribing to multiple tokens simultaneously
 */
export interface MultiTokenWebSocketConfig {
  /** API key for authentication */
  apiKey?: string;
  /** Current SOL price in USD */
  solPrice: number;
  /** Default token supply (can be overridden per-token) */
  defaultTokenSupply: number;
  /** Callback when a trade is received for any subscribed token */
  onTrade: (trade: AutomateTrade, tokenAddress: string) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Callback when connection is established */
  onConnect?: () => void;
  /** Callback when connection is lost */
  onDisconnect?: () => void;
  /** Callback when a token subscription is confirmed */
  onTokenSubscribed?: (tokenAddress: string) => void;
  /** Callback when a token is unsubscribed */
  onTokenUnsubscribed?: (tokenAddress: string) => void;
}

// ============================================================================
// CopyTrade WebSocket Types
// ============================================================================

/**
 * Trade data for copy trading feature
 */
export interface CopyTradeData {
  /** Trade type (buy or sell) */
  type: 'buy' | 'sell';
  /** Address of the trader being copied */
  signerAddress: string;
  /** Token mint address */
  tokenMint: string;
  /** Amount of tokens traded */
  tokenAmount: number;
  /** Amount of SOL traded */
  solAmount: number;
  /** Average price per token */
  avgPrice: number;
  /** Market cap at time of trade */
  marketCap: number;
  /** Unix timestamp of the trade */
  timestamp: number;
  /** Transaction signature */
  signature: string;
}

/**
 * Configuration for CopyTrade WebSocket connection
 */
export interface CopyTradeWebSocketConfig {
  /** List of signer addresses to monitor */
  signers: string[];
  /** API key for authentication */
  apiKey?: string;
  /** Callback when a trade is received */
  onTrade: (trade: CopyTradeData) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Callback when connection is established */
  onConnect?: () => void;
  /** Callback when connection is lost */
  onDisconnect?: () => void;
}

// ============================================================================
// WebSocket Connection State Types
// ============================================================================

/**
 * WebSocket connection state
 */
export type WebSocketConnectionState = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

/**
 * WebSocket connection status information
 */
export interface WebSocketStatus {
  /** Current connection state */
  state: WebSocketConnectionState;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Maximum reconnection attempts allowed */
  maxReconnectAttempts: number;
  /** Last error message if any */
  lastError?: string;
  /** Whether connection was manually closed */
  isManualClose: boolean;
}

// ============================================================================
// WebSocket Subscription Types
// ============================================================================

/**
 * Token subscription request
 */
export interface TokenSubscriptionRequest {
  /** Action type */
  action: 'subscribe' | 'unsubscribe';
  /** Token mint address */
  tokenMint: string;
}

/**
 * Signer subscription request
 */
export interface SignerSubscriptionRequest {
  /** Action type */
  action: 'subscribe' | 'unsubscribe';
  /** List of signer addresses */
  signers: string[];
}

/**
 * Union type of subscription requests
 */
export type WebSocketSubscriptionRequest = 
  | TokenSubscriptionRequest 
  | SignerSubscriptionRequest;

// ============================================================================
// WebSocket Event Types
// ============================================================================

/**
 * WebSocket event handler types
 */
export interface WebSocketEventHandlers {
  /** Handler for trade events */
  onTrade?: (trade: AutomateTrade | CopyTradeData) => void;
  /** Handler for error events */
  onError?: (error: Error) => void;
  /** Handler for connection events */
  onConnect?: () => void;
  /** Handler for disconnection events */
  onDisconnect?: () => void;
  /** Handler for subscription confirmation */
  onSubscriptionConfirmed?: (signers?: string[]) => void;
}

// ============================================================================
// WebSocket Constants Types
// ============================================================================

/**
 * WebSocket configuration constants
 */
export interface WebSocketConstants {
  /** WebSocket server URL */
  WS_URL: string;
  /** Delay between reconnection attempts (ms) */
  RECONNECT_DELAY: number;
  /** Maximum number of reconnection attempts */
  MAX_RECONNECT_ATTEMPTS: number;
}

// ============================================================================
// Price Info Types
// ============================================================================

/**
 * Price information from WebSocket
 */
export interface WebSocketPriceInfo {
  /** Current SOL price in USD */
  solPrice?: number;
  /** Token price in SOL */
  tokenPriceInSol?: number;
  /** Token price in USD */
  tokenPriceInUsd?: number;
  /** Unix timestamp of price update */
  timestamp?: number;
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * WebSocket authentication configuration
 */
export interface WebSocketAuthConfig {
  /** API key for authentication */
  apiKey: string;
  /** Whether to include key in URL query params */
  useQueryParam?: boolean;
}

/**
 * Authentication error codes
 */
export type WebSocketAuthErrorCode = 1003 | 1008;

/**
 * Authentication error information
 */
export interface WebSocketAuthError {
  /** Error code */
  code: WebSocketAuthErrorCode;
  /** Error reason/message */
  reason: string;
  /** Whether this is an authentication error */
  isAuthError: boolean;
}
