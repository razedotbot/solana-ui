/**
 * Main utilities module - re-exports from specialized utility modules.
 *
 * This file provides backward compatibility by re-exporting functions
 * from their new locations in the utils/ directory.
 *
 * For new code, prefer importing directly from:
 * - utils/wallet.ts - Wallet operations
 * - utils/storage.ts - Storage/persistence
 * - utils/encryption.ts - Encryption utilities
 * - utils/formatting.ts - Formatting helpers
 */

// ============= Re-export from wallet utilities =============
export {
  // Wallet operations
  toggleWallet,
  deleteWallet,
  createNewWallet,
  importWallet,
  getWalletDisplayName,
  getWallets,
  getActiveWallets,
  getActiveWalletPrivateKeys,

  // Master wallet operations
  createMasterWallet,
  getMasterWalletMnemonic,
  updateMasterWalletAccountCount,
  deleteMasterWallet,
  createHDWalletFromMaster,

  // Balance operations
  fetchTokenBalance,
  fetchSolBalance,
  refreshWalletBalance,
  fetchWalletBalances,

  // Wallet management
  handleSortWallets,
  handleCleanupWallets,

  // Clipboard & download
  copyToClipboard,
  downloadPrivateKey,
  downloadAllWallets,

  // Types
  type BalanceRefreshStrategy,
  type BalanceRefreshOptions,
} from "./utils/wallet";

// ============= Re-export from storage utilities =============
export {
  // Wallet storage
  saveWalletsToCookies,
  loadWalletsFromCookies,
  isWalletDataEncrypted,
  migrateToEncryptedStorage,

  // Master wallet storage
  saveMasterWallets,
  loadMasterWallets,

  // Config storage
  saveConfigToCookies,
  loadConfigFromCookies,

  // Quick buy preferences
  saveQuickBuyPreferencesToCookies,
  loadQuickBuyPreferencesFromCookies,

  // Trading strategies
  saveTradingStrategiesToCookies,
  loadTradingStrategiesFromCookies,

  // UI preferences
  saveViewModeToCookies,
  loadViewModeFromCookies,
  saveSplitSizesToCookies,
  loadSplitSizesFromCookies,

  // Types
  type ViewMode,
} from "./utils/storage";

// ============= Re-export from encryption utilities =============
export {
  encryptData,
  decryptData,
  encryptWalletData,
  decryptWalletData,
} from "./utils/encryption";

// ============= Re-export from formatting utilities =============
export { formatAddress, formatTokenBalance } from "./utils/formatting";

// ============= Re-export types for backward compatibility =============
export type {
  WalletCategory,
  WalletSource,
  MasterWallet,
  CustomQuickTradeSettings,
  WalletType,
  ConfigType,
  QuickBuyPreferences,
  TradingStrategy,
} from "./utils/types";
