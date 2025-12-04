/**
 * Automation Type Definitions
 * 
 * This module contains all automation-related type definitions
 * for the Solana trading application, including trading strategies,
 * copy trading profiles, conditions, and actions.
 */

// ============================================================================
// Trading Strategy Condition Types
// ============================================================================

/**
 * Types of conditions that can trigger a trading strategy
 */
export type TradingConditionType = 
  | 'marketCap' 
  | 'buyVolume' 
  | 'sellVolume' 
  | 'netVolume' 
  | 'lastTradeType' 
  | 'lastTradeAmount' 
  | 'priceChange' 
  | 'whitelistActivity';

/**
 * Comparison operators for conditions
 */
export type ConditionOperator = 
  | 'greater' 
  | 'less' 
  | 'equal' 
  | 'greaterEqual' 
  | 'lessEqual';

/**
 * Trading condition for strategy execution
 * Defines when a strategy should be triggered
 */
export interface TradingCondition {
  /** Unique identifier for the condition */
  id: string;
  /** Type of condition to evaluate */
  type: TradingConditionType;
  /** Comparison operator */
  operator: ConditionOperator;
  /** Value to compare against */
  value: number;
  /** Timeframe in minutes for volume-based conditions */
  timeframe?: number;
  /** Specific address to monitor for whitelist conditions */
  whitelistAddress?: string;
  /** Type of activity to monitor for whitelist address */
  whitelistActivityType?: 'buyVolume' | 'sellVolume' | 'netVolume' | 'lastTradeAmount' | 'lastTradeType';
}

// ============================================================================
// Trading Strategy Action Types
// ============================================================================

/**
 * Types of amounts for trading actions
 */
export type ActionAmountType = 
  | 'sol' 
  | 'percentage' 
  | 'lastTrade' 
  | 'volume' 
  | 'whitelistVolume';

/**
 * Volume types for volume-based amounts
 */
export type VolumeType = 'buyVolume' | 'sellVolume' | 'netVolume';

/**
 * Priority levels for trading actions
 */
export type ActionPriority = 'low' | 'medium' | 'high';

/**
 * Trading action to execute when conditions are met
 */
export interface TradingAction {
  /** Unique identifier for the action */
  id: string;
  /** Type of trade to execute */
  type: 'buy' | 'sell';
  /** Amount to trade */
  amount: number;
  /** How to interpret the amount */
  amountType: ActionAmountType;
  /** Which volume to use when amountType is 'volume' */
  volumeType?: VolumeType;
  /** Multiplier for volume-based amounts (e.g., 0.1 = 10% of volume) */
  volumeMultiplier?: number;
  /** Slippage tolerance percentage */
  slippage: number;
  /** Transaction priority */
  priority: ActionPriority;
  /** Specific address whose activity triggered this action */
  whitelistAddress?: string;
  /** Type of whitelist activity */
  whitelistActivityType?: 'buyVolume' | 'sellVolume' | 'netVolume';
}

// ============================================================================
// Trading Strategy Types
// ============================================================================

/**
 * Logic for combining multiple conditions
 */
export type ConditionLogic = 'and' | 'or';

/**
 * Time unit for cooldown periods
 */
export type CooldownUnit = 'milliseconds' | 'seconds' | 'minutes';

/**
 * Complete trading strategy configuration
 */
export interface TradingStrategy {
  /** Unique identifier for the strategy */
  id: string;
  /** User-friendly name */
  name: string;
  /** Description of what the strategy does */
  description: string;
  /** Whether the strategy is currently active */
  isActive: boolean;
  /** Conditions that must be met to trigger the strategy */
  conditions: TradingCondition[];
  /** How to combine multiple conditions */
  conditionLogic: ConditionLogic;
  /** Actions to execute when conditions are met */
  actions: TradingAction[];
  /** Cooldown value between executions */
  cooldown: number;
  /** Unit for cooldown value */
  cooldownUnit: CooldownUnit;
  /** Maximum times this strategy can execute */
  maxExecutions?: number;
  /** Number of times the strategy has executed */
  executionCount: number;
  /** Unix timestamp of last execution */
  lastExecuted?: number;
  /** Unix timestamp when strategy was created */
  createdAt: number;
  /** Unix timestamp when strategy was last updated */
  updatedAt: number;
  /** Addresses to monitor for whitelist-based strategies */
  whitelistedAddresses?: string[];
  /** Token addresses to monitor (if empty, uses current token) */
  tokenAddresses?: string[];
  /** Wallet addresses to use for this strategy's trade executions */
  walletAddresses: string[];
}

// ============================================================================
// CopyTrade Types
// ============================================================================

/**
 * Wallet list for storing addresses to monitor
 */
export interface WalletList {
  /** Unique identifier for the list */
  id: string;
  /** User-friendly name */
  name: string;
  /** List of wallet addresses */
  addresses: string[];
  /** Unix timestamp when list was created */
  createdAt: number;
  /** Unix timestamp when list was last updated */
  updatedAt: number;
}

/**
 * Copytrade profile mode
 * - 'simple': Basic copy trading with multiplier
 * - 'advanced': Full condition/action configuration
 */
export type CopyTradeMode = 'simple' | 'advanced';

/**
 * Token filter mode for copy trading
 * - 'all': Copy trades for all tokens
 * - 'specific': Only copy trades for specific tokens
 */
export type TokenFilterMode = 'all' | 'specific';

// ============================================================================
// CopyTrade Condition Types
// ============================================================================

/**
 * Types of conditions for copy trading
 */
export type CopyTradeConditionType = 
  | 'tradeSize' 
  | 'marketCap' 
  | 'tokenAge' 
  | 'tradeType' 
  | 'signerBalance';

/**
 * Condition for copy trade execution
 */
export interface CopyTradeCondition {
  /** Unique identifier for the condition */
  id: string;
  /** Type of condition to evaluate */
  type: CopyTradeConditionType;
  /** Comparison operator */
  operator: ConditionOperator;
  /** Value to compare against */
  value: number;
  /** Trade type for tradeType condition */
  tradeType?: 'buy' | 'sell';
}

// ============================================================================
// CopyTrade Action Types
// ============================================================================

/**
 * Types of amounts for copy trade actions
 */
export type CopyTradeAmountType = 'multiplier' | 'fixed' | 'percentage';

/**
 * Action for copy trade execution
 */
export interface CopyTradeAction {
  /** Unique identifier for the action */
  id: string;
  /** Type of trade to execute (mirror = copy exact action type) */
  type: 'buy' | 'sell' | 'mirror';
  /** How to interpret the amount */
  amountType: CopyTradeAmountType;
  /** Amount value (multiplier, fixed SOL, or percentage) */
  amount: number;
  /** Slippage tolerance percentage */
  slippage: number;
  /** Transaction priority */
  priority: ActionPriority;
}

// ============================================================================
// Simple Mode Configuration
// ============================================================================

/**
 * Configuration for simple copy trading mode
 */
export interface SimpleModeCopyConfig {
  /** Multiplier for trade size (e.g., 0.5 = copy 50% of their trade) */
  amountMultiplier: number;
  /** Slippage tolerance percentage */
  slippage: number;
  /** Transaction priority */
  priority: ActionPriority;
  /** Whether to mirror trade type (buy when they buy, sell when they sell) */
  mirrorTradeType: boolean;
}

// ============================================================================
// CopyTrade Profile Types
// ============================================================================

/**
 * Complete copy trade profile configuration
 */
export interface CopyTradeProfile {
  /** Unique identifier for the profile */
  id: string;
  /** User-friendly name */
  name: string;
  /** Description of what the profile does */
  description: string;
  /** Whether the profile is currently active */
  isActive: boolean;
  
  // Mode configuration
  /** Profile mode (simple or advanced) */
  mode: CopyTradeMode;
  /** Configuration for simple mode */
  simpleConfig?: SimpleModeCopyConfig;
  
  // Advanced mode - conditions and actions
  /** Conditions for advanced mode */
  conditions: CopyTradeCondition[];
  /** How to combine multiple conditions */
  conditionLogic: ConditionLogic;
  /** Actions for advanced mode */
  actions: CopyTradeAction[];
  
  // Wallet list to monitor
  /** ID of the wallet list to monitor */
  walletListId: string | null;
  /** Resolved addresses from the list or manually added */
  walletAddresses: string[];
  
  // Token filtering
  /** Token filter mode */
  tokenFilterMode: TokenFilterMode;
  /** Tokens to monitor (when mode is 'specific') */
  specificTokens: string[];
  /** Tokens to never copy */
  blacklistedTokens: string[];
  
  // Execution settings
  /** Cooldown value between executions */
  cooldown: number;
  /** Unit for cooldown value */
  cooldownUnit: CooldownUnit;
  /** Maximum times this profile can execute */
  maxExecutions?: number;
  /** Number of times the profile has executed */
  executionCount: number;
  /** Unix timestamp of last execution */
  lastExecuted?: number;
  
  // Metadata
  /** Unix timestamp when profile was created */
  createdAt: number;
  /** Unix timestamp when profile was last updated */
  updatedAt: number;
}

// ============================================================================
// CopyTrade Data Types
// ============================================================================

/**
 * Trade data received from WebSocket for copy trading
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

// ============================================================================
// Execution Log Types
// ============================================================================

/**
 * Execution log entry for copy trades
 */
export interface CopyTradeExecutionLog {
  /** Unique identifier for the log entry */
  id: string;
  /** ID of the profile that executed */
  profileId: string;
  /** Name of the profile that executed */
  profileName: string;
  /** Original trade that triggered execution */
  originalTrade: CopyTradeData;
  /** Action that was executed */
  executedAction: {
    /** Type of trade executed */
    type: 'buy' | 'sell';
    /** Amount traded */
    amount: number;
    /** Wallet address used */
    walletAddress: string;
  };
  /** Whether execution was successful */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
  /** Unix timestamp of execution */
  timestamp: number;
}

/**
 * Execution log entry for trading strategies
 */
export interface StrategyExecutionLog {
  /** Unique identifier for the log entry */
  id: string;
  /** ID of the strategy that executed */
  strategyId: string;
  /** Name of the strategy that executed */
  strategyName: string;
  /** Conditions that were met */
  triggeredConditions: TradingCondition[];
  /** Actions that were executed */
  executedActions: TradingAction[];
  /** Whether execution was successful */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
  /** Unix timestamp of execution */
  timestamp: number;
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Profile storage format for cookies/localStorage
 */
export interface CopyTradeProfileStorage {
  /** Stored profiles */
  profiles: CopyTradeProfile[];
  /** Execution logs */
  executionLogs: CopyTradeExecutionLog[];
}

/**
 * Strategy storage format for cookies/localStorage
 */
export interface TradingStrategyStorage {
  /** Stored strategies */
  strategies: TradingStrategy[];
  /** Execution logs */
  executionLogs: StrategyExecutionLog[];
}

// ============================================================================
// Whitelist Types
// ============================================================================

/**
 * Whitelist entry for monitoring specific addresses
 */
export interface WhitelistEntry {
  /** Wallet address */
  address: string;
  /** Optional label for the address */
  label?: string;
  /** Unix timestamp when added */
  addedAt: number;
}

/**
 * Whitelist configuration
 */
export interface WhitelistConfig {
  /** Unique identifier */
  id: string;
  /** User-friendly name */
  name: string;
  /** List of whitelisted entries */
  entries: WhitelistEntry[];
  /** Unix timestamp when created */
  createdAt: number;
  /** Unix timestamp when last updated */
  updatedAt: number;
}
