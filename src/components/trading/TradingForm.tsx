import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Loader2, Edit3, Check, ListOrdered, X } from "lucide-react";
import { useToast } from "../Notifications";
import { useAppContext } from "../../contexts/AppContext";
import { filterActiveWallets, toggleWallet } from "../../utils/wallet";
import { saveWalletsToCookies } from "../../utils/storage";
import WalletSelectorPopup from "../trading/WalletSelectorPopup";
import { PresetButton, TabButton, loadPresetsFromCookies, savePresetsToCookies } from "../wallets/PanelShared";
import type { WalletType, PresetTab, LimitPriceMode, LimitOrder } from "../../utils/types";
import type { BaseCurrencyConfig } from "../../utils/constants";
import type { InputMode } from "../../utils/trading";
import { addLimitOrder, formatCompact, getLimitOrders, cancelLimitOrder, formatLimitPrice, formatDistance } from "../../utils/limitOrders";

interface TradingCardProps {
  tokenAddress: string;
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  selectedDex: string;
  setSelectedDex: (dex: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  buyAmount: string;
  setBuyAmount: (amount: string) => void;
  sellAmount: string;
  setSellAmount: (amount: string) => void;
  handleTradeSubmit: (
    wallets: WalletType[],
    isBuy: boolean,
    dex: string,
    buyAmount?: string,
    sellAmount?: string,
    tokenAddressParam?: string,
    sellInputMode?: InputMode,
  ) => void;
  isLoading: boolean;
  countActiveWallets: (wallets: WalletType[]) => number;
  currentMarketCap: number | null;
  baseCurrencyBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  baseCurrency: BaseCurrencyConfig;
  onOpenFloating: () => void;
  isFloatingCardOpen: boolean;
  solPrice: number | null;
}

const TradingCard: React.FC<TradingCardProps> = ({
  tokenAddress,
  wallets,
  setWallets,
  selectedDex,
  buyAmount,
  setBuyAmount,
  sellAmount,
  setSellAmount,
  handleTradeSubmit,
  isLoading,
  countActiveWallets,
  currentMarketCap,
  baseCurrencyBalances,
  tokenBalances,
  baseCurrency,
  onOpenFloating,
  isFloatingCardOpen,
  solPrice,
}) => {
  const { showToast } = useToast();
  const { config, setConfig } = useAppContext();
  const [activeTradeType, setActiveTradeType] = useState<"buy" | "sell">("buy");
  const [sellInputMode, setSellInputMode] = useState<InputMode>("perWallet");
  const [buyInputMode, setBuyInputMode] = useState<InputMode>("perWallet");
  const [isEditMode, setIsEditMode] = useState(false);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const limitPriceMode: LimitPriceMode = "marketCap";
  const [limitPrice, setLimitPrice] = useState("");
  const [showLimitHistory, setShowLimitHistory] = useState(false);
  const [limitOrders, setLimitOrders] = useState<LimitOrder[]>([]);
  const [limitInputMode, setLimitInputMode] = useState<"slider" | "custom">("slider");
  const [limitSliderPct, setLimitSliderPct] = useState(0);
  const walletSelectorRef = useRef<HTMLDivElement>(null);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  // Initialize presets from cookies
  const initialPresets = loadPresetsFromCookies();
  const [presetTabs, setPresetTabs] = useState(initialPresets.tabs);
  const [activeTabId, setActiveTabId] = useState(initialPresets.activeTabId);
  const activeTab =
    presetTabs.find((tab: PresetTab) => tab.id === activeTabId) ||
    presetTabs[0];

  // Load buy amount from localStorage on mount
  useEffect(() => {
    try {
      const savedBuyAmount = localStorage.getItem('quickBuyAmount');
      if (savedBuyAmount) {
        setBuyAmount(savedBuyAmount);
      }
    } catch {
      // localStorage error, ignore
    }
  }, [setBuyAmount]);

  // Save buy amount to localStorage whenever it changes
  useEffect(() => {
    if (buyAmount) {
      try {
        localStorage.setItem('quickBuyAmount', buyAmount);
      } catch {
        // localStorage error, ignore
      }
    }
  }, [buyAmount]);

  // Save presets to cookies whenever they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      savePresetsToCookies(presetTabs, activeTabId);
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timeoutId);
  }, [presetTabs, activeTabId]);

  // Load limit orders for history panel
  useEffect(() => {
    const load = (): void => { setLimitOrders(getLimitOrders()); };
    load();
    window.addEventListener("limitOrdersUpdated", load);
    return () => window.removeEventListener("limitOrdersUpdated", load);
  }, []);

  // Handle tab switching with cookie save
  const handleTabSwitch = (tabId: string): void => {
    setActiveTabId(tabId);
  };

  // Edit preset handlers
  const handleEditBuyPreset = (index: number, newValue: string): void => {
    setPresetTabs((tabs: PresetTab[]) =>
      tabs.map((tab: PresetTab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              buyPresets: tab.buyPresets.map((preset: string, i: number) =>
                i === index ? newValue : preset,
              ),
            }
          : tab,
      ),
    );
  };

  const handleEditSellPreset = (index: number, newValue: string): void => {
    setPresetTabs((tabs: PresetTab[]) =>
      tabs.map((tab: PresetTab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              sellPresets: tab.sellPresets.map((preset: string, i: number) =>
                i === index ? newValue : preset,
              ),
            }
          : tab,
      ),
    );
  };

  // Edit tab label
  const handleEditTabLabel = (tabId: string, newLabel: string): void => {
    setPresetTabs((tabs: PresetTab[]) =>
      tabs.map((tab: PresetTab) =>
        tab.id === tabId ? { ...tab, label: newLabel } : tab,
      ),
    );
  };

  // Handle amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    if (activeTradeType === "buy") {
      setBuyAmount(value);
    } else {
      setSellAmount(value);
    }
  };

  // Handle preset click
  const handlePresetClick = (preset: string): void => {
    if (activeTradeType === "buy") {
      setBuyAmount(preset);
      // In cumulative mode, divide total SOL by active wallet count
      const activeCount = filterActiveWallets(wallets).length;
      const perWalletAmount = buyInputMode === "cumulative" && activeCount > 0
        ? String(parseFloat(preset) / activeCount)
        : preset;
      void handleTradeSubmit(wallets, true, selectedDex, perWalletAmount, undefined);
    } else {
      // Preset is a percentage — send as percentage directly
      // But display the corresponding token amount in the input
      const pct = parseFloat(preset);
      if (!isNaN(pct)) {
        const activeWallets = filterActiveWallets(wallets);
        const totalTokens = activeWallets.reduce((sum, w) => sum + (tokenBalances.get(w.address) || 0), 0);
        setSellAmount(String(totalTokens * (pct / 100)));
      } else {
        setSellAmount(preset);
      }
      void handleTradeSubmit(wallets, false, selectedDex, undefined, preset);
    }
  };

  // Calculate token/SOL amounts for market orders based on current market cap
  const marketOrderAmounts = useMemo(() => {
    if (!currentMarketCap || !solPrice || (!buyAmount && !sellAmount)) {
      return { tokenAmount: null, solAmount: null };
    }

    const supply = 1000000000; // 1B tokens
    const avgPrice = currentMarketCap / (solPrice * supply);

    if (activeTradeType === "buy" && buyAmount) {
      const solAmountNum = parseFloat(buyAmount);
      // In per-wallet mode, multiply by active wallet count for total
      const activeWallets = filterActiveWallets(wallets);
      const totalSol = buyInputMode === "perWallet"
        ? solAmountNum * activeWallets.length
        : solAmountNum;
      const tokenAmount = totalSol / avgPrice;
      return { tokenAmount, solAmount: totalSol };
    } else if (activeTradeType === "sell" && sellAmount) {
      // sellAmount is now a token amount
      const tokenAmountToSell = parseFloat(sellAmount);
      if (isNaN(tokenAmountToSell) || tokenAmountToSell <= 0) {
        return { tokenAmount: null, solAmount: null };
      }
      // In per-wallet mode, multiply by active wallet count for total
      const activeWallets = filterActiveWallets(wallets);
      const totalTokens = sellInputMode === "perWallet"
        ? tokenAmountToSell * activeWallets.length
        : tokenAmountToSell;
      const solAmount = totalTokens * avgPrice;
      return { tokenAmount: totalTokens, solAmount };
    }

    return { tokenAmount: null, solAmount: null };
  }, [
    currentMarketCap,
    solPrice,
    buyAmount,
    sellAmount,
    activeTradeType,
    buyInputMode,
    sellInputMode,
    wallets,
  ]);

  // Truncate a numeric string to max 3 decimal places for display
  const truncateDecimals = (value: string): string => {
    if (!value) return value;
    const dotIndex = value.indexOf(".");
    if (dotIndex === -1) return value;
    return value.slice(0, dotIndex + 4);
  };

  // Format number for display
  const formatAmount = (amount: number | null): string => {
    if (!amount) return "";
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(2) + "M";
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(2) + "K";
    } else if (amount < 0.01) {
      return amount.toExponential(2);
    } else {
      return amount.toFixed(2);
    }
  };

  // Get current market cap for limit price calculation
  const getCurrentLimitValue = (): number | null => currentMarketCap;

  // Handle slider percentage change → compute limit price
  const handleSliderChange = (pct: number): void => {
    setLimitSliderPct(pct);
    const current = getCurrentLimitValue();
    if (current && current > 0) {
      const target = current * (1 + pct / 100);
      setLimitPrice(String(Math.max(0, target)));
    }
  };

  // Wallet selection handlers
  const handleToggleWallet = (walletId: number): void => {
    const updatedWallets = toggleWallet(wallets, walletId);
    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
  };

  const handleSelectAll = (): void => {
    const allActive = wallets
      .filter((w) => !w.isArchived)
      .every((w) => w.isActive);
    const updatedWallets = wallets.map((wallet) => ({
      ...wallet,
      isActive: wallet.isArchived ? wallet.isActive : !allActive,
    }));
    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
  };

  const handleSelectAllWithBalance = (): void => {
    const walletsWithBalance = wallets.filter((wallet) => {
      if (wallet.isArchived) return false;
      const baseCurrencyBal = baseCurrencyBalances.get(wallet.address) || 0;
      const tokenBal = tokenBalances.get(wallet.address) || 0;
      return baseCurrencyBal > 0 || tokenBal > 0;
    });

    if (walletsWithBalance.length === 0) {
      showToast("No wallets with balance found", "error");
      return;
    }

    const allWithBalanceActive = walletsWithBalance.every((w) => w.isActive);
    const updatedWallets = wallets.map((wallet) => {
      if (wallet.isArchived) return wallet;
      const baseCurrencyBal = baseCurrencyBalances.get(wallet.address) || 0;
      const tokenBal = tokenBalances.get(wallet.address) || 0;
      const hasBalance = baseCurrencyBal > 0 || tokenBal > 0;

      if (allWithBalanceActive) {
        return { ...wallet, isActive: false };
      } else {
        return { ...wallet, isActive: hasBalance ? true : wallet.isActive };
      }
    });

    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
  };

  // Generate button text based on calculated amounts
  const getButtonText = (): React.ReactNode => {
    if (isLoading) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          PROCESSING...
        </span>
      );
    }

    if (activeTradeType === "buy") {
      if (marketOrderAmounts.tokenAmount && buyAmount) {
        return `${formatAmount(marketOrderAmounts.tokenAmount)}`;
      }
      return "BUY";
    } else {
      if (marketOrderAmounts.solAmount && sellAmount) {
        return `${formatAmount(marketOrderAmounts.solAmount)}`;
      }
      return "SELL";
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl shadow-xl">
      {/*  corner accents */}
      <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none">
        <div className="absolute top-0 left-0 w-px h-8 bg-gradient-to-b from-app-primary-color to-transparent"></div>
        <div className="absolute top-0 left-0 w-8 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none">
        <div className="absolute top-0 right-0 w-px h-8 bg-gradient-to-b from-app-primary-color to-transparent"></div>
        <div className="absolute top-0 right-0 w-8 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute bottom-0 left-0 w-24 h-24 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-px h-8 bg-gradient-to-t from-app-primary-color to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-8 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-px h-8 bg-gradient-to-t from-app-primary-color to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-8 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
      </div>

      {/* Main Tabs */}
      {!isFloatingCardOpen && (
        <div className="flex bg-app-primary-60 border-b border-app-primary-20">
          {/* Limit Orders History Button */}
          <button
            onClick={() => setShowLimitHistory(!showLimitHistory)}
            className={`flex items-center justify-center px-4 py-2 border-r border-app-primary-20 transition-colors cursor-pointer self-stretch ${
              showLimitHistory ? "bg-app-primary-20" : "hover:bg-app-primary-20"
            }`}
            title="Limit Orders"
          >
            <ListOrdered size={16} className="color-primary" />
          </button>

          {/* Buy/Sell Toggle */}
          <div className="flex flex-1">
            <button
              onClick={() => setActiveTradeType("buy")}
              className={`flex-1 py-3 px-4 text-sm font-mono tracking-wider transition-all duration-200 ${
                activeTradeType === "buy"
                  ? "bg-app-primary-color text-black font-medium"
                  : "bg-transparent text-app-secondary-60 hover-text-app-secondary"
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => setActiveTradeType("sell")}
              className={`flex-1 py-3 px-4 text-sm font-mono tracking-wider transition-all duration-200 ${
                activeTradeType === "sell"
                  ? "bg-error-alt text-white font-medium"
                  : "bg-transparent text-warning-60 hover:text-error-alt"
              }`}
            >
              SELL
            </button>
          </div>

          {/* Wallet Counter - Clickable */}
          <div className="relative" ref={walletSelectorRef}>
            <button
              onClick={() => setShowWalletSelector(!showWalletSelector)}
              className="flex items-center justify-center px-4 py-2 border-l border-app-primary-20 hover:bg-app-primary-20 transition-colors cursor-pointer h-full"
            >
              <span className="text-[10px] font-mono color-primary font-semibold">
                {countActiveWallets(wallets)}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="color-primary"
              >
                <path
                  d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2h18zM3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8H3zm13 4h2v2h-2v-2z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Wallet Selector Popup - Rendered via Portal to escape overflow constraints */}
      {showWalletSelector &&
        createPortal(
          <WalletSelectorPopup
            wallets={wallets}
            baseCurrencyBalances={baseCurrencyBalances}
            tokenBalances={tokenBalances}
            baseCurrency={baseCurrency}
            tokenAddress={tokenAddress}
            anchorRef={walletSelectorRef}
            onClose={() => setShowWalletSelector(false)}
            onToggleWallet={handleToggleWallet}
            onSelectAll={handleSelectAll}
            onSelectAllWithBalance={handleSelectAllWithBalance}
          />,
          document.body,
        )}


      {/* Limit Orders History Panel */}
      {showLimitHistory && !isFloatingCardOpen && (
        <div className="border-b border-app-primary-20 bg-app-primary-60 max-h-48 overflow-y-auto">
          <div className="p-2 space-y-1">
            {limitOrders.length === 0 ? (
              <p className="text-[10px] text-app-secondary-60 font-mono text-center py-2">No limit orders</p>
            ) : (
              limitOrders.map((order) => {
                const tokenPriceSOL = currentMarketCap && solPrice
                  ? currentMarketCap / (solPrice * 1_000_000_000)
                  : null;
                return (
                  <div
                    key={order.id}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-app-primary-80-alpha border border-app-primary-30"
                  >
                    <span className={`text-[9px] font-mono font-medium ${
                      order.side === "buy" ? "text-app-primary-color" : "text-error-alt"
                    }`}>
                      {order.side.toUpperCase()}
                    </span>
                    <span className="text-[9px] font-mono text-app-secondary">
                      {formatLimitPrice(order)}
                    </span>
                    {order.status === "active" && (
                      <span className="text-[9px] font-mono text-app-secondary-60">
                        {formatDistance(order, currentMarketCap, tokenPriceSOL)}
                      </span>
                    )}
                    <span className={`text-[9px] font-mono ml-auto ${
                      order.status === "active" ? "text-app-primary-color" :
                      order.status === "triggered" ? "text-warning" :
                      order.status === "cancelled" ? "text-app-secondary-60" :
                      "text-error-alt"
                    }`}>
                      {order.status}
                    </span>
                    {order.status === "active" && (
                      <button
                        onClick={() => cancelLimitOrder(order.id)}
                        className="p-0.5 hover:bg-app-primary-20 rounded transition-colors"
                        title="Cancel order"
                      >
                        <X size={10} className="text-app-secondary-60 hover:text-error-alt" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isFloatingCardOpen ? (
        <div className="p-3 space-y-2">
          {/* Amount Input and Submit Button Row */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono tracking-wider text-app-secondary uppercase flex items-center gap-1">
                {activeTradeType === "buy" ? "SOL" : "TOKENS"}
                <span className="text-[10px] text-app-secondary-60 font-mono">/</span>
                <button
                  type="button"
                  onClick={() => {
                    if (activeTradeType === "buy") {
                      setBuyInputMode(buyInputMode === "perWallet" ? "cumulative" : "perWallet");
                    } else {
                      setSellInputMode(sellInputMode === "perWallet" ? "cumulative" : "perWallet");
                    }
                  }}
                  className="px-1.5 py-0.5 text-[9px] font-mono rounded border border-app-primary-30 bg-app-primary-80-alpha hover:bg-app-primary-20 transition-colors text-app-secondary-60 hover:text-app-primary"
                  title={(activeTradeType === "buy" ? buyInputMode : sellInputMode) === "perWallet" ? "Switch to total across all wallets" : "Switch to per wallet"}
                >
                  {(activeTradeType === "buy" ? buyInputMode : sellInputMode) === "perWallet" ? "WALLET" : "TOTAL"}
                </button>
              </label>
              <div className="flex items-center bg-app-primary-80-alpha rounded border border-app-primary-30">
                <button
                  type="button"
                  onClick={() => setOrderType("market")}
                  className={`px-2 py-0.5 text-[9px] font-mono rounded-l transition-colors ${
                    orderType === "market"
                      ? "bg-app-primary-color text-black font-medium"
                      : "text-app-secondary-60 hover:text-app-primary"
                  }`}
                >
                  MARKET
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("limit")}
                  className={`px-2 py-0.5 text-[9px] font-mono rounded-r transition-colors ${
                    orderType === "limit"
                      ? "bg-app-primary-color text-black font-medium"
                      : "text-app-secondary-60 hover:text-app-primary"
                  }`}
                >
                  LIMIT
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={truncateDecimals(
                    activeTradeType === "buy" ? buyAmount : sellAmount
                  )}
                  onChange={handleAmountChange}
                  placeholder="0.0"
                  disabled={!tokenAddress}
                  className="w-full px-2 py-2 bg-app-primary-80-alpha border border-app-primary-40 rounded-lg
                       text-app-primary placeholder-app-secondary-60 font-mono text-sm
                       focus:outline-none focus-border-primary focus:ring-1 focus:ring-app-primary-40
                       transition-all duration-300 shadow-inner-black-80
                       disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {isLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2
                      size={16}
                      className="animate-spin color-primary"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={() => {
                  if (orderType === "limit") {
                    // Create limit order
                    const amount = parseFloat(activeTradeType === "buy" ? buyAmount : sellAmount);
                    const target = parseFloat(limitPrice);
                    if (isNaN(amount) || amount <= 0 || isNaN(target) || target <= 0) {
                      showToast("Enter valid amount and limit price", "error");
                      return;
                    }
                    try {
                      addLimitOrder({
                        tokenAddress,
                        side: activeTradeType,
                        priceMode: limitPriceMode,
                        targetPrice: target,
                        amount,
                        walletAddresses: filterActiveWallets(wallets).map((w) => w.address),
                        solPriceAtCreation: solPrice || 0,
                        marketCapAtCreation: currentMarketCap,
                      });
                      showToast(`Limit ${activeTradeType} order set`, "success");
                      setLimitPrice("");
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : "Failed to set limit order", "error");
                    }
                    return;
                  }
                  // Market order
                  let finalBuyAmount = buyAmount;
                  if (activeTradeType === "buy" && buyInputMode === "cumulative") {
                    const activeCount = filterActiveWallets(wallets).length;
                    if (activeCount > 0) {
                      finalBuyAmount = String(parseFloat(buyAmount) / activeCount);
                    }
                  }
                  handleTradeSubmit(
                    wallets,
                    activeTradeType === "buy",
                    selectedDex,
                    activeTradeType === "buy" ? finalBuyAmount : undefined,
                    activeTradeType === "sell" ? sellAmount : undefined,
                    undefined,
                    activeTradeType === "sell" ? sellInputMode : undefined,
                  );
                }}
                disabled={
                  !selectedDex ||
                  (!buyAmount && !sellAmount) ||
                  !tokenAddress ||
                  (orderType === "limit" && !limitPrice)
                }
                className={`px-4 py-2 text-sm font-mono tracking-wider rounded-lg
                     transition-all duration-300 relative overflow-hidden whitespace-nowrap
                     disabled:opacity-50 disabled:cursor-not-allowed ${
                       activeTradeType === "buy"
                         ? "bg-gradient-to-r from-app-primary-color to-app-primary-dark hover-from-app-primary-dark hover-to-app-primary-darker text-black font-medium shadow-md shadow-app-primary-40 hover-shadow-app-primary-60 disabled:from-app-primary-40 disabled:to-app-primary-40 disabled:shadow-none"
                         : "bg-gradient-to-r from-[#ff3232] to-[#e62929] hover:from-[#e62929] hover:to-[#cc2020] text-white font-medium shadow-md shadow-[#ff323240] hover:shadow-[#ff323260] disabled:from-[#ff323240] disabled:to-[#ff323240] disabled:shadow-none"
                     }`}
              >
                {orderType === "limit" ? "SET LIMIT" : getButtonText()}
              </button>
            </div>

            {/* Limit order price controls */}
            {orderType === "limit" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLimitInputMode(limitInputMode === "custom" ? "slider" : "custom")}
                    className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                      limitInputMode === "custom"
                        ? "bg-app-primary-color text-black border-app-primary-color font-medium"
                        : "border-app-primary-30 text-app-secondary-60 hover:text-app-primary"
                    }`}
                  >
                    CUSTOM
                  </button>
                  <span className="text-[9px] text-app-secondary-60 font-mono ml-auto">
                    now: {currentMarketCap ? `$${formatCompact(currentMarketCap)}` : "—"}
                  </span>
                </div>

                {limitInputMode === "custom" ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder={limitPriceMode === "marketCap" ? "50000" : "0.00005"}
                      className="w-full px-2 py-1.5 bg-app-primary-80-alpha border border-app-primary-40 rounded-lg
                           text-app-primary placeholder-app-secondary-60 font-mono text-sm
                           focus:outline-none focus-border-primary focus:ring-1 focus:ring-app-primary-40
                           transition-all duration-300 shadow-inner-black-80 pr-10"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-app-secondary-60 font-mono">
                      USD
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-app-secondary-60 px-0.5">
                      <span>-99%</span>
                      <span className={`font-medium ${limitSliderPct === 0 ? "text-app-primary" : limitSliderPct > 0 ? "text-app-primary-color" : "text-error-alt"}`}>
                        {limitSliderPct > 0 ? "+" : ""}{limitSliderPct}%
                        {limitPrice && (
                          <span className="text-app-secondary-60 ml-1">
                            (${formatCompact(parseFloat(limitPrice) || 0)})
                          </span>
                        )}
                      </span>
                      <span>+200%</span>
                    </div>
                    <input
                      type="range"
                      min={-99}
                      max={200}
                      step={1}
                      value={limitSliderPct}
                      onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                      className="market-cap-slider"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {/* Instant trade / detach floating card button */}
              <button
                onClick={onOpenFloating}
                className="px-2 py-0.5 text-[9px] font-mono font-medium tracking-wider rounded
                     bg-gradient-to-r from-app-primary-color/20 to-app-primary-dark/20
                     border border-app-primary-color/40 text-app-primary-color
                     hover:from-app-primary-color/30 hover:to-app-primary-dark/30
                     hover:border-app-primary-color/60 hover:shadow-[0_0_8px_rgba(var(--primary-rgb),0.25)]
                     transition-all duration-200 cursor-pointer"
                title="Detach to floating card"
              >
                INSTANT TRADE
              </button>
              <div className="flex-1" />
              <div className="flex items-center gap-0.5 bg-app-primary-80-alpha rounded px-1.5 py-0.5 border border-app-primary-30">
                <span className="text-[10px] text-app-secondary-60 font-mono">SLIP</span>
                <input
                  type="text"
                  value={config.slippageBps ? (parseFloat(config.slippageBps) / 100).toFixed(0) : "99"}
                  onChange={(e) => {
                    const pct = parseFloat(e.target.value.replace(/[^0-9.]/g, ""));
                    if (!isNaN(pct)) {
                      setConfig({ ...config, slippageBps: Math.round(pct * 100).toString() });
                    }
                  }}
                  className="w-7 bg-transparent text-[10px] text-app-primary font-mono text-right focus:outline-none"
                />
                <span className="text-[10px] text-app-secondary-60 font-mono">%</span>
              </div>
              <div className="flex items-center gap-0.5 bg-app-primary-80-alpha rounded px-1.5 py-0.5 border border-app-primary-30">
                <span className="text-[10px] text-app-secondary-60 font-mono">FEE</span>
                <input
                  type="text"
                  value={config.transactionFee || "0.005"}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    setConfig({ ...config, transactionFee: val });
                  }}
                  onBlur={() => {
                    const num = parseFloat(config.transactionFee || "0");
                    if (isNaN(num) || num < 0.001) {
                      setConfig({ ...config, transactionFee: "0.001" });
                    }
                  }}
                  className="w-10 bg-transparent text-[10px] text-app-primary font-mono text-right focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Preset tabs & buttons — market orders only */}
          {orderType === "market" && (
            <>
              <div className="flex gap-1 mb-2">
                {presetTabs.map((tab: PresetTab) => (
                  <TabButton
                    key={tab.id}
                    label={tab.label}
                    isActive={tab.id === activeTabId}
                    isEditMode={isEditMode}
                    onClick={() => handleTabSwitch(tab.id)}
                    onEdit={(newLabel) =>
                      handleEditTabLabel(tab.id, newLabel)
                    }
                  />
                ))}
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    isEditMode
                      ? "bg-app-primary-color hover:bg-app-primary-dark text-black"
                      : "bg-app-primary-60 border border-app-primary-40 color-primary hover-bg-primary-20"
                  }`}
                  title={isEditMode ? "Save changes" : "Edit presets"}
                >
                  {isEditMode ? <Check size={12} /> : <Edit3 size={12} />}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {(activeTradeType === "buy"
                  ? activeTab.buyPresets
                  : activeTab.sellPresets
                ).map((preset: string, index: number) => (
                  <PresetButton
                    key={`${activeTradeType}-${index}`}
                    value={preset}
                    onExecute={(amount) => handlePresetClick(amount)}
                    onChange={(newValue) => {
                      if (activeTradeType === "buy") {
                        handleEditBuyPreset(index, newValue);
                      } else {
                        handleEditSellPreset(index, newValue);
                      }
                    }}
                    isLoading={isLoading}
                    variant={activeTradeType}
                    isEditMode={isEditMode}
                    index={index}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-app-secondary-60 text-sm font-mono tracking-wider">
            TRADING INTERFACE IS OPEN IN FLOATING MODE
          </p>
        </div>
      )}
    </div>
  );
};

export default TradingCard;
