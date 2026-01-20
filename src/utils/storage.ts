/**
 * Storage utilities for wallet and configuration data.
 * Handles encrypted wallet storage and IndexedDB operations.
 */

import Cookies from 'js-cookie';
import { encryptData, decryptData } from './encryption';
import { createDefaultEndpoints } from './rpcManager';
import type {
  WalletType,
  ConfigType,
  MasterWallet,
  QuickBuyPreferences,
  TradingStrategy,
} from './types';

// Storage keys
export const STORAGE_KEYS = {
  CONFIG: 'config',
  QUICK_BUY: 'quickBuyPreferences',
  TRADING_STRATEGIES: 'tradingStrategies',
  ENCRYPTED_WALLETS: 'encrypted_wallets',
  ENCRYPTED_MASTER_WALLETS: 'encrypted_master_wallets',
  SPLIT_SIZES: 'splitSizes',
  VIEW_MODE: 'viewMode',
} as const;

// Database constants
const DB_NAME = 'WalletDB';
const DB_VERSION = 1;
const WALLET_STORE = 'wallets';

// Database instance
let db: IDBDatabase | null = null;

// Initialize database
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onerror = (): void => {
  console.error('Error opening database:', request.error);
};

request.onsuccess = (): void => {
  db = request.result;
};

request.onupgradeneeded = (): void => {
  db = request.result;
  if (!db.objectStoreNames.contains(WALLET_STORE)) {
    db.createObjectStore(WALLET_STORE, { keyPath: 'id' });
  }
};

// ============= Wallet Storage =============

/**
 * Save wallets to encrypted storage (IndexedDB + localStorage backup).
 */
export function saveWalletsToCookies(wallets: WalletType[]): void {
  try {
    const walletData = JSON.stringify(wallets);
    const encryptedData = encryptData(walletData);

    if (!db) {
      localStorage.setItem(STORAGE_KEYS.ENCRYPTED_WALLETS, encryptedData);
      localStorage.removeItem('wallets');
      return;
    }

    const transaction = db.transaction(WALLET_STORE, 'readwrite');
    const store = transaction.objectStore(WALLET_STORE);

    store.clear();
    const encryptedWallet = {
      id: 'encrypted_wallets',
      data: encryptedData,
    };
    store.add(encryptedWallet);

    // Backup to localStorage
    localStorage.setItem(STORAGE_KEYS.ENCRYPTED_WALLETS, encryptedData);
    localStorage.removeItem('wallets');
  } catch (error) {
    console.error('Error saving encrypted wallets:', error);
    try {
      const walletData = JSON.stringify(wallets);
      const encryptedData = encryptData(walletData);
      localStorage.setItem(STORAGE_KEYS.ENCRYPTED_WALLETS, encryptedData);
      localStorage.removeItem('wallets');
    } catch (encryptError) {
      console.error('Error with encryption fallback:', encryptError);
      localStorage.setItem('wallets', JSON.stringify(wallets));
    }
  }
}

/**
 * Load wallets from encrypted storage.
 */
export function loadWalletsFromCookies(): WalletType[] {
  try {
    const encryptedData = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_WALLETS);
    if (encryptedData) {
      try {
        const decryptedData = decryptData(encryptedData);
        return JSON.parse(decryptedData) as WalletType[];
      } catch {
        console.error('Error decrypting wallet data');
        const oldWallets = localStorage.getItem('wallets');
        if (oldWallets) {
          console.info('Loading from old unencrypted storage and migrating...');
          const parsedWallets = JSON.parse(oldWallets) as WalletType[];
          saveWalletsToCookies(parsedWallets);
          return parsedWallets;
        }
      }
    }

    // Fallback to old unencrypted data
    const oldWallets = localStorage.getItem('wallets');
    if (oldWallets) {
      console.info('Migrating from unencrypted to encrypted storage...');
      const parsedWallets = JSON.parse(oldWallets) as WalletType[];
      saveWalletsToCookies(parsedWallets);
      return parsedWallets;
    }

    return [];
  } catch (error) {
    console.error('Error loading wallets:', error);
    return [];
  }
}

/**
 * Check if wallet data is encrypted.
 */
export function isWalletDataEncrypted(): boolean {
  const encryptedData = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_WALLETS);
  const unencryptedData = localStorage.getItem('wallets');
  return !!encryptedData && !unencryptedData;
}

/**
 * Migrate unencrypted data to encrypted storage.
 */
export function migrateToEncryptedStorage(): boolean {
  try {
    const unencryptedData = localStorage.getItem('wallets');
    if (unencryptedData) {
      const wallets = JSON.parse(unencryptedData) as WalletType[];
      saveWalletsToCookies(wallets);
      console.info('Successfully migrated wallet data to encrypted storage');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error migrating to encrypted storage:', error);
    return false;
  }
}

// ============= Master Wallet Storage =============

/**
 * Save master wallets to encrypted storage.
 */
export function saveMasterWallets(masterWallets: MasterWallet[]): void {
  try {
    const data = JSON.stringify(masterWallets);
    const encrypted = encryptData(data);
    localStorage.setItem(STORAGE_KEYS.ENCRYPTED_MASTER_WALLETS, encrypted);
  } catch (error) {
    console.error('Error saving master wallets:', error);
    throw new Error('Failed to save master wallets');
  }
}

/**
 * Load master wallets from encrypted storage.
 */
export function loadMasterWallets(): MasterWallet[] {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_MASTER_WALLETS);
    if (!encrypted) {
      return [];
    }
    const decrypted = decryptData(encrypted);
    return JSON.parse(decrypted) as MasterWallet[];
  } catch (error) {
    console.error('Error loading master wallets:', error);
    return [];
  }
}

// ============= Config Storage =============

/**
 * Save configuration to cookies.
 */
export function saveConfigToCookies(config: ConfigType): void {
  Cookies.set(STORAGE_KEYS.CONFIG, JSON.stringify(config), { expires: 30 });
}

/**
 * Load configuration from cookies with backward compatibility.
 */
export function loadConfigFromCookies(): ConfigType | null {
  const savedConfig = Cookies.get(STORAGE_KEYS.CONFIG);
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig) as Partial<ConfigType>;

      // Handle backward compatibility defaults
      if (config.slippageBps === undefined) {
        config.slippageBps = '9900';
      }
      if (config.bundleMode === undefined) {
        config.bundleMode = 'batch';
      }
      if (config.singleDelay === undefined) {
        config.singleDelay = '200';
      }
      if (config.batchDelay === undefined) {
        config.batchDelay = '1000';
      }
      if (config.tradingServerEnabled === undefined) {
        config.tradingServerEnabled = 'false';
      }
      if (config.tradingServerUrl === undefined) {
        config.tradingServerUrl = 'localhost:4444';
      }
      if (config.rpcEndpoints === undefined) {
        config.rpcEndpoints = JSON.stringify(createDefaultEndpoints());
      }
      if (config.streamApiKey === undefined) {
        config.streamApiKey = '';
      }

      return config as ConfigType;
    } catch (error) {
      console.error('Error parsing saved config:', error);
      return null;
    }
  }
  return null;
}

// ============= Quick Buy Preferences =============

/**
 * Save quick buy preferences to cookies.
 */
export function saveQuickBuyPreferencesToCookies(preferences: QuickBuyPreferences): void {
  Cookies.set(STORAGE_KEYS.QUICK_BUY, JSON.stringify(preferences), { expires: 30 });
}

/**
 * Load quick buy preferences from cookies.
 */
export function loadQuickBuyPreferencesFromCookies(): QuickBuyPreferences | null {
  const savedPreferences = Cookies.get(STORAGE_KEYS.QUICK_BUY);
  if (savedPreferences) {
    try {
      return JSON.parse(savedPreferences) as QuickBuyPreferences;
    } catch (error) {
      console.error('Error parsing saved quick buy preferences:', error);
      return null;
    }
  }
  return null;
}

// ============= Trading Strategies =============

/**
 * Save trading strategies to cookies.
 */
export function saveTradingStrategiesToCookies(strategies: TradingStrategy[]): void {
  Cookies.set(STORAGE_KEYS.TRADING_STRATEGIES, JSON.stringify(strategies), { expires: 30 });
}

/**
 * Load trading strategies from cookies.
 */
export function loadTradingStrategiesFromCookies(): TradingStrategy[] {
  const savedStrategies = Cookies.get(STORAGE_KEYS.TRADING_STRATEGIES);
  if (savedStrategies) {
    try {
      const strategies = JSON.parse(savedStrategies) as TradingStrategy[];
      return strategies.map((strategy) => ({
        ...strategy,
        cooldownUnit: strategy.cooldownUnit || 'minutes',
      }));
    } catch (error) {
      console.error('Error parsing saved trading strategies:', error);
      return [];
    }
  }
  return [];
}

// ============= UI Preferences =============

export type ViewMode = 'simple' | 'advanced';

/**
 * Save view mode to cookies.
 */
export function saveViewModeToCookies(mode: ViewMode): void {
  try {
    Cookies.set(STORAGE_KEYS.VIEW_MODE, mode, { expires: 365 });
  } catch (error) {
    console.error('Error saving view mode to cookies:', error);
  }
}

/**
 * Load view mode from cookies.
 */
export function loadViewModeFromCookies(): ViewMode {
  try {
    const savedMode = Cookies.get(STORAGE_KEYS.VIEW_MODE);
    if (savedMode === 'simple' || savedMode === 'advanced') {
      return savedMode;
    }
  } catch (error) {
    console.error('Error loading view mode from cookies:', error);
  }
  return 'advanced';
}

/**
 * Save split panel sizes to cookies.
 */
export function saveSplitSizesToCookies(sizes: number[]): void {
  try {
    Cookies.set(STORAGE_KEYS.SPLIT_SIZES, JSON.stringify(sizes), { expires: 365 });
  } catch (error) {
    console.error('Error saving split sizes to cookies:', error);
  }
}

/**
 * Load split panel sizes from cookies.
 */
export function loadSplitSizesFromCookies(): number[] | null {
  try {
    const savedSizes = Cookies.get(STORAGE_KEYS.SPLIT_SIZES);
    if (savedSizes) {
      const sizes = JSON.parse(savedSizes) as number[];
      if (
        Array.isArray(sizes) &&
        sizes.length === 2 &&
        sizes.every((size) => typeof size === 'number' && size > 0 && size < 100)
      ) {
        return sizes;
      }
    }
  } catch (error) {
    console.error('Error loading split sizes from cookies:', error);
  }
  return null;
}
