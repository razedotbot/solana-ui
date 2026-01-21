import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  X,
  Loader2,
  Check,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { useMultichart } from '../../contexts/useMultichart';
import type { WalletType } from '../../utils/types';
import type { MultichartToken } from '../../utils/types/multichart';
import { toggleWallet, getWalletDisplayName, countActiveWallets } from '../../utils/wallet';
import { saveWalletsToCookies } from '../../utils/storage';
import { formatTokenBalance } from '../../utils/formatting';
import { executeTrade } from '../../utils/trading';
import { useToast } from '../../utils/hooks';

interface MultichartTokenListProps {
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  onAddToken: () => void;
}

// Shared Wallet Selector Popup
const WalletPopup: React.FC<{
  wallets: WalletType[];
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onToggleWallet: (id: number) => void;
  onSelectAll: () => void;
  onSelectAllWithBalance: () => void;
}> = ({ wallets, solBalances, tokenBalances, anchorRef, onClose, onToggleWallet, onSelectAll, onSelectAllWithBalance }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 320) });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  return createPortal(
    <div ref={popupRef} className="fixed z-[9999]" style={{ top: position.top, left: position.left }}>
      <div className="bg-app-primary border border-app-primary-40 rounded-lg shadow-xl min-w-[300px] max-h-[350px] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-app-primary-40 bg-app-primary-60">
          <button onClick={onSelectAll} className="px-2 py-1 text-[10px] font-mono bg-app-quaternary border border-app-primary-40 text-app-secondary rounded hover:bg-app-primary-20 transition-colors">
            All
          </button>
          <button onClick={onSelectAllWithBalance} className="px-2 py-1 text-[10px] font-mono bg-app-quaternary border border-app-primary-40 text-app-secondary rounded hover:bg-app-primary-20 transition-colors">
            With Balance
          </button>
        </div>
        <div className="overflow-y-auto max-h-[300px]">
          {wallets.filter((w) => !w.isArchived).map((wallet) => {
            const solBal = solBalances.get(wallet.address) || 0;
            const tokenBal = tokenBalances.get(wallet.address) || 0;
            return (
              <div
                key={wallet.id}
                onClick={() => onToggleWallet(wallet.id)}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all border-b border-app-primary-20 last:border-b-0 ${
                  wallet.isActive ? 'bg-primary-20' : 'hover:bg-app-primary-60'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    wallet.isActive ? 'bg-app-primary-color border-app-primary-color' : 'border-app-primary-40'
                  }`}>
                    {wallet.isActive && <Check size={10} className="text-black" />}
                  </div>
                  <span className={`text-xs font-mono truncate ${wallet.isActive ? 'text-app-primary' : 'text-app-secondary'}`}>
                    {getWalletDisplayName(wallet)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-app-secondary-60">{solBal.toFixed(2)}</span>
                  <span className="color-primary">{formatTokenBalance(tokenBal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

// Single Token Row with Trading
const TokenRow: React.FC<{
  token: MultichartToken;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  wallets: WalletType[];
  solBalances: Map<string, number>;
}> = ({ token, isActive, onSelect, onRemove, wallets, solBalances }) => {
  const { tokenStats } = useMultichart();
  const stats = tokenStats.get(token.address);
  const { showToast } = useToast();

  const [selectedDex, setSelectedDex] = useState('auto');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showDexDropdown, setShowDexDropdown] = useState(false);

  const buyPresets = ['0.01', '0.05', '0.1', '0.5'];
  const sellPresets = ['25', '50', '75', '100'];

  const handleTrade = useCallback(async (isBuy: boolean, amount: string) => {
    const key = `${isBuy ? 'buy' : 'sell'}-${amount}`;
    setIsLoading(key);
    try {
      const config = {
        tokenAddress: token.address,
        ...(isBuy ? { solAmount: parseFloat(amount) } : { sellPercent: parseFloat(amount) }),
      };
      const result = await executeTrade(selectedDex, wallets, config, isBuy, solBalances);
      if (result.success) {
        showToast(`${token.symbol || 'Token'}: ${isBuy ? 'Buy' : 'Sell'} submitted`, 'success');
      } else {
        showToast(`${token.symbol || 'Token'}: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    } finally {
      setIsLoading(null);
    }
  }, [token, selectedDex, wallets, solBalances, showToast]);

  const formatPrice = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    if (num < 0.000001) return num.toExponential(1);
    if (num < 0.01) return num.toFixed(5);
    return num.toFixed(3);
  };

  const formatMcap = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toFixed(0);
  };

  const pnl = stats?.pnl?.net ?? 0;
  const isPnlPositive = pnl >= 0;

  // Handle click on the entire row to select this token
  const handleRowClick = useCallback((e: React.MouseEvent) => {
    // Prevent selecting when clicking on trading buttons or remove button
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.trading-controls')) {
      return;
    }
    onSelect();
  }, [onSelect]);

  return (
    <div
      onClick={handleRowClick}
      className={`border-b border-app-primary-30 transition-all cursor-pointer ${
        isActive
          ? 'bg-app-primary-color/10 border-l-4 border-l-app-primary-color'
          : 'hover:bg-app-primary-60 border-l-4 border-l-transparent'
      }`}
    >
      {/* Token Info Row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Active Indicator */}
        {isActive && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-app-primary-color/20 border border-app-primary-color/40">
            <div className="w-1.5 h-1.5 rounded-full bg-app-primary-color animate-pulse" />
            <span className="text-[8px] font-mono color-primary font-semibold">VIEWING</span>
          </div>
        )}

        {/* Token Image & Name */}
        <div className="flex items-center gap-2 min-w-0 w-[120px]">
          {token.imageUrl ? (
            <img src={token.imageUrl} alt="" className="w-6 h-6 rounded-full flex-shrink-0 border border-app-primary-40"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-6 h-6 rounded-full bg-app-quaternary flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className={`text-xs font-mono font-bold truncate ${isActive ? 'color-primary' : 'text-app-primary'}`}>{token.symbol || 'Unknown'}</div>
            <div className="text-[9px] font-mono text-app-secondary-60">{token.address.slice(0, 4)}...{token.address.slice(-3)}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-[10px] font-mono flex-1">
          <div className="w-[70px]">
            <div className="text-app-secondary-60">Price</div>
            <div className="text-app-primary">${formatPrice(stats?.price)}</div>
          </div>
          <div className="w-[60px]">
            <div className="text-app-secondary-60">MCap</div>
            <div className="text-app-primary">${formatMcap(stats?.marketCap)}</div>
          </div>
          <div className="w-[70px]">
            <div className="text-app-secondary-60">PnL</div>
            <div className={`flex items-center gap-0.5 ${isPnlPositive ? 'color-primary' : 'text-warning'}`}>
              {isPnlPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {pnl.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Remove Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1 rounded hover:bg-red-500/20 transition-colors opacity-60 hover:opacity-100"
        >
          <X size={14} className="text-app-secondary hover:text-red-500" />
        </button>
      </div>

      {/* Trading Controls Row */}
      <div className="trading-controls flex items-center gap-2 px-3 pb-2">
        {/* DEX Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDexDropdown(!showDexDropdown)}
            className="flex items-center gap-1 px-2 py-1 text-[9px] font-mono rounded border border-app-primary-40 bg-app-quaternary hover:border-app-primary-60 transition-colors"
          >
            <span className="uppercase text-app-secondary">{selectedDex}</span>
            <ChevronDown size={10} className="text-app-secondary-60" />
          </button>
          {showDexDropdown && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-app-primary border border-app-primary-40 rounded shadow-lg">
              {['auto', 'raydium', 'pump'].map((dex) => (
                <button
                  key={dex}
                  onClick={() => { setSelectedDex(dex); setShowDexDropdown(false); }}
                  className={`block w-full px-3 py-1 text-[9px] font-mono uppercase text-left hover:bg-app-primary-60 transition-colors ${
                    selectedDex === dex ? 'color-primary' : 'text-app-secondary'
                  }`}
                >
                  {dex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-green-500 mr-1">BUY</span>
          {buyPresets.map((amt) => (
            <button
              key={`buy-${amt}`}
              onClick={() => handleTrade(true, amt)}
              disabled={isLoading !== null}
              className="px-2 py-1 text-[10px] font-mono rounded border bg-green-600/10 border-green-600/30 text-green-500 hover:bg-green-600/20 hover:border-green-600/50 disabled:opacity-50 transition-all min-w-[36px]"
            >
              {isLoading === `buy-${amt}` ? <Loader2 size={10} className="animate-spin mx-auto" /> : amt}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-app-primary-40" />

        {/* Sell Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-red-500 mr-1">SELL</span>
          {sellPresets.map((pct) => (
            <button
              key={`sell-${pct}`}
              onClick={() => handleTrade(false, pct)}
              disabled={isLoading !== null}
              className="px-2 py-1 text-[10px] font-mono rounded border bg-red-600/10 border-red-600/30 text-red-500 hover:bg-red-600/20 hover:border-red-600/50 disabled:opacity-50 transition-all min-w-[36px]"
            >
              {isLoading === `sell-${pct}` ? <Loader2 size={10} className="animate-spin mx-auto" /> : `${pct}%`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const MultichartTokenList: React.FC<MultichartTokenListProps> = ({
  wallets,
  setWallets,
  solBalances,
  tokenBalances,
  onAddToken,
}) => {
  const navigate = useNavigate();
  const { tokens, activeTokenIndex, setActiveToken, removeToken } = useMultichart();
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const walletBtnRef = useRef<HTMLButtonElement>(null);
  const { showToast } = useToast();

  const activeWalletCount = countActiveWallets(wallets);

  // Handle token selection - update active index AND navigate to token route
  const handleSelectToken = useCallback((index: number) => {
    const token = tokens[index];
    if (token) {
      setActiveToken(index);
      // Navigate to the token route so Frame gets the updated tokenAddress
      navigate(`/tokens/${token.address}`);
    }
  }, [tokens, setActiveToken, navigate]);

  const handleToggleWallet = useCallback((walletId: number): void => {
    const updated = toggleWallet(wallets, walletId);
    setWallets(updated);
    saveWalletsToCookies(updated);
  }, [wallets, setWallets]);

  const handleSelectAll = useCallback((): void => {
    const allActive = wallets.filter((w) => !w.isArchived).every((w) => w.isActive);
    const updated = wallets.map((w) => ({ ...w, isActive: w.isArchived ? w.isActive : !allActive }));
    setWallets(updated);
    saveWalletsToCookies(updated);
  }, [wallets, setWallets]);

  const handleSelectAllWithBalance = useCallback((): void => {
    const withBalance = wallets.filter((w) => {
      if (w.isArchived) return false;
      return (solBalances.get(w.address) || 0) > 0 || (tokenBalances.get(w.address) || 0) > 0;
    });
    if (withBalance.length === 0) {
      showToast('No wallets with balance', 'error');
      return;
    }
    const allActive = withBalance.every((w) => w.isActive);
    const updated = wallets.map((w) => {
      if (w.isArchived) return w;
      const hasBal = (solBalances.get(w.address) || 0) > 0 || (tokenBalances.get(w.address) || 0) > 0;
      return { ...w, isActive: allActive ? false : (hasBal || w.isActive) };
    });
    setWallets(updated);
    saveWalletsToCookies(updated);
  }, [wallets, solBalances, tokenBalances, setWallets, showToast]);

  return (
    <div className="h-full bg-app-primary flex flex-col overflow-hidden">
      {/* Wallet Selector Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-app-primary-40 bg-app-primary-60 flex-shrink-0">
        <span className="text-[10px] font-mono text-app-secondary-60 uppercase">Trading Panel</span>
        <button
          ref={walletBtnRef}
          onClick={() => setShowWalletPopup(!showWalletPopup)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded border border-app-primary-40 bg-app-quaternary hover:border-app-primary-60 transition-colors"
        >
          <Zap size={12} className="color-primary" />
          <span className="color-primary font-semibold">{activeWalletCount}</span>
          <span className="text-app-secondary-60">wallets</span>
        </button>
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-y-auto">
        {tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Plus size={40} className="text-app-secondary-40 mb-3" />
            <div className="text-sm font-mono text-app-secondary-60 mb-2">No tokens added</div>
            <button
              onClick={onAddToken}
              className="px-4 py-2 text-xs font-mono rounded bg-app-primary-color text-black font-semibold hover:bg-app-primary-dark transition-colors"
            >
              Add First Token
            </button>
          </div>
        ) : (
          tokens.map((token, index) => (
            <TokenRow
              key={token.address}
              token={token}
              isActive={index === activeTokenIndex}
              onSelect={() => handleSelectToken(index)}
              onRemove={() => removeToken(token.address)}
              wallets={wallets}
              solBalances={solBalances}
            />
          ))
        )}
      </div>

      {/* Add Token Button */}
      {tokens.length > 0 && (
        <div className="p-2 border-t border-app-primary-40 flex-shrink-0">
          <button
            onClick={onAddToken}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono rounded border border-dashed border-app-primary-40 text-app-secondary hover:border-app-primary-60 hover:text-app-primary transition-colors"
          >
            <Plus size={14} />
            Add Another Token
          </button>
        </div>
      )}

      {/* Wallet Popup */}
      {showWalletPopup && (
        <WalletPopup
          wallets={wallets}
          solBalances={solBalances}
          tokenBalances={tokenBalances}
          anchorRef={walletBtnRef}
          onClose={() => setShowWalletPopup(false)}
          onToggleWallet={handleToggleWallet}
          onSelectAll={handleSelectAll}
          onSelectAllWithBalance={handleSelectAllWithBalance}
        />
      )}
    </div>
  );
};
