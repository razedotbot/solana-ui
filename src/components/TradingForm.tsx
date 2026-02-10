import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Loader2, Move, Edit3, Check } from "lucide-react";
import { useToast } from "../utils/hooks";
import { useAppContext } from "../contexts";
import { filterActiveWallets, toggleWallet } from "../utils/wallet";
import { saveWalletsToCookies } from "../utils/storage";
import WalletSelectorPopup from "./WalletSelectorPopup";
import type { WalletType } from "../utils/types";
import type { BaseCurrencyConfig } from "../utils/constants";

interface PresetButtonProps {
  value: string;
  onExecute: () => void;
  onChange: (newValue: string) => void;
  isLoading: boolean;
  variant?: "buy" | "sell";
  isEditMode: boolean;
  index: number;
}

// Preset Button component
const PresetButton = React.memo<PresetButtonProps>(
  ({ value, onExecute, onChange, isLoading, variant = "buy", isEditMode }) => {
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
      if (e.key === "Enter") {
        const newValue = parseFloat(editValue);
        if (!isNaN(newValue) && newValue > 0) {
          onChange(newValue.toString());
        }
      } else if (e.key === "Escape") {
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
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) =>
              setEditValue(e.target.value.replace(/[^0-9.]/g, ""))
            }
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full h-8 px-2 text-xs font-mono rounded border text-center
                   bg-app-primary text-app-primary border-app-primary-color
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
          />
        </div>
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
                  variant === "buy"
                    ? "bg-app-primary-60 border-app-primary-40 color-primary hover-bg-primary-20 hover-border-primary"
                    : "bg-app-primary-60 border-error-alt-40 text-error-alt hover-bg-error-30 hover-border-error-alt"
                }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" />
            <span>{value}</span>
          </div>
        ) : (
          value
        )}
      </button>
    );
  },
);
PresetButton.displayName = "PresetButton";

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  onEdit: (newLabel: string) => void;
  isEditMode: boolean;
}

// Tab Button component
const TabButton = React.memo<TabButtonProps>(
  ({ label, isActive, onClick, onEdit, isEditMode }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(label);
    const inputRef = useRef(null);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        (inputRef.current as HTMLInputElement).focus();
        (inputRef.current as HTMLInputElement).select();
      }
    }, [isEditing]);

    const handleClick = (): void => {
      if (isEditMode) {
        setIsEditing(true);
        setEditValue(label);
      } else {
        onClick();
      }
    };

    const handleSave = (): void => {
      if (editValue.trim()) {
        onEdit(editValue.trim());
      }
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        setEditValue(label);
        setIsEditing(false);
      }
    };

    if (isEditing) {
      return (
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full px-2 py-1 text-xs font-mono rounded
                   bg-app-primary text-app-primary border border-app-primary-color
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
          />
        </div>
      );
    }

    return (
      <button
        onClick={handleClick}
        className={`flex-1 px-3 py-1.5 text-xs font-mono rounded transition-all duration-200
                ${
                  isActive
                    ? "bg-primary-20 border border-app-primary-80 color-primary"
                    : "bg-app-primary-60 border border-app-primary-40 text-app-secondary-60 hover-border-primary-40 hover-text-app-secondary"
                }
                ${isEditMode ? "cursor-text" : "cursor-pointer"}`}
      >
        {label}
      </button>
    );
  },
);
TabButton.displayName = "TabButton";

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
  ) => Promise<void>;
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
  const [isEditMode, setIsEditMode] = useState(false);
  const walletSelectorRef = useRef<HTMLDivElement>(null);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  interface PresetTab {
    id: string;
    label: string;
    buyPresets: string[];
    sellPresets: string[];
  }

  // Default preset tabs
  const defaultPresetTabs: PresetTab[] = [
    {
      id: "degen",
      label: "DEGEN",
      buyPresets: ["0.01", "0.05", "0.1", "0.5"],
      sellPresets: ["25", "50", "75", "100"],
    },
    {
      id: "diamond",
      label: "DIAMOND",
      buyPresets: ["0.001", "0.01", "0.05", "0.1"],
      sellPresets: ["10", "25", "50", "75"],
    },
    {
      id: "yolo",
      label: "YOLO",
      buyPresets: ["0.1", "0.5", "1", "5"],
      sellPresets: ["50", "75", "90", "100"],
    },
  ];

  // Load presets from cookies
  const loadPresetsFromCookies = (): {
    tabs: PresetTab[];
    activeTabId: string;
  } => {
    try {
      const savedPresets = document.cookie
        .split("; ")
        .find((row) => row.startsWith("tradingPresets="))
        ?.split("=")[1];

      if (savedPresets) {
        const decoded = decodeURIComponent(savedPresets);
        const parsed = JSON.parse(decoded) as {
          tabs?: unknown;
          activeTabId?: string;
        };
        return {
          tabs: Array.isArray(parsed.tabs)
            ? (parsed.tabs as PresetTab[])
            : defaultPresetTabs,
          activeTabId: parsed.activeTabId || "degen",
        };
      }
    } catch {
      // Invalid JSON, use defaults
    }
    return {
      tabs: defaultPresetTabs,
      activeTabId: "degen",
    };
  };

  // Save presets to cookies
  const savePresetsToCookies = (
    tabs: PresetTab[],
    activeTabId: string,
  ): void => {
    try {
      const presetsData = {
        tabs,
        activeTabId,
      };
      const encoded = encodeURIComponent(JSON.stringify(presetsData));
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1); // 1 year expiry
      document.cookie = `tradingPresets=${encoded}; expires=${expires.toUTCString()}; path=/`;
    } catch {
      // Cookie save error, ignore
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetTabs, activeTabId]);

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
      void handleTradeSubmit(wallets, true, selectedDex, preset, undefined);
    } else {
      setSellAmount(preset);
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
      const tokenAmount = solAmountNum / avgPrice;
      return { tokenAmount, solAmount: solAmountNum };
    } else if (activeTradeType === "sell" && sellAmount && tokenBalances) {
      // For sell, sellAmount is percentage of tokens
      const sellPercentage = parseFloat(sellAmount) / 100;

      // Calculate total token amount across all active wallets
      const activeWallets = filterActiveWallets(wallets);
      const totalTokenAmount = activeWallets.reduce(
        (sum: number, wallet: WalletType) => {
          return sum + (tokenBalances.get(wallet.address) || 0);
        },
        0,
      );

      const tokenAmountToSell = totalTokenAmount * sellPercentage;
      const solAmount = tokenAmountToSell * avgPrice;
      return { tokenAmount: tokenAmountToSell, solAmount };
    }

    return { tokenAmount: null, solAmount: null };
  }, [
    currentMarketCap,
    solPrice,
    buyAmount,
    sellAmount,
    activeTradeType,
    tokenBalances,
    wallets,
  ]);

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
          {/* Detach Button */}
          <button
            onClick={onOpenFloating}
            className="flex items-center justify-center px-4 py-2 border-r border-app-primary-20 hover:bg-app-primary-20 transition-colors cursor-pointer self-stretch"
            title="Detach"
          >
            <Move size={16} className="color-primary" />
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


      {/* Main Content */}
      {!isFloatingCardOpen ? (
        <div className="p-3 space-y-2">
          {/* Amount Input and Submit Button Row */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono tracking-wider text-app-secondary uppercase">
                {activeTradeType === "buy" ? "SOL" : "PERCENT"}
                <span className="text-[10px] text-app-secondary-60 font-mono ml-1">
                  /WALLET
                </span>
              </label>
              <div className="flex items-center gap-1.5">
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
                    value={config.transactionFee || "0.001"}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      setConfig({ ...config, transactionFee: val });
                    }}
                    className="w-10 bg-transparent text-[10px] text-app-primary font-mono text-right focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={
                    activeTradeType === "buy" ? buyAmount : sellAmount
                  }
                  onChange={handleAmountChange}
                  placeholder="0.0"
                  disabled={!tokenAddress || isLoading}
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
                onClick={() =>
                  handleTradeSubmit(
                    wallets,
                    activeTradeType === "buy",
                    selectedDex,
                    activeTradeType === "buy" ? buyAmount : undefined,
                    activeTradeType === "sell" ? sellAmount : undefined,
                  )
                }
                disabled={
                  !selectedDex ||
                  (!buyAmount && !sellAmount) ||
                  isLoading ||
                  !tokenAddress
                }
                className={`px-4 py-2 text-sm font-mono tracking-wider rounded-lg
                     transition-all duration-300 relative overflow-hidden whitespace-nowrap
                     disabled:opacity-50 disabled:cursor-not-allowed ${
                       activeTradeType === "buy"
                         ? "bg-gradient-to-r from-app-primary-color to-app-primary-dark hover-from-app-primary-dark hover-to-app-primary-darker text-black font-medium shadow-md shadow-app-primary-40 hover-shadow-app-primary-60 disabled:from-app-primary-40 disabled:to-app-primary-40 disabled:shadow-none"
                         : "bg-gradient-to-r from-[#ff3232] to-[#e62929] hover:from-[#e62929] hover:to-[#cc2020] text-white font-medium shadow-md shadow-[#ff323240] hover:shadow-[#ff323260] disabled:from-[#ff323240] disabled:to-[#ff323240] disabled:shadow-none"
                     }`}
              >
                {getButtonText()}
              </button>
            </div>
          </div>

          {/* Preset tabs */}
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

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-1">
            {(activeTradeType === "buy"
              ? activeTab.buyPresets
              : activeTab.sellPresets
            ).map((preset: string, index: number) => (
              <PresetButton
                key={`${activeTradeType}-${index}`}
                value={preset}
                onExecute={() => handlePresetClick(preset)}
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
