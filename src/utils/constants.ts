/**
 * Application Constants
 *
 * Centralized constants for the Solana trading application.
 * This prevents magic numbers scattered throughout the codebase.
 */

// ============================================================================
// Base Currency Definitions
// ============================================================================

/**
 * Supported base currencies for trading operations
 */
export const BASE_CURRENCIES = {
  SOL: {
    mint: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
    isNative: true,
  },
  USDC: {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    isNative: false,
  },
  USD1: {
    mint: "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB",
    symbol: "USD1",
    name: "USD1",
    decimals: 6,
    isNative: false,
  },
} as const;

/**
 * Base currency type derived from BASE_CURRENCIES
 */
export type BaseCurrencyKey = keyof typeof BASE_CURRENCIES;

/**
 * Base currency configuration type
 */
export interface BaseCurrencyConfig {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  isNative: boolean;
}

/**
 * Get base currency config by mint address
 */
export const getBaseCurrencyByMint = (
  mint: string,
): BaseCurrencyConfig | undefined => {
  return Object.values(BASE_CURRENCIES).find(
    (currency) => currency.mint === mint,
  );
};

/**
 * Default base currency
 */
export const DEFAULT_BASE_CURRENCY = BASE_CURRENCIES.SOL;

// API URLs
export const API_URLS = {
  RAZE_PUBLIC: "https://public.raze.sh/api",
} as const;

// API Endpoint Paths
export const API_ENDPOINTS = {
  // Quote
  SOL_QUOTE: "/v3/sol/quote",

  // Buy
  SOL_BUY: "/v3/sol/buy",

  // Sell
  SOL_SELL: "/v3/sol/sell",

  // Create
  SOL_CREATE: "/v3/sol/create",

  // Distribute
  SOL_DISTRIBUTE: "/v3/sol/distribute",

  // Mixer
  SOL_MIXER: "/v3/sol/mixer",

  // Consolidate
  SOL_CONSOLIDATE: "/v3/sol/consolidate",

  // Transfer
  SOL_TRANSFER: "/v3/sol/transfer",

  // Burn
  SOL_BURN: "/v3/sol/burn",

  // Fee claim
  SOL_FEE_CLAIM: "/v3/sol/fee-claim",

  // Send
  SOL_SEND: "/v3/sol/send",
} as const;

// Trading Constants
export const TRADING = {
  MAX_BUNDLES_PER_SECOND: 2,
  MAX_TRANSACTIONS_PER_BUNDLE: 5,
  DEFAULT_SLIPPAGE_BPS: 9900,
  DEFAULT_BATCH_DELAY_MS: 1000,
  DEFAULT_SINGLE_DELAY_MS: 200,
  DEFAULT_BUNDLE_DELAY_MS: 100,
  DEFAULT_TRANSACTION_FEE_SOL: 0.005,
} as const;

// Rate Limiting
export const RATE_LIMIT = {
  RESET_INTERVAL_MS: 1000,
  RPC_TIMEOUT_MS: 1000,
  DEBOUNCE_MS: 300,
  THROTTLE_MS: 5000,
} as const;

// Balance Refresh
export const BALANCE_REFRESH = {
  DEFAULT_BATCH_SIZE: 5,
  DEFAULT_DELAY_MS: 50,
  POLLING_INTERVAL_MS: 5000,
} as const;

// Limit Orders
export const LIMIT_ORDERS = {
  MAX_ACTIVE_ORDERS: 20,
  STORAGE_KEY: "raze_limit_orders",
  CHECK_DEBOUNCE_MS: 1000,
} as const;

// UI Preset Amounts (SOL)
export const PRESET_AMOUNTS = {
  BUY: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1],
  SELL_PERCENTAGES: [10, 25, 50, 75, 100],
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  // Config
  config: "config",
  quickBuyPreferences: "quickBuyPreferences",
  tradingStrategies: "tradingStrategies",
  splitSizes: "splitSizes",
  viewMode: "viewMode",

  // Encrypted Storage
  encryptedWallets: "encrypted_wallets",
  encryptedMasterWallets: "encrypted_master_wallets",

  // Wallet Groups
  walletGroups: "wallet_groups",

  // Recent Tokens
  recentTokens: "raze_recent_tokens",
} as const;

// Recent Tokens
export const RECENT_TOKENS = {
  MAX_COUNT: 10,
} as const;

// IndexedDB
export const INDEXED_DB = {
  NAME: "WalletDB",
  VERSION: 1,
  WALLET_STORE: "wallets",
} as const;

// Execution Logs
export const EXECUTION_LOGS = {
  MAX_ENTRIES: 500,
  MAX_RECENT_EVENTS: 50,
  MAX_UI_ENTRIES: 100,
} as const;

// Wallet Defaults
export const WALLET_DEFAULTS = {
  CATEGORY: "Medium" as const,
  SOURCE_IMPORTED: "imported" as const,
  SOURCE_HD_DERIVED: "hd-derived" as const,
} as const;

// Operation Delays (consolidate, distribute, mixer)
export const OPERATION_DELAYS = {
  INTER_BUNDLE_MS: 500,
  BATCH_INTERVAL_MS: 3000,
  STAGE_DELAY_MS: 1000,
} as const;

// Token Creation Constants
export const CREATE_CONFIG = {
  MAX_RETRY_ATTEMPTS: 50,
  MAX_CONSECUTIVE_ERRORS: 3,
  BASE_RETRY_DELAY_MS: 200,
  LUT_ACTIVATION_WAIT_MS: 5000,
  JITTER_MIN: 0.85,
  JITTER_RANGE: 0.3,
} as const;

// Encryption
export const ENCRYPTION = {
  KEY: "raze-bot-wallet-encryption-key",
} as const;

// Timeouts and Intervals
export const TIMEOUTS = {
  PROFILE_SYNC_INTERVAL_MS: 5000,
  TOAST_DURATION_MS: 3000,
  ANIMATION_DURATION_MS: 300,
} as const;

// Validation
export const VALIDATION = {
  MIN_SELL_PERCENTAGE: 1,
  MAX_SELL_PERCENTAGE: 100,
  SOLANA_PRIVATE_KEY_LENGTH: 64,
} as const;

// ============================================================================
// Brand Configuration
// ============================================================================

import brandConfig from '../../brand.json';

export interface BrandConfig {
  brand: {
    name: string;
    displayName: string;
    altText: string;
    domain: string;
    appUrl: string;
    docsUrl: string;
    githubUrl: string;
    githubOrg: string;
    social: {
      twitter: string;
      github: string;
    };
    theme: {
      name: string;
    };
  };
}

export const getBrandConfig = (): BrandConfig => {
  return brandConfig as BrandConfig;
};

export const brand = getBrandConfig().brand;
