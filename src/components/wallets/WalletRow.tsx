import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Key,
  Trash2,
  Archive,
  MoreHorizontal,
  Check,
  X,
  Edit3,
  ChevronDown,
  GripVertical,
  CheckSquare,
  Square,
  FolderInput,
  RotateCcw,
} from "lucide-react";
import type {
  WalletType,
  WalletCategory,
  WalletGroup,
  CategoryQuickTradeSettings,
  CustomQuickTradeSettings,
} from "../../utils/types";
import { DEFAULT_GROUP_ID } from "../../utils/types";
import { formatAddress } from "../../utils/formatting";

export interface WalletRowProps {
  wallet: WalletType;
  groups: WalletGroup[];
  isSelected: boolean;
  solBalance: number;
  isDragging: boolean;
  isDragOver: boolean;
  editingLabel: number | null;
  editLabelValue: string;
  quickModeSettings: Record<WalletCategory, CategoryQuickTradeSettings>;
  onToggleSelection: (walletId: number) => void;
  onStartEditingLabel: (wallet: WalletType) => void;
  onSaveLabel: (walletId: number) => void;
  onCancelEditingLabel: () => void;
  onLabelKeyPress: (e: React.KeyboardEvent, walletId: number) => void;
  setEditLabelValue: (value: string) => void;
  onCategoryChange: (walletId: number, category: WalletCategory) => void;
  onDragStart: (e: React.DragEvent, walletId: number) => void;
  onDragOver: (e: React.DragEvent, walletId: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetWalletId: number) => void;
  onDragEnd: () => void;
  onArchiveWallet: (walletId: number) => void;
  onUnarchiveWallet: (walletId: number) => void;
  onDeleteWallet: (walletId: number) => void;
  onCopyToClipboard: (text: string) => void;
  onSaveCustomQuickMode: (walletId: number, settings: CustomQuickTradeSettings | null) => void;
  onMoveToGroup: (walletId: number, groupId: string) => void;
}

const categories: WalletCategory[] = ["Soft", "Medium", "Hard"];

const catColor: Record<string, string> = {
  Soft: "bg-emerald-500",
  Medium: "bg-amber-500",
  Hard: "bg-rose-500",
  Custom: "bg-blue-500",
};

const catText: Record<string, string> = {
  Soft: "text-emerald-400",
  Medium: "text-amber-400",
  Hard: "text-rose-400",
  Custom: "text-blue-400",
};

export const WalletRow: React.FC<WalletRowProps> = ({
  wallet,
  groups,
  isSelected,
  solBalance,
  isDragging,
  isDragOver,
  editingLabel,
  editLabelValue,
  quickModeSettings,
  onToggleSelection,
  onStartEditingLabel,
  onSaveLabel,
  onCancelEditingLabel,
  onLabelKeyPress,
  setEditLabelValue,
  onCategoryChange,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onArchiveWallet,
  onUnarchiveWallet,
  onDeleteWallet,
  onCopyToClipboard,
  onSaveCustomQuickMode,
  onMoveToGroup,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomQuickTradeSettings | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  const groupBtnRef = useRef<HTMLButtonElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const anyDropdownOpen = showMenu || showCategoryPicker || showGroupPicker;

  useEffect(() => {
    if (!anyDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (rowRef.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-wallet-dropdown]")) return;
      closeAllDropdowns();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  });

  // Close dropdowns on any scroll
  useEffect(() => {
    if (!anyDropdownOpen) return;
    const onScroll = (): void => closeAllDropdowns();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [anyDropdownOpen]);

  const getDropdownPos = useCallback(
    (ref: React.RefObject<HTMLElement | null>, placement: "below-left" | "below-right" | "above-right", estimatedHeight = 200): React.CSSProperties => {
      if (!ref.current) return {};
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const rightEdge = window.innerWidth - rect.right;

      switch (placement) {
        case "below-left": {
          if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
            return { bottom: window.innerHeight - rect.top + 4, left: rect.left, maxHeight: spaceAbove };
          }
          return { top: rect.bottom + 4, left: rect.left, maxHeight: spaceBelow };
        }
        case "below-right": {
          if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
            return { bottom: window.innerHeight - rect.top + 4, right: rightEdge, maxHeight: spaceAbove };
          }
          return { top: rect.bottom + 4, right: rightEdge, maxHeight: spaceBelow };
        }
        case "above-right": {
          if (spaceAbove < estimatedHeight && spaceBelow > spaceAbove) {
            return { top: rect.bottom + 4, right: rightEdge, maxHeight: spaceBelow };
          }
          return { bottom: window.innerHeight - rect.top + 4, right: rightEdge, maxHeight: spaceAbove };
        }
      }
    },
    [],
  );

  const isCustom = !!wallet.customQuickTradeSettings;
  const currentCategory = wallet.category || "Medium";
  const catKey = isCustom ? "Custom" : currentCategory;
  const currentGroupId = wallet.groupId || DEFAULT_GROUP_ID;

  const quickModeDefaults = quickModeSettings[currentCategory];
  const eff = wallet.customQuickTradeSettings
    ? {
        buyAmount: wallet.customQuickTradeSettings.buyAmount ?? quickModeDefaults.buyAmount,
        useBuyRange: wallet.customQuickTradeSettings.useBuyRange ?? quickModeDefaults.useBuyRange,
        buyMinAmount: wallet.customQuickTradeSettings.buyMinAmount ?? quickModeDefaults.buyMinAmount,
        buyMaxAmount: wallet.customQuickTradeSettings.buyMaxAmount ?? quickModeDefaults.buyMaxAmount,
        sellPercentage: wallet.customQuickTradeSettings.sellPercentage ?? quickModeDefaults.sellPercentage,
        useSellRange: wallet.customQuickTradeSettings.useSellRange ?? quickModeDefaults.useSellRange,
        sellMinPercentage: wallet.customQuickTradeSettings.sellMinPercentage ?? quickModeDefaults.sellMinPercentage,
        sellMaxPercentage: wallet.customQuickTradeSettings.sellMaxPercentage ?? quickModeDefaults.sellMaxPercentage,
      }
    : quickModeDefaults;

  const handleCopy = (text: string, field: string): void => {
    onCopyToClipboard(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const fmtBuy = (v: number): string => (v < 1 ? v.toFixed(3) : v.toFixed(2));
  const buyStr = eff.useBuyRange
    ? `${fmtBuy(eff.buyMinAmount)}-${fmtBuy(eff.buyMaxAmount)}`
    : fmtBuy(eff.buyAmount);

  const sellStr = eff.useSellRange
    ? `${eff.sellMinPercentage}-${eff.sellMaxPercentage}%`
    : `${eff.sellPercentage}%`;

  const closeAllDropdowns = (): void => {
    setShowMenu(false);
    setShowCategoryPicker(false);
    setShowGroupPicker(false);
    setShowCustomEditor(false);
    setCustomDraft(null);
  };

  const openCustomEditor = (): void => {
    const draft = wallet.customQuickTradeSettings
      ? { ...wallet.customQuickTradeSettings }
      : {
          buyAmount: quickModeDefaults.buyAmount,
          buyMinAmount: quickModeDefaults.buyMinAmount,
          buyMaxAmount: quickModeDefaults.buyMaxAmount,
          useBuyRange: quickModeDefaults.useBuyRange,
          sellPercentage: quickModeDefaults.sellPercentage,
          sellMinPercentage: quickModeDefaults.sellMinPercentage,
          sellMaxPercentage: quickModeDefaults.sellMaxPercentage,
          useSellRange: quickModeDefaults.useSellRange,
        };
    setCustomDraft(draft);
    setShowCustomEditor(true);
  };

  const updateDraft = (field: string, value: number | boolean): void => {
    setCustomDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveCustomDraft = (): void => {
    if (customDraft) {
      onSaveCustomQuickMode(wallet.id, customDraft);
    }
    setShowCategoryPicker(false);
    setShowCustomEditor(false);
    setCustomDraft(null);
  };

  const removeCustomSettings = (): void => {
    onSaveCustomQuickMode(wallet.id, null);
    setShowCategoryPicker(false);
    setShowCustomEditor(false);
    setCustomDraft(null);
  };

  const resetDraftToCategory = (): void => {
    setCustomDraft({
      buyAmount: quickModeDefaults.buyAmount,
      buyMinAmount: quickModeDefaults.buyMinAmount,
      buyMaxAmount: quickModeDefaults.buyMaxAmount,
      useBuyRange: quickModeDefaults.useBuyRange,
      sellPercentage: quickModeDefaults.sellPercentage,
      sellMinPercentage: quickModeDefaults.sellMinPercentage,
      sellMaxPercentage: quickModeDefaults.sellMaxPercentage,
      useSellRange: quickModeDefaults.useSellRange,
    });
  };

  return (
    <div
      ref={rowRef}
      data-wallet-id={wallet.id}
      onDragOver={(e) => onDragOver(e, wallet.id)}
      onDragLeave={(e) => onDragLeave(e)}
      onDrop={(e) => onDrop(e, wallet.id)}
      className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 border-b transition-all duration-150
        ${isSelected ? "bg-app-primary-color/5 border-app-primary-30" : "border-app-primary-10 hover:bg-app-secondary/20"}
        ${isDragging ? "opacity-40" : ""}
        ${isDragOver && !isDragging ? "bg-app-primary-color/8" : ""}
      `}
    >
        {/* Drag handle + Checkbox */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <div
            draggable
            onDragStart={(e) => onDragStart(e, wallet.id)}
            onDragEnd={onDragEnd}
            className="hidden md:block cursor-grab active:cursor-grabbing p-1 -ml-1 rounded transition-all hover:bg-app-primary-color/10 active:bg-app-primary-color/20 hover:scale-110 active:scale-95"
          >
            <GripVertical size={14} className="text-app-secondary-40" />
          </div>
          <button
            onClick={() => onToggleSelection(wallet.id)}
            className="p-1 rounded-lg hover:bg-app-quaternary transition-colors"
          >
            {isSelected ? (
              <CheckSquare size={16} className="color-primary" />
            ) : (
              <Square size={16} className="text-app-secondary-40" />
            )}
          </button>
        </div>

        {/* Label + Address */}
        <div className="flex-1 md:flex-none md:w-[180px] min-w-0">
          {editingLabel === wallet.id ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editLabelValue}
                onChange={(e) => setEditLabelValue(e.target.value)}
                onKeyDown={(e) => onLabelKeyPress(e, wallet.id)}
                className="flex-1 bg-app-quaternary border border-app-primary-30 rounded px-2 py-1 text-xs text-app-primary focus:border-app-primary-color focus:outline-none min-w-0"
                placeholder="Label..."
                autoFocus
              />
              <button
                onClick={() => onSaveLabel(wallet.id)}
                className="p-1 rounded hover:bg-emerald-500/20 transition-colors"
              >
                <Check size={14} className="text-emerald-400" />
              </button>
              <button
                onClick={onCancelEditingLabel}
                className="p-1 rounded hover:bg-rose-500/20 transition-colors"
              >
                <X size={14} className="text-rose-400" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              {wallet.label ? (
                <span
                  onClick={() => onStartEditingLabel(wallet)}
                  className="text-xs font-semibold text-app-primary truncate cursor-pointer hover:text-app-primary-color transition-colors max-w-[100px]"
                >
                  {wallet.label}
                </span>
              ) : (
                <button
                  onClick={() => onStartEditingLabel(wallet)}
                  className="p-0.5 rounded hover:bg-app-quaternary transition-colors flex-shrink-0"
                  title="Add label"
                >
                  <Edit3 size={12} className="text-app-secondary-40" />
                </button>
              )}
              <code className="text-xs text-app-secondary-60 font-mono truncate">
                {formatAddress(wallet.address)}
              </code>
              <button
                onClick={() => handleCopy(wallet.address, "addr")}
                className="p-1 rounded hover:bg-app-quaternary transition-colors flex-shrink-0"
                title="Copy address"
              >
                {copiedField === "addr" ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} className="text-app-secondary-40" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Category - hidden on mobile */}
        <div className="hidden md:block w-[80px] flex-shrink-0 relative">
          <button
            ref={categoryBtnRef}
            onClick={() => {
              closeAllDropdowns();
              setShowCategoryPicker(!showCategoryPicker);
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
              showCategoryPicker
                ? "bg-app-primary-60"
                : "hover:bg-app-primary-60"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${catColor[catKey]}`} />
            <span className={`text-[11px] font-mono font-semibold uppercase ${catText[catKey]}`}>
              {isCustom ? "Custom" : currentCategory}
            </span>
            <ChevronDown size={10} className={`text-app-secondary-40 transition-transform duration-200 ${showCategoryPicker ? "rotate-180" : ""}`} />
          </button>

          {showCategoryPicker && createPortal(
              <div data-wallet-dropdown className="fixed z-[100] bg-app-primary border border-app-primary-40 rounded-lg shadow-xl shadow-black-80 overflow-y-auto min-w-[140px]" style={getDropdownPos(categoryBtnRef, "below-left")}>
                {/* Header */}
                <div className="px-3 py-2 border-b border-app-primary-40 bg-app-primary-60">
                  <span className="text-[10px] font-mono uppercase text-app-secondary">Quick Mode</span>
                </div>

                {/* Category options */}
                <div>
                  {categories.map((cat) => {
                    const isActive = currentCategory === cat && !isCustom;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          onCategoryChange(wallet.id, cat);
                          setShowCategoryPicker(false);
                          setShowCustomEditor(false);
                          setCustomDraft(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono transition-colors border-b border-app-primary-20 last:border-b-0
                          ${isActive
                            ? `${catText[cat]} bg-primary-20`
                            : "text-app-secondary hover:bg-app-primary-60 hover:text-app-primary"
                          }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${catColor[cat]}`} />
                        <span>{cat}</span>
                        {isActive && <Check size={12} className="ml-auto" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom toggle */}
                <div className="border-t border-app-primary-40">
                  <button
                    onClick={() => {
                      if (showCustomEditor) {
                        setShowCustomEditor(false);
                        setCustomDraft(null);
                      } else {
                        openCustomEditor();
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono transition-colors
                      ${isCustom || showCustomEditor
                        ? "text-blue-400 bg-primary-20"
                        : "text-app-secondary hover:bg-app-primary-60 hover:text-app-primary"
                      }`}
                  >
                    <Edit3 size={12} />
                    <span>Custom</span>
                    <ChevronDown size={10} className={`ml-auto transition-transform duration-200 ${showCustomEditor ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {/* Inline custom editor */}
                {showCustomEditor && customDraft && (
                  <div className="border-t border-app-primary-40 px-3 pt-2.5 pb-2.5 min-w-[260px] bg-app-primary-60">
                    {/* Buy section */}
                    <div className="mb-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-app-secondary uppercase">Buy (SOL)</span>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={customDraft.useBuyRange ?? false}
                            onChange={(e) => updateDraft("useBuyRange", e.target.checked)}
                            className="w-3 h-3 rounded accent-app-primary-color"
                          />
                          <span className="text-[10px] font-mono text-app-secondary-60">Range</span>
                        </label>
                      </div>
                      {customDraft.useBuyRange ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={customDraft.buyMinAmount ?? 0}
                            onChange={(e) => updateDraft("buyMinAmount", parseFloat(e.target.value) || 0)}
                            step="0.001"
                            min="0.001"
                            className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                          />
                          <span className="text-[10px] text-app-secondary-40 font-mono">-</span>
                          <input
                            type="number"
                            value={customDraft.buyMaxAmount ?? 0}
                            onChange={(e) => updateDraft("buyMaxAmount", parseFloat(e.target.value) || 0)}
                            step="0.001"
                            min="0.001"
                            className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                          />
                        </div>
                      ) : (
                        <input
                          type="number"
                          value={customDraft.buyAmount ?? 0}
                          onChange={(e) => updateDraft("buyAmount", parseFloat(e.target.value) || 0)}
                          step="0.001"
                          min="0.001"
                          className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                        />
                      )}
                    </div>

                    {/* Sell section */}
                    <div className="mb-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-app-secondary uppercase">Sell %</span>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={customDraft.useSellRange ?? false}
                            onChange={(e) => updateDraft("useSellRange", e.target.checked)}
                            className="w-3 h-3 rounded accent-app-primary-color"
                          />
                          <span className="text-[10px] font-mono text-app-secondary-60">Range</span>
                        </label>
                      </div>
                      {customDraft.useSellRange ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={customDraft.sellMinPercentage ?? 0}
                            onChange={(e) => updateDraft("sellMinPercentage", parseFloat(e.target.value) || 0)}
                            step="1"
                            min="1"
                            max="100"
                            className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                          />
                          <span className="text-[10px] text-app-secondary-40 font-mono">-</span>
                          <input
                            type="number"
                            value={customDraft.sellMaxPercentage ?? 0}
                            onChange={(e) => updateDraft("sellMaxPercentage", parseFloat(e.target.value) || 0)}
                            step="1"
                            min="1"
                            max="100"
                            className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                          />
                        </div>
                      ) : (
                        <input
                          type="number"
                          value={customDraft.sellPercentage ?? 0}
                          onChange={(e) => updateDraft("sellPercentage", parseFloat(e.target.value) || 0)}
                          step="1"
                          min="1"
                          max="100"
                          className="w-full bg-app-primary-80 border border-app-primary-40 rounded px-2 py-1 text-xs font-mono text-app-primary focus:border-app-primary-color focus:outline-none transition-colors"
                        />
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-app-primary-40">
                      <button
                        onClick={resetDraftToCategory}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-20 transition-colors"
                        title="Reset to category defaults"
                      >
                        <RotateCcw size={10} />
                        Reset
                      </button>
                      <div className="flex-1" />
                      {isCustom && (
                        <button
                          onClick={removeCustomSettings}
                          className="px-2 py-1 rounded text-[10px] font-mono text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                      <button
                        onClick={saveCustomDraft}
                        className="px-3 py-1 rounded text-[10px] font-mono font-bold color-primary bg-app-primary-color/10 border border-app-primary-color/30 hover:bg-app-primary-color/20 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>,
              document.body,
          )}
        </div>

        {/* Trade summary */}
        <div className="w-[140px] flex-shrink-0 hidden md:block">
          <span className="text-[11px] text-app-secondary-40 font-mono whitespace-nowrap">
            {buyStr} <span className="text-app-secondary-30">/</span> {sellStr}
          </span>
        </div>

        {/* Balance */}
        <div
          className={`flex-shrink-0 text-right text-xs md:text-sm font-bold font-mono tabular-nums md:w-[90px] ${
            solBalance > 0 ? "color-primary" : "text-app-secondary-40"
          }`}
        >
          {solBalance.toFixed(4)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 ml-auto">
          {/* Copy private key - hidden on mobile */}
          <button
            onClick={() => handleCopy(wallet.privateKey, "key")}
            className="hidden md:block p-1.5 rounded-lg hover:bg-app-quaternary transition-colors"
            title="Copy private key"
          >
            {copiedField === "key" ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Key size={14} className="text-app-secondary-40" />
            )}
          </button>

          {/* Move to group - hidden on mobile */}
          {groups.length > 1 && (
            <div className="hidden md:block relative">
              <button
                ref={groupBtnRef}
                onClick={() => {
                  closeAllDropdowns();
                  setShowGroupPicker(!showGroupPicker);
                }}
                className={`p-1.5 rounded-lg transition-all duration-150 ${
                  showGroupPicker
                    ? "bg-app-quaternary text-app-primary"
                    : "hover:bg-app-quaternary text-app-secondary-40"
                }`}
                title="Move to group"
              >
                <FolderInput size={14} />
              </button>
              {showGroupPicker && createPortal(
                  <div data-wallet-dropdown className="fixed z-[100] bg-app-primary border border-app-primary-40 rounded-lg shadow-xl shadow-black-80 overflow-y-auto min-w-[170px]" style={getDropdownPos(groupBtnRef, "below-right")}>
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-app-primary-40 bg-app-primary-60">
                      <span className="text-[10px] font-mono uppercase text-app-secondary">Move to Group</span>
                    </div>
                    <div>
                      {groups.map((group) => {
                        const isActive = group.id === currentGroupId;
                        return (
                          <button
                            key={group.id}
                            onClick={() => {
                              if (!isActive) {
                                onMoveToGroup(wallet.id, group.id);
                              }
                              setShowGroupPicker(false);
                            }}
                            disabled={isActive}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono transition-colors border-b border-app-primary-20 last:border-b-0 ${
                              isActive
                                ? "text-app-primary-color bg-primary-20 cursor-default"
                                : "text-app-secondary hover:bg-app-primary-60 hover:text-app-primary"
                            }`}
                          >
                            {group.color ? (
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: group.color }}
                              />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-app-secondary-30" />
                            )}
                            <span className="truncate">{group.name}</span>
                            {isActive && <Check size={12} className="ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>,
                  document.body,
              )}
            </div>
          )}

          {/* More actions menu */}
          <div className="relative">
            <button
              ref={menuBtnRef}
              onClick={() => {
                closeAllDropdowns();
                setShowMenu(!showMenu);
              }}
              className={`p-1.5 rounded-lg transition-all duration-150 ${
                showMenu
                  ? "bg-app-quaternary text-app-primary"
                  : "hover:bg-app-quaternary text-app-secondary-40"
              }`}
            >
              <MoreHorizontal size={14} />
            </button>
            {showMenu && createPortal(
                <div data-wallet-dropdown className="fixed z-[100] bg-app-primary border border-app-primary-40 rounded-lg shadow-xl shadow-black-80 overflow-y-auto min-w-[140px]" style={getDropdownPos(menuBtnRef, "above-right")}>
                  <div>
                    {wallet.isArchived ? (
                      <button
                        onClick={() => {
                          onUnarchiveWallet(wallet.id);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-orange-400 hover:bg-app-primary-60 transition-colors border-b border-app-primary-20"
                      >
                        <Archive size={14} /> Unarchive
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onArchiveWallet(wallet.id);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-app-secondary hover:bg-app-primary-60 hover:text-app-primary transition-colors border-b border-app-primary-20"
                      >
                        <Archive size={14} /> Archive
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onDeleteWallet(wallet.id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-rose-400 hover:bg-app-primary-60 transition-colors"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>,
                document.body,
            )}
          </div>
        </div>
    </div>
  );
};
