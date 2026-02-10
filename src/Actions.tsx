import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChartSpline,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";
import { brand } from "./utils/brandConfig";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { WalletType, IframeData } from "./utils/types";
import type { BaseCurrencyConfig } from "./utils/constants";
import { useToast } from "./utils/hooks";
import { countActiveWallets, filterActiveWallets, toggleWallet } from "./utils/wallet";
import { saveWalletsToCookies } from "./utils/storage";
import FloatingTradingCard from "./components/trading/FloatingTradingCard";
import TradingCard from "./components/trading/TradingForm";
import WalletSelectorPopup from "./components/trading/WalletSelectorPopup";
import { PageBackground } from "./components/PageBackground";
import { getLatestTrades, type TradeHistoryEntry } from "./utils/trading";

import { executeTrade } from "./utils/trading";

//  styled Switch component (simplified)
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={`
      peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
      border-2 border-app-primary-40 transition-colors duration-300
      focus-visible:outline-none focus-visible:ring-2
      focus-visible:ring-app-primary-color focus-visible:ring-offset-2
      focus-visible:ring-offset-app-primary disabled:cursor-not-allowed
      disabled:opacity-50 data-[state=checked]:bg-app-primary-color data-[state=unchecked]:bg-app-secondary
      relative overflow-hidden ${className}`}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={`
        pointer-events-none block h-5 w-5 rounded-full
        bg-white shadow-lg ring-0 transition-transform
        data-[state=checked]:translate-x-5 data-[state=checked]:bg-app-primary
        data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-app-secondary-color`}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

interface ActionsPageProps {
  tokenAddress: string;
  setTokenAddress: (address: string) => void;
  transactionFee: string;
  handleRefresh: () => void;
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  baseCurrencyBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  baseCurrency: BaseCurrencyConfig;
  currentMarketCap: number | null;
  setCalculatePNLModalOpen: (open: boolean) => void;
  // Automate card state props
  isAutomateCardOpen: boolean;
  automateCardPosition: { x: number; y: number };
  setAutomateCardPosition: (position: { x: number; y: number }) => void;
  isAutomateCardDragging: boolean;
  setAutomateCardDragging: (dragging: boolean) => void;
  iframeData: IframeData | null;
}

// themed DataBox with minimal clean column layout
const DataBox: React.FC<{
  iframeData: IframeData | null;
  tokenAddress: string;
  tokenBalances: Map<string, number>;
}> = React.memo(({ iframeData, tokenAddress, tokenBalances }) => {
  const [showUSD, setShowUSD] = useState(false);

  if (!tokenAddress || !iframeData) return null;

  const { tradingStats, solPrice, currentWallets, tokenPrice } = iframeData;

  // Verify that tokenPrice matches the current tokenAddress
  // Only show data if tokenPrice exists and matches, or if tokenPrice is null (initial state)
  // This prevents showing PnL data for a different token
  if (tokenPrice && tokenPrice.tokenMint !== tokenAddress) {
    return null;
  }

  // Calculate holdings value
  const totalTokens = Array.from(tokenBalances.values()).reduce(
    (sum, balance) => sum + balance,
    0,
  );
  const currentTokenPrice = tokenPrice?.tokenPrice || 0;
  const holdingsValue = totalTokens * currentTokenPrice;

  // Currency conversion helper
  const formatValue = (solValue: number): string => {
    if (showUSD && solPrice) {
      return (solValue * solPrice).toFixed(2);
    }
    return solValue.toFixed(2);
  };

  const handleCurrencyToggle = (): void => {
    setShowUSD(!showUSD);
  };

  return (
    <div className="mb-4">
      <div
        onClick={handleCurrencyToggle}
        className="bg-gradient-to-br from-app-secondary-80 to-app-primary-dark-50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-app-primary-20 relative overflow-hidden cursor-pointer hover:border-app-primary-40 transition-all duration-300"
      >
        {/*  accent lines */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-app-primary-40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-app-primary-40 to-transparent"></div>

        {/* Main stats grid - clean 4-column layout */}
        <div className="grid grid-cols-4 gap-8 relative z-10">
          {/* Bought */}
          <div className="flex flex-col items-center text-center group">
            <div className="text-xs font-mono tracking-wider text-app-secondary-80 uppercase mb-2 font-medium">
              Bought
            </div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold color-primary font-mono tracking-tight">
                {tradingStats
                  ? formatValue(tradingStats.bought)
                  : formatValue(0)}
              </div>
              {showUSD ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="opacity-80 group-hover:opacity-100 transition-opacity"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <div className="w-2 h-0.5 bg-app-primary-color rounded opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-2 h-0.5 bg-app-primary-color rounded opacity-60 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-2 h-0.5 bg-app-primary-color rounded opacity-40 group-hover:opacity-100 transition-opacity"></div>
                </div>
              )}
            </div>
          </div>

          {/* Sold */}
          <div className="flex flex-col items-center text-center group">
            <div className="text-xs font-mono tracking-wider text-app-secondary-80 uppercase mb-2 font-medium">
              Sold
            </div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold text-warning font-mono tracking-tight">
                {tradingStats ? formatValue(tradingStats.sold) : formatValue(0)}
              </div>
              {showUSD ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="opacity-80 group-hover:opacity-100 transition-opacity text-warning"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <div className="w-2 h-0.5 bg-warning rounded opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-2 h-0.5 bg-warning rounded opacity-60 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-2 h-0.5 bg-warning rounded opacity-40 group-hover:opacity-100 transition-opacity"></div>
                </div>
              )}
            </div>
          </div>

          {/* Holding */}
          <div className="flex flex-col items-center text-center group">
            <div className="text-xs font-mono tracking-wider text-app-secondary-80 uppercase mb-2 font-medium">
              Holding
            </div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold text-app-secondary font-mono tracking-tight">
                {formatValue(holdingsValue)}
              </div>
              {showUSD ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="opacity-80 group-hover:opacity-100 transition-opacity text-app-secondary"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <div className="w-2 h-0.5 bg-app-secondary-color rounded opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-2 h-0.5 bg-app-secondary-color rounded opacity-60 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-2 h-0.5 bg-app-secondary-color rounded opacity-40 group-hover:opacity-100 transition-opacity"></div>
                </div>
              )}
            </div>
          </div>

          {/* PnL */}
          <div className="flex flex-col items-center text-center group">
            <div className="text-xs font-mono tracking-wider text-app-secondary-80 uppercase mb-2 font-medium">
              PnL
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`text-lg font-bold font-mono tracking-tight ${
                  tradingStats && tradingStats.net + holdingsValue >= 0
                    ? "color-primary"
                    : "text-warning"
                }`}
              >
                {tradingStats ? (
                  <div>
                    {(() => {
                      const value = tradingStats.net + holdingsValue;
                      const formattedValue = formatValue(Math.abs(value));
                      const sign = value >= 0 ? "+" : "-";
                      return `${sign}${formattedValue}`;
                    })()}
                  </div>
                ) : (
                  <div>+{formatValue(holdingsValue)}</div>
                )}
              </div>
              {showUSD ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`opacity-80 group-hover:opacity-100 transition-opacity ${
                    tradingStats && tradingStats.net + holdingsValue >= 0
                      ? "text-app-primary"
                      : "text-warning"
                  }`}
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <div
                    className={`w-2 h-0.5 rounded opacity-80 group-hover:opacity-100 transition-opacity ${
                      tradingStats && tradingStats.net + holdingsValue >= 0
                        ? "bg-app-primary-color"
                        : "bg-warning"
                    }`}
                  ></div>
                  <div
                    className={`w-2 h-0.5 rounded opacity-60 group-hover:opacity-100 transition-opacity ${
                      tradingStats && tradingStats.net + holdingsValue >= 0
                        ? "bg-app-primary-color"
                        : "bg-warning"
                    }`}
                  ></div>
                  <div
                    className={`w-2 h-0.5 rounded opacity-40 group-hover:opacity-100 transition-opacity ${
                      tradingStats && tradingStats.net + holdingsValue >= 0
                        ? "bg-app-primary-color"
                        : "bg-warning"
                    }`}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Minimal footer info */}
        {currentWallets && currentWallets.length > 0 && (
          <div className="mt-8 pt-4 border-t border-app-primary-20">
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 rounded-full bg-app-primary-color animate-pulse"></div>
                <span className="text-app-secondary font-mono text-xs tracking-wider">
                  {currentWallets.length} ACTIVE
                </span>
              </div>
              {tradingStats && (
                <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                  <div className="w-2 h-2 rounded-full bg-app-primary-color"></div>
                  <span className="text-app-secondary font-mono text-xs tracking-wider">
                    {tradingStats.trades} TRADES
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
});
DataBox.displayName = "DataBox";

// Latest Trade component - shows only the most recent trade for current token
const LatestTrades: React.FC<{
  tokenAddress?: string;
}> = React.memo(({ tokenAddress }) => {
  const [latestTrade, setLatestTrade] = useState<TradeHistoryEntry | null>(
    null,
  );
  const [tradeAppearedAt, setTradeAppearedAt] = useState<number | null>(null);
  const [isFullyOpaque, setIsFullyOpaque] = useState(true);
  const previousTradeIdRef = useRef<string | null>(null);

  const loadLatestTrade = useCallback(() => {
    if (!tokenAddress) {
      setLatestTrade(null);
      setTradeAppearedAt(null);
      previousTradeIdRef.current = null;
      return;
    }

    const trades = getLatestTrades(50);
    // Get the most recent trade for the current token
    const tokenTrades = trades.filter(
      (trade) => trade.tokenAddress === tokenAddress,
    );
    const newTrade = tokenTrades.length > 0 ? tokenTrades[0] : null;

    // Check if this is a new trade (different ID)
    if (newTrade && newTrade.id !== previousTradeIdRef.current) {
      setTradeAppearedAt(Date.now());
      previousTradeIdRef.current = newTrade.id;
    }

    setLatestTrade(newTrade);
  }, [tokenAddress]);

  useEffect(() => {
    loadLatestTrade();

    // Listen for trade history updates
    const handleTradeUpdate = (): void => {
      loadLatestTrade();
    };

    window.addEventListener("tradeHistoryUpdated", handleTradeUpdate);

    return () => {
      window.removeEventListener("tradeHistoryUpdated", handleTradeUpdate);
    };
  }, [loadLatestTrade]);

  // Update opacity state to track first 3 seconds
  useEffect(() => {
    if (tradeAppearedAt !== null) {
      setIsFullyOpaque(true);
      const timer = setTimeout(() => {
        setIsFullyOpaque(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [tradeAppearedAt]);

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const formatAmount = (trade: TradeHistoryEntry): string => {
    if (trade.amountType === "percentage") {
      return `${trade.amount}%`;
    }
    return `${trade.amount.toFixed(3)} SOL`;
  };

  // Only show when token is selected and there's a trade
  if (!tokenAddress || !latestTrade) {
    return null;
  }

  return (
    <div className="mt-3">
      <div
        className={`flex items-center justify-between py-1.5 px-2 rounded border text-xs ${
          latestTrade.success
            ? latestTrade.type === "buy"
              ? `bg-app-secondary-80 border-app-primary-40 ${isFullyOpaque ? "opacity-100" : ""}`
              : `bg-app-secondary-80 border-warning-40 ${isFullyOpaque ? "opacity-100" : ""}`
            : `bg-app-secondary-60 border-app-primary-20 ${isFullyOpaque ? "opacity-100" : "opacity-60"}`
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Compact icon */}
          {latestTrade.type === "buy" ? (
            <ArrowUpRight
              size={12}
              className={`flex-shrink-0 ${latestTrade.success ? "color-primary" : "text-app-secondary-60"}`}
            />
          ) : (
            <ArrowDownRight
              size={12}
              className={`flex-shrink-0 ${latestTrade.success ? "text-warning" : "text-app-secondary-60"}`}
            />
          )}

          {/* Compact info */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`font-mono font-semibold ${
                latestTrade.success
                  ? latestTrade.type === "buy"
                    ? "color-primary"
                    : "text-warning"
                  : "text-app-secondary-60"
              }`}
            >
              {latestTrade.type === "buy" ? "BUY" : "SELL"}
            </span>
            <span className="text-app-secondary-60">•</span>
            <span className="text-app-secondary-60 font-mono truncate">
              {formatAmount(latestTrade)}
            </span>
            {latestTrade.walletsCount > 1 && (
              <>
                <span className="text-app-secondary-60">•</span>
                <span className="text-app-secondary-60 font-mono">
                  {latestTrade.walletsCount}w
                </span>
              </>
            )}
          </div>
        </div>

        {/* Compact timestamp */}
        <div className="flex items-center gap-1 text-app-secondary-60 font-mono ml-2 flex-shrink-0">
          <Clock size={10} />
          <span>{formatTimeAgo(latestTrade.timestamp)}</span>
        </div>
      </div>
    </div>
  );
});
LatestTrades.displayName = "LatestTrades";

export const ActionsPage: React.FC<ActionsPageProps> = ({
  tokenAddress,
  setTokenAddress,
  wallets,
  setWallets,
  baseCurrencyBalances,
  tokenBalances,
  baseCurrency,
  currentMarketCap,
  setCalculatePNLModalOpen,
  iframeData,
}) => {
  // State management
  const [buyAmount, setBuyAmount] = useState(() => {
    const saved = localStorage.getItem("quickBuyAmount");
    return saved || "";
  });
  const [sellAmount, setSellAmount] = useState("");
  const [selectedDex, setSelectedDex] = useState("auto"); // Default to auto
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // Auto-buy settings
  const [autoRedirectEnabled, setAutoRedirectEnabled] = useState(true); // Auto redirect to token after buy

  // Floating card state
  const [isFloatingCardOpen, setIsFloatingCardOpen] = useState(false);
  // Calculate center position on mount - will be updated when card opens
  const [floatingCardPosition, setFloatingCardPosition] = useState(() => {
    // Start at center of viewport
    const cardWidth = 320; // w-80 = 20rem = 320px
    const cardHeight = 400; // approximate height
    return {
      x: Math.max(0, (window.innerWidth - cardWidth) / 2),
      y: Math.max(0, (window.innerHeight - cardHeight) / 2),
    };
  });
  const [isFloatingCardDragging, setIsFloatingCardDragging] = useState(false);

  // Wallet selector state
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const activeWalletsRef = useRef<HTMLDivElement>(null);

  // Wallet selection handlers
  const handleToggleWallet = useCallback(
    (walletId: number): void => {
      const updatedWallets = toggleWallet(wallets, walletId);
      setWallets(updatedWallets);
      saveWalletsToCookies(updatedWallets);
    },
    [wallets, setWallets],
  );

  const handleSelectAll = useCallback((): void => {
    const allActive = wallets
      .filter((w) => !w.isArchived)
      .every((w) => w.isActive);
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
      const solBal = baseCurrencyBalances.get(wallet.address) || 0;
      const tokenBal = tokenBalances.get(wallet.address) || 0;
      return solBal > 0 || tokenBal > 0;
    });

    if (walletsWithBalance.length === 0) {
      showToast("No wallets with balance found", "error");
      return;
    }

    const allWithBalanceActive = walletsWithBalance.every((w) => w.isActive);
    const updatedWallets = wallets.map((wallet) => {
      if (wallet.isArchived) return wallet;
      const solBal = baseCurrencyBalances.get(wallet.address) || 0;
      const tokenBal = tokenBalances.get(wallet.address) || 0;
      const hasBalance = solBal > 0 || tokenBal > 0;

      if (allWithBalanceActive) {
        return { ...wallet, isActive: false };
      } else {
        return { ...wallet, isActive: hasBalance ? true : wallet.isActive };
      }
    });

    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
  }, [wallets, baseCurrencyBalances, tokenBalances, setWallets, showToast]);

  // Handler to close floating card
  const handleCloseFloating = useCallback(() => {
    setIsFloatingCardOpen(false);
  }, []);

  // Handler to open floating card
  const handleOpenFloating = useCallback(() => {
    setIsFloatingCardOpen(true);
  }, []);

  const handleTradeSubmit = useCallback(
    async (
      wallets: WalletType[],
      isBuyMode: boolean,
      dex?: string,
      buyAmount?: string,
      sellAmount?: string,
      tokenAddressParam?: string,
    ) => {
      setIsLoading(true);

      // Use tokenAddressParam if provided, otherwise use the component's tokenAddress
      const tokenAddressToUse = tokenAddressParam || tokenAddress;

      if (!tokenAddressToUse) {
        showToast("Please select a token first", "error");
        setIsLoading(false);
        return;
      }

      try {
        // Use the provided dex parameter if available, otherwise use selectedDex
        const dexToUse = dex || selectedDex;

        // Create trading config
        const config = {
          tokenAddress: tokenAddressToUse,
          ...(isBuyMode
            ? { solAmount: parseFloat(buyAmount || "0") }
            : { sellPercent: parseFloat(sellAmount || "0") }),
        };

        // Execute trade using centralized logic
        const result = await executeTrade(
          dexToUse,
          wallets,
          config,
          isBuyMode,
          baseCurrencyBalances,
        );

        if (result.success) {
          showToast(`${isBuyMode ? "Buy" : "Sell"} successful`, "success");
        } else {
          showToast(result.error || `${isBuyMode ? "Buy" : "Sell"} failed`, "error");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        showToast(`Error: ${errorMessage}`, "error");
      } finally {
        setIsLoading(false);
      }
    },
    [tokenAddress, selectedDex, baseCurrencyBalances, showToast, setIsLoading],
  );

  // Wrapper for FloatingTradingCard's handleTradeSubmit signature
  const handleFloatingTradeSubmit = useCallback(
    (
      wallets: WalletType[],
      isBuy: boolean,
      dex?: string,
      buyAmount?: string,
      sellAmount?: string,
    ): void => {
      // Fire and forget - FloatingTradingCard doesn't await the result
      void handleTradeSubmit(wallets, isBuy, dex, buyAmount, sellAmount);
    },
    [handleTradeSubmit],
  );

  // Track last processed message to prevent duplicates
  const lastProcessedMessageRef = useRef<{
    tokenMint: string;
    timestamp: number;
  } | null>(null);

  // Handle iframe messages for TOKEN_SELECTED and TOKEN_BUY
  useEffect(() => {
    const handleMessage = (event: MessageEvent): void => {
      // Type guard for message data
      interface TokenMessage {
        type: string;
        tokenMint?: string;
        tokenAddress?: string;
        token?: string;
        mint?: string;
      }

      const data = event.data as TokenMessage;

      // Handle TOKEN_SELECTED message (only for token selection, no auto-buy)
      if (data && data.type === "TOKEN_SELECTED") {
        // Message received
      }

      // Handle TOKEN_BUY message for quick buy functionality
      if (data && data.type === "TOKEN_BUY") {
        // Try different possible property names for the token address
        const tokenMint =
          data.tokenMint || data.tokenAddress || data.token || data.mint;

        if (tokenMint) {
          // Check if this is a duplicate message (same token within 2 seconds)
          const now = Date.now();
          const lastProcessed = lastProcessedMessageRef.current;

          if (
            lastProcessed &&
            lastProcessed.tokenMint === tokenMint &&
            now - lastProcessed.timestamp < 2000
          ) {
            // This is a duplicate message, ignore it
            return;
          }

          // Update last processed message
          lastProcessedMessageRef.current = { tokenMint, timestamp: now };

          // Get active wallets
          const activeWallets = filterActiveWallets(wallets);

          if (activeWallets.length > 0) {
            // Execute buy with the specified amount and token address from the message
            void handleTradeSubmit(
              activeWallets,
              true,
              "auto",
              buyAmount,
              undefined,
              tokenMint,
            );
            showToast(`Quick buying ${buyAmount} SOL`, "success");

            // Auto redirect to token if enabled
            if (autoRedirectEnabled && setTokenAddress) {
              setTimeout(() => {
                setTokenAddress(tokenMint);
              }, 1000); // Wait 1 seconds after buy to redirect
            }
          } else {
            showToast("No active wallets", "error");
          }
        } else {
          showToast("Invalid token", "error");
        }
      }
    };

    // Add event listener for messages
    window.addEventListener("message", handleMessage);

    // Clean up event listener
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [
    tokenAddress,
    buyAmount,
    autoRedirectEnabled,
    wallets,
    handleTradeSubmit,
    showToast,
    setTokenAddress,
  ]);

  // Save buyAmount to localStorage when it changes
  useEffect(() => {
    if (buyAmount) {
      localStorage.setItem("quickBuyAmount", buyAmount);
    }
  }, [buyAmount]);

  // Send QUICKBUY_ACTIVATE to iframe when component loads without token set
  useEffect(() => {
    const sendQuickBuyActivate = (): void => {
      const iframe = document.querySelector("iframe");
      if (iframe && iframe.contentWindow && !tokenAddress) {
        iframe.contentWindow.postMessage(
          {
            type: "QUICKBUY_ACTIVATE",
          },
          "*",
        );
      }
    };

    // Send activation message after a short delay to ensure iframe is loaded
    const timer = setTimeout(sendQuickBuyActivate, 1000);

    return () => clearTimeout(timer);
  }, [tokenAddress]); // Re-run when tokenAddress changes

  return (
    <div className="flex-1 overflow-y-auto bg-app-primary p-4 md:p-6 pb-32 relative min-h-full">
      <PageBackground />

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {!tokenAddress && (
          <div className="space-y-4">
            {/* Active wallets info - Clickable */}
            <div
              ref={activeWalletsRef}
              onClick={() => setShowWalletSelector(!showWalletSelector)}
              className="bg-app-primary-60-alpha p-4 rounded-lg border border-app-primary-40 relative overflow-hidden cursor-pointer hover:border-app-primary-60 transition-all duration-200"
              >
                {/*  corner accents - smaller version */}
                <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none opacity-60">
                  <div className="absolute top-0 left-0 w-px h-4 bg-gradient-to-b from-app-primary-color to-transparent"></div>
                  <div className="absolute top-0 left-0 w-4 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
                </div>
                <div className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none opacity-60">
                  <div className="absolute bottom-0 right-0 w-px h-4 bg-gradient-to-t from-app-primary-color to-transparent"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
                </div>

                <div className="text-app-secondary font-mono text-xs tracking-wide mb-3 flex items-center">
                  <span className="mr-2 text-app-primary-color">⟁</span>
                  <span>ACTIVE WALLETS</span>
                  <span className="ml-auto text-[10px] text-app-secondary-60">
                    Click to select
                  </span>
                </div>

                <div className="text-xs text-app-secondary-60 flex items-center justify-between bg-app-primary-dark p-2 rounded border border-app-primary-40">
                  <span>Wallets selected to buy:</span>
                  <span className="text-app-primary-color font-mono font-bold">
                    {countActiveWallets(wallets)}
                  </span>
                </div>

                {countActiveWallets(wallets) === 0 && (
                  <div className="mt-3 text-warning text-xs font-mono flex items-center bg-app-primary-dark-50 p-2 rounded border border-warning-40">
                    <span className="inline-block w-2 h-2 bg-warning rounded-full mr-2 animate-pulse"></span>
                    No active wallets.
                  </div>
                )}
              </div>
            </div>
        )}

        {/* Quick Buy Form - Only show when no token selected */}
        {!tokenAddress && (
          <div className="bg-app-primary-60-alpha p-4 rounded-lg border border-app-primary-40 relative overflow-hidden">
            {/* Corner accents - smaller version */}
            <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none opacity-60">
              <div className="absolute top-0 left-0 w-px h-4 bg-gradient-to-b from-app-primary-color to-transparent"></div>
              <div className="absolute top-0 left-0 w-4 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
            </div>
            <div className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none opacity-60">
              <div className="absolute bottom-0 right-0 w-px h-4 bg-gradient-to-t from-app-primary-color to-transparent"></div>
              <div className="absolute bottom-0 right-0 w-4 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
            </div>

            {/* Header with SOL Amount label and Auto Redirect switch */}
            <div className="text-app-secondary font-mono text-xs tracking-wide mb-3 flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2 text-app-primary-color">⟁</span>
                <span>SOL AMOUNT</span>
              </div>

              {/* Auto Redirect Switch */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className={`text-[10px] transition-colors ${autoRedirectEnabled ? 'text-app-primary-color' : 'text-app-secondary-60 group-hover:text-app-secondary'}`}>
                  Auto redirect
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={autoRedirectEnabled}
                    onChange={(e) => setAutoRedirectEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-8 h-5 bg-app-secondary border border-app-primary-30 rounded-full
                                peer-checked:bg-gradient-to-r peer-checked:from-success peer-checked:to-success-alt
                                peer-checked:border-success transition-all duration-200
                                peer-checked:shadow-md peer-checked:shadow-success-40"></div>
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full
                                transition-all duration-200 peer-checked:translate-x-3
                                shadow-md peer-checked:shadow-lg"></div>
                </div>
              </label>
            </div>

            {/* SOL Amount Input */}
            <div className="relative">
              <input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="0.01"
                step="0.01"
                min="0"
                className="w-full bg-app-primary border border-app-primary-40 rounded px-4 py-2
                         text-app-primary font-mono focus:outline-none focus:border-app-primary-color
                         transition-colors text-sm"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-app-secondary-60 font-mono text-sm">
                SOL
              </span>
            </div>
          </div>
        )}

        {/* Trading Card - Show when token is selected */}
        {tokenAddress && (
          <TradingCard
            tokenAddress={tokenAddress}
            wallets={wallets}
            setWallets={setWallets}
            selectedDex={selectedDex}
            setSelectedDex={setSelectedDex}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            buyAmount={buyAmount}
            setBuyAmount={setBuyAmount}
            sellAmount={sellAmount}
            setSellAmount={setSellAmount}
            handleTradeSubmit={handleTradeSubmit}
            isLoading={isLoading}
            countActiveWallets={countActiveWallets}
            currentMarketCap={currentMarketCap}
            baseCurrencyBalances={baseCurrencyBalances}
            tokenBalances={tokenBalances}
            baseCurrency={baseCurrency}
            onOpenFloating={handleOpenFloating}
            isFloatingCardOpen={isFloatingCardOpen}
            solPrice={iframeData?.solPrice || null}
          />
        )}

        {/* Live Data Section */}
        {tokenAddress && (
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-app-primary-20 to-app-primary-05 rounded-lg">
                    <Activity size={16} className="color-primary" />
                  </div>
                  <span className="font-mono text-sm tracking-wider text-app-secondary uppercase">
                    Live Data
                  </span>
                </div>

                {/* Share PNL Button moved next to Live Data */}
                <button
                  onClick={() => {
                    if (!tokenAddress) {
                      showToast("Please select a token first", "error");
                      return;
                    }
                    setCalculatePNLModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg
                            bg-gradient-to-r from-app-primary-color to-app-primary-dark hover-from-app-primary-dark hover-to-app-primary-color
                            shadow-md shadow-app-primary-40 hover-shadow-app-primary-60
                            transition-all duration-300 relative overflow-hidden"
                >
                  <ChartSpline size={16} className="text-black relative z-10" />
                  <span className="text-sm font-mono tracking-wider text-black font-medium relative z-10">
                    Share PNL
                  </span>
                </button>
              </div>
              <DataBox
                iframeData={iframeData}
                tokenAddress={tokenAddress}
                tokenBalances={tokenBalances}
              />
              <LatestTrades tokenAddress={tokenAddress} />
            </div>
          </div>
        )}
      </div>

      {/*  GitHub & Website Section - Fixed at bottom (hidden on mobile to avoid tab nav overlap) */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 md:px-6 md:pb-6">
        <div className="mx-auto max-w-4xl">
          <div
            className="bg-gradient-to-br from-app-secondary-50 to-app-primary-dark-50 backdrop-blur-sm
                     rounded-xl p-4 relative overflow-hidden border border-app-primary-10
                     hover-border-primary-30 transition-all duration-300"
          >
            {/* Header */}
            <div className="flex items-center mb-3">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                className="color-primary mr-2"
              >
                <path
                  fill="currentColor"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.934.359.31.678.92.678 1.855 0 1.337-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
              <span className="text-sm font-mono tracking-wider text-app-secondary font-semibold">
                OPEN SOURCE PROJECT
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-app-secondary-80 mb-4 leading-relaxed">
              Built with transparency in mind. Explore the code, contribute, or
              fork for your own use.
            </p>

            {/* Links */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Main Website Link */}
              <a
                href={`https://${brand.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center py-2 px-4 rounded-lg bg-gradient-to-r
                         from-app-primary-color to-primary-90 text-black font-mono text-xs font-semibold
                         hover-from-primary-90 hover-to-app-primary-color
                         transition-all duration-300 transform hover:scale-105"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  className="mr-2"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                {brand.displayName}
              </a>

              {/* GitHub Link */}
              <a
                href={brand.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center py-2 px-4 rounded-lg bg-gradient-to-r
                         from-app-primary-20 to-app-primary-10 border border-app-primary-30
                         hover-from-app-primary-30 hover-to-app-primary-20
                         transition-all duration-300 transform hover:scale-105"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  className="mr-2 color-primary"
                  fill="currentColor"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.934.359.31.678.92.678 1.855 0 1.337-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                <span className="text-xs font-mono tracking-wider color-primary font-semibold">
                  {brand.social.twitter}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Trading Card */}
      <FloatingTradingCard
        isOpen={isFloatingCardOpen}
        onClose={handleCloseFloating}
        position={floatingCardPosition}
        onPositionChange={setFloatingCardPosition}
        isDragging={isFloatingCardDragging}
        onDraggingChange={setIsFloatingCardDragging}
        tokenAddress={tokenAddress}
        wallets={wallets}
        setWallets={setWallets}
        selectedDex={selectedDex}
        setBuyAmount={setBuyAmount}
        setSellAmount={setSellAmount}
        handleTradeSubmit={handleFloatingTradeSubmit}
        isLoading={isLoading}
        countActiveWallets={countActiveWallets}
        baseCurrencyBalances={baseCurrencyBalances}
        tokenBalances={tokenBalances}
      />

      {/* Wallet Selector Popup - Rendered via Portal when no token is set */}
      {!tokenAddress &&
        showWalletSelector &&
        createPortal(
          <WalletSelectorPopup
            wallets={wallets}
            baseCurrencyBalances={baseCurrencyBalances}
            tokenBalances={tokenBalances}
            baseCurrency={baseCurrency}
            tokenAddress={tokenAddress}
            anchorRef={activeWalletsRef}
            onClose={() => setShowWalletSelector(false)}
            onToggleWallet={handleToggleWallet}
            onSelectAll={handleSelectAll}
            onSelectAllWithBalance={handleSelectAllWithBalance}
          />,
          document.body,
        )}
    </div>
  );
};
