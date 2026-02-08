import React from "react";
import { Layers } from "lucide-react";
import { WalletCard } from "./WalletCard";
import type {
  WalletType,
  WalletCategory,
  WalletGroup,
  CategoryQuickTradeSettings,
  CustomQuickTradeSettings,
} from "../../utils/types";

export interface WalletGridViewProps {
  wallets: WalletType[];
  groups: WalletGroup[];
  selectedWallets: Set<number>;
  baseCurrencyBalances: Map<string, number>;
  editingLabel: number | null;
  editLabelValue: string;
  draggedWalletId: number | null;
  dragOverWalletId: number | null;
  categorySettings: Record<WalletCategory, CategoryQuickTradeSettings>;
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
  onEditWalletQuickTrade: (wallet: WalletType) => void;
  onSaveWalletCustomSettings?: (walletId: number, settings: CustomQuickTradeSettings | null) => void;
  onMoveWalletToGroup: (walletId: number, targetGroupId: string) => void;
}

export const WalletGridView: React.FC<WalletGridViewProps> = ({
  wallets,
  groups,
  selectedWallets,
  baseCurrencyBalances,
  editingLabel,
  editLabelValue,
  draggedWalletId,
  dragOverWalletId,
  categorySettings,
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
  onEditWalletQuickTrade,
  onSaveWalletCustomSettings,
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
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {wallets.map((wallet) => (
        <WalletCard
          key={wallet.id}
          wallet={wallet}
          groups={groups}
          isSelected={selectedWallets.has(wallet.id)}
          solBalance={baseCurrencyBalances.get(wallet.address) || 0}
          isDragging={draggedWalletId === wallet.id}
          isDragOver={dragOverWalletId === wallet.id}
          editingLabel={editingLabel}
          editLabelValue={editLabelValue}
          categorySettings={categorySettings}
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
          onEditCustomSettings={onEditWalletQuickTrade}
          onSaveCustomSettings={onSaveWalletCustomSettings}
          onMoveToGroup={onMoveWalletToGroup}
        />
      ))}
    </div>
  );
};
