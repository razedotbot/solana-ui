import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { BarChart } from 'lucide-react';
import type { WalletType } from './utils/types';
import { brand } from './utils/brandConfig';
import { useIframeState, type ViewType } from './contexts/IframeStateContext';

interface FrameProps {
  isLoadingChart: boolean;
  tokenAddress: string;
  wallets: WalletType[];
  onDataUpdate?: (data: {
    tradingStats: {
      bought: number;
      sold: number;
      net: number;
      trades: number;
      timestamp: number;
    } | null;
    solPrice: number | null;
    currentWallets: Wallet[];
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
  }) => void;
  onTokenSelect?: (tokenAddress: string) => void;
  onNonWhitelistedTrade?: (trade: {
    type: 'buy' | 'sell';
    address: string;
    tokensAmount: number;
    avgPrice: number;
    solAmount: number;
    timestamp: number;
    signature: string;
    tokenMint: string;
    marketCap: number;
  }) => void;
  quickBuyEnabled?: boolean;
  quickBuyAmount?: number;
  quickBuyMinAmount?: number;
  quickBuyMaxAmount?: number;
  useQuickBuyRange?: boolean;
}

// Iframe communication types
interface Wallet {
  address: string;
  label?: string;
}

type IframeMessage = 
  | AddWalletsMessage
  | ClearWalletsMessage
  | GetWalletsMessage
  | ToggleNonWhitelistedTradesMessage
  | QuickBuyActivateMessage
  | QuickBuyDeactivateMessage;

interface ToggleNonWhitelistedTradesMessage {
  type: 'TOGGLE_NON_WHITELISTED_TRADES';
  enabled: boolean;
}

interface QuickBuyActivateMessage {
  type: 'QUICKBUY_ACTIVATE';
}

interface QuickBuyDeactivateMessage {
  type: 'QUICKBUY_DEACTIVATE';
}

interface AddWalletsMessage {
  type: 'ADD_WALLETS';
  wallets: (string | Wallet)[];
}

interface ClearWalletsMessage {
  type: 'CLEAR_WALLETS';
}

interface GetWalletsMessage {
  type: 'GET_WALLETS';
}

type IframeResponse = 
  | IframeReadyResponse
  | WalletsAddedResponse
  | WalletsClearedResponse
  | CurrentWalletsResponse
  | WhitelistTradingStatsResponse
  | SolPriceUpdateResponse
  | WhitelistTradeResponse
  | TokenPriceUpdateResponse
  | TokenSelectedResponse
  | NonWhitelistedTradeResponse
  | HoldingsOpenedResponse
  | TokenClearedResponse
  | NavigationCompleteResponse;

interface NonWhitelistedTradeResponse {
  type: 'NON_WHITELIST_TRADE';
  data: {
    type: 'buy' | 'sell';
    address: string;
    tokensAmount: number;
    avgPrice: number;
    solAmount: number;
    timestamp: number;
    signature: string;
    tokenMint: string;
    marketCap: number;
  };
}

interface TokenSelectedResponse {
  type: 'TOKEN_SELECTED';
  tokenAddress: string;
}

interface IframeReadyResponse {
  type: 'IFRAME_READY';
}

interface WalletsAddedResponse {
  type: 'WALLETS_ADDED';
  success: boolean;
  count: number;
}

interface WalletsClearedResponse {
  type: 'WALLETS_CLEARED';
  success: boolean;
}

interface CurrentWalletsResponse {
  type: 'CURRENT_WALLETS';
  wallets: Wallet[];
}

interface WhitelistTradingStatsResponse {
  type: 'WHITELIST_TRADING_STATS';
  data: {
    bought: number;
    sold: number;
    net: number;
    trades: number;
    solPrice: number;
    timestamp: number;
  };
}

interface SolPriceUpdateResponse {
  type: 'SOL_PRICE_UPDATE';
  data: {
    solPrice: number;
    timestamp: number;
  };
}

interface WhitelistTradeResponse {
  type: 'WHITELIST_TRADE';
  data: {
    type: 'buy' | 'sell';
    address: string;
    tokensAmount: number;
    avgPrice: number;
    solAmount: number;
    timestamp: number;
    signature: string;
  };
}

interface TokenPriceUpdateResponse {
  type: 'TOKEN_PRICE_UPDATE';
  data: {
    tokenPrice: number;
    tokenMint: string;
    timestamp: number;
    tradeType: 'buy' | 'sell';
    volume: number;
  };
}

interface HoldingsOpenedResponse {
  type: 'HOLDINGS_OPENED';
}

interface TokenClearedResponse {
  type: 'TOKEN_CLEARED';
}

interface NavigationCompleteResponse {
  type: 'NAVIGATION_COMPLETE';
  view: string;
  tokenMint: string | null;
}

// Button component with animation
const IconButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'solid';
  className?: string;
}> = React.memo(({ icon, onClick, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-primary-20 hover:bg-primary-30 text-app-tertiary',
    secondary: 'bg-app-secondary hover:bg-app-tertiary text-app-primary',
    solid: 'bg-app-primary-color hover:bg-primary-90 text-app-primary shadow-app-primary-20'
  };
  
  return (
      <button
        className={`p-2 rounded-md transition-colors ${variants[variant]} ${className} hover:scale-105 active:scale-95`}
        onClick={onClick}
      >
        {icon}
      </button>
  );
});
IconButton.displayName = 'IconButton';

export const Frame: React.FC<FrameProps> = ({
  isLoadingChart,
  tokenAddress,
  wallets,
  onDataUpdate,
  onTokenSelect,
  onNonWhitelistedTrade,
  quickBuyEnabled = true,
  quickBuyAmount: _quickBuyAmount = 0.01,
  quickBuyMinAmount: _quickBuyMinAmount = 0.01,
  quickBuyMaxAmount: _quickBuyMaxAmount = 0.05,
  useQuickBuyRange: _useQuickBuyRange = false
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tokenAddress: tokenAddressParam } = useParams<{ tokenAddress?: string }>();
  
  const [frameLoading, setFrameLoading] = useState(true);
  // Use static key to maintain iframe instance across navigations (postMessage handles routing)
  const [iframeKey] = useState(Date.now());
  const [isIframeReady, setIsIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { getViewState, setViewState } = useIframeState();
  const previousViewRef = useRef<{ view: ViewType; tokenMint?: string } | null>(null);
  const lastNavigationSentRef = useRef<{ view: string; tokenMint?: string } | null>(null);
  const quickBuyMessageSentRef = useRef(false);
  
  // Calculate iframe src ONCE on mount based on initial route
  // After initial load, ALL navigation uses postMessage (no iframe reloads)
  const initialIframeSrc = useRef<string | null>(null);
  if (!initialIframeSrc.current) {
    const urlParams = new URLSearchParams();
    urlParams.set('theme', brand.theme.name);
    
    // Determine the correct iframe params based on INITIAL route
    if (location.pathname === '/holdings') {
      urlParams.set('view', 'holdings');
    } else if (location.pathname.startsWith('/tokens/') && tokenAddressParam) {
      urlParams.set('tokenMint', tokenAddressParam);
    }
    // For monitor view, no additional params needed (will show homepage)
    
    initialIframeSrc.current = `https://iframe.raze.sh/sol/?${urlParams.toString()}`;
  }
  
  // State for iframe data
  const [tradingStats, setTradingStats] = useState<{
    bought: number;
    sold: number;
    net: number;
    trades: number;
    timestamp: number;
  } | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [currentWallets, setCurrentWallets] = useState<Wallet[]>([]);
  const [recentTrades, setRecentTrades] = useState<{
    type: 'buy' | 'sell';
    address: string;
    tokensAmount: number;
    avgPrice: number;
    solAmount: number;
    timestamp: number;
    signature: string;
  }[]>([]);
  const [tokenPrice, setTokenPrice] = useState<{
    tokenPrice: number;
    tokenMint: string;
    timestamp: number;
    tradeType: 'buy' | 'sell';
    volume: number;
  } | null>(null);

  // Calculate market cap from token price and SOL price
  const calculateMarketCap = useCallback((tokenPriceData: typeof tokenPrice, solPriceData: number | null): number | null => {
    if (!tokenPriceData || !solPriceData) {
      return null;
    }
    
    // Assuming 1 billion token supply (standard for many Solana tokens)
    const tokenSupply = 1000000000;
    
    // Market cap = token price (in SOL) * token supply * SOL price (in USD)
    const marketCapInUSD = tokenPriceData.tokenPrice * tokenSupply * solPriceData;
    
    return marketCapInUSD;
  }, []);

  // Memoize iframe data object to prevent unnecessary parent re-renders
  const iframeDataObject = useMemo(() => {
    const marketCap = calculateMarketCap(tokenPrice, solPrice);
    return {
      tradingStats,
      solPrice,
      currentWallets,
      recentTrades,
      tokenPrice,
      marketCap
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradingStats, solPrice, currentWallets, recentTrades, tokenPrice]);

  // Notify parent component of data updates (excluding currentWallets to prevent balance updates on selection)
  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate(iframeDataObject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeDataObject]);

  // Helper to send messages to iframe directly
  const sendMessageToIframe = useCallback((message: IframeMessage): void => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, []);

  
  // Determine current view and token mint - using stable primitives
  const currentViewType: ViewType = useMemo(() => {
    const pathname = location.pathname;
    if (pathname === '/holdings') {
      return 'holdings';
    } else if (pathname.startsWith('/tokens/') || tokenAddress) {
      return 'token';
    }
    return 'monitor';
  }, [location.pathname, tokenAddress]);

  const currentTokenMint = useMemo(() => {
    if (tokenAddressParam) return tokenAddressParam;
    if (tokenAddress) return tokenAddress;
    return undefined;
  }, [tokenAddressParam, tokenAddress]);

  // Restore cached state when view changes (using primitive dependencies)
  useEffect(() => {
    const cachedState = getViewState(currentViewType, currentTokenMint);
    if (cachedState) {
      setTradingStats(cachedState.tradingStats);
      setSolPrice(cachedState.solPrice);
      setCurrentWallets(cachedState.currentWallets);
      setRecentTrades(cachedState.recentTrades);
      setTokenPrice(cachedState.tokenPrice);
    } else {
      // Only clear state if switching to a different view (not just re-mounting)
      const prevView = previousViewRef.current;
      if (prevView && (prevView.view !== currentViewType || prevView.tokenMint !== currentTokenMint)) {
        // Clear state when switching views (but cache will preserve it)
        if (currentViewType === 'token' && currentTokenMint) {
          // Only clear token-specific data when switching tokens
          setTradingStats(null);
          setSolPrice(null);
          setCurrentWallets([]);
          setRecentTrades([]);
          setTokenPrice(null);
        }
      }
    }
    previousViewRef.current = { view: currentViewType, tokenMint: currentTokenMint };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentViewType, currentTokenMint]);

  // Save state to cache whenever it changes (using primitive dependencies)
  useEffect(() => {
    const marketCap = calculateMarketCap(tokenPrice, solPrice);
    setViewState(currentViewType, {
      tradingStats,
      solPrice,
      currentWallets,
      recentTrades,
      tokenPrice,
      marketCap,
    }, currentTokenMint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradingStats, solPrice, currentWallets, recentTrades, tokenPrice, currentViewType, currentTokenMint]);

  // Memoize wallet data with labels for iframe communication
  const walletData = useMemo(() => {
    return wallets.map(w => ({
      address: w.address,
      label: w.label || `${w.address.substring(0, 3)}...${w.address.substring(w.address.length - 3)}`
    }));
  }, [wallets]);

  // Consolidated navigation effect - handles all route changes via postMessage
  // IMPORTANT: Iframe src is static after initial load (see initialIframeSrc ref)
  // ALL navigation after initial load uses postMessage (no iframe reloads)
  // Note: walletData is NOT in dependencies to avoid infinite loops
  // We capture the current wallets value when the route changes
  useEffect(() => {
    if (!isIframeReady || !iframeRef.current?.contentWindow) {
      return;
    }

    const pathname = location.pathname;
    
    // Determine which view and token to use for postMessage navigation
    // Priority: route params > monitor/holdings routes
    // Note: We rely ONLY on route params to avoid race conditions with state updates
    let targetView: 'holdings' | 'token' | 'monitor';
    let targetTokenMint: string | undefined;
    
    if (pathname === '/holdings') {
      targetView = 'holdings';
      targetTokenMint = undefined;
    } else if (pathname.startsWith('/tokens/') && tokenAddressParam) {
      // Route-based token view - use route param directly
      targetView = 'token';
      targetTokenMint = tokenAddressParam;
    } else if (pathname === '/monitor' || pathname === '/') {
      targetView = 'monitor';
      targetTokenMint = undefined;
    } else {
      // Default to monitor for unknown routes
      targetView = 'monitor';
      targetTokenMint = undefined;
    }
    
    // Check if we're sending the same navigation message as last time
    const lastSent = lastNavigationSentRef.current;
    if (lastSent && 
        lastSent.view === targetView && 
        lastSent.tokenMint === targetTokenMint) {
      return;
    }
    
    // Set the ref IMMEDIATELY to prevent duplicate sends from concurrent effect runs
    lastNavigationSentRef.current = { view: targetView, tokenMint: targetTokenMint };
    
    // Add a small delay to ensure iframe components are ready
    // This prevents race conditions and duplicate initializations
    const timeoutId = setTimeout(() => {
      if (!iframeRef.current?.contentWindow) return;
      
      // Send navigation message
      if (targetView === 'holdings') {
        iframeRef.current.contentWindow.postMessage({
          type: 'NAVIGATE',
          view: 'holdings',
          wallets: walletData
        }, '*');
      } else if (targetView === 'token' && targetTokenMint) {
        iframeRef.current.contentWindow.postMessage({
          type: 'NAVIGATE',
          view: 'token',
          tokenMint: targetTokenMint,
          wallets: walletData
        }, '*');
      } else {
        iframeRef.current.contentWindow.postMessage({
          type: 'NAVIGATE',
          view: 'monitor'
        }, '*');
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, tokenAddressParam, isIframeReady]);

  // Setup iframe message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent<IframeMessage | IframeResponse>): void => {
      switch (event.data.type) {
        case 'IFRAME_READY': {
          setIsIframeReady(true);
          // Navigation will be triggered by the navigation effect when isIframeReady becomes true
          break;
        }
        
        case 'CURRENT_WALLETS':
          setCurrentWallets(event.data.wallets);
          break;
        
        case 'WHITELIST_TRADING_STATS': {
          setTradingStats(event.data.data);
          break;
        }
        
        case 'SOL_PRICE_UPDATE': {
          setSolPrice(event.data.data.solPrice);
          break;
        }
        
        case 'WHITELIST_TRADE': {
          const tradeData = event.data.data;
          setRecentTrades((prev) => {
            const newTrades: Array<{
              type: 'buy' | 'sell';
              address: string;
              tokensAmount: number;
              avgPrice: number;
              solAmount: number;
              timestamp: number;
              signature: string;
            }> = [tradeData, ...prev].slice(0, 10);
            return newTrades;
          });
          break;
        }
        
        case 'TOKEN_PRICE_UPDATE': {
          setTokenPrice(event.data.data);
          break;
        }
        
        case 'TOKEN_SELECTED': {
          if (onTokenSelect) {
            const selectedToken = event.data.tokenAddress;
            // Only navigate if we're not already on this token page
            // This prevents redirect loops when iframe confirms navigation
            if (tokenAddressParam !== selectedToken) {
              // Clear the last navigation sent ref to ensure we send NAVIGATE back to iframe
              // This fixes the issue where selecting a token from iframe doesn't update iframe view
              lastNavigationSentRef.current = null;
              onTokenSelect(selectedToken);
            }
          }
          break;
        }
        
        case 'NON_WHITELIST_TRADE': {
          onNonWhitelistedTrade?.(event.data.data);
          break;
        }
        
        case 'HOLDINGS_OPENED': {
          // Clear the last navigation sent ref to ensure we send NAVIGATE back to iframe
          lastNavigationSentRef.current = null;
          navigate('/holdings');
          break;
        }
        
        case 'TOKEN_CLEARED': {
          // Clear the last navigation sent ref to ensure we send NAVIGATE back to iframe
          lastNavigationSentRef.current = null;
          navigate('/monitor');
          if (onTokenSelect) {
            onTokenSelect('');
          }
          break;
        }
        
        case 'GET_WALLETS': {
          // Iframe is requesting wallet data - send it back
          if (iframeRef.current?.contentWindow) {
            const currentPath = location.pathname;
            
            // Send wallet data in the format the iframe expects
            if (currentPath === '/holdings') {
              // Holdings needs wallet addresses
              iframeRef.current.contentWindow.postMessage({
                type: 'HOLDINGS',
                payload: { wallets: walletData.map(w => w.address) }
              }, '*');
            } else if (currentPath.startsWith('/tokens/')) {
              // Token view needs wallet objects for tracking
              iframeRef.current.contentWindow.postMessage({
                type: 'ADD_WALLETS',
                wallets: walletData
              }, '*');
            }
          }
          break;
        }
        
        case 'WALLETS_ADDED':
        case 'WALLETS_CLEARED':
        case 'NAVIGATION_COMPLETE':
          // These are acknowledgment messages, no action needed
          break;
        
        case 'ADD_WALLETS':
        case 'CLEAR_WALLETS':
        case 'TOGGLE_NON_WHITELISTED_TRADES':
        case 'QUICKBUY_ACTIVATE':
        case 'QUICKBUY_DEACTIVATE':
          // These are messages sent TO iframe, not responses FROM iframe
          // No action needed here
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onTokenSelect, onNonWhitelistedTrade, sendMessageToIframe, navigate, walletData, location.pathname, tokenAddressParam]);

  // Note: Wallet syncing is now handled in the navigation message
  // No separate wallet sync effect needed since NAVIGATE includes wallets
  
  // Send quickbuy activation/deactivation to iframe when ready or when settings change
  useEffect(() => {
    if (!isIframeReady || !iframeRef.current?.contentWindow) {
      return;
    }

    // On initial load, add a small delay to ensure iframe message listener is ready
    // For subsequent changes, send immediately since iframe is already ready
    const sendMessage = (): void => {
      if (!iframeRef.current?.contentWindow) return;
      
      // Send quickbuy activation or deactivation message to iframe
      const quickBuyMessage = {
        type: quickBuyEnabled ? 'QUICKBUY_ACTIVATE' : 'QUICKBUY_DEACTIVATE'
      } as const;

      sendMessageToIframe(quickBuyMessage);
      quickBuyMessageSentRef.current = true;
    };

    if (!quickBuyMessageSentRef.current) {
      // First time: add delay to ensure iframe listener is ready
      const timeoutId = setTimeout(sendMessage, 150);
      return () => clearTimeout(timeoutId);
    }
    
    // Subsequent changes: send immediately
    sendMessage();
    return undefined;
  }, [isIframeReady, quickBuyEnabled, sendMessageToIframe]);
  
  // Handle iframe load completion
  const handleFrameLoad = (): void => {
    setFrameLoading(false);
  };


  
  // Render loader
  const renderLoader = (loading: boolean): React.JSX.Element => {
    if (!loading) return <></>;
    return (
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center bg-app-primary-90 z-10 animate-fade-in"
      >
        <div 
          className="w-12 h-12 rounded-full border-2 border-t-transparent border-app-primary-30 animate-spin"
          style={{ animationDuration: '1.5s' }}
        />
      </div>
    );
  };
  

  
  // Render iframe with single frame (SPA - no URL changes after initial load)
  const renderFrame = (): React.JSX.Element => {
    return (
      <div 
        className="relative flex-1 overflow-hidden iframe-container border-0"
      >
        {renderLoader(frameLoading || isLoadingChart)}
        
        <div className="absolute inset-0 overflow-hidden border-0">
          <iframe 
            ref={iframeRef}
            key={`frame-${iframeKey}`}
            src={initialIframeSrc.current || 'https://iframe.raze.sh/sol/'}
            className="absolute inset-0 w-full h-full border-0 outline-none"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              minHeight: '100%',
              border: 'none',
              outline: 'none',
              boxShadow: 'none'
            }}
            loading="eager"
            onLoad={handleFrameLoad}
            allow="clipboard-read; clipboard-write; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    );
  };

  return (
    <div 
      className="relative w-full rounded-lg overflow-hidden h	full md:h-full min-h-[calc(100vh-8rem)] md:min-h-full bg-gradient-to-br from-app-primary to-app-secondary border-0 animate-fade-in"
      style={{
        touchAction: 'manipulation',
        WebkitOverflowScrolling: 'touch',
        border: 'none',
        outline: 'none',
        boxShadow: 'none'
      }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-app-secondary-80 to-transparent pointer-events-none" />
      
      
      {isLoadingChart ? (
        <div className="h-full flex items-center justify-center">
          <div 
            className="animate-spin"
            style={{ animationDuration: '1.5s' }}
          >
            <BarChart size={24} className="color-primary-light" />
          </div>
        </div>
      ) : (
        <div 
          className="flex flex-1 h-full animate-fade-in"
        >
          {renderFrame()}
        </div>
      )}
    </div>
  );
};

export default Frame;


