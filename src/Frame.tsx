import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { BarChart } from 'lucide-react';
import { type WalletType, getWalletDisplayName } from './Utils';
import { brand } from './config/brandConfig';

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
  | ToggleNonWhitelistedTradesMessage;

interface ToggleNonWhitelistedTradesMessage {
  type: 'TOGGLE_NON_WHITELISTED_TRADES';
  enabled: boolean;
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
      <motion.button
        className={`p-2 rounded-md transition-colors ${variants[variant]} ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
      >
        {icon}
      </motion.button>
  );
});
IconButton.displayName = 'IconButton';

export const Frame: React.FC<FrameProps> = ({
  isLoadingChart,
  tokenAddress,
  wallets,
  onDataUpdate,
  onTokenSelect,
  onNonWhitelistedTrade
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tokenAddress: tokenAddressParam } = useParams<{ tokenAddress?: string }>();
  
  const [frameLoading, setFrameLoading] = useState(true);
  const [iframeKey] = useState(Date.now());
  const [isIframeReady, setIsIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messageQueue = useRef<IframeMessage[]>([]);
  
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
  }, [tradingStats, solPrice, currentWallets, recentTrades, tokenPrice, calculateMarketCap]);

  // Notify parent component of data updates (excluding currentWallets to prevent balance updates on selection)
  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate(iframeDataObject);
    }
  }, [iframeDataObject, onDataUpdate]);

  // Send message to iframe
  const sendMessageToIframe = useCallback((message: IframeMessage): void => {
    if (!isIframeReady || !iframeRef.current) {
      messageQueue.current.push(message);
      return;
    }

    iframeRef.current.contentWindow?.postMessage(message, '*');
  }, [isIframeReady]);

  
  // Setup iframe message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent<IframeResponse>): void => {
      switch (event.data.type) {
        case 'IFRAME_READY': {
          setIsIframeReady(true);
          
          // Navigate based on current route
          const pathname = location.pathname;
          
          if (pathname === '/holdings') {
            // Navigate to holdings view with wallet addresses
            iframeRef.current?.contentWindow?.postMessage({
              type: 'NAVIGATE',
              view: 'holdings',
              wallets: wallets.map(w => w.address)
            }, '*');
          } else if (pathname.startsWith('/token/') && tokenAddressParam) {
            // Navigate to token view with wallet addresses
            iframeRef.current?.contentWindow?.postMessage({
              type: 'NAVIGATE',
              view: 'token',
              tokenMint: tokenAddressParam,
              wallets: wallets.map(w => w.address)
            }, '*');
          } else if (pathname === '/monitor' || tokenAddress) {
            // Navigate to monitor or token view
            if (tokenAddress) {
              iframeRef.current?.contentWindow?.postMessage({
                type: 'NAVIGATE',
                view: 'token',
                tokenMint: tokenAddress,
                wallets: wallets.map(w => w.address)
              }, '*');
            } else {
              iframeRef.current?.contentWindow?.postMessage({
                type: 'NAVIGATE',
                view: 'monitor'
              }, '*');
            }
          }
          
          // Enable non-whitelisted trades for regular chart view
          sendMessageToIframe({
            type: 'TOGGLE_NON_WHITELISTED_TRADES',
            enabled: true
          });
          
          // Process queued messages
          messageQueue.current.forEach(message => {
            sendMessageToIframe(message);
          });
          messageQueue.current = [];
          
          break;
        }
        
        case 'WALLETS_ADDED':
          break;
        
        case 'WALLETS_CLEARED':
          break;
        
        case 'CURRENT_WALLETS':
          setCurrentWallets(event.data.wallets);
          break;
        
        case 'WHITELIST_TRADING_STATS': {
          const response = event.data;
          setTradingStats(response.data);
          break;
        }
        
        case 'SOL_PRICE_UPDATE': {
          const response = event.data;
          setSolPrice(response.data.solPrice);
          break;
        }
        
        case 'WHITELIST_TRADE': {
          const response = event.data;
          setRecentTrades(prev => {
            const newTrades = [response.data, ...prev].slice(0, 10); // Keep only last 10 trades
            return newTrades;
          });
          break;
        }
        
        case 'TOKEN_PRICE_UPDATE': {
          const response = event.data;
          setTokenPrice(response.data);
          break;
        }
        
        case 'TOKEN_SELECTED': {
          const response = event.data;
          if (onTokenSelect) {
            onTokenSelect(response.tokenAddress);
          }
          break;
        }
        
        case 'NON_WHITELIST_TRADE': {
           const response = event.data;
           onNonWhitelistedTrade?.(response.data);
           break;
         }
        
        case 'HOLDINGS_OPENED': {
          // When iframe requests holdings view, navigate parent to /holdings using React Router
          navigate('/holdings');
          break;
        }
        
        case 'TOKEN_CLEARED': {
          // When iframe goes back to home/monitor, navigate parent to /monitor using React Router
          navigate('/monitor');
          
          // Also clear the token in the parent
          if (onTokenSelect) {
            onTokenSelect('');
          }
          break;
        }
        
        case 'NAVIGATION_COMPLETE': {
          // Confirmation from iframe that navigation is complete
          // Can be used for loading states or analytics
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onTokenSelect, onNonWhitelistedTrade, sendMessageToIframe, wallets, tokenAddress, location.pathname, tokenAddressParam, navigate]);

  // Memoize wallet addresses for stable dependency comparison
  const walletAddresses = useMemo(() => {
    return wallets.map(w => w.address);
  }, [wallets]);

  // Send wallets to iframe only when addresses change (not selection changes)
  useEffect(() => {
    if (wallets && wallets.length > 0) {
      const iframeWallets: Wallet[] = wallets.map((wallet) => ({
        address: wallet.address,
        label: getWalletDisplayName(wallet)
      }));
      
      sendMessageToIframe({
        type: 'ADD_WALLETS',
        wallets: iframeWallets
      });
    } else {
      // Clear wallets if no addresses provided
      sendMessageToIframe({
        type: 'CLEAR_WALLETS'
      });
    }
  }, [
    // Only trigger when wallet addresses change, not when isActive changes
    walletAddresses, 
    wallets.length, 
    isIframeReady,
    sendMessageToIframe,
    wallets
  ]);
  
  // Navigate to token view when route changes (SPA navigation without reload)
  useEffect(() => {
    if (!isIframeReady || !iframeRef.current?.contentWindow) {
      return;
    }

    const pathname = location.pathname;
    
    // Handle different routes
    if (pathname === '/holdings') {
      // Navigate to holdings view
      iframeRef.current.contentWindow.postMessage({
        type: 'NAVIGATE',
        view: 'holdings',
        wallets: wallets.map(w => w.address)
      }, '*');
    } else if (pathname.startsWith('/token/') && tokenAddressParam) {
      // Navigate to token view
      iframeRef.current.contentWindow.postMessage({
        type: 'NAVIGATE',
        view: 'token',
        tokenMint: tokenAddressParam,
        wallets: wallets.map(w => w.address)
      }, '*');
      
      // Reset all live data when token changes
      setTradingStats(null);
      setSolPrice(null);
      setCurrentWallets([]);
      setRecentTrades([]);
      setTokenPrice(null);
    } else if (pathname === '/monitor') {
      // Navigate to monitor view
      iframeRef.current.contentWindow.postMessage({
        type: 'NAVIGATE',
        view: 'monitor'
      }, '*');
    }
  }, [location.pathname, tokenAddressParam, isIframeReady, wallets]);
  
  // Handle iframe load completion
  const handleFrameLoad = (): void => {
    setFrameLoading(false);
  };


  
  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const loaderVariants: Variants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };
  

  
  // Render loader
  const renderLoader = (loading: boolean): React.JSX.Element => (
    <AnimatePresence>
      {loading && (
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-app-primary-90 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="w-12 h-12 rounded-full border-2 border-t-transparent border-app-primary-30"
            variants={loaderVariants}
            animate="animate"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
  

  
  // Render iframe with single frame (SPA - no URL changes after initial load)
  const renderFrame = (): React.JSX.Element => {
    // Use base URL with only theme - navigation handled via postMessage
    const iframeSrc = `http://localhost:3000/sol/?theme=${brand.theme.name}`;
    
    return (
      <div 
        className="relative flex-1 overflow-hidden iframe-container"
        style={{ border: tokenAddress ? 'none' : undefined }}
      >
        {renderLoader(frameLoading || isLoadingChart)}
        
        <div className="absolute inset-0 overflow-hidden">
          <iframe 
            ref={iframeRef}
            key={`frame-${iframeKey}`}
            src={iframeSrc}
            className="absolute inset-0 w-full h-full border-0"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              minHeight: '100%',
              border: tokenAddress ? 'none' : undefined
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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative w-full rounded-lg overflow-hidden h	full md:h-full min-h-[calc(100vh-8rem)] md:min-h-full bg-gradient-to-br from-app-primary to-app-secondary"
      style={{
        touchAction: 'manipulation',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-app-secondary-80 to-transparent pointer-events-none" />
      
      
      <AnimatePresence mode="wait">
        {isLoadingChart ? (
          <div className="h-full flex items-center justify-center">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              <BarChart size={24} className="color-primary-light" />
            </motion.div>
          </div>
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 h-full"
          >
            {renderFrame()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Frame;


