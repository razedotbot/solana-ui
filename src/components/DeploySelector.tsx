import React from 'react';
import { Settings, Search, ArrowUp, ArrowDown, PlusCircle, X, DollarSign, Info } from 'lucide-react';
import { getWalletDisplayName } from '../Utils';
import type { WalletType } from '../utils/types';
import { useToast } from '../utils/useToast';

interface DeploySelectorProps {
  wallets: WalletType[];
  solBalances: Map<string, number>;
  selectedWallets: string[];
  setSelectedWallets: React.Dispatch<React.SetStateAction<string[]>>;
  walletAmounts: Record<string, string>;
  setWalletAmounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  MAX_WALLETS: number;
  isAdvancedMode: boolean;
  isPumpAdvancedMode: boolean;
  isBonkAdvancedMode: boolean;
}

export const DeploySelector: React.FC<DeploySelectorProps> = ({
  wallets,
  solBalances,
  selectedWallets,
  setSelectedWallets,
  walletAmounts,
  setWalletAmounts,
  MAX_WALLETS,
  isAdvancedMode,
  isPumpAdvancedMode,
  isBonkAdvancedMode,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortOption, setSortOption] = React.useState('balance');
  const [sortDirection, setSortDirection] = React.useState('desc');
  const [balanceFilter, setBalanceFilter] = React.useState('nonZero');

  const formatSolBalance = (balance: number): string => {
    return balance.toFixed(4);
  };

  const calculateTotalAmount = (): number => {
    return selectedWallets.reduce((total, wallet) => {
      return total + (parseFloat(walletAmounts[wallet]) || 0);
    }, 0);
  };

  const getWalletByPrivateKey = (privateKey: string): WalletType | undefined => {
    return wallets.find(wallet => wallet.privateKey === privateKey);
  };

  const filterWallets = (walletList: WalletType[], search: string): WalletType[] => {
    let filtered = walletList;
    if (search) {
      filtered = filtered.filter((wallet: WalletType) =>
        wallet.address.toLowerCase().includes(search.toLowerCase()) ||
        (wallet.label && wallet.label.toLowerCase().includes(search.toLowerCase()))
      );
    }

    if (balanceFilter !== 'all') {
      if (balanceFilter === 'nonZero') {
        filtered = filtered.filter((wallet: WalletType) => (solBalances.get(wallet.address) || 0) > 0);
      } else if (balanceFilter === 'highBalance') {
        filtered = filtered.filter((wallet: WalletType) => (solBalances.get(wallet.address) || 0) >= 0.1);
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter((wallet: WalletType) => (solBalances.get(wallet.address) || 0) < 0.1 && (solBalances.get(wallet.address) || 0) > 0);
      }
    }

    return filtered.sort((a: WalletType, b: WalletType) => {
      if (sortOption === 'address') {
        return sortDirection === 'asc'
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (sortOption === 'balance') {
        const balanceA = solBalances.get(a.address) || 0;
        const balanceB = solBalances.get(b.address) || 0;
        return sortDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
      }
      return 0;
    });
  };

  const handleWalletSelection = (privateKey: string): void => {
    setSelectedWallets(prev => {
      if (prev.includes(privateKey)) {
        return prev.filter(key => key !== privateKey);
      }
      if (prev.length >= MAX_WALLETS) {
        showToast(`Maximum ${MAX_WALLETS} wallets can be selected`, "error");
        return prev;
      }
      return [...prev, privateKey];
    });
  };

  const handleAmountChange = (privateKey: string, amount: string): void => {
    if (amount === '' || /^\d*\.?\d*$/.test(amount)) {
      setWalletAmounts(prev => ({
        ...prev,
        [privateKey]: amount
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={16} className="color-primary" />
          <h3 className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
            <span className="color-primary">&#62;</span> Select Wallets & Amounts <span className="color-primary">&#60;</span>
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            if (selectedWallets.length > 0) {
              setSelectedWallets([]);
            } else {
              const walletsToSelect = wallets.slice(0, MAX_WALLETS);
              setSelectedWallets(walletsToSelect.map(w => w.privateKey));
            }
          }}
          className="text-xs color-primary hover:text-app-secondary font-mono"
        >
          {selectedWallets.length > 0 ? 'DESELECT ALL' : 'SELECT ALL'}
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-grow min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus:border-app-primary transition-all font-mono"
            placeholder="SEARCH..."
          />
        </div>

        <select
          className="bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-2 text-sm text-app-primary focus:outline-none focus:border-app-primary font-mono"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="address">ADDRESS</option>
          <option value="balance">BALANCE</option>
        </select>

        <button
          type="button"
          className="p-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-secondary hover:border-app-primary hover:color-primary transition-all"
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
        >
          {sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
        </button>

        <select
          className="bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-2 text-sm text-app-primary focus:outline-none focus:border-app-primary font-mono"
          value={balanceFilter}
          onChange={(e) => setBalanceFilter(e.target.value)}
        >
          <option value="all">ALL</option>
          <option value="nonZero">NON-ZERO</option>
          <option value="highBalance">HIGH</option>
          <option value="lowBalance">LOW</option>
        </select>
      </div>

      {/* Info */}
      <div className={`border rounded-lg p-3 flex items-center gap-2 ${isAdvancedMode
        ? isPumpAdvancedMode
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : isBonkAdvancedMode
            ? 'bg-orange-500/10 border-orange-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        : 'bg-app-tertiary border-app-primary-30'
        }`}>
        <Info size={14} className={isAdvancedMode ? (isPumpAdvancedMode ? 'text-emerald-500' : isBonkAdvancedMode ? 'text-orange-500' : 'text-amber-500') : 'color-primary'} />
        <span className={`text-xs font-mono ${isAdvancedMode ? (isPumpAdvancedMode ? 'text-emerald-400' : isBonkAdvancedMode ? 'text-orange-400' : 'text-amber-400') : 'text-app-secondary'}`}>
          {isAdvancedMode
            ? `ADVANCED MODE: SELECT UP TO ${MAX_WALLETS} WALLETS. MULTI-BUNDLE DEPLOYMENT.`
            : `SELECT UP TO ${MAX_WALLETS} WALLETS. FIRST WALLET IS THE CREATOR.`
          }
        </span>
      </div>

      {/* Summary */}
      {selectedWallets.length > 0 && (
        <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-app-secondary font-mono">SELECTED:</span>
            <span className="text-xs font-medium color-primary font-mono">
              {selectedWallets.length} / {MAX_WALLETS}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-app-secondary font-mono">TOTAL:</span>
            <span className="text-xs font-medium color-primary font-mono">{calculateTotalAmount().toFixed(4)} SOL</span>
          </div>
        </div>
      )}

      {/* Wallet List */}
      <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-3 max-h-80 overflow-y-auto">
        {/* Selected Wallets */}
        {selectedWallets.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-app-secondary mb-2 font-mono">
              <span className="color-primary">&#62;</span> SELECTED <span className="color-primary">&#60;</span>
            </div>
            {selectedWallets.map((privateKey, index) => {
              const wallet = getWalletByPrivateKey(privateKey);
              const solBalance = wallet ? solBalances.get(wallet.address) || 0 : 0;

              return (
                <div
                  key={wallet?.id}
                  className="p-3 rounded-lg bg-primary-10 border border-app-primary-40 mb-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (index > 0) {
                              const newOrder = [...selectedWallets];
                              [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                              setSelectedWallets(newOrder);
                            }
                          }}
                          disabled={index === 0}
                          className={`p-0.5 rounded ${index === 0 ? 'opacity-30' : 'hover:bg-app-tertiary'}`}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (index < selectedWallets.length - 1) {
                              const newOrder = [...selectedWallets];
                              [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                              setSelectedWallets(newOrder);
                            }
                          }}
                          disabled={index === selectedWallets.length - 1}
                          className={`p-0.5 rounded ${index === selectedWallets.length - 1 ? 'opacity-30' : 'hover:bg-app-tertiary'}`}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium color-primary font-mono">{index === 0 ? 'CREATOR' : `#${index + 1}`}</span>
                          <span className="text-xs font-medium text-app-primary font-mono">
                            {wallet ? getWalletDisplayName(wallet) : 'UNKNOWN'}
                          </span>
                        </div>
                        <div className="text-xs text-app-secondary font-mono">
                          {formatSolBalance(solBalance)} SOL
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <DollarSign size={12} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-app-secondary" />
                        <input
                          type="text"
                          value={walletAmounts[privateKey] || ''}
                          onChange={(e) => handleAmountChange(privateKey, e.target.value)}
                          placeholder="0.1"
                          className="w-24 pl-7 pr-2 py-1.5 bg-app-tertiary border border-app-primary-30 rounded text-xs text-app-primary font-mono focus:outline-none focus:border-app-primary"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleWalletSelection(privateKey)}
                        className="p-1 rounded hover:bg-app-tertiary transition-all"
                      >
                        <X size={14} className="text-app-secondary hover:text-app-primary" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Available Wallets */}
        {selectedWallets.length < MAX_WALLETS && (
          <div>
            <div className="text-xs font-medium text-app-secondary mb-2 font-mono">
              <span className="color-primary">&#62;</span> AVAILABLE <span className="color-primary">&#60;</span>
            </div>
            {filterWallets(wallets.filter(w => !selectedWallets.includes(w.privateKey)), searchTerm).map((wallet: WalletType) => {
              const solBalance = solBalances.get(wallet.address) || 0;

              return (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-app-primary-30 hover:border-app-primary-60 hover:bg-app-tertiary transition-all mb-2 cursor-pointer"
                  onClick={() => handleWalletSelection(wallet.privateKey)}
                >
                  <div className="flex items-center gap-3">
                    <PlusCircle size={14} className="text-app-secondary" />
                    <div>
                      <span className="text-xs font-medium text-app-primary font-mono">
                        {getWalletDisplayName(wallet)}
                      </span>
                      <div className="text-xs text-app-secondary font-mono">
                        {formatSolBalance(solBalance)} SOL
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filterWallets(wallets.filter(w => !selectedWallets.includes(w.privateKey)), searchTerm).length === 0 && (
              <div className="text-center py-4 text-app-secondary font-mono text-xs">
                {searchTerm ? "NO WALLETS FOUND" : "NO WALLETS AVAILABLE"}
              </div>
            )}
          </div>
        )}

        {selectedWallets.length >= MAX_WALLETS && (
          <div className="text-center py-3 bg-app-tertiary border border-app-primary-30 rounded-lg">
            <div className="color-primary font-mono text-xs">MAX WALLETS REACHED</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploySelector;
