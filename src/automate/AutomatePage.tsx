import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Trash2, Users, Download, Upload, Play, Pause, Edit, Plus } from 'lucide-react';
import { UnifiedHeader } from '../components/Header';
import { getWalletDisplayName, saveTradingStrategiesToCookies, loadTradingStrategiesFromCookies } from '../Utils';
import type { WalletType } from '../Utils';
import { useAppContext } from '../contexts/useAppContext';
import { formatAddress, formatSolBalance, formatTokenBalance, formatPrice, formatLargeNumber } from '../utils/formatting';
import { StrategyBuilder } from './index';
import type { TradingCondition, TradingAction, TradingStrategy } from './types';
import { generateStrategyId } from './utils';
import { executeTrade } from '../utils/trading';
import type { TradingConfig } from '../utils/trading';
import { TradeWebSocketManager, type NonWhitelistedTrade } from '../utils/tradeWebSocket';

interface SelectedWallet {
  privateKey: string;
  address: string;
  displayName: string;
}

interface MarketData {
  marketCap: number;
  buyVolume: number;
  sellVolume: number;
  netVolume: number;
  lastTrade: NonWhitelistedTrade | null;
  tokenPrice: number;
  priceChange24h?: number;
  whitelistActivity?: Record<string, {
    buyVolume: number;
    sellVolume: number;
    netVolume: number;
    lastTrade: NonWhitelistedTrade | null;
  }>;
}

export const AutomatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenAddressFromUrl = searchParams.get('token') || '';
  
  // Get shared state from context
  const {
    wallets: contextWallets,
    config: contextConfig,
    solBalances,
    tokenBalances,
    showToast: contextShowToast,
    refreshBalances
  } = useAppContext();
  // Trade data state (managed independently via WebSocket)
  const [nonWhitelistedTrades, setNonWhitelistedTrades] = useState<NonWhitelistedTrade[]>([]);
  
  // WebSocket manager ref
  const wsManagerRef = useRef<TradeWebSocketManager | null>(null);
  
  // Use wallets and config from context
  const activeWallets = contextWallets;
  const config = contextConfig;
  const showToast = contextShowToast;
  const tokenAddress = tokenAddressFromUrl;
  
  // Wallet selection state
  const [selectedWallets, setSelectedWallets] = useState<SelectedWallet[]>([]);
  const [walletSearchTerm, setWalletSearchTerm] = useState('');
  const [walletSortOption] = useState('address');
  const [walletSortDirection] = useState('asc');
  const [walletBalanceFilter] = useState('all');
  

  
  // Local token address state (used when tokenAddress prop is not provided)
  const [localTokenAddress, setLocalTokenAddress] = useState<string>('');
  
  // Strategy management state
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [editingStrategy, setEditingStrategy] = useState<TradingStrategy | null>(null);
  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false);
  
  // Active strategies monitoring
  const [activeStrategies, setActiveStrategies] = useState<Set<string>>(new Set());
  const strategyCheckIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load strategies from cookies on mount
  useEffect(() => {
    try {
      const loadedStrategies: TradingStrategy[] = loadTradingStrategiesFromCookies();
      if (Array.isArray(loadedStrategies)) {
        setStrategies(loadedStrategies);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error loading strategies:', errorMessage);
    }
  }, []);

  // Save strategies to cookies whenever they change
  useEffect(() => {
    saveTradingStrategiesToCookies(strategies);
  }, [strategies]);

  // Fetch wallet balances on mount and when token address changes
  useEffect(() => {
    if (contextWallets.length > 0) {
      const activeTokenAddress = tokenAddress || localTokenAddress;
      void refreshBalances(activeTokenAddress || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextWallets.length, tokenAddress, localTokenAddress]);

  // Use token address from URL or local state
  const activeTokenAddress = tokenAddress || localTokenAddress;

  // Calculate market data from trades
  const marketData = useMemo((): MarketData => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    
    const recentTrades = nonWhitelistedTrades.filter(
      (trade): boolean => trade.timestamp >= twentyFourHoursAgo
    );
    
    const buyVolume: number = recentTrades
      .filter((t): boolean => t.type === 'buy')
      .reduce((sum: number, t): number => sum + t.solAmount, 0);
    
    const sellVolume: number = recentTrades
      .filter((t): boolean => t.type === 'sell')
      .reduce((sum: number, t): number => sum + t.solAmount, 0);
    
    const lastTrade: NonWhitelistedTrade | null = nonWhitelistedTrades[0] || null;
    const tokenPrice: number = lastTrade?.avgPrice || 0;
    const marketCap: number = lastTrade?.marketCap || 0;
    
    const result: MarketData = {
      marketCap,
      buyVolume,
      sellVolume,
      netVolume: buyVolume - sellVolume,
      lastTrade,
      tokenPrice,
      priceChange24h: undefined,
      whitelistActivity: {}
    };
    
    return result;
  }, [nonWhitelistedTrades]);

  // Initialize WebSocket connection for trade data
  useEffect(() => {
    if (!activeTokenAddress) return;

    const wsManager = new TradeWebSocketManager();
    wsManagerRef.current = wsManager;

    wsManager.connect({
      tokenMint: activeTokenAddress,
      solPrice: 100, // Default price
      tokenSupply: 1e9, // Default supply
      onTrade: (trade: NonWhitelistedTrade) => {
        if (trade && typeof trade === 'object' && 'signature' in trade) {
          setNonWhitelistedTrades(prev => {
            const exists = prev.some(t => t.signature === trade.signature);
            if (exists) return prev;
            return [trade, ...prev].slice(0, 100);
          });
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('WebSocket error:', errorMessage);
      }
    });

    return () => {
      wsManager.disconnect();
    };
  }, [activeTokenAddress]);

  const evaluateCondition = useCallback((condition: TradingCondition, data: MarketData): boolean => {
    let value: number;
    
    switch (condition.type) {
      case 'marketCap':
        value = data.marketCap;
        break;
      case 'buyVolume':
        value = data.buyVolume;
        break;
      case 'sellVolume':
        value = data.sellVolume;
        break;
      case 'netVolume':
        value = data.netVolume;
        break;
      case 'lastTradeAmount':
        value = data.lastTrade?.solAmount || 0;
        break;
      case 'priceChange':
        value = data.priceChange24h || 0;
        break;
      case 'lastTradeType':
      case 'whitelistActivity':
        // These types require special handling, return false for now
        return false;
      default:
        return false;
    }

    const threshold = typeof condition.value === 'number' ? condition.value : parseFloat(String(condition.value));
    
    switch (condition.operator) {
      case 'greater':
        return value > threshold;
      case 'less':
        return value < threshold;
      case 'equal':
        return Math.abs(value - threshold) < 0.0001; // Floating point comparison
      case 'greaterEqual':
        return value >= threshold;
      case 'lessEqual':
        return value <= threshold;
      default:
        return false;
    }
  }, []);

  const executeAction = useCallback(async (action: TradingAction, _strategy: TradingStrategy) => {
    const walletsToUse = selectedWallets.length > 0 ? selectedWallets : [];
    
    if (walletsToUse.length === 0) {
      showToast?.('No wallets selected for strategy execution', 'error');
      return;
    }

    // Convert selected wallets to WalletType format for executeTrade
    const walletsForTrade: WalletType[] = walletsToUse.map((w, index) => ({
      id: index,
      address: w.address,
      privateKey: w.privateKey,
      isActive: true
    }));

    try {
      const tradingConfig: TradingConfig = {
        tokenAddress: activeTokenAddress,
        ...(action.type === 'buy' 
          ? { solAmount: action.amount }
          : { sellPercent: action.amount }
        )
      };

      const selectedDex = config?.selectedDex || 'raydium';
      const isBuyMode = action.type === 'buy';
      
      await executeTrade(
        selectedDex,
        walletsForTrade,
        tradingConfig,
        isBuyMode,
        solBalances
      );

      showToast?.(`${action.type === 'buy' ? 'Buy' : 'Sell'} executed successfully`, 'success');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error executing action:', errorMessage);
      showToast?.(`Error executing ${action.type}`, 'error');
    }
  }, [selectedWallets, activeTokenAddress, config, solBalances, showToast]);

  const checkAndExecuteStrategy = useCallback((strategy: TradingStrategy) => {
    // Check if all conditions are met
    const allConditionsMet = strategy.conditions.every(condition => {
      return evaluateCondition(condition, marketData);
    });

    if (allConditionsMet) {
      // Execute all actions
      strategy.actions.forEach(action => {
        void executeAction(action, strategy);
      });
      
      // Deactivate strategy after execution
      setActiveStrategies(prev => {
        const next = new Set(prev);
        next.delete(strategy.id);
        return next;
      });
      
      const strategyName = typeof strategy.name === 'string' ? strategy.name : 'Unknown';
      showToast?.(`Strategy "${strategyName}" executed successfully`, 'success');
    }
  }, [marketData, evaluateCondition, executeAction, showToast]);

  // Monitor active strategies
  useEffect(() => {
    const intervals = strategyCheckIntervals.current;
    
    activeStrategies.forEach(strategyId => {
      if (!intervals.has(strategyId)) {
        const strategy = strategies.find(s => s.id === strategyId);
        if (!strategy) return;

        const interval = setInterval(() => {
          checkAndExecuteStrategy(strategy);
        }, 5000); // Check every 5 seconds

        intervals.set(strategyId, interval);
      }
    });

    // Clean up intervals for inactive strategies
    intervals.forEach((interval, strategyId) => {
      if (!activeStrategies.has(strategyId)) {
        clearInterval(interval);
        intervals.delete(strategyId);
      }
    });

    return () => {
      intervals.forEach(interval => clearInterval(interval));
      intervals.clear();
    };
  }, [activeStrategies, strategies, checkAndExecuteStrategy]);

  const handleCreateStrategy = useCallback((strategy: TradingStrategy) => {
    const newStrategy: TradingStrategy = {
      ...strategy,
      id: generateStrategyId(),
      tokenAddresses: activeTokenAddress ? [activeTokenAddress] : strategy.tokenAddresses || [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setStrategies(prev => [...prev, newStrategy]);
    setIsCreatingStrategy(false);
    setEditingStrategy(null);
    
    showToast?.('Strategy created successfully', 'success');
  }, [activeTokenAddress, showToast]);

  const handleUpdateStrategy = useCallback((strategy: TradingStrategy) => {
    if (!editingStrategy) return;

    setStrategies(prev => prev.map(s => 
      s.id === editingStrategy.id 
        ? { ...strategy, id: editingStrategy.id, updatedAt: Date.now() }
        : s
    ));
    
    setEditingStrategy(null);
    
    showToast?.('Strategy updated successfully', 'success');
  }, [editingStrategy, showToast]);

  const handleDeleteStrategy = useCallback((strategyId: string) => {
    setStrategies(prev => prev.filter(s => s.id !== strategyId));
    
    // Deactivate if active
    setActiveStrategies(prev => {
      const next = new Set(prev);
      next.delete(strategyId);
      return next;
    });
    
    showToast?.('Strategy deleted successfully', 'success');
  }, [showToast]);

  const handleToggleStrategy = useCallback((strategyId: string) => {
    setActiveStrategies(prev => {
      const next = new Set(prev);
      if (next.has(strategyId)) {
        next.delete(strategyId);
      } else {
        next.add(strategyId);
      }
      return next;
    });
  }, []);

  const handleEditStrategy = useCallback((strategy: TradingStrategy) => {
    setEditingStrategy(strategy);
    setIsCreatingStrategy(true);
  }, []);

  const handleExportStrategies = useCallback(() => {
    const dataStr = JSON.stringify(strategies, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trading-strategies.json';
    link.click();
    URL.revokeObjectURL(url);
    showToast?.('Strategies exported successfully', 'success');
  }, [strategies, showToast]);

  const handleImportStrategies = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') {
          showToast?.('Error importing strategies: invalid file format', 'error');
          return;
        }
        const imported = JSON.parse(result) as TradingStrategy[];
        if (!Array.isArray(imported)) {
          showToast?.('Error importing strategies: invalid format', 'error');
          return;
        }
        setStrategies(prev => [...prev, ...imported]);
        showToast?.('Strategies imported successfully', 'success');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error importing strategies:', errorMessage);
        showToast?.('Error importing strategies', 'error');
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  // Wallet selection handlers
  const handleSelectWallet = useCallback((wallet: WalletType) => {
    const walletAddress = wallet.address;
    const isSelected = selectedWallets.some(w => w.address === walletAddress);
    
    if (isSelected) {
      setSelectedWallets(prev => prev.filter(w => w.address !== walletAddress));
    } else {
      setSelectedWallets(prev => [...prev, {
        privateKey: wallet.privateKey || '',
        address: walletAddress,
        displayName: getWalletDisplayName(wallet)
      }]);
    }
  }, [selectedWallets]);

  const handleSelectAllWallets = useCallback(() => {
    if (selectedWallets.length === activeWallets.length) {
      setSelectedWallets([]);
    } else {
      const allWallets = activeWallets.map(w => ({
        privateKey: w.privateKey || '',
        address: w.address,
        displayName: getWalletDisplayName(w)
      }));
      setSelectedWallets(allWallets);
    }
  }, [selectedWallets.length, activeWallets]);

  const handleClearSelectedWallets = useCallback(() => {
    setSelectedWallets([]);
  }, []);

  // Filter and sort wallets
  const filteredWallets: WalletType[] = useMemo((): WalletType[] => {
    if (!Array.isArray(activeWallets)) {
      return [];
    }
    
    const walletsArray: WalletType[] = activeWallets.filter((w): w is WalletType => 
      w !== null && w !== undefined && typeof w === 'object' && 'address' in w
    );
    
    let filtered: WalletType[] = [...walletsArray];

    // Apply search filter
    if (walletSearchTerm && typeof walletSearchTerm === 'string') {
      const searchLower = walletSearchTerm.toLowerCase();
      filtered = filtered.filter((wallet: WalletType) => {
        if (!wallet || typeof wallet.address !== 'string') return false;
        const displayName = getWalletDisplayName(wallet).toLowerCase();
        const address = wallet.address.toLowerCase();
        return displayName.includes(searchLower) || address.includes(searchLower);
      });
    }

    // Apply balance filter
    if (walletBalanceFilter !== 'all' && typeof walletBalanceFilter === 'string') {
      filtered = filtered.filter((wallet: WalletType) => {
        if (!wallet || typeof wallet.address !== 'string') return false;
        const solBalance = solBalances.get(wallet.address) ?? 0;
        const tokenBalance = tokenBalances.get(wallet.address) ?? 0;
        
        if (walletBalanceFilter === 'withSOL') return solBalance > 0;
        if (walletBalanceFilter === 'withTokens') return tokenBalance > 0;
        if (walletBalanceFilter === 'withBoth') return solBalance > 0 && tokenBalance > 0;
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a: WalletType, b: WalletType) => {
      if (!a || !b || typeof a.address !== 'string' || typeof b.address !== 'string') {
        return 0;
      }
      
      let compareValue = 0;
      
      if (walletSortOption === 'address') {
        compareValue = a.address.localeCompare(b.address);
      } else if (walletSortOption === 'solBalance') {
        const balanceA = solBalances.get(a.address) ?? 0;
        const balanceB = solBalances.get(b.address) ?? 0;
        compareValue = balanceA - balanceB;
      } else if (walletSortOption === 'tokenBalance') {
        const balanceA = tokenBalances.get(a.address) ?? 0;
        const balanceB = tokenBalances.get(b.address) ?? 0;
        compareValue = balanceA - balanceB;
      }
      
      return walletSortDirection === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [activeWallets, walletSearchTerm, walletBalanceFilter, walletSortOption, walletSortDirection, solBalances, tokenBalances]);

  return (
    <div className="min-h-screen bg-app-primary text-app-tertiary flex">
      {/* Unified Header */}
      <UnifiedHeader tokenAddress={tokenAddressFromUrl} />

      {/* Main Content - with left margin for sidebar */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden w-full md:w-auto md:ml-48 bg-app-primary">
        {/* Background effects layer */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Grid pattern background */}
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
          
          {/* Corner accent lines - 4 corners with gradient lines */}
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

          {/* Scanline overlay effect */}
          <div className="absolute inset-0 scanline pointer-events-none opacity-30"></div>

          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent pointer-events-none"></div>
        </div>

        {/* Content container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-4 lg:gap-6">
          {/* Left Column - Wallet Selection */}
          <div
            className="md:col-span-1 lg:col-span-3 animate-slide-in"
          >
            <div className="bg-app-primary border border-app-primary-20 rounded-lg p-3 md:p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base md:text-lg font-bold color-primary font-mono leading-tight">WALLETS</h2>
                <span className="text-xs md:text-sm text-app-secondary-80 font-mono leading-normal">
                  {selectedWallets.length} / {activeWallets.length} selected
                </span>
              </div>

              {/* Wallet Controls */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 color-tertiary opacity-50" />
                  <input
                    type="text"
                    value={walletSearchTerm}
                    onChange={(e) => setWalletSearchTerm(e.target.value)}
                    placeholder="Search wallets..."
                    className="w-full pl-10 pr-4 py-2.5 md:py-2 bg-app-primary text-app-tertiary border border-app-primary-40 rounded-lg focus:outline-none focus:border-app-primary-color font-mono text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAllWallets}
                    className="flex-1 px-3 py-2.5 md:py-2 bg-app-quaternary hover:bg-app-tertiary rounded-lg transition-colors flex items-center justify-center gap-2 border border-app-primary-40 hover:border-app-primary-60 text-app-primary"
                  >
                    <Users size={14} className="text-app-tertiary" />
                    <span className="font-mono text-xs md:text-sm leading-normal">
                      {selectedWallets.length === activeWallets.length ? 'Deselect All' : 'Select All'}
                    </span>
                  </button>
                  
                  {selectedWallets.length > 0 && (
                    <button
                      onClick={handleClearSelectedWallets}
                      className="px-3 py-2.5 md:py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      aria-label="Clear selection"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Wallet List */}
              <div className="space-y-2 max-h-[400px] md:max-h-[600px] overflow-y-auto custom-scrollbar touch-pan-y">
                {filteredWallets.map((wallet: WalletType) => {
                  if (!wallet || typeof wallet.address !== 'string') {
                    return null;
                  }
                  
                  const walletAddress = wallet.address;
                  const isSelected = selectedWallets.some(w => w.address === walletAddress);
                  const solBalance = solBalances.get(walletAddress) ?? 0;
                  const tokenBalance = tokenBalances.get(walletAddress) ?? 0;

                  return (
                    <button
                      key={walletAddress}
                      onClick={() => handleSelectWallet(wallet)}
                      className={`w-full p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-app-primary-color/10 border-app-primary-color'
                          : 'bg-app-primary border-app-primary-40 hover:border-app-primary-30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <div className="text-left">
                          <div className="font-mono text-xs md:text-sm text-app-primary leading-normal">
                            {getWalletDisplayName(wallet)}
                          </div>
                          <div className="font-mono text-xs text-app-secondary-80 leading-normal">
                            {formatAddress(walletAddress)}
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="font-mono text-xs md:text-sm text-app-tertiary leading-normal">
                            {formatSolBalance(solBalance)} SOL
                          </div>
                          {activeTokenAddress && tokenBalance > 0 && (
                            <div className="font-mono text-xs md:text-sm color-primary leading-normal">
                              {formatTokenBalance(tokenBalance)}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Middle Column - Market Data & Active Configs */}
          <div
            className="md:col-span-1 lg:col-span-5 space-y-6 animate-slide-up"
          >
            {/* Market Data Panel */}
            <div className="bg-app-primary border border-app-primary-20 rounded-lg p-4 md:p-6">
              <h2 className="text-base md:text-lg font-bold color-primary font-mono mb-4 leading-tight">MARKET DATA</h2>
              
              {!activeTokenAddress ? (
                <div className="space-y-4">
                  <div className="text-center py-8 text-app-secondary-80">
                    <p className="font-mono text-xs md:text-sm mb-4 leading-normal">Enter a token address to view market data</p>
                  </div>
                  <div className="max-w-md mx-auto">
                    <label className="block text-xs md:text-sm font-mono text-app-tertiary/70 mb-2">
                      Token Address
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={localTokenAddress}
                        onChange={(e) => setLocalTokenAddress(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && localTokenAddress.trim()) {
                            setLocalTokenAddress(localTokenAddress.trim());
                          }
                        }}
                        placeholder="Enter token mint address..."
                        className="flex-1 px-4 py-2 bg-app-primary text-app-tertiary border border-app-primary-40 rounded-lg focus:outline-none focus:border-app-primary-color font-mono text-sm"
                      />
                      <button
                        onClick={() => {
                          if (localTokenAddress.trim()) {
                            setLocalTokenAddress(localTokenAddress.trim());
                          }
                        }}
                        disabled={!localTokenAddress.trim()}
                        className="px-4 py-2 bg-app-primary-color hover:bg-app-primary-color/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
                      >
                        Load
                      </button>
                    </div>
                    <p className="text-xs md:text-sm text-app-secondary-80 font-mono mt-2 leading-normal">
                      Enter a Solana token mint address to start viewing market data
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Token Address Display */}
                  <div className="flex items-center justify-between bg-app-quaternary border border-app-primary-40 rounded-lg p-3">
                    <div>
                      <div className="text-xs text-app-secondary-80 font-mono mb-1 leading-normal">Token Address</div>
                      <div className="text-xs md:text-sm font-mono text-app-primary break-all leading-normal">
                        {activeTokenAddress}
                      </div>
                    </div>
                    {!tokenAddress && (
                      <button
                        onClick={() => {
                          setLocalTokenAddress('');
                          setNonWhitelistedTrades([]);
                        }}
                        className="p-2 bg-app-quaternary hover:bg-app-tertiary rounded-lg transition-colors text-xs md:text-sm font-mono leading-normal border border-app-primary-40 hover:border-app-primary-60 text-app-primary"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {/* Market Data Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-app-quaternary border border-app-primary-40 rounded-lg p-3 md:p-4">
                      <div className="text-xs text-app-secondary-80 font-mono mb-1 md:mb-2 leading-normal uppercase">Market Cap</div>
                      <div className="text-base md:text-lg font-bold text-app-primary font-mono leading-tight">
                        ${formatLargeNumber(marketData.marketCap)}
                      </div>
                    </div>
                    
                    <div className="bg-app-quaternary border border-app-primary-40 rounded-lg p-3 md:p-4">
                      <div className="text-xs text-app-secondary-80 font-mono mb-1 md:mb-2 leading-normal uppercase">Token Price</div>
                      <div className="text-base md:text-lg font-bold text-app-primary font-mono leading-tight">
                        ${formatPrice(marketData.tokenPrice)}
                      </div>
                    </div>
                    
                    <div className="bg-app-quaternary border border-app-primary-40 rounded-lg p-3 md:p-4">
                      <div className="text-xs text-app-secondary-80 font-mono mb-1 md:mb-2 leading-normal uppercase">24h Buy Volume</div>
                      <div className="text-base md:text-lg font-bold text-green-400 font-mono leading-tight">
                        {formatSolBalance(marketData.buyVolume)} SOL
                      </div>
                    </div>
                    
                    <div className="bg-app-quaternary border border-app-primary-40 rounded-lg p-3 md:p-4">
                      <div className="text-xs text-app-secondary-80 font-mono mb-1 md:mb-2 leading-normal uppercase">24h Sell Volume</div>
                      <div className="text-base md:text-lg font-bold text-red-400 font-mono leading-tight">
                        {formatSolBalance(marketData.sellVolume)} SOL
                      </div>
                    </div>
                    
                    <div className="bg-app-quaternary border border-app-primary-40 rounded-lg p-3 md:p-4">
                      <div className="text-xs text-app-secondary-80 font-mono mb-1 md:mb-2 leading-normal uppercase">Net Volume</div>
                      <div className={`text-base md:text-lg font-bold font-mono leading-tight ${
                        marketData.netVolume > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatSolBalance(Math.abs(marketData.netVolume))} SOL
                      </div>
                    </div>
                    
                    <div className="bg-app-quaternary border border-app-primary-40 rounded-lg p-3 md:p-4">
                      <div className="text-xs text-app-secondary-80 font-mono mb-1 md:mb-2 leading-normal uppercase">Last Trade</div>
                      <div className="text-base md:text-lg font-bold text-app-primary font-mono leading-tight">
                        {marketData.lastTrade ? (
                          <span className={marketData.lastTrade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                            {marketData.lastTrade.type.toUpperCase()}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Active Configs Panel */}
            <div className="bg-app-primary border border-app-primary-20 rounded-lg p-3 md:p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base md:text-lg font-bold color-primary font-mono leading-tight">ACTIVE STRATEGIES</h2>
                <span className="text-xs md:text-sm text-app-secondary-80 font-mono leading-normal">
                  {activeStrategies.size} active
                </span>
              </div>

              {activeStrategies.size === 0 ? (
                <div className="text-center py-8 text-app-secondary-80">
                  <div className="flex justify-center mb-3">
                    <Play size={28} className="md:w-8 md:h-8 opacity-50" />
                  </div>
                  <p className="font-mono text-xs md:text-sm mb-1 leading-normal">No active strategies</p>
                  <p className="font-mono text-xs md:text-sm opacity-70 leading-normal">Activate a strategy to start automated trading</p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {Array.from(activeStrategies).map((strategyId) => {
                    const strategy = strategies.find(s => s.id === strategyId);
                    if (!strategy) return null;

                    return (
                      <div
                        key={strategy.id}
                        className="bg-app-quaternary border border-app-primary-color shadow-lg rounded-lg p-3 md:p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm md:text-base text-app-primary font-mono truncate leading-tight">
                              {strategy.name}
                            </h4>
                            <div className="text-xs md:text-sm text-app-secondary-80 font-mono mt-1 leading-normal">
                              {strategy.conditions.length} condition{strategy.conditions.length !== 1 ? 's' : ''} • {strategy.actions.length} action{strategy.actions.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleToggleStrategy(strategy.id)}
                            className="p-2.5 md:p-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 active:bg-yellow-500/40 rounded-lg transition-colors flex-shrink-0 ml-2"
                            title="Pause strategy"
                          >
                            <Pause size={16} />
                          </button>
                        </div>

                        <div className="pt-3 border-t border-app-primary-40 space-y-1.5 md:space-y-2">
                          <div className="flex items-center gap-2 text-xs md:text-sm text-green-400 font-mono leading-normal">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                            <span>Monitoring conditions...</span>
                          </div>
                          <div className="text-xs md:text-sm text-app-secondary-80 font-mono leading-normal">
                            Executed: {strategy.executionCount || 0} times
                          </div>
                          {strategy.lastExecuted && (
                            <div className="text-xs md:text-sm text-app-secondary-80 font-mono leading-normal">
                              Last: {new Date(strategy.lastExecuted).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Strategy Management */}
          <div
            className="md:col-span-2 lg:col-span-4 animate-slide-in"
            style={{ animationDirection: 'reverse' }}
          >

            {/* Strategy Management Panel */}
            <div className="space-y-4">
                {/* Create/Edit Strategy */}
                {(isCreatingStrategy || editingStrategy) && (
                  <div className="bg-app-primary border border-app-primary-20 rounded-lg p-3 md:p-4">
                    <h3 className="text-base md:text-lg font-bold color-primary font-mono mb-4 leading-tight">
                      {editingStrategy ? 'EDIT STRATEGY' : 'CREATE NEW STRATEGY'}
                    </h3>
                    
                    <StrategyBuilder
                      strategy={editingStrategy || null}
                      onSave={editingStrategy ? handleUpdateStrategy : handleCreateStrategy}
                      onCancel={() => {
                        setIsCreatingStrategy(false);
                        setEditingStrategy(null);
                      }}
                    />
                  </div>
                )}

                {/* Strategy List */}
                {!isCreatingStrategy && !editingStrategy && (
                  <>
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={handleExportStrategies}
                        disabled={strategies.length === 0}
                        className="px-3 py-2 md:px-4 md:py-2 bg-app-quaternary hover:bg-app-tertiary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-app-primary-40 hover:border-app-primary-60 text-app-primary"
                      >
                        <Download size={16} />
                        <span className="font-mono text-xs md:text-sm">EXPORT</span>
                      </button>
                      
                      <label className="px-3 py-2 md:px-4 md:py-2 bg-app-quaternary hover:bg-app-tertiary rounded-lg transition-colors cursor-pointer flex items-center gap-2 border border-app-primary-40 hover:border-app-primary-60 text-app-primary">
                        <Upload size={16} />
                        <span className="font-mono text-xs md:text-sm">IMPORT</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportStrategies}
                          className="hidden"
                        />
                      </label>
                      
                      <button
                        onClick={() => setIsCreatingStrategy(true)}
                        className="px-3 py-2 md:px-4 md:py-2 bg-app-primary-color hover:bg-app-primary-color/80 active:bg-app-primary-color/70 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Plus size={16} />
                        <span className="font-mono text-xs md:text-sm sm:inline hidden leading-normal">New Strategy</span>
                        <span className="font-mono text-xs md:text-sm sm:hidden leading-normal">New</span>
                      </button>
                    </div>

                    {strategies.length === 0 ? (
                      <div className="bg-app-primary border border-app-primary-20 rounded-lg p-8 md:p-12 text-center">
                        <p className="text-app-secondary-80 font-mono text-xs md:text-sm mb-4 leading-normal">No strategies created yet</p>
                        <button
                          onClick={() => setIsCreatingStrategy(true)}
                          className="px-3 py-2 md:px-4 md:py-2 bg-app-primary-color hover:bg-app-primary-dark text-black font-bold rounded-lg transition-colors font-mono text-xs md:text-sm leading-normal"
                        >
                          Create Your First Strategy
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 md:space-y-3">
                        {strategies.map((strategy) => {
                          const isActive = activeStrategies.has(strategy.id);
                          
                          return (
                            <div
                              key={strategy.id}
                              className={`bg-app-quaternary border rounded-lg p-3 md:p-4 transition-all hover:bg-app-tertiary ${
                                isActive
                                  ? 'border-app-primary-color'
                                  : 'border-app-primary-40'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-sm md:text-base text-app-primary font-mono truncate leading-tight">{strategy.name}</h4>
                                  {strategy.description && (
                                    <p className="text-xs md:text-sm text-app-secondary-80 font-mono mt-1 line-clamp-2 leading-normal">
                                      {strategy.description}
                                    </p>
                                  )}
                                  <div className="text-xs md:text-sm text-app-secondary-80 font-mono mt-1 leading-normal">
                                    {strategy.conditions.length} condition{strategy.conditions.length !== 1 ? 's' : ''} • {strategy.actions.length} action{strategy.actions.length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0 ml-2">
                                  <button
                                    onClick={() => handleToggleStrategy(strategy.id)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isActive
                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                        : 'bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary'
                                    }`}
                                    title={isActive ? 'Pause strategy' : 'Activate strategy'}
                                  >
                                    {isActive ? <Pause size={16} /> : <Play size={16} />}
                                  </button>
                                  
                                  <button
                                    onClick={() => handleEditStrategy(strategy)}
                                    className="p-2 bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 rounded-lg transition-colors text-app-primary"
                                    title="Edit strategy"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  
                                  <button
                                    onClick={() => handleDeleteStrategy(strategy.id)}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                    title="Delete strategy"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AutomatePage;

