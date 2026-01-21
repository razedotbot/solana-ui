import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { MultichartToken, MultichartTokenStats } from '../utils/types/multichart';
import {
  saveMultichartTokens,
  loadMultichartTokens,
  saveMultichartActiveIndex,
  loadMultichartActiveIndex,
  getMaxMultichartTokens,
} from '../utils/storage';

interface MultichartContextType {
  tokens: MultichartToken[];
  activeTokenIndex: number;
  tokenStats: Map<string, MultichartTokenStats>;
  addToken: (address: string, metadata?: Partial<MultichartToken>) => boolean;
  removeToken: (address: string) => void;
  setActiveToken: (index: number) => void;
  updateTokenStats: (address: string, stats: MultichartTokenStats) => void;
  updateTokenMetadata: (address: string, metadata: Partial<MultichartToken>) => void;
  maxTokens: number;
}

const MultichartContext = createContext<MultichartContextType | undefined>(undefined);

export function MultichartProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [tokens, setTokens] = useState<MultichartToken[]>(() => loadMultichartTokens());
  const [activeTokenIndex, setActiveTokenIndex] = useState<number>(() => {
    const savedIndex = loadMultichartActiveIndex();
    const loadedTokens = loadMultichartTokens();
    // Ensure index is valid
    return savedIndex < loadedTokens.length ? savedIndex : 0;
  });
  const [tokenStats, setTokenStats] = useState<Map<string, MultichartTokenStats>>(new Map());

  const maxTokens = getMaxMultichartTokens();

  // Persist tokens to localStorage whenever they change
  useEffect(() => {
    saveMultichartTokens(tokens);
  }, [tokens]);

  // Persist active index to cookies whenever it changes
  useEffect(() => {
    saveMultichartActiveIndex(activeTokenIndex);
  }, [activeTokenIndex]);

  const addToken = useCallback(
    (address: string, metadata?: Partial<MultichartToken>): boolean => {
      // Check if token already exists
      if (tokens.some((t) => t.address === address)) {
        // Switch to existing token
        const existingIndex = tokens.findIndex((t) => t.address === address);
        setActiveTokenIndex(existingIndex);
        return false;
      }

      // Check max tokens limit
      if (tokens.length >= maxTokens) {
        console.warn(`Cannot add more than ${maxTokens} tokens`);
        return false;
      }

      const newToken: MultichartToken = {
        address,
        addedAt: Date.now(),
        ...metadata,
      };

      setTokens((prev) => [...prev, newToken]);
      setActiveTokenIndex(tokens.length); // Set to the new token's index
      return true;
    },
    [tokens, maxTokens]
  );

  const removeToken = useCallback(
    (address: string) => {
      const indexToRemove = tokens.findIndex((t) => t.address === address);
      if (indexToRemove === -1) return;

      setTokens((prev) => prev.filter((t) => t.address !== address));

      // Remove stats for this token
      setTokenStats((prev) => {
        const newStats = new Map(prev);
        newStats.delete(address);
        return newStats;
      });

      // Adjust active index if needed
      if (activeTokenIndex >= indexToRemove) {
        const newIndex = Math.max(0, activeTokenIndex - 1);
        setActiveTokenIndex(newIndex);
      }
    },
    [tokens, activeTokenIndex]
  );

  const setActiveToken = useCallback(
    (index: number) => {
      if (index >= 0 && index < tokens.length) {
        setActiveTokenIndex(index);
      }
    },
    [tokens.length]
  );

  const updateTokenStats = useCallback((address: string, stats: MultichartTokenStats) => {
    setTokenStats((prev) => {
      const newStats = new Map(prev);
      newStats.set(address, stats);
      return newStats;
    });
  }, []);

  const updateTokenMetadata = useCallback((address: string, metadata: Partial<MultichartToken>) => {
    setTokens((prev) =>
      prev.map((token) =>
        token.address === address ? { ...token, ...metadata } : token
      )
    );
  }, []);

  const value: MultichartContextType = {
    tokens,
    activeTokenIndex,
    tokenStats,
    addToken,
    removeToken,
    setActiveToken,
    updateTokenStats,
    updateTokenMetadata,
    maxTokens,
  };

  return <MultichartContext.Provider value={value}>{children}</MultichartContext.Provider>;
}

export function useMultichart(): MultichartContextType {
  const context = useContext(MultichartContext);
  if (context === undefined) {
    throw new Error('useMultichart must be used within a MultichartProvider');
  }
  return context;
}
