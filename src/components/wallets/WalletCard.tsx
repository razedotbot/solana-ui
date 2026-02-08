import React, { useState } from "react";
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

export interface WalletCardProps {
  wallet: WalletType;
  groups: WalletGroup[];
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
  onCopyToClipboard: (text: string) => void;
  onEditCustomSettings: (wallet: WalletType) => void;
  onSaveCustomSettings?: (walletId: number, settings: CustomQuickTradeSettings | null) => void;
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

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  groups,
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
  onCopyToClipboard,
  onEditCustomSettings,
  onMoveToGroup,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isCustom = !!wallet.customQuickTradeSettings;
  const currentCategory = wallet.category || "Medium";
  const catKey = isCustom ? "Custom" : currentCategory;
  const currentGroupId = wallet.groupId || DEFAULT_GROUP_ID;

  const categoryDefaults = categorySettings[currentCategory];
  const eff = wallet.customQuickTradeSettings
    ? {
        buyAmount: wallet.customQuickTradeSettings.buyAmount ?? categoryDefaults.buyAmount,
        useBuyRange: wallet.customQuickTradeSettings.useBuyRange ?? categoryDefaults.useBuyRange,
        buyMinAmount: wallet.customQuickTradeSettings.buyMinAmount ?? categoryDefaults.buyMinAmount,
        buyMaxAmount: wallet.customQuickTradeSettings.buyMaxAmount ?? categoryDefaults.buyMaxAmount,
        sellPercentage: wallet.customQuickTradeSettings.sellPercentage ?? categoryDefaults.sellPercentage,
        useSellRange: wallet.customQuickTradeSettings.useSellRange ?? categoryDefaults.useSellRange,
        sellMinPercentage: wallet.customQuickTradeSettings.sellMinPercentage ?? categoryDefaults.sellMinPercentage,
        sellMaxPercentage: wallet.customQuickTradeSettings.sellMaxPercentage ?? categoryDefaults.sellMaxPercentage,
      }
    : categoryDefaults;

  const handleCopy = (text: string, field: string): void => {
    onCopyToClipboard(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const buyStr = eff.useBuyRange
    ? `${eff.buyMinAmount.toFixed(3)}-${eff.buyMaxAmount.toFixed(3)}`
    : eff.buyAmount.toFixed(3);

  const sellStr = eff.useSellRange
    ? `${eff.sellMinPercentage}-${eff.sellMaxPercentage}%`
    : `${eff.sellPercentage}%`;

  const closeAllDropdowns = (): void => {
    setShowMenu(false);
    setShowCategoryPicker(false);
    setShowGroupPicker(false);
  };

  return (
    <div
      onDragOver={(e) => onDragOver(e, wallet.id)}
      onDragLeave={(e) => onDragLeave(e)}
      onDrop={(e) => onDrop(e, wallet.id)}
      className={`relative rounded-xl border transition-all duration-150
        ${isSelected ? "ring-2 ring-app-primary-color border-app-primary-30 bg-app-primary-color/5" : "border-app-primary-20 hover:border-app-primary-30 bg-app-secondary/30"}
        ${isDragging ? "opacity-40 scale-95" : ""}
        ${isDragOver ? "border-app-primary-color border-dashed ring-1 ring-app-primary-color" : ""}
      `}
    >
      <div className="p-3">
        {/* Row 1: Selection + Label/Address + Balance */}
        <div className="flex items-center gap-3">
          {/* Drag handle + Checkbox */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div
              draggable
              onDragStart={(e) => onDragStart(e, wallet.id)}
              onDragEnd={onDragEnd}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-app-quaternary rounded transition-colors"
            >
              <GripVertical size={14} className="text-app-secondary-40" />
            </div>
            <button
              onClick={() => onToggleSelection(wallet.id)}
              className="p-1.5 rounded-lg hover:bg-app-quaternary transition-colors"
            >
              {isSelected ? (
                <CheckSquare size={18} className="color-primary" />
              ) : (
                <Square size={18} className="text-app-secondary-40" />
              )}
            </button>
          </div>

          {/* Label + Address */}
          <div className="flex-1 min-w-0">
            {editingLabel === wallet.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editLabelValue}
                  onChange={(e) => setEditLabelValue(e.target.value)}
                  onKeyDown={(e) => onLabelKeyPress(e, wallet.id)}
                  className="flex-1 bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-1.5 text-sm text-app-primary focus:border-app-primary-color focus:outline-none min-w-0"
                  placeholder="Label..."
                  autoFocus
                />
                <button
                  onClick={() => onSaveLabel(wallet.id)}
                  className="p-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
                >
                  <Check size={16} className="text-emerald-400" />
                </button>
                <button
                  onClick={onCancelEditingLabel}
                  className="p-2 rounded-lg hover:bg-rose-500/20 transition-colors"
                >
                  <X size={16} className="text-rose-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                {wallet.label ? (
                  <span
                    onClick={() => onStartEditingLabel(wallet)}
                    className="text-sm font-semibold text-app-primary truncate cursor-pointer hover:text-app-primary-color transition-colors max-w-[140px]"
                  >
                    {wallet.label}
                  </span>
                ) : (
                  <button
                    onClick={() => onStartEditingLabel(wallet)}
                    className="p-1 rounded hover:bg-app-quaternary transition-colors"
                    title="Add label"
                  >
                    <Edit3 size={14} className="text-app-secondary-40" />
                  </button>
                )}
                <div className="flex items-center gap-1.5 min-w-0">
                  <code className="text-xs text-app-secondary-60 font-mono truncate">
                    {formatAddress(wallet.address)}
                  </code>
                  <button
                    onClick={() => handleCopy(wallet.address, "addr")}
                    className="p-1.5 rounded-lg hover:bg-app-quaternary transition-colors flex-shrink-0"
                    title="Copy address"
                  >
                    {copiedField === "addr" ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} className="text-app-secondary-40" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Balance */}
          <div
            className={`text-lg font-bold font-mono tabular-nums flex-shrink-0 ${
              solBalance > 0 ? "color-primary" : "text-app-secondary-40"
            }`}
          >
            {solBalance.toFixed(4)}
          </div>
        </div>

        {/* Row 2: Category + Trade info + Actions */}
        <div className="flex items-center gap-2 mt-2 pl-[52px]">
          {/* Category selector */}
          <div className="relative">
            <button
              onClick={() => {
                closeAllDropdowns();
                setShowCategoryPicker(!showCategoryPicker);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-app-quaternary transition-colors"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${catColor[catKey]}`} />
              <span className={`text-xs font-semibold uppercase ${catText[catKey]}`}>
                {isCustom ? "Custom" : currentCategory}
              </span>
              <ChevronDown size={12} className="text-app-secondary-40" />
            </button>

            {showCategoryPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowCategoryPicker(false)} />
                <div className="absolute top-full left-0 mt-1 z-20 bg-app-primary border border-app-primary-20 rounded-xl shadow-xl p-1.5 min-w-[130px]">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        onCategoryChange(wallet.id, cat);
                        setShowCategoryPicker(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all
                        ${
                          currentCategory === cat && !isCustom
                            ? `${catText[cat]} bg-app-quaternary`
                            : "text-app-secondary-60 hover:text-app-primary hover:bg-app-quaternary"
                        }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${catColor[cat]}`} />
                      {cat}
                    </button>
                  ))}
                  <div className="border-t border-app-primary-15 mt-1 pt-1">
                    <button
                      onClick={() => {
                        onEditCustomSettings(wallet);
                        setShowCategoryPicker(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all
                        ${isCustom ? "text-blue-400 bg-app-quaternary" : "text-app-secondary-60 hover:text-app-primary hover:bg-app-quaternary"}`}
                    >
                      <Edit3 size={12} />
                      Custom
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Trade summary */}
          <span className="text-xs text-app-secondary-40 font-mono">
            {buyStr} <span className="text-app-secondary-30">/</span> {sellStr}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions - ALWAYS visible */}
          <div className="flex items-center gap-1">
            {/* Copy private key */}
            <button
              onClick={() => handleCopy(wallet.privateKey, "key")}
              className="p-2 rounded-lg hover:bg-app-quaternary transition-colors"
              title="Copy private key"
            >
              {copiedField === "key" ? (
                <Check size={16} className="text-emerald-400" />
              ) : (
                <Key size={16} className="text-app-secondary-40" />
              )}
            </button>

            {/* Move to group */}
            {groups.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => {
                    closeAllDropdowns();
                    setShowGroupPicker(!showGroupPicker);
                  }}
                  className="p-2 rounded-lg hover:bg-app-quaternary transition-colors"
                  title="Move to group"
                >
                  <FolderInput size={16} className="text-app-secondary-40" />
                </button>
                {showGroupPicker && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowGroupPicker(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-app-primary border border-app-primary-20 rounded-xl shadow-xl py-1.5 min-w-[160px]">
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => {
                            if (group.id !== currentGroupId) {
                              onMoveToGroup(wallet.id, group.id);
                            }
                            setShowGroupPicker(false);
                          }}
                          disabled={group.id === currentGroupId}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                            group.id === currentGroupId
                              ? "text-app-primary-color bg-app-primary-color/10 cursor-default"
                              : "text-app-secondary-60 hover:text-app-primary hover:bg-app-quaternary"
                          }`}
                        >
                          {group.color && (
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: group.color }}
                            />
                          )}
                          <span className="truncate">{group.name}</span>
                          {group.id === currentGroupId && (
                            <Check size={12} className="ml-auto text-app-primary-color" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* More actions menu */}
            <div className="relative">
              <button
                onClick={() => {
                  closeAllDropdowns();
                  setShowMenu(!showMenu);
                }}
                className="p-2 rounded-lg hover:bg-app-quaternary transition-colors"
              >
                <MoreHorizontal size={16} className="text-app-secondary-40" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute bottom-full right-0 mb-1 z-20 bg-app-primary border border-app-primary-20 rounded-xl shadow-xl p-1.5 min-w-[140px]">
                    {wallet.isArchived ? (
                      <button
                        onClick={() => {
                          onUnarchiveWallet(wallet.id);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-orange-400 hover:bg-orange-500/10 transition-colors"
                      >
                        <Archive size={14} /> Unarchive
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onArchiveWallet(wallet.id);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-app-secondary-60 hover:bg-app-quaternary transition-colors"
                      >
                        <Archive size={14} /> Archive
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onDeleteWallet(wallet.id);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
