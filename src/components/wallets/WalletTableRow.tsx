import React from "react";
import {
  Download,
  Trash2,
  CheckSquare,
  Square,
  Edit3,
  Check,
  XCircle,
  Archive,
  GripVertical,
} from "lucide-react";
import { WalletTooltip } from "../Styles";
import { formatAddress } from "../../utils/formatting";
import type { WalletCategory } from "../../utils/types";
import type { WalletTableRowProps } from "./types";

export const WalletTableRow: React.FC<WalletTableRowProps> = ({
  wallet,
  isSelected,
  solBalance,
  isDragging,
  isDragOver,
  editingLabel,
  editLabelValue,
  editingCategory,
  onToggleSelection,
  onStartEditingLabel,
  onSaveLabel,
  onCancelEditingLabel,
  onLabelKeyPress,
  setEditLabelValue,
  setEditingCategory,
  onSaveCategory,
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
  onEditWalletQuickTrade,
}) => {
  return (
    <tr
      onDragOver={(e) => onDragOver(e, wallet.id)}
      onDragLeave={(e) => onDragLeave(e)}
      onDrop={(e) => onDrop(e, wallet.id)}
      className={`border-b border-app-primary-20 hover:bg-app-quaternary transition-all ${
        isSelected ? "bg-app-quaternary" : ""
      } ${isDragging ? "opacity-40 bg-app-primary-color/5" : ""} ${
        isDragOver
          ? "border-t-2 border-t-app-primary-color bg-app-primary-color/10"
          : ""
      }`}
    >
      <td className="p-2 sm:p-3">
        <div className="flex items-center gap-2">
          <div
            data-grip-handle
            draggable={true}
            onDragStart={(e) => onDragStart(e, wallet.id)}
            onDragEnd={onDragEnd}
            className="cursor-grab active:cursor-grabbing flex items-center"
          >
            <GripVertical
              size={14}
              className="text-app-secondary-60 opacity-60 hover:opacity-100 transition-opacity"
            />
          </div>
          <button
            onClick={() => onToggleSelection(wallet.id)}
            className="color-primary hover-text-app-primary transition-colors touch-manipulation"
          >
            {isSelected ? (
              <CheckSquare size={14} className="sm:w-4 sm:h-4" />
            ) : (
              <Square size={14} className="sm:w-4 sm:h-4" />
            )}
          </button>
        </div>
      </td>
      <td className="p-2 sm:p-3">
        {editingLabel === wallet.id ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editLabelValue}
              onChange={(e) => setEditLabelValue(e.target.value)}
              onKeyDown={(e) => onLabelKeyPress(e, wallet.id)}
              className="bg-app-quaternary border border-app-primary-20 rounded-lg px-2 py-1.5 sm:py-1 text-xs sm:text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono flex-1"
              placeholder="Enter label..."
              autoFocus
            />
            <button
              onClick={() => onSaveLabel(wallet.id)}
              className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 touch-manipulation"
            >
              <Check size={14} className="color-primary" />
            </button>
            <button
              onClick={onCancelEditingLabel}
              className="p-1.5 sm:p-1 hover:bg-app-quaternary border border-app-primary-20 rounded-lg transition-all duration-300 touch-manipulation"
            >
              <XCircle size={14} className="text-red-500" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-app-primary font-mono text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
              {wallet.label || "No label"}
            </span>
            <button
              onClick={() => onStartEditingLabel(wallet)}
              className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 opacity-60 hover:opacity-100 touch-manipulation"
            >
              <Edit3 size={12} className="color-primary" />
            </button>
          </div>
        )}
      </td>
      <td className="hidden sm:table-cell p-2 sm:p-3">
        {editingCategory === wallet.id ? (
          <div className="flex items-center gap-2">
            <select
              value={wallet.category || "Medium"}
              onChange={(e) => {
                const value = e.target.value as WalletCategory;
                onSaveCategory(wallet.id, value);
              }}
              onBlur={() => setEditingCategory(null)}
              autoFocus
              className="bg-app-quaternary border border-app-primary-20 rounded-lg px-2 py-1.5 sm:py-1 text-xs sm:text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono"
            >
              <option value="Soft">Soft</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <button
              onClick={() => setEditingCategory(null)}
              className="p-1.5 sm:p-1 hover:bg-app-quaternary border border-app-primary-20 rounded-lg transition-all duration-300 touch-manipulation"
            >
              <XCircle size={14} className="text-red-500" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <WalletTooltip
              content={
                wallet.customQuickTradeSettings
                  ? "Using custom quick trade settings (click to configure)"
                  : `Using ${wallet.category || "Medium"} category settings (click to configure)`
              }
              position="top"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditWalletQuickTrade(wallet);
                }}
                className={`text-app-primary font-mono text-xs sm:text-sm px-2 py-1 rounded transition-all hover:opacity-80 ${
                  wallet.customQuickTradeSettings
                    ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                    : wallet.category === "Soft"
                      ? "bg-green-500/20 text-green-400"
                      : wallet.category === "Medium"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : wallet.category === "Hard"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {wallet.customQuickTradeSettings
                  ? "Custom"
                  : wallet.category || "Medium"}
              </button>
            </WalletTooltip>
            <button
              onClick={() => setEditingCategory(wallet.id)}
              className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 opacity-60 hover:opacity-100 touch-manipulation"
            >
              <Edit3 size={12} className="color-primary" />
            </button>
          </div>
        )}
      </td>
      <td className="hidden sm:table-cell p-2 sm:p-3">
        <span
          className={`text-app-primary font-mono text-xs sm:text-sm px-2 py-1 rounded ${
            wallet.source === "hd-derived"
              ? "bg-blue-500/20 text-blue-400"
              : "bg-purple-500/20 text-purple-400"
          }`}
        >
          {wallet.source === "hd-derived" ? "HD" : "IM"}
        </span>
      </td>
      <td className="p-2 sm:p-3">
        <WalletTooltip content="Click to copy address" position="top">
          <button
            onClick={() => onCopyToClipboard(wallet.address)}
            className="text-app-primary hover:color-primary transition-colors font-mono text-[10px] sm:text-xs touch-manipulation"
          >
            {formatAddress(wallet.address)}
          </button>
        </WalletTooltip>
      </td>
      <td className="p-2 sm:p-3">
        <span
          className={`${solBalance > 0 ? "color-primary" : "text-app-secondary-80"} font-bold text-xs sm:text-sm`}
        >
          {solBalance.toFixed(4)}
        </span>
      </td>
      <td className="hidden sm:table-cell p-2 sm:p-3">
        <WalletTooltip content="Click to copy private key" position="top">
          <button
            onClick={() => onCopyToClipboard(wallet.privateKey)}
            className="text-app-secondary-80 hover:color-primary transition-colors font-mono text-[10px] sm:text-xs touch-manipulation"
          >
            {wallet.privateKey.substring(0, 12)}...
          </button>
        </WalletTooltip>
      </td>
      <td className="p-2 sm:p-3">
        <div className="flex gap-1 flex-wrap">
          {wallet.isArchived ? (
            <WalletTooltip content="Unarchive Wallet" position="top">
              <button
                onClick={() => onUnarchiveWallet(wallet.id)}
                className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 touch-manipulation"
              >
                <Archive size={14} className="text-app-primary-color" />
              </button>
            </WalletTooltip>
          ) : (
            <WalletTooltip content="Archive Wallet" position="top">
              <button
                onClick={() => onArchiveWallet(wallet.id)}
                className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 touch-manipulation"
              >
                <Archive size={14} className="color-primary" />
              </button>
            </WalletTooltip>
          )}

          <WalletTooltip content="Download Private Key" position="top">
            <button
              onClick={() => onDownloadPrivateKey(wallet)}
              className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 touch-manipulation"
            >
              <Download size={14} className="color-primary" />
            </button>
          </WalletTooltip>

          <WalletTooltip content="Delete Wallet" position="top">
            <button
              onClick={() => onDeleteWallet(wallet.id)}
              className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 touch-manipulation"
            >
              <Trash2 size={14} className="text-red-500" />
            </button>
          </WalletTooltip>
        </div>
      </td>
    </tr>
  );
};
