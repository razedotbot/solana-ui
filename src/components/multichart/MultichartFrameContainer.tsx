import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMultichart } from '../../contexts/useMultichart';
import { brand } from '../../utils/brandConfig';
import type { WalletType } from '../../utils/types';

interface MultichartFrameContainerProps {
  wallets: WalletType[];
  isLoadingChart: boolean;
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

// Build iframe URL for a token
const buildIframeUrl = (tokenAddress: string): string => {
  const params = new URLSearchParams();
  params.set('theme', brand.theme.name);
  if (tokenAddress) {
    params.set('tokenMint', tokenAddress);
    params.set('view', 'simple');
  }
  return `https://frame.raze.sh/sol/?${params.toString()}`;
};

export const MultichartFrameContainer: React.FC<MultichartFrameContainerProps> = ({
  wallets,
  isLoadingChart,
  onTokenSelect,
  onNonWhitelistedTrade,
}) => {
  const navigate = useNavigate();
  const { tokenAddress: routeTokenAddress } = useParams<{ tokenAddress?: string }>();
  const { addToken, tokens, setActiveToken, activeTokenIndex } = useMultichart();

  // Refs for all iframes - keyed by token address
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());

  // Get the current token address from route ONLY - don't fallback to context
  // On /monitor route, no token should be active
  const currentTokenAddress = routeTokenAddress || '';

  // Sync activeTokenIndex with route when URL changes
  useEffect(() => {
    if (routeTokenAddress) {
      const tokenIndex = tokens.findIndex(t => t.address === routeTokenAddress);
      if (tokenIndex !== -1 && tokenIndex !== activeTokenIndex) {
        setActiveToken(tokenIndex);
      }
    } else {
      // On /monitor - set activeTokenIndex to -1 (no active token)
      if (activeTokenIndex !== -1) {
        setActiveToken(-1);
      }
    }
  }, [routeTokenAddress, tokens, activeTokenIndex, setActiveToken]);

  // Handle token selection from iframe (when user clicks a token in monitor view)
  const handleTokenSelect = useCallback((tokenAddress: string) => {
    if (tokenAddress) {
      addToken(tokenAddress);
      navigate(`/tokens/${tokenAddress}`);
    }
    onTokenSelect?.(tokenAddress);
  }, [addToken, navigate, onTokenSelect]);

  // Handle messages from iframes
  useEffect(() => {
    const handleMessage = (event: MessageEvent<{ type: string; tokenAddress?: string; data?: unknown }>): void => {
      const msgData = event.data;
      if (!msgData?.type) return;

      // Check if message is from one of our iframes
      let isFromOurIframe = false;
      iframeRefs.current.forEach((iframe) => {
        if (iframe?.contentWindow === event.source) {
          isFromOurIframe = true;
        }
      });

      if (!isFromOurIframe) return;

      if (msgData.type === 'TOKEN_SELECTED' && typeof msgData.tokenAddress === 'string') {
        handleTokenSelect(msgData.tokenAddress);
      }

      if (msgData.type === 'NON_WHITELIST_TRADE' && onNonWhitelistedTrade && msgData.data) {
        onNonWhitelistedTrade(msgData.data as {
          type: 'buy' | 'sell';
          address: string;
          tokensAmount: number;
          avgPrice: number;
          solAmount: number;
          timestamp: number;
          signature: string;
          tokenMint: string;
          marketCap: number;
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleTokenSelect, onNonWhitelistedTrade]);

  // Send wallets to iframes when they're ready
  useEffect(() => {
    const handleIframeReady = (event: MessageEvent<{ type: string }>): void => {
      if (event.data?.type === 'IFRAME_READY') {
        // Find which iframe sent this and send wallets to it
        iframeRefs.current.forEach((iframe) => {
          if (iframe?.contentWindow === event.source) {
            const walletData = wallets.map(w => ({
              address: w.address,
              label: w.label || `${w.address.slice(0, 3)}...${w.address.slice(-3)}`
            }));
            iframe.contentWindow?.postMessage({
              type: 'ADD_WALLETS',
              wallets: walletData
            }, '*');
          }
        });
      }
    };

    window.addEventListener('message', handleIframeReady);
    return () => window.removeEventListener('message', handleIframeReady);
  }, [wallets]);

  // Set iframe ref
  const setIframeRef = useCallback((address: string, el: HTMLIFrameElement | null) => {
    if (el) {
      iframeRefs.current.set(address, el);
    } else {
      iframeRefs.current.delete(address);
    }
  }, []);

  return (
    <div className="flex-1 relative">
      {isLoadingChart && (
        <div className="absolute inset-0 flex items-center justify-center bg-app-primary-90 z-10">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent border-app-primary-30 animate-spin" />
        </div>
      )}

      {/* Monitor iframe - shown when no token selected */}
      <iframe
        ref={(el) => setIframeRef('monitor', el)}
        src={buildIframeUrl('')}
        className="absolute inset-0 w-full h-full border-0"
        style={{
          visibility: !currentTokenAddress ? 'visible' : 'hidden',
          zIndex: !currentTokenAddress ? 1 : 0
        }}
        allow="clipboard-read; clipboard-write; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
      />

      {/* Token iframes - all loaded, only active visible */}
      {tokens.map((token) => (
        <iframe
          key={token.address}
          ref={(el) => setIframeRef(token.address, el)}
          src={buildIframeUrl(token.address)}
          className="absolute inset-0 w-full h-full border-0"
          style={{
            visibility: currentTokenAddress === token.address ? 'visible' : 'hidden',
            zIndex: currentTokenAddress === token.address ? 1 : 0
          }}
          allow="clipboard-read; clipboard-write; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
        />
      ))}
    </div>
  );
};
