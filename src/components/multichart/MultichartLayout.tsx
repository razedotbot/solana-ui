import React, { useState } from 'react';
import { MultichartTabBar } from './MultichartTabBar';
import { MultichartFrameContainer } from './MultichartFrameContainer';
import { MultichartTokenPanel } from './MultichartTokenPanel';
import { AddTokenModal } from './AddTokenModal';
import type { WalletType, IframeData } from '../../utils/types';

interface MultichartLayoutProps {
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  isLoadingChart: boolean;
  transactionFee: string;
  handleRefresh: () => void;
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  currentMarketCap: number | null;
  setCalculatePNLModalOpen: (open: boolean) => void;
  isAutomateCardOpen: boolean;
  automateCardPosition: { x: number; y: number };
  setAutomateCardPosition: (position: { x: number; y: number }) => void;
  isAutomateCardDragging: boolean;
  setAutomateCardDragging: (dragging: boolean) => void;
  iframeData: IframeData | null;
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

export const MultichartLayout: React.FC<MultichartLayoutProps> = ({
  wallets,
  setWallets,
  isLoadingChart,
  solBalances,
  tokenBalances,
  onTokenSelect,
  onNonWhitelistedTrade,
  quickBuyEnabled,
  quickBuyAmount,
  quickBuyMinAmount,
  quickBuyMaxAmount,
  useQuickBuyRange,
}) => {
  const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false);

  return (
    <div className="flex flex-col h-full w-full bg">
      {/* Tab Bar at Top */}
      <MultichartTabBar onAddToken={() => setIsAddTokenModalOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Token Details & Trading */}
        <MultichartTokenPanel
          wallets={wallets}
          setWallets={setWallets}
          solBalances={solBalances}
          tokenBalances={tokenBalances}
        />

        {/* Center - Chart Area (Full Width) */}
        <MultichartFrameContainer
          wallets={wallets}
          isLoadingChart={isLoadingChart}
          onTokenSelect={onTokenSelect}
          onNonWhitelistedTrade={onNonWhitelistedTrade}
          quickBuyEnabled={quickBuyEnabled}
          quickBuyAmount={quickBuyAmount}
          quickBuyMinAmount={quickBuyMinAmount}
          quickBuyMaxAmount={quickBuyMaxAmount}
          useQuickBuyRange={useQuickBuyRange}
        />
      </div>

      {/* Add Token Modal */}
      {isAddTokenModalOpen && (
        <AddTokenModal onClose={() => setIsAddTokenModalOpen(false)} />
      )}
    </div>
  );
};
