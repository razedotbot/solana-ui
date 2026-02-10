export type BalanceFilter = 'all' | 'nonZero' | 'highBalance' | 'lowBalance';
export type SortOption = 'address' | 'balance' | 'tokenBalance';
export type SortDirection = 'asc' | 'desc';

/**
 * Shared pure function for filtering and sorting wallet lists.
 *
 * Covers the common logic used across BurnPanel, FundPanel,
 * ConsolidatePanel, and TransferPanel.
 *
 * @param wallets        - The wallet array to filter/sort (generic, must have `address`)
 * @param searchTerm     - Text to match against address (and label if present)
 * @param balanceFilter  - Which balance bucket to keep
 * @param sortOption     - Field to sort by
 * @param sortDirection  - Ascending or descending
 * @param getBalance     - Callback that returns the primary balance for a wallet address
 * @param getTokenBalance - Optional callback for token balance (used by tokenBalance sort/filter)
 */
export const filterAndSortWallets = <T extends { address: string; label?: string }>(
  wallets: T[],
  searchTerm: string,
  balanceFilter: BalanceFilter,
  sortOption: SortOption,
  sortDirection: SortDirection,
  getBalance: (address: string) => number,
  getTokenBalance?: (address: string) => number,
): T[] => {
  let filtered = wallets;

  // Search filter: match against address and optional label (case-insensitive)
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((wallet) =>
      wallet.address.toLowerCase().includes(term) ||
      (wallet.label?.toLowerCase().includes(term) ?? false),
    );
  }

  // Balance filter
  if (balanceFilter !== 'all') {
    if (balanceFilter === 'nonZero') {
      filtered = filtered.filter(
        (wallet) =>
          (getBalance(wallet.address) || 0) > 0 ||
          (getTokenBalance ? (getTokenBalance(wallet.address) || 0) > 0 : false),
      );
    } else if (balanceFilter === 'highBalance') {
      filtered = filtered.filter(
        (wallet) => (getBalance(wallet.address) || 0) >= 0.1,
      );
    } else if (balanceFilter === 'lowBalance') {
      filtered = filtered.filter(
        (wallet) =>
          (getBalance(wallet.address) || 0) < 0.1 &&
          (getBalance(wallet.address) || 0) > 0,
      );
    }
  }

  // Sort
  return filtered.sort((a, b) => {
    if (sortOption === 'address') {
      return sortDirection === 'asc'
        ? a.address.localeCompare(b.address)
        : b.address.localeCompare(a.address);
    } else if (sortOption === 'balance') {
      const balanceA = getBalance(a.address) || 0;
      const balanceB = getBalance(b.address) || 0;
      return sortDirection === 'asc'
        ? balanceA - balanceB
        : balanceB - balanceA;
    } else if (sortOption === 'tokenBalance' && getTokenBalance) {
      const tokenBalanceA = getTokenBalance(a.address) || 0;
      const tokenBalanceB = getTokenBalance(b.address) || 0;
      return sortDirection === 'asc'
        ? tokenBalanceA - tokenBalanceB
        : tokenBalanceB - tokenBalanceA;
    }
    return 0;
  });
};
