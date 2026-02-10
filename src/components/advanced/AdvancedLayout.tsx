import React, { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Settings,
  Wrench,
  Bot,
  Blocks,
  RefreshCw,
  Wallet,
  BookOpen,
  Columns2,
  Rocket,
} from "lucide-react";
import { DeployForm } from "./DeployForm";
import { GroupSelector } from "../wallets/GroupSelector";
import { useWalletGroups, useActiveWalletGroup } from "../../utils/hooks";

// Left column view type
type LeftColumnView = "wallets" | "deploy";
import { brand } from "../../utils/brandConfig";
import Split from "../Split";
import type { WalletType, IframeData, WalletCategory, CategoryQuickTradeSettings } from "../../utils/types";
import type { ViewMode } from "../../utils/storage";
import type { BaseCurrencyConfig } from "../../utils/constants";

// Lazy loaded components
const WalletsListSidebar = lazy(() =>
  import("./WalletsList").then((module) => ({ default: module.WalletsListSidebar })),
);
const Frame = lazy(() =>
  import("../../Frame").then((module) => ({ default: module.Frame })),
);
const ActionsPage = lazy(() =>
  import("../../Actions").then((module) => ({ default: module.ActionsPage })),
);

// ViewModeDropdown Component
const ViewModeDropdown: React.FC<{
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}> = ({ viewMode, onViewModeChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const modes: { value: ViewMode; label: string }[] = [
    { value: "simple", label: "SIMPLE" },
    { value: "advanced", label: "ADVANCED" },
    { value: "multichart", label: "MULTICHART" },
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

const ToolsDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (action: () => void): void => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative z-40">
      <button
        id="nav-tools"
        onClick={(): void => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover-border-primary-60 rounded transition-all duration-300"
      >
        <Wrench size={16} className="color-primary" />
        <span className="text-xs font-mono color-primary font-medium tracking-wider">
          MENU
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
          <div className="absolute top-full right-0 mt-1 w-48 z-50">
            <div className="bg-app-secondary border border-app-primary-20 rounded overflow-hidden shadow-xl max-h-[80vh] overflow-y-auto">
              <div className="px-3 py-2 border-b border-app-primary-10">
                <div className="flex items-center gap-2 text-[10px] font-mono text-app-secondary uppercase tracking-widest">
                  <Wrench size={10} />
                  MENU
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => handleItemClick(() => navigate("/wallets"))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-primary-05 text-app-tertiary"
                >
                  <div className="p-1.5 bg-gradient-to-br from-app-primary-20 to-app-primary-05 rounded">
                    <Wallet size={14} className="color-primary" />
                  </div>
                  <span className="text-xs font-mono font-medium">Wallets</span>
                </button>

                <button
                  onClick={() => handleItemClick(() => navigate("/tools"))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-primary-05 text-app-tertiary"
                >
                  <div className="p-1.5 bg-gradient-to-br from-app-primary-20 to-app-primary-05 rounded">
                    <Bot size={14} className="color-primary" />
                  </div>
                  <span className="text-xs font-mono font-medium">Tools</span>
                </button>

                <button
                  onClick={() => handleItemClick(() => navigate("/deploy"))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-primary-05 text-app-tertiary"
                >
                  <div className="p-1.5 bg-gradient-to-br from-app-primary-20 to-app-primary-05 rounded">
                    <Blocks size={14} className="color-primary" />
                  </div>
                  <span className="text-xs font-mono font-medium">Deploy</span>
                </button>

                <button
                  onClick={() =>
                    handleItemClick(() =>
                      window.open(brand.docsUrl, "_blank", "noopener,noreferrer"),
                    )
                  }
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-primary-05 text-app-tertiary"
                >
                  <div className="p-1.5 bg-gradient-to-br from-app-primary-20 to-app-primary-05 rounded">
                    <BookOpen size={14} className="color-primary" />
                  </div>
                  <span className="text-xs font-mono font-medium">Documentation</span>
                </button>

                <button
                  onClick={() => handleItemClick(() => navigate("/settings"))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-primary-05 text-app-tertiary"
                >
                  <div className="p-1.5 bg-gradient-to-br from-app-primary-20 to-app-primary-05 rounded">
                    <Settings size={14} className="color-primary" />
                  </div>
                  <span className="text-xs font-mono font-medium">Settings</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export interface AdvancedLayoutProps {
  wallets: WalletType[];
  setWallets: (wallets: WalletType[] | ((prev: WalletType[]) => WalletType[])) => void;
  tokenAddress: string;
  setTokenAddress: (address: string) => void;
  isRefreshing: boolean;
  handleRefresh: () => void;
  connection: unknown;
  baseCurrencyBalances: Map<string, number>;
  baseCurrency: BaseCurrencyConfig;
  tokenBalances: Map<string, number>;
  transactionFee: string;
  currentMarketCap: number | null;
  setCalculatePNLModalOpen: (open: boolean) => void;
  automateCardPosition: { x: number; y: number };
  setAutomateCardPosition: (position: { x: number; y: number }) => void;
  isAutomateCardOpen: boolean;
  isAutomateCardDragging: boolean;
  setAutomateCardDragging: (dragging: boolean) => void;
  quickBuyEnabled: boolean;
  quickBuyAmount: number;
  quickBuyMinAmount: number;
  quickBuyMaxAmount: number;
  useQuickBuyRange: boolean;
  quickSellPercentage: number;
  quickSellMinPercentage: number;
  quickSellMaxPercentage: number;
  useQuickSellRange: boolean;
  iframeData: IframeData | null;
  setIframeData: (data: IframeData | null) => void;
  categorySettings: Record<WalletCategory, CategoryQuickTradeSettings>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNonWhitelistedTrade: (trade: {
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
  isLoadingChart: boolean;
  isMobile: boolean;
}

export const AdvancedLayout: React.FC<AdvancedLayoutProps> = ({
  wallets,
  setWallets,
  tokenAddress,
  setTokenAddress,
  isRefreshing,
  handleRefresh,
  connection,
  baseCurrencyBalances,
  baseCurrency,
  tokenBalances,
  transactionFee,
  currentMarketCap,
  setCalculatePNLModalOpen,
  automateCardPosition,
  setAutomateCardPosition,
  isAutomateCardOpen,
  isAutomateCardDragging,
  setAutomateCardDragging,
  quickBuyEnabled,
  quickBuyAmount,
  quickBuyMinAmount,
  quickBuyMaxAmount,
  useQuickBuyRange,
  quickSellPercentage,
  quickSellMinPercentage,
  quickSellMaxPercentage,
  useQuickSellRange,
  iframeData,
  setIframeData,
  categorySettings,
  viewMode,
  onViewModeChange,
  onNonWhitelistedTrade,
  isLoadingChart,
  isMobile,
}) => {
  const navigate = useNavigate();

  // Left column view state (wallets or deploy)
  const [leftColumnView, setLeftColumnView] = useState<LeftColumnView>("wallets");

  // Wallet groups
  const { groups } = useWalletGroups(wallets, setWallets);

  // Active group state (shared across all components)
  const [activeGroupId, handleGroupChange] = useActiveWalletGroup();

  // Store advanced sizes separately so we can restore them when switching back from simple mode
  const [savedAdvancedSizes, setSavedAdvancedSizes] = useState<number[]>([25, 75]);

  // Split panel sizes
  const [splitSizes, setSplitSizes] = useState<number[]>(() => {
    if (viewMode === "simple") {
      return [0, 100];
    }
    return [25, 75];
  });

  // Update split sizes when view mode changes
  useEffect(() => {
    if (viewMode === "simple") {
      setSplitSizes([0, 100]);
    } else if (viewMode === "advanced") {
      setSplitSizes(savedAdvancedSizes);
    }
  }, [viewMode, savedAdvancedSizes]);

  const handleSplitDragEnd = useCallback((sizes: number[]): void => {
    setSplitSizes(sizes);
    // Auto-detect collapse: if left column is below 5%, switch to simple mode
    if (sizes[0] < 5 && viewMode === "advanced") {
      onViewModeChange("simple");
      setSplitSizes([0, 100]);
    } else if (sizes[0] >= 5) {
      setSavedAdvancedSizes(sizes);
    }
  }, [viewMode, onViewModeChange]);

  return (
    <>
      <Split
        key={viewMode}
        className="flex flex-1 h-full split-custom"
        sizes={splitSizes}
        minSize={[0, 250]}
        gutterSize={viewMode === "simple" ? 0 : 12}
        gutterAlign="center"
        direction="horizontal"
        dragInterval={1}
        snapOffset={30}
        onDragEnd={handleSplitDragEnd}
        gutter={(_index, direction): HTMLDivElement => {
          const gutter = document.createElement("div");
          gutter.className = `gutter gutter-${direction} gutter-animated`;

          if (viewMode === "simple") {
            gutter.style.display = "none";
          }

          for (let i = 0; i < 5; i++) {
            const dot = document.createElement("div");
            dot.className = "gutter-dot";
            dot.style.animationDelay = `${i * 0.1}s`;
            gutter.appendChild(dot);
          }

          return gutter;
        }}
      >
        {/* Left Column */}
        <div className="backdrop-blur-sm bg-app-primary-99 border-r border-app-primary-40 overflow-y-auto h-full flex flex-col">
          {/* Top Navigation - Left Column */}
          <nav className="sticky top-0 border-b border-app-primary-70 px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 backdrop-blur-sm bg-app-primary-99 z-30">
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 justify-between">
              {/* View Toggle - Pill Style */}
              <div className="relative flex items-center bg-app-quaternary rounded-lg p-0.5 border border-app-primary-20">
                {/* Sliding indicator */}
                <div
                  className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-gradient-to-r from-app-primary-color/20 to-app-primary-color/10 rounded-md border border-app-primary-color/40 transition-all duration-300 ease-out"
                  style={{ left: leftColumnView === "wallets" ? "2px" : "calc(50% + 0px)" }}
                />
                <button
                  onClick={() => setLeftColumnView("wallets")}
                  className={`relative z-10 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-300 ${
                    leftColumnView === "wallets"
                      ? "color-primary"
                      : "text-app-secondary-40 hover:text-app-secondary-60"
                  }`}
                  title="Wallets"
                >
                  <Wallet size={13} />
                  {viewMode === "advanced" && splitSizes[0] > 18 && (
                    <span className="text-[10px] font-mono font-medium tracking-wide">
                      WALLETS
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setLeftColumnView("deploy")}
                  className={`relative z-10 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-300 ${
                    leftColumnView === "deploy"
                      ? "color-primary"
                      : "text-app-secondary-40 hover:text-app-secondary-60"
                  }`}
                  title="Deploy"
                >
                  <Rocket size={13} />
                  {viewMode === "advanced" && splitSizes[0] > 18 && (
                    <span className="text-[10px] font-mono font-medium tracking-wide">
                      DEPLOY
                    </span>
                  )}
                </button>
              </div>

              {/* Refresh & Group Selector - Only show in wallets view */}
              {leftColumnView === "wallets" && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || !connection}
                    className="flex items-center justify-center px-2 py-1.5 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh wallet balances"
                  >
                    <RefreshCw
                      size={14}
                      className={`color-primary ${isRefreshing ? "animate-spin" : ""}`}
                    />
                  </button>

                  {/* Group Selector - right after refresh button */}
                  {groups.length > 0 && (
                    <GroupSelector
                      groups={groups}
                      activeGroupId={activeGroupId}
                      onGroupChange={handleGroupChange}
                      showAllOption={true}
                    />
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* Left Column Content */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            {leftColumnView === "wallets" ? (
              // Wallets View
              !!connection && (
                <Suspense fallback={<div className="flex-1 flex items-center justify-center"><RefreshCw className="animate-spin color-primary" size={20} /></div>}>
                  <WalletsListSidebar
                    wallets={wallets}
                    setWallets={setWallets}
                    tokenAddress={tokenAddress}
                    activeGroupId={activeGroupId}
                    baseCurrencyBalances={baseCurrencyBalances}
                    baseCurrency={baseCurrency}
                    tokenBalances={tokenBalances}
                    quickBuyEnabled={quickBuyEnabled}
                    quickBuyAmount={quickBuyAmount}
                    quickBuyMinAmount={quickBuyMinAmount}
                    quickBuyMaxAmount={quickBuyMaxAmount}
                    useQuickBuyRange={useQuickBuyRange}
                    quickSellPercentage={quickSellPercentage}
                    quickSellMinPercentage={quickSellMinPercentage}
                    quickSellMaxPercentage={quickSellMaxPercentage}
                    useQuickSellRange={useQuickSellRange}
                    categorySettings={categorySettings}
                  />
                </Suspense>
              )
            ) : (
              // Deploy View
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><RefreshCw className="animate-spin color-primary" size={20} /></div>}>
                <DeployForm
                  onTokenDeployed={(mintAddress) => {
                    setTokenAddress(mintAddress);
                    setLeftColumnView("wallets");
                  }}
                />
              </Suspense>
            )}
          </div>
        </div>

        {/* Middle Column */}
        <div className="backdrop-blur-sm bg-app-primary-99 border-l border-r border-app-primary-40 overflow-y-auto">
          <Frame
            isLoadingChart={isLoadingChart}
            tokenAddress={tokenAddress}
            wallets={wallets}
            onDataUpdate={setIframeData}
            onTokenSelect={setTokenAddress}
            onNonWhitelistedTrade={onNonWhitelistedTrade}
            quickBuyEnabled={quickBuyEnabled}
            quickBuyAmount={quickBuyAmount}
            quickBuyMinAmount={quickBuyMinAmount}
            quickBuyMaxAmount={quickBuyMaxAmount}
            useQuickBuyRange={useQuickBuyRange}
          />
        </div>
      </Split>

      {/* Non-resizable divider between middle and right column */}
      <div className="gutter-divider gutter-divider-non-resizable"></div>

      {/* Right Column - Fixed Width */}
      <div
        className="backdrop-blur-sm bg-app-primary-99 overflow-hidden relative flex flex-col"
        style={{
          width: "350px",
          minWidth: "350px",
          maxWidth: "350px",
        }}
      >
        {/* Top Navigation - Only over Actions column */}
        <nav className="flex-shrink-0 border-b border-app-primary-70 px-2 md:px-4 py-2 backdrop-blur-sm bg-app-primary-99 z-30">
          <div className="flex items-center justify-between gap-2">
            {/* Logo button that redirects to home */}
            <button
              onClick={() => navigate("/")}
              className="hover:scale-105 active:scale-95 transition-transform"
            >
              <img
                src="/logo.png"
                alt={brand.altText}
                className="h-8 filter drop-shadow-[0_0_8px_var(--color-primary-70)]"
              />
            </button>

            <div className="flex items-center gap-2">
              {/* View Mode Dropdown - Hidden on mobile */}
              {!isMobile && (
                <ViewModeDropdown
                  viewMode={viewMode}
                  onViewModeChange={onViewModeChange}
                />
              )}

              {/* Mobile: Inline buttons, Desktop: Dropdown */}
              {isMobile ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate("/wallets")}
                    className="flex items-center gap-1 px-2 py-1.5 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
                    title="Wallets"
                  >
                    <Wallet size={14} className="color-primary" />
                    <span className="text-xs font-mono color-primary">WALLETS</span>
                  </button>
                  <button
                    onClick={() => navigate("/settings")}
                    className="flex items-center gap-1 px-2 py-1.5 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
                    title="Settings"
                  >
                    <Settings size={14} className="color-primary" />
                    <span className="text-xs font-mono color-primary">SETTINGS</span>
                  </button>
                </div>
              ) : (
                <ToolsDropdown />
              )}
            </div>
          </div>
        </nav>

        <ActionsPage
          tokenAddress={tokenAddress}
          setTokenAddress={setTokenAddress}
          transactionFee={transactionFee}
          handleRefresh={handleRefresh}
          wallets={wallets}
          setWallets={setWallets}
          baseCurrencyBalances={baseCurrencyBalances}
          baseCurrency={baseCurrency}
          tokenBalances={tokenBalances}
          currentMarketCap={currentMarketCap}
          setCalculatePNLModalOpen={setCalculatePNLModalOpen}
          isAutomateCardOpen={isAutomateCardOpen}
          automateCardPosition={automateCardPosition}
          setAutomateCardPosition={setAutomateCardPosition}
          isAutomateCardDragging={isAutomateCardDragging}
          setAutomateCardDragging={setAutomateCardDragging}
          iframeData={iframeData}
        />
      </div>
    </>
  );
};
