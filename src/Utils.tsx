import type { Connection } from '@solana/web3.js';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';
import { formatAddress as _formatAddress, formatTokenBalance as _formatTokenBalance } from './utils/formatting';
import { deriveWalletFromMnemonic } from './utils/hdWallet';
import { createDefaultEndpoints } from './utils/rpcManager';
import type {
  WalletCategory,
  WalletSource,
  MasterWallet,
  CustomQuickTradeSettings,
  WalletType,
  ConfigType,
  QuickBuyPreferences,
  TradingStrategy,
} from './utils/types';

// Re-export types for backward compatibility
export type { WalletCategory, WalletSource, MasterWallet, CustomQuickTradeSettings, WalletType, ConfigType, QuickBuyPreferences };

export const toggleWallet = (wallets: WalletType[], id: number): WalletType[] => {
  return wallets.map(wallet => 
    wallet.id === id ? { ...wallet, isActive: !wallet.isActive } : wallet
  );
};

export const deleteWallet = (wallets: WalletType[], id: number): WalletType[] => {
  return wallets.filter(wallet => wallet.id !== id);
};

// Database setup
const DB_NAME = 'WalletDB';
const DB_VERSION = 1;
const WALLET_STORE = 'wallets';

// Initialize database immediately
let db: IDBDatabase | null = null;
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onerror = () => {
  console.error('Error opening database:', request.error);
};

request.onsuccess = () => {
  db = request.result;
};

request.onupgradeneeded = () => {
  db = request.result;
  if (!db.objectStoreNames.contains(WALLET_STORE)) {
    // Create object store for encrypted wallet data
    db.createObjectStore(WALLET_STORE, { keyPath: 'id' });
  }
};

const CONFIG_COOKIE_KEY = 'config';
const QUICK_BUY_COOKIE_KEY = 'quickBuyPreferences';
const TRADING_STRATEGIES_COOKIE_KEY = 'tradingStrategies';

// Encryption setup
const ENCRYPTION_KEY = 'raze-bot-wallet-encryption-key';
const ENCRYPTED_STORAGE_KEY = 'encrypted_wallets';
const ENCRYPTED_MASTER_WALLETS_KEY = 'encrypted_master_wallets';

// Encryption helper functions
const encryptData = (data: string): string => {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
};

const decryptData = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedData) {
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
    return decryptedData;
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Export encryption utilities for potential external use
export const encryptWalletData = (data: string): string => {
  return encryptData(data);
};

export const decryptWalletData = (encryptedData: string): string => {
  return decryptData(encryptedData);
};

// Function to check if wallet data is encrypted
export const isWalletDataEncrypted = (): boolean => {
  const encryptedData = localStorage.getItem(ENCRYPTED_STORAGE_KEY);
  const unencryptedData = localStorage.getItem('wallets');
  return !!encryptedData && !unencryptedData;
};

// Function to migrate unencrypted data to encrypted storage
export const migrateToEncryptedStorage = (): boolean => {
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
};

// ============= Master Wallet Storage Functions =============

/**
 * Save master wallets to encrypted storage
 */
export const saveMasterWallets = (masterWallets: MasterWallet[]): void => {
  try {
    const data = JSON.stringify(masterWallets);
    const encrypted = encryptData(data);
    localStorage.setItem(ENCRYPTED_MASTER_WALLETS_KEY, encrypted);
  } catch (error) {
    console.error('Error saving master wallets:', error);
    throw new Error('Failed to save master wallets');
  }
};

/**
 * Load master wallets from encrypted storage
 */
export const loadMasterWallets = (): MasterWallet[] => {
  try {
    const encrypted = localStorage.getItem(ENCRYPTED_MASTER_WALLETS_KEY);
    if (!encrypted) {
      return [];
    }
    
    const decrypted = decryptData(encrypted);
    const masterWallets = JSON.parse(decrypted) as MasterWallet[];
    return masterWallets;
  } catch (error) {
    console.error('Error loading master wallets:', error);
    return [];
  }
};

/**
 * Create a new master wallet entry
 */
export const createMasterWallet = (
  name: string,
  mnemonic: string,
  color?: string
): MasterWallet => {
  const encryptedMnemonic = encryptData(mnemonic);
  
  return {
    id: `master_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    encryptedMnemonic,
    accountCount: 0,
    createdAt: Date.now(),
    color,
  };
};

/**
 * Get mnemonic from master wallet (decrypted)
 */
export const getMasterWalletMnemonic = (masterWallet: MasterWallet): string => {
  try {
    return decryptData(masterWallet.encryptedMnemonic);
  } catch (error) {
    console.error('Error decrypting master wallet mnemonic:', error);
    throw new Error('Failed to decrypt mnemonic');
  }
};

/**
 * Update master wallet account count
 */
export const updateMasterWalletAccountCount = (
  masterWallets: MasterWallet[],
  masterWalletId: string,
  accountCount: number
): MasterWallet[] => {
  return masterWallets.map(mw => 
    mw.id === masterWalletId ? { ...mw, accountCount } : mw
  );
};

/**
 * Delete a master wallet
 */
export const deleteMasterWallet = (
  masterWallets: MasterWallet[],
  masterWalletId: string
): MasterWallet[] => {
  return masterWallets.filter(mw => mw.id !== masterWalletId);
};

/**
 * Create HD-derived wallet from master wallet
 */
// Generate unique wallet ID with timestamp and random component
const generateWalletId = (): number => {
  // Use timestamp + random number to ensure uniqueness even when created rapidly
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
};

export const createHDWalletFromMaster = (
  masterWallet: MasterWallet,
  accountIndex: number,
  category: WalletCategory = 'Medium'
): WalletType => {
  const mnemonic = getMasterWalletMnemonic(masterWallet);
  const derived = deriveWalletFromMnemonic(mnemonic, accountIndex);
  
  return {
    id: generateWalletId() + accountIndex, // Ensure unique ID
    address: derived.address,
    privateKey: derived.privateKey,
    isActive: false,
    category,
    source: 'hd-derived',
    masterWalletId: masterWallet.id,
    derivationIndex: accountIndex,
  };
};

export const createNewWallet = (): WalletType => {
  const keypair = Keypair.generate();
  const address = keypair.publicKey.toString();
  const privateKey = bs58.encode(keypair.secretKey);
  
  return {
    id: generateWalletId(),
    address,
    privateKey,
    isActive: false,
    category: 'Medium',
    source: 'imported' // Mark as imported (not HD-derived)
  };
};

export const importWallet = (
  privateKeyString: string
): { wallet: WalletType | null; error?: string } => {
  try {
    // Basic validation
    if (!privateKeyString.trim()) {
      return { wallet: null, error: 'Private key cannot be empty' };
    }

    // Try to decode the private key
    let privateKeyBytes;
    try {
      privateKeyBytes = bs58.decode(privateKeyString);
      
      // Validate key length (Solana private keys are 64 bytes)
      if (privateKeyBytes.length !== 64) {
        return { wallet: null, error: 'Invalid private key length' };
      }
    } catch {
      return { wallet: null, error: 'Invalid private key format' };
    }

    // Create keypair and get address
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    const address = keypair.publicKey.toString();
    
    const wallet: WalletType = {
      id: generateWalletId(),
      address,
      privateKey: privateKeyString,
      isActive: false,
      category: 'Medium',
      source: 'imported' // Mark as imported (not HD-derived)
    };
    
    return { wallet };
  } catch (error) {
    console.error('Error importing wallet:', error);
    return { wallet: null, error: 'Failed to import wallet' };
  }
};

// Re-export from shared formatting utilities for backward compatibility
export const formatAddress = _formatAddress;

export const getWalletDisplayName = (wallet: WalletType): string => {
  return wallet.label && wallet.label.trim() ? wallet.label : formatAddress(wallet.address);
};

export const copyToClipboard = async (text: string, showToast: (message: string, type: 'success' | 'error') => void): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied successfully", "success")

    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};
export const getActiveWalletPrivateKeys = (): string => {
  try {
    const activeWallets = getActiveWallets()
    return activeWallets
      .map(wallet => wallet.privateKey)
      .join(',');
  } catch (error) {
    console.error('Error getting private keys:', error);
    return '';
  }
};
export const getWallets = (): WalletType[] => {
  try {
    // Use the encrypted loading function
    return loadWalletsFromCookies();
  } catch (error) {
    console.error('Error loading wallets:', error);
    return [];
  }
};
export const getActiveWallets = (): WalletType[] => {
  try {
    const wallets = loadWalletsFromCookies();
    return wallets.filter((wallet: WalletType) => wallet.isActive);
  } catch (error) {
    console.error('Error loading active wallets from cookies:', error);
    return [];
  }
};
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('RPC request timeout')), timeoutMs)
    )
  ]);
};

export const fetchTokenBalance = async (
  connection: Connection,
  walletAddress: string,
  tokenMint: string
): Promise<number> => {
  try {
    const walletPublicKey = new PublicKey(walletAddress);
    const tokenMintPublicKey = new PublicKey(tokenMint);

    // Find token account with 1s timeout
    const tokenAccounts = await withTimeout(
      connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        {
          mint: tokenMintPublicKey
        }, 
        "processed"
      ),
      1000
    );

    // If no token account found, return 0
    if (tokenAccounts.value.length === 0) return 0;

    // Get balance from the first token account
    const parsedData = tokenAccounts.value[0].account.data.parsed as { info: { tokenAmount: { uiAmount: number | null } } };
    const balance = parsedData.info.tokenAmount.uiAmount;
    return balance || 0;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
};

export const fetchSolBalance = async (
  connection: Connection,
  walletAddress: string
): Promise<number> => {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await withTimeout(
      connection.getBalance(publicKey, "processed"),
      1000
    );
    return balance / 1e9;
  } catch (error) {
    console.error('Error fetching SOL balance:', error);
    return 0;
  }
};

export const refreshWalletBalance = async (
  wallet: WalletType,
  connection: Connection,
  tokenAddress?: string
): Promise<WalletType> => {
  try {
    if (!tokenAddress) return wallet;
    
    const tokenBalance = await fetchTokenBalance(connection, wallet.address, tokenAddress);
    
    return {
      ...wallet,
      tokenBalance: tokenBalance
    };
  } catch (error) {
    console.error('Error refreshing wallet balance:', error);
    return wallet;
  }
};

/**
 * Fetch both SOL and token balances for all wallets one by one
 * This is the main function for fetching wallet balances with progress tracking
 */
export const fetchWalletBalances = async (
  connectionOrRpcManager: Connection | { createConnection: () => Promise<Connection> },
  wallets: WalletType[],
  tokenAddress: string,
  setSolBalances: (balances: Map<string, number>) => void,
  setTokenBalances: (balances: Map<string, number>) => void,
  currentSolBalances?: Map<string, number>,
  currentTokenBalances?: Map<string, number>,
  onlyIfZeroOrNull: boolean = false
): Promise<{ solBalances: Map<string, number>; tokenBalances: Map<string, number> }> => {
  // Start with existing balances to preserve them on errors
  const newSolBalances = new Map(currentSolBalances || new Map<string, number>());
  const newTokenBalances = new Map(currentTokenBalances || new Map<string, number>());
  
  // Check if we have an RPCManager (has createConnection method) or a Connection
  const isRpcManager = typeof connectionOrRpcManager === 'object' && 'createConnection' in connectionOrRpcManager;
  
  // Process wallets sequentially
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    
    try {
      // Create a new connection for each wallet to rotate endpoints
      let connection: Connection;
      if (isRpcManager) {
        connection = await (connectionOrRpcManager as { createConnection: () => Promise<Connection> }).createConnection();
      } else {
        connection = connectionOrRpcManager;
      }
      
      // Check current SOL balance
      const currentSolBalance = currentSolBalances?.get(wallet.address);
      const shouldFetchSol = !onlyIfZeroOrNull || currentSolBalance === undefined || currentSolBalance === null || currentSolBalance === 0;
      
      // Fetch SOL balance only if needed
      if (shouldFetchSol) {
        const solBalance = await fetchSolBalance(connection, wallet.address);
        newSolBalances.set(wallet.address, solBalance);
        
        // Update SOL balances immediately to show progress
        setSolBalances(new Map(newSolBalances));
      }
      
      // Fetch token balance if token address is provided
      if (tokenAddress) {
        // Check current token balance
        const currentTokenBalance = currentTokenBalances?.get(wallet.address);
        const shouldFetchToken = !onlyIfZeroOrNull || currentTokenBalance === undefined || currentTokenBalance === null || currentTokenBalance === 0;
        
        if (shouldFetchToken) {
          const tokenBalance = await fetchTokenBalance(connection, wallet.address, tokenAddress);
          newTokenBalances.set(wallet.address, tokenBalance);
          
          // Update token balances immediately to show progress
          setTokenBalances(new Map(newTokenBalances));
        }
      }
    } catch (error) {
      console.error(`Error fetching balances for ${wallet.address}:`, error);
    }
    
    // Add 5ms delay between wallets (except for the last one)
    if (i < wallets.length - 1) {
      await new Promise<void>(resolve => setTimeout(resolve, 5));
    }
  }
  
  return { solBalances: newSolBalances, tokenBalances: newTokenBalances };
};



/**
 * Handle wallet sorting by balance
 */
export const handleSortWallets = (
  wallets: WalletType[],
  sortDirection: 'asc' | 'desc',
  setSortDirection: (direction: 'asc' | 'desc') => void,
  solBalances: Map<string, number>,
  setWallets: (wallets: WalletType[]) => void
): void => {
  const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  setSortDirection(newDirection);
  
  const sortedWallets = [...wallets].sort((a, b) => {
    const balanceA = solBalances.get(a.address) || 0;
    const balanceB = solBalances.get(b.address) || 0;
    
    if (newDirection === 'asc') {
      return balanceA - balanceB;
    } else {
      return balanceB - balanceA;
    }
  });
  
  setWallets(sortedWallets);
};

/**
 * Clean up wallets by removing empty and duplicate wallets
 */
export const handleCleanupWallets = (
  wallets: WalletType[],
  solBalances: Map<string, number>,
  tokenBalances: Map<string, number>,
  setWallets: (wallets: WalletType[]) => void,
  showToast: (message: string, type: 'success' | 'error') => void
): void => {
  // Keep track of seen addresses
  const seenAddresses = new Set<string>();
  // Keep track of removal counts
  let emptyCount = 0;
  let duplicateCount = 0;
  
  // Filter out empty wallets and duplicates
  const cleanedWallets = wallets.filter(wallet => {
    // Check for empty balance (no SOL and no tokens)
    const solBalance = solBalances.get(wallet.address) || 0;
    const tokenBalance = tokenBalances.get(wallet.address) || 0;
    
    if (solBalance <= 0 && tokenBalance <= 0) {
      emptyCount++;
      return false;
    }
    
    // Check for duplicates
    if (seenAddresses.has(wallet.address)) {
      duplicateCount++;
      return false;
    }
    
    seenAddresses.add(wallet.address);
    return true;
  });

  // Show appropriate toast message
  if (emptyCount > 0 || duplicateCount > 0) {
    const messages: string[] = [];
    if (emptyCount > 0) {
      messages.push(`${emptyCount} empty wallet${emptyCount === 1 ? '' : 's'}`);
    }
    if (duplicateCount > 0) {
      messages.push(`${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'}`);
    }
    showToast(`Removed ${messages.join(' and ')}`, "success");
  } else {
    showToast("No empty wallets or duplicates found", "success");
  }
  
  setWallets(cleanedWallets);
};


export const saveWalletsToCookies = (wallets: WalletType[]): void => {
  try {
    // Encrypt wallet data before storing
    const walletData = JSON.stringify(wallets);
    const encryptedData = encryptData(walletData);
    
    if (!db) {
      // Fallback to localStorage if DB is not ready
      localStorage.setItem(ENCRYPTED_STORAGE_KEY, encryptedData);
      // Remove old unencrypted data
      localStorage.removeItem('wallets');
      return;
    }

    const transaction = db.transaction(WALLET_STORE, 'readwrite');
    const store = transaction.objectStore(WALLET_STORE);
    
    store.clear();
    // Store encrypted wallet data in IndexedDB
    const encryptedWallet = {
      id: 'encrypted_wallets',
      data: encryptedData
    };
    store.add(encryptedWallet);
    
    // Also save encrypted data to localStorage as backup
    localStorage.setItem(ENCRYPTED_STORAGE_KEY, encryptedData);
    // Remove old unencrypted data
    localStorage.removeItem('wallets');
  } catch (error) {
    console.error('Error saving encrypted wallets:', error);
    // Fallback to localStorage with encryption
    try {
      const walletData = JSON.stringify(wallets);
      const encryptedData = encryptData(walletData);
      localStorage.setItem(ENCRYPTED_STORAGE_KEY, encryptedData);
      localStorage.removeItem('wallets');
    } catch (encryptError) {
      console.error('Error with encryption fallback:', encryptError);
      // Last resort: save unencrypted (should rarely happen)
      localStorage.setItem('wallets', JSON.stringify(wallets));
    }
  }
};

export const loadWalletsFromCookies = (): WalletType[] => {
  try {
    // First try to get encrypted data from localStorage
    const encryptedData = localStorage.getItem(ENCRYPTED_STORAGE_KEY);
    if (encryptedData) {
      try {
        const decryptedData = decryptData(encryptedData);
        const parsedWallets = JSON.parse(decryptedData) as WalletType[];
        return parsedWallets;
      } catch {
        console.error('Error decrypting wallet data');
        // If decryption fails, try to load old unencrypted data as fallback
        const oldWallets = localStorage.getItem('wallets');
        if (oldWallets) {
          console.info('🔄 Loading from old unencrypted storage and migrating...');
          const parsedWallets = JSON.parse(oldWallets) as WalletType[];
          // Migrate to encrypted storage
          saveWalletsToCookies(parsedWallets);
          return parsedWallets;
        }
      }
    }
    
    // Fallback to old unencrypted data if no encrypted data exists
    const oldWallets = localStorage.getItem('wallets');
    if (oldWallets) {
      console.info('🔄 Migrating from unencrypted to encrypted storage...');
      const parsedWallets = JSON.parse(oldWallets) as WalletType[];
      // Migrate to encrypted storage
      saveWalletsToCookies(parsedWallets);
      return parsedWallets;
    }
    
    return [];
  } catch (error) {
    console.error('Error loading wallets:', error);
    return [];
  }
};

export const saveConfigToCookies = (config: ConfigType): void => {
  Cookies.set(CONFIG_COOKIE_KEY, JSON.stringify(config), { expires: 30 });
};

export const loadConfigFromCookies = (): ConfigType | null => {
  const savedConfig = Cookies.get(CONFIG_COOKIE_KEY);
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig) as Partial<ConfigType>;
      // Handle backward compatibility for slippageBps
      if (config.slippageBps === undefined) {
        config.slippageBps = '9900'; // Default 99% slippage
      }
      // Handle backward compatibility for bundleMode
      if (config.bundleMode === undefined) {
        config.bundleMode = 'batch'; // Default to batch mode
      }
      // Handle backward compatibility for delay settings
      if (config.singleDelay === undefined) {
        config.singleDelay = '200'; // Default 200ms delay between wallets in single mode
      }
      if (config.batchDelay === undefined) {
        config.batchDelay = '1000'; // Default 1000ms delay between batches
      }
      // Handle backward compatibility for trading server settings
      if (config.tradingServerEnabled === undefined) {
        config.tradingServerEnabled = 'false'; // Default to disabled
      }
      if (config.tradingServerUrl === undefined) {
        config.tradingServerUrl = 'localhost:4444'; // Default URL
      }
      // Ensure rpcEndpoints exists
      if (config.rpcEndpoints === undefined) {
        config.rpcEndpoints = JSON.stringify(createDefaultEndpoints());
      }
      // Handle backward compatibility for streamApiKey
      if (config.streamApiKey === undefined) {
        config.streamApiKey = ''; // Default to empty (user must configure)
      }
      return config as ConfigType;
    } catch (error) {
      console.error('Error parsing saved config:', error);
      return null;
    }
  }
  return null;
};

// Re-export from shared formatting utilities for backward compatibility
export const formatTokenBalance = _formatTokenBalance;

export const downloadPrivateKey = (wallet: WalletType): void => {
  const blob = new Blob([wallet.privateKey], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wallet-${wallet.address.slice(0, 8)}.key`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
export const downloadAllWallets = (wallets: WalletType[]): void => {
  const formattedText = wallets.map(wallet => (
    `${wallet.address}\n` +
    `${wallet.privateKey}\n\n`
  )).join('');

  const blob = new Blob([formattedText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wallets.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const saveQuickBuyPreferencesToCookies = (preferences: QuickBuyPreferences): void => {
  Cookies.set(QUICK_BUY_COOKIE_KEY, JSON.stringify(preferences), { expires: 30 });
};

export const loadQuickBuyPreferencesFromCookies = (): QuickBuyPreferences | null => {
  const savedPreferences = Cookies.get(QUICK_BUY_COOKIE_KEY);
  if (savedPreferences) {
    try {
      return JSON.parse(savedPreferences) as QuickBuyPreferences;
    } catch (error) {
      console.error('Error parsing saved quick buy preferences:', error);
      return null;
    }
  }
  return null;
};

export const saveTradingStrategiesToCookies = (strategies: TradingStrategy[]): void => {
  Cookies.set(TRADING_STRATEGIES_COOKIE_KEY, JSON.stringify(strategies), { expires: 30 });
};

export const loadTradingStrategiesFromCookies = (): TradingStrategy[] => {
  const savedStrategies = Cookies.get(TRADING_STRATEGIES_COOKIE_KEY);
  if (savedStrategies) {
    try {
      const strategies = JSON.parse(savedStrategies) as TradingStrategy[];
      // Add default cooldownUnit for backward compatibility
      return strategies.map(strategy => ({
        ...strategy,
        cooldownUnit: strategy.cooldownUnit || 'minutes'
      }));
    } catch (error) {
      console.error('Error parsing saved trading strategies:', error);
      return [];
    }
  }
  return [];
};

// Split panel sizes cookie management
const SPLIT_SIZES_COOKIE_KEY = 'splitSizes';
const VIEW_MODE_COOKIE_KEY = 'viewMode';

export type ViewMode = 'simple' | 'advanced';

export const saveViewModeToCookies = (mode: ViewMode): void => {
  try {
    Cookies.set(VIEW_MODE_COOKIE_KEY, mode, { expires: 365 }); // 1 year expiry
  } catch (error) {
    console.error('Error saving view mode to cookies:', error);
  }
};

export const loadViewModeFromCookies = (): ViewMode => {
  try {
    const savedMode = Cookies.get(VIEW_MODE_COOKIE_KEY);
    if (savedMode === 'simple' || savedMode === 'advanced') {
      return savedMode;
    }
  } catch (error) {
    console.error('Error loading view mode from cookies:', error);
  }
  return 'advanced'; // Default to advanced mode
};

export const saveSplitSizesToCookies = (sizes: number[]): void => {
  try {
    Cookies.set(SPLIT_SIZES_COOKIE_KEY, JSON.stringify(sizes), { expires: 365 }); // 1 year expiry
  } catch (error) {
    console.error('Error saving split sizes to cookies:', error);
  }
};

export const loadSplitSizesFromCookies = (): number[] | null => {
  try {
    const savedSizes = Cookies.get(SPLIT_SIZES_COOKIE_KEY);
    if (savedSizes) {
      const sizes = JSON.parse(savedSizes) as number[];
      // Validate sizes array
      if (Array.isArray(sizes) && sizes.length === 2 && sizes.every(size => typeof size === 'number' && size > 0 && size < 100)) {
        return sizes;
      }
    }
  } catch (error) {
    console.error('Error loading split sizes from cookies:', error);
  }
  return null;
};