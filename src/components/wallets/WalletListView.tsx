import React from "react";
import { Layers } from "lucide-react";
import { WalletRow } from "./WalletRow";
import type {
  WalletType,
  WalletCategory,
  WalletGroup,
  CategoryQuickTradeSettings,
  CustomQuickTradeSettings,
} from "../../utils/types";

export interface WalletListViewProps {
  wallets: WalletType[];
  groups: WalletGroup[];
  selectedWallets: Set<number>;
  baseCurrencyBalances: Map<string, number>;
  editingLabel: number | null;
  editLabelValue: string;
  draggedWalletId: number | null;
  dragOverWalletId: number | null;
  quickModeSettings: Record<WalletCategory, CategoryQuickTradeSettings>;
  onToggleSelection: (walletId: number) => void;
  onStartEditingLabel: (wallet: WalletType) => void;
  onSaveLabel: (walletId: number) => void;
  onCancelEditingLabel: () => void;
  onLabelKeyPress: (e: React.KeyboardEvent, walletId: number) => void;
  setEditLabelValue: (value: string) => void;
  onSaveCategory: (walletId: number, category: WalletCategory) => void;
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
  onMoveWalletToGroup: (walletId: number, targetGroupId: string) => void;
}

export const WalletListView: React.FC<WalletListViewProps> = ({
  wallets,
  groups,
  selectedWallets,
  baseCurrencyBalances,
  editingLabel,
  editLabelValue,
  draggedWalletId,
  dragOverWalletId,
  quickModeSettings,
  onToggleSelection,
  onStartEditingLabel,
  onSaveLabel,
  onCancelEditingLabel,
  onLabelKeyPress,
  setEditLabelValue,
  onSaveCategory,
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
  onMoveWalletToGroup,
}) => {
  if (wallets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-app-quaternary border border-app-primary-20 flex items-center justify-center">
            <Layers size={28} className="text-app-secondary-40" />
          </div>
          <h3 className="text-lg font-semibold text-app-primary mb-2">No wallets found</h3>
          <p className="text-sm text-app-secondary-60 max-w-sm">
            Create a new wallet or import an existing one to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-app-primary-15 overflow-hidden bg-app-secondary/10">
      {/* Header row */}
      <div className="hidden md:flex items-center gap-2 px-3 py-2 border-b border-app-primary-15 bg-app-secondary/20 text-[11px] text-app-secondary-40 uppercase tracking-wider font-medium flex-shrink-0">
        <div className="w-[52px] flex-shrink-0" />
        <div className="w-[180px] flex-shrink-0">Wallet</div>
        <div className="w-[80px] flex-shrink-0">QuickMode</div>
        <div className="w-[140px] flex-shrink-0">Buy / Sell</div>
        <div className="w-[90px] flex-shrink-0 text-right">Balance</div>
        <div className="ml-auto">Actions</div>
      </div>

      {/* Wallet rows - scrollable */}
      <div className="flex-1 overflow-y-auto">
      {wallets.map((wallet) => (
        <WalletRow
          key={wallet.id}
          wallet={wallet}
          groups={groups}
          isSelected={selectedWallets.has(wallet.id)}
          solBalance={baseCurrencyBalances.get(wallet.address) || 0}
          isDragging={draggedWalletId === wallet.id}
          isDragOver={dragOverWalletId === wallet.id}
          editingLabel={editingLabel}
          editLabelValue={editLabelValue}
          quickModeSettings={quickModeSettings}
          onToggleSelection={onToggleSelection}
          onStartEditingLabel={onStartEditingLabel}
          onSaveLabel={onSaveLabel}
          onCancelEditingLabel={onCancelEditingLabel}
          onLabelKeyPress={onLabelKeyPress}
          setEditLabelValue={setEditLabelValue}
          onCategoryChange={onSaveCategory}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          onArchiveWallet={onArchiveWallet}
          onUnarchiveWallet={onUnarchiveWallet}
          onDeleteWallet={onDeleteWallet}
          onCopyToClipboard={onCopyToClipboard}
          onSaveCustomQuickMode={onSaveCustomQuickMode}
          onMoveToGroup={onMoveWalletToGroup}
        />
      ))}
      </div>
    </div>
  );
};
