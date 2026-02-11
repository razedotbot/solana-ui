/**
 * useWalletBalances Hook
 *
 * Centralized hook for managing wallet balance state and calculations.
 * Reduces duplicated balance logic across components.
 */

import { useMemo, useCallback } from 'react';
import type { WalletType } from '../types';

interface WalletBalanceStats {
  totalSol: number;
  activeSol: number;
  totalTokens: number;
  activeTokens: number;
  activeWalletCount: number;
  totalWalletCount: number;
}

interface UseWalletBalancesProps {
  wallets: WalletType[];
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
}

interface UseWalletBalancesReturn extends WalletBalanceStats {
  getWalletSolBalance: (address: string) => number;
  getWalletTokenBalance: (address: string) => number;
  getWalletsWithSol: () => WalletType[];
  getWalletsWithTokens: () => WalletType[];
  getActiveWallets: () => WalletType[];
}

/**
 * Hook for managing wallet balance calculations
 */
export const useWalletBalances = ({
  wallets,
  solBalances,
  tokenBalances,
}: UseWalletBalancesProps): UseWalletBalancesReturn => {
  // Memoized active wallets
  const activeWallets = useMemo(
    () => wallets.filter(wallet => wallet.isActive),
    [wallets],
  );

  // Calculate total SOL across all wallets
  const totalSol = useMemo(
    () => Array.from(solBalances.values()).reduce((sum, balance) => sum + balance, 0),
    [solBalances],
  );

  // Calculate active SOL (only active wallets)
  const activeSol = useMemo(
    () => activeWallets.reduce(
      (sum, wallet) => sum + (solBalances.get(wallet.address) || 0),
      0
    ),
    [activeWallets, solBalances],
  );

  // Calculate total tokens across all wallets
  const totalTokens = useMemo(
    () => Array.from(tokenBalances.values()).reduce((sum, balance) => sum + balance, 0),
    [tokenBalances],
  );

  // Calculate active tokens (only active wallets)
  const activeTokens = useMemo(
    () => activeWallets.reduce(
      (sum, wallet) => sum + (tokenBalances.get(wallet.address) || 0),
      0
    ),
    [activeWallets, tokenBalances],
  );

  // Helper functions
  const getWalletSolBalance = useCallback(
    (address: string) => solBalances.get(address) || 0,
    [solBalances],
  );

  const getWalletTokenBalance = useCallback(
    (address: string) => tokenBalances.get(address) || 0,
    [tokenBalances],
  );

  const getWalletsWithSol = useCallback(
    () => wallets.filter(wallet => (solBalances.get(wallet.address) || 0) > 0),
    [wallets, solBalances],
  );

  const getWalletsWithTokens = useCallback(
    () => wallets.filter(wallet => (tokenBalances.get(wallet.address) || 0) > 0),
    [wallets, tokenBalances],
  );

  const getActiveWallets = useCallback(
    () => activeWallets,
    [activeWallets],
  );

  return {
    totalSol,
    activeSol,
    totalTokens,
    activeTokens,
    activeWalletCount: activeWallets.length,
    totalWalletCount: wallets.length,
    getWalletSolBalance,
    getWalletTokenBalance,
    getWalletsWithSol,
    getWalletsWithTokens,
    getActiveWallets,
  };
};
