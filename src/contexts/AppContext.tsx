import React, { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Connection } from '@solana/web3.js';
import { 
  loadWalletsFromCookies, 
  loadConfigFromCookies, 
  saveConfigToCookies,
  saveWalletsToCookies,
  fetchWalletBalances,
  type WalletType, 
  type ConfigType 
} from '../Utils';
import { AppContext } from './AppContextInstance';

export interface AppContextType {
  // Wallet state
  wallets: WalletType[];
  setWallets: (wallets: WalletType[] | ((prev: WalletType[]) => WalletType[])) => void;
  
  // Config state
  config: ConfigType;
  setConfig: (config: ConfigType) => void;
  updateConfig: (key: keyof ConfigType, value: string) => void;
  
  // Connection state
  connection: Connection | null;
  setConnection: (connection: Connection | null) => void;
  
  // Balance state
  solBalances: Map<string, number>;
  setSolBalances: (balances: Map<string, number> | ((prev: Map<string, number>) => Map<string, number>)) => void;
  tokenBalances: Map<string, number>;
  setTokenBalances: (balances: Map<string, number>) => void;
  
  // Refresh state
  isRefreshing: boolean;
  refreshBalances: (tokenAddress?: string) => Promise<void>;
  
  // Toast
  showToast: (message: string, type: 'success' | 'error') => void;
}

const defaultConfig: ConfigType = {
  rpcEndpoint: 'https://solana-rpc.publicnode.com',
  transactionFee: '0.001',
  selectedDex: 'auto',
  isDropdownOpen: false,
  buyAmount: '',
  sellAmount: '',
  slippageBps: '9900',
  bundleMode: 'batch',
  singleDelay: '200',
  batchDelay: '1000',
  tradingServerEnabled: 'false',
  tradingServerUrl: 'https://localhost:4444',
};

interface AppContextProviderProps {
  children: ReactNode;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children, showToast }) => {
  // State
  const [wallets, setWalletsState] = useState<WalletType[]>([]);
  const [config, setConfigState] = useState<ConfigType>(defaultConfig);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [solBalances, setSolBalances] = useState<Map<string, number>>(new Map());
  const [tokenBalances, setTokenBalances] = useState<Map<string, number>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load initial data from cookies
  useEffect(() => {
    try {
      const savedWallets = loadWalletsFromCookies();
      if (savedWallets && savedWallets.length > 0) {
        setWalletsState(savedWallets);
      }

      const savedConfig = loadConfigFromCookies();
      if (savedConfig) {
        setConfigState(savedConfig);
        
        // Create connection from saved config
        if (savedConfig.rpcEndpoint) {
          try {
            const conn = new Connection(savedConfig.rpcEndpoint, 'confirmed');
            setConnection(conn);
          } catch (error) {
            console.error('Error creating connection:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }, []);

  // Update connection when RPC endpoint changes
  useEffect(() => {
    if (config.rpcEndpoint) {
      try {
        const conn = new Connection(config.rpcEndpoint, 'confirmed');
        setConnection(conn);
      } catch (error) {
        console.error('Error creating connection:', error);
      }
    }
  }, [config.rpcEndpoint]);

  // Wallet setters with cookie persistence
  const setWallets = useCallback((newWallets: WalletType[] | ((prev: WalletType[]) => WalletType[])) => {
    setWalletsState(prev => {
      const updated = typeof newWallets === 'function' ? newWallets(prev) : newWallets;
      saveWalletsToCookies(updated);
      return updated;
    });
  }, []);

  // Balance setters with functional update support
  const setSolBalancesWrapper = useCallback((newBalances: Map<string, number> | ((prev: Map<string, number>) => Map<string, number>)) => {
    setSolBalances(prev => {
      return typeof newBalances === 'function' ? newBalances(prev) : newBalances;
    });
  }, []);

  // Config setters with cookie persistence
  const setConfig = useCallback((newConfig: ConfigType) => {
    setConfigState(newConfig);
    saveConfigToCookies(newConfig);
  }, []);

  const updateConfig = useCallback((key: keyof ConfigType, value: string) => {
    setConfigState(prev => {
      const updated = { ...prev, [key]: value };
      saveConfigToCookies(updated);
      return updated;
    });
  }, []);

  // Refresh balances
  const refreshBalances = useCallback(async (tokenAddress?: string) => {
    if (!connection || wallets.length === 0) return;

    setIsRefreshing(true);
    try {
      await fetchWalletBalances(
        connection,
        wallets,
        tokenAddress || '',
        setSolBalancesWrapper,
        setTokenBalances,
        solBalances,
        tokenBalances
      );
    } catch (error) {
      console.error('Error refreshing balances:', error);
      showToast('Failed to refresh balances', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [connection, wallets, solBalances, tokenBalances, showToast, setSolBalancesWrapper]);

  // Memoize context value
  const value = useMemo<AppContextType>(() => ({
    wallets,
    setWallets,
    config,
    setConfig,
    updateConfig,
    connection,
    setConnection,
    solBalances,
    setSolBalances: setSolBalancesWrapper,
    tokenBalances,
    setTokenBalances,
    isRefreshing,
    refreshBalances,
    showToast
  }), [
    wallets,
    setWallets,
    config,
    setConfig,
    updateConfig,
    connection,
    solBalances,
    tokenBalances,
    isRefreshing,
    refreshBalances,
    showToast,
    setSolBalancesWrapper
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

