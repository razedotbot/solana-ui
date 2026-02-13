import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Key,
  ChevronDown,
  Zap,
  Layers,
  Save,
  X,
} from "lucide-react";
import type {
  WalletCategory,
  CategoryQuickTradeSettings,
  WalletGroup,
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

// Shared form for a single category's buy/sell settings
const QuickModeSettingsForm: React.FC<{
  settings: CategoryQuickTradeSettings;
  onUpdate: (field: string, value: number | boolean) => void;
}> = ({ settings: s, onUpdate: update }) => (
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
          <input type="number" value={s.buyMinAmount} onChange={(e) => update("buyMinAmount", parseFloat(e.target.value) || 0)} step="0.001" min="0.001" className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors" />
          <span className="text-[10px] text-app-secondary-40 font-mono">-</span>
          <input type="number" value={s.buyMaxAmount} onChange={(e) => update("buyMaxAmount", parseFloat(e.target.value) || 0)} step="0.001" min="0.001" className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors" />
        </div>
      ) : (
        <input type="number" value={s.buyAmount} onChange={(e) => update("buyAmount", parseFloat(e.target.value) || 0)} step="0.001" min="0.001" className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors" />
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
          <input type="number" value={s.sellMinPercentage} onChange={(e) => update("sellMinPercentage", parseFloat(e.target.value) || 0)} step="1" min="1" max="100" className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors" />
          <span className="text-[10px] text-app-secondary-40 font-mono">-</span>
          <input type="number" value={s.sellMaxPercentage} onChange={(e) => update("sellMaxPercentage", parseFloat(e.target.value) || 0)} step="1" min="1" max="100" className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors" />
        </div>
      ) : (
        <input type="number" value={s.sellPercentage} onChange={(e) => update("sellPercentage", parseFloat(e.target.value) || 0)} step="1" min="1" max="100" className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors" />
      )}
    </div>
  </div>
);

// Shared Quick Mode S/M/H buttons with expandable dropdown (used in WalletsHeader)
export const QuickModeButtons: React.FC<{
  quickModeSettings: Record<WalletCategory, CategoryQuickTradeSettings>;
  onUpdateQuickMode: (category: WalletCategory, settings: CategoryQuickTradeSettings) => void;
}> = ({ quickModeSettings, onUpdateQuickMode }) => {
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
    <>
      <div className="relative flex items-center gap-1" ref={dropdownRef}>
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

      {/* Expanded Quick Settings - Portal */}
      {expandedCategory && createPortal((() => {
        const s = quickModeSettings[expandedCategory];
        const styles = categoryStyles[expandedCategory];
        return (
          <div
            ref={dropdownPortalRef}
            className="fixed z-[9999] bg-app-primary border border-app-primary-40 rounded-lg shadow-xl shadow-black/80 overflow-hidden min-w-[260px] max-w-[calc(100vw-1rem)]"
            style={{ top: dropdownPos.top, left: Math.min(dropdownPos.left, window.innerWidth - 276) }}
          >
            <div className="px-3 py-2 border-b border-app-primary-40 bg-app-primary-60">
              <h4 className={`text-[10px] font-mono font-bold ${styles.text} uppercase`}>
                {expandedCategory} Mode
              </h4>
            </div>
            <QuickModeSettingsForm
              settings={s}
              onUpdate={(field, value) => onUpdateQuickMode(expandedCategory, { ...s, [field]: value })}
            />
          </div>
        );
      })(), document.body)}
    </>
  );
};

interface QuickModePreset {
  id: string;
  name: string;
  settings: Record<WalletCategory, CategoryQuickTradeSettings>;
}

const PRESETS_KEY = "quickModePresets";

const loadPresets = (): QuickModePreset[] => {
  try {
    const saved = localStorage.getItem(PRESETS_KEY);
    return saved ? (JSON.parse(saved) as QuickModePreset[]) : [];
  } catch {
    return [];
  }
};

const savePresets = (presets: QuickModePreset[]): void => {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
};

// Single-button dropdown with S/M/H tabs + presets (used in AdvancedLayout sidebar)
export const QuickModeDropdown: React.FC<{
  quickModeSettings: Record<WalletCategory, CategoryQuickTradeSettings>;
  onUpdateQuickMode: (category: WalletCategory, settings: CategoryQuickTradeSettings) => void;
}> = ({ quickModeSettings, onUpdateQuickMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<WalletCategory>("Medium");
  const [presets, setPresets] = useState<QuickModePreset[]>(loadPresets);
  const [isNaming, setIsNaming] = useState(false);
  const [presetName, setPresetName] = useState("");
  const buttonRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [portalPos, setPortalPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePortalPos = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPortalPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePortalPos();
    }
  }, [isOpen, updatePortalPos]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        portalRef.current && !portalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsNaming(false);
      } else if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        !portalRef.current
      ) {
        setIsOpen(false);
        setIsNaming(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (isNaming && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isNaming]);

  const handleSavePreset = (): void => {
    const name = presetName.trim();
    if (!name) return;
    const preset: QuickModePreset = {
      id: Date.now().toString(36),
      name,
      settings: structuredClone(quickModeSettings),
    };
    const updated = [...presets, preset];
    setPresets(updated);
    savePresets(updated);
    setPresetName("");
    setIsNaming(false);
  };

  const handleLoadPreset = (preset: QuickModePreset): void => {
    for (const cat of categories) {
      onUpdateQuickMode(cat, preset.settings[cat]);
    }
  };

  const handleDeletePreset = (id: string): void => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    savePresets(updated);
  };

  const s = quickModeSettings[activeTab];

  return (
    <div ref={buttonRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center px-2 py-1.5 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300 ${isOpen ? "border-primary-60" : ""}`}
        title="Quick Trade Settings"
      >
        <Zap size={14} className="color-primary" />
      </button>

      {isOpen && createPortal(
        <div
          ref={portalRef}
          className="fixed z-[9999] bg-app-primary border border-app-primary-40 rounded-lg shadow-xl shadow-black/80 overflow-hidden min-w-[260px] max-w-[calc(100vw-1rem)]"
          style={{ top: portalPos.top, left: Math.min(portalPos.left, window.innerWidth - 276) }}
        >
          {/* S / M / H tabs */}
          <div className="flex border-b border-app-primary-40">
            {categories.map((category) => {
              const tabStyles = categoryStyles[category];
              const isActive = activeTab === category;
              return (
                <button
                  key={category}
                  onClick={() => setActiveTab(category)}
                  className={`flex-1 px-3 py-2 text-[10px] font-mono font-bold uppercase transition-all duration-200 ${
                    isActive
                      ? `${tabStyles.bg} ${tabStyles.text} border-b-2 ${tabStyles.border}`
                      : "text-app-secondary-40 hover:text-app-secondary-60 hover:bg-app-primary-60"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* Presets */}
          <div className="border-t-2 border-app-primary-40 px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-app-secondary-40 uppercase">Presets</span>
              {!isNaming && (
                <button
                  onClick={() => setIsNaming(true)}
                  className="flex items-center gap-1 text-[10px] font-mono color-primary hover:text-app-primary-color transition-colors"
                  title="Save current settings as preset"
                >
                  <Save size={10} />
                  Save
                </button>
              )}
            </div>

            {/* Save new preset input */}
            {isNaming && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePreset();
                    if (e.key === "Escape") { setIsNaming(false); setPresetName(""); }
                  }}
                  placeholder="Preset name..."
                  className="flex-1 bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  className="px-2 py-1 text-[10px] font-mono font-bold bg-app-primary-color/20 border border-app-primary-color/40 rounded color-primary hover:bg-app-primary-color/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={() => { setIsNaming(false); setPresetName(""); }}
                  className="p-1 text-app-secondary-40 hover:text-app-secondary-60 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Preset list */}
            {presets.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {presets.map((preset) => (
                  <div key={preset.id} className="group flex items-center gap-0.5">
                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="px-2 py-0.5 text-[10px] font-mono bg-app-quaternary border border-app-primary-20 rounded-l hover:border-primary-60 hover:bg-primary-05 text-app-secondary-60 hover:text-app-primary transition-all"
                      title={`Load "${preset.name}"`}
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => handleDeletePreset(preset.id)}
                      className="px-1 py-0.5 text-[10px] bg-app-quaternary border border-l-0 border-app-primary-20 rounded-r text-app-secondary-40 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                      title="Delete preset"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-mono text-app-secondary-30">No saved presets</p>
            )}
          </div>

          {/* Settings form for active tab */}
          <div className="border-t border-app-primary-40">
            <QuickModeSettingsForm
              settings={s}
              onUpdate={(field, value) => onUpdateQuickMode(activeTab, { ...s, [field]: value })}
            />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
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
  return (
    <header className="relative z-20 flex flex-wrap items-center gap-2 px-4 py-3 border-b border-app-primary-15 bg-app-primary/80 backdrop-blur-sm">
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
        <QuickModeButtons
          quickModeSettings={quickModeSettings}
          onUpdateQuickMode={onUpdateQuickMode}
        />
      </div>

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

      {/* Mobile Action Buttons */}
      <div className="flex md:hidden items-center gap-2 w-full pt-2 border-t border-app-primary-15 mt-1">
        <div className="flex items-center gap-1.5 text-xs text-app-secondary-60 min-w-0 overflow-hidden">
          <span className="font-mono font-bold color-primary">{walletCount}</span>
          <span className="flex-shrink-0">wallets</span>
          <span className="text-app-primary-20 flex-shrink-0">|</span>
          <span className="font-mono font-bold text-yellow-400 truncate">{totalBalance}</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={onCreateWallet}
          disabled={!isConnected}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
            isConnected
              ? "bg-app-primary-color hover:brightness-110 text-app-quaternary"
              : "bg-app-quaternary text-app-secondary-40 cursor-not-allowed"
          }`}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Create</span>
        </button>
        <button
          onClick={onImportWallet}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 text-app-primary transition-all flex-shrink-0"
        >
          <Key size={14} />
          <span>Import</span>
        </button>
      </div>
    </header>
  );
};

interface GroupSelectorProps {
  groups: WalletGroup[];
  activeGroupId: string;
  onGroupChange: (groupId: string) => void;
  showAllOption?: boolean;
}

export const GroupSelector: React.FC<GroupSelectorProps> = ({
  groups,
  activeGroupId,
  onGroupChange,
  showAllOption = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  const activeGroup = activeGroupId === "all"
    ? null
    : groups.find((g) => g.id === activeGroupId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center px-2 py-1.5 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
        title={activeGroupId === "all" ? "All Groups" : activeGroup?.name || "All Groups"}
      >
        <Layers size={14} className="color-primary" />
        {/* Color indicator dot for active group */}
        {activeGroup?.color && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-app-primary-99"
            style={{ backgroundColor: activeGroup.color }}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-app-tertiary border border-app-primary-20 rounded-lg shadow-xl py-1 min-w-[150px]">
          {showAllOption && (
            <button
              onClick={() => {
                onGroupChange("all");
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
                activeGroupId === "all"
                  ? "text-app-primary bg-primary-08"
                  : "text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-10"
              }`}
            >
              <Layers size={12} />
              All Groups
            </button>
          )}
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => {
                onGroupChange(group.id);
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
                activeGroupId === group.id
                  ? "text-app-primary bg-primary-08"
                  : "text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-10"
              }`}
            >
              {group.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
              )}
              <span className="truncate">{group.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
