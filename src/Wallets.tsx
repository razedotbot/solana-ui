import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, Zap, TrendingDown, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { saveWalletsToCookies, copyToClipboard, toggleWallet, getWalletDisplayName } from './Utils';
import type { WalletType, WalletCategory, CategoryQuickTradeSettings } from './utils/types';
import { formatTokenBalance } from './utils/formatting';
import { useToast } from "./utils/useToast";
import type { Connection } from '@solana/web3.js';
import { executeBuy, createBuyConfig, validateBuyInputs } from './utils/buy';
import { executeSell, createSellConfig, validateSellInputs } from './utils/sell';
import { Tooltip } from './components/Tooltip';

interface WalletsPageProps {
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  handleRefresh: () => void;
  isRefreshing: boolean;
  setIsModalOpen: (open: boolean) => void;
  tokenAddress: string;
  sortDirection: string;
  handleSortWallets: () => void;
  connection: Connection;
  
  // Balance props
  solBalances?: Map<string, number>;
  setSolBalances?: (balances: Map<string, number>) => void;
  tokenBalances?: Map<string, number>;
  setTokenBalances?: (balances: Map<string, number>) => void;
  totalSol?: number;
  setTotalSol?: (total: number) => void;
  activeSol?: number;
  setActiveSol?: (active: number) => void;
  totalTokens?: number;
  setTotalTokens?: (total: number) => void;
  activeTokens?: number;
  setActiveTokens?: (active: number) => void;
  quickBuyEnabled?: boolean;
  setQuickBuyEnabled?: (enabled: boolean) => void;
  quickBuyAmount?: number;
  setQuickBuyAmount?: (amount: number) => void;
  quickBuyMinAmount?: number;
  setQuickBuyMinAmount?: (amount: number) => void;
  quickBuyMaxAmount?: number;
  setQuickBuyMaxAmount?: (amount: number) => void;
  useQuickBuyRange?: boolean;
  setUseQuickBuyRange?: (enabled: boolean) => void;
  quickSellPercentage?: number;
  setQuickSellPercentage?: (percentage: number) => void;
  quickSellMinPercentage?: number;
  setQuickSellMinPercentage?: (percentage: number) => void;
  quickSellMaxPercentage?: number;
  setQuickSellMaxPercentage?: (percentage: number) => void;
  useQuickSellRange?: boolean;
  setUseQuickSellRange?: (useRange: boolean) => void;
  categorySettings?: Record<WalletCategory, CategoryQuickTradeSettings>;
}

export const WalletsPage: React.FC<WalletsPageProps> = ({
  wallets,
  setWallets,
  handleRefresh: _handleRefresh,
  isRefreshing: _isRefreshing,
  setIsModalOpen: _setIsModalOpen,
  tokenAddress,
  sortDirection: _sortDirection,
  handleSortWallets: _handleSortWallets,
  connection: _connection,
  
  // Balance props with defaults
  solBalances: externalSolBalances,
  setSolBalances: _setExternalSolBalances,
  tokenBalances: externalTokenBalances,
  totalSol: externalTotalSol,
  setTotalSol: setExternalTotalSol,
  activeSol: externalActiveSol,
  setActiveSol: setExternalActiveSol,
  totalTokens: externalTotalTokens,
  setTotalTokens: setExternalTotalTokens,
  activeTokens: externalActiveTokens,
  setActiveTokens: setExternalActiveTokens,
  quickBuyEnabled = true,
  setQuickBuyEnabled: _setQuickBuyEnabled,
  quickBuyAmount = 0.01,
  setQuickBuyAmount: _setQuickBuyAmount,
  quickBuyMinAmount = 0.01,
  setQuickBuyMinAmount: _setQuickBuyMinAmount,
  quickBuyMaxAmount = 0.05,
  setQuickBuyMaxAmount: _setQuickBuyMaxAmount,
  useQuickBuyRange = false,
  setUseQuickBuyRange: _setUseQuickBuyRange,
  quickSellPercentage = 100,
  setQuickSellPercentage: _setQuickSellPercentage,
  quickSellMinPercentage = 25,
  setQuickSellMinPercentage: _setQuickSellMinPercentage,
  quickSellMaxPercentage = 100,
  setQuickSellMaxPercentage: _setQuickSellMaxPercentage,
  useQuickSellRange = false,
  setUseQuickSellRange: _setUseQuickSellRange,
  categorySettings
}) => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [buyingWalletId, setBuyingWalletId] = useState<number | null>(null);
  const [sellingWalletId, setSellingWalletId] = useState<number | null>(null);
  const [recentlyUpdatedWallets, setRecentlyUpdatedWallets] = useState<Set<string>>(new Set());
  const [clickedWalletId, setClickedWalletId] = useState<number | null>(null);
  const [localCategorySettings] = useState<Record<WalletCategory, CategoryQuickTradeSettings> | undefined>(categorySettings);
  const [sortType, setSortType] = useState<'sol' | 'token' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Use prop categorySettings if provided, otherwise use local state
  const effectiveCategorySettings = categorySettings || localCategorySettings;
  
  // Use internal state if external state is not provided
  const [internalSolBalances] = useState<Map<string, number>>(new Map());
  const [internalTokenBalances] = useState<Map<string, number>>(new Map());
  
  const solBalances = externalSolBalances || internalSolBalances;
  const tokenBalances = externalTokenBalances || internalTokenBalances;
  
  const { showToast } = useToast();
  // Use refs to track previous balance values
  const prevSolBalancesRef = useRef<Map<string, number>>(new Map());
  const prevTokenBalancesRef = useRef<Map<string, number>>(new Map());
  const balancesSerializedRef = useRef<string>('');

  // Serialize balances for comparison (to detect actual value changes, not just reference changes)
  const serializeBalances = (solBalances: Map<string, number>, tokenBalances: Map<string, number>): string => {
    const solEntries = Array.from(solBalances.entries()).sort(([a], [b]) => a.localeCompare(b));
    const tokenEntries = Array.from(tokenBalances.entries()).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify({ sol: solEntries, token: tokenEntries });
  };

  // Compute serialized balances - useMemo will recalculate when Maps change,
  // but the serialized string will only be different if values actually changed
  const balancesSerialized = useMemo(() => {
    return serializeBalances(solBalances, tokenBalances);
  }, [solBalances, tokenBalances]);

  // Monitor balance changes to show visual feedback for trade updates
  // Only run when serialized balances change (not on every Map reference change)
  useEffect(() => {
    // Only proceed if balances actually changed (by value, not just reference)
    if (balancesSerialized === balancesSerializedRef.current) {
      // Update refs to current values to prevent unnecessary re-runs when Map references change
      prevSolBalancesRef.current = new Map(solBalances);
      prevTokenBalancesRef.current = new Map(tokenBalances);
      return;
    }
    
    const prevSolBalances = prevSolBalancesRef.current;
    const prevTokenBalances = prevTokenBalancesRef.current;
    
    // Efficient Map comparison helper
    const mapsEqual = (map1: Map<string, number>, map2: Map<string, number>): boolean => {
      if (map1.size !== map2.size) return false;
      for (const [key, value] of map1) {
        if (map2.get(key) !== value) return false;
      }
      return true;
    };
    
    const solBalancesChanged = !mapsEqual(solBalances, prevSolBalances);
    const tokenBalancesChanged = !mapsEqual(tokenBalances, prevTokenBalances);
    
    // Check for balance changes and mark wallets as recently updated
    const updatedWallets = new Set<string>();
    let hasUpdates = false;
    
    if (solBalancesChanged || tokenBalancesChanged) {
      wallets.forEach(wallet => {
        const currentSol = solBalances.get(wallet.address) || 0;
        const currentToken = tokenBalances.get(wallet.address) || 0;
        const prevSol = prevSolBalances.get(wallet.address) || 0;
        const prevToken = prevTokenBalances.get(wallet.address) || 0;
        
        // Check if balances changed significantly (to avoid minor rounding differences)
        const solChanged = Math.abs(currentSol - prevSol) > 0.001;
        const tokenChanged = Math.abs(currentToken - prevToken) > 0.001;
        
        if ((solChanged || tokenChanged) && (prevSol > 0 || prevToken > 0)) {
          updatedWallets.add(wallet.address);
          hasUpdates = true;
        }
      });
      
      if (hasUpdates) {
        setRecentlyUpdatedWallets(updatedWallets);
        
        // Clear the visual indicator after 1 second
        const timeoutId = setTimeout(() => {
          setRecentlyUpdatedWallets(new Set());
        }, 1000);
        
        // Store timeout ID for cleanup if needed
        return () => {
          clearTimeout(timeoutId);
        };
      }
    }
    
    // Update previous balance references and serialized version only after processing
    prevSolBalancesRef.current = new Map(solBalances);
    prevTokenBalancesRef.current = new Map(tokenBalances);
    balancesSerializedRef.current = balancesSerialized;
    
    // Return no-op cleanup function if no updates
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balancesSerialized, wallets]); // Only depend on serialized string and wallets - solBalances/tokenBalances accessed via closure

  // Calculate balances and update external state
  const calculatedTotalSol = useMemo(() => 
    Array.from(solBalances.values()).reduce((sum, balance) => sum + balance, 0),
    [solBalances]
  );
  
  const calculatedTotalTokens = useMemo(() =>
    Array.from(tokenBalances.values()).reduce((sum, balance) => sum + balance, 0),
    [tokenBalances]
  );
  
  const activeWallets = useMemo(() => 
    wallets.filter(wallet => wallet.isActive),
    [wallets]
  );
  
  // Create a stable key from active wallet IDs to ensure recalculation when wallets change
  const activeWalletIds = useMemo(() => 
    activeWallets.map(w => w.id).sort().join(','),
    [activeWallets]
  );
  
  const calculatedActiveSol = useMemo(() =>
    activeWallets.reduce((sum, wallet) => sum + (solBalances.get(wallet.address) || 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeWallets, activeWalletIds, balancesSerialized] // balancesSerialized captures all changes to solBalances
  );
  
  const calculatedActiveTokens = useMemo(() =>
    activeWallets.reduce((sum, wallet) => sum + (tokenBalances.get(wallet.address) || 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeWallets, activeWalletIds, balancesSerialized] // balancesSerialized captures all changes to tokenBalances
  );

  useEffect(() => {
    // Update external state if provided
    if (setExternalTotalSol) setExternalTotalSol(calculatedTotalSol);
    if (setExternalActiveSol) setExternalActiveSol(calculatedActiveSol);
    if (setExternalTotalTokens) setExternalTotalTokens(calculatedTotalTokens);
    if (setExternalActiveTokens) setExternalActiveTokens(calculatedActiveTokens);
    // Note: wallets is not needed here because calculated values already depend on wallets through activeWallets
  }, [calculatedTotalSol, calculatedActiveSol, calculatedTotalTokens, calculatedActiveTokens, setExternalTotalSol, setExternalActiveSol, setExternalTotalTokens, setExternalActiveTokens]);

  // Use either external state or calculated values
  const totalSol = externalTotalSol !== undefined ? externalTotalSol : calculatedTotalSol;
  const totalTokens = externalTotalTokens !== undefined ? externalTotalTokens : calculatedTotalTokens;
  const activeSol = externalActiveSol !== undefined ? externalActiveSol : calculatedActiveSol;
  const activeTokens = externalActiveTokens !== undefined ? externalActiveTokens : calculatedActiveTokens;

  const handleQuickBuy = async (wallet: WalletType, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    
    if (!tokenAddress) {
      showToast('No token address specified', 'error');
      return;
    }

    if (buyingWalletId === wallet.id) return; // Prevent double clicks
    
    setBuyingWalletId(wallet.id);
    
    try {
      // Priority: 1. Custom wallet settings, 2. Category settings, 3. Global settings
      let buyAmount: number;
      let buyMinAmount: number;
      let buyMaxAmount: number;
      let useBuyRange: boolean;
      
      if (wallet.customQuickTradeSettings) {
        // Use custom wallet settings
        buyAmount = wallet.customQuickTradeSettings.buyAmount ?? 0.01;
        buyMinAmount = wallet.customQuickTradeSettings.buyMinAmount ?? 0.01;
        buyMaxAmount = wallet.customQuickTradeSettings.buyMaxAmount ?? 0.05;
        useBuyRange = wallet.customQuickTradeSettings.useBuyRange ?? false;
      } else {
        // Fall back to category or global settings
        const walletCategory = wallet.category;
        let settings: CategoryQuickTradeSettings | null = null;
        
        if (effectiveCategorySettings && walletCategory) {
          settings = effectiveCategorySettings[walletCategory];
        }
        
        // Use category settings if available, otherwise use global settings
        buyAmount = settings?.buyAmount ?? quickBuyAmount ?? 0.01;
        buyMinAmount = settings?.buyMinAmount ?? quickBuyMinAmount ?? 0.01;
        buyMaxAmount = settings?.buyMaxAmount ?? quickBuyMaxAmount ?? 0.05;
        useBuyRange = settings?.useBuyRange ?? useQuickBuyRange ?? false;
      }
            
      // Calculate the SOL amount to use
      let solAmountToUse = buyAmount;
      
      if (useBuyRange && buyMinAmount && buyMaxAmount) {
        // Generate random amount between min and max
        solAmountToUse = Math.random() * (buyMaxAmount - buyMinAmount) + buyMinAmount;
        // Round to 3 decimal places
        solAmountToUse = Math.round(solAmountToUse * 1000) / 1000;
      }

      // Create wallet for buy
      const walletForBuy = {
        address: wallet.address,
        privateKey: wallet.privateKey
      };

      // Check wallet balance and adjust amount if necessary
      const walletBalance = solBalances.get(wallet.address) || 0;
      const maxAvailable = walletBalance - 0.01; // Leave 0.01 SOL for transaction fees
      
      if (maxAvailable <= 0) {
        showToast(`Insufficient SOL balance. Need at least 0.01 SOL for transaction fees`, 'error');
        return;
      }
      
      // Cap the amount to what's available in the wallet
      if (solAmountToUse > maxAvailable) {
        solAmountToUse = maxAvailable;
        // Round to 3 decimal places
        solAmountToUse = Math.round(solAmountToUse * 1000) / 1000;
      }
      
      // Create buy configuration using the unified system
      const buyConfig = createBuyConfig({
        tokenAddress,
        solAmount: solAmountToUse
        // slippageBps will be automatically set from config in the buy.ts file
      });
      
      // Validate inputs
      const validation = validateBuyInputs([walletForBuy], buyConfig, solBalances);
      if (!validation.valid) {
        showToast(validation.error || 'Validation failed', 'error');
        return;
      }
      
      await executeBuy([walletForBuy], buyConfig);
      
    } catch (error) {
      console.error('Quick buy error:', error);
      showToast('Quick buy failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setBuyingWalletId(null);
    }
  };

  // Handler for sorting wallets by SOL balance
  const handleSortBySol = (e: React.MouseEvent): void => {
    e.stopPropagation();
    const newDirection = sortType === 'sol' && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortType('sol');
    setSortDirection(newDirection);
    
    const sortedWallets = [...wallets].sort((a, b) => {
      const balanceA = solBalances.get(a.address) || 0;
      const balanceB = solBalances.get(b.address) || 0;
      return newDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
    });
    
    setWallets(sortedWallets);
    saveWalletsToCookies(sortedWallets);
  };

  // Handler for sorting wallets by token balance
  const handleSortByToken = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!tokenAddress) {
      showToast('No token selected', 'error');
      return;
    }
    
    const newDirection = sortType === 'token' && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortType('token');
    setSortDirection(newDirection);
    
    const sortedWallets = [...wallets].sort((a, b) => {
      const balanceA = tokenBalances.get(a.address) || 0;
      const balanceB = tokenBalances.get(b.address) || 0;
      return newDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
    });
    
    setWallets(sortedWallets);
    saveWalletsToCookies(sortedWallets);
  };

  // Handler for selecting/deselecting all wallets with SOL balance
  const handleSelectAllWithSol = (e: React.MouseEvent): void => {
    e.stopPropagation();
    const walletsWithSol = wallets.filter(wallet => {
      const balance = solBalances.get(wallet.address) || 0;
      return balance > 0;
    });
    
    if (walletsWithSol.length === 0) {
      showToast('No wallets with SOL balance found', 'error');
      return;
    }
    
    // Check if all wallets with SOL are already active
    const allActive = walletsWithSol.every(wallet => wallet.isActive);
    
    // Toggle: if all wallets with SOL are active, deselect ALL wallets; otherwise, select all wallets with SOL
    const updatedWallets = wallets.map(wallet => {
      const hasSol = (solBalances.get(wallet.address) || 0) > 0;
      if (allActive) {
        // Deselect all wallets
        return { ...wallet, isActive: false };
      } else {
        // Select only wallets with SOL balance
        if (hasSol) {
          return { ...wallet, isActive: true };
        }
        return wallet;
      }
    });
    
    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
    if (allActive) {
      showToast(`Deselected all wallets`, 'success');
    } else {
      showToast(`Selected ${walletsWithSol.length} wallet${walletsWithSol.length === 1 ? '' : 's'} with SOL balance`, 'success');
    }
  };

  // Handler for selecting/deselecting all wallets with token balance
  const handleSelectAllWithTokens = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!tokenAddress) {
      showToast('No token selected', 'error');
      return;
    }
    
    const walletsWithTokens = wallets.filter(wallet => {
      const balance = tokenBalances.get(wallet.address) || 0;
      return balance > 0;
    });
    
    if (walletsWithTokens.length === 0) {
      showToast('No wallets with token balance found', 'error');
      return;
    }
    
    // Check if all wallets with tokens are already active
    const allActive = walletsWithTokens.every(wallet => wallet.isActive);
    
    // Toggle: if all wallets with tokens are active, deselect ALL wallets; otherwise, select all wallets with tokens
    const updatedWallets = wallets.map(wallet => {
      const hasTokens = (tokenBalances.get(wallet.address) || 0) > 0;
      if (allActive) {
        // Deselect all wallets
        return { ...wallet, isActive: false };
      } else {
        // Select only wallets with token balance
        if (hasTokens) {
          return { ...wallet, isActive: true };
        }
        return wallet;
      }
    });
    
    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
    if (allActive) {
      showToast(`Deselected all wallets`, 'success');
    } else {
      showToast(`Selected ${walletsWithTokens.length} wallet${walletsWithTokens.length === 1 ? '' : 's'} with token balance`, 'success');
    }
  };

  const handleQuickSell = async (wallet: WalletType, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    
    if (!tokenAddress) {
      showToast('No token address specified', 'error');
      return;
    }

    if (sellingWalletId === wallet.id) return; // Prevent double clicks
    
    setSellingWalletId(wallet.id);
    
    try {
      // Priority: 1. Custom wallet settings, 2. Category settings, 3. Global settings
      let sellPercentage: number;
      let sellMinPercentage: number;
      let sellMaxPercentage: number;
      let useSellRange: boolean;
      
      if (wallet.customQuickTradeSettings) {
        // Use custom wallet settings
        sellPercentage = wallet.customQuickTradeSettings.sellPercentage ?? 100;
        sellMinPercentage = wallet.customQuickTradeSettings.sellMinPercentage ?? 25;
        sellMaxPercentage = wallet.customQuickTradeSettings.sellMaxPercentage ?? 100;
        useSellRange = wallet.customQuickTradeSettings.useSellRange ?? false;
      } else {
        // Fall back to category or global settings
        const walletCategory = wallet.category;
        let settings: CategoryQuickTradeSettings | null = null;
        
        if (effectiveCategorySettings && walletCategory) {
          settings = effectiveCategorySettings[walletCategory];
        }
        
        // Use category settings if available, otherwise use global settings
        sellPercentage = settings?.sellPercentage ?? quickSellPercentage ?? 100;
        sellMinPercentage = settings?.sellMinPercentage ?? quickSellMinPercentage ?? 25;
        sellMaxPercentage = settings?.sellMaxPercentage ?? quickSellMaxPercentage ?? 100;
        useSellRange = settings?.useSellRange ?? useQuickSellRange ?? false;
      }
      
      // Create wallet for sell
      const walletForSell = {
        address: wallet.address,
        privateKey: wallet.privateKey
      };

      // Check if wallet has tokens to sell
      const walletTokenBalance = tokenBalances.get(wallet.address) || 0;
      if (walletTokenBalance <= 0) {
        showToast('No tokens to sell in this wallet', 'error');
        return;
      }
      
      // Calculate sell percentage (use range if enabled)
      let sellPercent = sellPercentage;
      if (useSellRange && sellMinPercentage && sellMaxPercentage) {
        sellPercent = Math.floor(Math.random() * (sellMaxPercentage - sellMinPercentage + 1) + sellMinPercentage);
      }
      
      // Create sell configuration using the unified system
      const sellConfig = createSellConfig({
        tokenAddress,
        sellPercent
        // slippageBps will be automatically set from config in the sell.ts file
      });
      
      // Validate inputs
      const validation = validateSellInputs([walletForSell], sellConfig, tokenBalances);
      if (!validation.valid) {
        showToast(validation.error || 'Validation failed', 'error');
        return;
      }
      
      await executeSell([walletForSell], sellConfig);
      
    } catch (error) {
      console.error('Quick sell error:', error);
      showToast('Quick sell failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setSellingWalletId(null);
    }
  };



  return (
    <div className="relative flex-1 overflow-y-auto overflow-x-hidden bg-app-primary h-full min-h-full">
      {/* Background effects - same as Actions.tsx */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden min-h-full">
        {/* Grid background */}
        <div className="absolute inset-0 bg-app-primary opacity-90">
          <div className="absolute inset-0 bg-gradient-to-b from-app-primary-05 to-transparent"></div>
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(2, 179, 109, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(2, 179, 109, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: 'center center',
            }}
          ></div>
        </div>
        
        {/* Glowing corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32 opacity-20">
          <div className="absolute top-0 left-0 w-px h-16 bg-gradient-to-b from-app-primary-color to-transparent"></div>
          <div className="absolute top-0 left-0 w-16 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
          <div className="absolute top-0 right-0 w-px h-16 bg-gradient-to-b from-app-primary-color to-transparent"></div>
          <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
        </div>
        <div className="absolute bottom-0 left-0 w-32 h-32 opacity-20">
          <div className="absolute bottom-0 left-0 w-px h-16 bg-gradient-to-t from-app-primary-color to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-16 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
        </div>
        <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20">
          <div className="absolute bottom-0 right-0 w-px h-16 bg-gradient-to-t from-app-primary-color to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-16 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
        </div>
      </div>
      
      {/*  header */}
      <div className="sticky top-0 bg-app-primary-99 backdrop-blur-sm border-b border-app-primary-40 z-10 shadow-sm">
        {/* Improved balance info */}
        <div className="py-2 px-3 bg-app-secondary-80-solid relative">
          <div className="flex justify-between text-sm">
            <div>
              <div className="text-app-secondary font-mono flex items-center gap-2">
                <span
                  onClick={handleSelectAllWithSol}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  title="Click to select/deselect all wallets with SOL balance"
                >
                  <svg className="inline-block ml-1 mb-1 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" className="color-primary"/>
                    <path d="M12 6v12M8 10h8M8 14h8" stroke="currentColor" strokeWidth="1.5" className="color-primary"/>
                  </svg>
                  <span className="text-app-primary"> {totalSol.toFixed(1)}</span> (
                  <span className="color-primary"> {activeSol.toFixed(1)}</span>) 
                </span>
                <button
                  onClick={handleSortBySol}
                  className="ml-1 p-0.5 hover:bg-app-primary-20 rounded transition-colors cursor-pointer"
                  title="Sort wallets by SOL balance"
                >
                  {sortType === 'sol' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp size={12} className="color-primary" />
                    ) : (
                      <ArrowDown size={12} className="color-primary" />
                    )
                  ) : (
                    <ArrowUpDown size={12} className="text-app-secondary-60" />
                  )}
                </button>
              </div>
            </div>
            {tokenAddress && (
              <div className="text-right">
                <div className="text-app-secondary font-mono flex items-center justify-end gap-2">
                  <span
                    onClick={handleSelectAllWithTokens}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    title="Click to select/deselect all wallets with token balance"
                  >
                    <svg className="inline-block mb-1 ml-1 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8" cy="12" r="6" stroke="currentColor" strokeWidth="2" fill="none" className="color-primary"/>
                      <circle cx="16" cy="12" r="6" stroke="currentColor" strokeWidth="2" fill="none" className="color-primary"/>
                      <path d="M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1.5" className="color-primary"/>
                    </svg> 
                    <span className="text-app-primary"> {formatTokenBalance(totalTokens)}</span> (
                    <span className="color-primary"> {formatTokenBalance(activeTokens)}</span>) 
                  </span>
                  <button
                    onClick={handleSortByToken}
                    className="ml-1 p-0.5 hover:bg-app-primary-20 rounded transition-colors cursor-pointer"
                    title="Sort wallets by token balance"
                  >
                    {sortType === 'token' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp size={12} className="color-primary" />
                      ) : (
                        <ArrowDown size={12} className="color-primary" />
                      )
                    ) : (
                      <ArrowUpDown size={12} className="text-app-secondary-60" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          

        </div>
      </div>
      
      {/* Wallets table with  visual selection */}
      <div className="pt-2 relative z-10">
        <div className="min-w-full relative">
          <table className="w-full border-separate border-spacing-0">
            <tbody className="text-sm">
              {wallets.filter(wallet => !wallet.isArchived).map((wallet) => (
                <tr 
                  key={wallet.id}
                  onClick={() => {
                    setClickedWalletId(wallet.id);
                    setTimeout(() => setClickedWalletId(null), 300);
                    const newWallets = toggleWallet(wallets, wallet.id);
                    saveWalletsToCookies(newWallets);
                    setWallets(newWallets);
                  }}
                  onMouseEnter={() => setHoverRow(wallet.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  className={`
                    border-b transition-all duration-300 cursor-pointer group
                    ${wallet.isActive 
                      ? 'bg-primary-20 border-app-primary-60 border-l-4 border-l-primary shadow-lg shadow-primary-20' 
                      : 'border-app-primary-15 hover-border-primary-30'
                    }
                    ${hoverRow === wallet.id && !wallet.isActive ? 'bg-primary-08 border-app-primary-30' : ''}
                    ${recentlyUpdatedWallets.has(wallet.address) ? 'border-l-2 border-l-success' : ''}
                    ${clickedWalletId === wallet.id ? 'animate-click' : ''}

                  `}
                >
                  {/*  Selection Indicator */}
                  <td className="py-3 pl-3 pr-1 w-12">
                    <div className="flex items-center gap-2">
                      
                      {/* Quick Buy Button */}
                      {(() => {
                        // Priority: 1. Custom wallet settings, 2. Category settings, 3. Global settings
                        let buyEnabled: boolean;
                        let buyAmount: number;
                        let buyMinAmount: number;
                        let buyMaxAmount: number;
                        let useBuyRange: boolean;
                        
                        if (wallet.customQuickTradeSettings) {
                          // Use custom wallet settings (always enabled if custom settings exist)
                          buyEnabled = true;
                          buyAmount = wallet.customQuickTradeSettings.buyAmount ?? 0.01;
                          buyMinAmount = wallet.customQuickTradeSettings.buyMinAmount ?? 0.01;
                          buyMaxAmount = wallet.customQuickTradeSettings.buyMaxAmount ?? 0.05;
                          useBuyRange = wallet.customQuickTradeSettings.useBuyRange ?? false;
                        } else {
                          // Fall back to category or global settings
                          const walletCategory = wallet.category;
                          let settings: CategoryQuickTradeSettings | null = null;
                          
                          if (effectiveCategorySettings && walletCategory) {
                            settings = effectiveCategorySettings[walletCategory];
                          }
                          
                          buyEnabled = settings?.enabled ?? quickBuyEnabled ?? true;
                          buyAmount = settings?.buyAmount ?? quickBuyAmount ?? 0.01;
                          buyMinAmount = settings?.buyMinAmount ?? quickBuyMinAmount ?? 0.01;
                          buyMaxAmount = settings?.buyMaxAmount ?? quickBuyMaxAmount ?? 0.05;
                          useBuyRange = settings?.useBuyRange ?? useQuickBuyRange ?? false;
                        }
                        
                        const minRequired = useBuyRange ? buyMinAmount : buyAmount;
                        
                        if (!buyEnabled) return null;
                        
                        return (
                        <Tooltip content={
                          tokenAddress 
                            ? (useBuyRange 
                                ? `Quick buy random ${buyMinAmount.toFixed(3)}-${buyMaxAmount.toFixed(3)} SOL${wallet.customQuickTradeSettings ? ' (Custom)' : wallet.category ? ` (${wallet.category})` : ''} (capped)` 
                                : `Quick buy ${buyAmount} SOL${wallet.customQuickTradeSettings ? ' (Custom)' : wallet.category ? ` (${wallet.category})` : ''} (capped)`
                            )
                            : "No token selected"
                        } position="right">
                          <button
                            onClick={(e) => handleQuickBuy(wallet, e)}
                              disabled={!tokenAddress || buyingWalletId === wallet.id || (solBalances.get(wallet.address) || 0) < minRequired + 0.01}
                            className={`
                              w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center
                                ${!tokenAddress || (solBalances.get(wallet.address) || 0) < minRequired + 0.01
                                ? 'bg-app-tertiary border border-app-primary-20 cursor-not-allowed opacity-50'
                                : buyingWalletId === wallet.id
                                ? 'bg-app-primary-color border border-app-primary-color shadow-lg shadow-app-primary-40 animate-pulse'
                                : 'bg-primary-30 border border-app-primary-80 hover:bg-app-primary-color hover-border-primary hover:shadow-lg hover:shadow-app-primary-40 cursor-pointer'
                              }
                            `}
                          >
                            {buyingWalletId === wallet.id ? (
                              <RefreshCw size={10} className="text-app-quaternary animate-spin" />
                            ) : (
                              <Zap size={10} className={`
                                  ${!tokenAddress || (solBalances.get(wallet.address) || 0) < minRequired + 0.01
                                  ? 'text-app-primary-40'
                                  : 'text-app-quaternary group-hover:text-app-quaternary'
                                }
                              `} />
                            )}
                          </button>
                        </Tooltip>
                        );
                      })()}
                    </div>
                  </td>
                  
                  {/*  Address Display */}
                  <td className="py-3 px-2 font-mono">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tooltip 
                          content={`Click to copy`}
                          position="bottom"
                        >
                          <span 
                            className={`text-sm font-mono cursor-pointer transition-all duration-300 tracking-wide font-medium
                              ${wallet.isActive 
                                ? 'text-success drop-shadow-sm' 
                                : 'text-app-primary hover:color-primary'
                              }
                            `}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const success = await copyToClipboard(wallet.address, showToast);
                              if (success) {
                                setCopiedAddress(wallet.address);
                                setTimeout(() => setCopiedAddress(null), 2000);
                              }
                            }}
                          >
                            {getWalletDisplayName(wallet)}
                            {copiedAddress === wallet.address && (
                              <span className="ml-2 text-xs color-primary animate-pulse bg-primary-20 px-1 py-0.5 rounded">
                                ✓
                              </span>
                            )}
                          </span>
                        </Tooltip>
                      </div>

                    </div>
                  </td>
                  
                  {/*  SOL Balance */}
                  <td className="py-3 px-2 text-right font-mono">
                    <div className="flex items-center justify-end gap-1">
                      <span className={`font-medium transition-colors duration-300 ${
                        wallet.isActive
                          ? ((solBalances.get(wallet.address) || 0) > 0 ? 'text-success' : 'text-warning')
                          : ((solBalances.get(wallet.address) || 0) > 0 ? 'text-app-secondary' : 'text-app-secondary-60')
                      }`}>
                        {(solBalances.get(wallet.address) || 0).toFixed(3)}
                      </span>
                    </div>
                  </td>
                  
                  {/*  Token Balance */}
                  {tokenAddress && (
                    <td className="py-3 px-2 text-right font-mono">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`font-medium transition-colors duration-300 ${
                          wallet.isActive
                            ? ((tokenBalances.get(wallet.address) || 0) > 0 ? 'text-success' : 'text-warning-60')
                            : ((tokenBalances.get(wallet.address) || 0) > 0 ? 'color-primary' : 'text-app-primary-40')
                        }`}>
                          {formatTokenBalance(tokenBalances.get(wallet.address) || 0)}
                        </span>
                      </div>
                    </td>
                  )}
                  
                  {/* Quick Sell Button */}
                  <td className="py-3 pl-2 pr-3 text-right">
                    {(() => {
                      // Priority: 1. Custom wallet settings, 2. Category settings, 3. Global settings
                      let sellPercentage: number;
                      let sellMinPercentage: number;
                      let sellMaxPercentage: number;
                      let useSellRange: boolean;
                      
                      if (wallet.customQuickTradeSettings) {
                        // Use custom wallet settings
                        sellPercentage = wallet.customQuickTradeSettings.sellPercentage ?? 100;
                        sellMinPercentage = wallet.customQuickTradeSettings.sellMinPercentage ?? 25;
                        sellMaxPercentage = wallet.customQuickTradeSettings.sellMaxPercentage ?? 100;
                        useSellRange = wallet.customQuickTradeSettings.useSellRange ?? false;
                      } else {
                        // Fall back to category or global settings
                        const walletCategory = wallet.category;
                        let settings: CategoryQuickTradeSettings | null = null;
                        
                        if (effectiveCategorySettings && walletCategory) {
                          settings = effectiveCategorySettings[walletCategory];
                        }
                        
                        sellPercentage = settings?.sellPercentage ?? quickSellPercentage ?? 100;
                        sellMinPercentage = settings?.sellMinPercentage ?? quickSellMinPercentage ?? 25;
                        sellMaxPercentage = settings?.sellMaxPercentage ?? quickSellMaxPercentage ?? 100;
                        useSellRange = settings?.useSellRange ?? useQuickSellRange ?? false;
                      }
                      
                      const tokenBalance = tokenBalances.get(wallet.address) || 0;
                      
                      return (
                    <Tooltip content={
                      tokenAddress 
                        ? tokenBalance > 0
                          ? useSellRange
                            ? `Quick sell random ${sellMinPercentage}-${sellMaxPercentage}%${wallet.customQuickTradeSettings ? ' (Custom)' : wallet.category ? ` (${wallet.category})` : ''} of tokens`
                            : `Quick sell ${sellPercentage}%${wallet.customQuickTradeSettings ? ' (Custom)' : wallet.category ? ` (${wallet.category})` : ''} of tokens`
                          : "No tokens to sell"
                        : "No token selected"
                    } position="left">
                      <button
                        onClick={(e) => handleQuickSell(wallet, e)}
                            disabled={!tokenAddress || sellingWalletId === wallet.id || tokenBalance <= 0}
                        className={`
                          w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center
                              ${!tokenAddress || tokenBalance <= 0
                            ? 'bg-app-tertiary border border-app-primary-20 cursor-not-allowed opacity-50'
                            : sellingWalletId === wallet.id
                            ? 'bg-red-500 border border-red-500 shadow-lg shadow-red-400 animate-pulse'
                            : 'bg-red-400 border border-red-600 hover:bg-red-500 hover:border-red-500 hover:shadow-lg hover:shadow-red-400 cursor-pointer'
                          }
                        `}
                      >
                        {sellingWalletId === wallet.id ? (
                          <RefreshCw size={10} className="text-white animate-spin" />
                        ) : (
                          <TrendingDown size={10} className={`
                                ${!tokenAddress || tokenBalance <= 0
                              ? 'text-app-primary-40'
                              : 'text-white'
                            }
                          `} />
                        )}
                      </button>
                    </Tooltip>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};