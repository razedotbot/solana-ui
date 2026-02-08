import React, { useState, useEffect, useRef } from "react";
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
  Clock,
} from "lucide-react";
import { useMultichart } from "../../contexts/useMultichart";
import { MultichartFrameContainer } from "./MultichartFrameContainer";
import { MONITOR_SLOT } from "./constants";
import { getRecentTokens } from "../../utils/recentTokens";
import { brand } from "../../utils/brandConfig";
import logo from "../../logo.png";
import type { WalletType } from "../../utils/types";
import type { ViewMode } from "../../utils/storage";
import type { RecentToken } from "../../utils/types";
import { useTokenMetadata, prefetchTokenMetadata } from "../../utils/hooks";

interface MultichartLayoutProps {
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  isLoadingChart: boolean;
  handleRefresh: () => void;
  isRefreshing?: boolean;
  baseCurrencyBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  currentMarketCap: number | null;
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

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(): void => setIsOpen(false)}
          />
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

// Recent Token Chip
const RecentTokenChip: React.FC<{
  token: RecentToken;
  onClick: () => void;
  isInList: boolean;
}> = ({ token, onClick, isInList }) => {
  const { metadata } = useTokenMetadata(token.address);
  const shortAddress = `${token.address.slice(0, 4)}...${token.address.slice(-3)}`;
  const displayLabel = metadata?.symbol || shortAddress;

  return (
    <button
      onClick={onClick}
      disabled={isInList}
      className={`
        flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono
        border transition-all duration-200
        ${isInList
          ? "bg-app-primary-color/20 border-app-primary-color/40 text-app-primary cursor-default opacity-60"
          : "bg-app-primary-80 border-app-primary-40 text-app-secondary-60 hover:border-app-primary-color hover:text-app-primary"
        }
      `}
      title={metadata?.name ? `${metadata.name} (${token.address})` : token.address}
    >
      {metadata?.image && (
        <img
          src={metadata.image}
          alt={metadata.symbol}
          className="w-3 h-3 rounded-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      {displayLabel}
    </button>
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
  currentMarketCap,
  onNonWhitelistedTrade,
  viewMode,
  onViewModeChange,
  connection,
}) => {
  const navigate = useNavigate();
  const { tokens, maxTokens, addToken } = useMultichart();
  const [recentTokens, setRecentTokens] = useState<RecentToken[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent tokens
  useEffect(() => {
    const recent = getRecentTokens();
    setRecentTokens(recent);
    prefetchTokenMetadata(recent.map((t) => t.address));
  }, [tokens]); // Refresh when tokens change

  // Calculate how many tokens can fit
  useEffect(() => {
    const updateVisibleCount = (): void => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        // Each chip is roughly 80px wide with gap
        const count = Math.max(1, Math.floor(width / 85));
        setVisibleCount(Math.min(count, 8));
      }
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  const handleAddMonitorSlot = (): void => {
    addToken(MONITOR_SLOT);
  };

  const handleAddRecentToken = (address: string): void => {
    addToken(address);
  };

  // Filter out tokens already in the list and MONITOR_SLOT
  const availableRecentTokens = recentTokens.filter(
    (rt) => rt.address !== MONITOR_SLOT && !tokens.some((t) => t.address === rt.address),
  );

  const visibleRecentTokens = availableRecentTokens.slice(0, visibleCount);

  return (
    <div className="flex flex-col h-full w-full bg-app-primary">
      {/* Top Header */}
      <nav className="flex-shrink-0 border-b border-app-primary-70 px-2 md:px-4 py-2 backdrop-blur-sm bg-app-primary-99 z-30">
        <div className="flex items-center justify-between gap-2">
          {/* Left side - Logo, Token Count, Add Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
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

            <div className="flex items-center gap-2 px-3 py-1.5 bg-app-primary-60 rounded border border-app-primary-40">
              <LayoutGrid size={14} className="text-app-secondary-60" />
              <span className="text-xs font-mono">
                <span className="color-primary font-semibold">{tokens.length}</span>
                <span className="text-app-secondary-60"> / {maxTokens}</span>
              </span>
              <button
                onClick={handleAddMonitorSlot}
                disabled={tokens.length >= maxTokens}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all
                  bg-app-primary-color border-app-primary-color text-black font-semibold
                  hover:bg-app-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={12} />
                ADD
              </button>
            </div>
          </div>

          {/* Center - Recent Tokens */}
          <div
            ref={containerRef}
            className="flex-1 flex items-center gap-1.5 mx-4 min-w-0 overflow-hidden"
          >
            {visibleRecentTokens.length > 0 && (
              <>
                <Clock size={12} className="text-app-secondary-40 flex-shrink-0" />
                {visibleRecentTokens.map((rt) => (
                  <RecentTokenChip
                    key={rt.address}
                    token={rt}
                    onClick={() => handleAddRecentToken(rt.address)}
                    isInList={tokens.some((t) => t.address === rt.address)}
                  />
                ))}
                {availableRecentTokens.length > visibleCount && (
                  <span className="text-[10px] font-mono text-app-secondary-40 flex-shrink-0">
                    +{availableRecentTokens.length - visibleCount}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || !connection}
              className="flex items-center justify-center gap-2 px-2 md:px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh wallet balances"
            >
              <RefreshCw
                size={14}
                className={`color-primary ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>

            <ViewModeDropdown viewMode={viewMode} onViewModeChange={onViewModeChange} />

            <button
              onClick={() => navigate("/wallets")}
              className="flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
              title="Wallets"
            >
              <Wallet size={14} className="color-primary" />
            </button>

            <button
              onClick={() => navigate("/automate")}
              className="hidden md:flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
              title="Automate"
            >
              <Bot size={14} className="color-primary" />
            </button>

            <button
              onClick={() => navigate("/deploy")}
              className="hidden md:flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
              title="Deploy"
            >
              <Blocks size={14} className="color-primary" />
            </button>

            <button
              onClick={() => navigate("/settings")}
              className="flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
              title="Settings"
            >
              <Settings size={14} className="color-primary" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <MultichartFrameContainer
          wallets={wallets}
          setWallets={setWallets}
          isLoadingChart={isLoadingChart}
          baseCurrencyBalances={baseCurrencyBalances}
          tokenBalances={tokenBalances}
          currentMarketCap={currentMarketCap}
          onNonWhitelistedTrade={onNonWhitelistedTrade}
        />
      </div>
    </div>
  );
};
