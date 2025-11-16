import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, DollarSign, Activity, Zap, TrendingDown } from 'lucide-react';
import { saveWalletsToCookies, copyToClipboard, toggleWallet, getWalletDisplayName } from './Utils';
import type { WalletType, WalletCategory } from './Utils';
import { formatTokenBalance } from './utils/formatting';
import { useToast } from "./components/useToast";
import type { Connection } from '@solana/web3.js';
import { WalletOperationsButtons } from './components/OperationsWallets';
import { executeBuy, createBuyConfig, validateBuyInputs } from './utils/buy';
import { executeSell, createSellConfig, validateSellInputs } from './utils/sell';
import { 
  toggleWalletsByBalance, 
} from './utils/wallets';
import { Tooltip } from './components/Tooltip';
import type { CategoryQuickTradeSettings } from './modals/QuickTradeModal';

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
  handleRefresh,
  isRefreshing,
  setIsModalOpen,
  tokenAddress,
  sortDirection,
  handleSortWallets,
  connection,
  
  // Balance props with defaults
  solBalances: externalSolBalances,
  setSolBalances: setExternalSolBalances,
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
  const [showingTokenWallets, setShowingTokenWallets] = useState(true);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [buyingWalletId, setBuyingWalletId] = useState<number | null>(null);
  const [sellingWalletId, setSellingWalletId] = useState<number | null>(null);
  const [recentlyUpdatedWallets, setRecentlyUpdatedWallets] = useState<Set<string>>(new Set());
  const [clickedWalletId, setClickedWalletId] = useState<number | null>(null);
  const [localCategorySettings, setLocalCategorySettings] = useState<Record<WalletCategory, CategoryQuickTradeSettings> | undefined>(categorySettings);
  
  // Handler to update category settings
  const handleCategorySettingsChange = (settings: Record<WalletCategory, CategoryQuickTradeSettings>): void => {
    setLocalCategorySettings(settings);
  };
  
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

  const handleBalanceToggle = (): void => {
    setShowingTokenWallets(!showingTokenWallets);
    const newWallets = toggleWalletsByBalance(wallets, !showingTokenWallets, solBalances, tokenBalances);
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
  };

  const handleRefreshAll = (): void => {
    if (isRefreshing) return;
    
    // Call the parent's refresh handler which manages all balance fetching
    handleRefresh();
  };

  const handleQuickBuy = async (wallet: WalletType, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    
    if (!tokenAddress) {
      showToast('No token address specified', 'error');
      return;
    }

    if (buyingWalletId === wallet.id) return; // Prevent double clicks
    
    setBuyingWalletId(wallet.id);
    
    try {
      // Get category-specific settings or fall back to global settings
      const walletCategory = wallet.category;
      let settings: CategoryQuickTradeSettings | null = null;
      
      if (effectiveCategorySettings && walletCategory) {
        settings = effectiveCategorySettings[walletCategory];
      }
      
      // Use category settings if available, otherwise use global settings
      const buyAmount = settings?.buyAmount ?? quickBuyAmount ?? 0.01;
      const buyMinAmount = settings?.buyMinAmount ?? quickBuyMinAmount ?? 0.01;
      const buyMaxAmount = settings?.buyMaxAmount ?? quickBuyMaxAmount ?? 0.05;
      const useBuyRange = settings?.useBuyRange ?? useQuickBuyRange ?? false;
            
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

  const handleQuickSell = async (wallet: WalletType, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    
    if (!tokenAddress) {
      showToast('No token address specified', 'error');
      return;
    }

    if (sellingWalletId === wallet.id) return; // Prevent double clicks
    
    setSellingWalletId(wallet.id);
    
    try {
      // Get category-specific settings or fall back to global settings
      const walletCategory = wallet.category;
      let settings: CategoryQuickTradeSettings | null = null;
      
      if (effectiveCategorySettings && walletCategory) {
        settings = effectiveCategorySettings[walletCategory];
      }
      
      // Use category settings if available, otherwise use global settings
      const sellPercentage = settings?.sellPercentage ?? quickSellPercentage ?? 100;
      const sellMinPercentage = settings?.sellMinPercentage ?? quickSellMinPercentage ?? 25;
      const sellMaxPercentage = settings?.sellMaxPercentage ?? quickSellMaxPercentage ?? 100;
      const useSellRange = settings?.useSellRange ?? useQuickSellRange ?? false;
      
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
    <div className="flex-1 bg-app-primary relative overflow-y-auto overflow-x-hidden h-full min-h-full">
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
      <div className="top-0 sticky bg-app-primary-99 backdrop-blur-sm border-b border-app-primary-40 z-10 shadow-sm">
        {/* Compact buttons row */}
        <div className="px-2 py-1 border-b border-app-primary-20">
          <WalletOperationsButtons
            wallets={wallets}
            solBalances={solBalances}
            setSolBalances={setExternalSolBalances}
            connection={connection}
            tokenBalances={tokenBalances}
            tokenAddress={tokenAddress}
            handleRefresh={handleRefreshAll}
            isRefreshing={isRefreshing}
            showingTokenWallets={showingTokenWallets}
            handleBalanceToggle={handleBalanceToggle}
            setWallets={setWallets}
            sortDirection={sortDirection}
            handleSortWallets={handleSortWallets}
            setIsModalOpen={setIsModalOpen}
            quickBuyAmount={quickBuyAmount}
            quickBuyEnabled={quickBuyEnabled}
            quickBuyMinAmount={quickBuyMinAmount}
            quickBuyMaxAmount={quickBuyMaxAmount}
            useQuickBuyRange={useQuickBuyRange}
            onCategorySettingsChange={handleCategorySettingsChange}
          />
        </div>
        
        {/* Improved balance info */}
        <div className="py-2 px-3 bg-app-secondary-80-solid relative">
          <div className="flex justify-between text-sm">
            <div>
              <div className="text-app-secondary font-mono flex items-center gap-2">
                <DollarSign size={14} className="color-primary" />
                <span>
                  <span className="text-app-primary">{totalSol.toFixed(2)}</span> (
                  <span className="color-primary">{activeSol.toFixed(2)}</span>) SOL
                </span>
              </div>
            </div>
            {tokenAddress && (
              <div className="text-right">
                <div className="text-app-secondary font-mono flex items-center justify-end gap-2">
                  <span>
                    <span className="text-app-primary">{formatTokenBalance(totalTokens)}</span> (
                    <span className="color-primary">{formatTokenBalance(activeTokens)}</span>) Tokens
                  </span>
                  <Activity size={14} className="color-primary" />
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
                    ${recentlyUpdatedWallets.has(wallet.address) ? 'animate-pulse border-l-2 border-l-success' : ''}
                    ${clickedWalletId === wallet.id ? 'animate-click' : ''}

                  `}
                >
                  {/*  Selection Indicator */}
                  <td className="py-3 pl-3 pr-1 w-12">
                    <div className="flex items-center gap-2">
                      
                      {/* Quick Buy Button */}
                      {(() => {
                        // Get category-specific settings or fall back to global settings
                        const walletCategory = wallet.category;
                        let settings: CategoryQuickTradeSettings | null = null;
                        
                        if (effectiveCategorySettings && walletCategory) {
                          settings = effectiveCategorySettings[walletCategory];
                        }
                        
                        const buyEnabled = settings?.enabled ?? quickBuyEnabled ?? true;
                        const buyAmount = settings?.buyAmount ?? quickBuyAmount ?? 0.01;
                        const buyMinAmount = settings?.buyMinAmount ?? quickBuyMinAmount ?? 0.01;
                        const buyMaxAmount = settings?.buyMaxAmount ?? quickBuyMaxAmount ?? 0.05;
                        const useBuyRange = settings?.useBuyRange ?? useQuickBuyRange ?? false;
                        const minRequired = useBuyRange ? buyMinAmount : buyAmount;
                        
                        if (!buyEnabled) return null;
                        
                        return (
                        <Tooltip content={
                          tokenAddress 
                              ? (useBuyRange 
                                  ? `Quick buy random ${buyMinAmount.toFixed(3)}-${buyMaxAmount.toFixed(3)} ${walletCategory ? ` (${walletCategory})` : ''} (capped)` 
                                  : `Quick buy ${buyAmount} SOL${walletCategory ? ` (${walletCategory})` : ''} (capped)`
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
                      // Get category-specific settings or fall back to global settings
                      const walletCategory = wallet.category;
                      let settings: CategoryQuickTradeSettings | null = null;
                      
                      if (effectiveCategorySettings && walletCategory) {
                        settings = effectiveCategorySettings[walletCategory];
                      }
                      
                      const sellPercentage = settings?.sellPercentage ?? quickSellPercentage ?? 100;
                      const sellMinPercentage = settings?.sellMinPercentage ?? quickSellMinPercentage ?? 25;
                      const sellMaxPercentage = settings?.sellMaxPercentage ?? quickSellMaxPercentage ?? 100;
                      const useSellRange = settings?.useSellRange ?? useQuickSellRange ?? false;
                      const tokenBalance = tokenBalances.get(wallet.address) || 0;
                      
                      return (
                    <Tooltip content={
                      tokenAddress 
                            ? tokenBalance > 0
                              ? useSellRange
                                ? `Quick sell random ${sellMinPercentage}-${sellMaxPercentage}%${walletCategory ? ` (${walletCategory})` : ''} of tokens`
                                : `Quick sell ${sellPercentage}%${walletCategory ? ` (${walletCategory})` : ''} of tokens`
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