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

// --- API types (inlined from api.ts) ---

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  result?: T;
}

export interface SenderResult {
  rpc?: string;
  jito?: string;
}

export interface ServerInfo {
  id: string;
  name: string;
  url: string;
  region: string;
  flag: string;
  ping?: number;
}

export interface WindowWithToast extends Window {
  showToast?: (message: string, type: "success" | "error") => void;
}

// --- Multichart types (inlined from multichart.ts) ---

export interface MultichartToken {
  address: string;
  addedAt: number;
  label?: string;
  symbol?: string;
  imageUrl?: string;
}

export interface MultichartState {
  tokens: MultichartToken[];
  activeTokenIndex: number;
}

export interface MultichartTokenStats {
  address: string;
  price: number | null;
  marketCap: number | null;
  pnl: { bought: number; sold: number; net: number; trades: number } | null;
}

// --- Token metadata types (inlined from tokenMetadata.ts) ---

export interface TokenOnChainMetadata {
  name: string;
  symbol: string;
  uri: string;
  source: string;
}

export interface TokenOffChainMetadata {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
}

export interface TokenMetadataApiResponse {
  success: boolean;
  metadata: {
    tokenMint: string;
    onChain: TokenOnChainMetadata | null;
    offChain: TokenOffChainMetadata | null;
    metadataSource?: string;
    timestamp?: string;
  };
}

export interface TokenMetadataInfo {
  mint: string;
  name: string;
  symbol: string;
  image: string;
  fetchedAt: number;
}


export type {
  WalletCategory,
  WalletSource,
  MasterWallet,
  CustomQuickTradeSettings,
  QuickBuyPreferences,
  WalletType,
  WalletGroup,
  ConfigType,
  RecentToken,
  CategoryQuickTradeSettings,
  WalletBalance,
  WalletAmount,
  WalletImportResult,
  WalletExportData,
  WalletSelectionState,
} from "./wallet";

export { DEFAULT_GROUP_ID } from "./wallet";


export type {
  BundleMode,
  WalletBuy,
  WalletSell,
  BuyConfig,
  SellConfig,
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
  LimitPriceMode,
  LimitOrderStatus,
  LimitOrder,
} from "./trading";


export type {
  ToastType,
  Toast,
  PresetTab,
  CreateWalletModalProps,
  ImportWalletModalProps,
  CalculatePNLModalProps,
  MobilePage,
  MobileLayoutProps,
  WalletAmount as ComponentWalletAmount,
} from "./components";


export type {
  IframeData,
} from "./iframe";
