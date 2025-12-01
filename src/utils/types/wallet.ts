/**
 * Wallet Type Definitions
 * 
 * This module contains all wallet-related type definitions
 * for the Solana trading application, including wallet structures,
 * configuration types, and user preferences.
 */

// ============================================================================
// Wallet Category and Source Types
// ============================================================================

/**
 * Wallet risk category for trading operations
 * Used to group wallets by risk tolerance and trading behavior
 * @example 'Soft' for conservative trading, 'Hard' for aggressive trading
 */
export type WalletCategory = 'Soft' | 'Medium' | 'Hard';

/**
 * Origin of the wallet - how it was created or imported
 * @example 'hd-derived' for wallets generated from a master seed phrase
 */
export type WalletSource = 'hd-derived' | 'imported';

// ============================================================================
// Master Wallet Types
// ============================================================================

/**
 * HD (Hierarchical Deterministic) master wallet
 * Contains the encrypted seed phrase for deriving child wallets
 */
export interface MasterWallet {
  /** Unique identifier for the master wallet */
  id: string;
  /** User-friendly name for the master wallet */
  name: string;
  /** AES-encrypted mnemonic seed phrase */
  encryptedMnemonic: string;
  /** Number of derived accounts from this master wallet */
  accountCount: number;
  /** Unix timestamp when the master wallet was created */
  createdAt: number;
  /** Optional color for visual grouping in the UI */
  color?: string;
}

// ============================================================================
// Quick Trade Settings Types
// ============================================================================

/**
 * Custom quick trade settings for individual wallets
 * Allows per-wallet override of global trading preferences
 */
export interface CustomQuickTradeSettings {
  /** Fixed buy amount in SOL */
  buyAmount?: number;
  /** Minimum buy amount when using range */
  buyMinAmount?: number;
  /** Maximum buy amount when using range */
  buyMaxAmount?: number;
  /** Whether to use random amount within buy range */
  useBuyRange?: boolean;
  /** Fixed sell percentage (0-100) */
  sellPercentage?: number;
  /** Minimum sell percentage when using range */
  sellMinPercentage?: number;
  /** Maximum sell percentage when using range */
  sellMaxPercentage?: number;
  /** Whether to use random percentage within sell range */
  useSellRange?: boolean;
}

/**
 * Quick buy/sell preferences for the trading interface
 * Global settings that can be overridden per-wallet
 */
export interface QuickBuyPreferences {
  /** Whether quick buy feature is enabled */
  quickBuyEnabled: boolean;
  /** Default quick buy amount in SOL */
  quickBuyAmount: number;
  /** Minimum amount for random buy range */
  quickBuyMinAmount: number;
  /** Maximum amount for random buy range */
  quickBuyMaxAmount: number;
  /** Whether to use random amount within range */
  useQuickBuyRange: boolean;
  /** Default quick sell percentage (0-100) */
  quickSellPercentage: number;
  /** Minimum percentage for random sell range */
  quickSellMinPercentage: number;
  /** Maximum percentage for random sell range */
  quickSellMaxPercentage: number;
  /** Whether to use random percentage within range */
  useQuickSellRange: boolean;
}

// ============================================================================
// Main Wallet Type
// ============================================================================

/**
 * Main wallet interface representing a Solana wallet
 * Contains all wallet properties including HD derivation info
 */
export interface WalletType {
  /** Unique numeric identifier for the wallet */
  id: number;
  /** Solana public key address (base58 encoded) */
  address: string;
  /** Private key for signing transactions (base58 encoded) */
  privateKey: string;
  /** Whether the wallet is selected for trading operations */
  isActive: boolean;
  /** Current token balance (set during balance refresh) */
  tokenBalance?: number;
  /** User-defined label for the wallet */
  label?: string;
  /** Risk category for trading behavior */
  category?: WalletCategory;
  /** Whether the wallet is archived (hidden from main view) */
  isArchived?: boolean;
  
  // HD Wallet fields
  /** Origin of the wallet - 'hd-derived' or 'imported' */
  source?: WalletSource;
  /** Links to MasterWallet.id if HD-derived */
  masterWalletId?: string;
  /** Account index in BIP44 derivation path */
  derivationIndex?: number;
  
  /** Custom quick trade settings (overrides category settings) */
  customQuickTradeSettings?: CustomQuickTradeSettings;
  
  /** Allow additional properties for extensibility */
  [key: string]: unknown;
}

// ============================================================================
// Application Configuration Types
// ============================================================================

/**
 * Application configuration stored in cookies
 * Contains all user preferences for trading operations
 */
export interface ConfigType {
  /** JSON string of RPCEndpoint[] for Solana RPC connections */
  rpcEndpoints: string;
  /** Transaction priority fee in lamports */
  transactionFee: string;
  /** Selected DEX for trading (e.g., 'raydium', 'jupiter') */
  selectedDex: string;
  /** UI state for dropdown menu */
  isDropdownOpen: boolean;
  /** Default buy amount in SOL */
  buyAmount: string;
  /** Default sell percentage */
  sellAmount: string;
  /** Slippage tolerance in basis points (e.g., "100" = 1%) */
  slippageBps: string;
  /** Default bundle mode preference ('single', 'batch', 'all-in-one') */
  bundleMode: string;
  /** Delay between wallets in single mode (milliseconds) */
  singleDelay: string;
  /** Delay between batches in batch mode (milliseconds) */
  batchDelay: string;
  /** Whether to use self-hosted trading server ('true' or 'false') */
  tradingServerEnabled: string;
  /** URL of the self-hosted trading server */
  tradingServerUrl: string;
  /** API key for WebSocket stream authentication */
  streamApiKey: string;
}

// ============================================================================
// Recent Token Types
// ============================================================================

/**
 * Recently viewed token information
 * Used for quick access to previously viewed tokens
 */
export interface RecentToken {
  /** Token mint address (base58 encoded) */
  address: string;
  /** Unix timestamp of last view */
  lastViewed: number;
}

// ============================================================================
// Category Quick Trade Settings
// ============================================================================

/**
 * Quick trade settings for a single wallet category
 * Contains all trading parameters for buy/sell operations
 */
export interface CategoryQuickTradeSettings {
  /** Whether quick trading is enabled for this category */
  enabled: boolean;
  /** Fixed buy amount in SOL */
  buyAmount: number;
  /** Minimum buy amount when using range */
  buyMinAmount: number;
  /** Maximum buy amount when using range */
  buyMaxAmount: number;
  /** Whether to use random amount within buy range */
  useBuyRange: boolean;
  /** Fixed sell percentage (0-100) */
  sellPercentage: number;
  /** Minimum sell percentage when using range */
  sellMinPercentage: number;
  /** Maximum sell percentage when using range */
  sellMaxPercentage: number;
  /** Whether to use random percentage within sell range */
  useSellRange: boolean;
}

// ============================================================================
// Wallet Balance Types
// ============================================================================

/**
 * Wallet balance information
 * Used for displaying wallet balances in the UI
 */
export interface WalletBalance {
  /** Wallet address */
  address: string;
  /** SOL balance in lamports */
  solBalance: number;
  /** Token balance (UI amount) */
  tokenBalance: number;
}

/**
 * Wallet amount for trading operations
 * Used when specifying amounts for buy/sell operations
 */
export interface WalletAmount {
  /** Wallet address */
  address: string;
  /** Amount in SOL or percentage */
  amount: number;
  /** Whether amount is a percentage (for sells) */
  isPercentage?: boolean;
}

// ============================================================================
// Wallet Import/Export Types
// ============================================================================

/**
 * Result of wallet import operation
 */
export interface WalletImportResult {
  /** Successfully imported wallet, or null if failed */
  wallet: WalletType | null;
  /** Error message if import failed */
  error?: string;
}

/**
 * Wallet export format for backup
 */
export interface WalletExportData {
  /** Wallet address */
  address: string;
  /** Private key (base58 encoded) */
  privateKey: string;
  /** Optional label */
  label?: string;
  /** Wallet category */
  category?: WalletCategory;
}

// ============================================================================
// Wallet Selection Types
// ============================================================================

/**
 * Wallet selection state for batch operations
 */
export interface WalletSelectionState {
  /** Map of wallet ID to selection state */
  selected: Map<number, boolean>;
  /** Whether all wallets are selected */
  allSelected: boolean;
  /** Number of selected wallets */
  selectedCount: number;
}

/**
 * Sort direction for wallet list
 */
export type WalletSortDirection = 'asc' | 'desc';

/**
 * Sort field for wallet list
 */
export type WalletSortField = 'balance' | 'label' | 'category' | 'address';

/**
 * Wallet filter options
 */
export interface WalletFilterOptions {
  /** Filter by category */
  category?: WalletCategory;
  /** Filter by source */
  source?: WalletSource;
  /** Filter by master wallet ID */
  masterWalletId?: string;
  /** Show archived wallets */
  showArchived?: boolean;
  /** Search query for address or label */
  searchQuery?: string;
}
