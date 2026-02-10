import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Key,
  ChevronDown,
  Zap,
} from "lucide-react";
import type {
  WalletCategory,
  CategoryQuickTradeSettings,
} from "../../utils/types";

export interface WalletsHeaderProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  walletCount: number;
  totalBalance: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  onCreateWallet: () => void;
  onImportWallet: () => void;
  onCreateMasterWallet: () => void;
  onImportMasterWallet: () => void;
  onExportKeys: () => void;
  onCleanup: () => void;
  quickModeSettings: Record<WalletCategory, CategoryQuickTradeSettings>;
  onUpdateQuickMode: (category: WalletCategory, settings: CategoryQuickTradeSettings) => void;
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
  searchTerm: _searchTerm,
  onSearchChange: _onSearchChange,
  walletCount,
  totalBalance,
  onRefresh: _onRefresh,
  isRefreshing: _isRefreshing,
  onCreateWallet,
  onImportWallet,
  onCreateMasterWallet: _onCreateMasterWallet,
  onImportMasterWallet: _onImportMasterWallet,
  onExportKeys: _onExportKeys,
  onCleanup: _onCleanup,
  quickModeSettings,
  onUpdateQuickMode,
  isConnected,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<WalletCategory | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownPortalRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updateDropdownPos = useCallback(() => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, []);

  useEffect(() => {
    if (expandedCategory) {
      updateDropdownPos();
    }
  }, [expandedCategory, updateDropdownPos]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        dropdownPortalRef.current && !dropdownPortalRef.current.contains(event.target as Node)
      ) {
        setExpandedCategory(null);
      } else if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !dropdownPortalRef.current) {
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
    <header className="relative z-20 flex items-center gap-2 px-4 py-3 border-b border-app-primary-15 bg-app-primary/80 backdrop-blur-sm">
      {/* Quick Stats + QuickTrade Pills */}
      <div className="hidden md:flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-1.5 bg-app-quaternary/50 rounded-lg border border-app-primary-15 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-app-secondary-60">Wallets</span>
          <span className="text-sm font-bold color-primary font-mono">{walletCount}</span>
        </div>
        <div className="w-px h-4 bg-app-primary-15 flex-shrink-0" />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="hidden lg:inline text-xs text-app-secondary-60">Balance</span>
          <span className="text-sm font-bold text-yellow-400 font-mono">{totalBalance}</span>
        </div>
        <div className="w-px h-4 bg-app-primary-15" />
        <div className="relative flex items-center gap-1.5" ref={dropdownRef}>
          <Zap size={14} className="color-primary flex-shrink-0" />
          <div className="flex items-center gap-1">
            {categories.map((category) => {
              const settings = quickModeSettings[category];
              const styles = categoryStyles[category];
              const isExpanded = expandedCategory === category;

              return (
                <button
                  key={category}
                  onClick={() => {
                    setExpandedCategory(isExpanded ? null : category);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all duration-200
                    ${styles.bg} ${styles.border} ${styles.hoverBg}
                    ${isExpanded ? "ring-1 ring-current" : ""}`}
                >
                  <span className={`text-[10px] font-bold uppercase ${styles.text}`}>
                    {category[0]}
                  </span>
                  <span className="hidden 2xl:inline text-[10px] font-mono text-app-secondary-60">
                    {formatBuyDisplay(settings)}
                  </span>
                  <span className="hidden 2xl:inline text-app-secondary-30 text-[9px]">/</span>
                  <span className="hidden 2xl:inline text-[10px] font-mono text-app-secondary-60">
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

        </div>
      </div>

      {/* Expanded Quick Settings - Portal */}
      {expandedCategory && createPortal((() => {
        const s = quickModeSettings[expandedCategory];
        const styles = categoryStyles[expandedCategory];
        const update = (field: string, value: number | boolean): void => {
          onUpdateQuickMode(expandedCategory, { ...s, [field]: value });
        };
        return (
          <div
            ref={dropdownPortalRef}
            className="fixed z-[9999] bg-app-primary border border-app-primary-40 rounded-lg shadow-xl shadow-black/80 overflow-hidden min-w-[260px]"
            style={{ top: dropdownPos.top, left: dropdownPos.left }}
          >
            <div className="px-3 py-2 border-b border-app-primary-40 bg-app-primary-60">
              <h4 className={`text-[10px] font-mono font-bold ${styles.text} uppercase`}>
                {expandedCategory} Mode
              </h4>
            </div>
            <div className="p-3">
              {/* Buy */}
              <div className="mb-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-app-secondary uppercase">Buy (SOL)</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.useBuyRange}
                      onChange={(e) => update("useBuyRange", e.target.checked)}
                      className="w-3 h-3 rounded accent-app-primary-color"
                    />
                    <span className="text-[10px] font-mono text-app-secondary-60">Range</span>
                  </label>
                </div>
                {s.useBuyRange ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={s.buyMinAmount}
                      onChange={(e) => update("buyMinAmount", parseFloat(e.target.value) || 0)}
                      step="0.001"
                      min="0.001"
                      className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                    />
                    <span className="text-[10px] text-app-secondary-40 font-mono">-</span>
                    <input
                      type="number"
                      value={s.buyMaxAmount}
                      onChange={(e) => update("buyMaxAmount", parseFloat(e.target.value) || 0)}
                      step="0.001"
                      min="0.001"
                      className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    value={s.buyAmount}
                    onChange={(e) => update("buyAmount", parseFloat(e.target.value) || 0)}
                    step="0.001"
                    min="0.001"
                    className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                  />
                )}
              </div>
              {/* Sell */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-app-secondary uppercase">Sell %</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.useSellRange}
                      onChange={(e) => update("useSellRange", e.target.checked)}
                      className="w-3 h-3 rounded accent-app-primary-color"
                    />
                    <span className="text-[10px] font-mono text-app-secondary-60">Range</span>
                  </label>
                </div>
                {s.useSellRange ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={s.sellMinPercentage}
                      onChange={(e) => update("sellMinPercentage", parseFloat(e.target.value) || 0)}
                      step="1"
                      min="1"
                      max="100"
                      className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                    />
                    <span className="text-[10px] text-app-secondary-40 font-mono">-</span>
                    <input
                      type="number"
                      value={s.sellMaxPercentage}
                      onChange={(e) => update("sellMaxPercentage", parseFloat(e.target.value) || 0)}
                      step="1"
                      min="1"
                      max="100"
                      className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    value={s.sellPercentage}
                    onChange={(e) => update("sellPercentage", parseFloat(e.target.value) || 0)}
                    step="1"
                    min="1"
                    max="100"
                    className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })(), document.body)}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action Buttons */}
      <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 self-stretch">
        {/* Create */}
        <button
          onClick={onCreateWallet}
          disabled={!isConnected}
          className={`flex items-center justify-center gap-1.5 px-3 2xl:px-4 h-full rounded-lg text-sm font-semibold transition-all ${
            isConnected
              ? "bg-app-primary-color hover:brightness-110 text-app-quaternary"
              : "bg-app-quaternary text-app-secondary-40 cursor-not-allowed"
          }`}
          title="Create Wallet"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span className="hidden 2xl:inline">Create</span>
        </button>

        {/* Import */}
        <button
          onClick={onImportWallet}
          className="flex items-center justify-center gap-1.5 px-3 2xl:px-4 h-full rounded-lg text-sm font-medium bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary-30 text-app-primary transition-all"
          title="Import Wallet"
        >
          <Key size={16} />
          <span className="hidden 2xl:inline">Import</span>
        </button>

      </div>
    </header>
  );
};
