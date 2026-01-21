import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Loader2, X, Move, Edit3, Check, Zap } from "lucide-react";
import { toggleWallet, getWalletDisplayName } from "../utils/wallet";
import { saveWalletsToCookies } from "../utils/storage";
import { formatTokenBalance } from "../utils/formatting";
import type { WalletType } from "../utils/types";

// Hook to detect mobile viewport
const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

interface PresetButtonProps {
  value: string;
  onExecute: (amount: string) => void;
  onChange: (newValue: string) => void;
  isLoading: boolean;
  variant?: "buy" | "sell";
  isEditMode: boolean;
  index?: number;
}

// Preset Button component
const PresetButton = React.memo<PresetButtonProps>(
  ({ value, onExecute, onChange, isLoading, variant = "buy", isEditMode }) => {
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef(null);

    useEffect(() => {
      setEditValue(value);
    }, [value]);

    useEffect(() => {
      if (isEditMode && inputRef.current) {
        (inputRef.current as HTMLInputElement)?.focus();
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
                   bg-app-primary text-app-primary border-app-primary
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
          />
        </div>
      );
    }

    return (
      <button
        onClick={() => onExecute(value)}
        className={`relative group px-3 py-3 md:px-2 md:py-1.5 text-sm md:text-xs font-mono rounded border transition-all duration-200
                min-w-[48px] min-h-[48px] md:min-h-[32px] h-auto md:h-8 flex items-center justify-center
                ${
                  variant === "buy"
                    ? "bg-app-primary-60 border-app-primary-40 color-primary hover:bg-primary-20 hover-border-primary"
                    : "bg-app-primary-60 border-error-alt-40 text-error-alt hover:bg-error-20 hover:border-error-alt"
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
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    const handleEdit = (): void => {
      if (isEditMode) {
        setIsEditing(true);
        setEditValue(label);
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
                   bg-app-primary text-app-primary border border-app-primary
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
          />
        </div>
      );
    }

    return (
      <button
        onClick={isEditMode ? handleEdit : onClick}
        className={`flex-1 px-3 py-1.5 text-xs font-mono rounded transition-all duration-200
                ${
                  isActive
                    ? "bg-primary-20 border border-app-primary color-primary"
                    : "bg-app-primary-60 border border-app-primary-20 text-app-secondary-60 hover-border-primary-40 hover:text-app-secondary"
                }
                ${isEditMode ? "cursor-text" : "cursor-pointer"}`}
      >
        {label}
      </button>
    );
  },
);
TabButton.displayName = "TabButton";

// Wallet Selector Popup Component for FloatingTradingCard
interface FloatingWalletSelectorProps {
  wallets: WalletType[];
  baseCurrencyBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  anchorRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
  onToggleWallet: (id: number) => void;
  onSelectAll: () => void;
  onSelectAllWithBalance: () => void;
}

const FloatingWalletSelector: React.FC<FloatingWalletSelectorProps> = ({
  wallets,
  baseCurrencyBalances,
  tokenBalances,
  anchorRef,
  onClose,
  onToggleWallet,
  onSelectAll,
  onSelectAllWithBalance,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Calculate position based on button location
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [anchorRef]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={popupRef}
      className="fixed z-[10000]"
      style={{
        top: position.top,
        right: position.right,
      }}
    >
      <div className="bg-app-primary border border-app-primary-40 rounded-lg shadow-xl shadow-black-80 min-w-[320px] max-h-[400px] overflow-hidden">
        {/* Header with Select All buttons */}
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
            Select All with Balance
          </button>
        </div>

        {/* Wallet List */}
        <div className="overflow-y-auto max-h-[340px]">
          {wallets
            .filter((w) => !w.isArchived)
            .map((wallet) => {
              const solBal = baseCurrencyBalances.get(wallet.address) || 0;
              const tokenBal = tokenBalances.get(wallet.address) || 0;

              return (
                <div
                  key={wallet.id}
                  onClick={() => onToggleWallet(wallet.id)}
                  className={`
                  flex items-center justify-between px-3 py-2 cursor-pointer transition-all duration-200
                  border-b border-app-primary-20 last:border-b-0
                  ${
                    wallet.isActive
                      ? "bg-primary-20 border-l-2 border-l-primary"
                      : "hover:bg-app-primary-60"
                  }
                `}
                >
                  {/* Selection indicator & wallet info */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Selection checkbox */}
                    <div
                      className={`
                    w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                    ${
                      wallet.isActive
                        ? "bg-app-primary-color border-app-primary-color"
                        : "bg-transparent border-app-primary-40"
                    }
                  `}
                    >
                      {wallet.isActive && (
                        <Check size={10} className="text-black" />
                      )}
                    </div>

                    {/* Wallet name and address */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className={`text-xs font-mono truncate ${wallet.isActive ? "text-app-primary" : "text-app-secondary"}`}
                      >
                        {getWalletDisplayName(wallet)}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-app-secondary-60">
                        <Zap size={8} className="text-app-secondary-40" />
                        <span>Off</span>
                        <span className="text-app-primary-40">
                          {wallet.address.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Balances */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* SOL Balance */}
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-3 bg-gradient-to-b from-[#9945FF] to-[#14F195] rounded-sm"></div>
                      <span
                        className={`text-xs font-mono ${solBal > 0 ? "text-app-primary" : "text-app-secondary-60"}`}
                      >
                        {solBal.toFixed(3)}
                      </span>
                    </div>

                    {/* Token Balance */}
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-3 bg-app-primary-color rounded-sm"></div>
                      <span
                        className={`text-xs font-mono ${tokenBal > 0 ? "color-primary" : "text-app-secondary-60"}`}
                      >
                        {formatTokenBalance(tokenBal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

interface FloatingTradingCardProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  isDragging: boolean;
  onDraggingChange: (dragging: boolean) => void;
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
    dex?: string,
    buyAmount?: string,
    sellAmount?: string,
  ) => void;
  isLoading: boolean;
  countActiveWallets: (wallets: WalletType[]) => number;
  currentMarketCap: number | null;
  baseCurrencyBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
}

const FloatingTradingCard: React.FC<FloatingTradingCardProps> = ({
  isOpen,
  onClose,
  position,
  onPositionChange,
  isDragging,
  onDraggingChange,
  wallets,
  setWallets,
  selectedDex,
  setBuyAmount,
  setSellAmount,
  handleTradeSubmit,
  isLoading,
  countActiveWallets,
  baseCurrencyBalances,
  tokenBalances,
}) => {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [manualProtocol] = useState<string | null>(null);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const isMobile = useIsMobile();

  const cardRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const walletButtonRef = useRef<HTMLButtonElement>(null);

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
      const solBal = baseCurrencyBalances.get(wallet.address) || 0;
      const tokenBal = tokenBalances.get(wallet.address) || 0;
      return solBal > 0 || tokenBal > 0;
    });

    if (walletsWithBalance.length === 0) {
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
  };

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
          activeTabId:
            typeof parsed.activeTabId === "string"
              ? parsed.activeTabId
              : "degen",
        };
      }
    } catch (error) {
      console.error("Error loading presets from cookies:", error);
    }
    return {
      tabs: defaultPresetTabs,
      activeTabId: "degen",
    };
  };

  // Save presets to cookies
  const savePresetsToCookies = useCallback(
    (tabs: PresetTab[], activeTabId: string): void => {
      try {
        const presetsData = {
          tabs,
          activeTabId,
        };
        const encoded = encodeURIComponent(JSON.stringify(presetsData));
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1); // 1 year expiry
        document.cookie = `tradingPresets=${encoded}; expires=${expires.toUTCString()}; path=/`;
      } catch (error) {
        console.error("Error saving presets to cookies:", error);
      }
    },
    [],
  );

  // Initialize presets from cookies
  const initialPresets = loadPresetsFromCookies();
  const [presetTabs, setPresetTabs] = useState<PresetTab[]>(
    initialPresets.tabs,
  );
  const [activeTabId, setActiveTabId] = useState<string>(
    initialPresets.activeTabId,
  );
  const activeTab =
    presetTabs.find((tab: PresetTab) => tab.id === activeTabId) ||
    presetTabs[0];

  // Save presets to cookies whenever they change
  useEffect(() => {
    savePresetsToCookies(presetTabs, activeTabId);
  }, [presetTabs, activeTabId, savePresetsToCookies]);

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

  // Handle trade submission
  const handleTrade = useCallback(
    (amount: string, isBuy: boolean): void => {
      const dexToUse = manualProtocol || selectedDex;

      // Set the amount in parent state and call handleTradeSubmit with the specific amount
      if (isBuy) {
        setBuyAmount(amount);
        // Pass the amount directly to avoid using stale state values
        handleTradeSubmit(wallets, isBuy, dexToUse, amount, undefined);
      } else {
        setSellAmount(amount);
        // Pass the amount directly to avoid using stale state values
        handleTradeSubmit(wallets, isBuy, dexToUse, undefined, amount);
      }
    },
    [
      manualProtocol,
      selectedDex,
      wallets,
      setBuyAmount,
      setSellAmount,
      handleTradeSubmit,
    ],
  );

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent): void => {
    if (!dragHandleRef.current?.contains(e.target as Node)) return;

    e.preventDefault(); // Prevent text selection during drag
    e.stopPropagation(); // Prevent event bubbling

    onDraggingChange(true);
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent): void => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Constrain to viewport
      const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 0);

      onPositionChange({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    },
    [isDragging, dragOffset.x, dragOffset.y, onPositionChange],
  );

  const handleMouseUp = React.useCallback((): void => {
    onDraggingChange(false);
  }, [onDraggingChange]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  const content = isMobile ? (
    // Mobile: Bottom sheet style
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black-70 z-[9998] md:hidden"
        onClick={onClose}
      />
      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden mobile-bottom-sheet"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
        }}
      >
        <div className="relative overflow-hidden bg-app-primary-99 backdrop-blur-md border-t border-app-primary-30 shadow-lg shadow-black-80 rounded-t-2xl">
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-app-primary-40 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono color-primary font-semibold">
                QUICK TRADE
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Wallet Selector Button - Mobile */}
              <button
                ref={walletButtonRef}
                onClick={() => setShowWalletSelector(!showWalletSelector)}
                className="flex items-center gap-1 px-3 py-2 rounded hover:bg-app-primary-20 transition-colors min-h-[44px]"
              >
                <span className="text-xs font-mono color-primary font-semibold">
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

              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`p-2 rounded transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center
                            ${
                              isEditMode
                                ? "bg-primary-20 border border-app-primary color-primary"
                                : "hover:bg-primary-20 text-app-secondary-60 hover:color-primary"
                            }`}
              >
                {isEditMode ? <Check size={16} /> : <Edit3 size={16} />}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded hover:bg-primary-20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X
                  size={18}
                  className="text-app-secondary-60 hover:color-primary"
                />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
            {/* Preset Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {presetTabs.map((tab: PresetTab) => (
                <TabButton
                  key={tab.id}
                  label={tab.label}
                  isActive={activeTabId === tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  onEdit={(newLabel) => handleEditTabLabel(tab.id, newLabel)}
                  isEditMode={isEditMode}
                />
              ))}
            </div>

            {/* Trading Interface */}
            <div className="space-y-6">
              {/* Buy Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-mono color-primary font-semibold">
                    BUY
                  </span>
                  <span className="text-xs text-app-secondary-60 font-mono">
                    SOL/wallet
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {activeTab.buyPresets.map((preset: string, index: number) => (
                    <PresetButton
                      key={index}
                      value={preset}
                      onExecute={(amount) => handleTrade(amount, true)}
                      onChange={(newValue) =>
                        handleEditBuyPreset(index, newValue)
                      }
                      isLoading={isLoading}
                      variant="buy"
                      isEditMode={isEditMode}
                      index={index}
                    />
                  ))}
                </div>
              </div>

              {/* Sell Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-mono text-error-alt font-semibold">
                    SELL
                  </span>
                  <span className="text-xs text-error-alt-60 font-mono">
                    % tokens
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {activeTab.sellPresets.map(
                    (preset: string, index: number) => (
                      <PresetButton
                        key={index}
                        value={preset}
                        onExecute={(amount) => handleTrade(amount, false)}
                        onChange={(newValue) =>
                          handleEditSellPreset(index, newValue)
                        }
                        isLoading={isLoading}
                        variant="sell"
                        isEditMode={isEditMode}
                        index={index}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : (
    // Desktop: Floating card (original behavior)
    <div
      ref={cardRef}
      className="fixed z-[9999] select-none hidden md:block"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "default",
        pointerEvents: "auto",
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="relative overflow-hidden p-4 rounded-lg w-80 max-w-[90vw] bg-app-primary-99 backdrop-blur-md border border-app-primary-30 shadow-lg shadow-black-80">
        {/* Header with Edit Button */}
        <div className="flex items-center justify-between mb-3">
          <div
            ref={dragHandleRef}
            className="flex items-center gap-2 cursor-grab active:cursor-grabbing px-2 py-1 hover:bg-app-primary-20 rounded transition-colors"
            title="Drag to move"
          >
            <Move size={14} className="text-app-secondary-60" />
            <span className="text-xs font-mono text-app-secondary-60 uppercase">
              Quick Trade
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Wallet Selector Button */}
            <button
              ref={walletButtonRef}
              onClick={() => setShowWalletSelector(!showWalletSelector)}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-app-primary-20 transition-colors"
            >
              <span className="text-[10px] font-mono color-primary font-semibold">
                {countActiveWallets(wallets)}
              </span>
              <svg
                width="14"
                height="14"
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

            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-1.5 rounded transition-all duration-200
                        ${
                          isEditMode
                            ? "bg-primary-20 border border-app-primary color-primary"
                            : "hover:bg-primary-20 text-app-secondary-60 hover:color-primary"
                        }`}
            >
              {isEditMode ? <Check size={12} /> : <Edit3 size={12} />}
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-primary-20 transition-colors"
            >
              <X
                size={14}
                className="text-app-secondary-60 hover:color-primary"
              />
            </button>
          </div>
        </div>

        {/* Preset Tabs */}
        <div className="flex gap-1 mb-4">
          {presetTabs.map((tab: PresetTab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              isActive={activeTabId === tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              onEdit={(newLabel) => handleEditTabLabel(tab.id, newLabel)}
              isEditMode={isEditMode}
            />
          ))}
        </div>

        {/* Trading Interface - Preset Only */}
        <div className="space-y-4 relative z-10">
          {/* Buy Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono color-primary">BUY</span>
              <span className="text-xs text-app-secondary-60 font-mono">
                SOL/wallet
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {activeTab.buyPresets.map((preset: string, index: number) => (
                <PresetButton
                  key={index}
                  value={preset}
                  onExecute={(amount) => handleTrade(amount, true)}
                  onChange={(newValue) => handleEditBuyPreset(index, newValue)}
                  isLoading={isLoading}
                  variant="buy"
                  isEditMode={isEditMode}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Sell Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-error-alt">SELL</span>
              <span className="text-xs text-error-alt-60 font-mono">
                % tokens
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {activeTab.sellPresets.map((preset: string, index: number) => (
                <PresetButton
                  key={index}
                  value={preset}
                  onExecute={(amount) => handleTrade(amount, false)}
                  onChange={(newValue) => handleEditSellPreset(index, newValue)}
                  isLoading={isLoading}
                  variant="sell"
                  isEditMode={isEditMode}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render to document.body using portal to ensure it floats above everything
  return (
    <>
      {createPortal(content, document.body)}
      {showWalletSelector &&
        createPortal(
          <FloatingWalletSelector
            wallets={wallets}
            baseCurrencyBalances={baseCurrencyBalances}
            tokenBalances={tokenBalances}
            anchorRef={walletButtonRef}
            onClose={() => setShowWalletSelector(false)}
            onToggleWallet={handleToggleWallet}
            onSelectAll={handleSelectAll}
            onSelectAllWithBalance={handleSelectAllWithBalance}
          />,
          document.body,
        )}
    </>
  );
};

export default FloatingTradingCard;
