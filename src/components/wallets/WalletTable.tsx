import React, { useState } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  CheckSquare,
  Square,
  Wallet,
  X,
  Settings,
  Plus,
  Key,
  Sparkles,
  ArrowRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { WalletTooltip } from "../Styles";
import { WalletTableRow } from "./WalletTableRow";
import { WalletCard } from "./WalletCard";
import { QuickTradeBar } from "./QuickTradeBar";
import type { WalletTableProps, SortField } from "./types";
import type { WalletCategory, CustomQuickTradeSettings } from "../../utils/types";

export const WalletTable: React.FC<WalletTableProps> = ({
  wallets,
  filteredAndSortedWallets,
  selectedWallets,
  baseCurrencyBalances,
  baseCurrency,
  sortField,
  sortDirection,
  searchTerm,
  setSearchTerm,
  editingLabel,
  editLabelValue,
  editingCategory,
  draggedWalletId,
  dragOverWalletId,
  onSort,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
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
  onOpenQuickTradeSettings,
  onEditWalletQuickTrade,
  categorySettings,
  onUpdateCategorySettings,
  onSaveWalletCustomSettings,
  onCreateWallet,
  onImportWallet,
}) => {
  const [viewType, setViewType] = useState<"cards" | "table">("cards");

  const SortIcon = ({ field }: { field: SortField }): JSX.Element => {
    if (sortField !== field)
      return <ArrowUpDown size={14} className="text-app-secondary-40" />;
    return sortDirection === "asc" ? (
      <ArrowUp size={14} className="color-primary" />
    ) : (
      <ArrowDown size={14} className="color-primary" />
    );
  };

  const hasSearchActive = searchTerm.trim();

  const handleCategoryChange = (walletId: number, category: WalletCategory): void => {
    onSaveCategory(walletId, category);
  };

  const handleSaveCustomSettings = (walletId: number, settings: CustomQuickTradeSettings | null): void => {
    if (onSaveWalletCustomSettings) {
      onSaveWalletCustomSettings(walletId, settings);
    }
  };

  return (
    <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
      {/* Quick Trade Settings Bar */}
      {onUpdateCategorySettings && (
        <QuickTradeBar
          categorySettings={categorySettings}
          onUpdateSettings={onUpdateCategorySettings}
          onOpenFullSettings={onOpenQuickTradeSettings}
        />
      )}

      {/* Search & Controls Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 color-primary opacity-60" />
          <input
            type="text"
            placeholder="Search by address or label..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-app-tertiary border border-app-primary-20 hover:border-app-primary-30 rounded-lg pl-10 pr-10 py-2.5 text-sm text-app-primary placeholder:text-app-secondary-40 focus:border-app-primary focus:outline-none transition-colors font-mono"
          />
          {searchTerm.trim() && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-app-primary-10 rounded-md transition-colors"
            >
              <X size={14} className="text-app-secondary-60" />
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-app-quaternary border border-app-primary-20 rounded-lg p-1">
          <button
            onClick={() => setViewType("cards")}
            className={`p-2 rounded-md transition-all ${
              viewType === "cards"
                ? "bg-app-primary-color text-app-quaternary"
                : "text-app-secondary-60 hover:text-app-primary"
            }`}
            title="Card View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewType("table")}
            className={`p-2 rounded-md transition-all ${
              viewType === "table"
                ? "bg-app-primary-color text-app-quaternary"
                : "text-app-secondary-60 hover:text-app-primary"
            }`}
            title="Table View"
          >
            <List size={16} />
          </button>
        </div>

        {/* Sort Button */}
        <button
          onClick={() => onSort("solBalance")}
          className="flex items-center gap-1.5 px-3 py-2 bg-app-quaternary border border-app-primary-20 rounded-lg hover:bg-app-tertiary transition-colors"
        >
          <span className="text-xs font-semibold text-app-secondary-60 uppercase">
            {baseCurrency.symbol}
          </span>
          <SortIcon field="solBalance" />
        </button>

        {/* Select All / Clear */}
        {filteredAndSortedWallets.length > 0 && (
          <div className="flex items-center gap-2">
            {selectedWallets.size > 0 ? (
              <button
                onClick={onClearSelection}
                className="text-xs text-app-secondary-60 hover:text-app-primary px-3 py-2 hover:bg-app-quaternary rounded-lg transition-colors"
              >
                Clear ({selectedWallets.size})
              </button>
            ) : (
              <button
                onClick={onSelectAll}
                className="text-xs text-app-secondary-60 hover:text-app-primary px-3 py-2 hover:bg-app-quaternary rounded-lg transition-colors"
              >
                Select all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      {viewType === "cards" ? (
        /* Card View */
        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          {filteredAndSortedWallets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAndSortedWallets.map((wallet) => {
                const isSelected = selectedWallets.has(wallet.id);
                const solBalance = baseCurrencyBalances.get(wallet.address) || 0;
                const isDragging = draggedWalletId === wallet.id;
                const isDragOver = dragOverWalletId === wallet.id;

                return (
                  <WalletCard
                    key={wallet.id}
                    wallet={wallet}
                    isSelected={isSelected}
                    solBalance={solBalance}
                    isDragging={isDragging}
                    isDragOver={isDragOver}
                    editingLabel={editingLabel}
                    editLabelValue={editLabelValue}
                    categorySettings={categorySettings}
                    onToggleSelection={onToggleSelection}
                    onStartEditingLabel={onStartEditingLabel}
                    onSaveLabel={onSaveLabel}
                    onCancelEditingLabel={onCancelEditingLabel}
                    onLabelKeyPress={onLabelKeyPress}
                    setEditLabelValue={setEditLabelValue}
                    onCategoryChange={handleCategoryChange}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                    onArchiveWallet={onArchiveWallet}
                    onUnarchiveWallet={onUnarchiveWallet}
                    onDeleteWallet={onDeleteWallet}
                    onDownloadPrivateKey={onDownloadPrivateKey}
                    onCopyToClipboard={onCopyToClipboard}
                    onEditCustomSettings={onEditWalletQuickTrade}
                    onSaveCustomSettings={handleSaveCustomSettings}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              hasSearchActive={!!hasSearchActive}
              walletsExist={wallets.length > 0}
              onCreateWallet={onCreateWallet}
              onImportWallet={onImportWallet}
            />
          )}
        </div>
      ) : (
        /* Table View */
        <div className="flex-1 overflow-y-auto overflow-x-auto border border-app-primary-15 rounded-xl min-h-0 bg-app-secondary/30">
          <table className="w-full table-auto">
            {/* Header */}
            <thead className="sticky top-0 bg-app-primary border-b border-app-primary-15 z-20">
              <tr>
                {/* Checkbox */}
                <th className="pl-3 pr-1 py-3 w-12 text-left">
                  <button
                    onClick={
                      selectedWallets.size === filteredAndSortedWallets.length
                        ? onClearSelection
                        : onSelectAll
                    }
                    className="p-1 rounded-md hover:bg-app-quaternary transition-colors"
                  >
                    {selectedWallets.size === filteredAndSortedWallets.length &&
                    filteredAndSortedWallets.length > 0 ? (
                      <CheckSquare size={18} className="color-primary" />
                    ) : (
                      <Square size={18} className="text-app-secondary-40 hover:text-app-secondary-60" />
                    )}
                  </button>
                </th>

                {/* Label */}
                <th className="px-2 py-3 text-left">
                  <span className="text-xs font-semibold text-app-secondary-60 uppercase tracking-wider font-mono">
                    Label
                  </span>
                </th>

                {/* Address */}
                <th className="px-2 py-3 text-left">
                  <span className="text-xs font-semibold text-app-secondary-60 uppercase tracking-wider font-mono">
                    Address
                  </span>
                </th>

                {/* Balance */}
                <th className="px-2 py-3 text-right">
                  <button
                    onClick={() => onSort("solBalance")}
                    className="flex items-center gap-1.5 hover:text-app-primary transition-colors ml-auto"
                  >
                    <span className="text-xs font-semibold text-app-secondary-60 uppercase tracking-wider font-mono">
                      {baseCurrency.symbol}
                    </span>
                    <SortIcon field="solBalance" />
                  </button>
                </th>

                {/* Mode */}
                <th className="px-2 py-3 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-app-secondary-60 uppercase tracking-wider font-mono">
                      Mode
                    </span>
                    <WalletTooltip content="Configure categories" position="bottom">
                      <button
                        onClick={onOpenQuickTradeSettings}
                        className="p-1 hover:bg-app-quaternary rounded-md opacity-50 hover:opacity-100 transition-all"
                      >
                        <Settings size={12} className="text-app-secondary-60" />
                      </button>
                    </WalletTooltip>
                  </div>
                </th>

                {/* Actions */}
                <th className="px-2 py-3 pr-3 text-right">
                  <span className="text-xs font-semibold text-app-secondary-60 uppercase tracking-wider font-mono">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {filteredAndSortedWallets.map((wallet) => {
                const isSelected = selectedWallets.has(wallet.id);
                const solBalance = baseCurrencyBalances.get(wallet.address) || 0;
                const isDragging = draggedWalletId === wallet.id;
                const isDragOver = dragOverWalletId === wallet.id;

                return (
                  <WalletTableRow
                    key={wallet.id}
                    wallet={wallet}
                    isSelected={isSelected}
                    solBalance={solBalance}
                    isDragging={isDragging}
                    isDragOver={isDragOver}
                    editingLabel={editingLabel}
                    editLabelValue={editLabelValue}
                    editingCategory={editingCategory}
                    onToggleSelection={onToggleSelection}
                    onStartEditingLabel={onStartEditingLabel}
                    onSaveLabel={onSaveLabel}
                    onCancelEditingLabel={onCancelEditingLabel}
                    onLabelKeyPress={onLabelKeyPress}
                    setEditLabelValue={setEditLabelValue}
                    setEditingCategory={setEditingCategory}
                    onSaveCategory={onSaveCategory}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                    onArchiveWallet={onArchiveWallet}
                    onUnarchiveWallet={onUnarchiveWallet}
                    onDeleteWallet={onDeleteWallet}
                    onDownloadPrivateKey={onDownloadPrivateKey}
                    onCopyToClipboard={onCopyToClipboard}
                    onEditWalletQuickTrade={onEditWalletQuickTrade}
                  />
                );
              })}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredAndSortedWallets.length === 0 && (
            <EmptyState
              hasSearchActive={!!hasSearchActive}
              walletsExist={wallets.length > 0}
              onCreateWallet={onCreateWallet}
              onImportWallet={onImportWallet}
            />
          )}
        </div>
      )}
    </div>
  );
};

// Empty State Component
interface EmptyStateProps {
  hasSearchActive: boolean;
  walletsExist: boolean;
  onCreateWallet?: () => void;
  onImportWallet?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  hasSearchActive,
  walletsExist,
  onCreateWallet,
  onImportWallet,
}) => {
  if (hasSearchActive) {
    return (
      <div className="p-12 text-center text-app-secondary-60">
        <Search size={40} className="mx-auto mb-4 opacity-20" />
        <div className="text-lg font-medium mb-1 font-mono">No wallets found</div>
        <div className="text-sm text-app-secondary-40">Try different search terms</div>
      </div>
    );
  }

  if (!walletsExist) {
    return (
      <div className="p-12">
        <div className="max-w-md mx-auto text-center">
          <div className="relative inline-block mb-6">
            <div className="w-16 h-16 bg-app-primary-10 rounded-2xl flex items-center justify-center border border-app-primary-20">
              <Wallet size={32} className="color-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center animate-pulse">
              <Sparkles size={14} className="text-yellow-400" />
            </div>
          </div>

          <h3 className="text-xl font-bold text-app-primary mb-2 font-mono">Get Started</h3>
          <p className="text-app-secondary-60 mb-6">Create or import your first wallet</p>

          <div className="flex gap-3 justify-center mb-6">
            {onCreateWallet && (
              <button
                onClick={onCreateWallet}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm
                        bg-app-primary-color hover:brightness-110 text-app-quaternary font-semibold transition-all"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Create</span>
              </button>
            )}
            {onImportWallet && (
              <button
                onClick={onImportWallet}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm
                        bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20
                        text-app-primary font-medium transition-all"
              >
                <Key size={18} />
                <span>Import</span>
              </button>
            )}
          </div>

          <div className="text-left bg-app-quaternary/30 border border-app-primary-10 rounded-xl p-4">
            <div className="text-app-secondary-40 uppercase tracking-wider mb-2 text-[10px] font-semibold font-mono">Tips</div>
            <ul className="space-y-2 text-sm text-app-secondary-60">
              <li className="flex items-start gap-2">
                <ArrowRight size={14} className="color-primary mt-0.5 flex-shrink-0" />
                <span>Create multiple wallets for different purposes</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight size={14} className="color-primary mt-0.5 flex-shrink-0" />
                <span>Use labels to organize your wallets</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-12 text-center text-app-secondary-60">
      <Wallet size={40} className="mx-auto mb-4 opacity-20" />
      <div className="text-lg font-medium mb-1 font-mono">No wallets in this view</div>
      <div className="text-sm text-app-secondary-40">Try changing the filters</div>
    </div>
  );
};
