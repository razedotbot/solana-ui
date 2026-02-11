/**
 * useWalletFilter Hook
 *
 * Centralized hook for filtering and sorting wallets.
 * Reduces duplicated filtering logic across components.
 */

import { useMemo, useState, useCallback } from 'react';
import type { WalletType, WalletCategory } from '../types';

type SortField = 'sol' | 'token' | 'address' | 'category';
type SortDirection = 'asc' | 'desc';

interface FilterOptions {
  category?: WalletCategory | 'all';
  hasBalance?: boolean;
  hasTokens?: boolean;
  isActive?: boolean;
  searchTerm?: string;
}

interface UseWalletFilterProps {
  wallets: WalletType[];
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
}

interface UseWalletFilterReturn {
  filteredWallets: WalletType[];
  sortedWallets: WalletType[];
  sortField: SortField | null;
  sortDirection: SortDirection;
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  setSortField: (field: SortField) => void;
  toggleSortDirection: () => void;
  clearFilters: () => void;
}

/**
 * Hook for filtering and sorting wallets
 */
export const useWalletFilter = ({
  wallets,
  solBalances,
  tokenBalances,
}: UseWalletFilterProps): UseWalletFilterReturn => {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sortField, setSortFieldState] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Apply filters
  const filteredWallets = useMemo(() => {
    return wallets.filter(wallet => {
      // Category filter
      if (filters.category && filters.category !== 'all') {
        if (wallet.category !== filters.category) return false;
      }

      // Balance filter
      if (filters.hasBalance !== undefined) {
        const balance = solBalances.get(wallet.address) || 0;
        if (filters.hasBalance && balance <= 0) return false;
        if (!filters.hasBalance && balance > 0) return false;
      }

      // Token filter
      if (filters.hasTokens !== undefined) {
        const tokenBalance = tokenBalances.get(wallet.address) || 0;
        if (filters.hasTokens && tokenBalance <= 0) return false;
        if (!filters.hasTokens && tokenBalance > 0) return false;
      }

      // Active filter
      if (filters.isActive !== undefined) {
        if (wallet.isActive !== filters.isActive) return false;
      }

      // Search filter
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchesAddress = wallet.address.toLowerCase().includes(term);
        const matchesLabel = wallet.label?.toLowerCase().includes(term);
        if (!matchesAddress && !matchesLabel) return false;
      }

      return true;
    });
  }, [wallets, filters, solBalances, tokenBalances]);

  // Apply sorting
  const sortedWallets = useMemo(() => {
    if (!sortField) return filteredWallets;

    return [...filteredWallets].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'sol': {
          const balanceA = solBalances.get(a.address) || 0;
          const balanceB = solBalances.get(b.address) || 0;
          comparison = balanceA - balanceB;
          break;
        }
        case 'token': {
          const tokenA = tokenBalances.get(a.address) || 0;
          const tokenB = tokenBalances.get(b.address) || 0;
          comparison = tokenA - tokenB;
          break;
        }
        case 'address': {
          comparison = a.address.localeCompare(b.address);
          break;
        }
        case 'category': {
          const catA = a.category || '';
          const catB = b.category || '';
          comparison = catA.localeCompare(catB);
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredWallets, sortField, sortDirection, solBalances, tokenBalances]);

  // Handlers
  const setSortField = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortFieldState(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSortFieldState(null);
  }, []);

  return {
    filteredWallets,
    sortedWallets,
    sortField,
    sortDirection,
    filters,
    setFilters,
    setSortField,
    toggleSortDirection,
    clearFilters,
  };
};
