import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  X,
  RefreshCw,
  Plus,
  Key,
  Command,
  Layers,
  ChevronDown,
  Zap,
  Settings,
} from "lucide-react";
import type {
  WalletCategory,
  CategoryQuickTradeSettings,
  WalletGroup,
} from "../../utils/types";

export interface WalletsHeaderProps {
  // Search
  searchTerm: string;
  onSearchChange: (term: string) => void;
  // Stats
  walletCount: number;
  totalBalance: string;
  // Actions
  onRefresh: () => void;
  isRefreshing: boolean;
  onCreateWallet: () => void;
  onImportWallet: () => void;
  onOpenCommandPalette: () => void;
  onOpenGroupDrawer: () => void;
  // QuickTrade
  categorySettings: Record<WalletCategory, CategoryQuickTradeSettings>;
  onUpdateCategorySettings: (settings: Record<WalletCategory, CategoryQuickTradeSettings>) => void;
  onOpenQuickTradeSettings: () => void;
  // Group indicator
  groups: WalletGroup[];
  activeGroupId: string;
  onGroupChange: (groupId: string) => void;
  // Connection
  isConnected: boolean;
}

const categories: WalletCategory[] = ["Soft", "Medium", "Hard"];

const categoryStyles = {
  Soft: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    hoverBg: "hover:bg-emerald-500/20",
  },
  Medium: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    hoverBg: "hover:bg-amber-500/20",
  },
  Hard: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-400",
    hoverBg: "hover:bg-rose-500/20",
  },
};

export const WalletsHeader: React.FC<WalletsHeaderProps> = ({
  searchTerm,
  onSearchChange,
  walletCount,
  totalBalance,
  onRefresh,
  isRefreshing,
  onCreateWallet,
  onImportWallet,
  onOpenCommandPalette,
  onOpenGroupDrawer,
  categorySettings,
  onUpdateCategorySettings: _onUpdateCategorySettings,
  onOpenQuickTradeSettings,
  groups,
  activeGroupId,
  onGroupChange,
  isConnected,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<WalletCategory | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeGroup = activeGroupId === "all" ? null : groups.find((g) => g.id === activeGroupId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExpandedCategory(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatBuyDisplay = (settings: CategoryQuickTradeSettings): string => {
    if (settings.useBuyRange) {
      return `${settings.buyMinAmount.toFixed(2)}-${settings.buyMaxAmount.toFixed(2)}`;
    }
    return settings.buyAmount.toFixed(2);
  };

  const formatSellDisplay = (settings: CategoryQuickTradeSettings): string => {
    if (settings.useSellRange) {
      return `${settings.sellMinPercentage}-${settings.sellMaxPercentage}%`;
    }
    return `${settings.sellPercentage}%`;
  };

  return (
    <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-app-primary-15 bg-app-primary/80 backdrop-blur-sm">
      {/* Search */}
      <div
        className={`relative transition-all duration-200 ${
          isSearchFocused ? "w-64" : "w-48"
        }`}
      >
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-app-secondary-40"
        />
        <input
          type="text"
          placeholder="Search wallets..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className="w-full bg-app-quaternary border border-app-primary-20 hover:border-app-primary-30 focus:border-app-primary-color rounded-lg pl-9 pr-8 py-2 text-sm text-app-primary placeholder:text-app-secondary-40 focus:outline-none transition-all font-mono"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-app-primary-10 rounded transition-colors"
          >
            <X size={12} className="text-app-secondary-40" />
          </button>
        )}
      </div>

      {/* Quick Stats - hidden on small screens */}
      <div className="hidden md:flex items-center gap-4 px-3 py-1.5 bg-app-quaternary/50 rounded-lg border border-app-primary-15">
        <div className="flex items-center gap-2">
          <span className="text-xs text-app-secondary-60">Wallets</span>
          <span className="text-sm font-bold color-primary font-mono">{walletCount}</span>
        </div>
        <div className="w-px h-4 bg-app-primary-15" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-app-secondary-60">Balance</span>
          <span className="text-sm font-bold text-yellow-400 font-mono">{totalBalance}</span>
        </div>
      </div>

      {/* QuickTrade Pills */}
      <div className="relative hidden lg:block" ref={dropdownRef}>
        <div className="flex items-center gap-1.5">
          <Zap size={14} className="color-primary flex-shrink-0" />
          <div className="flex items-center gap-1">
            {categories.map((category) => {
              const settings = categorySettings[category];
              const styles = categoryStyles[category];
              const isExpanded = expandedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all duration-200
                    ${styles.bg} ${styles.border} ${styles.hoverBg}
                    ${isExpanded ? "ring-1 ring-current" : ""}`}
                >
                  <span className={`text-[10px] font-bold uppercase ${styles.text}`}>
                    {category[0]}
                  </span>
                  <span className="text-[10px] font-mono text-app-secondary-60">
                    {formatBuyDisplay(settings)}
                  </span>
                  <span className="text-app-secondary-30 text-[9px]">/</span>
                  <span className="text-[10px] font-mono text-app-secondary-60">
                    {formatSellDisplay(settings)}
                  </span>
                  <ChevronDown
                    size={10}
                    className={`${styles.text} transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>
              );
            })}
          </div>
          <button
            onClick={onOpenQuickTradeSettings}
            className="p-1.5 hover:bg-app-quaternary rounded-lg transition-colors"
            title="Full Settings"
          >
            <Settings size={14} className="text-app-secondary-60" />
          </button>
        </div>

        {/* Expanded Quick Settings */}
        {expandedCategory && (
          <div className="absolute top-full left-0 mt-2 z-30 p-4 rounded-xl border shadow-xl bg-app-primary min-w-[280px]"
            style={{ borderColor: `var(--${expandedCategory.toLowerCase()}-color, #333)` }}
          >
            <h4 className={`text-sm font-bold mb-3 ${categoryStyles[expandedCategory].text}`}>
              {expandedCategory} Mode
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-app-secondary-60 uppercase">Buy (SOL)</label>
                <div className="mt-1 font-mono text-sm text-app-primary">
                  {formatBuyDisplay(categorySettings[expandedCategory])}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-app-secondary-60 uppercase">Sell</label>
                <div className="mt-1 font-mono text-sm text-app-primary">
                  {formatSellDisplay(categorySettings[expandedCategory])}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onOpenQuickTradeSettings();
                setExpandedCategory(null);
              }}
              className="mt-3 w-full text-xs text-app-secondary-60 hover:text-app-primary transition-colors"
            >
              Edit full settings...
            </button>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Active Group Chip */}
      {activeGroup && (
        <button
          onClick={() => onGroupChange("all")}
          className="flex items-center gap-2 px-2.5 py-1.5 bg-app-quaternary rounded-lg border border-app-primary-20 hover:border-app-primary-30 transition-colors"
        >
          {activeGroup.color && (
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activeGroup.color }}
            />
          )}
          <span className="text-xs font-medium text-app-primary">{activeGroup.name}</span>
          <X size={12} className="text-app-secondary-40" />
        </button>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5">
        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={!isConnected || isRefreshing}
          className={`p-2 rounded-lg transition-colors ${
            isRefreshing
              ? "bg-app-quaternary text-app-secondary-40"
              : "hover:bg-app-quaternary text-app-secondary-60 hover:text-app-primary"
          }`}
          title="Refresh balances"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
        </button>

        {/* Groups Drawer */}
        <button
          onClick={onOpenGroupDrawer}
          className="p-2 rounded-lg hover:bg-app-quaternary text-app-secondary-60 hover:text-app-primary transition-colors"
          title="Groups & Master Wallets"
        >
          <Layers size={16} />
        </button>

        {/* Command Palette */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-app-quaternary text-app-secondary-60 hover:text-app-primary border border-app-primary-20 transition-colors"
          title="Open command palette (Ctrl+K)"
        >
          <Command size={14} />
          <span className="text-xs font-mono">K</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-app-primary-15 mx-1" />

        {/* Create */}
        <button
          onClick={onCreateWallet}
          disabled={!isConnected}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
            isConnected
              ? "bg-app-primary-color hover:brightness-110 text-app-quaternary"
              : "bg-app-quaternary text-app-secondary-40 cursor-not-allowed"
          }`}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span className="hidden sm:inline">Create</span>
        </button>

        {/* Import */}
        <button
          onClick={onImportWallet}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary-30 text-app-primary transition-all"
        >
          <Key size={16} />
          <span className="hidden sm:inline">Import</span>
        </button>
      </div>
    </header>
  );
};
