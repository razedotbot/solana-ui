import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Zap,
} from 'lucide-react';
import { useMultichart } from '../../contexts/useMultichart';
import type { WalletType } from '../../utils/types';
import type { MultichartToken } from '../../utils/types/multichart';
import { toggleWallet, getWalletDisplayName, countActiveWallets } from '../../utils/wallet';
import { saveWalletsToCookies } from '../../utils/storage';
import { formatTokenBalance } from '../../utils/formatting';
import { executeTrade } from '../../utils/trading';
import { useToast } from '../../utils/hooks';

interface MultichartTokenCardProps {
  token: MultichartToken;
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  onRemove: () => void;
}

// Compact Wallet Selector Popup
const WalletPopup: React.FC<{
  wallets: WalletType[];
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onToggleWallet: (id: number) => void;
  onSelectAll: () => void;
}> = ({ wallets, solBalances, tokenBalances, anchorRef, onClose, onToggleWallet, onSelectAll }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
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
      <div className="bg-app-primary border border-app-primary-40 rounded-lg shadow-xl min-w-[280px] max-h-[300px] overflow-hidden">
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-app-primary-40 bg-app-primary-60">
          <span className="text-[10px] font-mono text-app-secondary-60 uppercase">Select Wallets</span>
          <button onClick={onSelectAll} className="px-2 py-0.5 text-[9px] font-mono bg-app-quaternary border border-app-primary-40 text-app-secondary rounded hover:bg-app-primary-20 transition-colors">
            Toggle All
          </button>
        </div>
        <div className="overflow-y-auto max-h-[250px]">
          {wallets.filter((w) => !w.isArchived).map((wallet) => {
            const solBal = solBalances.get(wallet.address) || 0;
            const tokenBal = tokenBalances.get(wallet.address) || 0;
            return (
              <div
                key={wallet.id}
                onClick={() => onToggleWallet(wallet.id)}
                className={`flex items-center justify-between px-2 py-1.5 cursor-pointer transition-all border-b border-app-primary-20 last:border-b-0 ${
                  wallet.isActive ? 'bg-primary-20' : 'hover:bg-app-primary-60'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                    wallet.isActive ? 'bg-app-primary-color border-app-primary-color' : 'border-app-primary-40'
                  }`}>
                    {wallet.isActive && <Check size={8} className="text-black" />}
                  </div>
                  <span className={`text-[10px] font-mono truncate ${wallet.isActive ? 'text-app-primary' : 'text-app-secondary'}`}>
                    {getWalletDisplayName(wallet)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono text-app-secondary-60">
                  <span>{solBal.toFixed(2)}</span>
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

export const MultichartTokenCard: React.FC<MultichartTokenCardProps> = ({
  token,
  wallets,
  setWallets,
  solBalances,
  tokenBalances,
  onRemove,
}) => {
  const { tokenStats } = useMultichart();
  const stats = tokenStats.get(token.address);
  const { showToast } = useToast();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDex, setSelectedDex] = useState('auto');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellPercent, setSellPercent] = useState('');
  const [isLoading, setIsLoading] = useState<'buy' | 'sell' | null>(null);
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const walletBtnRef = useRef<HTMLButtonElement>(null);

  // Buy presets
  const buyPresets = ['0.01', '0.05', '0.1', '0.5'];
  // Sell presets
  const sellPresets = ['25', '50', '75', '100'];

  const activeWalletCount = countActiveWallets(wallets);

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

  const handleTrade = useCallback(async (isBuy: boolean, amount: string) => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsLoading(isBuy ? 'buy' : 'sell');
    try {
      const config = {
        tokenAddress: token.address,
        ...(isBuy ? { solAmount: parseFloat(amount) } : { sellPercent: parseFloat(amount) }),
      };
      const result = await executeTrade(selectedDex, wallets, config, isBuy, solBalances);
      if (result.success) {
        showToast(`${isBuy ? 'Buy' : 'Sell'} submitted`, 'success');
        if (isBuy) setBuyAmount('');
        else setSellPercent('');
      } else {
        showToast(`Failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    } finally {
      setIsLoading(null);
    }
  }, [token.address, selectedDex, wallets, solBalances, showToast]);

  const formatPrice = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    if (num < 0.000001) return num.toExponential(2);
    if (num < 0.01) return num.toFixed(6);
    return num.toFixed(4);
  };

  const formatMcap = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toFixed(0);
  };

  const pnl = stats?.pnl?.net ?? 0;
  const isPnlPositive = pnl >= 0;

  return (
    <div className="border-b border-app-primary-40 bg-app-primary">
      {/* Compact Header Row */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        {/* Token Info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {token.imageUrl && (
            <img src={token.imageUrl} alt="" className="w-5 h-5 rounded-full flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <div className="min-w-0">
            <div className="text-xs font-mono font-bold text-app-primary truncate">{token.symbol || 'Unknown'}</div>
            <div className="text-[9px] font-mono text-app-secondary-60">{token.address.slice(0, 4)}...{token.address.slice(-4)}</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="text-center">
            <div className="text-app-secondary-60">Price</div>
            <div className="text-app-primary font-medium">${formatPrice(stats?.price)}</div>
          </div>
          <div className="text-center">
            <div className="text-app-secondary-60">MCap</div>
            <div className="text-app-primary font-medium">${formatMcap(stats?.marketCap)}</div>
          </div>
          <div className="text-center">
            <div className="text-app-secondary-60">PnL</div>
            <div className={`font-medium flex items-center justify-center gap-0.5 ${isPnlPositive ? 'color-primary' : 'text-warning'}`}>
              {isPnlPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {pnl.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-app-quaternary transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand trading'}
          >
            {isExpanded ? <ChevronUp size={14} className="text-app-secondary" /> : <ChevronDown size={14} className="text-app-secondary" />}
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-red-500/20 transition-colors"
            title="Remove token"
          >
            <X size={14} className="text-app-secondary hover:text-red-500" />
          </button>
        </div>
      </div>

      {/* Quick Trade Row (Always Visible) */}
      <div className="flex items-center gap-1 px-2 pb-1.5">
        {/* Buy Presets */}
        <div className="flex items-center gap-0.5">
          {buyPresets.map((amt) => (
            <button
              key={`buy-${amt}`}
              onClick={() => handleTrade(true, amt)}
              disabled={isLoading !== null}
              className="px-1.5 py-0.5 text-[9px] font-mono rounded border bg-green-600/20 border-green-600/40 text-green-500 hover:bg-green-600/30 disabled:opacity-50 transition-all"
            >
              {isLoading === 'buy' ? <Loader2 size={8} className="animate-spin" /> : amt}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-app-primary-40 mx-1" />

        {/* Sell Presets */}
        <div className="flex items-center gap-0.5">
          {sellPresets.map((pct) => (
            <button
              key={`sell-${pct}`}
              onClick={() => handleTrade(false, pct)}
              disabled={isLoading !== null}
              className="px-1.5 py-0.5 text-[9px] font-mono rounded border bg-red-600/20 border-red-600/40 text-red-500 hover:bg-red-600/30 disabled:opacity-50 transition-all"
            >
              {isLoading === 'sell' ? <Loader2 size={8} className="animate-spin" /> : `${pct}%`}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Wallet Selector */}
        <button
          ref={walletBtnRef}
          onClick={() => setShowWalletPopup(!showWalletPopup)}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono rounded border border-app-primary-40 bg-app-quaternary hover:border-app-primary-60 transition-colors"
        >
          <Zap size={10} className="color-primary" />
          <span className="color-primary font-semibold">{activeWalletCount}</span>
          <span className="text-app-secondary-60">w</span>
        </button>
      </div>

      {/* Expanded Trading Panel */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-app-primary-30 pt-2">
          {/* DEX Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono text-app-secondary-60 w-8">DEX</span>
            <div className="flex gap-0.5">
              {['auto', 'raydium', 'pump'].map((dex) => (
                <button
                  key={dex}
                  onClick={() => setSelectedDex(dex)}
                  className={`px-2 py-0.5 text-[9px] font-mono rounded border transition-all ${
                    selectedDex === dex
                      ? 'bg-app-primary-color border-app-primary-color text-black font-semibold'
                      : 'bg-app-quaternary border-app-primary-40 text-app-secondary hover:border-app-primary-60'
                  }`}
                >
                  {dex}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Buy/Sell */}
          <div className="grid grid-cols-2 gap-2">
            {/* Buy */}
            <div className="space-y-1">
              <div className="flex gap-1">
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  placeholder="SOL"
                  className="flex-1 px-2 py-1 text-[10px] font-mono bg-app-primary border border-app-primary-40 rounded focus:outline-none focus:border-green-500 text-app-primary"
                  step="0.01"
                  min="0"
                />
                <button
                  onClick={() => handleTrade(true, buyAmount)}
                  disabled={isLoading !== null || !buyAmount}
                  className="px-3 py-1 text-[10px] font-mono font-semibold rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 transition-all"
                >
                  {isLoading === 'buy' ? <Loader2 size={10} className="animate-spin" /> : 'BUY'}
                </button>
              </div>
            </div>

            {/* Sell */}
            <div className="space-y-1">
              <div className="flex gap-1">
                <input
                  type="number"
                  value={sellPercent}
                  onChange={(e) => setSellPercent(e.target.value)}
                  placeholder="%"
                  className="flex-1 px-2 py-1 text-[10px] font-mono bg-app-primary border border-app-primary-40 rounded focus:outline-none focus:border-red-500 text-app-primary"
                  step="1"
                  min="0"
                  max="100"
                />
                <button
                  onClick={() => handleTrade(false, sellPercent)}
                  disabled={isLoading !== null || !sellPercent}
                  className="px-3 py-1 text-[10px] font-mono font-semibold rounded bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-all"
                >
                  {isLoading === 'sell' ? <Loader2 size={10} className="animate-spin" /> : 'SELL'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-app-primary-30">
            <div className="flex items-center gap-3">
              <span><span className="text-app-secondary-60">Bought:</span> <span className="color-primary">{(stats?.pnl?.bought ?? 0).toFixed(2)}</span></span>
              <span><span className="text-app-secondary-60">Sold:</span> <span className="text-warning">{(stats?.pnl?.sold ?? 0).toFixed(2)}</span></span>
              <span><span className="text-app-secondary-60">Trades:</span> <span className="text-app-primary">{stats?.pnl?.trades ?? 0}</span></span>
            </div>
          </div>
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
        />
      )}
    </div>
  );
};
