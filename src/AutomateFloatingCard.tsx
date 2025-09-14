import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Move, Search, ArrowDown, Trash2, Users, Wallet, Settings, Plus, Play, Pause, Edit, RotateCcw, Minimize2, Maximize2, Download, Upload } from 'lucide-react';
import { getWalletDisplayName, WalletType, saveTradingStrategiesToCookies, loadTradingStrategiesFromCookies } from './Utils.tsx';
import { TradingCondition, TradingAction, TradingStrategy, StrategyBuilder } from './automate';
import { generateStrategyId } from './automate/utils';
import { executeTrade, TradingConfig, FormattedWallet } from './utils/trading';

interface NonWhitelistedTrade {
  type: 'buy' | 'sell';
  address: string;
  tokensAmount: number;
  avgPrice: number;
  solAmount: number;
  timestamp: number;
  signature: string;
  tokenMint: string;
  marketCap: number;
  walletAddress?: string; // Address of the wallet that made the trade
}

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

interface AutomateFloatingCardProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  isDragging: boolean;
  onDraggingChange: (dragging: boolean) => void;
  tokenAddress: string;
  wallets: any[];
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  nonWhitelistedTrades: NonWhitelistedTrade[];
  iframeData?: {
    tradingStats: any;
    solPrice: number | null;
    currentWallets: any[];
    tokenPrice: {
      tokenPrice: number;
      tokenMint: string;
      timestamp: number;
      tradeType: 'buy' | 'sell';
      volume: number;
    } | null;
    marketCap: number | null;
  } | null;
}

const AutomateFloatingCard: React.FC<AutomateFloatingCardProps> = ({
  isOpen,
  onClose,
  position,
  onPositionChange,
  isDragging,
  onDraggingChange,
  tokenAddress,
  wallets,
  solBalances,
  tokenBalances,
  nonWhitelistedTrades,
  iframeData
}) => {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Volume tracking state
  const [cumulativeBuyVolume, setCumulativeBuyVolume] = useState(0);
  const [cumulativeSellVolume, setCumulativeSellVolume] = useState(0);
  const [processedTradeSignatures, setProcessedTradeSignatures] = useState<Set<string>>(new Set());
  
  // Wallet selection state
  const [selectedWallets, setSelectedWallets] = useState<SelectedWallet[]>([]);
  const [showInlineWalletList, setShowInlineWalletList] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [walletSearchTerm, setWalletSearchTerm] = useState('');
  const [walletSortOption, setWalletSortOption] = useState('address');
  const [walletSortDirection, setWalletSortDirection] = useState('asc');
  const [walletBalanceFilter, setWalletBalanceFilter] = useState('all');
  
  // Display mode state
  const [showUSD, setShowUSD] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'strategies'>('data');
  
  // Trading strategy state
  const [tradingStrategies, setTradingStrategies] = useState<TradingStrategy[]>([]);
  const [showStrategyConfig, setShowStrategyConfig] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<TradingStrategy | null>(null);
  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false);
  const [strategyExecutionLog, setStrategyExecutionLog] = useState<Array<{
    strategyId: string;
    timestamp: number;
    action: string;
    result: 'success' | 'error';
    message: string;
  }>>([]);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const strategyMonitorRef = useRef<NodeJS.Timeout | null>(null);
  
  // Wallet utility functions
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatSolBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  const formatTokenBalance = (balance: number) => {
    return balance.toFixed(6);
  };

  const getWalletBalance = (address: string) => {
    return solBalances.has(address) ? solBalances.get(address) : 0;
  };

  const getWalletTokenBalance = (address: string) => {
    return tokenBalances.has(address) ? tokenBalances.get(address) : 0;
  };

  // Helper functions for formatting live data
  const formatPrice = (price: number | null | undefined): string => {
    if (!price || price === 0 || typeof price !== 'number' || isNaN(price)) return '$--';
    if (price < 0.000001) return `$${price.toExponential(2)}`;
    if (price < 0.01) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(4)}`;
  };

  const formatLargeNumber = (num: number | null | undefined): string => {
    if (!num || num === 0 || typeof num !== 'number' || isNaN(num)) return '--';
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatCount = (count: number | null | undefined): string => {
    if (!count && count !== 0) return '--';
    if (typeof count !== 'number' || isNaN(count)) return '--';
    return count.toLocaleString();
  };

  const formatSolToUSD = (solAmount: number): string => {
    const solPrice = iframeData?.solPrice || 0;
    if (!solPrice || solPrice === 0) return '$--';
    const usdValue = solAmount * solPrice;
    if (usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`;
    if (usdValue >= 1000) return `$${(usdValue / 1000).toFixed(2)}K`;
    return `$${usdValue.toFixed(2)}`;
  };

  const formatVolumeDisplay = (solAmount: number): string => {
    if (showUSD) {
      return formatSolToUSD(solAmount);
    }
    return `${solAmount.toFixed(4)} SOL`;
  };

  const hasInsufficientSOL = (address: string) => {
    const solBalance = getWalletBalance(address) || 0;
    return solBalance < 0.01;
  };

  // Minimize/Maximize functions
  const handleMinimize = () => {
    setIsMinimized(true);
    // Position at bottom right when minimized
    onPositionChange({ x: window.innerWidth - 200, y: window.innerHeight - 80 });
  };

  const handleMaximize = () => {
    setIsMinimized(false);
    // Return to center when maximized
    onPositionChange({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 });
  };

  const toggleAllStrategies = (activate: boolean) => {
    setTradingStrategies(prev => prev.map(strategy => ({
      ...strategy,
      isActive: activate
    })));
  };

  // Trading strategy helper functions
  const getCurrentMarketData = (): MarketData => {
    const latestTrade = nonWhitelistedTrades
      .filter(trade => trade.tokenMint === tokenAddress)
      .sort((a, b) => b.timestamp - a.timestamp)[0] || null;
    
    // Get whitelist activity for each whitelisted address in active strategies
    const whitelistActivity: Record<string, { buyVolume: number, sellVolume: number, netVolume: number, lastTrade: NonWhitelistedTrade | null }> = {};
    
    // Collect all whitelisted addresses from active strategies
    const whitelistedAddresses = new Set<string>();
    tradingStrategies.forEach(strategy => {
      if (strategy.isActive && strategy.whitelistedAddresses) {
        strategy.whitelistedAddresses.forEach(address => whitelistedAddresses.add(address));
      }
    });
    
    // Initialize whitelist activity for each address
    whitelistedAddresses.forEach(address => {
      const addressTrades = nonWhitelistedTrades
        .filter(trade => trade.tokenMint === tokenAddress && 
                (trade.walletAddress?.toLowerCase() === address.toLowerCase() || 
                 trade.address.toLowerCase() === address.toLowerCase()));
      
      const buyTrades = addressTrades.filter(trade => trade.type === 'buy');
      const sellTrades = addressTrades.filter(trade => trade.type === 'sell');
      
      const buyVolume = buyTrades.reduce((sum, trade) => sum + trade.solAmount, 0);
      const sellVolume = sellTrades.reduce((sum, trade) => sum + trade.solAmount, 0);
      
      whitelistActivity[address] = {
        buyVolume,
        sellVolume,
        netVolume: buyVolume - sellVolume,
        lastTrade: addressTrades.sort((a, b) => b.timestamp - a.timestamp)[0] || null
      };
    });
    
    const marketData = {
      marketCap: iframeData?.marketCap || 0,
      buyVolume: cumulativeBuyVolume,
      sellVolume: cumulativeSellVolume,
      netVolume: cumulativeBuyVolume - cumulativeSellVolume,
      lastTrade: latestTrade,
      tokenPrice: iframeData?.tokenPrice?.tokenPrice || 0,
      priceChange24h: 0, // TODO: Calculate from historical data
      whitelistActivity
    };
    
    console.log('[AutomateFloatingCard] Current market data:', {
      ...marketData,
      lastTrade: latestTrade ? {
        type: latestTrade.type,
        solAmount: latestTrade.solAmount,
        timestamp: latestTrade.timestamp
      } : null,
      tokenAddress,
      tradesCount: nonWhitelistedTrades.filter(trade => trade.tokenMint === tokenAddress).length
    });
    
    return marketData;
  };

  const evaluateCondition = (condition: TradingCondition, marketData: MarketData): boolean => {
    let currentValue: number;
    
    console.log(`[AutomateFloatingCard] Evaluating condition:`, {
      type: condition.type,
      operator: condition.operator,
      targetValue: condition.value,
      marketData
    });
    
    // Handle whitelist activity condition type
    if (condition.type === 'whitelistActivity' && condition.whitelistAddress) {
      const address = condition.whitelistAddress;
      const addressActivity = marketData.whitelistActivity?.[address];
      
      if (!addressActivity) {
        console.log(`[AutomateFloatingCard] No activity found for whitelisted address: ${address}`);
        return false;
      }
      
      switch (condition.whitelistActivityType) {
        case 'buyVolume':
          currentValue = addressActivity.buyVolume;
          break;
        case 'sellVolume':
          currentValue = addressActivity.sellVolume;
          break;
        case 'netVolume':
          currentValue = addressActivity.netVolume;
          break;
        case 'lastTradeAmount':
          currentValue = addressActivity.lastTrade?.solAmount || 0;
          break;
        case 'lastTradeType':
          // Special case: 1 for buy, 0 for sell
          currentValue = addressActivity.lastTrade?.type === 'buy' ? 1 : 0;
          break;
        default:
          console.log(`[AutomateFloatingCard] Unknown whitelist activity type: ${condition.whitelistActivityType}`);
          return false;
      }
    } else {
      // Handle standard condition types
      switch (condition.type) {
        case 'marketCap':
          currentValue = marketData.marketCap;
          break;
        case 'buyVolume':
          currentValue = marketData.buyVolume;
          break;
        case 'sellVolume':
          currentValue = marketData.sellVolume;
          break;
        case 'netVolume':
          currentValue = marketData.netVolume;
          break;
        case 'lastTradeAmount':
          currentValue = marketData.lastTrade?.solAmount || 0;
          break;
        case 'priceChange':
          currentValue = marketData.priceChange24h || 0;
          break;
        case 'lastTradeType':
          // Special case: 1 for buy, 0 for sell
          currentValue = marketData.lastTrade?.type === 'buy' ? 1 : 0;
          break;
        default:
          console.log(`[AutomateFloatingCard] Unknown condition type: ${condition.type}`);
          return false;
      }
    }
    
    console.log(`[AutomateFloatingCard] Current value for ${condition.type}:`, currentValue);
    
    let result: boolean;
    switch (condition.operator) {
      case 'greater':
        result = currentValue > condition.value;
        break;
      case 'less':
        result = currentValue < condition.value;
        break;
      case 'equal':
        result = Math.abs(currentValue - condition.value) < 0.0001;
        break;
      case 'greaterEqual':
        result = currentValue >= condition.value;
        break;
      case 'lessEqual':
        result = currentValue <= condition.value;
        break;
      default:
        console.log(`[AutomateFloatingCard] Unknown operator: ${condition.operator}`);
        return false;
    }
    
    console.log(`[AutomateFloatingCard] Condition evaluation result:`, {
      currentValue,
      operator: condition.operator,
      targetValue: condition.value,
      result
    });
    
    return result;
  };

  const evaluateStrategy = (strategy: TradingStrategy, marketData: MarketData): boolean => {
    console.log(`[AutomateFloatingCard] Evaluating strategy details: ${strategy.name}`, {
      isActive: strategy.isActive,
      conditionsLength: strategy.conditions.length,
      lastExecuted: strategy.lastExecuted,
      executionCount: strategy.executionCount,
      maxExecutions: strategy.maxExecutions,
      cooldown: strategy.cooldown
    });
    
    if (!strategy.isActive || strategy.conditions.length === 0) {
      console.log(`[AutomateFloatingCard] Strategy ${strategy.name} failed basic checks:`, {
        isActive: strategy.isActive,
        hasConditions: strategy.conditions.length > 0
      });
      return false;
    }
    
    // Check cooldown
    if (strategy.lastExecuted) {
      const timeSinceLastExecution = Date.now() - strategy.lastExecuted;
      const cooldownMs = strategy.cooldown * 60 * 1000;
      console.log(`[AutomateFloatingCard] Cooldown check for ${strategy.name}:`, {
        timeSinceLastExecution,
        cooldownMs,
        isInCooldown: timeSinceLastExecution < cooldownMs
      });
      if (timeSinceLastExecution < cooldownMs) return false;
    }
    
    // Check max executions
    if (strategy.maxExecutions && strategy.executionCount >= strategy.maxExecutions) {
      console.log(`[AutomateFloatingCard] Max executions reached for ${strategy.name}:`, {
        executionCount: strategy.executionCount,
        maxExecutions: strategy.maxExecutions
      });
      return false;
    }
    
    // Evaluate conditions
    const conditionResults = strategy.conditions.map((condition, index) => {
      const result = evaluateCondition(condition, marketData);
      console.log(`[AutomateFloatingCard] Condition ${index} for ${strategy.name}:`, {
        condition,
        result,
        marketData
      });
      return result;
    });
    
    const finalResult = strategy.conditionLogic === 'and' 
      ? conditionResults.every(result => result)
      : conditionResults.some(result => result);
    
    console.log(`[AutomateFloatingCard] Final evaluation for ${strategy.name}:`, {
      conditionLogic: strategy.conditionLogic,
      conditionResults,
      finalResult
    });
    
    return finalResult;
  };

  // Load trading strategies from cookies on component initialization
  useEffect(() => {
    const savedStrategies = loadTradingStrategiesFromCookies();
    if (savedStrategies.length > 0) {
      console.log('[AutomateFloatingCard] Loaded strategies from cookies:', savedStrategies.length);
      setTradingStrategies(savedStrategies);
    }
  }, []);

  // Save trading strategies to cookies whenever they change
  useEffect(() => {
    if (tradingStrategies.length > 0) {
      console.log('[AutomateFloatingCard] Saving strategies to cookies:', tradingStrategies.length);
      saveTradingStrategiesToCookies(tradingStrategies);
    }
  }, [tradingStrategies]);

  // Reset data when token changes
  useEffect(() => {
    setCumulativeBuyVolume(0);
    setCumulativeSellVolume(0);
    setProcessedTradeSignatures(new Set());
  }, [tokenAddress]);

  // Process new trades and update cumulative volumes
  useEffect(() => {
    nonWhitelistedTrades.forEach(trade => {
      if (!processedTradeSignatures.has(trade.signature)) {
        setProcessedTradeSignatures(prev => new Set(prev).add(trade.signature));
        
        if (trade.type === 'buy') {
          setCumulativeBuyVolume(prev => prev + trade.solAmount);
        } else if (trade.type === 'sell') {
          setCumulativeSellVolume(prev => prev + trade.solAmount);
        }
      }
    });
  }, [nonWhitelistedTrades, processedTradeSignatures]);

  // Handle window resize to keep minimized card positioned correctly
  useEffect(() => {
    const handleResize = () => {
      if (isMinimized) {
        onPositionChange({ x: window.innerWidth - 200, y: window.innerHeight - 80 });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMinimized, onPositionChange]);

  // Strategy monitoring and execution
  useEffect(() => {
    console.log('[AutomateFloatingCard] Strategy monitoring effect triggered', {
      strategiesCount: tradingStrategies.length,
      strategies: tradingStrategies.map(s => ({ id: s.id, name: s.name, isActive: s.isActive })),
      selectedWalletsCount: selectedWallets.length,
      tokenAddress
    });
    
    // Clear existing interval first
    if (strategyMonitorRef.current) {
      console.log('[AutomateFloatingCard] Clearing existing strategy monitor interval');
      clearInterval(strategyMonitorRef.current);
      strategyMonitorRef.current = null;
    }
    
    if (tradingStrategies.length === 0) {
      console.log('[AutomateFloatingCard] No strategies found, monitor will not start');
      return;
    }

    const activeStrategies = tradingStrategies.filter(s => s.isActive);
    if (activeStrategies.length === 0) {
      console.log('[AutomateFloatingCard] No active strategies found, monitor will not start');
      return;
    }

    // Monitor strategies every 5 seconds
    console.log('[AutomateFloatingCard] Starting strategy monitor interval', {
      activeStrategiesCount: activeStrategies.length,
      selectedWalletsCount: selectedWallets.length
    });
    
    // Test interval first
    let tickCount = 0;
    strategyMonitorRef.current = setInterval(() => {
      tickCount++;
      console.log(`[AutomateFloatingCard] === Strategy Monitor Tick #${tickCount} ===`);
      const marketData = getCurrentMarketData();
      console.log('[AutomateFloatingCard] Market data retrieved:', {
        marketCap: marketData.marketCap,
        buyVolume: marketData.buyVolume,
        sellVolume: marketData.sellVolume,
        lastTrade: marketData.lastTrade ? {
          type: marketData.lastTrade.type,
          solAmount: marketData.lastTrade.solAmount
        } : null
      });
      
      const currentActiveStrategies = tradingStrategies.filter(s => s.isActive);
      console.log('[AutomateFloatingCard] Active strategies to evaluate:', currentActiveStrategies.length);
      
      currentActiveStrategies.forEach(strategy => {
        console.log(`[AutomateFloatingCard] Evaluating strategy: ${strategy.name}`, {
          isActive: strategy.isActive,
          conditionsCount: strategy.conditions.length,
          actionsCount: strategy.actions.length,
          selectedWalletsCount: selectedWallets.length
        });
        
        if (selectedWallets.length === 0) {
          console.warn(`[AutomateFloatingCard] No wallets selected for strategy: ${strategy.name}`);
          return;
        }
        
        if (evaluateStrategy(strategy, marketData)) {
          console.log(`[AutomateFloatingCard] Strategy conditions met, executing: ${strategy.name}`);
          executeStrategy(strategy, marketData);
        } else {
          console.log(`[AutomateFloatingCard] Strategy conditions not met: ${strategy.name}`);
        }
      });
      
      console.log('[AutomateFloatingCard] === End Strategy Monitor Tick ===');
    }, 5000);

    return () => {
      console.log('[AutomateFloatingCard] Cleaning up strategy monitor interval');
      if (strategyMonitorRef.current) {
        clearInterval(strategyMonitorRef.current);
        strategyMonitorRef.current = null;
      }
    };
  }, [tradingStrategies, selectedWallets, tokenAddress]);

  const executeStrategy = async (strategy: TradingStrategy, marketData: MarketData) => {
    console.log(`[AutomateFloatingCard] Executing strategy: ${strategy.name}`, {
      actionsCount: strategy.actions.length,
      marketData
    });
    
    try {
      // Update strategy execution count and timestamp
      console.log(`[AutomateFloatingCard] Updating strategy execution count for: ${strategy.name}`);
      setTradingStrategies(prev => prev.map(s => 
        s.id === strategy.id 
          ? { ...s, executionCount: s.executionCount + 1, lastExecuted: Date.now() }
          : s
      ));

      // Execute each action in the strategy
      console.log(`[AutomateFloatingCard] Executing ${strategy.actions.length} actions for strategy: ${strategy.name}`);
      for (const action of strategy.actions) {
        console.log(`[AutomateFloatingCard] Executing action:`, action);
        await executeAction(action, strategy, marketData);
      }

      // Log successful execution
      console.log(`[AutomateFloatingCard] Strategy execution completed successfully: ${strategy.name}`);
      setStrategyExecutionLog(prev => [{
        strategyId: strategy.id,
        timestamp: Date.now(),
        action: `Executed strategy: ${strategy.name}`,
        result: 'success',
        message: `Conditions met, executed ${strategy.actions.length} action(s)`
      }, ...prev.slice(0, 49)]); // Keep last 50 logs

    } catch (error) {
      // Log execution error
      console.error(`[AutomateFloatingCard] Strategy execution failed: ${strategy.name}`, error);
      setStrategyExecutionLog(prev => [{
        strategyId: strategy.id,
        timestamp: Date.now(),
        action: `Failed to execute strategy: ${strategy.name}`,
        result: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, ...prev.slice(0, 49)]);
    }
  };

  const executeAction = async (action: TradingAction, strategy: TradingStrategy, marketData: MarketData) => {
    console.log(`[AutomateFloatingCard] Executing action:`, {
      actionType: action.type,
      selectedWalletsCount: selectedWallets.length,
      action,
      marketData
    });
    
    // Use all wallets selected in the sidebar
    const walletsToUse = selectedWallets;
    console.log(`[AutomateFloatingCard] Wallets to use:`, walletsToUse.map(w => ({ address: w.address, displayName: w.displayName })));

    if (walletsToUse.length === 0) {
      console.error('[AutomateFloatingCard] No wallets selected in sidebar for action execution');
      throw new Error('No wallets selected in sidebar for action execution');
    }

    // Execute action for each wallet
    console.log(`[AutomateFloatingCard] Starting action execution for ${walletsToUse.length} wallets`);
    for (const wallet of walletsToUse) {
      console.log(`[AutomateFloatingCard] Processing wallet: ${wallet.address}`);
      
      // Check if wallet has sufficient balance
      const walletBalance = getWalletBalance(wallet.address) || 0;
      console.log(`[AutomateFloatingCard] Wallet balance check:`, {
        address: wallet.address,
        balance: walletBalance,
        hasInsufficientSOL: hasInsufficientSOL(wallet.address)
      });
      
      if (hasInsufficientSOL(wallet.address)) {
        console.warn(`[AutomateFloatingCard] Wallet ${wallet.address} has insufficient SOL balance (${walletBalance})`);
        continue;
      }

      // Calculate trade amount
      let tradeAmount: number;
      console.log(`[AutomateFloatingCard] Calculating trade amount:`, {
        amountType: action.amountType,
        amount: action.amount,
        volumeType: action.volumeType,
        volumeMultiplier: action.volumeMultiplier
      });
      
      if (action.amountType === 'sol') {
        tradeAmount = action.amount;
      } else if (action.amountType === 'percentage') {
        // Percentage of wallet balance
        tradeAmount = walletBalance * (action.amount / 100);
      } else if (action.amountType === 'lastTrade') {
        // Based on last trade amount
        const lastTradeAmount = marketData.lastTrade?.solAmount || 0;
        tradeAmount = lastTradeAmount * action.amount;
      } else if (action.amountType === 'volume' || action.amountType === 'whitelistVolume') {
        // Based on volume data
        let volumeAmount: number;
        
        if (action.amountType === 'whitelistVolume' && action.whitelistAddress) {
          // Get volume from whitelisted address activity
          const addressActivity = marketData.whitelistActivity?.[action.whitelistAddress];
          
          if (!addressActivity) {
            console.log(`[AutomateFloatingCard] No activity found for whitelisted address: ${action.whitelistAddress}`);
            return;
          }
          
          switch (action.whitelistActivityType) {
            case 'buyVolume':
              volumeAmount = addressActivity.buyVolume;
              break;
            case 'sellVolume':
              volumeAmount = addressActivity.sellVolume;
              break;
            case 'netVolume':
              volumeAmount = addressActivity.netVolume;
              break;
            default:
              volumeAmount = addressActivity.buyVolume;
          }
        } else {
          // Get volume from general market data
          switch (action.volumeType) {
            case 'buyVolume':
              volumeAmount = marketData.buyVolume;
              break;
            case 'sellVolume':
              volumeAmount = marketData.sellVolume;
              break;
            case 'netVolume':
              volumeAmount = marketData.netVolume;
              break;
            default:
              volumeAmount = marketData.buyVolume;
          }
        }
        
        tradeAmount = volumeAmount * (action.volumeMultiplier || 0.1);
      } else {
        tradeAmount = action.amount; // fallback
      }
      
      console.log(`[AutomateFloatingCard] Calculated trade amount:`, {
        tradeAmount,
        actionType: action.type
      });

      try {
        // Create trading config
        const tradingConfig: TradingConfig = {
          tokenAddress,
          solAmount: action.type === 'buy' ? tradeAmount : undefined,
          sellPercent: action.type === 'sell' ? (action.amountType === 'percentage' ? action.amount : 100) : undefined
        };
        
        console.log(`[AutomateFloatingCard] Created trading config:`, tradingConfig);

        // Format wallet for trading
        const formattedWallet: FormattedWallet = {
          address: wallet.address,
          privateKey: wallet.privateKey
        };
        
        console.log(`[AutomateFloatingCard] Formatted wallet:`, { address: formattedWallet.address });

        // Execute the trade using the trading utility
        const walletForTrading: WalletType = {
          id: Date.now(), // Generate a temporary ID
          address: wallet.address,
          privateKey: wallet.privateKey,
          isActive: true
        };
        
        console.log(`[AutomateFloatingCard] Executing trade:`, {
          dex: 'auto',
          walletAddress: wallet.address,
          isBuy: action.type === 'buy',
          tradingConfig,
          walletForTrading
        });
        
        const result = await executeTrade(
          'auto', // Use auto DEX selection
          [walletForTrading], // Convert to WalletType format
          tradingConfig,
          action.type === 'buy',
          solBalances
        );
        
        console.log(`[AutomateFloatingCard] Trade execution completed:`, {
          success: result.success,
          error: result.error,
          walletAddress: wallet.address
        });
        
        console.log(`[AutomateFloatingCard] Trade execution result:`, result);

        // Log the result
        setStrategyExecutionLog(prev => [{
          strategyId: strategy.id,
          timestamp: Date.now(),
          action: `${action.type.toUpperCase()} ${tradeAmount.toFixed(4)} SOL`,
          result: result.success ? 'success' : 'error',
          message: result.success 
            ? `Wallet: ${formatAddress(wallet.address)}, Slippage: ${action.slippage}%`
            : `Error: ${result.error || 'Unknown error'}`
        }, ...prev.slice(0, 49)]);

        if (!result.success) {
          console.error(`Trading failed for wallet ${wallet.address}:`, result.error);
        }
      } catch (error) {
        // Log execution error
        setStrategyExecutionLog(prev => [{
          strategyId: strategy.id,
          timestamp: Date.now(),
          action: `${action.type.toUpperCase()} ${tradeAmount.toFixed(4)} SOL`,
          result: 'error',
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, ...prev.slice(0, 49)]);
        
        console.error(`Trading execution failed for wallet ${wallet.address}:`, error);
      }
    }
  };

  const getAvailableWallets = () => {
    const selectedWalletKeys = selectedWallets.map(w => w.privateKey);
    return wallets.filter(wallet => !selectedWalletKeys.includes(wallet.privateKey));
  };

  const filterWallets = (walletList: any[], search: string) => {
    let filtered = walletList;
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (walletBalanceFilter !== 'all') {
      if (walletBalanceFilter === 'nonZero') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) > 0);
      } else if (walletBalanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) >= 0.1);
      } else if (walletBalanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) < 0.1 && (getWalletBalance(wallet.address) || 0) > 0);
      } else if (walletBalanceFilter === 'hasTokens') {
        filtered = filtered.filter(wallet => (getWalletTokenBalance(wallet.address) || 0) > 0);
      }
    }
    
    return filtered.sort((a, b) => {
      if (walletSortOption === 'address') {
        return walletSortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (walletSortOption === 'balance') {
        const balanceA = getWalletBalance(a.address) || 0;
        const balanceB = getWalletBalance(b.address) || 0;
        return walletSortDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
      } else if (walletSortOption === 'tokenBalance') {
        const tokenBalanceA = getWalletTokenBalance(a.address) || 0;
        const tokenBalanceB = getWalletTokenBalance(b.address) || 0;
        return walletSortDirection === 'asc' ? tokenBalanceA - tokenBalanceB : tokenBalanceB - tokenBalanceA;
      }
      return 0;
    });
  };

  const addWallet = (wallet: any) => {
    const newWallet: SelectedWallet = {
      privateKey: wallet.privateKey,
      address: wallet.address,
      displayName: getWalletDisplayName(wallet)
    };
    setSelectedWallets(prev => [...prev, newWallet]);
  };

  const removeWallet = (index: number) => {
    setSelectedWallets(prev => prev.filter((_, i) => i !== index));
  };
  
  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as Node;
    if (!dragHandleRef.current?.contains(target)) return;
    
    onDraggingChange(true);
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };
  
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 0);
    
    onPositionChange({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragOffset.x, dragOffset.y, onPositionChange]);
  
  const handleMouseUp = React.useCallback(() => {
    onDraggingChange(false);
  }, [onDraggingChange]);
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  // Minimized UI
  if (isMinimized) {
    return (
      <div 
        ref={cardRef}
        className="fixed z-[9999] select-none"
        style={{
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="relative overflow-hidden rounded-lg w-48 bg-app-primary-99 backdrop-blur-md border border-app-primary-30 shadow-lg shadow-black-80">
          {/* Minimized Header */}
          <div className="flex items-center justify-between p-2 border-b border-app-primary-30">
            <div 
              ref={dragHandleRef}
              className="flex items-center gap-1 cursor-grab active:cursor-grabbing flex-1"
              title="Drag to move"
            >
              <Move size={12} className="text-app-secondary-60" />
              <span className="text-xs font-mono font-semibold color-primary truncate">Automation</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleMaximize}
                className="p-1 rounded hover:bg-primary-20 transition-colors"
                title="Maximize"
              >
                <Maximize2 size={12} className="text-app-secondary-60 hover:color-primary" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-primary-20 transition-colors"
                title="Close"
              >
                <X size={12} className="text-app-secondary-60 hover:color-primary" />
              </button>
            </div>
          </div>
          
          {/* Quick Controls */}
          <div className="p-2 space-y-2">
            <div className="text-xs text-app-secondary-60 font-mono">
              Strategies: {tradingStrategies.filter(s => s.isActive).length}/{tradingStrategies.length}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => toggleAllStrategies(true)}
                className="flex-1 px-2 py-1 bg-app-accent text-white rounded text-xs font-mono hover:bg-app-accent-80 transition-colors flex items-center justify-center gap-1"
                title="Start All Strategies"
              >
                <Play size={10} />
                Start
              </button>
              <button
                onClick={() => toggleAllStrategies(false)}
                className="flex-1 px-2 py-1 bg-error-alt text-white rounded text-xs font-mono hover:bg-error-alt-80 transition-colors flex items-center justify-center gap-1"
                title="Stop All Strategies"
              >
                <Pause size={10} />
                Stop
              </button>
            </div>
            <div className="text-xs text-app-secondary-60 font-mono">
              Wallets: {selectedWallets.length}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full UI
  return (
    <div 
      ref={cardRef}
      className="fixed z-[9999] select-none"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <div 
        className="relative overflow-hidden rounded-lg min-w-[800px] max-w-[1200px] h-[600px] bg-app-primary-99 backdrop-blur-md border border-app-primary-30 shadow-lg shadow-black-80 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app-primary-30">
          <div 
            ref={dragHandleRef}
            className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
            title="Drag to move"
          >
            <Move size={16} className="text-app-secondary-60" />
            <h3 className="text-lg font-mono font-semibold color-primary">Token Automation</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded hover:bg-primary-20 transition-colors"
              title="Minimize"
            >
              <Minimize2 size={16} className="text-app-secondary-60 hover:color-primary" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-primary-20 transition-colors"
              title="Close"
            >
              <X size={16} className="text-app-secondary-60 hover:color-primary" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-app-primary-30 bg-app-primary">
              <button
                onClick={() => setActiveTab('data')}
                className={`px-4 py-3 font-mono text-sm transition-colors ${
                  activeTab === 'data'
                    ? 'color-primary border-b-2 border-app-primary bg-app-primary-60'
                    : 'text-app-secondary-60 hover:color-primary hover:bg-app-primary-60'
                }`}
              >
                Market Data
              </button>
              <button
                onClick={() => setActiveTab('strategies')}
                className={`px-4 py-3 font-mono text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'strategies'
                    ? 'color-primary border-b-2 border-app-primary bg-app-primary-60'
                    : 'text-app-secondary-60 hover:color-primary hover:bg-app-primary-60'
                }`}
              >
                <Settings className="w-4 h-4" />
                Trading Strategies ({tradingStrategies.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {activeTab === 'data' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-mono font-semibold color-primary">Latest Data</h4>
                    <button
                      onClick={() => {
                        setCumulativeBuyVolume(0);
                        setCumulativeSellVolume(0);
                        setProcessedTradeSignatures(new Set());
                      }}
                      className="px-3 py-1.5 bg-app-tertiary border border-app-primary-40 rounded color-primary font-mono text-sm hover:bg-app-secondary hover:border-app-primary transition-colors"
                    >
                      Reset Volume
                    </button>
                  </div>
              <div className="space-y-4">
                {/* Volume Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className="bg-app-primary-60 border border-app-primary-40 p-4 rounded-lg cursor-pointer hover:bg-app-primary-40 transition-colors"
                    onClick={() => setShowUSD(!showUSD)}
                    title="Click to toggle between SOL and USD"
                  >
                    <div className="text-sm text-app-secondary-60 font-mono mb-1">Total Buy Volume</div>
                    <div className="color-primary font-mono font-semibold">
                      {formatVolumeDisplay(cumulativeBuyVolume)}
                    </div>
                  </div>
                  <div 
                    className="bg-app-primary-60 border border-error-alt-40 p-4 rounded-lg cursor-pointer hover:bg-app-primary-40 transition-colors"
                    onClick={() => setShowUSD(!showUSD)}
                    title="Click to toggle between SOL and USD"
                  >
                    <div className="text-sm text-error-alt-60 font-mono mb-1">Total Sell Volume</div>
                    <div className="text-error-alt font-mono font-semibold">
                      {formatVolumeDisplay(cumulativeSellVolume)}
                    </div>
                  </div>
                  <div 
                    className="bg-app-primary-60 border border-app-primary-40 p-4 rounded-lg cursor-pointer hover:bg-app-primary-40 transition-colors"
                    onClick={() => setShowUSD(!showUSD)}
                    title="Click to toggle between SOL and USD"
                  >
                    <div className="text-sm text-app-secondary-60 font-mono mb-1">Net Volume</div>
                    <div className={`font-mono font-semibold ${
                      cumulativeBuyVolume - cumulativeSellVolume >= 0 ? 'text-app-accent' : 'text-error-alt'
                    }`}>
                      {formatVolumeDisplay(cumulativeBuyVolume - cumulativeSellVolume)}
                    </div>
                  </div>
                </div>
                
                {/* Latest Trade */}
                <div 
                  className="bg-app-primary border border-app-primary-40 rounded-lg p-4 cursor-pointer hover:bg-app-primary-60 transition-colors"
                  onClick={() => setShowUSD(!showUSD)}
                  title="Click to toggle between SOL and USD"
                >
                  {(() => {
                    const latestTrade = nonWhitelistedTrades
                      .filter(trade => trade.tokenMint === tokenAddress)
                      .sort((a, b) => b.timestamp - a.timestamp)[0];
                    
                    if (!latestTrade) {
                      return (
                        <div className="text-app-secondary-60 font-mono text-center py-4">
                          No non-whitelisted trades found for this token
                        </div>
                      );
                    }
                    
                    return (
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-mono font-semibold ${
                              latestTrade.type === 'buy' ? 'bg-app-primary-60 border border-app-primary-40 color-primary' : 'bg-app-primary-60 border border-error-alt-40 text-error-alt'
                            }`}>
                              {latestTrade.type.toUpperCase()}
                            </span>
                            <span className="color-primary font-mono font-semibold">{formatVolumeDisplay(latestTrade.solAmount)}</span>
                          </div>
                          <div className="text-sm text-app-secondary-60 font-mono">
                            Avg: {formatPrice(latestTrade.avgPrice)} | {formatLargeNumber(latestTrade.marketCap)} MC
                          </div>
                          <div className="text-xs text-app-secondary-60 font-mono">
                            {new Date(latestTrade.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="color-primary font-mono text-sm">
                            {formatAddress(latestTrade.address)}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                  }
                </div>
              </div>
            </div>
              )}

              {activeTab === 'strategies' && (
                <div className="space-y-6">
                  {/* Strategy Management Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-mono font-semibold color-primary">Trading Strategies</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Create a file input element
                          const fileInput = document.createElement('input');
                          fileInput.type = 'file';
                          fileInput.accept = '.json';
                          fileInput.style.display = 'none';
                          
                          // Handle file selection
                          fileInput.onchange = (event: Event) => {
                            const target = event.target as HTMLInputElement;
                            const file = target.files?.[0];
                            if (!file) return;
                            
                            const reader = new FileReader();
                            reader.onload = (e: ProgressEvent<FileReader>) => {
                              try {
                                const content = e.target?.result as string;
                                if (!content) return;
                                
                                const importedStrategy = JSON.parse(content);
                                
                                // Add the imported strategy to the list
                                setTradingStrategies(prev => [...prev, {
                                  ...importedStrategy,
                                  id: importedStrategy.id || generateStrategyId(),
                                  createdAt: importedStrategy.createdAt || Date.now(),
                                  updatedAt: Date.now(),
                                  executionCount: importedStrategy.executionCount || 0
                                }]);
                                
                                // Show a success message
                                alert('Strategy imported successfully!');
                              } catch (error) {
                                console.error('Error importing strategy:', error);
                                alert('Error importing strategy. Please check the file format.');
                              }
                            };
                            
                            reader.readAsText(file);
                            
                            // Clean up
                            document.body.removeChild(fileInput);
                          };
                          
                          // Add to DOM and trigger click
                          document.body.appendChild(fileInput);
                          fileInput.click();
                        }}
                        className="px-3 py-1.5 border border-app-primary-40 rounded color-primary font-mono text-sm hover:bg-app-primary-40 transition-colors flex items-center gap-2"
                        title="Import strategy from JSON file"
                      >
                        <Upload className="w-4 h-4" />
                        Import
                      </button>
                      <button
                        onClick={() => setIsCreatingStrategy(!isCreatingStrategy)}
                        className="px-3 py-1.5 bg-app-accent border border-app-primary-40 rounded color-primary font-mono text-sm hover:bg-app-primary hover:border-app-primary transition-colors flex items-center gap-2"
                      >
                        {isCreatingStrategy ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isCreatingStrategy ? 'Cancel' : 'New Strategy'}
                      </button>
                    </div>
                  </div>

                  {/* Inline Strategy Creation Form */}
                  {isCreatingStrategy && (
                    <div className="bg-app-primary border border-app-primary-40 rounded-lg p-6">
                      <StrategyBuilder
                        strategy={null}
                        onSave={(strategy) => {
                          setTradingStrategies(prev => [...prev, strategy]);
                          setIsCreatingStrategy(false);
                        }}
                        onCancel={() => setIsCreatingStrategy(false)}
                      />
                    </div>
                  )}

                  {/* Active Strategies List */}
                  <div className="space-y-3">
                    {tradingStrategies.map(strategy => (
                      <div key={strategy.id} className="bg-app-primary border border-app-primary-40 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setTradingStrategies(prev => prev.map(s => 
                                  s.id === strategy.id ? { ...s, isActive: !s.isActive } : s
                                ));
                              }}
                              className={`p-1 rounded transition-colors ${
                                strategy.isActive 
                                  ? 'bg-app-accent text-app-primary hover:bg-app-primary-60' 
                                  : 'bg-app-primary-60 text-app-secondary-60 hover:bg-app-secondary'
                              }`}
                            >
                              {strategy.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <div>
                              <h5 className="font-mono font-semibold color-primary">{strategy.name}</h5>
                              <p className="text-sm text-app-secondary-60 font-mono">{strategy.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-mono ${
                              strategy.isActive 
                                ? 'bg-app-accent text-app-primary' 
                                : 'bg-app-primary-60 text-app-secondary-60'
                            }`}>
                              {strategy.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <button
                              onClick={() => {
                                // Create a strategy object for export
                                const strategyToExport = {
                                  ...strategy,
                                  updatedAt: Date.now()
                                };
                                
                                // Convert to JSON and create a downloadable file
                                const jsonContent = JSON.stringify(strategyToExport, null, 2);
                                const blob = new Blob([jsonContent], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                
                                // Create a download link and trigger it
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${strategyToExport.name.replace(/\s+/g, '_')}_strategy.json`;
                                document.body.appendChild(a);
                                a.click();
                                
                                // Clean up
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }}
                              className="p-1 rounded hover:bg-app-primary-60 transition-colors"
                              title="Export strategy as JSON file"
                            >
                              <Download className="w-4 h-4 text-app-secondary-60 hover:color-primary" />
                            </button>
                            <button
                              onClick={() => {
                                if (editingStrategy?.id === strategy.id) {
                                  setEditingStrategy(null);
                                } else {
                                  setEditingStrategy(strategy);
                                  setIsCreatingStrategy(false);
                                }
                              }}
                              className="p-1 rounded hover:bg-app-primary-60 transition-colors"
                            >
                              {editingStrategy?.id === strategy.id ? <X className="w-4 h-4 text-app-secondary-60 hover:color-primary" /> : <Edit className="w-4 h-4 text-app-secondary-60 hover:color-primary" />}
                            </button>
                            <button
                              onClick={() => {
                                setTradingStrategies(prev => prev.filter(s => s.id !== strategy.id));
                              }}
                              className="p-1 rounded hover:bg-error-alt-60 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-app-secondary-60 hover:text-error-alt" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Strategy Details */}
                        {editingStrategy?.id !== strategy.id && (
                          <div className="mt-3 pt-3 border-t border-app-primary-30">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-app-secondary-60 font-mono">Conditions: </span>
                                <span className="color-primary font-mono">{strategy.conditions.length}</span>
                              </div>
                              <div>
                                <span className="text-app-secondary-60 font-mono">Actions: </span>
                                <span className="color-primary font-mono">{strategy.actions.length}</span>
                              </div>
                              <div>
                                <span className="text-app-secondary-60 font-mono">Executions: </span>
                                <span className="color-primary font-mono">{strategy.executionCount}</span>
                              </div>
                              <div>
                                <span className="text-app-secondary-60 font-mono">Cooldown: </span>
                                <span className="color-primary font-mono">{strategy.cooldown}m</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Inline Strategy Edit Form */}
                        {editingStrategy?.id === strategy.id && (
                          <div className="mt-3 pt-3 border-t border-app-primary-30">
                            <StrategyBuilder
                              strategy={editingStrategy}
                              onSave={(updatedStrategy) => {
                                setTradingStrategies(prev => prev.map(s => 
                                  s.id === editingStrategy.id ? updatedStrategy : s
                                ));
                                setEditingStrategy(null);
                              }}
                              onCancel={() => setEditingStrategy(null)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {tradingStrategies.length === 0 && !isCreatingStrategy && (
                      <div className="text-center py-8">
                        <div className="text-app-secondary-60 font-mono mb-4">No trading strategies configured</div>
                        <button
                          onClick={() => setIsCreatingStrategy(true)}
                          className="px-4 py-2 bg-app-accent border border-app-primary-40 rounded color-primary font-mono text-sm hover:bg-app-primary hover:border-app-primary transition-colors flex items-center gap-2 mx-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Create Your First Strategy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Execution Log */}
                  {strategyExecutionLog.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="font-mono font-semibold color-primary">Execution Log</h5>
                      <div className="bg-app-primary border border-app-primary-40 rounded-lg p-4 max-h-48 overflow-y-auto">
                        {strategyExecutionLog.slice(0, 10).map((log, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-app-primary-30 last:border-b-0">
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${
                                log.result === 'success' ? 'bg-app-accent' : 'bg-error-alt'
                              }`} />
                              <div>
                                <div className="font-mono text-sm color-primary">{log.action}</div>
                                <div className="font-mono text-xs text-app-secondary-60">{log.message}</div>
                              </div>
                            </div>
                            <div className="text-xs text-app-secondary-60 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Wallet Sidebar */}
          {showSidebar && (
            <div className="w-80 border-l border-app-primary-30 bg-app-primary flex flex-col h-full">
              <div className="p-4 border-b border-app-primary-30 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-mono font-semibold color-primary flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Wallets
                  </h4>
                </div>

                {/* Wallet Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-app-secondary-60" />
                  <input
                    type="text"
                    placeholder="Search wallets..."
                    value={walletSearchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalletSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-app-tertiary border border-app-primary-40 rounded-lg color-primary placeholder-app-secondary-60 font-mono text-sm focus:outline-none focus:border-app-primary"
                  />
                </div>

                {/* Wallet Filters */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <select
                    value={walletSortOption}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWalletSortOption(e.target.value)}
                    className="px-3 py-2 bg-app-tertiary border border-app-primary-40 rounded color-primary font-mono text-sm focus:outline-none focus:border-app-primary"
                  >
                    <option value="address">Sort by Address</option>
                    <option value="balance">Sort by SOL</option>
                    <option value="tokenBalance">Sort by Tokens</option>
                  </select>
                  <button
                    onClick={() => setWalletSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 bg-app-tertiary border border-app-primary-40 rounded color-primary font-mono text-sm hover:bg-app-secondary hover:border-app-primary transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowDown className={`w-3 h-3 transition-transform ${walletSortDirection === 'desc' ? 'rotate-180' : ''}`} />
                    {walletSortDirection === 'asc' ? 'Asc' : 'Desc'}
                  </button>
                </div>

                <select
                  value={walletBalanceFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWalletBalanceFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-app-tertiary border border-app-primary-40 rounded color-primary font-mono text-sm focus:outline-none focus:border-app-primary mb-4"
                >
                  <option value="all">All Wallets</option>
                  <option value="nonZero">Non-Zero SOL</option>
                  <option value="highBalance">High Balance (≥0.1 SOL)</option>
                  <option value="lowBalance">Low Balance (0.1 SOL)</option>
                  <option value="hasTokens">Has Tokens</option>
                </select>
              </div>

              {/* Selected Wallets */}
              {selectedWallets.length > 0 && (
                <div className="p-4 border-b border-app-primary-30 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold color-primary flex items-center gap-2 font-mono">
                      <Users className="w-4 h-4" />
                      Selected ({selectedWallets.length})
                    </h5>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-app-primary-40 scrollbar-track-transparent">
                    {selectedWallets.map((wallet, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-app-tertiary border border-app-primary-30 rounded">
                        <div className="flex-1 min-w-0">
                          <div className="color-primary text-sm font-mono truncate">
                            {formatAddress(wallet.address)}
                          </div>
                          <div className="text-xs text-app-secondary-60">
                            {formatSolBalance(getWalletBalance(wallet.address) || 0)} SOL
                          </div>
                        </div>
                        <button
                          onClick={() => removeWallet(index)}
                          className="ml-2 p-1 hover:bg-app-secondary rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-error-alt" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Wallets */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-4 flex-shrink-0">
                  <h5 className="text-sm font-semibold color-primary mb-2 font-mono">
                    Available Wallets ({getAvailableWallets().length})
                  </h5>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0 scrollbar-thin scrollbar-thumb-app-primary-40 scrollbar-track-transparent hover:scrollbar-thumb-app-primary-60">
                  <div className="space-y-2">
                    {filterWallets(getAvailableWallets(), walletSearchTerm).map((wallet, index) => (
                      <div
                        key={index}
                        onClick={() => addWallet(wallet)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-app-secondary ${
                          hasInsufficientSOL(wallet.address)
                            ? 'border-error-alt-40 bg-error-alt-99'
                            : 'border-app-primary-40 bg-app-tertiary hover:border-app-primary'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="color-primary text-sm font-mono truncate">
                              {formatAddress(wallet.address)}
                            </div>
                            <div className="text-xs text-app-secondary-60 mt-1">
                              SOL: {formatSolBalance(getWalletBalance(wallet.address) || 0)}
                            </div>
                            <div className="text-xs text-app-secondary-60">
                              Tokens: {formatTokenBalance(getWalletTokenBalance(wallet.address) || 0)}
                            </div>
                          </div>
                        </div>
                        {hasInsufficientSOL(wallet.address) && (
                          <div className="text-xs text-error-alt mt-1">
                            Insufficient SOL for gas
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </div>
            )}




              

            </div>
          </div>
    </div>
  );
};







export default AutomateFloatingCard;