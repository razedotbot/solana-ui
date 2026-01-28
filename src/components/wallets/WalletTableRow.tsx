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
  Copy,
  Key,
} from "lucide-react";
import { WalletTooltip } from "../Styles";
import { formatAddress } from "../../utils/formatting";
import type { WalletTableRowProps } from "./types";

export const WalletTableRow: React.FC<WalletTableRowProps> = ({
  wallet,
  isSelected,
  solBalance,
  isDragging,
  isDragOver,
  editingLabel,
  editLabelValue,
  onToggleSelection,
  onStartEditingLabel,
  onSaveLabel,
  onCancelEditingLabel,
  onLabelKeyPress,
  setEditLabelValue,
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
      className={`group border-b border-app-primary-10 transition-all duration-200 ${
        isSelected
          ? "bg-app-primary-10 hover:bg-app-primary-15"
          : "hover:bg-app-quaternary/50"
      } ${isDragging ? "opacity-40" : ""} ${
        isDragOver ? "border-t-2 border-t-app-primary-color bg-app-primary-05" : ""
      }`}
    >
      {/* Checkbox + Drag */}
      <td className="pl-3 pr-1 py-2.5 w-12">
        <div className="flex items-center gap-1">
          <div
            data-grip-handle
            draggable={true}
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
              <CheckSquare size={16} className="color-primary" />
            ) : (
              <Square size={16} className="text-app-secondary-40 group-hover:text-app-secondary-60" />
            )}
          </button>
        </div>
      </td>

      {/* Label */}
      <td className="px-2 py-2.5 max-w-[140px]">
        {editingLabel === wallet.id ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editLabelValue}
              onChange={(e) => setEditLabelValue(e.target.value)}
              onKeyDown={(e) => onLabelKeyPress(e, wallet.id)}
              className="bg-app-quaternary border border-app-primary-30 rounded px-2 py-1 text-xs text-app-primary focus:border-app-primary-color focus:outline-none w-28"
              placeholder="Label..."
              autoFocus
            />
            <button onClick={() => onSaveLabel(wallet.id)} className="p-1 hover:bg-green-500/20 rounded transition-colors">
              <Check size={14} className="text-green-400" />
            </button>
            <button onClick={onCancelEditingLabel} className="p-1 hover:bg-red-500/20 rounded transition-colors">
              <XCircle size={14} className="text-red-400" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onStartEditingLabel(wallet)}
            className="flex items-center gap-1 group/label hover:bg-app-quaternary/50 px-1.5 py-0.5 -mx-1 rounded transition-colors truncate max-w-full"
          >
            <span className={`text-xs truncate ${wallet.label ? 'text-app-primary font-medium' : 'text-app-secondary-40 italic'}`}>
              {wallet.label || "Add label"}
            </span>
            <Edit3 size={10} className="text-app-secondary-40 opacity-0 group-hover/label:opacity-60 transition-opacity flex-shrink-0" />
          </button>
        )}
      </td>

      {/* Address */}
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-1.5">
          <code className="text-xs text-app-primary font-mono">
            {formatAddress(wallet.address)}
          </code>
          <button
            onClick={() => onCopyToClipboard(wallet.address)}
            className="p-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-app-quaternary rounded transition-all"
          >
            <Copy size={12} className="text-app-secondary-60" />
          </button>
          {/* Source badge */}
          <span className={`px-1 py-0.5 rounded text-[9px] font-semibold uppercase ${
            wallet.source === "hd-derived"
              ? "bg-blue-500/15 text-blue-400"
              : "bg-purple-500/15 text-purple-400"
          }`}>
            {wallet.source === "hd-derived" ? "HD" : "IMP"}
          </span>
        </div>
      </td>

      {/* Balance */}
      <td className="px-2 py-2.5 text-right">
        <span className={`text-xs font-semibold font-mono tabular-nums ${
          solBalance > 0 ? "text-yellow-400" : "text-app-secondary-40"
        }`}>
          {solBalance.toFixed(4)}
        </span>
      </td>

      {/* Mode/Category */}
      <td className="px-2 py-2.5">
        <button
          onClick={() => onEditWalletQuickTrade(wallet)}
          className={`px-2 py-1 rounded text-[10px] font-semibold uppercase transition-all ${
            wallet.customQuickTradeSettings
              ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
              : wallet.category === "Soft"
                ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
                : wallet.category === "Hard"
                  ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                  : "bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25"
          }`}
        >
          {wallet.customQuickTradeSettings ? "Custom" : wallet.category || "Medium"}
        </button>
      </td>

      {/* Actions - Hover reveal */}
      <td className="px-2 py-2.5 pr-3">
        <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Copy Private Key */}
          <WalletTooltip content="Copy Key" position="top">
            <button
              onClick={() => onCopyToClipboard(wallet.privateKey)}
              className="p-1.5 hover:bg-app-quaternary rounded transition-colors"
            >
              <Key size={14} className="text-app-secondary-60" />
            </button>
          </WalletTooltip>

          {/* Download */}
          <WalletTooltip content="Download" position="top">
            <button
              onClick={() => onDownloadPrivateKey(wallet)}
              className="p-1.5 hover:bg-app-quaternary rounded transition-colors"
            >
              <Download size={14} className="text-app-secondary-60" />
            </button>
          </WalletTooltip>

          {/* Archive/Unarchive */}
          {wallet.isArchived ? (
            <WalletTooltip content="Unarchive" position="top">
              <button
                onClick={() => onUnarchiveWallet(wallet.id)}
                className="p-1.5 hover:bg-orange-500/20 rounded transition-colors"
              >
                <Archive size={14} className="text-orange-400" />
              </button>
            </WalletTooltip>
          ) : (
            <WalletTooltip content="Archive" position="top">
              <button
                onClick={() => onArchiveWallet(wallet.id)}
                className="p-1.5 hover:bg-app-quaternary rounded transition-colors"
              >
                <Archive size={14} className="text-app-secondary-60" />
              </button>
            </WalletTooltip>
          )}

          {/* Delete */}
          <WalletTooltip content="Delete" position="top">
            <button
              onClick={() => onDeleteWallet(wallet.id)}
              className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
            >
              <Trash2 size={14} className="text-red-400" />
            </button>
          </WalletTooltip>
        </div>
      </td>
    </tr>
  );
};
