/**
 * Context for persisting iframe view state
 * Caches data per view to avoid re-fetching when switching views
 */

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

export type ViewType = 'holdings' | 'monitor' | 'token';

interface ViewState {
  tradingStats: {
    bought: number;
    sold: number;
    net: number;
    trades: number;
    timestamp: number;
  } | null;
  solPrice: number | null;
  currentWallets: Array<{ address: string; label?: string }>;
  recentTrades: Array<{
    type: 'buy' | 'sell';
    address: string;
    tokensAmount: number;
    avgPrice: number;
    solAmount: number;
    timestamp: number;
    signature: string;
  }>;
  tokenPrice: {
    tokenPrice: number;
    tokenMint: string;
    timestamp: number;
    tradeType: 'buy' | 'sell';
    volume: number;
  } | null;
  marketCap: number | null;
  timestamp: number;
}

interface IframeStateContextType {
  getViewState: (view: ViewType, tokenMint?: string) => ViewState | null;
  setViewState: (view: ViewType, state: Partial<ViewState>, tokenMint?: string) => void;
  clearViewState: (view: ViewType, tokenMint?: string) => void;
  clearAllStates: () => void;
}

const IframeStateContext = createContext<IframeStateContextType | null>(null);

const CACHE_TTL = 30000; // 30 seconds
const HOLDINGS_CACHE_TTL = 15000; // 15 seconds for holdings (shorter to prevent memory bloat)
const MAX_CACHE_ENTRIES = 20; // Limit total cached views

const getViewKey = (view: ViewType, tokenMint?: string): string => {
  return tokenMint ? `${view}:${tokenMint}` : view;
};

const getCacheTTL = (view: ViewType): number => {
  // Holdings data can be large, use shorter TTL
  return view === 'holdings' ? HOLDINGS_CACHE_TTL : CACHE_TTL;
};

export const IframeStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [viewStates, setViewStates] = useState<Map<string, ViewState>>(new Map());

  const getViewState = useCallback((view: ViewType, tokenMint?: string): ViewState | null => {
    const key = getViewKey(view, tokenMint);
    const state = viewStates.get(key);
    
    if (!state) return null;
    
    // Check if cache is still valid (use view-specific TTL)
    const now = Date.now();
    const ttl = getCacheTTL(view);
    if (now - state.timestamp > ttl) {
      // Cache expired, remove it
      setViewStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      return null;
    }
    
    return state;
  }, [viewStates]);

  const setViewState = useCallback((
    view: ViewType,
    partialState: Partial<ViewState>,
    tokenMint?: string
  ) => {
    const key = getViewKey(view, tokenMint);
    setViewStates(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(key) || {
        tradingStats: null,
        solPrice: null,
        currentWallets: [],
        recentTrades: [],
        tokenPrice: null,
        marketCap: null,
        timestamp: Date.now(),
      };
      
      newMap.set(key, {
        ...existing,
        ...partialState,
        timestamp: Date.now(),
      });
      
      // Enforce cache size limit - remove oldest entries
      if (newMap.size > MAX_CACHE_ENTRIES) {
        const entries = Array.from(newMap.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const entriesToRemove = entries.slice(0, newMap.size - MAX_CACHE_ENTRIES);
        entriesToRemove.forEach(([entryKey]) => newMap.delete(entryKey));
      }
      
      return newMap;
    });
  }, []);

  const clearViewState = useCallback((view: ViewType, tokenMint?: string) => {
    const key = getViewKey(view, tokenMint);
    setViewStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  const clearAllStates = useCallback(() => {
    setViewStates(new Map());
  }, []);

  const value = useMemo(() => ({
    getViewState,
    setViewState,
    clearViewState,
    clearAllStates,
  }), [getViewState, setViewState, clearViewState, clearAllStates]);

  return (
    <IframeStateContext.Provider value={value}>
      {children}
    </IframeStateContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useIframeState = (): IframeStateContextType => {
  const context = useContext(IframeStateContext);
  if (!context) {
    throw new Error('useIframeState must be used within IframeStateProvider');
  }
  return context;
};

