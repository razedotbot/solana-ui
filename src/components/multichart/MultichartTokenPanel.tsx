import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { useMultichart } from '../../contexts/MultichartContext';
import type { WalletType } from '../../utils/types';
import { toggleWallet, getWalletDisplayName, countActiveWallets } from '../../utils/wallet';
import { saveWalletsToCookies } from '../../utils/storage';
import { formatTokenBalance } from '../../utils/formatting';
import { executeTrade } from '../../utils/trading';
import { useToast } from '../../utils/hooks';

interface MultichartTokenPanelProps {
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
}

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
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const { showToast } = useToast();

  const activeToken = tokens[activeTokenIndex];
  const activeStats = activeToken ? tokenStats.get(activeToken.address) : undefined;

  const handleToggleWallet = useCallback(
    (walletId: number): void => {
      const updatedWallets = toggleWallet(wallets, walletId);
      setWallets(updatedWallets);
      saveWalletsToCookies(updatedWallets);
    },
    [wallets, setWallets]
  );

  const handleSelectAll = useCallback((): void => {
    const allActive = wallets.filter((w) => !w.isArchived).every((w) => w.isActive);
    const updatedWallets = wallets.map((wallet) => ({
      ...wallet,
      isActive: wallet.isArchived ? wallet.isActive : !allActive,
    }));
    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
  }, [wallets, setWallets]);

  const handleTrade = useCallback(
    async (isBuyMode: boolean) => {
      if (!activeToken) return;

      setIsLoading(true);
      try {
        const config = {
          tokenAddress: activeToken.address,
          ...(isBuyMode
            ? { solAmount: parseFloat(buyAmount || '0') }
            : { sellPercent: parseFloat(sellAmount || '0') }),
        };

        const result = await executeTrade(
          selectedDex,
          wallets,
          config,
          isBuyMode,
          solBalances
        );

        if (result.success) {
          showToast(
            `${isBuyMode ? 'Buy' : 'Sell'} transactions submitted successfully`,
            'success'
          );
          if (isBuyMode) setBuyAmount('');
          else setSellAmount('');
        } else {
          showToast(`${isBuyMode ? 'Buy' : 'Sell'} failed: ${result.error}`, 'error');
        }
      } catch (error) {
        showToast(
          `${isBuyMode ? 'Buy' : 'Sell'} error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'error'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeToken, buyAmount, sellAmount, selectedDex, wallets, solBalances, showToast]
  );

  if (!activeToken) {
    return null;
  }

  const formatNumber = (num: number | null | undefined, decimals: number = 2): string => {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  const formatPnl = (pnl: number | null | undefined): { value: string; isPositive: boolean } => {
    if (pnl === null || pnl === undefined) return { value: '-', isPositive: false };
    const isPositive = pnl >= 0;
    return {
      value: `${isPositive ? '+' : ''}${formatNumber(pnl)}`,
      isPositive,
    };
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-app-primary-40 bg-app-primary backdrop-blur-sm flex items-center justify-center">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-app-quaternary rounded transition-all duration-300"
          aria-label="Expand panel"
        >
          <ChevronRight className="w-4 h-4 text-app-primary" />
        </button>
      </div>
    );
  }

  const pnlFormatted = formatPnl(activeStats?.pnl?.net);
  const activeWalletCount = countActiveWallets(wallets);

  return (
    <div className="w-[420px] border-r border-app-primary-40 bg-app-primary backdrop-blur-sm flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-app-primary-20 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {activeToken.imageUrl && (
            <img
              src={activeToken.imageUrl}
              alt={activeToken.symbol || 'Token'}
              className="w-6 h-6 rounded-full flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-mono font-medium text-app-primary truncate">
              {activeToken.symbol || 'Unknown'}
            </div>
            <div className="text-[10px] font-mono text-app-secondary-60 truncate">
              {activeToken.address.slice(0, 4)}...{activeToken.address.slice(-4)}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-app-quaternary rounded transition-all duration-300 flex-shrink-0"
          aria-label="Collapse panel"
        >
          <ChevronLeft className="w-4 h-4 text-app-primary" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="p-3 border-b border-app-primary-20 space-y-2 flex-shrink-0">
        <div className="bg-app-primary-60-alpha p-3 rounded-lg border border-app-primary-40">
          <div className="text-[10px] font-mono text-app-secondary-60 mb-1 uppercase tracking-wide">Price</div>
          <div className="text-lg font-mono font-medium text-app-primary">
            {formatNumber(activeStats?.price, 6)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-app-primary-60-alpha p-2.5 rounded-lg border border-app-primary-40">
            <div className="text-[10px] font-mono text-app-secondary-60 mb-1 uppercase tracking-wide">MCap</div>
            <div className="text-xs font-mono text-app-primary">
              {formatNumber(activeStats?.marketCap)}
            </div>
          </div>

          <div className="bg-app-primary-60-alpha p-2.5 rounded-lg border border-app-primary-40">
            <div className="text-[10px] font-mono text-app-secondary-60 mb-1 uppercase tracking-wide">PnL</div>
            <div className="flex items-center gap-1">
              {pnlFormatted.isPositive ? (
                <TrendingUp size={12} className="text-green-500" />
              ) : (
                <TrendingDown size={12} className="text-red-500" />
              )}
              <span
                className={`text-xs font-mono font-medium ${
                  pnlFormatted.isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {pnlFormatted.value}
              </span>
            </div>
            {activeStats?.pnl && (
              <div className="text-[9px] font-mono text-app-secondary-60 mt-0.5">
                {activeStats.pnl.trades} trade{activeStats.pnl.trades !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trading Section */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        {/* DEX Selector */}
        <div>
          <div className="text-[10px] font-mono text-app-secondary-60 mb-2 uppercase tracking-wide">DEX</div>
          <div className="grid grid-cols-3 gap-1.5">
            {['auto', 'raydium', 'pump'].map((dex) => (
              <button
                key={dex}
                onClick={() => setSelectedDex(dex)}
                className={`
                  px-2 py-1.5 rounded font-mono text-xs uppercase transition-all duration-300 border
                  ${
                    selectedDex === dex
                      ? 'bg-app-primary-color border-app-primary-color text-black font-medium'
                      : 'bg-app-quaternary border-app-primary-40 hover:border-app-primary-60 text-app-primary hover:bg-app-tertiary'
                  }
                `}
              >
                {dex}
              </button>
            ))}
          </div>
        </div>

        {/* Buy Section */}
        <div className="bg-app-primary-60-alpha p-3 rounded-lg border border-app-primary-40 space-y-2">
          <div className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wide">BUY (SOL)</div>
          <input
            type="number"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-3 py-2 bg-app-primary-80-alpha border border-app-primary-40 rounded-lg text-app-primary font-mono text-sm focus:outline-none focus:border-app-primary-60 transition-colors"
            step="0.01"
            min="0"
          />
          <div className="grid grid-cols-4 gap-1.5">
            {['0.01', '0.05', '0.1', '0.5'].map((amount) => (
              <button
                key={amount}
                onClick={() => setBuyAmount(amount)}
                className="px-2 py-1 bg-app-quaternary border border-app-primary-40 hover:border-app-primary-60 hover:bg-app-tertiary rounded text-[10px] font-mono text-app-primary transition-all duration-300"
              >
                {amount}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleTrade(true)}
            disabled={isLoading || !buyAmount || parseFloat(buyAmount) <= 0}
            className="w-full px-3 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-app-quaternary disabled:text-app-secondary-60 text-white font-mono font-medium text-sm rounded-lg transition-all duration-300"
          >
            {isLoading ? 'BUYING...' : 'BUY'}
          </button>
        </div>

        {/* Sell Section */}
        <div className="bg-app-primary-60-alpha p-3 rounded-lg border border-app-primary-40 space-y-2">
          <div className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wide">SELL %</div>
          <input
            type="number"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 bg-app-primary-80-alpha border border-app-primary-40 rounded-lg text-app-primary font-mono text-sm focus:outline-none focus:border-app-primary-60 transition-colors"
            step="1"
            min="0"
            max="100"
          />
          <div className="grid grid-cols-4 gap-1.5">
            {['25', '50', '75', '100'].map((percent) => (
              <button
                key={percent}
                onClick={() => setSellAmount(percent)}
                className="px-2 py-1 bg-app-quaternary border border-app-primary-40 hover:border-app-primary-60 hover:bg-app-tertiary rounded text-[10px] font-mono text-app-primary transition-all duration-300"
              >
                {percent}%
              </button>
            ))}
          </div>
          <button
            onClick={() => handleTrade(false)}
            disabled={isLoading || !sellAmount || parseFloat(sellAmount) <= 0}
            className="w-full px-3 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-app-quaternary disabled:text-app-secondary-60 text-white font-mono font-medium text-sm rounded-lg transition-all duration-300"
          >
            {isLoading ? 'SELLING...' : 'SELL'}
          </button>
        </div>

        {/* Active Wallets */}
        <div className="bg-app-primary-60-alpha p-3 rounded-lg border border-app-primary-40">
          <button
            onClick={() => setShowWalletSelector(!showWalletSelector)}
            className="w-full flex items-center justify-between mb-2"
          >
            <div className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wide">
              Active Wallets
            </div>
            <div className="text-xs font-mono text-app-primary-color font-medium">
              {activeWalletCount} / {wallets.filter((w) => !w.isArchived).length}
            </div>
          </button>

          {showWalletSelector && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <div className="flex gap-1.5 pb-2 border-b border-app-primary-20">
                <button
                  onClick={handleSelectAll}
                  className="flex-1 px-2 py-1 text-[10px] font-mono bg-app-quaternary border border-app-primary-40 hover:border-app-primary-60 hover:bg-app-tertiary rounded text-app-primary transition-all duration-300"
                >
                  ALL
                </button>
              </div>
              {wallets
                .filter((w) => !w.isArchived)
                .map((wallet) => {
                  const solBal = solBalances.get(wallet.address) || 0;
                  const tokenBal = tokenBalances.get(wallet.address) || 0;
                  return (
                    <button
                      key={wallet.id}
                      onClick={() => handleToggleWallet(wallet.id)}
                      className="w-full flex items-center gap-2 p-1.5 hover:bg-app-quaternary rounded transition-all duration-300"
                    >
                      <div
                        className={`w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                          wallet.isActive
                            ? 'bg-app-primary-color border-app-primary-color'
                            : 'bg-transparent border-app-primary-40'
                        }`}
                      >
                        {wallet.isActive && <Check size={10} className="text-black" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[10px] font-mono truncate ${
                            wallet.isActive ? 'text-app-primary' : 'text-app-secondary'
                          }`}
                        >
                          {getWalletDisplayName(wallet)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[9px] font-mono text-app-secondary-60">
                          {solBal.toFixed(2)}
                        </span>
                        <span className="text-[9px] font-mono text-app-secondary-60">
                          {formatTokenBalance(tokenBal)}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
