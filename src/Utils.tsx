import type { Connection } from '@solana/web3.js';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';
import type { TradingStrategy } from './automate/types';
import { formatAddress as _formatAddress, formatTokenBalance as _formatTokenBalance } from './utils/formatting';

export type WalletCategory = 'Soft' | 'Medium' | 'Hard';

export interface WalletType {
  id: number;
  address: string;
  privateKey: string;
  isActive: boolean;
  tokenBalance?: number;
  label?: string;
  category?: WalletCategory;
  isArchived?: boolean;
  [key: string]: unknown;
}

export interface ConfigType {
  rpcEndpoint: string;
  transactionFee: string;
  selectedDex: string;
  isDropdownOpen: boolean;
  buyAmount: string;
  sellAmount: string;
  slippageBps: string; // Slippage in basis points (e.g., "100" = 1%)
  bundleMode: string; // Default bundle mode preference ('single', 'batch', 'all-in-one')
  singleDelay: string; // Delay between wallets in single mode (milliseconds)
  batchDelay: string; // Delay between batches in batch mode (milliseconds)
  tradingServerEnabled: string; // Whether to use self-hosted trading server ('true' or 'false')
  tradingServerUrl: string; // URL of the self-hosted trading server
}

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

export const createNewWallet = (): WalletType => {
  const keypair = Keypair.generate();
  const address = keypair.publicKey.toString();
  const privateKey = bs58.encode(keypair.secretKey);
  
  return {
    id: Date.now(),
    address,
    privateKey,
    isActive: false,
    category: 'Medium'
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
      id: Date.now(),
      address,
      privateKey: privateKeyString,
      isActive: false,
      category: 'Medium'
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
export const fetchTokenBalance = async (
  connection: Connection,
  walletAddress: string,
  tokenMint: string
): Promise<number> => {
  try {
    const walletPublicKey = new PublicKey(walletAddress);
    const tokenMintPublicKey = new PublicKey(tokenMint);

    // Find token account
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      {
        mint: tokenMintPublicKey
      }, 
      "processed"
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
    const balance = await connection.getBalance(publicKey, "processed");
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
  connection: Connection,
  wallets: WalletType[],
  tokenAddress: string,
  setSolBalances: (balances: Map<string, number>) => void,
  setTokenBalances: (balances: Map<string, number>) => void,
  currentSolBalances?: Map<string, number>,
  currentTokenBalances?: Map<string, number>
): Promise<{ solBalances: Map<string, number>; tokenBalances: Map<string, number> }> => {
  // Start with existing balances to preserve them on errors
  const newSolBalances = new Map(currentSolBalances || new Map<string, number>());
  const newTokenBalances = new Map(currentTokenBalances || new Map<string, number>());
  
  // Process wallets sequentially
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    
    try {
      // Fetch SOL balance
      const solBalance = await fetchSolBalance(connection, wallet.address);
      newSolBalances.set(wallet.address, solBalance);
      
      // Update SOL balances immediately to show progress
      setSolBalances(new Map(newSolBalances));
      
      // Fetch token balance if token address is provided
      if (tokenAddress) {
        const tokenBalance = await fetchTokenBalance(connection, wallet.address, tokenAddress);
        newTokenBalances.set(wallet.address, tokenBalance);
        
        // Update token balances immediately to show progress
        setTokenBalances(new Map(newTokenBalances));
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

export interface QuickBuyPreferences {
  quickBuyEnabled: boolean;
  quickBuyAmount: number;
  quickBuyMinAmount: number;
  quickBuyMaxAmount: number;
  useQuickBuyRange: boolean;
  quickSellPercentage: number;
  quickSellMinPercentage: number;
  quickSellMaxPercentage: number;
  useQuickSellRange: boolean;
}

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