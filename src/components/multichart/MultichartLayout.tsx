import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  LayoutGrid,
  RefreshCw,
  Wallet,
  Columns2,
  ChevronDown,
  Bot,
  Blocks,
  Settings,
} from "lucide-react";
import { useMultichart } from "../../contexts/useMultichart";
import { AddTokenModal } from "./AddTokenModal";
import { MultichartTokenList } from "./MultichartTokenList";
import { MultichartFrameContainer } from "./MultichartFrameContainer";
import { brand } from "../../utils/brandConfig";
import logo from "../../logo.png";
import type { WalletType } from "../../utils/types";
import type { ViewMode } from "../../utils/storage";
import type { BaseCurrencyConfig } from "../../utils/constants";

interface MultichartLayoutProps {
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  isLoadingChart: boolean;
  transactionFee: string;
  handleRefresh: () => void;
  isRefreshing?: boolean;
  baseCurrencyBalances: Map<string, number>;
  baseCurrency: BaseCurrencyConfig;
  tokenBalances: Map<string, number>;
  currentMarketCap: number | null;
  setCalculatePNLModalOpen: (open: boolean) => void;
  isAutomateCardOpen: boolean;
  automateCardPosition: { x: number; y: number };
  setAutomateCardPosition: (position: { x: number; y: number }) => void;
  isAutomateCardDragging: boolean;
  setAutomateCardDragging: (dragging: boolean) => void;
  iframeData: unknown;
  onTokenSelect?: (tokenAddress: string) => void;
  onNonWhitelistedTrade?: (trade: {
    type: "buy" | "sell";
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
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  connection: unknown;
}

// ViewModeDropdown Component
const ViewModeDropdown: React.FC<{
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}> = ({ viewMode, onViewModeChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const modes: { value: ViewMode; label: string }[] = [
    { value: "simple", label: "SIMPLE" },
    { value: "advanced", label: "ADVANCED" },
    { value: "multichart", label: "MULTI" },
  ];

  const handleSelect = (mode: ViewMode): void => {
    onViewModeChange(mode);
    setIsOpen(false);
  };

  const currentLabel =
    viewMode === "simple"
      ? "SIMPLE"
      : viewMode === "advanced"
        ? "ADVANCED"
        : "MULTI";

  return (
    <div className="relative z-40">
      {/* Main Button */}
      <button
        onClick={(): void => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
      >
        <Columns2
          size={16}
          className={`color-primary transition-opacity ${viewMode === "simple" ? "opacity-50" : "opacity-100"}`}
        />
        <span className="text-xs font-mono color-primary font-medium tracking-wider">
          {currentLabel}
        </span>
        <ChevronDown
          size={12}
          className={`text-app-primary-40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={(): void => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="absolute top-full right-0 mt-1 w-36 z-50">
            <div className="bg-app-secondary border border-app-primary-20 rounded overflow-hidden shadow-xl">
              {modes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => handleSelect(mode.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all duration-200 hover:bg-primary-05 ${
                    viewMode === mode.value
                      ? "bg-primary-10 color-primary"
                      : "text-app-tertiary"
                  }`}
                >
                  <Columns2
                    size={14}
                    className={
                      viewMode === mode.value
                        ? "color-primary"
                        : "text-app-secondary-60"
                    }
                  />
                  <span className="text-xs font-mono font-medium">
                    {mode.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const MultichartLayout: React.FC<MultichartLayoutProps> = ({
  wallets,
  setWallets,
  isLoadingChart,
  handleRefresh,
  isRefreshing,
  baseCurrencyBalances,
  tokenBalances,
  onTokenSelect,
  onNonWhitelistedTrade,
  quickBuyEnabled,
  quickBuyAmount,
  quickBuyMinAmount,
  quickBuyMaxAmount,
  useQuickBuyRange,
  viewMode,
  onViewModeChange,
  connection,
}) => {
  const navigate = useNavigate();
  const { tokens, maxTokens } = useMultichart();
  const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false);

  return (
    <div className="flex flex-col h-full w-full bg-app-primary">
      {/* Unified Top Header */}
      <nav className="flex-shrink-0 border-b border-app-primary-70 px-2 md:px-4 py-2 backdrop-blur-sm bg-app-primary-99 z-30">
        <div className="flex items-center justify-between gap-2">
          {/* Left side - Logo, Refresh and Wallets buttons */}
          <div className="flex items-center gap-2">
            {/* Logo button that redirects to home */}
            <button
              onClick={() => navigate("/")}
              className="hover:scale-105 active:scale-95 transition-transform"
            >
              <img
                src={logo}
                alt={brand.altText}
                className="h-8 filter drop-shadow-[0_0_8px_var(--color-primary-70)]"
              />
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || !connection}
              className="flex items-center justify-center gap-2 px-2 md:px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh wallet balances"
            >
              <RefreshCw
                size={14}
                className={`sm:w-4 sm:h-4 color-primary ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="text-xs font-mono color-primary font-medium tracking-wider">
                REFRESH
              </span>
            </button>

            {/* Wallets Page Button */}
            <button
              onClick={(): void => navigate("/wallets")}
              className="flex items-center justify-center gap-2 px-2 md:px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
              title="Open wallets page"
            >
              <Wallet size={14} className="sm:w-4 sm:h-4 color-primary" />
              <span className="text-xs font-mono color-primary font-medium tracking-wider">
                WALLETS
              </span>
            </button>
          </div>

          {/* Right side - View Mode Toggle and Menu */}
          <div className="flex items-center gap-2">
            {/* View Mode Dropdown */}
            <ViewModeDropdown
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />

            {/* Individual Menu Buttons */}
            <button
              onClick={() => navigate("/wallets")}
              className="flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
              title="Wallets"
            >
              <Wallet size={14} className="color-primary" />
              <span className="text-xs font-mono color-primary font-medium tracking-wider">
                WALLETS
              </span>
            </button>

            <button
              onClick={() => navigate("/automate")}
              className="flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
              title="Automate"
            >
              <Bot size={14} className="color-primary" />
              <span className="text-xs font-mono color-primary font-medium tracking-wider">
                AUTOMATE
              </span>
            </button>

            <button
              onClick={() => navigate("/deploy")}
              className="flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
              title="Deploy"
            >
              <Blocks size={14} className="color-primary" />
              <span className="text-xs font-mono color-primary font-medium tracking-wider">
                DEPLOY
              </span>
            </button>

            <button
              onClick={() => navigate("/settings")}
              className="flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
              title="Settings"
            >
              <Settings size={14} className="color-primary" />
              <span className="text-xs font-mono color-primary font-medium tracking-wider">
                SETTINGS
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Token List */}
        <div className="w-[520px] flex flex-col border-r border-app-primary-40 bg-app-primary-99">
          {/* Token List Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-app-primary-40 bg-app-primary-60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <LayoutGrid size={16} className="text-app-secondary-60" />
              <span className="text-xs font-mono">
                <span className="color-primary font-semibold">
                  {tokens.length}
                </span>
                <span className="text-app-secondary-60">
                  {" "}
                  / {maxTokens} tokens
                </span>
              </span>
            </div>

            <button
              onClick={() => setIsAddTokenModalOpen(true)}
              disabled={tokens.length >= maxTokens}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border transition-all
                bg-app-primary-color border-app-primary-color text-black font-semibold
                hover:bg-app-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              Add Token
            </button>
          </div>

          {/* Token List Content */}
          <div className="flex-1 overflow-hidden">
            <MultichartTokenList
              wallets={wallets}
              setWallets={setWallets}
              baseCurrencyBalances={baseCurrencyBalances}
              tokenBalances={tokenBalances}
              onAddToken={() => setIsAddTokenModalOpen(true)}
            />
          </div>
        </div>

        {/* Right Column - Chart */}
        <div className="flex-1 flex flex-col bg-app-primary-99">
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
      </div>

      {/* Add Token Modal */}
      {isAddTokenModalOpen && (
        <AddTokenModal onClose={() => setIsAddTokenModalOpen(false)} />
      )}
    </div>
  );
};
