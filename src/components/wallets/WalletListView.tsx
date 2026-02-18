import React, { useState, useRef, useEffect } from "react";
import { Layers, Search, X, RefreshCw, CheckSquare, Square } from "lucide-react";
import { WalletRow } from "./WalletRow";
import { QuickModeDropdown } from "./WalletsHeader";
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
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  isConnected: boolean;
  editingLabel: number | null;
  editLabelValue: string;
  draggedWalletId: number | null;
  dragOverWalletId: number | null;
  quickModeSettings: Record<WalletCategory, CategoryQuickTradeSettings>;
  onToggleSelection: (walletId: number) => void;
  onSelectAll: (walletIds: number[]) => void;
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
  onUpdateQuickMode: (category: WalletCategory, settings: CategoryQuickTradeSettings) => void;
}

export const WalletListView: React.FC<WalletListViewProps> = ({
  wallets,
  groups,
  selectedWallets,
  baseCurrencyBalances,
  searchTerm,
  onSearchChange,
  onRefresh,
  isRefreshing,
  isConnected,
  editingLabel,
  editLabelValue,
  draggedWalletId,
  dragOverWalletId,
  quickModeSettings,
  onToggleSelection,
  onSelectAll,
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
  onUpdateQuickMode,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleCloseSearch = (): void => {
    setIsSearchOpen(false);
    onSearchChange("");
  };

  if (wallets.length === 0 && !searchTerm) {
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
        <div className="w-[52px] flex-shrink-0 flex items-center justify-center">
          <button
            onClick={() => {
              const allSelected = wallets.length > 0 && wallets.every((w) => selectedWallets.has(w.id));
              onSelectAll(allSelected ? [] : wallets.map((w) => w.id));
            }}
            className="p-1 rounded-lg hover:bg-app-quaternary transition-colors"
            title={wallets.every((w) => selectedWallets.has(w.id)) ? "Deselect all" : "Select all"}
          >
            {wallets.length > 0 && wallets.every((w) => selectedWallets.has(w.id)) ? (
              <CheckSquare size={16} className="color-primary" />
            ) : (
              <Square size={16} className="text-app-secondary-40" />
            )}
          </button>
        </div>
        <div className="w-[180px] flex-shrink-0">
          {isSearchOpen ? (
            <div className="flex items-center gap-1">
              <Search size={11} className="text-app-secondary-40 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") handleCloseSearch(); }}
                className="w-full bg-transparent border-none text-[11px] text-app-primary placeholder:text-app-secondary-40 focus:outline-none font-mono"
              />
              <button onClick={handleCloseSearch} className="p-0.5 hover:bg-app-primary-10 rounded transition-colors flex-shrink-0">
                <X size={11} className="text-app-secondary-40" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span>Wallet</span>
              <button onClick={() => setIsSearchOpen(true)} className="p-0.5 hover:bg-app-primary-10 rounded transition-colors">
                <Search size={11} className="text-app-secondary-40 hover:text-app-primary" />
              </button>
            </div>
          )}
        </div>
        <div className="w-[80px] flex-shrink-0">QuickMode</div>
        <div className="w-[140px] flex-shrink-0 flex items-center gap-1.5">
          <span>Buy / Sell</span>
          <QuickModeDropdown
            quickModeSettings={quickModeSettings}
            onUpdateQuickMode={onUpdateQuickMode}
            compact
          />
        </div>
        <div className="w-[90px] flex-shrink-0 text-right flex items-center justify-end gap-1">
          <span>Balance</span>
          <button
            onClick={onRefresh}
            disabled={!isConnected || isRefreshing}
            className={`p-0.5 rounded transition-colors ${
              isRefreshing
                ? "text-app-secondary-40"
                : "text-app-secondary-40 hover:text-app-primary"
            }`}
            title="Refresh balances"
          >
            <RefreshCw size={11} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="ml-auto">Actions</div>
      </div>

      {/* Wallet rows - scrollable */}
      <div className="flex-1 overflow-y-auto">
      {wallets.length === 0 && searchTerm ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Search size={24} className="mx-auto mb-2 text-app-secondary-40" />
            <p className="text-sm text-app-secondary-60">No wallets matching "{searchTerm}"</p>
          </div>
        </div>
      ) : wallets.map((wallet) => (
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
