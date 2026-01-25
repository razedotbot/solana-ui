import React from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  CheckSquare,
  Square,
  Wallet,
  XCircle,
  GripVertical,
  Settings,
} from "lucide-react";
import { WalletTooltip } from "../Styles";
import { WalletTableRow } from "./WalletTableRow";
import type { WalletTableProps, SortField } from "./types";

export const WalletTable: React.FC<WalletTableProps> = ({
  filteredAndSortedWallets,
  selectedWallets,
  baseCurrencyBalances,
  baseCurrency,
  sortField,
  sortDirection,
  searchTerm,
  setSearchTerm,
  showAddressSearch,
  setShowAddressSearch,
  labelSearchTerm,
  setLabelSearchTerm,
  showLabelSearch,
  setShowLabelSearch,
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
}) => {
  const SortIcon = ({ field }: { field: SortField }): JSX.Element => {
    if (sortField !== field)
      return <ArrowUpDown size={14} className="text-app-secondary-80" />;
    return sortDirection === "asc" ? (
      <ArrowUp size={14} className="color-primary" />
    ) : (
      <ArrowDown size={14} className="color-primary" />
    );
  };

  return (
    <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-auto border border-app-primary-20 rounded-lg min-h-0">
        <table className="w-full text-xs sm:text-sm font-mono">
          {/* Header */}
          <thead className="sticky top-0 bg-app-primary border-b border-app-primary-20 z-10">
            <tr>
              <th className="p-2 sm:p-3 text-left bg-app-primary">
                <div className="flex items-center gap-2">
                  <GripVertical
                    size={12}
                    className="text-app-secondary-60 opacity-40"
                  />
                  <button
                    onClick={
                      selectedWallets.size === filteredAndSortedWallets.length
                        ? onClearSelection
                        : onSelectAll
                    }
                    className="color-primary hover-text-app-primary transition-colors touch-manipulation"
                  >
                    {selectedWallets.size === filteredAndSortedWallets.length &&
                    filteredAndSortedWallets.length > 0 ? (
                      <CheckSquare size={14} className="sm:w-4 sm:h-4" />
                    ) : (
                      <Square size={14} className="sm:w-4 sm:h-4" />
                    )}
                  </button>
                </div>
              </th>
              <th className="p-2 sm:p-3 text-left bg-app-primary">
                {showLabelSearch ? (
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                    <input
                      type="text"
                      placeholder="Search label..."
                      value={labelSearchTerm}
                      onChange={(e) => setLabelSearchTerm(e.target.value)}
                      onBlur={() => {
                        if (!labelSearchTerm.trim()) {
                          setShowLabelSearch(false);
                        }
                      }}
                      autoFocus
                      className="bg-app-quaternary border border-app-primary-20 rounded px-2 py-1 text-xs text-app-primary focus:border-app-primary-60 focus:outline-none font-mono w-32"
                    />
                    <button
                      onClick={() => {
                        setLabelSearchTerm("");
                        setShowLabelSearch(false);
                      }}
                      className="p-1 hover:bg-app-quaternary rounded transition-colors touch-manipulation"
                    >
                      <XCircle
                        size={12}
                        className="text-app-secondary-80 hover:text-app-primary"
                      />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                    <span className="text-app-secondary-80">LABEL</span>
                    <button
                      onClick={() => setShowLabelSearch(true)}
                      className="p-1 hover:bg-app-quaternary rounded transition-colors touch-manipulation"
                    >
                      <Search
                        size={14}
                        className="text-app-secondary-80 hover:color-primary"
                      />
                    </button>
                  </div>
                )}
              </th>
              <th className="hidden sm:table-cell p-2 sm:p-3 text-left bg-app-primary">
                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                  <span className="text-app-secondary-80">QUICKMODE</span>
                  <WalletTooltip
                    content="Configure Quick Trade Category Settings"
                    position="bottom"
                  >
                    <button
                      onClick={onOpenQuickTradeSettings}
                      className="p-1 hover:bg-app-quaternary rounded transition-colors touch-manipulation"
                    >
                      <Settings
                        size={12}
                        className="text-app-secondary-80 hover:text-app-primary"
                      />
                    </button>
                  </WalletTooltip>
                </div>
              </th>
              <th className="hidden sm:table-cell p-2 sm:p-3 text-left bg-app-primary">
                <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                  <span className="text-app-secondary-80">TYPE</span>
                </div>
              </th>
              <th className="p-2 sm:p-3 text-left bg-app-primary">
                {showAddressSearch ? (
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                    <input
                      type="text"
                      placeholder="Search address..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onBlur={() => {
                        if (!searchTerm.trim()) {
                          setShowAddressSearch(false);
                        }
                      }}
                      autoFocus
                      className="bg-app-quaternary border border-app-primary-20 rounded px-2 py-1 text-xs text-app-primary focus:border-app-primary-60 focus:outline-none font-mono w-32"
                    />
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setShowAddressSearch(false);
                      }}
                      className="p-1 hover:bg-app-quaternary rounded transition-colors touch-manipulation"
                    >
                      <XCircle
                        size={12}
                        className="text-app-secondary-80 hover:text-app-primary"
                      />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                    <span className="text-app-secondary-80">ADDRESS</span>
                    <button
                      onClick={() => setShowAddressSearch(true)}
                      className="p-1 hover:bg-app-quaternary rounded transition-colors touch-manipulation"
                    >
                      <Search
                        size={14}
                        className="text-app-secondary-80 hover:color-primary"
                      />
                    </button>
                  </div>
                )}
              </th>
              <th className="p-2 sm:p-3 text-left bg-app-primary">
                <button
                  onClick={() => onSort("solBalance")}
                  className="flex items-center gap-1 sm:gap-2 text-app-secondary-80 hover:color-primary transition-colors touch-manipulation text-[10px] sm:text-xs"
                >
                  {baseCurrency.symbol} BALANCE
                  <SortIcon field="solBalance" />
                </button>
              </th>
              <th className="hidden sm:table-cell p-2 sm:p-3 text-left text-app-secondary-80 text-[10px] sm:text-xs bg-app-primary">
                PRIVATE KEY
              </th>
              <th className="p-2 sm:p-3 text-left text-app-secondary-80 text-[10px] sm:text-xs bg-app-primary">
                ACTIONS
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
          <div className="p-6 sm:p-8 text-center text-app-secondary-80">
            <Wallet size={40} className="sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
            <div className="font-mono text-xs sm:text-sm">
              {searchTerm || labelSearchTerm
                ? "No wallets match your search"
                : "No wallets found"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
