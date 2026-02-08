import React, { useState } from "react";
import {
  X,
  Plus,
  Edit3,
  Trash2,
  Palette,
  Check,
  Layers,
  Wallet,
  ChevronDown,
  ChevronRight,
  Key,
  Download,
} from "lucide-react";
import type { WalletType, WalletGroup, MasterWallet } from "../../utils/types";
import { DEFAULT_GROUP_ID } from "../../utils/types";
import { formatAddress, formatBaseCurrencyBalance } from "../../utils/formatting";
import type { BaseCurrencyConfig } from "../../utils/constants";

export interface GroupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // Groups
  groups: WalletGroup[];
  activeGroupId: string;
  walletCounts: Map<string, number>;
  onGroupChange: (groupId: string) => void;
  onCreateGroup: (name: string, color?: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateGroupColor: (groupId: string, color: string) => void;
  // Master Wallets
  masterWallets: MasterWallet[];
  wallets: WalletType[];
  baseCurrencyBalances: Map<string, number>;
  baseCurrency: BaseCurrencyConfig;
  expandedMasterWallets: Set<string>;
  onToggleMasterExpansion: (id: string) => void;
  onCreateMasterWallet: () => void;
  onImportMasterWallet: () => void;
  onExportSeedPhrase: (masterWallet: MasterWallet) => void;
  onDeleteMasterWallet: (id: string) => void;
  onCopyToClipboard: (text: string) => void;
}

const colors = [
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export const GroupDrawer: React.FC<GroupDrawerProps> = ({
  isOpen,
  onClose,
  groups,
  activeGroupId,
  walletCounts,
  onGroupChange,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onUpdateGroupColor,
  masterWallets,
  wallets,
  baseCurrencyBalances,
  baseCurrency,
  expandedMasterWallets,
  onToggleMasterExpansion,
  onCreateMasterWallet,
  onImportMasterWallet,
  onExportSeedPhrase,
  onDeleteMasterWallet,
  onCopyToClipboard,
}) => {
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [colorPickerGroupId, setColorPickerGroupId] = useState<string | null>(null);

  const totalWallets = walletCounts.get("__total__") || groups.reduce((sum, g) => sum + (walletCounts.get(g.id) || 0), 0);

  const handleAddGroup = (): void => {
    const name = newGroupName.trim();
    if (!name) return;
    onCreateGroup(name);
    setNewGroupName("");
    setIsAddingGroup(false);
  };

  const handleRenameGroup = (groupId: string): void => {
    const name = editGroupName.trim();
    if (!name) return;
    onRenameGroup(groupId, name);
    setEditingGroupId(null);
    setEditGroupName("");
  };

  const startEditing = (group: WalletGroup): void => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setColorPickerGroupId(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed top-16 inset-x-0 bottom-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-16 bottom-0 right-0 w-80 bg-app-primary border-l border-app-primary-20 shadow-2xl z-50 flex flex-col animate-drawer-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-app-primary-15">
          <h2 className="text-sm font-bold text-app-primary">Groups & Wallets</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-app-quaternary transition-colors"
          >
            <X size={18} className="text-app-secondary-60" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Master Wallets Section */}
          {masterWallets.length > 0 && (
            <div className="p-4 border-b border-app-primary-15">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet size={14} className="color-primary" />
                  <span className="text-xs font-semibold text-app-secondary-60 uppercase tracking-wider">
                    Master Wallets
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={onCreateMasterWallet}
                    className="p-1.5 rounded-lg hover:bg-app-quaternary transition-colors"
                    title="Create master wallet"
                  >
                    <Plus size={14} className="text-app-secondary-60" />
                  </button>
                  <button
                    onClick={onImportMasterWallet}
                    className="p-1.5 rounded-lg hover:bg-app-quaternary transition-colors"
                    title="Import master wallet"
                  >
                    <Key size={14} className="text-app-secondary-60" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {masterWallets.map((masterWallet) => {
                  const derivedWallets = wallets.filter(
                    (w) => w.masterWalletId === masterWallet.id
                  );
                  const isExpanded = expandedMasterWallets.has(masterWallet.id);

                  return (
                    <div
                      key={masterWallet.id}
                      className="bg-app-quaternary/50 rounded-xl border border-app-primary-15 overflow-hidden"
                    >
                      <button
                        onClick={() => onToggleMasterExpansion(masterWallet.id)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-app-quaternary transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} className="text-app-secondary-40" />
                        ) : (
                          <ChevronRight size={14} className="text-app-secondary-40" />
                        )}
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold text-app-primary">
                            {masterWallet.name}
                          </div>
                          <div className="text-[10px] text-app-secondary-60">
                            {derivedWallets.length} derived wallet{derivedWallets.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2">
                          {/* Derived wallets */}
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {derivedWallets
                              .sort((a, b) => (a.derivationIndex || 0) - (b.derivationIndex || 0))
                              .map((wallet) => {
                                const isMaster = wallet.derivationIndex === 0;
                                const balance = baseCurrencyBalances.get(wallet.address) || 0;

                                return (
                                  <div
                                    key={wallet.id}
                                    className="flex items-center justify-between py-1 px-2 rounded bg-app-quaternary/50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`text-[10px] font-mono ${
                                          isMaster ? "text-app-primary-color font-bold" : "text-app-secondary-60"
                                        }`}
                                      >
                                        #{wallet.derivationIndex}
                                      </span>
                                      <button
                                        onClick={() => onCopyToClipboard(wallet.address)}
                                        className="text-[10px] text-app-secondary-60 hover:text-app-primary font-mono truncate max-w-[100px]"
                                      >
                                        {formatAddress(wallet.address)}
                                      </button>
                                    </div>
                                    <span className="text-[10px] font-mono text-app-secondary-60">
                                      {formatBaseCurrencyBalance(balance, baseCurrency)}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-app-primary-15">
                            <button
                              onClick={() => onExportSeedPhrase(masterWallet)}
                              className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-app-secondary-60 hover:text-app-primary rounded hover:bg-app-quaternary transition-colors"
                            >
                              <Download size={12} />
                              Export
                            </button>
                            <button
                              onClick={() => onDeleteMasterWallet(masterWallet.id)}
                              className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Groups Section */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers size={14} className="color-primary" />
                <span className="text-xs font-semibold text-app-secondary-60 uppercase tracking-wider">
                  Groups
                </span>
              </div>
              <button
                onClick={() => setIsAddingGroup(true)}
                className="p-1.5 rounded-lg hover:bg-app-quaternary transition-colors"
                title="Add group"
              >
                <Plus size={14} className="text-app-secondary-60" />
              </button>
            </div>

            {/* Add group input */}
            {isAddingGroup && (
              <div className="mb-3 p-3 bg-app-quaternary/50 rounded-xl border border-app-primary-20">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddGroup();
                    if (e.key === "Escape") {
                      setIsAddingGroup(false);
                      setNewGroupName("");
                    }
                  }}
                  placeholder="Group name..."
                  autoFocus
                  className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-2 text-sm text-app-primary placeholder:text-app-secondary-40 focus:outline-none focus:border-app-primary"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAddGroup}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-app-primary-color text-app-quaternary"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingGroup(false);
                      setNewGroupName("");
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg bg-app-quaternary text-app-secondary-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* All Wallets */}
            <button
              onClick={() => {
                onGroupChange("all");
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2 transition-colors ${
                activeGroupId === "all"
                  ? "bg-app-primary-color/10 border border-app-primary-color/30"
                  : "hover:bg-app-quaternary"
              }`}
            >
              <Layers size={16} className={activeGroupId === "all" ? "color-primary" : "text-app-secondary-40"} />
              <span className={`flex-1 text-left text-sm font-medium ${activeGroupId === "all" ? "color-primary" : "text-app-primary"}`}>
                All Wallets
              </span>
              <span className="text-xs font-mono text-app-secondary-40">{totalWallets}</span>
            </button>

            {/* Group list */}
            <div className="space-y-1">
              {groups.map((group) => {
                const count = walletCounts.get(group.id) || 0;
                const isActive = activeGroupId === group.id;
                const isDefault = group.id === DEFAULT_GROUP_ID;

                return (
                  <div key={group.id} className="relative group/item">
                    {editingGroupId === group.id ? (
                      <div className="p-2 bg-app-quaternary/50 rounded-xl">
                        <input
                          type="text"
                          value={editGroupName}
                          onChange={(e) => setEditGroupName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameGroup(group.id);
                            if (e.key === "Escape") {
                              setEditingGroupId(null);
                              setEditGroupName("");
                            }
                          }}
                          autoFocus
                          className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-1.5 text-sm text-app-primary focus:outline-none focus:border-app-primary"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleRenameGroup(group.id)}
                            className="p-1.5 rounded hover:bg-emerald-500/20"
                          >
                            <Check size={14} className="text-emerald-400" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingGroupId(null);
                              setEditGroupName("");
                            }}
                            className="p-1.5 rounded hover:bg-rose-500/20"
                          >
                            <X size={14} className="text-rose-400" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          onGroupChange(group.id);
                          onClose();
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                          isActive
                            ? "bg-app-primary-color/10 border border-app-primary-color/30"
                            : "hover:bg-app-quaternary"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color || "#666" }}
                        />
                        <span className={`flex-1 text-left text-sm font-medium truncate ${isActive ? "color-primary" : "text-app-primary"}`}>
                          {group.name}
                        </span>
                        <span className="text-xs font-mono text-app-secondary-40">{count}</span>

                        {/* Actions - visible on hover */}
                        <div className="hidden group-hover/item:flex items-center gap-0.5 ml-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setColorPickerGroupId(colorPickerGroupId === group.id ? null : group.id);
                            }}
                            className="p-1 rounded hover:bg-app-quaternary"
                          >
                            <Palette size={12} className="text-app-secondary-40" />
                          </button>
                          {!isDefault && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(group);
                                }}
                                className="p-1 rounded hover:bg-app-quaternary"
                              >
                                <Edit3 size={12} className="text-app-secondary-40" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteGroup(group.id);
                                }}
                                className="p-1 rounded hover:bg-rose-500/10"
                              >
                                <Trash2 size={12} className="text-rose-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </button>
                    )}

                    {/* Color picker */}
                    {colorPickerGroupId === group.id && (
                      <div className="absolute right-0 top-full mt-1 z-10 bg-app-primary border border-app-primary-20 rounded-xl shadow-xl p-2">
                        <div className="grid grid-cols-4 gap-1.5">
                          {colors.map((color) => (
                            <button
                              key={color}
                              onClick={() => {
                                onUpdateGroupColor(group.id, color);
                                setColorPickerGroupId(null);
                              }}
                              className={`w-6 h-6 rounded-lg transition-transform hover:scale-110 ${
                                group.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-app-primary" : ""
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
