import React, { useState } from "react";
import {
  Copy,
  Key,
  Download,
  Trash2,
  Archive,
  MoreHorizontal,
  Check,
  X,
  Edit3,
  DollarSign,
  TrendingDown,
  Zap,
  ChevronDown,
  GripVertical,
  CheckSquare,
  Square,
} from "lucide-react";
import type { WalletType, WalletCategory, CategoryQuickTradeSettings, CustomQuickTradeSettings } from "../../utils/types";
import { formatAddress } from "../../utils/formatting";

interface WalletCardProps {
  wallet: WalletType;
  isSelected: boolean;
  solBalance: number;
  isDragging: boolean;
  isDragOver: boolean;
  editingLabel: number | null;
  editLabelValue: string;
  categorySettings: Record<WalletCategory, CategoryQuickTradeSettings>;
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
  onDownloadPrivateKey: (wallet: WalletType) => void;
  onCopyToClipboard: (text: string) => void;
  onEditCustomSettings: (wallet: WalletType) => void;
  onSaveCustomSettings: (walletId: number, settings: CustomQuickTradeSettings | null) => void;
}

const categories: WalletCategory[] = ["Soft", "Medium", "Hard"];

const categoryStyles = {
  Soft: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    ring: "ring-emerald-500/40",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  Medium: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    ring: "ring-amber-500/40",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  Hard: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-400",
    ring: "ring-rose-500/40",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
  Custom: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    ring: "ring-blue-500/40",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
};

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  isSelected,
  solBalance,
  isDragging,
  isDragOver,
  editingLabel,
  editLabelValue,
  categorySettings,
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
  onDownloadPrivateKey,
  onCopyToClipboard,
  onEditCustomSettings,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isCustom = !!wallet.customQuickTradeSettings;
  const currentCategory = wallet.category || "Medium";
  const styles = isCustom ? categoryStyles.Custom : categoryStyles[currentCategory];

  // Get effective settings for display - merge custom settings with category defaults
  const categoryDefaults = categorySettings[currentCategory];
  const effectiveSettings = wallet.customQuickTradeSettings
    ? {
        buyAmount: wallet.customQuickTradeSettings.buyAmount ?? categoryDefaults.buyAmount,
        buyMinAmount: wallet.customQuickTradeSettings.buyMinAmount ?? categoryDefaults.buyMinAmount,
        buyMaxAmount: wallet.customQuickTradeSettings.buyMaxAmount ?? categoryDefaults.buyMaxAmount,
        useBuyRange: wallet.customQuickTradeSettings.useBuyRange ?? categoryDefaults.useBuyRange,
        sellPercentage: wallet.customQuickTradeSettings.sellPercentage ?? categoryDefaults.sellPercentage,
        sellMinPercentage: wallet.customQuickTradeSettings.sellMinPercentage ?? categoryDefaults.sellMinPercentage,
        sellMaxPercentage: wallet.customQuickTradeSettings.sellMaxPercentage ?? categoryDefaults.sellMaxPercentage,
        useSellRange: wallet.customQuickTradeSettings.useSellRange ?? categoryDefaults.useSellRange,
      }
    : categoryDefaults;

  const handleCopy = (text: string, field: string): void => {
    onCopyToClipboard(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const formatBuyAmount = (): string => {
    if (effectiveSettings.useBuyRange) {
      return `${effectiveSettings.buyMinAmount.toFixed(3)}-${effectiveSettings.buyMaxAmount.toFixed(3)}`;
    }
    return effectiveSettings.buyAmount.toFixed(3);
  };

  const formatSellAmount = (): string => {
    if (effectiveSettings.useSellRange) {
      return `${effectiveSettings.sellMinPercentage}-${effectiveSettings.sellMaxPercentage}%`;
    }
    return `${effectiveSettings.sellPercentage}%`;
  };

  return (
    <div
      onDragOver={(e) => onDragOver(e, wallet.id)}
      onDragLeave={(e) => onDragLeave(e)}
      onDrop={(e) => onDrop(e, wallet.id)}
      className={`group relative bg-app-secondary/30 border rounded-xl transition-all duration-200
        ${isSelected ? "ring-2 ring-app-primary-color border-app-primary-30" : "border-app-primary-15 hover:border-app-primary-25"}
        ${isDragging ? "opacity-40 scale-95" : ""}
        ${isDragOver ? "border-app-primary-color border-dashed ring-2 ring-app-primary-color/30" : ""}
      `}
    >
      {/* Category Indicator Stripe */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r ${styles.gradient}`} />

      {/* Main Content */}
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Drag Handle + Checkbox */}
          <div className="flex items-center gap-1 pt-0.5">
            <div
              draggable
              onDragStart={(e) => onDragStart(e, wallet.id)}
              onDragEnd={onDragEnd}
              className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
            >
              <GripVertical size={14} className="text-app-secondary-40" />
            </div>
            <button
              onClick={() => onToggleSelection(wallet.id)}
              className="p-0.5 rounded hover:bg-app-quaternary transition-colors"
            >
              {isSelected ? (
                <CheckSquare size={18} className="color-primary" />
              ) : (
                <Square size={18} className="text-app-secondary-40 group-hover:text-app-secondary-60" />
              )}
            </button>
          </div>

          {/* Label & Address */}
          <div className="flex-1 min-w-0">
            {/* Label */}
            {editingLabel === wallet.id ? (
              <div className="flex items-center gap-1 mb-1">
                <input
                  type="text"
                  value={editLabelValue}
                  onChange={(e) => setEditLabelValue(e.target.value)}
                  onKeyDown={(e) => onLabelKeyPress(e, wallet.id)}
                  className="flex-1 bg-app-quaternary border border-app-primary-30 rounded px-2 py-1 text-sm text-app-primary focus:border-app-primary-color focus:outline-none"
                  placeholder="Label..."
                  autoFocus
                />
                <button onClick={() => onSaveLabel(wallet.id)} className="p-1 hover:bg-emerald-500/20 rounded transition-colors">
                  <Check size={14} className="text-emerald-400" />
                </button>
                <button onClick={onCancelEditingLabel} className="p-1 hover:bg-rose-500/20 rounded transition-colors">
                  <X size={14} className="text-rose-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onStartEditingLabel(wallet)}
                className="flex items-center gap-1 group/label hover:bg-app-quaternary/50 px-1.5 py-0.5 -mx-1.5 rounded transition-colors mb-1"
              >
                <span className={`text-sm truncate ${wallet.label ? 'text-app-primary font-semibold' : 'text-app-secondary-40 italic'}`}>
                  {wallet.label || "Add label..."}
                </span>
                <Edit3 size={12} className="text-app-secondary-40 opacity-0 group-hover/label:opacity-60 flex-shrink-0" />
              </button>
            )}

            {/* Address Row */}
            <div className="flex items-center gap-2">
              <code className="text-xs text-app-secondary-60 font-mono">
                {formatAddress(wallet.address)}
              </code>
              <button
                onClick={() => handleCopy(wallet.address, "address")}
                className={`p-1 rounded transition-all ${copiedField === "address" ? "bg-emerald-500/20" : "hover:bg-app-quaternary"}`}
              >
                {copiedField === "address" ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} className="text-app-secondary-40" />
                )}
              </button>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                wallet.source === "hd-derived"
                  ? "bg-blue-500/15 text-blue-400"
                  : "bg-purple-500/15 text-purple-400"
              }`}>
                {wallet.source === "hd-derived" ? "HD" : "IMP"}
              </span>
            </div>
          </div>

          {/* Balance */}
          <div className="text-right">
            <div className={`text-lg font-bold font-mono tabular-nums ${
              solBalance > 0 ? "text-yellow-400" : "text-app-secondary-40"
            }`}>
              {solBalance.toFixed(4)}
            </div>
            <div className="text-[10px] text-app-secondary-40 uppercase">SOL</div>
          </div>
        </div>

        {/* Quick Trade Section */}
        <div className={`p-3 rounded-lg border ${styles.bg} ${styles.border} mb-3`}>
          <div className="flex items-center justify-between">
            {/* Category Picker */}
            <div className="relative">
              <button
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all
                  ${styles.bg} border ${styles.border} hover:brightness-110`}
              >
                <Zap size={12} className={styles.text} />
                <span className={`text-xs font-bold uppercase ${styles.text}`}>
                  {isCustom ? "Custom" : currentCategory}
                </span>
                <ChevronDown size={12} className={`${styles.text} transition-transform ${showCategoryPicker ? "rotate-180" : ""}`} />
              </button>

              {/* Category Dropdown */}
              {showCategoryPicker && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-app-primary border border-app-primary-20 rounded-lg shadow-xl p-1 min-w-[120px] animate-slide-up">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        onCategoryChange(wallet.id, cat);
                        setShowCategoryPicker(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold uppercase transition-all
                        ${currentCategory === cat && !isCustom
                          ? `${categoryStyles[cat].bg} ${categoryStyles[cat].text}`
                          : "text-app-secondary-60 hover:text-app-primary hover:bg-app-quaternary"
                        }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${categoryStyles[cat].bg} border ${categoryStyles[cat].border}`} />
                      {cat}
                    </button>
                  ))}
                  <div className="border-t border-app-primary-20 mt-1 pt-1">
                    <button
                      onClick={() => {
                        onEditCustomSettings(wallet);
                        setShowCategoryPicker(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold uppercase transition-all
                        ${isCustom
                          ? "bg-blue-500/10 text-blue-400"
                          : "text-app-secondary-60 hover:text-app-primary hover:bg-app-quaternary"
                        }`}
                    >
                      <Edit3 size={12} />
                      Custom
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Trade Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <DollarSign size={12} className={styles.text} />
                <span className="text-xs font-mono text-app-primary">{formatBuyAmount()}</span>
                <span className="text-[10px] text-app-secondary-40">SOL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingDown size={12} className={styles.text} />
                <span className="text-xs font-mono text-app-primary">{formatSellAmount()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between">
          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleCopy(wallet.privateKey, "key")}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all
                ${copiedField === "key" ? "bg-emerald-500/20 text-emerald-400" : "bg-app-quaternary hover:bg-app-tertiary text-app-secondary-60 hover:text-app-primary"}`}
            >
              {copiedField === "key" ? <Check size={12} /> : <Key size={12} />}
              <span className="hidden sm:inline">{copiedField === "key" ? "Copied" : "Key"}</span>
            </button>
            <button
              onClick={() => onDownloadPrivateKey(wallet)}
              className="flex items-center gap-1 px-2 py-1.5 bg-app-quaternary hover:bg-app-tertiary rounded-lg text-xs text-app-secondary-60 hover:text-app-primary transition-all"
            >
              <Download size={12} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* More Actions */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-app-quaternary rounded-lg transition-colors"
            >
              <MoreHorizontal size={16} className="text-app-secondary-60" />
            </button>

            {showActions && (
              <div className="absolute bottom-full right-0 mb-1 z-20 bg-app-primary border border-app-primary-20 rounded-lg shadow-xl p-1 min-w-[140px] animate-slide-up">
                {wallet.isArchived ? (
                  <button
                    onClick={() => {
                      onUnarchiveWallet(wallet.id);
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-orange-400 hover:bg-orange-500/10 transition-colors"
                  >
                    <Archive size={14} />
                    Unarchive
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onArchiveWallet(wallet.id);
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-app-secondary-60 hover:bg-app-quaternary transition-colors"
                  >
                    <Archive size={14} />
                    Archive
                  </button>
                )}
                <button
                  onClick={() => {
                    onDeleteWallet(wallet.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
