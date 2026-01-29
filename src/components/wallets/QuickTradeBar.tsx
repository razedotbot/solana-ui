import React, { useState, useRef, useEffect } from "react";
import { Settings, ChevronDown, DollarSign, TrendingDown, Zap } from "lucide-react";
import type { WalletCategory, CategoryQuickTradeSettings } from "../../utils/types";

interface QuickTradeBarProps {
  categorySettings: Record<WalletCategory, CategoryQuickTradeSettings>;
  onUpdateSettings: (settings: Record<WalletCategory, CategoryQuickTradeSettings>) => void;
  onOpenFullSettings: () => void;
}

const categories: WalletCategory[] = ["Soft", "Medium", "Hard"];

const categoryStyles = {
  Soft: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    hoverBg: "hover:bg-emerald-500/20",
    activeBg: "bg-emerald-500/20",
    icon: "text-emerald-400",
  },
  Medium: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    hoverBg: "hover:bg-amber-500/20",
    activeBg: "bg-amber-500/20",
    icon: "text-amber-400",
  },
  Hard: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-400",
    hoverBg: "hover:bg-rose-500/20",
    activeBg: "bg-rose-500/20",
    icon: "text-rose-400",
  },
};

export const QuickTradeBar: React.FC<QuickTradeBarProps> = ({
  categorySettings,
  onUpdateSettings,
  onOpenFullSettings,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<WalletCategory | null>(null);
  const [editingField, setEditingField] = useState<{ category: WalletCategory; field: string } | null>(null);
  const [tempValue, setTempValue] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExpandedCategory(null);
        setEditingField(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQuickEdit = (category: WalletCategory, field: string, currentValue: number): void => {
    setEditingField({ category, field });
    setTempValue(currentValue.toString());
  };

  const saveQuickEdit = (): void => {
    if (!editingField) return;

    const value = parseFloat(tempValue);
    if (isNaN(value)) {
      setEditingField(null);
      return;
    }

    const newSettings = { ...categorySettings };
    const cat = editingField.category;

    switch (editingField.field) {
      case "buyAmount":
        newSettings[cat] = { ...newSettings[cat], buyAmount: Math.max(0.001, Math.min(10, value)) };
        break;
      case "buyMinAmount":
        newSettings[cat] = { ...newSettings[cat], buyMinAmount: Math.max(0.001, Math.min(10, value)) };
        break;
      case "buyMaxAmount":
        newSettings[cat] = { ...newSettings[cat], buyMaxAmount: Math.max(0.001, Math.min(10, value)) };
        break;
      case "sellPercentage":
        newSettings[cat] = { ...newSettings[cat], sellPercentage: Math.max(1, Math.min(100, Math.round(value))) };
        break;
    }

    onUpdateSettings(newSettings);
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      saveQuickEdit();
    } else if (e.key === "Escape") {
      setEditingField(null);
    }
  };

  const formatBuyDisplay = (settings: CategoryQuickTradeSettings): string => {
    if (settings.useBuyRange) {
      return `${settings.buyMinAmount.toFixed(3)}-${settings.buyMaxAmount.toFixed(3)}`;
    }
    return settings.buyAmount.toFixed(3);
  };

  const formatSellDisplay = (settings: CategoryQuickTradeSettings): string => {
    if (settings.useSellRange) {
      return `${settings.sellMinPercentage}-${settings.sellMaxPercentage}%`;
    }
    return `${settings.sellPercentage}%`;
  };

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      {/* Main Bar */}
      <div className="flex items-center gap-2 p-3 bg-app-secondary/50 border border-app-primary-15 rounded-xl">
        {/* Icon & Title */}
        <div className="flex items-center gap-2 pr-3 border-r border-app-primary-20">
          <Zap size={16} className="color-primary" />
          <span className="text-xs font-semibold text-app-secondary-60 uppercase tracking-wider hidden sm:inline">
            Quick Trade
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto">
          {categories.map((category) => {
            const settings = categorySettings[category];
            const styles = categoryStyles[category];
            const isExpanded = expandedCategory === category;

            return (
              <button
                key={category}
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 min-w-fit
                  ${styles.bg} ${styles.border} ${styles.hoverBg}
                  ${isExpanded ? styles.activeBg + " ring-1 ring-current" : ""}`}
              >
                {/* Category Name */}
                <span className={`text-xs font-bold uppercase ${styles.text}`}>
                  {category}
                </span>

                {/* Quick Stats */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="flex items-center gap-0.5 text-app-secondary-60">
                    <DollarSign size={10} className={styles.icon} />
                    {formatBuyDisplay(settings)}
                  </span>
                  <span className="text-app-secondary-40">|</span>
                  <span className="flex items-center gap-0.5 text-app-secondary-60">
                    <TrendingDown size={10} className={styles.icon} />
                    {formatSellDisplay(settings)}
                  </span>
                </div>

                <ChevronDown
                  size={12}
                  className={`${styles.text} transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>
            );
          })}
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenFullSettings}
          className="p-2 hover:bg-app-quaternary rounded-lg transition-colors flex-shrink-0"
          title="Full Settings"
        >
          <Settings size={16} className="text-app-secondary-60 hover:text-app-primary" />
        </button>
      </div>

      {/* Expanded Dropdown */}
      {expandedCategory && (
        <div className="absolute top-full left-0 right-0 mt-2 z-30 animate-slide-up">
          <div className={`p-4 rounded-xl border shadow-xl bg-app-primary
            ${categoryStyles[expandedCategory].border}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className={`text-sm font-bold ${categoryStyles[expandedCategory].text}`}>
                {expandedCategory} Mode Settings
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Buy Settings */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-app-secondary-60 uppercase">
                  <DollarSign size={14} className={categoryStyles[expandedCategory].icon} />
                  Buy Amount (SOL)
                </div>

                {categorySettings[expandedCategory].useBuyRange ? (
                  <div className="flex items-center gap-2">
                    {editingField?.category === expandedCategory && editingField?.field === "buyMinAmount" ? (
                      <input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={saveQuickEdit}
                        onKeyDown={handleKeyDown}
                        className="w-20 px-2 py-1.5 bg-app-quaternary border border-app-primary-30 rounded text-sm font-mono text-app-primary focus:border-app-primary-color focus:outline-none"
                        autoFocus
                        step="0.001"
                      />
                    ) : (
                      <button
                        onClick={() => handleQuickEdit(expandedCategory, "buyMinAmount", categorySettings[expandedCategory].buyMinAmount)}
                        className="px-3 py-1.5 bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 rounded text-sm font-mono text-app-primary transition-colors"
                      >
                        {categorySettings[expandedCategory].buyMinAmount.toFixed(3)}
                      </button>
                    )}
                    <span className="text-app-secondary-40">to</span>
                    {editingField?.category === expandedCategory && editingField?.field === "buyMaxAmount" ? (
                      <input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={saveQuickEdit}
                        onKeyDown={handleKeyDown}
                        className="w-20 px-2 py-1.5 bg-app-quaternary border border-app-primary-30 rounded text-sm font-mono text-app-primary focus:border-app-primary-color focus:outline-none"
                        autoFocus
                        step="0.001"
                      />
                    ) : (
                      <button
                        onClick={() => handleQuickEdit(expandedCategory, "buyMaxAmount", categorySettings[expandedCategory].buyMaxAmount)}
                        className="px-3 py-1.5 bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 rounded text-sm font-mono text-app-primary transition-colors"
                      >
                        {categorySettings[expandedCategory].buyMaxAmount.toFixed(3)}
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {editingField?.category === expandedCategory && editingField?.field === "buyAmount" ? (
                      <input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        onBlur={saveQuickEdit}
                        onKeyDown={handleKeyDown}
                        className="w-24 px-2 py-1.5 bg-app-quaternary border border-app-primary-30 rounded text-sm font-mono text-app-primary focus:border-app-primary-color focus:outline-none"
                        autoFocus
                        step="0.001"
                      />
                    ) : (
                      <button
                        onClick={() => handleQuickEdit(expandedCategory, "buyAmount", categorySettings[expandedCategory].buyAmount)}
                        className="px-3 py-1.5 bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 rounded text-sm font-mono text-app-primary transition-colors"
                      >
                        {categorySettings[expandedCategory].buyAmount.toFixed(3)} SOL
                      </button>
                    )}
                  </div>
                )}

                {/* Toggle Range */}
                <button
                  onClick={() => {
                    const newSettings = { ...categorySettings };
                    newSettings[expandedCategory] = {
                      ...newSettings[expandedCategory],
                      useBuyRange: !newSettings[expandedCategory].useBuyRange,
                    };
                    onUpdateSettings(newSettings);
                  }}
                  className="text-xs text-app-secondary-60 hover:text-app-primary transition-colors"
                >
                  {categorySettings[expandedCategory].useBuyRange ? "Use fixed amount" : "Use random range"}
                </button>
              </div>

              {/* Sell Settings */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-app-secondary-60 uppercase">
                  <TrendingDown size={14} className={categoryStyles[expandedCategory].icon} />
                  Sell Percentage
                </div>

                {categorySettings[expandedCategory].useSellRange ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newSettings = { ...categorySettings };
                        const current = newSettings[expandedCategory].sellMinPercentage;
                        newSettings[expandedCategory] = {
                          ...newSettings[expandedCategory],
                          sellMinPercentage: Math.max(1, current - 10),
                        };
                        onUpdateSettings(newSettings);
                      }}
                      className="px-3 py-1.5 bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 rounded text-sm font-mono text-app-primary transition-colors"
                    >
                      {categorySettings[expandedCategory].sellMinPercentage}%
                    </button>
                    <span className="text-app-secondary-40">to</span>
                    <button
                      onClick={() => {
                        const newSettings = { ...categorySettings };
                        const current = newSettings[expandedCategory].sellMaxPercentage;
                        newSettings[expandedCategory] = {
                          ...newSettings[expandedCategory],
                          sellMaxPercentage: Math.min(100, current + 10),
                        };
                        onUpdateSettings(newSettings);
                      }}
                      className="px-3 py-1.5 bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 rounded text-sm font-mono text-app-primary transition-colors"
                    >
                      {categorySettings[expandedCategory].sellMaxPercentage}%
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Quick percentage buttons */}
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => {
                          const newSettings = { ...categorySettings };
                          newSettings[expandedCategory] = {
                            ...newSettings[expandedCategory],
                            sellPercentage: pct,
                          };
                          onUpdateSettings(newSettings);
                        }}
                        className={`px-2.5 py-1.5 rounded text-xs font-mono transition-all
                          ${categorySettings[expandedCategory].sellPercentage === pct
                            ? `${categoryStyles[expandedCategory].activeBg} ${categoryStyles[expandedCategory].text} border ${categoryStyles[expandedCategory].border}`
                            : "bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 text-app-primary"
                          }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                )}

                {/* Toggle Range */}
                <button
                  onClick={() => {
                    const newSettings = { ...categorySettings };
                    newSettings[expandedCategory] = {
                      ...newSettings[expandedCategory],
                      useSellRange: !newSettings[expandedCategory].useSellRange,
                    };
                    onUpdateSettings(newSettings);
                  }}
                  className="text-xs text-app-secondary-60 hover:text-app-primary transition-colors"
                >
                  {categorySettings[expandedCategory].useSellRange ? "Use fixed percentage" : "Use random range"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
