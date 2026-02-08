/**
 * Storage utilities for wallet and configuration data.
 * Handles encrypted wallet storage and IndexedDB operations.
 */

import Cookies from "js-cookie";
import { encryptData, decryptData } from "./encryption";
import { createDefaultEndpoints } from "./rpcManager";
import type {
  WalletType,
  ConfigType,
  MasterWallet,
  QuickBuyPreferences,
  WalletGroup,
} from "./types";
import { DEFAULT_GROUP_ID } from "./types";
import type { MultichartToken } from "./types/multichart";

// Storage keys
export const STORAGE_KEYS = {
  CONFIG: "config",
  QUICK_BUY: "quickBuyPreferences",
  ENCRYPTED_WALLETS: "encrypted_wallets",
  ENCRYPTED_MASTER_WALLETS: "encrypted_master_wallets",
  SPLIT_SIZES: "splitSizes",
  VIEW_MODE: "viewMode",
  MULTICHART_TOKENS: "multichart_tokens",
  MULTICHART_ACTIVE_INDEX: "multichartActiveIndex",
  WALLET_GROUPS: "wallet_groups",
} as const;

// Database constants
const DB_NAME = "WalletDB";
const DB_VERSION = 1;
const WALLET_STORE = "wallets";

// Database instance
let db: IDBDatabase | null = null;

// Initialize database
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onerror = (): void => {
};

request.onsuccess = (): void => {
  db = request.result;
};

request.onupgradeneeded = (): void => {
  db = request.result;
  if (!db.objectStoreNames.contains(WALLET_STORE)) {
    db.createObjectStore(WALLET_STORE, { keyPath: "id" });
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
      localStorage.removeItem("wallets");
      return;
    }

    const transaction = db.transaction(WALLET_STORE, "readwrite");
    const store = transaction.objectStore(WALLET_STORE);

    store.clear();
    const encryptedWallet = {
      id: "encrypted_wallets",
      data: encryptedData,
    };
    store.add(encryptedWallet);

    // Backup to localStorage
    localStorage.setItem(STORAGE_KEYS.ENCRYPTED_WALLETS, encryptedData);
    localStorage.removeItem("wallets");
  } catch (ignore) {
    try {
      const walletData = JSON.stringify(wallets);
      const encryptedData = encryptData(walletData);
      localStorage.setItem(STORAGE_KEYS.ENCRYPTED_WALLETS, encryptedData);
      localStorage.removeItem("wallets");
    } catch (ignore) {
      localStorage.setItem("wallets", JSON.stringify(wallets));
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
        const oldWallets = localStorage.getItem("wallets");
        if (oldWallets) {
          const parsedWallets = JSON.parse(oldWallets) as WalletType[];
          saveWalletsToCookies(parsedWallets);
          return parsedWallets;
        }
      }
    }

    // Fallback to old unencrypted data
    const oldWallets = localStorage.getItem("wallets");
    if (oldWallets) {
      const parsedWallets = JSON.parse(oldWallets) as WalletType[];
      saveWalletsToCookies(parsedWallets);
      return parsedWallets;
    }

    return [];
  } catch (ignore) {
    return [];
  }
}

/**
 * Check if wallet data is encrypted.
 */
export function isWalletDataEncrypted(): boolean {
  const encryptedData = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_WALLETS);
  const unencryptedData = localStorage.getItem("wallets");
  return !!encryptedData && !unencryptedData;
}

/**
 * Migrate unencrypted data to encrypted storage.
 */
export function migrateToEncryptedStorage(): boolean {
  try {
    const unencryptedData = localStorage.getItem("wallets");
    if (unencryptedData) {
      const wallets = JSON.parse(unencryptedData) as WalletType[];
      saveWalletsToCookies(wallets);
      return true;
    }
    return false;
  } catch (ignore) {
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
  } catch (ignore) {
    throw new Error("Failed to save master wallets");
  }
}

/**
 * Load master wallets from encrypted storage.
 */
export function loadMasterWallets(): MasterWallet[] {
  try {
    const encrypted = localStorage.getItem(
      STORAGE_KEYS.ENCRYPTED_MASTER_WALLETS,
    );
    if (!encrypted) {
      return [];
    }
    const decrypted = decryptData(encrypted);
    return JSON.parse(decrypted) as MasterWallet[];
  } catch (ignore) {
    return [];
  }
}

// ============= Wallet Groups Storage =============

function createDefaultGroup(): WalletGroup {
  return { id: DEFAULT_GROUP_ID, name: "Default", order: 0, isDefault: true };
}

/**
 * Save wallet groups to localStorage.
 */
export function saveWalletGroups(groups: WalletGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WALLET_GROUPS, JSON.stringify(groups));
  } catch (ignore) {
    // Intentionally ignored
  }
}

/**
 * Load wallet groups from localStorage.
 */
export function loadWalletGroups(): WalletGroup[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.WALLET_GROUPS);
    if (stored) {
      const groups = JSON.parse(stored) as WalletGroup[];
      if (Array.isArray(groups) && groups.length > 0) {
        if (!groups.some((g) => g.isDefault)) {
          groups.unshift(createDefaultGroup());
        }
        return groups;
      }
    }
  } catch (ignore) {
    // Intentionally ignored
  }
  return [createDefaultGroup()];
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
        config.slippageBps = "9900";
      }
      if (config.bundleMode === undefined) {
        config.bundleMode = "batch";
      }
      if (config.singleDelay === undefined) {
        config.singleDelay = "200";
      }
      if (config.batchDelay === undefined) {
        config.batchDelay = "1000";
      }
      if (config.rpcEndpoints === undefined) {
        config.rpcEndpoints = JSON.stringify(createDefaultEndpoints());
      }

      // Transaction sending config defaults
      if (config.sendingMode === undefined) {
        config.sendingMode = "server";
      }
      if (config.customRpcEndpoint === undefined) {
        config.customRpcEndpoint = "";
      }
      if (config.customJitoSingleEndpoint === undefined) {
        config.customJitoSingleEndpoint = "";
      }
      if (config.customJitoBundleEndpoint === undefined) {
        config.customJitoBundleEndpoint = "";
      }
      if (config.singleTxMode === undefined) {
        config.singleTxMode = "rpc";
      }
      if (config.multiTxMode === undefined) {
        config.multiTxMode = "bundle";
      }

      return config as ConfigType;
    } catch (ignore) {
      return null;
    }
  }
  return null;
}

// ============= Quick Buy Preferences =============

/**
 * Save quick buy preferences to cookies.
 */
export function saveQuickBuyPreferencesToCookies(
  preferences: QuickBuyPreferences,
): void {
  Cookies.set(STORAGE_KEYS.QUICK_BUY, JSON.stringify(preferences), {
    expires: 30,
  });
}

/**
 * Load quick buy preferences from cookies.
 */
export function loadQuickBuyPreferencesFromCookies(): QuickBuyPreferences | null {
  const savedPreferences = Cookies.get(STORAGE_KEYS.QUICK_BUY);
  if (savedPreferences) {
    try {
      return JSON.parse(savedPreferences) as QuickBuyPreferences;
    } catch (ignore) {
      return null;
    }
  }
  return null;
}

// ============= UI Preferences =============

export type ViewMode = "simple" | "advanced" | "multichart";

/**
 * Save view mode to cookies.
 */
export function saveViewModeToCookies(mode: ViewMode): void {
  try {
    Cookies.set(STORAGE_KEYS.VIEW_MODE, mode, { expires: 365 });
  } catch (ignore) {
    // Intentionally ignored
  }
}

/**
 * Load view mode from cookies.
 */
export function loadViewModeFromCookies(): ViewMode {
  try {
    const savedMode = Cookies.get(STORAGE_KEYS.VIEW_MODE);
    if (
      savedMode === "simple" ||
      savedMode === "advanced" ||
      savedMode === "multichart"
    ) {
      return savedMode;
    }
  } catch (ignore) {
    // Intentionally ignored
  }
  return "advanced";
}

/**
 * Save split panel sizes to cookies.
 */
export function saveSplitSizesToCookies(sizes: number[]): void {
  try {
    Cookies.set(STORAGE_KEYS.SPLIT_SIZES, JSON.stringify(sizes), {
      expires: 365,
    });
  } catch (ignore) {
    // Intentionally ignored
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
        sizes.every(
          (size) => typeof size === "number" && size > 0 && size < 100,
        )
      ) {
        return sizes;
      }
    }
  } catch (ignore) {
    // Intentionally ignored
  }
  return null;
}

// ============= Multichart Storage =============

const MAX_MULTICHART_TOKENS = 8;

/**
 * Save multichart tokens to localStorage.
 */
export function saveMultichartTokens(tokens: MultichartToken[]): void {
  try {
    const tokensToSave = tokens.slice(0, MAX_MULTICHART_TOKENS);
    localStorage.setItem(
      STORAGE_KEYS.MULTICHART_TOKENS,
      JSON.stringify(tokensToSave),
    );
  } catch (ignore) {
    // Intentionally ignored
  }
}

/**
 * Load multichart tokens from localStorage.
 */
export function loadMultichartTokens(): MultichartToken[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MULTICHART_TOKENS);
    if (stored) {
      const tokens = JSON.parse(stored) as MultichartToken[];
      if (Array.isArray(tokens)) {
        return tokens.slice(0, MAX_MULTICHART_TOKENS);
      }
    }
  } catch (ignore) {
    // Intentionally ignored
  }
  return [];
}

/**
 * Save active multichart token index to cookies.
 */
export function saveMultichartActiveIndex(index: number): void {
  try {
    Cookies.set(STORAGE_KEYS.MULTICHART_ACTIVE_INDEX, String(index), {
      expires: 365,
    });
  } catch (ignore) {
    // Intentionally ignored
  }
}

/**
 * Load active multichart token index from cookies.
 */
export function loadMultichartActiveIndex(): number {
  try {
    const saved = Cookies.get(STORAGE_KEYS.MULTICHART_ACTIVE_INDEX);
    if (saved) {
      const index = parseInt(saved, 10);
      if (!isNaN(index) && index >= 0) {
        return index;
      }
    }
  } catch (ignore) {
    // Intentionally ignored
  }
  return 0;
}

/**
 * Get maximum number of multichart tokens allowed.
 */
export function getMaxMultichartTokens(): number {
  return MAX_MULTICHART_TOKENS;
}
