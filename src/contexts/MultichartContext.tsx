import React, { useState, useCallback, useEffect } from 'react';
import type { MultichartToken, MultichartTokenStats } from '../utils/types/multichart';
import {
  saveMultichartTokens,
  loadMultichartTokens,
  saveMultichartActiveIndex,
  loadMultichartActiveIndex,
  getMaxMultichartTokens,
} from '../utils/storage';
import { MultichartContext } from './MultichartContextDef';

export function MultichartProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [tokens, setTokens] = useState<MultichartToken[]>(() => loadMultichartTokens());
  const [activeTokenIndex, setActiveTokenIndex] = useState<number>(() => {
    const savedIndex = loadMultichartActiveIndex();
    const loadedTokens = loadMultichartTokens();
    // Ensure index is valid, -1 means no active token (monitor view)
    if (savedIndex === -1) return -1;
    return savedIndex < loadedTokens.length ? savedIndex : -1;
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
      if (activeTokenIndex !== -1 && activeTokenIndex >= indexToRemove) {
        const newIndex = Math.max(-1, activeTokenIndex - 1);
        setActiveTokenIndex(newIndex);
      }
    },
    [tokens, activeTokenIndex]
  );

  const setActiveToken = useCallback(
    (index: number) => {
      // Allow -1 for "no active token" (monitor view)
      if (index === -1 || (index >= 0 && index < tokens.length)) {
        setActiveTokenIndex(index);
      }
    },
    [tokens.length]
  );

  const updateTokenStats = useCallback((address: string, stats: MultichartTokenStats) => {
    setTokenStats((prev) => {
      const existing = prev.get(address);
      // Only update if data actually changed to prevent infinite loops
      if (existing &&
          existing.price === stats.price &&
          existing.marketCap === stats.marketCap &&
          existing.pnl?.bought === stats.pnl?.bought &&
          existing.pnl?.sold === stats.pnl?.sold &&
          existing.pnl?.net === stats.pnl?.net &&
          existing.pnl?.trades === stats.pnl?.trades) {
        return prev; // Return same reference to prevent re-render
      }
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

  const value = {
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
