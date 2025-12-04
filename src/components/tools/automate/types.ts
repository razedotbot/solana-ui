/**
 * Unified Trading Tools Type Definitions
 * 
 * Consolidated types for Sniper Bot, Copy Trade, and Automate features
 */

// ============================================================================
// Tool Types
// ============================================================================

export type ToolType = 'sniper' | 'copytrade' | 'automate';

// ============================================================================
// Common Types
// ============================================================================

export type PriorityLevel = 'low' | 'medium' | 'high' | 'turbo';
export type CooldownUnit = 'milliseconds' | 'seconds' | 'minutes';
export type OperatorType = 'greater' | 'less' | 'equal' | 'greaterEqual' | 'lessEqual';
export type FilterMatchType = 'exact' | 'contains' | 'regex';

// ============================================================================
// Wallet Types
// ============================================================================

export interface WalletList {
  id: string;
  name: string;
  addresses: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SelectedWallet {
  privateKey: string;
  address: string;
  displayName: string;
}

export interface WalletType {
  address: string;
  privateKey?: string;
  name?: string;
  balance?: number;
}

// ============================================================================
// Sniper Bot Types
// ============================================================================

export type SniperEventType = 'deploy' | 'migration' | 'both';
export type BuyAmountType = 'fixed' | 'percentage';

export interface DeployEventData {
  platform: string;
  mint: string;
  signer: string;
  name: string;
  symbol: string;
  uri: string;
  slot: number;
  creator_buy_sol?: number;
  creator_buy_tokens?: number;
  creator_buy_price?: number;
}

export interface MigrationEventData {
  mint: string;
  platform: string;
  slot: number;
}

export interface DeployEvent {
  type: 'deploy';
  timestamp: number;
  data: DeployEventData;
}

export interface MigrationEvent {
  type: 'migration';
  timestamp: number;
  data: MigrationEventData;
}

export type SniperEvent = DeployEvent | MigrationEvent;

export interface SniperFilter {
  id: string;
  enabled: boolean;
  platform?: string;
  mint?: string;
  signer?: string;
  namePattern?: string;
  nameMatchType?: FilterMatchType;
  symbolPattern?: string;
  symbolMatchType?: FilterMatchType;
}

export interface SniperProfile {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  eventType: SniperEventType;
  filters: SniperFilter[];
  buyAmountType: BuyAmountType;
  buyAmount: number;
  slippage: number;
  priority: PriorityLevel;
  cooldown: number;
  cooldownUnit: CooldownUnit;
  maxExecutions?: number;
  executionCount: number;
  lastExecuted?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SniperExecutionLog {
  id: string;
  profileId: string;
  profileName: string;
  triggerEvent: SniperEvent;
  executedAction: {
    mint: string;
    solAmount: number;
    walletAddress: string;
    txSignature?: string;
  };
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface SniperBotStorage {
  profiles: SniperProfile[];
  executionLogs: SniperExecutionLog[];
}

export interface SniperBotWebSocketConfig {
  apiKey?: string;
  onDeploy: (event: DeployEvent) => void;
  onMigration: (event: MigrationEvent) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// ============================================================================
// Copy Trade Types
// ============================================================================

export type CopyTradeMode = 'simple' | 'advanced';
export type TokenFilterMode = 'all' | 'specific';

export interface CopyTradeCondition {
  id: string;
  type: 'tradeSize' | 'marketCap' | 'tokenAge' | 'tradeType' | 'signerBalance';
  operator: OperatorType;
  value: number;
  tradeType?: 'buy' | 'sell';
}

export interface CopyTradeAction {
  id: string;
  type: 'buy' | 'sell' | 'mirror';
  amountType: 'multiplier' | 'fixed' | 'percentage';
  amount: number;
  slippage: number;
  priority: PriorityLevel;
}

export interface SimpleModeCopyConfig {
  amountMultiplier: number;
  slippage: number;
  priority: PriorityLevel;
  mirrorTradeType: boolean;
}

export interface CopyTradeProfile {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  mode: CopyTradeMode;
  simpleConfig?: SimpleModeCopyConfig;
  conditions: CopyTradeCondition[];
  conditionLogic: 'and' | 'or';
  actions: CopyTradeAction[];
  walletListId: string | null;
  walletAddresses: string[];
  tokenFilterMode: TokenFilterMode;
  specificTokens: string[];
  blacklistedTokens: string[];
  cooldown: number;
  cooldownUnit: CooldownUnit;
  maxExecutions?: number;
  executionCount: number;
  lastExecuted?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CopyTradeData {
  type: 'buy' | 'sell';
  signerAddress: string;
  tokenMint: string;
  tokenAmount: number;
  solAmount: number;
  avgPrice: number;
  marketCap: number;
  timestamp: number;
  signature: string;
}

export interface CopyTradeExecutionLog {
  id: string;
  profileId: string;
  profileName: string;
  originalTrade: CopyTradeData;
  executedAction: {
    type: 'buy' | 'sell';
    amount: number;
    walletAddress: string;
  };
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface CopyTradeProfileStorage {
  profiles: CopyTradeProfile[];
  executionLogs: CopyTradeExecutionLog[];
}

// ============================================================================
// Automate (Strategy) Types
// ============================================================================

export interface TradingCondition {
  id: string;
  type: 'marketCap' | 'buyVolume' | 'sellVolume' | 'netVolume' | 'lastTradeAmount' | 'lastTradeType' | 'whitelistActivity';
  operator: OperatorType;
  value: number;
  timeframe?: number;
  whitelistAddress?: string;
  whitelistActivityType?: 'buyVolume' | 'sellVolume' | 'netVolume' | 'lastTradeAmount' | 'lastTradeType';
}

export interface TradingAction {
  id: string;
  type: 'buy' | 'sell';
  amountType: 'percentage' | 'sol' | 'lastTrade' | 'volume' | 'whitelistVolume';
  amount: number;
  volumeType?: 'buyVolume' | 'sellVolume' | 'netVolume';
  volumeMultiplier?: number;
  whitelistAddress?: string;
  whitelistActivityType?: 'buyVolume' | 'sellVolume' | 'netVolume';
  slippage: number;
  priority: PriorityLevel;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  conditions: TradingCondition[];
  conditionLogic: 'and' | 'or';
  actions: TradingAction[];
  isActive: boolean;
  cooldown: number;
  cooldownUnit: CooldownUnit;
  maxExecutions?: number;
  executionCount: number;
  lastExecuted?: number;
  createdAt: number;
  updatedAt: number;
  whitelistedAddresses: string[];
  tokenAddresses: string[];
  walletAddresses: string[];
}

export interface AutomateTrade {
  signature: string;
  type: 'buy' | 'sell';
  address: string;
  tokenAmount: number;
  solAmount: number;
  timestamp: number;
}

export interface MarketData {
  marketCap: number;
  buyVolume: number;
  sellVolume: number;
  netVolume: number;
  lastTrade: AutomateTrade | null;
  tokenPrice: number;
  priceChange24h?: number;
}

export interface TokenMonitor {
  tokenAddress: string;
  marketData: MarketData;
  activeStrategyIds: string[];
  trades: AutomateTrade[];
  wsConnected: boolean;
  addedAt: number;
}

export interface ActiveStrategyInstance {
  strategyId: string;
  tokenAddress: string;
  executionCount: number;
  lastExecuted?: number;
  isActive: boolean;
}

// ============================================================================
// Unified Profile Type (for combined management)
// ============================================================================

export type UnifiedProfile = 
  | { type: 'sniper'; profile: SniperProfile }
  | { type: 'copytrade'; profile: CopyTradeProfile }
  | { type: 'automate'; profile: TradingStrategy };

// ============================================================================
// UI State Types
// ============================================================================

export interface ToolsUIState {
  activeTab: ToolType;
  isCreating: boolean;
  isEditing: string | null;
  selectedProfileId: string | null;
  searchTerm: string;
  filterActive: boolean | null;
}

export interface RecentSniperEvent {
  id: string;
  event: SniperEvent;
  matchedProfiles: string[];
  sniped: boolean;
  timestamp: number;
}
