/**
 * Unified Trading Tools Storage
 * 
 * LocalStorage management for all trading profiles and execution logs
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
} from './types';

// ============================================================================
// Storage Keys (using original keys for backwards compatibility)
// ============================================================================

const STORAGE_KEYS = {
  // Sniper Bot
  sniperProfiles: 'sniperBotProfiles',
  sniperExecutionLogs: 'sniperBotExecutionLogs',
  
  // Copy Trade
  copytradeProfiles: 'copytradeProfiles',
  copytradeWalletLists: 'copytradeWalletLists',
  copytradeExecutionLogs: 'copytradeExecutionLogs',
  
  // Automate
  automateStrategies: 'automateStrategies',
  automateWhitelistLists: 'whitelistLists',
} as const;

const MAX_EXECUTION_LOGS = 500;

// ============================================================================
// ID Generators
// ============================================================================

const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateProfileId = (type?: ToolType): string => {
  const prefix = type || 'profile';
  return `${prefix}_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateFilterId = (): string => generateId('sniper_filter');
export const generateConditionId = (): string => generateId('cond');
export const generateActionId = (): string => generateId('action');
export const generateLogId = (): string => generateId('log');
export const generateExecutionLogId = (): string => generateId('log');
export const generateWalletListId = (): string => generateId('wlist');

// ============================================================================
// Generic Storage Functions
// ============================================================================

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
  }
  return defaultValue;
};

const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
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

export const updateSniperProfile = (profile: SniperProfile): SniperProfile[] => {
  const profiles = loadSniperProfiles();
  const updated = profiles.map(p => 
    p.id === profile.id ? { ...profile, updatedAt: Date.now() } : p
  );
  saveSniperProfiles(updated);
  return updated;
};

export const deleteSniperProfile = (id: string): SniperProfile[] => {
  const profiles = loadSniperProfiles().filter(p => p.id !== id);
  saveSniperProfiles(profiles);
  return profiles;
};

export const getSniperProfileById = (profileId: string): SniperProfile | undefined => {
  const profiles = loadSniperProfiles();
  return profiles.find(profile => profile.id === profileId);
};

export const toggleSniperProfile = (id: string): SniperProfile[] => {
  const profiles = loadSniperProfiles();
  const updated = profiles.map(p =>
    p.id === id ? { ...p, isActive: !p.isActive, updatedAt: Date.now() } : p
  );
  saveSniperProfiles(updated);
  return updated;
};

export const createDefaultSniperProfile = (name = 'New Sniper'): SniperProfile => ({
  id: generateProfileId('sniper'),
  name,
  description: '',
  isActive: false,
  eventType: 'deploy',
  filters: [],
  buyAmountType: 'fixed',
  buyAmount: 0.01,
  slippage: 15,
  priority: 'high',
  cooldown: 1000,
  cooldownUnit: 'milliseconds',
  maxExecutions: undefined,
  executionCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Alias for backwards compatibility
export const createDefaultProfile = createDefaultSniperProfile;

export const createDefaultSniperFilter = (): SniperFilter => ({
  id: generateFilterId(),
  enabled: true,
  platform: undefined,
  mint: undefined,
  signer: undefined,
  namePattern: undefined,
  nameMatchType: 'contains',
  symbolPattern: undefined,
  symbolMatchType: 'contains',
});

// Alias for backwards compatibility
export const createDefaultFilter = createDefaultSniperFilter;

// Sniper Execution Logs
export const loadSniperLogs = (): SniperExecutionLog[] => 
  loadFromStorage(STORAGE_KEYS.sniperExecutionLogs, []);

// Alias for backwards compatibility
export const loadExecutionLogs = loadSniperLogs;

export const saveSniperLogs = (logs: SniperExecutionLog[]): void => 
  saveToStorage(STORAGE_KEYS.sniperExecutionLogs, logs.slice(-MAX_EXECUTION_LOGS));

// Alias for backwards compatibility
export const saveExecutionLogs = saveSniperLogs;

export const addSniperLog = (log: SniperExecutionLog): SniperExecutionLog[] => {
  const logs = [log, ...loadSniperLogs()];
  saveSniperLogs(logs);
  return logs;
};

// Alias for backwards compatibility
export const addExecutionLog = addSniperLog;

export const clearSniperLogs = (): void => 
  localStorage.removeItem(STORAGE_KEYS.sniperExecutionLogs);

// Alias for backwards compatibility
export const clearExecutionLogs = clearSniperLogs;

export const getSniperLogsByProfileId = (profileId: string): SniperExecutionLog[] => {
  const logs = loadSniperLogs();
  return logs.filter(log => log.profileId === profileId);
};

// Alias for backwards compatibility
export const getExecutionLogsByProfileId = getSniperLogsByProfileId;

export const getSuccessfulSnipeCount = (): number => {
  const logs = loadSniperLogs();
  return logs.filter(log => log.success).length;
};

// ============================================================================
// Copy Trade Storage
// ============================================================================

export const loadCopyTradeProfiles = (): CopyTradeProfile[] => 
  loadFromStorage(STORAGE_KEYS.copytradeProfiles, []);

export const saveCopyTradeProfiles = (profiles: CopyTradeProfile[]): void => 
  saveToStorage(STORAGE_KEYS.copytradeProfiles, profiles);

export const addCopyTradeProfile = (profile: CopyTradeProfile): CopyTradeProfile[] => {
  const profiles = loadCopyTradeProfiles();
  const updated = [...profiles, profile];
  saveCopyTradeProfiles(updated);
  return updated;
};

export const updateCopyTradeProfile = (profile: CopyTradeProfile): CopyTradeProfile[] => {
  const profiles = loadCopyTradeProfiles();
  const updated = profiles.map(p => 
    p.id === profile.id ? { ...profile, updatedAt: Date.now() } : p
  );
  saveCopyTradeProfiles(updated);
  return updated;
};

export const deleteCopyTradeProfile = (id: string): CopyTradeProfile[] => {
  const profiles = loadCopyTradeProfiles().filter(p => p.id !== id);
  saveCopyTradeProfiles(profiles);
  return profiles;
};

export const getCopyTradeProfileById = (profileId: string): CopyTradeProfile | undefined => {
  const profiles = loadCopyTradeProfiles();
  return profiles.find(profile => profile.id === profileId);
};

export const toggleCopyTradeProfile = (id: string): CopyTradeProfile[] => {
  const profiles = loadCopyTradeProfiles();
  const updated = profiles.map(p =>
    p.id === id ? { ...p, isActive: !p.isActive, updatedAt: Date.now() } : p
  );
  saveCopyTradeProfiles(updated);
  return updated;
};

export const createDefaultCopyTradeProfile = (name = 'New Copy Trade'): CopyTradeProfile => ({
  id: generateProfileId('copytrade'),
  name,
  description: '',
  isActive: false,
  mode: 'simple',
  simpleConfig: {
    amountMultiplier: 1.0,
    slippage: 5,
    priority: 'medium',
    mirrorTradeType: true,
  },
  conditions: [],
  conditionLogic: 'and',
  actions: [],
  walletListId: null,
  walletAddresses: [],
  tokenFilterMode: 'all',
  specificTokens: [],
  blacklistedTokens: [],
  cooldown: 5,
  cooldownUnit: 'seconds',
  maxExecutions: undefined,
  executionCount: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const createDefaultCopyTradeCondition = (): CopyTradeCondition => ({
  id: generateConditionId(),
  type: 'tradeSize',
  operator: 'greater',
  value: 0.1,
});

export const createDefaultCopyTradeAction = (): CopyTradeAction => ({
  id: generateActionId(),
  type: 'mirror',
  amountType: 'multiplier',
  amount: 1.0,
  slippage: 5,
  priority: 'medium',
});

// Copy Trade Wallet Lists
export const loadCopyTradeWalletLists = (): WalletList[] => 
  loadFromStorage(STORAGE_KEYS.copytradeWalletLists, []);

// Alias for backwards compatibility
export const loadWalletLists = loadCopyTradeWalletLists;

export const saveCopyTradeWalletLists = (lists: WalletList[]): void => 
  saveToStorage(STORAGE_KEYS.copytradeWalletLists, lists);

// Alias for backwards compatibility
export const saveWalletLists = saveCopyTradeWalletLists;

export const createWalletList = (name: string, addresses: string[]): WalletList => ({
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
  const updated = lists.map(l => 
    l.id === list.id ? { ...list, updatedAt: Date.now() } : l
  );
  saveCopyTradeWalletLists(updated);
  return updated;
};

export const deleteWalletList = (id: string): WalletList[] => {
  const lists = loadCopyTradeWalletLists().filter(l => l.id !== id);
  saveCopyTradeWalletLists(lists);
  return lists;
};

export const getWalletListById = (listId: string): WalletList | undefined => {
  const lists = loadCopyTradeWalletLists();
  return lists.find(list => list.id === listId);
};

// Copy Trade Execution Logs
export const loadCopyTradeLogs = (): CopyTradeExecutionLog[] => 
  loadFromStorage(STORAGE_KEYS.copytradeExecutionLogs, []);

export const saveCopyTradeLogs = (logs: CopyTradeExecutionLog[]): void => 
  saveToStorage(STORAGE_KEYS.copytradeExecutionLogs, logs.slice(-MAX_EXECUTION_LOGS));

export const addCopyTradeLog = (log: CopyTradeExecutionLog): CopyTradeExecutionLog[] => {
  const logs = [log, ...loadCopyTradeLogs()];
  saveCopyTradeLogs(logs);
  return logs;
};

export const clearCopyTradeLogs = (): void => 
  localStorage.removeItem(STORAGE_KEYS.copytradeExecutionLogs);

export const getCopyTradeLogsByProfileId = (profileId: string): CopyTradeExecutionLog[] => {
  const logs = loadCopyTradeLogs();
  return logs.filter(log => log.profileId === profileId);
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

export const updateStrategy = (strategy: TradingStrategy): TradingStrategy[] => {
  const strategies = loadStrategies();
  const updated = strategies.map(s => 
    s.id === strategy.id ? { ...strategy, updatedAt: Date.now() } : s
  );
  saveStrategies(updated);
  return updated;
};

export const deleteStrategy = (id: string): TradingStrategy[] => {
  const strategies = loadStrategies().filter(s => s.id !== id);
  saveStrategies(strategies);
  return strategies;
};

export const toggleStrategy = (id: string): TradingStrategy[] => {
  const strategies = loadStrategies();
  const updated = strategies.map(s =>
    s.id === id ? { ...s, isActive: !s.isActive, updatedAt: Date.now() } : s
  );
  saveStrategies(updated);
  return updated;
};

export const createDefaultStrategy = (name = 'New Strategy'): TradingStrategy => ({
  id: generateProfileId('automate'),
  name,
  description: '',
  conditions: [],
  conditionLogic: 'and',
  actions: [],
  isActive: false,
  cooldown: 5,
  cooldownUnit: 'minutes',
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
  type: 'marketCap',
  operator: 'greater',
  value: 1000000,
  timeframe: 5,
});

export const createDefaultTradingAction = (): TradingAction => ({
  id: generateActionId(),
  type: 'buy',
  amountType: 'percentage',
  amount: 10,
  volumeType: 'buyVolume',
  volumeMultiplier: 0.1,
  slippage: 5,
  priority: 'medium',
});

// Whitelist Lists for Automate
export const loadWhitelistLists = (): WalletList[] => 
  loadFromStorage(STORAGE_KEYS.automateWhitelistLists, []);

export const saveWhitelistLists = (lists: WalletList[]): void => 
  saveToStorage(STORAGE_KEYS.automateWhitelistLists, lists);

export const createWhitelistList = (name: string, addresses: string[]): WalletList => ({
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
  const updated = lists.map(l => 
    l.id === list.id ? { ...list, updatedAt: Date.now() } : l
  );
  saveWhitelistLists(updated);
  return updated;
};

export const deleteWhitelistList = (id: string): WalletList[] => {
  const lists = loadWhitelistLists().filter(l => l.id !== id);
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

export const exportProfilesToJson = (): string => {
  const profiles = loadSniperProfiles();
  return JSON.stringify(profiles, null, 2);
};

export const exportProfileToJson = (profileId: string): string | null => {
  const profile = getSniperProfileById(profileId);
  if (!profile) return null;
  return JSON.stringify(profile, null, 2);
};

export const importProfilesFromJson = (jsonString: string): number => {
  try {
    const importedProfiles = JSON.parse(jsonString) as SniperProfile[];
    
    if (!Array.isArray(importedProfiles)) {
      throw new Error('Invalid format: expected an array of profiles');
    }
    
    const currentProfiles = loadSniperProfiles();
    const existingIds = new Set(currentProfiles.map(p => p.id));
    
    const newProfiles = importedProfiles.map(profile => ({
      ...profile,
      id: existingIds.has(profile.id) ? generateProfileId('sniper') : profile.id,
      isActive: false,
      executionCount: 0,
      lastExecuted: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
    
    const mergedProfiles = [...currentProfiles, ...newProfiles];
    saveSniperProfiles(mergedProfiles);
    
    return newProfiles.length;
  } catch (error) {
    console.error('Error importing profiles:', error);
    throw error;
  }
};

interface ImportData {
  sniperProfiles?: SniperProfile[];
  copytradeProfiles?: CopyTradeProfile[];
  strategies?: TradingStrategy[];
}

export const importAllProfiles = (jsonString: string): { 
  sniper: number; 
  copytrade: number; 
  automate: number 
} => {
  try {
    const data = JSON.parse(jsonString) as ImportData;
    const counts = { sniper: 0, copytrade: 0, automate: 0 };

    if (Array.isArray(data.sniperProfiles)) {
      const existing = loadSniperProfiles();
      const existingIds = new Set(existing.map(p => p.id));
      const newProfiles: SniperProfile[] = data.sniperProfiles.map((p) => ({
        ...p,
        id: existingIds.has(p.id) ? generateProfileId('sniper') : p.id,
        isActive: false,
        executionCount: 0,
      }));
      saveSniperProfiles([...existing, ...newProfiles]);
      counts.sniper = newProfiles.length;
    }

    if (Array.isArray(data.copytradeProfiles)) {
      const existing = loadCopyTradeProfiles();
      const existingIds = new Set(existing.map(p => p.id));
      const newProfiles: CopyTradeProfile[] = data.copytradeProfiles.map((p) => ({
        ...p,
        id: existingIds.has(p.id) ? generateProfileId('copytrade') : p.id,
        isActive: false,
        executionCount: 0,
      }));
      saveCopyTradeProfiles([...existing, ...newProfiles]);
      counts.copytrade = newProfiles.length;
    }

    if (Array.isArray(data.strategies)) {
      const existing = loadStrategies();
      const existingIds = new Set(existing.map(s => s.id));
      const newStrategies: TradingStrategy[] = data.strategies.map((s) => ({
        ...s,
        id: existingIds.has(s.id) ? generateProfileId('automate') : s.id,
        isActive: false,
        executionCount: 0,
      }));
      saveStrategies([...existing, ...newStrategies]);
      counts.automate = newStrategies.length;
    }

    return counts;
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
};

export const duplicateProfile = <T extends { id: string; name: string }>(
  profile: T,
  type: ToolType
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

export const duplicateSniperProfile = (profileId: string): SniperProfile | null => {
  const profile = getSniperProfileById(profileId);
  if (!profile) return null;
  
  const duplicated: SniperProfile = {
    ...profile,
    id: generateProfileId('sniper'),
    name: `${profile.name} (Copy)`,
    isActive: false,
    executionCount: 0,
    lastExecuted: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    filters: profile.filters.map(f => ({
      ...f,
      id: generateFilterId()
    }))
  };
  
  addSniperProfile(duplicated);
  return duplicated;
};
