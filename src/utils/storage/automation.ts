/**
 * Unified Trading Tools Storage
 *
 * LocalStorage management for all trading profiles and execution logs.
 */

import type {
  SniperProfile,
  SniperFilter,
  SniperExecutionLog,
  CopyTradeProfile,
  CopyTradeCondition,
  CopyTradeAction,
  CopyTradeExecutionLog,
  TradingStrategy,
  TradingCondition,
  TradingAction,
  WalletList,
  ToolType,
} from "../types/automation";
import {
  STORAGE_KEYS,
  EXECUTION_LOGS,
  PROFILE_DEFAULTS,
} from "../constants";

const MAX_EXECUTION_LOGS = EXECUTION_LOGS.MAX_ENTRIES;

// ============================================================================
// ID Generators
// ============================================================================

const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateProfileId = (type?: ToolType): string => {
  const prefix = type || "profile";
  return `${prefix}_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateFilterId = (): string => generateId("sniper_filter");
export const generateConditionId = (): string => generateId("cond");
export const generateActionId = (): string => generateId("action");
export const generateLogId = (): string => generateId("log");
export const generateExecutionLogId = (): string => generateId("log");
export const generateWalletListId = (): string => generateId("wlist");

// ============================================================================
// Generic Storage Functions
// ============================================================================

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
  } catch (error) {
    console.error(`[Storage] Error loading ${key}:`, error);
  }
  return defaultValue;
};

const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`[Storage] Error saving ${key}:`, error);
  }
};

// ============================================================================
// Sniper Bot Storage
// ============================================================================

export const loadSniperProfiles = (): SniperProfile[] =>
  loadFromStorage(STORAGE_KEYS.sniperProfiles, []);

export const saveSniperProfiles = (profiles: SniperProfile[]): void =>
  saveToStorage(STORAGE_KEYS.sniperProfiles, profiles);

export const addSniperProfile = (profile: SniperProfile): SniperProfile[] => {
  const profiles = loadSniperProfiles();
  const updated = [...profiles, profile];
  saveSniperProfiles(updated);
  return updated;
};

export const updateSniperProfile = (
  profile: SniperProfile,
): SniperProfile[] => {
  const profiles = loadSniperProfiles();
  const updated = profiles.map((p) =>
    p.id === profile.id ? { ...profile, updatedAt: Date.now() } : p,
  );
  saveSniperProfiles(updated);
  return updated;
};

export const deleteSniperProfile = (id: string): SniperProfile[] => {
  const profiles = loadSniperProfiles().filter((p) => p.id !== id);
  saveSniperProfiles(profiles);
  return profiles;
};

export const getSniperProfileById = (
  profileId: string,
): SniperProfile | undefined => {
  const profiles = loadSniperProfiles();
  return profiles.find((profile) => profile.id === profileId);
};

export const toggleSniperProfile = (id: string): SniperProfile[] => {
  const profiles = loadSniperProfiles();
  const updated = profiles.map((p) =>
    p.id === id ? { ...p, isActive: !p.isActive, updatedAt: Date.now() } : p,
  );
  saveSniperProfiles(updated);
  return updated;
};

export const createDefaultSniperProfile = (
  name = "New Sniper",
): SniperProfile => ({
  id: generateProfileId("sniper"),
  name,
  description: "",
  isActive: false,
  eventType: "deploy",
  filters: [],
  buyAmountType: "fixed",
  buyAmount: PROFILE_DEFAULTS.SNIPER.BUY_AMOUNT,
  slippage: PROFILE_DEFAULTS.SNIPER.SLIPPAGE,
  priority: PROFILE_DEFAULTS.SNIPER.PRIORITY,
  cooldown: PROFILE_DEFAULTS.SNIPER.COOLDOWN,
  cooldownUnit: PROFILE_DEFAULTS.SNIPER.COOLDOWN_UNIT,
  maxExecutions: undefined,
  executionCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const createDefaultSniperFilter = (): SniperFilter => ({
  id: generateFilterId(),
  enabled: true,
  platform: undefined,
  mint: undefined,
  signer: undefined,
  namePattern: undefined,
  nameMatchType: "contains",
  symbolPattern: undefined,
  symbolMatchType: "contains",
});

export const createDefaultFilter = createDefaultSniperFilter;

// Sniper Execution Logs
export const loadSniperLogs = (): SniperExecutionLog[] =>
  loadFromStorage(STORAGE_KEYS.sniperExecutionLogs, []);

export const loadExecutionLogs = loadSniperLogs;

export const saveSniperLogs = (logs: SniperExecutionLog[]): void =>
  saveToStorage(
    STORAGE_KEYS.sniperExecutionLogs,
    logs.slice(-MAX_EXECUTION_LOGS),
  );

export const saveExecutionLogs = saveSniperLogs;

export const addSniperLog = (log: SniperExecutionLog): SniperExecutionLog[] => {
  const logs = [log, ...loadSniperLogs()];
  saveSniperLogs(logs);
  return logs;
};

export const addExecutionLog = addSniperLog;

export const clearSniperLogs = (): void =>
  localStorage.removeItem(STORAGE_KEYS.sniperExecutionLogs);

export const clearExecutionLogs = clearSniperLogs;

export const getSniperLogsByProfileId = (
  profileId: string,
): SniperExecutionLog[] => {
  const logs = loadSniperLogs();
  return logs.filter((log) => log.profileId === profileId);
};

export const getExecutionLogsByProfileId = getSniperLogsByProfileId;

export const getSuccessfulSnipeCount = (): number => {
  const logs = loadSniperLogs();
  return logs.filter((log) => log.success).length;
};

// ============================================================================
// Copy Trade Storage
// ============================================================================

export const loadCopyTradeProfiles = (): CopyTradeProfile[] =>
  loadFromStorage(STORAGE_KEYS.copytradeProfiles, []);

export const saveCopyTradeProfiles = (profiles: CopyTradeProfile[]): void =>
  saveToStorage(STORAGE_KEYS.copytradeProfiles, profiles);

export const addCopyTradeProfile = (
  profile: CopyTradeProfile,
): CopyTradeProfile[] => {
  const profiles = loadCopyTradeProfiles();
  const updated = [...profiles, profile];
  saveCopyTradeProfiles(updated);
  return updated;
};

export const updateCopyTradeProfile = (
  profile: CopyTradeProfile,
): CopyTradeProfile[] => {
  const profiles = loadCopyTradeProfiles();
  const updated = profiles.map((p) =>
    p.id === profile.id ? { ...profile, updatedAt: Date.now() } : p,
  );
  saveCopyTradeProfiles(updated);
  return updated;
};

export const deleteCopyTradeProfile = (id: string): CopyTradeProfile[] => {
  const profiles = loadCopyTradeProfiles().filter((p) => p.id !== id);
  saveCopyTradeProfiles(profiles);
  return profiles;
};

export const getCopyTradeProfileById = (
  profileId: string,
): CopyTradeProfile | undefined => {
  const profiles = loadCopyTradeProfiles();
  return profiles.find((profile) => profile.id === profileId);
};

export const toggleCopyTradeProfile = (id: string): CopyTradeProfile[] => {
  const profiles = loadCopyTradeProfiles();
  const updated = profiles.map((p) =>
    p.id === id ? { ...p, isActive: !p.isActive, updatedAt: Date.now() } : p,
  );
  saveCopyTradeProfiles(updated);
  return updated;
};

export const createDefaultCopyTradeProfile = (
  name = "New Copy Trade",
): CopyTradeProfile => ({
  id: generateProfileId("copytrade"),
  name,
  description: "",
  isActive: false,
  mode: "simple",
  simpleConfig: {
    amountMultiplier: PROFILE_DEFAULTS.COPYTRADE.AMOUNT_MULTIPLIER,
    slippage: PROFILE_DEFAULTS.COPYTRADE.SLIPPAGE,
    priority: PROFILE_DEFAULTS.COPYTRADE.PRIORITY,
    mirrorTradeType: true,
  },
  conditions: [],
  conditionLogic: "and",
  actions: [],
  walletListId: null,
  walletAddresses: [],
  tokenFilterMode: "all",
  specificTokens: [],
  blacklistedTokens: [],
  cooldown: PROFILE_DEFAULTS.COPYTRADE.COOLDOWN,
  cooldownUnit: PROFILE_DEFAULTS.COPYTRADE.COOLDOWN_UNIT,
  maxExecutions: undefined,
  executionCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const createDefaultCopyTradeCondition = (): CopyTradeCondition => ({
  id: generateConditionId(),
  type: "tradeSize",
  operator: "greater",
  value: 0.1,
});

export const createDefaultCopyTradeAction = (): CopyTradeAction => ({
  id: generateActionId(),
  type: "mirror",
  amountType: "multiplier",
  amount: PROFILE_DEFAULTS.COPYTRADE.AMOUNT_MULTIPLIER,
  slippage: PROFILE_DEFAULTS.COPYTRADE.SLIPPAGE,
  priority: PROFILE_DEFAULTS.COPYTRADE.PRIORITY,
});

// Copy Trade Wallet Lists
export const loadCopyTradeWalletLists = (): WalletList[] =>
  loadFromStorage(STORAGE_KEYS.copytradeWalletLists, []);

export const loadWalletLists = loadCopyTradeWalletLists;

export const saveCopyTradeWalletLists = (lists: WalletList[]): void =>
  saveToStorage(STORAGE_KEYS.copytradeWalletLists, lists);

export const saveWalletLists = saveCopyTradeWalletLists;

export const createWalletList = (
  name: string,
  addresses: string[],
): WalletList => ({
  id: generateWalletListId(),
  name: name.trim(),
  addresses: [...addresses],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const addWalletList = (list: WalletList): WalletList[] => {
  const lists = loadCopyTradeWalletLists();
  const updated = [...lists, list];
  saveCopyTradeWalletLists(updated);
  return updated;
};

export const updateWalletList = (list: WalletList): WalletList[] => {
  const lists = loadCopyTradeWalletLists();
  const updated = lists.map((l) =>
    l.id === list.id ? { ...list, updatedAt: Date.now() } : l,
  );
  saveCopyTradeWalletLists(updated);
  return updated;
};

export const deleteWalletList = (id: string): WalletList[] => {
  const lists = loadCopyTradeWalletLists().filter((l) => l.id !== id);
  saveCopyTradeWalletLists(lists);
  return lists;
};

export const getWalletListById = (listId: string): WalletList | undefined => {
  const lists = loadCopyTradeWalletLists();
  return lists.find((list) => list.id === listId);
};

// Copy Trade Execution Logs
export const loadCopyTradeLogs = (): CopyTradeExecutionLog[] =>
  loadFromStorage(STORAGE_KEYS.copytradeExecutionLogs, []);

export const saveCopyTradeLogs = (logs: CopyTradeExecutionLog[]): void =>
  saveToStorage(
    STORAGE_KEYS.copytradeExecutionLogs,
    logs.slice(-MAX_EXECUTION_LOGS),
  );

export const addCopyTradeLog = (
  log: CopyTradeExecutionLog,
): CopyTradeExecutionLog[] => {
  const logs = [log, ...loadCopyTradeLogs()];
  saveCopyTradeLogs(logs);
  return logs;
};

export const clearCopyTradeLogs = (): void =>
  localStorage.removeItem(STORAGE_KEYS.copytradeExecutionLogs);

export const getCopyTradeLogsByProfileId = (
  profileId: string,
): CopyTradeExecutionLog[] => {
  const logs = loadCopyTradeLogs();
  return logs.filter((log) => log.profileId === profileId);
};

// ============================================================================
// Automate (Strategy) Storage
// ============================================================================

export const loadStrategies = (): TradingStrategy[] =>
  loadFromStorage(STORAGE_KEYS.automateStrategies, []);

export const saveStrategies = (strategies: TradingStrategy[]): void =>
  saveToStorage(STORAGE_KEYS.automateStrategies, strategies);

export const addStrategy = (strategy: TradingStrategy): TradingStrategy[] => {
  const strategies = loadStrategies();
  const updated = [...strategies, strategy];
  saveStrategies(updated);
  return updated;
};

export const updateStrategy = (
  strategy: TradingStrategy,
): TradingStrategy[] => {
  const strategies = loadStrategies();
  const updated = strategies.map((s) =>
    s.id === strategy.id ? { ...strategy, updatedAt: Date.now() } : s,
  );
  saveStrategies(updated);
  return updated;
};

export const deleteStrategy = (id: string): TradingStrategy[] => {
  const strategies = loadStrategies().filter((s) => s.id !== id);
  saveStrategies(strategies);
  return strategies;
};

export const toggleStrategy = (id: string): TradingStrategy[] => {
  const strategies = loadStrategies();
  const updated = strategies.map((s) =>
    s.id === id ? { ...s, isActive: !s.isActive, updatedAt: Date.now() } : s,
  );
  saveStrategies(updated);
  return updated;
};

export const createDefaultStrategy = (
  name = "New Strategy",
): TradingStrategy => ({
  id: generateProfileId("automate"),
  name,
  description: "",
  conditions: [],
  conditionLogic: "and",
  actions: [],
  isActive: false,
  cooldown: PROFILE_DEFAULTS.AUTOMATE.COOLDOWN,
  cooldownUnit: PROFILE_DEFAULTS.AUTOMATE.COOLDOWN_UNIT,
  maxExecutions: undefined,
  executionCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  whitelistedAddresses: [],
  tokenAddresses: [],
  walletAddresses: [],
});

export const createDefaultTradingCondition = (): TradingCondition => ({
  id: generateConditionId(),
  type: "marketCap",
  operator: "greater",
  value: PROFILE_DEFAULTS.AUTOMATE.DEFAULT_CONDITION_VALUE,
  timeframe: PROFILE_DEFAULTS.AUTOMATE.DEFAULT_TIMEFRAME,
});

export const createDefaultTradingAction = (): TradingAction => ({
  id: generateActionId(),
  type: "buy",
  amountType: "percentage",
  amount: PROFILE_DEFAULTS.AUTOMATE.DEFAULT_ACTION_AMOUNT,
  volumeType: "buyVolume",
  volumeMultiplier: PROFILE_DEFAULTS.AUTOMATE.DEFAULT_VOLUME_MULTIPLIER,
  slippage: PROFILE_DEFAULTS.COPYTRADE.SLIPPAGE,
  priority: PROFILE_DEFAULTS.COPYTRADE.PRIORITY,
});

// Whitelist Lists for Automate
export const loadWhitelistLists = (): WalletList[] =>
  loadFromStorage(STORAGE_KEYS.automateWhitelistLists, []);

export const saveWhitelistLists = (lists: WalletList[]): void =>
  saveToStorage(STORAGE_KEYS.automateWhitelistLists, lists);

export const createWhitelistList = (
  name: string,
  addresses: string[],
): WalletList => ({
  id: generateWalletListId(),
  name: name.trim(),
  addresses: [...addresses],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const addWhitelistList = (list: WalletList): WalletList[] => {
  const lists = loadWhitelistLists();
  const updated = [...lists, list];
  saveWhitelistLists(updated);
  return updated;
};

export const updateWhitelistList = (list: WalletList): WalletList[] => {
  const lists = loadWhitelistLists();
  const updated = lists.map((l) =>
    l.id === list.id ? { ...list, updatedAt: Date.now() } : l,
  );
  saveWhitelistLists(updated);
  return updated;
};

export const deleteWhitelistList = (id: string): WalletList[] => {
  const lists = loadWhitelistLists().filter((l) => l.id !== id);
  saveWhitelistLists(lists);
  return lists;
};

// ============================================================================
// Export/Import Functions
// ============================================================================

export const exportAllProfiles = (): string => {
  const data = {
    sniperProfiles: loadSniperProfiles(),
    copytradeProfiles: loadCopyTradeProfiles(),
    copytradeWalletLists: loadCopyTradeWalletLists(),
    strategies: loadStrategies(),
    whitelistLists: loadWhitelistLists(),
    exportedAt: Date.now(),
  };
  return JSON.stringify(data, null, 2);
};

interface ImportData {
  sniperProfiles?: SniperProfile[];
  copytradeProfiles?: CopyTradeProfile[];
  strategies?: TradingStrategy[];
}

export const importAllProfiles = (
  jsonString: string,
): {
  sniper: number;
  copytrade: number;
  automate: number;
} => {
  try {
    const data = JSON.parse(jsonString) as ImportData;
    const counts = { sniper: 0, copytrade: 0, automate: 0 };

    if (Array.isArray(data.sniperProfiles)) {
      const existing = loadSniperProfiles();
      const existingIds = new Set(existing.map((p) => p.id));
      const newProfiles: SniperProfile[] = data.sniperProfiles.map((p) => ({
        ...p,
        id: existingIds.has(p.id) ? generateProfileId("sniper") : p.id,
        isActive: false,
        executionCount: 0,
      }));
      saveSniperProfiles([...existing, ...newProfiles]);
      counts.sniper = newProfiles.length;
    }

    if (Array.isArray(data.copytradeProfiles)) {
      const existing = loadCopyTradeProfiles();
      const existingIds = new Set(existing.map((p) => p.id));
      const newProfiles: CopyTradeProfile[] = data.copytradeProfiles.map(
        (p) => ({
          ...p,
          id: existingIds.has(p.id) ? generateProfileId("copytrade") : p.id,
          isActive: false,
          executionCount: 0,
        }),
      );
      saveCopyTradeProfiles([...existing, ...newProfiles]);
      counts.copytrade = newProfiles.length;
    }

    if (Array.isArray(data.strategies)) {
      const existing = loadStrategies();
      const existingIds = new Set(existing.map((s) => s.id));
      const newStrategies: TradingStrategy[] = data.strategies.map((s) => ({
        ...s,
        id: existingIds.has(s.id) ? generateProfileId("automate") : s.id,
        isActive: false,
        executionCount: 0,
      }));
      saveStrategies([...existing, ...newStrategies]);
      counts.automate = newStrategies.length;
    }

    return counts;
  } catch (error) {
    console.error("Import error:", error);
    throw error;
  }
};

export const duplicateProfile = <T extends { id: string; name: string }>(
  profile: T,
  type: ToolType,
): T => ({
  ...profile,
  id: generateProfileId(type),
  name: `${profile.name} (Copy)`,
  isActive: false,
  executionCount: 0,
  lastExecuted: undefined,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
