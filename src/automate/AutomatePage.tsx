import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  
  // Display mode state
  const [activeTab, setActiveTab] = useState<'data' | 'strategies'>('strategies');
  
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
  const activeTokenAddress = tokenAddress || localTokenAddress; // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="min-h-screen bg-app-primary text-app-tertiary">
      {/* Unified Header */}
      <UnifiedHeader tokenAddress={tokenAddressFromUrl} />

      {/* Main Content - with left margin for sidebar */}
      <div className="container mx-auto px-4 py-8 ml-48">
        {/* Page Title and Actions */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-app-secondary font-mono">TRADING AUTOMATION</h1>
            <p className="text-sm text-app-tertiary/70 font-mono">Create and manage automated trading strategies</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportStrategies}
              disabled={strategies.length === 0}
              className="px-4 py-2 bg-app-primary-10 hover:bg-app-primary-20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download size={16} />
              <span className="font-mono text-sm">EXPORT</span>
            </button>
            
            <label className="px-4 py-2 bg-app-primary-10 hover:bg-app-primary-20 rounded-lg transition-colors cursor-pointer flex items-center gap-2">
              <Upload size={16} />
              <span className="font-mono text-sm">IMPORT</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportStrategies}
                className="hidden"
              />
            </label>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Wallet Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-app-primary-95 border border-app-primary-40 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-app-secondary">Wallets</h2>
                <span className="text-sm text-app-tertiary/70 font-mono">
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
                    className="w-full pl-10 pr-4 py-2 bg-app-primary text-app-tertiary border border-app-primary-40 rounded-lg focus:outline-none focus:border-app-primary-color font-mono text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAllWallets}
                    className="flex-1 px-3 py-2 bg-app-primary-10 hover:bg-app-primary-20 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Users size={14} />
                    <span className="font-mono text-xs">
                      {selectedWallets.length === activeWallets.length ? 'Deselect All' : 'Select All'}
                    </span>
                  </button>
                  
                  {selectedWallets.length > 0 && (
                    <button
                      onClick={handleClearSelectedWallets}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Wallet List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
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
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className="font-mono text-sm text-app-secondary">
                            {getWalletDisplayName(wallet)}
                          </div>
                          <div className="font-mono text-xs text-app-tertiary/50">
                            {formatAddress(walletAddress)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-xs text-app-tertiary">
                            {formatSolBalance(solBalance)} SOL
                          </div>
                          {activeTokenAddress && tokenBalance > 0 && (
                            <div className="font-mono text-xs text-app-primary-color">
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
          </motion.div>

          {/* Middle & Right Columns - Market Data & Strategies */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('data')}
                className={`px-6 py-3 rounded-lg font-mono text-sm transition-all ${
                  activeTab === 'data'
                    ? 'bg-app-primary-color text-white'
                    : 'bg-app-primary-95 text-app-tertiary hover:bg-app-primary-90'
                }`}
              >
                Market Data
              </button>
              <button
                onClick={() => setActiveTab('strategies')}
                className={`px-6 py-3 rounded-lg font-mono text-sm transition-all ${
                  activeTab === 'strategies'
                    ? 'bg-app-primary-color text-white'
                    : 'bg-app-primary-95 text-app-tertiary hover:bg-app-primary-90'
                }`}
              >
                Strategies ({strategies.length})
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'data' && (
              <div className="bg-app-primary-95 border border-app-primary-40 rounded-lg p-6">
                <h2 className="text-lg font-bold text-app-secondary mb-4">Market Overview</h2>
                
                {!activeTokenAddress ? (
                  <div className="space-y-4">
                    <div className="text-center py-8 text-app-tertiary/50">
                      <p className="font-mono mb-4">Enter a token address to view market data</p>
                    </div>
                    <div className="max-w-md mx-auto">
                      <label className="block text-sm font-mono text-app-tertiary/70 mb-2">
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
                      <p className="text-xs text-app-tertiary/50 font-mono mt-2">
                        Enter a Solana token mint address to start viewing market data
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Token Address Display */}
                    <div className="flex items-center justify-between bg-app-primary border border-app-primary-40 rounded-lg p-3">
                      <div>
                        <div className="text-xs text-app-tertiary/70 font-mono mb-1">Token Address</div>
                        <div className="text-sm font-mono text-app-secondary break-all">
                          {activeTokenAddress}
                        </div>
                      </div>
                      {!tokenAddress && (
                        <button
                          onClick={() => {
                            setLocalTokenAddress('');
                            setNonWhitelistedTrades([]);
                          }}
                          className="px-3 py-1.5 bg-app-primary-10 hover:bg-app-primary-20 rounded-lg transition-colors text-xs font-mono"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {/* Market Data Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-app-primary border border-app-primary-40 rounded-lg p-4">
                        <div className="text-xs text-app-tertiary/70 font-mono mb-1">Market Cap</div>
                        <div className="text-lg font-bold text-app-secondary font-mono">
                          ${formatLargeNumber(marketData.marketCap)}
                        </div>
                      </div>
                      
                      <div className="bg-app-primary border border-app-primary-40 rounded-lg p-4">
                        <div className="text-xs text-app-tertiary/70 font-mono mb-1">Token Price</div>
                        <div className="text-lg font-bold text-app-secondary font-mono">
                          ${formatPrice(marketData.tokenPrice)}
                        </div>
                      </div>
                      
                      <div className="bg-app-primary border border-app-primary-40 rounded-lg p-4">
                        <div className="text-xs text-app-tertiary/70 font-mono mb-1">24h Buy Volume</div>
                        <div className="text-lg font-bold text-green-400 font-mono">
                          {formatSolBalance(marketData.buyVolume)} SOL
                        </div>
                      </div>
                      
                      <div className="bg-app-primary border border-app-primary-40 rounded-lg p-4">
                        <div className="text-xs text-app-tertiary/70 font-mono mb-1">24h Sell Volume</div>
                        <div className="text-lg font-bold text-red-400 font-mono">
                          {formatSolBalance(marketData.sellVolume)} SOL
                        </div>
                      </div>
                      
                      <div className="bg-app-primary border border-app-primary-40 rounded-lg p-4">
                        <div className="text-xs text-app-tertiary/70 font-mono mb-1">Net Volume</div>
                        <div className={`text-lg font-bold font-mono ${
                          marketData.netVolume > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatSolBalance(Math.abs(marketData.netVolume))} SOL
                        </div>
                      </div>
                      
                      <div className="bg-app-primary border border-app-primary-40 rounded-lg p-4">
                        <div className="text-xs text-app-tertiary/70 font-mono mb-1">Last Trade</div>
                        <div className="text-lg font-bold text-app-secondary font-mono">
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
            )}

            {activeTab === 'strategies' && (
              <div className="space-y-4">
                {/* Create/Edit Strategy */}
                {(isCreatingStrategy || editingStrategy) && (
                  <div className="bg-app-primary-95 border border-app-primary-40 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-app-secondary mb-4">
                      {editingStrategy ? 'Edit Strategy' : 'Create New Strategy'}
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
                    <div className="flex justify-end">
                      <button
                        onClick={() => setIsCreatingStrategy(true)}
                        className="px-4 py-2 bg-app-primary-color hover:bg-app-primary-color/80 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Plus size={16} />
                        <span className="font-mono text-sm">New Strategy</span>
                      </button>
                    </div>

                    {strategies.length === 0 ? (
                      <div className="bg-app-primary-95 border border-app-primary-40 rounded-lg p-12 text-center">
                        <p className="text-app-tertiary/50 font-mono mb-4">No strategies created yet</p>
                        <button
                          onClick={() => setIsCreatingStrategy(true)}
                          className="px-6 py-3 bg-app-primary-color hover:bg-app-primary-color/80 text-white rounded-lg transition-colors"
                        >
                          Create Your First Strategy
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {strategies.map((strategy) => {
                          const isActive = activeStrategies.has(strategy.id);
                          
                          return (
                            <div
                              key={strategy.id}
                              className={`bg-app-primary-95 border rounded-lg p-4 transition-all ${
                                isActive
                                  ? 'border-app-primary-color shadow-lg'
                                  : 'border-app-primary-40'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-bold text-app-secondary">{strategy.name}</h4>
                                  <div className="text-xs text-app-tertiary/70 font-mono mt-1">
                                    {strategy.conditions.length} condition{strategy.conditions.length !== 1 ? 's' : ''} • {strategy.actions.length} action{strategy.actions.length !== 1 ? 's' : ''}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleStrategy(strategy.id)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isActive
                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                        : 'bg-app-primary-10 hover:bg-app-primary-20'
                                    }`}
                                    title={isActive ? 'Pause strategy' : 'Activate strategy'}
                                  >
                                    {isActive ? <Pause size={16} /> : <Play size={16} />}
                                  </button>
                                  
                                  <button
                                    onClick={() => handleEditStrategy(strategy)}
                                    className="p-2 bg-app-primary-10 hover:bg-app-primary-20 rounded-lg transition-colors"
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

                              {isActive && (
                                <div className="mt-3 pt-3 border-t border-app-primary-40">
                                  <div className="flex items-center gap-2 text-xs text-green-400 font-mono">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                    <span>Active - Monitoring conditions...</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AutomatePage;

