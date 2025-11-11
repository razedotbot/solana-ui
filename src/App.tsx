import React, { useEffect, lazy, useCallback, useReducer, useMemo, useState } from 'react';
import { ChevronDown, Settings, Globe, Wifi, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Connection } from '@solana/web3.js';
import ServiceSelector from './Menu';
import { WalletTooltip, initStyles } from './styles/Styles';
import { 
  saveWalletsToCookies,
  loadWalletsFromCookies,
  saveConfigToCookies,
  loadConfigFromCookies,
  loadQuickBuyPreferencesFromCookies,
  saveQuickBuyPreferencesToCookies,
  saveUserToCookies,
  loadUserFromCookies,
  deleteWallet, 
  WalletType, 
  ConfigType,
} from './Utils';
import Split from 'react-split';
import { useToast } from "./Notifications";
import {
  fetchWalletBalances,
  fetchSolBalances,
  fetchTokenBalances,
  handleSortWallets
} from './Utils';
import {
  handleApiKeyFromUrl
} from './Manager';
import { countActiveWallets, getScriptName } from './utils/wallets';
import { executeTrade } from './utils/trading';

// Extend Window interface to include server-related properties
declare global {
  interface Window {
    serverRegion: string;
    availableServers: ServerInfo[];
    switchServer: (serverId: string) => Promise<boolean>;
  }
}

// Lazy loaded components
const EnhancedSettingsModal = lazy(() => import('./modals/SettingsModal'));
const EnhancedWalletOverview = lazy(() => import('./modals/WalletsModal'));
const WalletsPage = lazy(() => import('./Wallets').then(module => ({ default: module.WalletsPage })));
const ChartPage = lazy(() => import('./Chart').then(module => ({ default: module.ChartPage })));
const ActionsPage = lazy(() => import('./Actions').then(module => ({ default: module.ActionsPage })));
const MobileLayout = lazy(() => import('./Mobile'));

// Import modal components 
const BurnModal = lazy(() => import('./modals/BurnModal').then(module => ({ default: module.BurnModal })));
const PnlModal = lazy(() => import('./modals/CalculatePNLModal').then(module => ({ default: module.PnlModal })));
const DeployModal = lazy(() => import('./modals/DeployModal').then(module => ({ default: module.DeployModal })));
const CustomBuyModal = lazy(() => import('./modals/CustomBuyModal').then(module => ({ default: module.CustomBuyModal })));
const FloatingTradingCard = lazy(() => import('./FloatingTradingCard'));
const AutomateFloatingCard = lazy(() => import('./AutomateFloatingCard'));

interface ServerInfo {
  id: string;
  name: string;
  url: string;
  region: string;
  flag: string;
  ping?: number;
}

const ServerRegionSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<string>('US');
  const [availableServers, setAvailableServers] = useState<ServerInfo[]>([]);
  const [isChanging, setIsChanging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Function to update server data from window
  const updateServerData = useCallback(() => {
    if (window.serverRegion) {
      setCurrentRegion(window.serverRegion);
    }
    
    if (window.availableServers && window.availableServers.length > 0) {
      setAvailableServers(window.availableServers);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    updateServerData();
    
    // Set up polling to check for server updates
    const checkForUpdates = () => {
      updateServerData();
    };
    
    // Check every 500ms for server updates
    const interval = setInterval(checkForUpdates, 500);
    
    // Also listen for window events if available
    const handleServerUpdate = () => {
      updateServerData();
    };
    
    // Custom event listener for server updates
    window.addEventListener('serverChanged', handleServerUpdate);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('serverChanged', handleServerUpdate);
    };
  }, [updateServerData]);

  const handleServerSwitch = async (serverId: string) => {
    if (!window.switchServer) {
      console.error('Server switching not available');
      return;
    }

    setIsChanging(true);
    setIsOpen(false);

    try {
      const success = await window.switchServer(serverId);
      if (success) {
        const server = availableServers.find(s => s.id === serverId);
        if (server) {
          setCurrentRegion(server.region);
        }
      } else {
        console.error('Failed to switch server');
      }
    } catch (error) {
      console.error('Error switching server:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const getCurrentServer = () => {
    return availableServers.find(server => server.region === currentRegion) || {
      id: 'unknown',
      name: 'Unknown',
      url: '',
      region: currentRegion,
      flag: '🌐',
      ping: 0
    };
  };

  const currentServer = getCurrentServer();

  const getPingColor = (ping?: number) => {
    if (!ping || ping === Infinity) return 'text-app-secondary-40';
    if (ping < 50) return 'text-ping-good';
    if (ping < 100) return 'text-ping-medium';
    return 'text-ping-poor';
  };

  const getPingBg = (ping?: number) => {
    if (!ping || ping === Infinity) return 'bg-app-primary-10';
    if (ping < 50) return 'bg-ping-good-10';
    if (ping < 100) return 'bg-ping-medium-20';
    return 'bg-ping-poor-10';
  };

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        onClick={() => !isChanging && !isLoading && setIsOpen(!isOpen)}
        disabled={isChanging || isLoading}
        className="group relative flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover-border-primary-60 rounded transition-all duration-300 min-w-[80px]"
      >
        {/* Status indicator */}
        <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-app-primary-color animate-pulse"></div>
        
        {isChanging ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-app-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-mono text-app-secondary">SYNC</span>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2">
            <Globe size={14} className="color-primary animate-pulse" />
            <span className="text-xs font-mono text-app-secondary">LOAD</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono color-primary font-medium tracking-wider">
                {currentServer.region}
              </span>
            </div>
            
            {currentServer.ping && currentServer.ping < Infinity && (
              <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${getPingBg(currentServer.ping)} ${getPingColor(currentServer.ping)}`}>
                {currentServer.ping}ms
              </div>
            )}
            
            <ChevronDown 
              size={12} 
              className={`text-app-primary-40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            />
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && !isChanging && !isLoading && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute top-full right-0 mt-1 w-56 z-50">
            <div className="bg-app-secondary border border-app-primary-20 rounded overflow-hidden">
              {/* Header */}
              <div className="px-3 py-2 border-b border-app-primary-10">
                <div className="flex items-center gap-2 text-[10px] font-mono text-app-secondary uppercase tracking-widest">
                  <Wifi size={10} />
                  SELECT REGION
                </div>
              </div>
              
              {/* Server List */}
              <div className="py-1">
                {availableServers.length > 0 ? (
                  availableServers.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => handleServerSwitch(server.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-all duration-200 ${
                        server.region === currentRegion
                          ? 'bg-primary-10 color-primary'
                          : 'hover:bg-primary-05 text-app-tertiary'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{server.flag}</span>
                        <div>
                          <div className="text-xs font-mono font-medium">{server.name}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {server.ping && server.ping < Infinity && (
                          <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${getPingBg(server.ping)} ${getPingColor(server.ping)}`}>
                            {server.ping}ms
                          </div>
                        )}
                        
                        {server.region === currentRegion && (
                          <div className="w-1.5 h-1.5 bg-app-primary-color rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center">
                    <div className="text-app-secondary-60 text-xs font-mono">NO SERVERS</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const WalletManager: React.FC = () => {
  // Apply styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = initStyles();
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Optimized state management with useReducer
  interface AppState {
    copiedAddress: string | null;
    tokenAddress: string;
    isModalOpen: boolean;
    isSettingsOpen: boolean;
    activeTab: 'wallets' | 'advanced';
    config: ConfigType;
    currentPage: 'wallets' | 'chart' | 'actions';
    wallets: WalletType[];
    isRefreshing: boolean;
    connection: Connection | null;
    solBalances: Map<string, number>;
    tokenBalances: Map<string, number>;
    leftColumnCollapsed: boolean;

    isLoadingChart: boolean;
    currentMarketCap: number | null;
    modals: {
      burnModalOpen: boolean;
      calculatePNLModalOpen: boolean;
      deployModalOpen: boolean;
      customBuyModalOpen: boolean;
    };
    sortDirection: 'asc' | 'desc';
    tickEffect: boolean;

    floatingCard: {
      isOpen: boolean;
      position: { x: number; y: number };
      isDragging: boolean;
    };
    automateCard: {
      isOpen: boolean;
      position: { x: number; y: number };
      isDragging: boolean;
    };
    quickBuyEnabled: boolean;
    quickBuyAmount: number;
    quickBuyMinAmount: number;
    quickBuyMaxAmount: number;
    useQuickBuyRange: boolean;
    quickSellPercentage: number;
    quickSellMinPercentage: number;
    quickSellMaxPercentage: number;
    useQuickSellRange: boolean;
    iframeData: {
    tradingStats: any;
    solPrice: number | null;
    currentWallets: any[];
    recentTrades: {
      type: 'buy' | 'sell';
      address: string;
      tokensAmount: number;
      avgPrice: number;
      solAmount: number;
      timestamp: number;
      signature: string;
    }[];
    tokenPrice: {
      tokenPrice: number;
      tokenMint: string;
      timestamp: number;
      tradeType: 'buy' | 'sell';
      volume: number;
    } | null;
    marketCap: number | null;
  } | null;
  nonWhitelistedTrades: {
    type: 'buy' | 'sell';
    address: string;
    tokensAmount: number;
    avgPrice: number;
    solAmount: number;
    timestamp: number;
    signature: string;
    tokenMint: string;
    marketCap: number;
  }[];
  }

  type AppAction = 
    | { type: 'SET_COPIED_ADDRESS'; payload: string | null }
    | { type: 'SET_TOKEN_ADDRESS'; payload: string }
    | { type: 'SET_MODAL_OPEN'; payload: boolean }
    | { type: 'SET_SETTINGS_OPEN'; payload: boolean }
    | { type: 'SET_ACTIVE_TAB'; payload: 'wallets' | 'advanced' }
    | { type: 'SET_CONFIG'; payload: ConfigType }
    | { type: 'SET_CURRENT_PAGE'; payload: 'wallets' | 'chart' | 'actions' }
    | { type: 'SET_WALLETS'; payload: WalletType[] }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_CONNECTION'; payload: Connection | null }
    | { type: 'SET_SOL_BALANCES'; payload: Map<string, number> }
    | { type: 'SET_TOKEN_BALANCES'; payload: Map<string, number> }

    | { type: 'SET_LOADING_CHART'; payload: boolean }
    | { type: 'SET_MARKET_CAP'; payload: number | null }
    | { type: 'SET_MODAL'; payload: { modal: keyof AppState['modals']; open: boolean } }
    | { type: 'SET_SORT_DIRECTION'; payload: 'asc' | 'desc' }
    | { type: 'SET_TICK_EFFECT'; payload: boolean }

    | { type: 'UPDATE_BALANCE'; payload: { address: string; solBalance?: number; tokenBalance?: number } }
    | { type: 'SET_FLOATING_CARD_OPEN'; payload: boolean }
    | { type: 'SET_FLOATING_CARD_POSITION'; payload: { x: number; y: number } }
    | { type: 'SET_FLOATING_CARD_DRAGGING'; payload: boolean }
    | { type: 'SET_AUTOMATE_CARD_OPEN'; payload: boolean }
    | { type: 'SET_AUTOMATE_CARD_POSITION'; payload: { x: number; y: number } }
    | { type: 'SET_AUTOMATE_CARD_DRAGGING'; payload: boolean }
    | { type: 'SET_QUICK_BUY_ENABLED'; payload: boolean }
    | { type: 'SET_QUICK_BUY_AMOUNT'; payload: number }
    | { type: 'SET_QUICK_BUY_MIN_AMOUNT'; payload: number }
    | { type: 'SET_QUICK_BUY_MAX_AMOUNT'; payload: number }
    | { type: 'SET_USE_QUICK_BUY_RANGE'; payload: boolean }
    | { type: 'SET_QUICK_SELL_PERCENTAGE'; payload: number }
    | { type: 'SET_QUICK_SELL_MIN_PERCENTAGE'; payload: number }
    | { type: 'SET_QUICK_SELL_MAX_PERCENTAGE'; payload: number }
    | { type: 'SET_USE_QUICK_SELL_RANGE'; payload: boolean }
    | { type: 'SET_IFRAME_DATA'; payload: { tradingStats: any; solPrice: number | null; currentWallets: any[]; recentTrades: { type: 'buy' | 'sell'; address: string; tokensAmount: number; avgPrice: number; solAmount: number; timestamp: number; signature: string; }[]; tokenPrice: { tokenPrice: number; tokenMint: string; timestamp: number; tradeType: 'buy' | 'sell'; volume: number; } | null; marketCap: number | null; } | null }
    | { type: 'SET_NON_WHITELISTED_TRADES'; payload: { type: 'buy' | 'sell'; address: string; tokensAmount: number; avgPrice: number; solAmount: number; timestamp: number; signature: string; tokenMint: string; marketCap: number; }[] }
    | { type: 'TOGGLE_LEFT_COLUMN'; payload?: undefined };

  const initialState: AppState = {
    copiedAddress: null,
    tokenAddress: '',
    isModalOpen: false,
    isSettingsOpen: false,
    activeTab: 'wallets',
    config: {
      rpcEndpoint: 'https://solana-rpc.publicnode.com',
      transactionFee: '0.001',
      apiKey: '',
      selectedDex: 'auto',
      isDropdownOpen: false,
      buyAmount: '',
      sellAmount: '',
      slippageBps: '9900', // Default 99% slippage
      bundleMode: 'batch', // Default bundle mode
      singleDelay: '200', // Default 200ms delay between wallets in single mode
      batchDelay: '1000', // Default 1000ms delay between batches
      tradingServerEnabled: 'false',
      tradingServerUrl: 'https://localhost:4444',
    },
    currentPage: 'wallets',
    wallets: [],
    isRefreshing: false,
    connection: null,
    solBalances: new Map(),
    tokenBalances: new Map(),
    leftColumnCollapsed: false,

    isLoadingChart: false,
    currentMarketCap: null,
    modals: {
      burnModalOpen: false,
      calculatePNLModalOpen: false,
      deployModalOpen: false,
      customBuyModalOpen: false
    },
    sortDirection: 'asc',
    tickEffect: false,

    floatingCard: {
      isOpen: false,
      position: { x: 100, y: 100 },
      isDragging: false
    },
    automateCard: {
      isOpen: false,
      position: { x: 200, y: 200 },
      isDragging: false
    },
    quickBuyEnabled: true,
    quickBuyAmount: 0.01,
    quickBuyMinAmount: 0.01,
    quickBuyMaxAmount: 0.05,
    useQuickBuyRange: false,
    quickSellPercentage: 100,
    quickSellMinPercentage: 25,
    quickSellMaxPercentage: 100,
    useQuickSellRange: false,
    iframeData: null,
    nonWhitelistedTrades: []
  };

  const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
      case 'SET_COPIED_ADDRESS':
        return { ...state, copiedAddress: action.payload };
      case 'SET_TOKEN_ADDRESS':
        return { ...state, tokenAddress: action.payload };
      case 'SET_MODAL_OPEN':
        return { ...state, isModalOpen: action.payload };
      case 'SET_SETTINGS_OPEN':
        return { ...state, isSettingsOpen: action.payload };
      case 'SET_ACTIVE_TAB':
        return { ...state, activeTab: action.payload };
      case 'SET_CONFIG':
        return { ...state, config: action.payload };
      case 'SET_CURRENT_PAGE':
        return { ...state, currentPage: action.payload };
      case 'SET_WALLETS':
        return { ...state, wallets: action.payload };
      case 'SET_REFRESHING':
        return { ...state, isRefreshing: action.payload };
      case 'SET_CONNECTION':
        return { ...state, connection: action.payload };
      case 'SET_SOL_BALANCES':
        return { ...state, solBalances: action.payload };
      case 'SET_TOKEN_BALANCES':
        return { ...state, tokenBalances: action.payload };

      case 'SET_LOADING_CHART':
        return { ...state, isLoadingChart: action.payload };
      case 'SET_MARKET_CAP':
        return { ...state, currentMarketCap: action.payload };
      case 'SET_MODAL':
        return {
          ...state,
          modals: {
            ...state.modals,
            [action.payload.modal]: action.payload.open
          }
        };
      case 'SET_SORT_DIRECTION':
        return { ...state, sortDirection: action.payload };
      case 'SET_TICK_EFFECT':
        return { ...state, tickEffect: action.payload };

      case 'UPDATE_BALANCE':
        const newState = { ...state };
        if (action.payload.solBalance !== undefined) {
          newState.solBalances = new Map(state.solBalances);
          newState.solBalances.set(action.payload.address, action.payload.solBalance);
        }
        if (action.payload.tokenBalance !== undefined) {
          newState.tokenBalances = new Map(state.tokenBalances);
          newState.tokenBalances.set(action.payload.address, action.payload.tokenBalance);
        }
        return newState;
      case 'SET_FLOATING_CARD_OPEN':
        return {
          ...state,
          floatingCard: {
            ...state.floatingCard,
            isOpen: action.payload
          }
        };
      case 'SET_FLOATING_CARD_POSITION':
        return {
          ...state,
          floatingCard: {
            ...state.floatingCard,
            position: action.payload
          }
        };
      case 'SET_FLOATING_CARD_DRAGGING':
        return {
          ...state,
          floatingCard: {
            ...state.floatingCard,
            isDragging: action.payload
          }
        };
      case 'SET_AUTOMATE_CARD_OPEN':
        return {
          ...state,
          automateCard: {
            ...state.automateCard,
            isOpen: action.payload
          }
        };
      case 'SET_AUTOMATE_CARD_POSITION':
        return {
          ...state,
          automateCard: {
            ...state.automateCard,
            position: action.payload
          }
        };
      case 'SET_AUTOMATE_CARD_DRAGGING':
        return {
          ...state,
          automateCard: {
            ...state.automateCard,
            isDragging: action.payload
          }
        };
      case 'SET_QUICK_BUY_ENABLED':
        return { ...state, quickBuyEnabled: action.payload };
      case 'SET_QUICK_BUY_AMOUNT':
        return { ...state, quickBuyAmount: action.payload };
      case 'SET_QUICK_BUY_MIN_AMOUNT':
        return { ...state, quickBuyMinAmount: action.payload };
      case 'SET_QUICK_BUY_MAX_AMOUNT':
        return { ...state, quickBuyMaxAmount: action.payload };
      case 'SET_USE_QUICK_BUY_RANGE':
        return { ...state, useQuickBuyRange: action.payload };
      case 'SET_QUICK_SELL_PERCENTAGE':
        return { ...state, quickSellPercentage: action.payload };
      case 'SET_QUICK_SELL_MIN_PERCENTAGE':
        return { ...state, quickSellMinPercentage: action.payload };
      case 'SET_QUICK_SELL_MAX_PERCENTAGE':
        return { ...state, quickSellMaxPercentage: action.payload };
      case 'SET_USE_QUICK_SELL_RANGE':
        return { ...state, useQuickSellRange: action.payload };
      case 'SET_IFRAME_DATA':
        return { ...state, iframeData: action.payload };
      case 'SET_NON_WHITELISTED_TRADES':
        return { ...state, nonWhitelistedTrades: action.payload };
      case 'TOGGLE_LEFT_COLUMN':
        return { ...state, leftColumnCollapsed: !state.leftColumnCollapsed };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(appReducer, initialState);
  const { showToast } = useToast();

  // Memoized selectors for expensive calculations
  const memoizedBalances = useMemo(() => {
    return {
      totalSolBalance: Array.from(state.solBalances.values()).reduce((sum, balance) => sum + balance, 0),
      totalTokenBalance: Array.from(state.tokenBalances.values()).reduce((sum, balance) => sum + balance, 0),
      walletsWithBalance: state.wallets.filter(wallet => 
        (state.solBalances.get(wallet.address) || 0) > 0 || 
        (state.tokenBalances.get(wallet.address) || 0) > 0
      )
    };
  }, [state.solBalances, state.tokenBalances, state.wallets]);

  // Memoized wallet addresses array for stable dependency comparison
  const walletAddresses = useMemo(() => {
    return state.wallets.map(w => w.address);
  }, [state.wallets]);

  // Memoized callbacks to prevent unnecessary re-renders
  const memoizedCallbacks = useMemo(() => ({
    setCopiedAddress: (address: string | null) => dispatch({ type: 'SET_COPIED_ADDRESS', payload: address }),
    setTokenAddress: (address: string) => dispatch({ type: 'SET_TOKEN_ADDRESS', payload: address }),
    setIsModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL_OPEN', payload: open }),
    setIsSettingsOpen: (open: boolean) => dispatch({ type: 'SET_SETTINGS_OPEN', payload: open }),
    setActiveTab: (tab: 'wallets' | 'advanced') => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab }),
    setConfig: (config: ConfigType) => dispatch({ type: 'SET_CONFIG', payload: config }),
    setCurrentPage: (page: 'wallets' | 'chart' | 'actions') => dispatch({ type: 'SET_CURRENT_PAGE', payload: page }),
    setWallets: (wallets: WalletType[]) => dispatch({ type: 'SET_WALLETS', payload: wallets }),
    setIsRefreshing: (refreshing: boolean) => dispatch({ type: 'SET_REFRESHING', payload: refreshing }),
    setConnection: (connection: Connection | null) => dispatch({ type: 'SET_CONNECTION', payload: connection }),
    setSolBalances: (balances: Map<string, number>) => dispatch({ type: 'SET_SOL_BALANCES', payload: balances }),
    setTokenBalances: (balances: Map<string, number>) => dispatch({ type: 'SET_TOKEN_BALANCES', payload: balances }),

    setIsLoadingChart: (loading: boolean) => dispatch({ type: 'SET_LOADING_CHART', payload: loading }),
    setCurrentMarketCap: (cap: number | null) => dispatch({ type: 'SET_MARKET_CAP', payload: cap }),
    setBurnModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL', payload: { modal: 'burnModalOpen', open } }),
    setCalculatePNLModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL', payload: { modal: 'calculatePNLModalOpen', open } }),
    setDeployModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL', payload: { modal: 'deployModalOpen', open } }),
    setCustomBuyModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL', payload: { modal: 'customBuyModalOpen', open } }),
    setSortDirection: (direction: 'asc' | 'desc') => dispatch({ type: 'SET_SORT_DIRECTION', payload: direction }),
    setTickEffect: (effect: boolean) => dispatch({ type: 'SET_TICK_EFFECT', payload: effect }),

    setFloatingCardOpen: (open: boolean) => dispatch({ type: 'SET_FLOATING_CARD_OPEN', payload: open }),
    setFloatingCardPosition: (position: { x: number; y: number }) => dispatch({ type: 'SET_FLOATING_CARD_POSITION', payload: position }),
    setFloatingCardDragging: (dragging: boolean) => dispatch({ type: 'SET_FLOATING_CARD_DRAGGING', payload: dragging }),
    setAutomateCardOpen: (open: boolean) => dispatch({ type: 'SET_AUTOMATE_CARD_OPEN', payload: open }),
    setAutomateCardPosition: (position: { x: number; y: number }) => dispatch({ type: 'SET_AUTOMATE_CARD_POSITION', payload: position }),
    setAutomateCardDragging: (dragging: boolean) => dispatch({ type: 'SET_AUTOMATE_CARD_DRAGGING', payload: dragging }),
    setQuickBuyEnabled: (enabled: boolean) => dispatch({ type: 'SET_QUICK_BUY_ENABLED', payload: enabled }),
    setQuickBuyAmount: (amount: number) => dispatch({ type: 'SET_QUICK_BUY_AMOUNT', payload: amount }),
    setQuickBuyMinAmount: (amount: number) => dispatch({ type: 'SET_QUICK_BUY_MIN_AMOUNT', payload: amount }),
    setQuickBuyMaxAmount: (amount: number) => dispatch({ type: 'SET_QUICK_BUY_MAX_AMOUNT', payload: amount }),
    setUseQuickBuyRange: (useRange: boolean) => dispatch({ type: 'SET_USE_QUICK_BUY_RANGE', payload: useRange }),
    setQuickSellPercentage: (percentage: number) => dispatch({ type: 'SET_QUICK_SELL_PERCENTAGE', payload: percentage }),
    setQuickSellMinPercentage: (percentage: number) => dispatch({ type: 'SET_QUICK_SELL_MIN_PERCENTAGE', payload: percentage }),
    setQuickSellMaxPercentage: (percentage: number) => dispatch({ type: 'SET_QUICK_SELL_MAX_PERCENTAGE', payload: percentage }),
    setUseQuickSellRange: (useRange: boolean) => dispatch({ type: 'SET_USE_QUICK_SELL_RANGE', payload: useRange }),
    setIframeData: (data: { tradingStats: any; solPrice: number | null; currentWallets: any[]; recentTrades: { type: 'buy' | 'sell'; address: string; tokensAmount: number; avgPrice: number; solAmount: number; timestamp: number; signature: string; }[]; tokenPrice: { tokenPrice: number; tokenMint: string; timestamp: number; tradeType: 'buy' | 'sell'; volume: number; } | null; marketCap: number | null; } | null) => dispatch({ type: 'SET_IFRAME_DATA', payload: data }),
    setNonWhitelistedTrades: (trades: { type: 'buy' | 'sell'; address: string; tokensAmount: number; avgPrice: number; solAmount: number; timestamp: number; signature: string; tokenMint: string; marketCap: number; }[]) => dispatch({ type: 'SET_NON_WHITELISTED_TRADES', payload: trades }),
    toggleLeftColumn: () => dispatch({ type: 'TOGGLE_LEFT_COLUMN' })
  }), [dispatch]);

  // Separate callbacks for config updates to prevent unnecessary re-renders
  const configCallbacks = useMemo(() => ({
    setBuyAmount: (amount: string) => dispatch({ type: 'SET_CONFIG', payload: { ...state.config, buyAmount: amount } }),
    setSellAmount: (amount: string) => dispatch({ type: 'SET_CONFIG', payload: { ...state.config, sellAmount: amount } }),
    setSelectedDex: (dex: string) => dispatch({ type: 'SET_CONFIG', payload: { ...state.config, selectedDex: dex } }),
    setIsDropdownOpen: (open: boolean) => dispatch({ type: 'SET_CONFIG', payload: { ...state.config, isDropdownOpen: open } })
  }), [state.config]);

  // Monitor iframe data for whitelist trades and update wallet balances
  useEffect(() => {
    if (state.iframeData?.recentTrades && state.iframeData.recentTrades.length > 0) {
      const latestTrade = state.iframeData.recentTrades[0];
      
      // Find the wallet that made the trade
      const tradingWallet = state.wallets.find(wallet => wallet.address === latestTrade.address);
      
      if (tradingWallet) {
        // Get current balances
        const currentSolBalance = state.solBalances.get(latestTrade.address) || 0;
        const currentTokenBalance = state.tokenBalances.get(latestTrade.address) || 0;
        
        // Calculate new balances based on trade type
        let newSolBalance = currentSolBalance;
        let newTokenBalance = currentTokenBalance;
        
        if (latestTrade.type === 'buy') {
          // For buy trades: decrease SOL, increase tokens
          newSolBalance = Math.max(0, currentSolBalance - latestTrade.solAmount);
          newTokenBalance = currentTokenBalance + latestTrade.tokensAmount;
        } else if (latestTrade.type === 'sell') {
          // For sell trades: increase SOL, decrease tokens
          newSolBalance = currentSolBalance + latestTrade.solAmount;
          newTokenBalance = Math.max(0, currentTokenBalance - latestTrade.tokensAmount);
        }
        
        // Update balances if they changed
        if (newSolBalance !== currentSolBalance || newTokenBalance !== currentTokenBalance) {
          dispatch({
            type: 'UPDATE_BALANCE',
            payload: {
              address: latestTrade.address,
              solBalance: newSolBalance,
              tokenBalance: newTokenBalance
            }
          });
          
        }
      }
    }
  }, [state.iframeData?.recentTrades]); // Removed state.wallets to prevent triggering on wallet selection changes

  // Monitor iframe data for market cap updates
  useEffect(() => {
    if (state.iframeData?.marketCap !== undefined) {
      memoizedCallbacks.setCurrentMarketCap(state.iframeData.marketCap);
    }
  }, [state.iframeData?.marketCap, memoizedCallbacks]);

  // Handle trade submission
  const handleTradeSubmit = async (wallets: WalletType[], isBuyMode: boolean, dex?: string, buyAmount?: string, sellAmount?: string) => {
    memoizedCallbacks.setIsRefreshing(true);
    
    if (!state.tokenAddress) {
      showToast("Please select a token first", "error");
      memoizedCallbacks.setIsRefreshing(false);
      return;
    }
    
    // Use the selected DEX or the dex parameter if provided
    const dexToUse = dex || state.config.selectedDex;
    await originalHandleTradeSubmit(dexToUse, wallets, isBuyMode, buyAmount, sellAmount);
  };

  // Simplified trade submit function using TradingLogic module
  const originalHandleTradeSubmit = async (dex: string, wallets: WalletType[], isBuyMode: boolean, buyAmount?: string, sellAmount?: string) => {
    try {
      const config = {
        tokenAddress: state.tokenAddress,
        solAmount: isBuyMode ? parseFloat(buyAmount || state.config.buyAmount) : undefined,
        sellPercent: !isBuyMode ? parseFloat(sellAmount || state.config.sellAmount) : undefined
      };
      
      const result = await executeTrade(dex, wallets, config, isBuyMode, state.solBalances);
      
      if (result.success) {
        showToast(`${isBuyMode ? 'Buy' : 'Sell'} transactions submitted successfully`, "success");
      } else {
        showToast(`${dex} ${isBuyMode ? 'Buy' : 'Sell'} failed: ${result.error}`, "error");
      }
    } catch (error) {
      console.error(`${dex} ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Error: ${errorMessage}`, "error");
    } finally {
      memoizedCallbacks.setIsRefreshing(false);
    }
  };



  // Extract API key from URL
  useEffect(() => {
    handleApiKeyFromUrl(memoizedCallbacks.setConfig, saveConfigToCookies, showToast);
  }, []);

  // Read tokenAddress from URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('tokenAddress');
    if (tokenFromUrl) {
      memoizedCallbacks.setTokenAddress(tokenFromUrl);
    }
  }, []);

  // Read user parameter from URL and store in cookies
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userFromUrl = urlParams.get('user');
    if (userFromUrl) {
      saveUserToCookies(userFromUrl);
      // Remove the user parameter from URL
      urlParams.delete('user');
      const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Update URL when tokenAddress changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (state.tokenAddress) {
      url.searchParams.set('tokenAddress', state.tokenAddress);
    } else {
      url.searchParams.delete('tokenAddress');
    }
    window.history.replaceState({}, '', url.toString());
  }, [state.tokenAddress]);


  
  // Initialize app on mount
  useEffect(() => {
    const initializeApp = () => {
      // Load saved config
      const savedConfig = loadConfigFromCookies();
      if (savedConfig) {
        memoizedCallbacks.setConfig(savedConfig);
        
        // Create connection after loading config
        try {
          const conn = new Connection(savedConfig.rpcEndpoint);
          memoizedCallbacks.setConnection(conn);
        } catch (error) {
          console.error('Error creating connection:', error);
        }
      }
      
      // Load saved wallets
      const savedWallets = loadWalletsFromCookies();
      if (savedWallets && savedWallets.length > 0) {
        memoizedCallbacks.setWallets(savedWallets);
      }
      
      // Load saved quick buy preferences
      const savedQuickBuyPreferences = loadQuickBuyPreferencesFromCookies();
      if (savedQuickBuyPreferences) {
        memoizedCallbacks.setQuickBuyEnabled(savedQuickBuyPreferences.quickBuyEnabled);
        memoizedCallbacks.setQuickBuyAmount(savedQuickBuyPreferences.quickBuyAmount);
        memoizedCallbacks.setQuickBuyMinAmount(savedQuickBuyPreferences.quickBuyMinAmount);
        memoizedCallbacks.setQuickBuyMaxAmount(savedQuickBuyPreferences.quickBuyMaxAmount);
        memoizedCallbacks.setUseQuickBuyRange(savedQuickBuyPreferences.useQuickBuyRange);
        if (savedQuickBuyPreferences.quickSellPercentage !== undefined) {
          memoizedCallbacks.setQuickSellPercentage(savedQuickBuyPreferences.quickSellPercentage);
        }
        if (savedQuickBuyPreferences.quickSellMinPercentage !== undefined) {
          memoizedCallbacks.setQuickSellMinPercentage(savedQuickBuyPreferences.quickSellMinPercentage);
        }
        if (savedQuickBuyPreferences.quickSellMaxPercentage !== undefined) {
          memoizedCallbacks.setQuickSellMaxPercentage(savedQuickBuyPreferences.quickSellMaxPercentage);
        }
        if (savedQuickBuyPreferences.useQuickSellRange !== undefined) {
          memoizedCallbacks.setUseQuickSellRange(savedQuickBuyPreferences.useQuickSellRange);
        }
      }
    };

    initializeApp();
  }, []);

  // Save wallets when they change
  useEffect(() => {
    if (state.wallets.length > 0) {
      saveWalletsToCookies(state.wallets);
    }
  }, [state.wallets]);

  // Listen for custom event to open settings modal with wallets tab
  useEffect(() => {
    const handleOpenSettingsWalletsTab = () => {
      memoizedCallbacks.setActiveTab('wallets');
      memoizedCallbacks.setIsSettingsOpen(true);
    };

    window.addEventListener('openSettingsWalletsTab', handleOpenSettingsWalletsTab);
    
    return () => {
      window.removeEventListener('openSettingsWalletsTab', handleOpenSettingsWalletsTab);
    };
  }, []);

  // Save quick buy preferences when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const preferences = {
        quickBuyEnabled: state.quickBuyEnabled,
        quickBuyAmount: state.quickBuyAmount,
        quickBuyMinAmount: state.quickBuyMinAmount,
        quickBuyMaxAmount: state.quickBuyMaxAmount,
        quickSellPercentage: state.quickSellPercentage,
        useQuickBuyRange: state.useQuickBuyRange,
        quickSellMinPercentage: state.quickSellMinPercentage,
        quickSellMaxPercentage: state.quickSellMaxPercentage,
        useQuickSellRange: state.useQuickSellRange
      };
      saveQuickBuyPreferencesToCookies(preferences);
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timeoutId);
  }, [state.quickBuyEnabled, state.quickBuyAmount, state.quickBuyMinAmount, state.quickBuyMaxAmount, state.quickSellPercentage, state.useQuickBuyRange, state.quickSellMinPercentage, state.quickSellMaxPercentage, state.useQuickSellRange]);

  // Update connection when RPC endpoint changes
  useEffect(() => {
    try {
      const conn = new Connection(state.config.rpcEndpoint);
      memoizedCallbacks.setConnection(conn);
    } catch (error) {
      console.error('Error creating connection:', error);
    }
  }, [state.config.rpcEndpoint]);

  // Fetch SOL balances when wallets are added/removed or connection is established (not when selection changes)
  useEffect(() => {
    if (state.connection && state.wallets.length > 0) {
      fetchSolBalances(state.connection, state.wallets, memoizedCallbacks.setSolBalances);
    }
  }, [state.connection, state.wallets.length, walletAddresses]);

  // Fetch token balances when token address changes or wallets are added/removed (not when selection changes)
  useEffect(() => {
    if (state.connection && state.wallets.length > 0 && state.tokenAddress) {
      fetchTokenBalances(state.connection, state.wallets, state.tokenAddress, memoizedCallbacks.setTokenBalances);
    }
  }, [state.connection, state.wallets.length, walletAddresses, state.tokenAddress]);

  // Trigger tick animation when wallet count changes
  useEffect(() => {
    memoizedCallbacks.setTickEffect(true);
    const timer = setTimeout(() => memoizedCallbacks.setTickEffect(false), 500);
    return () => clearTimeout(timer);
  }, [state.wallets.length]);

  // Helper functions
  const handleRefresh = useCallback(async () => {
    if (!state.connection || state.wallets.length === 0) return;
    
    memoizedCallbacks.setIsRefreshing(true);
    
    try {
      // Use the consolidated fetchWalletBalances function with current balances to preserve them on errors
      await fetchWalletBalances(
        state.connection,
        state.wallets,
        state.tokenAddress,
        memoizedCallbacks.setSolBalances,
        memoizedCallbacks.setTokenBalances,
        state.solBalances,
        state.tokenBalances
      );
    } catch (error) {
      console.error('Error refreshing balances:', error);
    } finally {
      // Set refreshing to false
      memoizedCallbacks.setIsRefreshing(false);
    }
  }, [state.connection, state.wallets, state.tokenAddress, state.solBalances, state.tokenBalances]);

  const handleConfigChange = useCallback((key: keyof ConfigType, value: string) => {
    const newConfig = { ...state.config, [key]: value };
    saveConfigToCookies(newConfig);
    memoizedCallbacks.setConfig(newConfig);
  }, [state.config]);

  const handleSaveSettings = useCallback(() => {
    saveConfigToCookies(state.config);
    memoizedCallbacks.setIsSettingsOpen(false);
  }, [state.config]);

  const handleDeleteWallet = useCallback((id: number) => {
    const walletToDelete = state.wallets.find(w => w.id === id);
    if (walletToDelete) {
      // Remove from balances maps
      const newSolBalances = new Map(state.solBalances);
      newSolBalances.delete(walletToDelete.address);
      memoizedCallbacks.setSolBalances(newSolBalances);
      
      const newTokenBalances = new Map(state.tokenBalances);
      newTokenBalances.delete(walletToDelete.address);
      memoizedCallbacks.setTokenBalances(newTokenBalances);
    }
    
    const updatedWallets = deleteWallet(state.wallets, id);
    memoizedCallbacks.setWallets(updatedWallets);
  }, [state.wallets, state.solBalances, state.tokenBalances]);

  // Modal action handlers
  const openSettingsModal = useCallback(() => memoizedCallbacks.setIsSettingsOpen(true), []);
  const closeSettingsModal = useCallback(() => memoizedCallbacks.setIsSettingsOpen(false), []);
  const openWalletOverview = useCallback(() => memoizedCallbacks.setIsModalOpen(true), []);
  const closeWalletOverview = useCallback(() => memoizedCallbacks.setIsModalOpen(false), []);
  const openWalletsPage = useCallback(() => memoizedCallbacks.setCurrentPage('wallets'), []);
  const openChartPage = useCallback(() => memoizedCallbacks.setCurrentPage('chart'), []);
  const openActionsPage = useCallback(() => memoizedCallbacks.setCurrentPage('actions'), []);

  const handleBurn = async (amount: string) => {
    try {
      showToast('Burn successful', 'success');
    } catch (error) {
      showToast('Burn failed', 'error');
    }
  };

  const handleDeploy = async (data: any) => {
    try {
      showToast('Token deployment initiated successfully', 'success');
    } catch (error) {
      console.error('Error:', error);
      showToast('Token deployment failed', 'error');
    }
  };

  const handleCleaner = async (data: any) => {
    try {
      showToast('Cleaning successfully', 'success');
    } catch (error) {
      showToast('Failed to clean', 'error');
    }
  };

  const handleCustomBuy = async (data: any) => {
    try {
      showToast('Custom buy completed successfully', 'success');
    } catch (error) {
      showToast('Custom buy failed', 'error');
    }
  };

  const handleNonWhitelistedTrade = useCallback((trade: {
    type: 'buy' | 'sell';
    address: string;
    tokensAmount: number;
    avgPrice: number;
    solAmount: number;
    timestamp: number;
    signature: string;
    tokenMint: string;
    marketCap: number;
  }) => {
    // Add the new trade to the beginning of the array and keep only the last 50 trades
    const updatedTrades = [trade, ...state.nonWhitelistedTrades].slice(0, 50);
    memoizedCallbacks.setNonWhitelistedTrades(updatedTrades);
  }, [state.nonWhitelistedTrades, memoizedCallbacks, state.tokenAddress]);



  return (
    <div className="h-screen flex flex-col overflow-hidden bg-app-primary text-app-tertiary cyberpunk-bg">
      {/* Cyberpunk scanline effect */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-10"></div>
      

      
      {/* Top Navigation */}
      <nav className="relative border-b border-app-primary-70 px-4 py-2 backdrop-blur-sm bg-app-primary-99 z-20">
        <div className="flex items-center gap-3">
          <WalletTooltip content={state.leftColumnCollapsed ? "Show Wallets" : "Hide Wallets"} position="bottom">
            <button
              className="p-2 border border-app-primary-40 hover-border-primary bg-app-secondary rounded cyberpunk-btn"
              onClick={memoizedCallbacks.toggleLeftColumn}
            >
              {state.leftColumnCollapsed ? (
                <PanelLeftOpen size={20} className="color-primary" />
              ) : (
                <PanelLeftClose size={20} className="color-primary" />
              )}
            </button>
          </WalletTooltip>

        <ServiceSelector />
          
          <div className="relative flex-1 mx-4">
            <input
              type="text"
              placeholder="TOKEN ADDRESS"
              value={state.tokenAddress}
              onChange={(e) => memoizedCallbacks.setTokenAddress(e.target.value)}
              className="w-full bg-app-secondary border border-app-primary-40 rounded px-3 py-2 pr-16 text-sm text-app-primary focus-border-primary focus:outline-none cyberpunk-input font-mono tracking-wider"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
              {state.tokenAddress && (
                <WalletTooltip content="Clear token address" position="bottom">
                  <button
                    className="color-primary-40 text-xs font-mono p-1"
                    onClick={() => {
                      memoizedCallbacks.setTokenAddress('');
                      showToast("Token address cleared", "success");
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="color-primary opacity-60 hover:opacity-100 transition-opacity">
                       <polyline points="3,6 5,6 21,6"></polyline>
                       <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                       <line x1="10" y1="11" x2="10" y2="17"></line>
                       <line x1="14" y1="11" x2="14" y2="17"></line>
                     </svg>
                  </button>
                </WalletTooltip>
              )}
              <WalletTooltip content="Paste from clipboard" position="bottom">
                <button
                  className="color-primary-40 text-xs font-mono p-1"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        memoizedCallbacks.setTokenAddress(text);
                        showToast("Token address pasted from clipboard", "success");
                      }
                    } catch (err) {
                      showToast("Failed to read from clipboard", "error");
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="color-primary opacity-60 hover:opacity-100 transition-opacity">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  </svg>
                </button>
              </WalletTooltip>
            </div>
          </div>          
          
          <WalletTooltip content="Open Settings" position="bottom">
            <button 
              className="p-2 border border-app-primary-40 hover-border-primary bg-app-secondary rounded cyberpunk-btn"
              onClick={() => memoizedCallbacks.setIsSettingsOpen(true)}
            >
              <Settings size={20} className="color-primary" />
            </button>
          </WalletTooltip>

          {/* Server Region Selector instead of Wallet Count */}
          <ServerRegionSelector />
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-8rem)]">
        {/* Desktop Layout */}
        <div className="hidden md:block w-full h-full">
          {state.leftColumnCollapsed ? (
            <Split
              className="flex w-full h-full split-custom"
              sizes={[70, 30]}
              minSize={[250, 350]}
              gutterSize={8}
              gutterAlign="center"
              direction="horizontal"
              dragInterval={1}
              gutter={(index, direction) => {
                const gutter = document.createElement('div');
                gutter.className = `gutter gutter-${direction}`;
                return gutter;
              }}
            >
              {/* Middle Column (Chart) */}
              <div className="backdrop-blur-sm bg-app-primary-99 border-r border-app-primary-40 overflow-y-auto">
                <ChartPage
                isLoadingChart={state.isLoadingChart}
                tokenAddress={state.tokenAddress}
                wallets={state.wallets}
                onDataUpdate={memoizedCallbacks.setIframeData}
                onTokenSelect={memoizedCallbacks.setTokenAddress}
                onNonWhitelistedTrade={handleNonWhitelistedTrade}
              />
              </div>

              {/* Right Column (Actions) */}
              <div className="backdrop-blur-sm bg-app-primary-99 overflow-y-auto">
                <ActionsPage
                 tokenAddress={state.tokenAddress}
                 setTokenAddress={memoizedCallbacks.setTokenAddress}
                 transactionFee={state.config.transactionFee}
                 handleRefresh={handleRefresh}
                 wallets={state.wallets}
                 solBalances={state.solBalances}
                 tokenBalances={state.tokenBalances}
                 currentMarketCap={state.currentMarketCap}
                 setBurnModalOpen={memoizedCallbacks.setBurnModalOpen}
                 setCalculatePNLModalOpen={memoizedCallbacks.setCalculatePNLModalOpen}
                 setDeployModalOpen={memoizedCallbacks.setDeployModalOpen}
                 setCustomBuyModalOpen={memoizedCallbacks.setCustomBuyModalOpen}
                 onOpenFloating={() => memoizedCallbacks.setFloatingCardOpen(true)}
                 isFloatingCardOpen={state.floatingCard.isOpen}
                 isAutomateCardOpen={state.automateCard.isOpen}
                 setAutomateCardOpen={memoizedCallbacks.setAutomateCardOpen}
                 automateCardPosition={state.automateCard.position}
                 setAutomateCardPosition={memoizedCallbacks.setAutomateCardPosition}
                 isAutomateCardDragging={state.automateCard.isDragging}
                 setAutomateCardDragging={memoizedCallbacks.setAutomateCardDragging}
                 iframeData={state.iframeData}
                 />
              </div>
            </Split>
          ) : (
            <Split
              className="flex w-full h-full split-custom"
              sizes={[20, 60, 20]}
              minSize={[250, 250, 350]}
              gutterSize={8}
              gutterAlign="center"
              direction="horizontal"
              dragInterval={1}
              gutter={(index, direction) => {
                const gutter = document.createElement('div');
                gutter.className = `gutter gutter-${direction}`;
                return gutter;
              }}
            >
              {/* Left Column */}
              <div className="backdrop-blur-sm bg-app-primary-99 border-r border-app-primary-40 overflow-y-auto">
                {state.connection && (
                  <WalletsPage
                  wallets={state.wallets}
                  setWallets={memoizedCallbacks.setWallets}
                  handleRefresh={handleRefresh}
                  isRefreshing={state.isRefreshing}
                  setIsModalOpen={memoizedCallbacks.setIsModalOpen}
                  tokenAddress={state.tokenAddress}
                  sortDirection={state.sortDirection}
                  handleSortWallets={() => handleSortWallets(state.wallets, state.sortDirection, memoizedCallbacks.setSortDirection, state.solBalances, memoizedCallbacks.setWallets)}
                  connection={state.connection}
                  solBalances={state.solBalances}
                  setSolBalances={memoizedCallbacks.setSolBalances}
                  tokenBalances={state.tokenBalances}
                  quickBuyEnabled={state.quickBuyEnabled}
                  setQuickBuyEnabled={memoizedCallbacks.setQuickBuyEnabled}
                  quickBuyAmount={state.quickBuyAmount}
                  setQuickBuyAmount={memoizedCallbacks.setQuickBuyAmount}
                  quickBuyMinAmount={state.quickBuyMinAmount}
                  setQuickBuyMinAmount={memoizedCallbacks.setQuickBuyMinAmount}
                  quickBuyMaxAmount={state.quickBuyMaxAmount}
                  setQuickBuyMaxAmount={memoizedCallbacks.setQuickBuyMaxAmount}
                  useQuickBuyRange={state.useQuickBuyRange}
                  setUseQuickBuyRange={memoizedCallbacks.setUseQuickBuyRange}
                  quickSellPercentage={state.quickSellPercentage}
                  setQuickSellPercentage={memoizedCallbacks.setQuickSellPercentage}
                  quickSellMinPercentage={state.quickSellMinPercentage}
                  setQuickSellMinPercentage={memoizedCallbacks.setQuickSellMinPercentage}
                  quickSellMaxPercentage={state.quickSellMaxPercentage}
                  setQuickSellMaxPercentage={memoizedCallbacks.setQuickSellMaxPercentage}
                  useQuickSellRange={state.useQuickSellRange}
                  setUseQuickSellRange={memoizedCallbacks.setUseQuickSellRange}
                />
              )}
            </div>

            {/* Middle Column */}
            <div className="backdrop-blur-sm bg-app-primary-99 border-r border-app-primary-40 overflow-y-auto">
              <ChartPage
              isLoadingChart={state.isLoadingChart}
              tokenAddress={state.tokenAddress}
              wallets={state.wallets}
              onDataUpdate={memoizedCallbacks.setIframeData}
              onTokenSelect={memoizedCallbacks.setTokenAddress}
              onNonWhitelistedTrade={handleNonWhitelistedTrade}
            />
            </div>

            {/* Right Column */}
            <div className="backdrop-blur-sm bg-app-primary-99 overflow-y-auto">
              <ActionsPage
              tokenAddress={state.tokenAddress}
              setTokenAddress={memoizedCallbacks.setTokenAddress}
              transactionFee={state.config.transactionFee}
              handleRefresh={handleRefresh}
              wallets={state.wallets}
              solBalances={state.solBalances}
              tokenBalances={state.tokenBalances}
              currentMarketCap={state.currentMarketCap}
              setBurnModalOpen={memoizedCallbacks.setBurnModalOpen}
              setCalculatePNLModalOpen={memoizedCallbacks.setCalculatePNLModalOpen}
              setDeployModalOpen={memoizedCallbacks.setDeployModalOpen}
              setCustomBuyModalOpen={memoizedCallbacks.setCustomBuyModalOpen}
              onOpenFloating={() => memoizedCallbacks.setFloatingCardOpen(true)}
              isFloatingCardOpen={state.floatingCard.isOpen}
              isAutomateCardOpen={state.automateCard.isOpen}
              setAutomateCardOpen={memoizedCallbacks.setAutomateCardOpen}
              automateCardPosition={state.automateCard.position}
              setAutomateCardPosition={memoizedCallbacks.setAutomateCardPosition}
              isAutomateCardDragging={state.automateCard.isDragging}
              setAutomateCardDragging={memoizedCallbacks.setAutomateCardDragging}
              iframeData={state.iframeData}
            />
            </div>
          </Split>
           )}
        </div>

        {/* Mobile Layout */}
        <MobileLayout
          currentPage={state.currentPage}
          setCurrentPage={memoizedCallbacks.setCurrentPage}
          children={{
            WalletsPage: (
              state.connection ? (
                <WalletsPage
                  wallets={state.wallets}
                  setWallets={memoizedCallbacks.setWallets}
                  handleRefresh={handleRefresh}
                  isRefreshing={state.isRefreshing}
                  setIsModalOpen={memoizedCallbacks.setIsModalOpen}
                  tokenAddress={state.tokenAddress}
                  sortDirection={state.sortDirection}
                  handleSortWallets={() => handleSortWallets(state.wallets, state.sortDirection, memoizedCallbacks.setSortDirection, state.solBalances, memoizedCallbacks.setWallets)}
                  connection={state.connection}
                  solBalances={state.solBalances}
                  tokenBalances={state.tokenBalances}
                  quickBuyEnabled={state.quickBuyEnabled}
                  setQuickBuyEnabled={memoizedCallbacks.setQuickBuyEnabled}
                  quickBuyAmount={state.quickBuyAmount}
                  setQuickBuyAmount={memoizedCallbacks.setQuickBuyAmount}
                  quickBuyMinAmount={state.quickBuyMinAmount}
                  setQuickBuyMinAmount={memoizedCallbacks.setQuickBuyMinAmount}
                  quickBuyMaxAmount={state.quickBuyMaxAmount}
                  setQuickBuyMaxAmount={memoizedCallbacks.setQuickBuyMaxAmount}
                  useQuickBuyRange={state.useQuickBuyRange}
                  setUseQuickBuyRange={memoizedCallbacks.setUseQuickBuyRange}
                  quickSellPercentage={state.quickSellPercentage}
                  setQuickSellPercentage={memoizedCallbacks.setQuickSellPercentage}
                  quickSellMinPercentage={state.quickSellMinPercentage}
                  setQuickSellMinPercentage={memoizedCallbacks.setQuickSellMinPercentage}
                  quickSellMaxPercentage={state.quickSellMaxPercentage}
                  setQuickSellMaxPercentage={memoizedCallbacks.setQuickSellMaxPercentage}
                  useQuickSellRange={state.useQuickSellRange}
                  setUseQuickSellRange={memoizedCallbacks.setUseQuickSellRange}
                />
              ) : (
                <div className="p-4 text-center text-app-secondary">
                  <div className="loading-anim inline-block">
                    <div className="h-4 w-4 rounded-full bg-app-primary-color mx-auto"></div>
                  </div>
                  <p className="mt-2 font-mono">CONNECTING TO NETWORK...</p>
                </div>
              )
            ),
            ChartPage: (
              <ChartPage
                isLoadingChart={state.isLoadingChart}
                tokenAddress={state.tokenAddress}
                wallets={state.wallets}
                onDataUpdate={memoizedCallbacks.setIframeData}
                onTokenSelect={memoizedCallbacks.setTokenAddress}
                onNonWhitelistedTrade={handleNonWhitelistedTrade}
              />
            ),
            ActionsPage: (
              <ActionsPage
                tokenAddress={state.tokenAddress}
                setTokenAddress={memoizedCallbacks.setTokenAddress}
                transactionFee={state.config.transactionFee}
                handleRefresh={handleRefresh}
                wallets={state.wallets}
                solBalances={state.solBalances}
                tokenBalances={state.tokenBalances}
                currentMarketCap={state.currentMarketCap}
                setBurnModalOpen={memoizedCallbacks.setBurnModalOpen}
                setCalculatePNLModalOpen={memoizedCallbacks.setCalculatePNLModalOpen}
                setDeployModalOpen={memoizedCallbacks.setDeployModalOpen}
                setCustomBuyModalOpen={memoizedCallbacks.setCustomBuyModalOpen}
                onOpenFloating={() => memoizedCallbacks.setFloatingCardOpen(true)}
                isFloatingCardOpen={state.floatingCard.isOpen}
                isAutomateCardOpen={state.automateCard.isOpen}
                setAutomateCardOpen={memoizedCallbacks.setAutomateCardOpen}
                automateCardPosition={state.automateCard.position}
                setAutomateCardPosition={memoizedCallbacks.setAutomateCardPosition}
                isAutomateCardDragging={state.automateCard.isDragging}
                setAutomateCardDragging={memoizedCallbacks.setAutomateCardDragging}
                iframeData={state.iframeData}
              />
            )
          }}
        />
      </div>
  
      {/* Enhanced Settings Modal */}
      <EnhancedSettingsModal
        isOpen={state.isSettingsOpen}
        onClose={() => memoizedCallbacks.setIsSettingsOpen(false)}
        config={state.config}
        onConfigChange={handleConfigChange}
        onSave={handleSaveSettings}
        wallets={state.wallets}
        setWallets={memoizedCallbacks.setWallets}
        connection={state.connection}
        solBalances={state.solBalances}
        setSolBalances={memoizedCallbacks.setSolBalances}
        tokenBalances={state.tokenBalances}
        setTokenBalances={memoizedCallbacks.setTokenBalances}
        tokenAddress={state.tokenAddress}
        showToast={showToast}
        activeTab={state.activeTab}
        setActiveTab={memoizedCallbacks.setActiveTab}
      />
  
      {/* Enhanced Wallet Overview */}
      <EnhancedWalletOverview
        isOpen={state.isModalOpen}
        onClose={() => memoizedCallbacks.setIsModalOpen(false)}
        wallets={state.wallets}
        setWallets={memoizedCallbacks.setWallets}
        solBalances={state.solBalances}
        tokenBalances={state.tokenBalances}
        tokenAddress={state.tokenAddress}
        connection={state.connection}
        handleRefresh={handleRefresh}
        isRefreshing={state.isRefreshing}
        showToast={showToast}
        onOpenSettings={() => {
          memoizedCallbacks.setIsModalOpen(false); // Close wallet overview first
          memoizedCallbacks.setActiveTab('wallets');
          memoizedCallbacks.setIsSettingsOpen(true);
        }}
      />

      {/* Modals */}
      <BurnModal
        isOpen={state.modals.burnModalOpen}
        onBurn={handleBurn}
        onClose={() => memoizedCallbacks.setBurnModalOpen(false)}
        handleRefresh={handleRefresh}
        tokenAddress={state.tokenAddress}
        solBalances={state.solBalances} 
        tokenBalances={state.tokenBalances}
      />

      <PnlModal
        isOpen={state.modals.calculatePNLModalOpen}
        onClose={() => memoizedCallbacks.setCalculatePNLModalOpen(false)}
        handleRefresh={handleRefresh}    
        tokenAddress={state.tokenAddress}
        iframeData={state.iframeData}
        tokenBalances={state.tokenBalances}
      />
      
      <DeployModal
        isOpen={state.modals.deployModalOpen}
        onClose={() => memoizedCallbacks.setDeployModalOpen(false)}
        handleRefresh={handleRefresh} 
        solBalances={state.solBalances} 
        onDeploy={handleDeploy}    
      />
      
      
      <CustomBuyModal
        isOpen={state.modals.customBuyModalOpen}
        onClose={() => memoizedCallbacks.setCustomBuyModalOpen(false)}
        onCustomBuy={handleCustomBuy}
        handleRefresh={handleRefresh}
        tokenAddress={state.tokenAddress}
        solBalances={state.solBalances} 
        tokenBalances={state.tokenBalances}
      />
      
      <FloatingTradingCard
        isOpen={state.floatingCard.isOpen}
        onClose={() => memoizedCallbacks.setFloatingCardOpen(false)}
        position={state.floatingCard.position}
        onPositionChange={memoizedCallbacks.setFloatingCardPosition}
        isDragging={state.floatingCard.isDragging}
        onDraggingChange={memoizedCallbacks.setFloatingCardDragging}
        tokenAddress={state.tokenAddress}
        wallets={state.wallets}
        selectedDex={state.config.selectedDex}
        setSelectedDex={configCallbacks.setSelectedDex}
        isDropdownOpen={state.config.isDropdownOpen}
        setIsDropdownOpen={configCallbacks.setIsDropdownOpen}
        buyAmount={state.config.buyAmount}
        setBuyAmount={configCallbacks.setBuyAmount}
        sellAmount={state.config.sellAmount}
        setSellAmount={configCallbacks.setSellAmount}
        handleTradeSubmit={handleTradeSubmit}
        isLoading={state.isRefreshing}
        getScriptName={getScriptName}
        countActiveWallets={countActiveWallets}
        currentMarketCap={state.currentMarketCap}
        tokenBalances={state.tokenBalances}
      />
      
      <AutomateFloatingCard
        isOpen={state.automateCard.isOpen}
        onClose={() => memoizedCallbacks.setAutomateCardOpen(false)}
        position={state.automateCard.position}
        onPositionChange={memoizedCallbacks.setAutomateCardPosition}
        isDragging={state.automateCard.isDragging}
        onDraggingChange={memoizedCallbacks.setAutomateCardDragging}
        tokenAddress={state.tokenAddress}
        wallets={state.wallets}
        solBalances={state.solBalances}
        tokenBalances={state.tokenBalances}
        nonWhitelistedTrades={state.nonWhitelistedTrades}
        iframeData={state.iframeData}
      />
    </div>
  );
};

export default WalletManager;