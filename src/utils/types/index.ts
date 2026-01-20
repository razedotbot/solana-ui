/**
 * Central Type Exports
 *
 * This module re-exports all types from the type system.
 * Import types from this file for convenience.
 *
 * @example
 * import type { WalletType, BuyConfig, TradingStrategy } from '@/utils/types';
 * // or
 * import type { WalletType } from '../utils/types';
 */

// ============================================================================
// API Types
// ============================================================================

export type {
  ApiResponse,
  BundleResult,
  ServerInfo,
  WindowWithToast,
} from "./api";

// ============================================================================
// Wallet Types
// ============================================================================

export type {
  WalletCategory,
  WalletSource,
  MasterWallet,
  CustomQuickTradeSettings,
  QuickBuyPreferences,
  WalletType,
  ConfigType,
  RecentToken,
  CategoryQuickTradeSettings,
  WalletBalance,
  WalletAmount,
  WalletImportResult,
  WalletExportData,
  WalletSelectionState,
  WalletSortDirection,
  WalletSortField,
  WalletFilterOptions,
} from "./wallet";

// ============================================================================
// Trading Types
// ============================================================================

export type {
  BundleMode,
  WalletBuy,
  WalletSell,
  BuyConfig,
  SellConfig,
  ServerResponse,
  BuyBundle,
  SellBundle,
  BuyResult,
  SellResult,
  TradeHistoryEntry,
  AddTradeHistoryInput,
  ValidationResult,
  TradingState,
  TradingFormValues,
  TokenPrice,
  TokenMarketData,
  QuickTradeParams,
  QuickTradeResult,
} from "./trading";

// ============================================================================
// WebSocket Types
// ============================================================================

export type {
  WebSocketWelcomeMessage,
  WebSocketConnectionMessage,
  WebSocketSubscriptionMessage,
  WebSocketTradeMessage,
  WebSocketErrorMessage,
  WebSocketMessage,
  TradeTransactionData,
  AutomateTrade,
  AutomateWebSocketConfig,
  MultiTokenWebSocketConfig,
  CopyTradeData as WebSocketCopyTradeData,
  CopyTradeWebSocketConfig,
  WebSocketConnectionState,
  WebSocketStatus,
  TokenSubscriptionRequest,
  SignerSubscriptionRequest,
  WebSocketSubscriptionRequest,
  WebSocketEventHandlers,
  WebSocketConstants,
  WebSocketPriceInfo,
  WebSocketAuthConfig,
} from "./websocket";

// ============================================================================
// Automation Types (Unified - Sniper, CopyTrade, Automate)
// ============================================================================

export type {
  // Tool Types
  ToolType,

  // Common Types
  PriorityLevel,
  ActionPriority,
  CooldownUnit,
  OperatorType,
  ConditionOperator,
  FilterMatchType,
  ConditionLogic,

  // Wallet Types (Automation)
  WalletList,
  SelectedWallet,
  AutomationWalletType,

  // Sniper Bot Types
  SniperEventType,
  BuyAmountType,
  DeployEventData,
  MigrationEventData,
  DeployEvent,
  MigrationEvent,
  SniperEvent,
  SniperFilter,
  SniperProfile,
  SniperExecutionLog,
  SniperBotStorage,
  SniperBotWebSocketConfig,

  // Copy Trade Types
  CopyTradeMode,
  TokenFilterMode,
  CopyTradeConditionType,
  CopyTradeAmountType,
  CopyTradeCondition,
  CopyTradeAction,
  SimpleModeCopyConfig,
  CopyTradeProfile,
  CopyTradeData,
  CopyTradeExecutionLog,
  CopyTradeProfileStorage,

  // Automate (Strategy) Types
  TradingConditionType,
  ActionAmountType,
  VolumeType,
  TradingCondition,
  TradingAction,
  TradingStrategy,
  AutomateTrade as AutomationTrade,
  MarketData,
  TokenMonitor,
  ActiveStrategyInstance,
  StrategyExecutionLog,
  TradingStrategyStorage,

  // Whitelist Types
  WhitelistEntry,
  WhitelistConfig,

  // Unified Types
  UnifiedProfile,
  ToolsUIState,
  RecentSniperEvent,
} from "./automation";

// ============================================================================
// Component Types
// ============================================================================

export type {
  ToastType,
  Toast,
  PresetTab,
  FundingMode,
  FundModalProps,
  TransferModalProps,
  MixerModalProps,
  ConsolidateModalProps,
  DistributeModalProps,
  DepositModalProps,
  CreateWalletModalProps,
  ImportWalletModalProps,
  CreateMasterWalletModalProps,
  ExportSeedPhraseModalProps,
  BurnModalProps,
  QuickTradeModalProps,
  WalletQuickTradeModalProps,
  CalculatePNLModalProps,
  MobilePage,
  MobileLayoutProps,
  WalletsPageProps,
  DeployPageProps,
  SettingsPageProps,
  WalletAmount as ComponentWalletAmount,
  TransferStatus,
  TransferQueueItem,
} from "./components";

// ============================================================================
// Iframe Types
// ============================================================================

export type {
  ViewType,
  NavigateMessage,
  AddWalletsMessage,
  ClearWalletsMessage,
  GetWalletsMessage,
  WalletMessage,
  ToggleNonWhitelistedTradesMessage,
  SetQuickBuyConfigMessage,
  QuickBuyActivateMessage,
  QuickBuyDeactivateMessage,
  IframeMessage,
  IframeReadyResponse,
  WalletsAddedResponse,
  WalletsClearedResponse,
  CurrentWalletsResponse,
  WhitelistTradingStatsResponse,
  SolPriceUpdateResponse,
  WhitelistTradeResponse,
  TokenPriceUpdateResponse,
  TokenSelectedResponse,
  NonWhitelistedTradeResponse,
  HoldingsOpenedResponse,
  TokenClearedResponse,
  NavigationCompleteResponse,
  IframeResponse,
  TradingStats,
  IframeWallet,
  IframeRecentTrade,
  IframeTokenPrice,
  IframeData,
  ViewState,
  IframeStateContextType,
  QueuedMessage,
  FrameProps,
} from "./iframe";
