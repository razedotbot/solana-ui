import React, { useCallback } from 'react';
import { useMultichart } from '../../contexts/MultichartContext';
import Frame from '../../Frame';
import type { WalletType } from '../../utils/types';
import type { MultichartTokenStats } from '../../utils/types/multichart';

interface MultichartFrameContainerProps {
  wallets: WalletType[];
  isLoadingChart: boolean;
  onTokenSelect?: (tokenAddress: string) => void;
  onNonWhitelistedTrade?: (trade: {
    type: 'buy' | 'sell';
    address: string;
    tokensAmount: number;
    avgPrice: number;
    solAmount: number;
    timestamp: number;
    signature: string;
    tokenMint: string;
    marketCap: number;
  }) => void;
  quickBuyEnabled?: boolean;
  quickBuyAmount?: number;
  quickBuyMinAmount?: number;
  quickBuyMaxAmount?: number;
  useQuickBuyRange?: boolean;
}

export const MultichartFrameContainer: React.FC<MultichartFrameContainerProps> = ({
  wallets,
  isLoadingChart,
  onTokenSelect,
  onNonWhitelistedTrade,
  quickBuyEnabled,
  quickBuyAmount,
  quickBuyMinAmount,
  quickBuyMaxAmount,
  useQuickBuyRange,
}) => {
  const { tokens, activeTokenIndex, updateTokenStats } = useMultichart();

  const handleDataUpdate = useCallback(
    (
      tokenAddress: string,
      data: {
        tradingStats: {
          bought: number;
          sold: number;
          net: number;
          trades: number;
          timestamp: number;
        } | null;
        solPrice: number | null;
        currentWallets: { address: string; label?: string }[];
        recentTrades: {
          type: 'buy' | 'sell';
          address: string;
          tokensAmount: number;
          avgPrice: number;
          solAmount: number;
          timestamp: number;
          signature: string;
        }[];
        tokenPrice: {
          tokenPrice: number;
          tokenMint: string;
          timestamp: number;
          tradeType: 'buy' | 'sell';
          volume: number;
        } | null;
        marketCap: number | null;
      }
    ) => {
      // Update token stats in context
      const stats: MultichartTokenStats = {
        address: tokenAddress,
        price: data.tokenPrice?.tokenPrice || null,
        marketCap: data.marketCap,
        pnl: data.tradingStats,
      };
      updateTokenStats(tokenAddress, stats);
    },
    [updateTokenStats]
  );

  if (tokens.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-app-primary">
        <div className="text-center color-secondary">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-lg mb-2">No tokens added</div>
          <div className="text-sm">Click the + button above to add your first token</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {tokens.map((token, index) => (
        <div
          key={token.address}
          style={{
            position: 'absolute',
            inset: 0,
            visibility: index === activeTokenIndex ? 'visible' : 'hidden',
          }}
        >
          <Frame
            tokenAddress={token.address}
            wallets={wallets}
            isLoadingChart={isLoadingChart}
            onDataUpdate={(data) => handleDataUpdate(token.address, data)}
            onTokenSelect={onTokenSelect}
            onNonWhitelistedTrade={onNonWhitelistedTrade}
            quickBuyEnabled={quickBuyEnabled}
            quickBuyAmount={quickBuyAmount}
            quickBuyMinAmount={quickBuyMinAmount}
            quickBuyMaxAmount={quickBuyMaxAmount}
            useQuickBuyRange={useQuickBuyRange}
          />
        </div>
      ))}
    </div>
  );
};
