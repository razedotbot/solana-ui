import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Check,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Edit3,
  Loader2,
  Activity,
} from 'lucide-react';
import { useMultichart } from '../../contexts/useMultichart';
import type { WalletType } from '../../utils/types';
import { toggleWallet, getWalletDisplayName, countActiveWallets } from '../../utils/wallet';
import { saveWalletsToCookies } from '../../utils/storage';
import { formatTokenBalance } from '../../utils/formatting';
import { executeTrade, getLatestTrades, type TradeHistoryEntry } from '../../utils/trading';
import { useToast } from '../../utils/hooks';

interface MultichartTokenPanelProps {
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
}

// Preset Button Component with instant execution
const PresetButton = React.memo<{
  value: string;
  onExecute: () => void;
  onChange: (newValue: string) => void;
  isLoading: boolean;
  variant?: 'buy' | 'sell';
  isEditMode: boolean;
}>(({ value, onExecute, onChange, isLoading, variant = 'buy', isEditMode }) => {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditMode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      const newValue = parseFloat(editValue);
      if (!isNaN(newValue) && newValue > 0) {
        onChange(newValue.toString());
      }
    } else if (e.key === 'Escape') {
      setEditValue(value);
    }
  };

  const handleBlur = (): void => {
    const newValue = parseFloat(editValue);
    if (!isNaN(newValue) && newValue > 0) {
      onChange(newValue.toString());
    } else {
      setEditValue(value);
    }
  };

  if (isEditMode) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-full h-8 px-2 text-xs font-mono rounded border text-center
               bg-app-primary text-app-primary border-app-primary-color
               focus:outline-none focus:ring-1 focus:ring-app-primary-40"
      />
    );
  }

  return (
    <button
      onClick={() => onExecute()}
      disabled={isLoading}
      className={`relative group px-2 py-1.5 text-xs font-mono rounded border transition-all duration-200
              min-w-[48px] h-8 flex items-center justify-center
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                variant === 'buy'
                  ? 'bg-app-primary-60 border-app-primary-40 color-primary hover:bg-primary-20 hover:border-app-primary-60'
                  : 'bg-app-primary-60 border-error-alt-40 text-error-alt hover:bg-error-30 hover:border-error-alt'
              }`}
    >
      {isLoading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        value
      )}
    </button>
  );
});
PresetButton.displayName = 'PresetButton';

// Wallet Selector Popup Component
const WalletSelectorPopup: React.FC<{
  wallets: WalletType[];
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  walletSelectorRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onToggleWallet: (id: number) => void;
  onSelectAll: () => void;
  onSelectAllWithBalance: () => void;
}> = ({
  wallets,
  solBalances,
  tokenBalances,
  walletSelectorRef,
  onClose,
  onToggleWallet,
  onSelectAll,
  onSelectAllWithBalance,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (walletSelectorRef.current) {
      const rect = walletSelectorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [walletSelectorRef]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        walletSelectorRef.current &&
        !walletSelectorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, walletSelectorRef]);

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-[9999]"
      style={{ top: position.top, left: position.left }}
    >
      <div className="bg-app-primary border border-app-primary-40 rounded-lg shadow-xl shadow-black/50 min-w-[320px] max-h-[400px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-app-primary-40 bg-app-primary-60">
          <button
            onClick={onSelectAll}
            className="px-2 py-1 text-[10px] font-mono bg-app-primary-80 border border-app-primary-40 text-app-secondary rounded hover:bg-app-primary-20 hover:color-primary transition-colors"
          >
            Select All
          </button>
          <button
            onClick={onSelectAllWithBalance}
            className="px-2 py-1 text-[10px] font-mono bg-app-primary-80 border border-app-primary-40 text-app-secondary rounded hover:bg-app-primary-20 hover:color-primary transition-colors"
          >
            With Balance
          </button>
        </div>

        {/* Wallet List */}
        <div className="overflow-y-auto max-h-[340px]">
          {wallets
            .filter((w) => !w.isArchived)
            .map((wallet) => {
              const solBal = solBalances.get(wallet.address) || 0;
              const tokenBal = tokenBalances.get(wallet.address) || 0;

              return (
                <div
                  key={wallet.id}
                  onClick={() => onToggleWallet(wallet.id)}
                  className={`
                    flex items-center justify-between px-3 py-2 cursor-pointer transition-all duration-200
                    border-b border-app-primary-20 last:border-b-0
                    ${wallet.isActive ? 'bg-primary-20 border-l-2 border-l-primary' : 'hover:bg-app-primary-60'}
                  `}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                        ${wallet.isActive ? 'bg-app-primary-color border-app-primary-color' : 'bg-transparent border-app-primary-40'}`}
                    >
                      {wallet.isActive && <Check size={10} className="text-black" />}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`text-xs font-mono truncate ${wallet.isActive ? 'text-app-primary' : 'text-app-secondary'}`}>
                        {getWalletDisplayName(wallet)}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-app-secondary-60">
                        <Zap size={8} className="text-app-secondary-40" />
                        <span className="text-app-primary-40">{wallet.address.slice(0, 5)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-3 bg-gradient-to-b from-[#9945FF] to-[#14F195] rounded-sm"></div>
                      <span className={`text-xs font-mono ${solBal > 0 ? 'text-app-primary' : 'text-app-secondary-60'}`}>
                        {solBal.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-3 bg-app-primary-color rounded-sm"></div>
                      <span className={`text-xs font-mono ${tokenBal > 0 ? 'color-primary' : 'text-app-secondary-60'}`}>
                        {formatTokenBalance(tokenBal)}
                      </span>
                    </div>
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

// Latest Trade Component
const LatestTrade: React.FC<{ tokenAddress?: string }> = React.memo(({ tokenAddress }) => {
  const [latestTrade, setLatestTrade] = useState<TradeHistoryEntry | null>(null);
  const [isNew, setIsNew] = useState(false);
  const previousTradeIdRef = useRef<string | null>(null);

  const loadLatestTrade = useCallback(() => {
    if (!tokenAddress) {
      setLatestTrade(null);
      return;
    }

    const trades = getLatestTrades(50);
    const tokenTrades = trades.filter((trade) => trade.tokenAddress === tokenAddress);
    const newTrade = tokenTrades.length > 0 ? tokenTrades[0] : null;

    if (newTrade && newTrade.id !== previousTradeIdRef.current) {
      setIsNew(true);
      previousTradeIdRef.current = newTrade.id;
      setTimeout(() => setIsNew(false), 3000);
    }

    setLatestTrade(newTrade);
  }, [tokenAddress]);

  useEffect(() => {
    loadLatestTrade();
    const handleTradeUpdate = (): void => loadLatestTrade();
    window.addEventListener('tradeHistoryUpdated', handleTradeUpdate);
    return () => window.removeEventListener('tradeHistoryUpdated', handleTradeUpdate);
  }, [loadLatestTrade]);

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  if (!tokenAddress || !latestTrade) {
    return (
      <div className="flex items-center justify-center py-2 text-[10px] font-mono text-app-secondary-60">
        No recent trades
      </div>
    );
  }

  const isBuy = latestTrade.type === 'buy';

  return (
    <div
      className={`flex items-center justify-between py-1.5 px-2 rounded border text-xs transition-all duration-300 ${
        isNew ? 'ring-1 ring-app-primary-color' : ''
      } ${
        latestTrade.success
          ? isBuy
            ? 'bg-app-secondary-80 border-app-primary-40'
            : 'bg-app-secondary-80 border-warning-40'
          : 'bg-app-secondary-60 border-app-primary-20 opacity-60'
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isBuy ? (
          <ArrowUpRight size={12} className={latestTrade.success ? 'color-primary' : 'text-app-secondary-60'} />
        ) : (
          <ArrowDownRight size={12} className={latestTrade.success ? 'text-warning' : 'text-app-secondary-60'} />
        )}
        <span className={`font-mono font-semibold ${latestTrade.success ? (isBuy ? 'color-primary' : 'text-warning') : 'text-app-secondary-60'}`}>
          {isBuy ? 'BUY' : 'SELL'}
        </span>
        <span className="text-app-secondary-40">|</span>
        <span className="text-app-secondary font-mono truncate">
          {latestTrade.amountType === 'percentage' ? `${latestTrade.amount}%` : `${latestTrade.amount.toFixed(3)} SOL`}
        </span>
        {latestTrade.walletsCount > 1 && (
          <span className="text-app-secondary-60 font-mono">({latestTrade.walletsCount}w)</span>
        )}
      </div>
      <div className="flex items-center gap-1 text-app-secondary-60 font-mono ml-2 flex-shrink-0">
        <Clock size={10} />
        <span>{formatTimeAgo(latestTrade.timestamp)}</span>
      </div>
    </div>
  );
});
LatestTrade.displayName = 'LatestTrade';

export const MultichartTokenPanel: React.FC<MultichartTokenPanelProps> = ({
  wallets,
  setWallets,
  solBalances,
  tokenBalances,
}) => {
  const { tokens, activeTokenIndex, tokenStats } = useMultichart();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [selectedDex, setSelectedDex] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const walletSelectorRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Presets - persisted to cookies
  const [buyPresets, setBuyPresets] = useState<string[]>(() => {
    try {
      const saved = document.cookie.split('; ').find((row) => row.startsWith('mcBuyPresets='))?.split('=')[1];
      if (saved) return JSON.parse(decodeURIComponent(saved)) as string[];
    } catch { /* ignore */ }
    return ['0.01', '0.05', '0.1', '0.5'];
  });

  const [sellPresets, setSellPresets] = useState<string[]>(() => {
    try {
      const saved = document.cookie.split('; ').find((row) => row.startsWith('mcSellPresets='))?.split('=')[1];
      if (saved) return JSON.parse(decodeURIComponent(saved)) as string[];
    } catch { /* ignore */ }
    return ['25', '50', '75', '100'];
  });

  // Save presets
  useEffect(() => {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `mcBuyPresets=${encodeURIComponent(JSON.stringify(buyPresets))}; expires=${expires.toUTCString()}; path=/`;
    document.cookie = `mcSellPresets=${encodeURIComponent(JSON.stringify(sellPresets))}; expires=${expires.toUTCString()}; path=/`;
  }, [buyPresets, sellPresets]);

  const activeToken = tokens[activeTokenIndex];
  const activeStats = activeToken ? tokenStats.get(activeToken.address) : undefined;

  const handleToggleWallet = useCallback((walletId: number): void => {
    const updatedWallets = toggleWallet(wallets, walletId);
    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
  }, [wallets, setWallets]);

  const handleSelectAll = useCallback((): void => {
    const allActive = wallets.filter((w) => !w.isArchived).every((w) => w.isActive);
    const updatedWallets = wallets.map((wallet) => ({
      ...wallet,
      isActive: wallet.isArchived ? wallet.isActive : !allActive,
    }));
    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
  }, [wallets, setWallets]);

  const handleSelectAllWithBalance = useCallback((): void => {
    const walletsWithBalance = wallets.filter((wallet) => {
      if (wallet.isArchived) return false;
      const solBal = solBalances.get(wallet.address) || 0;
      const tokenBal = tokenBalances.get(wallet.address) || 0;
      return solBal > 0 || tokenBal > 0;
    });

    if (walletsWithBalance.length === 0) {
      showToast('No wallets with balance found', 'error');
      return;
    }

    const allWithBalanceActive = walletsWithBalance.every((w) => w.isActive);
    const updatedWallets = wallets.map((wallet) => {
      if (wallet.isArchived) return wallet;
      const solBal = solBalances.get(wallet.address) || 0;
      const tokenBal = tokenBalances.get(wallet.address) || 0;
      const hasBalance = solBal > 0 || tokenBal > 0;
      return { ...wallet, isActive: allWithBalanceActive ? false : (hasBalance || wallet.isActive) };
    });

    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
  }, [wallets, solBalances, tokenBalances, setWallets, showToast]);

  const handleTrade = useCallback(async (isBuyMode: boolean, presetValue?: string) => {
    if (!activeToken) return;

    const amount = presetValue || (isBuyMode ? buyAmount : sellAmount);
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (presetValue) {
      setLoadingPreset(`${isBuyMode ? 'buy' : 'sell'}-${presetValue}`);
    } else {
      setIsLoading(true);
    }

    try {
      const config = {
        tokenAddress: activeToken.address,
        ...(isBuyMode ? { solAmount: parseFloat(amount) } : { sellPercent: parseFloat(amount) }),
      };

      const result = await executeTrade(selectedDex, wallets, config, isBuyMode, solBalances);

      if (result.success) {
        showToast(`${isBuyMode ? 'Buy' : 'Sell'} submitted`, 'success');
        if (!presetValue) {
          if (isBuyMode) setBuyAmount('');
          else setSellAmount('');
        }
      } else {
        showToast(`Failed: ${result.error}`, 'error');
      }
    } catch (error) {
      showToast(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    } finally {
      setIsLoading(false);
      setLoadingPreset(null);
    }
  }, [activeToken, buyAmount, sellAmount, selectedDex, wallets, solBalances, showToast]);

  // Collapsed state
  if (isCollapsed) {
    return (
      <div className="w-10 border-r border-app-primary-40 bg-app-primary backdrop-blur-sm flex items-center justify-center">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 hover:bg-app-quaternary rounded transition-all duration-300"
        >
          <ChevronRight className="w-4 h-4 text-app-primary" />
        </button>
      </div>
    );
  }

  if (!activeToken) {
    return (
      <div className="w-[400px] border-r border-app-primary-40 bg-app-primary backdrop-blur-sm flex items-center justify-center">
        <div className="text-center text-app-secondary-60">
          <Activity size={32} className="mx-auto mb-2 opacity-40" />
          <div className="text-sm font-mono">No token selected</div>
        </div>
      </div>
    );
  }

  const pnl = activeStats?.pnl;
  const netPnl = pnl?.net ?? 0;
  const totalTokens = Array.from(tokenBalances.values()).reduce((sum, bal) => sum + bal, 0);
  const holdingsValue = totalTokens * (activeStats?.price || 0);
  const totalPnl = netPnl + holdingsValue;
  const activeWalletCount = countActiveWallets(wallets);

  const formatPrice = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    if (num < 0.000001) return `$${num.toExponential(2)}`;
    if (num < 0.01) return `$${num.toFixed(6)}`;
    return `$${num.toFixed(4)}`;
  };

  const formatMcap = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <div className="w-[400px] border-r border-app-primary-40 bg-app-primary backdrop-blur-sm flex flex-col overflow-hidden">
      {/* Token Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-app-primary-20">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {activeToken.imageUrl && (
            <img
              src={activeToken.imageUrl}
              alt={activeToken.symbol || 'Token'}
              className="w-8 h-8 rounded-full flex-shrink-0 border border-app-primary-40"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-mono font-bold text-app-primary truncate">
              {activeToken.symbol || 'Unknown'}
            </div>
            <div className="text-[10px] font-mono text-app-secondary-60 truncate">
              {activeToken.address.slice(0, 6)}...{activeToken.address.slice(-4)}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 hover:bg-app-quaternary rounded transition-all duration-300"
        >
          <ChevronLeft className="w-4 h-4 text-app-secondary" />
        </button>
      </div>

      {/* DataBox - Premium Stats Card */}
      <div className="mx-3 mt-3">
        <div className="bg-gradient-to-br from-app-secondary-80 to-app-primary-dark-50 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-app-primary-20 relative overflow-hidden">
          {/* Accent lines */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-app-primary-40 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-app-primary-40 to-transparent"></div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wide mb-1">Bought</div>
              <div className="text-sm font-bold font-mono color-primary">{(pnl?.bought ?? 0).toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wide mb-1">Sold</div>
              <div className="text-sm font-bold font-mono text-warning">{(pnl?.sold ?? 0).toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wide mb-1">Holding</div>
              <div className="text-sm font-bold font-mono text-app-secondary">{holdingsValue.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wide mb-1">PnL</div>
              <div className={`text-sm font-bold font-mono flex items-center justify-center gap-1 ${totalPnl >= 0 ? 'color-primary' : 'text-warning'}`}>
                {totalPnl >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Price/MCap Row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-app-primary-20">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-[9px] font-mono text-app-secondary-60 uppercase">Price</div>
                <div className="text-xs font-mono font-medium text-app-primary">{formatPrice(activeStats?.price)}</div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-app-secondary-60 uppercase">MCap</div>
                <div className="text-xs font-mono font-medium text-app-primary">{formatMcap(activeStats?.marketCap)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-app-secondary-60">
              <div className="w-1.5 h-1.5 rounded-full bg-app-primary-color animate-pulse"></div>
              {pnl?.trades ?? 0} trades
            </div>
          </div>

          {/* Subtle glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent pointer-events-none"></div>
        </div>
      </div>

      {/* Latest Trade */}
      <div className="px-3 py-2">
        <LatestTrade tokenAddress={activeToken.address} />
      </div>

      {/* Trading Form */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {/* DEX Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-app-secondary-60 uppercase w-8">DEX</span>
          <div className="flex-1 grid grid-cols-3 gap-1">
            {['auto', 'raydium', 'pump'].map((dex) => (
              <button
                key={dex}
                onClick={() => setSelectedDex(dex)}
                className={`px-2 py-1.5 rounded font-mono text-[10px] uppercase transition-all duration-200 border
                  ${selectedDex === dex
                    ? 'bg-app-primary-color border-app-primary-color text-black font-semibold'
                    : 'bg-app-quaternary border-app-primary-40 text-app-secondary hover:border-app-primary-60'
                  }`}
              >
                {dex}
              </button>
            ))}
          </div>
        </div>

        {/* Buy Section */}
        <div className="bg-app-secondary-80 rounded-lg border border-app-primary-30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wide">Buy (SOL)</span>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-1 rounded transition-colors ${isEditMode ? 'bg-app-primary-color text-black' : 'text-app-secondary-60 hover:text-app-primary'}`}
              title="Edit presets"
            >
              <Edit3 size={12} />
            </button>
          </div>
          <input
            type="number"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-3 py-2 bg-app-primary border border-app-primary-40 rounded-lg text-app-primary font-mono text-sm focus:outline-none focus:border-app-primary-60 transition-colors"
            step="0.01"
            min="0"
          />
          <div className="grid grid-cols-4 gap-1.5">
            {buyPresets.map((amount, i) => (
              <PresetButton
                key={`buy-${i}`}
                value={amount}
                onExecute={() => handleTrade(true, amount)}
                onChange={(v) => { const p = [...buyPresets]; p[i] = v; setBuyPresets(p); }}
                isLoading={loadingPreset === `buy-${amount}`}
                variant="buy"
                isEditMode={isEditMode}
              />
            ))}
          </div>
          <button
            onClick={() => handleTrade(true)}
            disabled={isLoading || !buyAmount || parseFloat(buyAmount) <= 0}
            className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-app-quaternary disabled:text-app-secondary-60 text-white font-mono font-semibold text-sm rounded-lg transition-all duration-200"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'BUY'}
          </button>
        </div>

        {/* Sell Section */}
        <div className="bg-app-secondary-80 rounded-lg border border-app-primary-30 p-3 space-y-2">
          <span className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wide">Sell %</span>
          <input
            type="number"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 bg-app-primary border border-app-primary-40 rounded-lg text-app-primary font-mono text-sm focus:outline-none focus:border-app-primary-60 transition-colors"
            step="1"
            min="0"
            max="100"
          />
          <div className="grid grid-cols-4 gap-1.5">
            {sellPresets.map((percent, i) => (
              <PresetButton
                key={`sell-${i}`}
                value={`${percent}%`}
                onExecute={() => handleTrade(false, percent)}
                onChange={(v) => { const p = [...sellPresets]; p[i] = v.replace('%', ''); setSellPresets(p); }}
                isLoading={loadingPreset === `sell-${percent}`}
                variant="sell"
                isEditMode={isEditMode}
              />
            ))}
          </div>
          <button
            onClick={() => handleTrade(false)}
            disabled={isLoading || !sellAmount || parseFloat(sellAmount) <= 0}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-app-quaternary disabled:text-app-secondary-60 text-white font-mono font-semibold text-sm rounded-lg transition-all duration-200"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'SELL'}
          </button>
        </div>

        {/* Wallets Section */}
        <div ref={walletSelectorRef} className="bg-app-secondary-80 rounded-lg border border-app-primary-30 p-3">
          <button
            onClick={() => setShowWalletSelector(!showWalletSelector)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Zap size={14} className="color-primary" />
              <span className="text-xs font-mono text-app-secondary uppercase tracking-wide">Active Wallets</span>
            </div>
            <div className="flex items-center gap-1 bg-app-primary px-2 py-0.5 rounded">
              <span className="text-sm font-mono font-bold color-primary">{activeWalletCount}</span>
              <span className="text-[10px] font-mono text-app-secondary-60">/ {wallets.filter((w) => !w.isArchived).length}</span>
            </div>
          </button>

          {/* Wallet chips preview */}
          {activeWalletCount > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {wallets
                .filter((w) => !w.isArchived && w.isActive)
                .slice(0, 6)
                .map((wallet) => (
                  <div key={wallet.id} className="px-2 py-0.5 bg-primary-20 border border-app-primary-40 rounded text-[10px] font-mono color-primary">
                    {getWalletDisplayName(wallet).slice(0, 10)}
                  </div>
                ))}
              {activeWalletCount > 6 && (
                <div className="px-2 py-0.5 bg-app-quaternary border border-app-primary-40 rounded text-[10px] font-mono text-app-secondary-60">
                  +{activeWalletCount - 6} more
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Wallet Selector Popup */}
      {showWalletSelector && (
        <WalletSelectorPopup
          wallets={wallets}
          solBalances={solBalances}
          tokenBalances={tokenBalances}
          walletSelectorRef={walletSelectorRef}
          onClose={() => setShowWalletSelector(false)}
          onToggleWallet={handleToggleWallet}
          onSelectAll={handleSelectAll}
          onSelectAllWithBalance={handleSelectAllWithBalance}
        />
      )}
    </div>
  );
};
