/**
 * CopyTrade - Enhanced Copy Trading Component
 *
 * Mirror trades from watched wallets with advanced configuration options.
 * Cyberpunk neon aesthetic matching app design with emerald accent.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  Download,
  Upload,
  Edit2,
  Copy,
  Trash2,
  ChevronRight,
  Clock,
  Hash,
  X,
  Save,
  Settings2,
  Filter,
  Target,
  ChevronDown,
  ChevronUp,
  Check,
  Wallet,
  Play,
  ToggleLeft,
  ToggleRight,
  Crosshair,
} from "lucide-react";

import type {
  CopyTradeProfile,
  CopyTradeCondition,
  CopyTradeAction,
  CopyTradeMode,
  SimpleModeCopyConfig,
  WalletList,
  OperatorType,
  ActionPriority,
  CooldownUnit,
} from "../../utils/types/automation";

import {
  loadCopyTradeProfiles,
  saveCopyTradeProfiles,
  addCopyTradeProfile,
  updateCopyTradeProfile,
  deleteCopyTradeProfile,
  toggleCopyTradeProfile,
  createDefaultCopyTradeProfile,
  createDefaultCopyTradeCondition,
  createDefaultCopyTradeAction,
  loadCopyTradeWalletLists,
  saveCopyTradeWalletLists,
  createWalletList,
  duplicateProfile,
} from "../../utils/storage/automation";

// ============================================================================
// Types
// ============================================================================

interface CopyTradeWallet {
  address: string;
  privateKey?: string;
  name?: string;
  balance?: number;
}

interface CopyTradeProps {
  availableWallets?: CopyTradeWallet[];
  onExecute?: (profileId: string, action: unknown) => void;
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITIES: { value: ActionPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const COOLDOWN_UNITS: { value: CooldownUnit; label: string }[] = [
  { value: "milliseconds", label: "ms" },
  { value: "seconds", label: "sec" },
  { value: "minutes", label: "min" },
];

const CONDITION_TYPES = [
  { value: "tradeSize", label: "Trade Size (SOL)" },
  { value: "marketCap", label: "Market Cap ($)" },
  { value: "tradeType", label: "Trade Type" },
  { value: "signerBalance", label: "Signer Balance (SOL)" },
  { value: "tokenAge", label: "Token Age (hours)" },
];

const ACTION_TYPES = [
  { value: "mirror", label: "Mirror (Same as trader)" },
  { value: "buy", label: "Always Buy" },
  { value: "sell", label: "Always Sell" },
];

const AMOUNT_TYPES = [
  { value: "multiplier", label: "Multiplier (% of their trade)" },
  { value: "fixed", label: "Fixed Amount (SOL)" },
  { value: "percentage", label: "Percentage of Wallet" },
];

const OPERATORS = [
  { value: "greater", label: ">" },
  { value: "less", label: "<" },
  { value: "equal", label: "=" },
  { value: "greaterEqual", label: ">=" },
  { value: "lessEqual", label: "<=" },
];

// ============================================================================
// Helper Functions
// ============================================================================

const formatAddress = (address: string): string => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatTime = (ms: number): string => {
  const date = new Date(ms);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ============================================================================
// Profile Card Component
// ============================================================================

interface ProfileCardProps {
  profile: CopyTradeProfile;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  return (
    <div
      className={`
        group relative bg-app-secondary-80/50 backdrop-blur-md border rounded-xl overflow-hidden
        transition-all duration-300 hover:-translate-y-1
        ${
          profile.isActive
            ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
            : "border-app-primary-20 hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
        }
      `}
    >
      {/* Scanline effect for active */}
      {profile.isActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-50"
            style={{ animation: "scanline 2s linear infinite" }}
          />
        </div>
      )}

      <div className="p-5 relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onToggle}
              className={`
                flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
                ${
                  profile.isActive
                    ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    : "bg-app-primary-20 text-app-secondary-60 hover:bg-emerald-500/20 hover:text-emerald-400"
                }
              `}
              title={profile.isActive ? "Deactivate" : "Activate"}
            >
              {profile.isActive ? (
                <Crosshair className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-mono text-sm font-semibold text-app-primary truncate">
                  {profile.name}
                </h3>
                {profile.isActive && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              {profile.description && (
                <p className="text-xs text-app-secondary-60 truncate font-mono">
                  {profile.description}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg text-app-secondary-60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDuplicate}
              className="p-2 rounded-lg text-app-secondary-60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-app-secondary-60 hover:text-error hover:bg-error-20 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            {profile.walletAddresses.length}
          </span>
          <span className="px-2 py-1 rounded bg-app-primary-10 text-app-secondary font-mono text-xs uppercase">
            {profile.mode}
          </span>
          <span className="text-app-secondary-60 font-mono text-xs flex items-center gap-1">
            <Filter className="w-3 h-3" />
            {profile.conditions.length}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-app-primary-20">
          <div className="flex items-center gap-4 text-[11px] font-mono text-app-secondary-60">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {profile.executionCount}
            </span>
            {profile.lastExecuted && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(profile.lastExecuted)}
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-app-secondary-40 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Wallet Manager Component
// ============================================================================

interface WalletManagerProps {
  currentAddresses: string[];
  onAddressesChange: (addresses: string[]) => void;
}

const WalletManager: React.FC<WalletManagerProps> = ({
  currentAddresses,
  onAddressesChange,
}) => {
  const [savedLists, setSavedLists] = useState<WalletList[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [newListName, setNewListName] = useState("");
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedLists(loadCopyTradeWalletLists());
  }, []);

  useEffect(() => {
    saveCopyTradeWalletLists(savedLists);
  }, [savedLists]);

  const handleAddAddress = (): void => {
    const address = newAddress.trim();
    if (!address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return;
    if (!currentAddresses.includes(address)) {
      onAddressesChange([...currentAddresses, address]);
    }
    setNewAddress("");
  };

  const handleRemoveAddress = (address: string): void => {
    onAddressesChange(currentAddresses.filter((a) => a !== address));
  };

  const handleSaveList = (): void => {
    if (!newListName.trim() || currentAddresses.length === 0) return;
    const newList = createWalletList(newListName, currentAddresses);
    setSavedLists((prev) => [...prev, newList]);
    setNewListName("");
    setIsCreatingList(false);
  };

  const handleSelectList = (list: WalletList): void => {
    onAddressesChange(list.addresses);
  };

  const handleDeleteList = (listId: string): void => {
    setSavedLists((prev) => prev.filter((l) => l.id !== listId));
  };

  const handleFileImport = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const addresses = content
        .split(/[\n,]/)
        .map((addr) => addr.trim())
        .filter((addr) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr));

      if (addresses.length > 0) {
        const existingSet = new Set(currentAddresses);
        const newAddrs = addresses.filter((a) => !existingSet.has(a));
        if (newAddrs.length > 0) {
          onAddressesChange([...currentAddresses, ...newAddrs]);
        }
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Add Address Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-secondary-60" />
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddAddress()}
            placeholder="Enter wallet address to monitor..."
            className="w-full h-10 pl-10 pr-4 bg-app-quaternary border border-app-primary-20 rounded-lg font-mono text-sm text-app-primary
                       focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all
                       placeholder:text-app-secondary-40"
          />
        </div>
        <button
          onClick={handleAddAddress}
          disabled={!newAddress.trim()}
          className="px-4 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-lg
                     font-mono text-sm text-emerald-400 hover:bg-emerald-500/30 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Current Addresses */}
      {currentAddresses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-app-secondary-60 uppercase tracking-wider">
              Monitoring {currentAddresses.length} wallet
              {currentAddresses.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={handleFileImport}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 text-xs font-mono text-app-secondary-60 hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                Import
              </button>
              {!isCreatingList && (
                <button
                  onClick={() => setIsCreatingList(true)}
                  className="px-2 py-1 text-xs font-mono text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  Save List
                </button>
              )}
            </div>
          </div>

          {isCreatingList && (
            <div className="flex items-center gap-2 p-3 bg-app-primary-10 border border-emerald-500/30 rounded-lg">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="List name..."
                className="flex-1 px-3 py-2 bg-app-quaternary border border-app-primary-20 rounded-lg font-mono text-sm text-app-primary
                           focus:outline-none focus:border-emerald-500/50"
                onKeyDown={(e) => e.key === "Enter" && handleSaveList()}
                autoFocus
              />
              <button
                onClick={handleSaveList}
                disabled={!newListName.trim()}
                className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsCreatingList(false);
                  setNewListName("");
                }}
                className="p-2 bg-app-primary-20 rounded-lg text-app-secondary-60 hover:bg-app-primary-40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {currentAddresses.map((address) => (
              <div
                key={address}
                className="flex items-center justify-between p-3 bg-app-primary-10 rounded-lg group hover:bg-app-primary-20 transition-colors"
              >
                <span
                  className="font-mono text-xs text-app-secondary-80"
                  title={address}
                >
                  {formatAddress(address)}
                </span>
                <button
                  onClick={() => handleRemoveAddress(address)}
                  className="p-1 rounded text-app-secondary-40 hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Lists */}
      {savedLists.length > 0 && (
        <div className="pt-4 border-t border-app-primary-20">
          <span className="text-xs font-mono text-app-secondary-60 uppercase tracking-wider mb-3 block">
            Saved Lists
          </span>
          <div className="space-y-2">
            {savedLists.map((list) => (
              <div
                key={list.id}
                className="border border-app-primary-20 rounded-lg overflow-hidden hover:border-emerald-500/30 transition-colors"
              >
                <div className="flex items-center justify-between p-3">
                  <button
                    onClick={() => handleSelectList(list)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-mono text-sm text-app-primary">
                        {list.name}
                      </span>
                      <span className="ml-2 font-mono text-xs text-app-secondary-60">
                        ({list.addresses.length})
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setExpandedListId(
                          expandedListId === list.id ? null : list.id,
                        )
                      }
                      className="p-1.5 rounded text-app-secondary-60 hover:bg-app-primary-20 transition-colors"
                    >
                      {expandedListId === list.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="p-1.5 rounded text-app-secondary-60 hover:text-error hover:bg-error-20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {expandedListId === list.id && (
                  <div className="px-3 pb-3 border-t border-app-primary-20">
                    <div className="grid grid-cols-2 gap-1 mt-2 max-h-32 overflow-y-auto">
                      {list.addresses.map((addr) => (
                        <span
                          key={addr}
                          className="text-xs font-mono text-app-secondary-60 p-1"
                          title={addr}
                        >
                          {formatAddress(addr)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Condition Builder Component
// ============================================================================

interface ConditionBuilderProps {
  condition: CopyTradeCondition;
  index: number;
  onUpdate: (updates: Partial<CopyTradeCondition>) => void;
  onRemove: () => void;
  onToggle: () => void;
}

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  condition,
  index,
  onUpdate,
  onRemove,
  onToggle,
}) => {
  const isTradeType = condition.type === "tradeType";
  const isEnabled = true;

  return (
    <div
      className={`
        bg-app-primary border rounded-lg p-4 transition-all duration-200
        ${isEnabled ? "border-app-primary-40" : "border-app-primary-20 opacity-50"}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-xs font-mono text-emerald-400">
            {index + 1}
          </span>
          <span className="text-xs font-mono text-app-secondary-60 uppercase tracking-wider">
            Condition
          </span>
          <button
            onClick={onToggle}
            className={`p-1 rounded transition-colors ${
              isEnabled ? "text-emerald-400" : "text-app-secondary-60 hover:text-app-secondary"
            }`}
          >
            {isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded text-app-secondary-60 hover:text-error hover:bg-error-20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Type
          </label>
          <select
            value={condition.type}
            onChange={(e) =>
              onUpdate({
                type: e.target.value as CopyTradeCondition["type"],
              })
            }
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-emerald-500/50 transition-colors"
          >
            {CONDITION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Operator
          </label>
          <select
            value={condition.operator}
            onChange={(e) =>
              onUpdate({ operator: e.target.value as OperatorType })
            }
            disabled={isTradeType}
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
          >
            {isTradeType ? (
              <option value="equal">=</option>
            ) : (
              OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Value
          </label>
          {isTradeType ? (
            <select
              value={condition.tradeType || "buy"}
              onChange={(e) =>
                onUpdate({
                  tradeType: e.target.value as "buy" | "sell",
                  value: e.target.value === "buy" ? 1 : 0,
                })
              }
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          ) : (
            <input
              type="number"
              step="0.01"
              min="0"
              value={condition.value}
              onChange={(e) =>
                onUpdate({ value: parseFloat(e.target.value) || 0 })
              }
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Action Builder Component
// ============================================================================

interface ActionBuilderProps {
  action: CopyTradeAction;
  index: number;
  onUpdate: (updates: Partial<CopyTradeAction>) => void;
  onRemove: () => void;
}

const ActionBuilder: React.FC<ActionBuilderProps> = ({
  action,
  index,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="bg-app-primary border border-app-primary-40 rounded-lg p-4 hover:border-emerald-500/30 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-xs font-mono text-emerald-400">
            {index + 1}
          </span>
          <span className="text-xs font-mono text-app-secondary-60 uppercase tracking-wider">
            Action
          </span>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded text-app-secondary-60 hover:text-error hover:bg-error-20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Action
          </label>
          <select
            value={action.type}
            onChange={(e) =>
              onUpdate({ type: e.target.value as CopyTradeAction["type"] })
            }
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-emerald-500/50 transition-colors"
          >
            {ACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Amount Type
          </label>
          <select
            value={action.amountType}
            onChange={(e) =>
              onUpdate({
                amountType: e.target.value as CopyTradeAction["amountType"],
              })
            }
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-emerald-500/50 transition-colors"
          >
            {AMOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            {action.amountType === "multiplier"
              ? "Multiplier"
              : action.amountType === "fixed"
                ? "SOL Amount"
                : "Percentage"}
          </label>
          <input
            type="number"
            step={action.amountType === "multiplier" ? "0.1" : "0.01"}
            min="0"
            max={action.amountType === "percentage" ? 100 : undefined}
            value={action.amount}
            onChange={(e) =>
              onUpdate({ amount: parseFloat(e.target.value) || 0 })
            }
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Slippage (%)
          </label>
          <input
            type="number"
            step="0.5"
            min="0.1"
            max="50"
            value={action.slippage}
            onChange={(e) =>
              onUpdate({ slippage: parseFloat(e.target.value) || 5 })
            }
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
          Priority
        </label>
        <select
          value={action.priority}
          onChange={(e) =>
            onUpdate({ priority: e.target.value as ActionPriority })
          }
          className="w-full sm:w-48 h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                     focus:outline-none focus:border-emerald-500/50 transition-colors"
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

// ============================================================================
// Profile Builder Component
// ============================================================================

interface ProfileBuilderProps {
  profile?: CopyTradeProfile | null;
  walletLists: WalletList[];
  onSave: (profile: CopyTradeProfile) => void;
  onCancel: () => void;
}

const ProfileBuilder: React.FC<ProfileBuilderProps> = ({
  profile,
  onSave,
  onCancel,
}) => {
  const isEditing = !!profile;

  const [name, setName] = useState(profile?.name || "");
  const [description, setDescription] = useState(profile?.description || "");
  const [mode, setMode] = useState<CopyTradeMode>(profile?.mode || "simple");
  const [simpleConfig, setSimpleConfig] = useState<SimpleModeCopyConfig>(
    profile?.simpleConfig || {
      amountMultiplier: 1.0,
      slippage: 5,
      priority: "medium",
      mirrorTradeType: true,
    },
  );
  const [walletAddresses, setWalletAddresses] = useState<string[]>(
    profile?.walletAddresses || [],
  );
  const [conditions, setConditions] = useState<CopyTradeCondition[]>(
    profile?.conditions || [],
  );
  const [conditionLogic, setConditionLogic] = useState<"and" | "or">(
    profile?.conditionLogic || "and",
  );
  const [actions, setActions] = useState<CopyTradeAction[]>(
    profile?.actions || [],
  );
  const [cooldown, setCooldown] = useState(profile?.cooldown || 5);
  const [cooldownUnit, setCooldownUnit] = useState<CooldownUnit>(
    profile?.cooldownUnit || "seconds",
  );
  const [maxExecutions, setMaxExecutions] = useState<number | undefined>(
    profile?.maxExecutions,
  );
  const [expandedSection, setExpandedSection] = useState<string | null>("basic");

  const toggleSection = (section: string): void => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const addCondition = (): void => {
    setConditions([...conditions, createDefaultCopyTradeCondition()]);
  };

  const updateCondition = (
    id: string,
    updates: Partial<CopyTradeCondition>,
  ): void => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const removeCondition = (id: string): void => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const toggleCondition = (_id: string): void => {
    // Conditions are always enabled when in the array
  };

  const addAction = (): void => {
    setActions([...actions, createDefaultCopyTradeAction()]);
  };

  const updateAction = (id: string, updates: Partial<CopyTradeAction>): void => {
    setActions(actions.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAction = (id: string): void => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const handleSave = (): void => {
    if (!name.trim()) return;
    if (walletAddresses.length === 0) return;
    if (mode === "advanced" && actions.length === 0) return;

    const copyProfile: CopyTradeProfile = {
      id: profile?.id || createDefaultCopyTradeProfile().id,
      name: name.trim(),
      description: description.trim(),
      isActive: false,
      mode,
      simpleConfig: mode === "simple" ? simpleConfig : undefined,
      conditions,
      conditionLogic,
      actions,
      walletListId: null,
      walletAddresses,
      tokenFilterMode: "all",
      specificTokens: [],
      blacklistedTokens: [],
      cooldown,
      cooldownUnit,
      maxExecutions,
      executionCount: profile?.executionCount || 0,
      lastExecuted: profile?.lastExecuted,
      createdAt: profile?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    onSave(copyProfile);
  };

  const renderSection = (
    id: string,
    title: string,
    icon: React.ReactNode,
    content: React.ReactNode,
    badge?: string,
  ): React.ReactElement => {
    const isExpanded = expandedSection === id;
    return (
      <div className="border border-app-primary-20 rounded-lg overflow-hidden transition-all">
        <button
          onClick={() => toggleSection(id)}
          className={`
            w-full flex items-center justify-between p-4 text-left transition-colors
            ${isExpanded ? "bg-app-primary-20" : "bg-app-primary hover:bg-app-primary-10"}
          `}
        >
          <div className="flex items-center gap-3">
            <span className="text-emerald-400">{icon}</span>
            <span className="font-mono text-sm font-medium text-app-primary">
              {title}
            </span>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400">
                {badge}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-app-secondary-60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-app-secondary-60" />
          )}
        </button>
        {isExpanded && (
          <div className="p-4 border-t border-app-primary-20 bg-app-primary">
            {content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-app-secondary-80/50 backdrop-blur-md border border-app-primary-20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-app-primary-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-mono text-base font-semibold text-app-primary">
              {isEditing ? "Edit Copy Trade" : "New Copy Trade"}
            </h2>
            <p className="text-xs text-app-secondary-60 font-mono">Configure your copy trading profile</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Basic Info */}
        {renderSection(
          "basic",
          "Basic Information",
          <Settings2 className="w-5 h-5" />,
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
                Profile Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Copy Trade"
                className="w-full h-10 px-3 bg-app-quaternary border border-app-primary-20 rounded-lg text-sm font-mono text-app-primary
                           placeholder:text-app-secondary-40 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional..."
                className="w-full h-10 px-3 bg-app-quaternary border border-app-primary-20 rounded-lg text-sm font-mono text-app-primary
                           placeholder:text-app-secondary-40 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>,
        )}

        {/* Mode Selection */}
        {renderSection(
          "mode",
          "Trading Mode",
          <Target className="w-5 h-5" />,
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setMode("simple")}
                className={`
                  p-4 rounded-lg border text-left transition-all duration-200
                  ${
                    mode === "simple"
                      ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      : "bg-app-primary border-app-primary-20 hover:bg-app-primary-10 hover:border-app-primary-40"
                  }
                `}
              >
                <div className={`font-mono text-sm font-semibold mb-1 ${mode === "simple" ? "text-emerald-400" : "text-app-secondary-80"}`}>
                  Simple Mode
                </div>
                <div className="text-xs text-app-secondary-60 font-mono">
                  Mirror trades with configurable multiplier
                </div>
              </button>
              <button
                onClick={() => setMode("advanced")}
                className={`
                  p-4 rounded-lg border text-left transition-all duration-200
                  ${
                    mode === "advanced"
                      ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      : "bg-app-primary border-app-primary-20 hover:bg-app-primary-10 hover:border-app-primary-40"
                  }
                `}
              >
                <div className={`font-mono text-sm font-semibold mb-1 ${mode === "advanced" ? "text-emerald-400" : "text-app-secondary-80"}`}>
                  Advanced Mode
                </div>
                <div className="text-xs text-app-secondary-60 font-mono">
                  Custom conditions and actions
                </div>
              </button>
            </div>

            {mode === "simple" && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                <div>
                  <label className="block text-[10px] font-mono text-app-secondary-40 mb-1">Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={simpleConfig.amountMultiplier}
                    onChange={(e) =>
                      setSimpleConfig({
                        ...simpleConfig,
                        amountMultiplier: parseFloat(e.target.value) || 1,
                      })
                    }
                    className="w-full h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-primary text-center
                               focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-app-secondary-40 mb-1">Slippage %</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="50"
                    value={simpleConfig.slippage}
                    onChange={(e) =>
                      setSimpleConfig({
                        ...simpleConfig,
                        slippage: parseFloat(e.target.value) || 5,
                      })
                    }
                    className="w-full h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-primary text-center
                               focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-app-secondary-40 mb-1">Priority</label>
                  <select
                    value={simpleConfig.priority}
                    onChange={(e) =>
                      setSimpleConfig({
                        ...simpleConfig,
                        priority: e.target.value as ActionPriority,
                      })
                    }
                    className="w-full h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-primary
                               focus:outline-none focus:border-emerald-500/50 transition-colors"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-app-quaternary border border-app-primary-20 w-full">
                    <input
                      type="checkbox"
                      checked={simpleConfig.mirrorTradeType}
                      onChange={(e) =>
                        setSimpleConfig({
                          ...simpleConfig,
                          mirrorTradeType: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className={`w-8 h-5 rounded-full transition-colors relative ${simpleConfig.mirrorTradeType ? "bg-emerald-500" : "bg-app-primary-40"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${simpleConfig.mirrorTradeType ? "left-3.5" : "left-0.5"}`} />
                    </div>
                    <span className="text-[10px] font-mono text-app-secondary-60">Mirror</span>
                  </label>
                </div>
              </div>
            )}
          </div>,
        )}

        {/* Wallets */}
        {renderSection(
          "wallets",
          "Wallets to Monitor",
          <Users className="w-5 h-5" />,
          <WalletManager
            currentAddresses={walletAddresses}
            onAddressesChange={setWalletAddresses}
          />,
          `${walletAddresses.length}`,
        )}

        {/* Advanced Conditions */}
        {mode === "advanced" &&
          renderSection(
            "conditions",
            "Conditions",
            <Filter className="w-5 h-5" />,
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-app-secondary-60 font-mono">Logic:</span>
                  <div className="flex bg-app-quaternary rounded p-0.5 border border-app-primary-20">
                    <button
                      onClick={() => setConditionLogic("and")}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        conditionLogic === "and"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "text-app-secondary-60 hover:text-app-secondary-80"
                      }`}
                    >
                      AND
                    </button>
                    <button
                      onClick={() => setConditionLogic("or")}
                      className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        conditionLogic === "or"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "text-app-secondary-60 hover:text-app-secondary-80"
                      }`}
                    >
                      OR
                    </button>
                  </div>
                </div>
                <button
                  onClick={addCondition}
                  className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs font-mono text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              {conditions.length === 0 ? (
                <div className="text-center py-8 text-app-secondary-60 font-mono text-xs border border-dashed border-app-primary-20 rounded-lg">
                  No conditions - all trades will trigger
                </div>
              ) : (
                <div className="space-y-3">
                  {conditions.map((cond, idx) => (
                    <ConditionBuilder
                      key={cond.id}
                      condition={cond}
                      index={idx}
                      onUpdate={(updates) => updateCondition(cond.id, updates)}
                      onRemove={() => removeCondition(cond.id)}
                      onToggle={() => toggleCondition(cond.id)}
                    />
                  ))}
                </div>
              )}
            </div>,
            `${conditions.length}`,
          )}

        {/* Advanced Actions */}
        {mode === "advanced" &&
          renderSection(
            "actions",
            "Actions",
            <Target className="w-5 h-5" />,
            <div className="space-y-4">
              <div className="flex items-center justify-end">
                <button
                  onClick={addAction}
                  className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs font-mono text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              {actions.length === 0 ? (
                <div className="text-center py-8 text-app-secondary-60 font-mono text-xs border border-dashed border-app-primary-20 rounded-lg">
                  Add at least one action
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map((action, idx) => (
                    <ActionBuilder
                      key={action.id}
                      action={action}
                      index={idx}
                      onUpdate={(updates) => updateAction(action.id, updates)}
                      onRemove={() => removeAction(action.id)}
                    />
                  ))}
                </div>
              )}
            </div>,
            `${actions.length}`,
          )}

        {/* Execution Settings */}
        {renderSection(
          "execution",
          "Execution Settings",
          <Settings2 className="w-5 h-5" />,
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[10px] font-mono text-app-secondary-40 mb-1">Cooldown</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="0"
                  value={cooldown}
                  onChange={(e) => setCooldown(parseInt(e.target.value) || 0)}
                  className="flex-1 h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-primary text-center
                             focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                <select
                  value={cooldownUnit}
                  onChange={(e) => setCooldownUnit(e.target.value as CooldownUnit)}
                  className="h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-secondary
                             focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  {COOLDOWN_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-app-secondary-40 mb-1">Max Executions</label>
              <input
                type="number"
                min="0"
                value={maxExecutions || ""}
                onChange={(e) => setMaxExecutions(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="∞"
                className="w-full h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-primary text-center
                           placeholder:text-app-secondary-40 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>,
        )}
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-app-primary-20 flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-app-primary-20 hover:bg-app-primary-40 rounded-lg text-sm font-mono text-app-secondary-60
                     hover:text-app-secondary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || walletAddresses.length === 0}
          className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-mono font-medium text-white
                     transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isEditing ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const CopyTrade: React.FC<CopyTradeProps> = ({ availableWallets: _availableWallets = [] }) => {
  const [profiles, setProfiles] = useState<CopyTradeProfile[]>([]);
  const [walletLists, setWalletLists] = useState<WalletList[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfiles(loadCopyTradeProfiles());
    setWalletLists(loadCopyTradeWalletLists());
  }, []);

  const filteredProfiles = useMemo(() => {
    let result = profiles;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)
      );
    }
    if (filterActive !== null) {
      result = result.filter((p) => p.isActive === filterActive);
    }
    return result;
  }, [profiles, searchTerm, filterActive]);

  const stats = useMemo(() => ({
    total: profiles.length,
    active: profiles.filter((p) => p.isActive).length,
  }), [profiles]);

  const handleToggle = (id: string): void => {
    setProfiles(toggleCopyTradeProfile(id));
  };

  const handleDelete = (id: string): void => {
    if (!confirm("Delete this profile?")) return;
    setProfiles(deleteCopyTradeProfile(id));
  };

  const handleDuplicate = (id: string): void => {
    const profile = profiles.find((p) => p.id === id);
    if (profile) {
      const dup = duplicateProfile(profile, "copytrade");
      setProfiles(addCopyTradeProfile(dup));
    }
  };

  const handleSave = (profile: CopyTradeProfile): void => {
    if (editingId) {
      setProfiles(updateCopyTradeProfile(profile));
    } else {
      setProfiles(addCopyTradeProfile(profile));
    }
    setIsCreating(false);
    setEditingId(null);
  };

  const handleExport = (): void => {
    const data = JSON.stringify(profiles, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `copytrade_profiles_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content) as CopyTradeProfile[];
        if (Array.isArray(imported)) {
          imported.forEach((p) => {
            p.id = `copytrade_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            p.isActive = false;
            p.executionCount = 0;
          });
          const updated = [...profiles, ...imported];
          saveCopyTradeProfiles(updated);
          setProfiles(updated);
        }
      } catch {
        alert("Invalid file format");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-mono text-lg font-semibold text-app-primary">Copy Trade</h2>
            <div className="flex items-center gap-3 text-xs font-mono text-app-secondary-60">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {stats.active} live
              </span>
              <span>{stats.total} total</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-app-primary-20 text-app-secondary-60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Import"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg bg-app-primary-20 text-app-secondary-60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setIsCreating(true); setEditingId(null); }}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-mono font-medium text-white
                       transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Profile
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-secondary-60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search profiles..."
            className="w-full h-10 pl-10 pr-4 bg-app-quaternary border border-app-primary-20 rounded-lg text-sm font-mono text-app-primary
                       placeholder:text-app-secondary-40 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-app-primary-10 rounded-lg">
          {[
            { value: null, label: "All" },
            { value: true, label: "Live" },
            { value: false, label: "Off" },
          ].map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setFilterActive(f.value)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                filterActive === f.value
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-app-secondary-60 hover:text-app-secondary hover:bg-app-primary-20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isCreating || editingId ? (
        <ProfileBuilder
          profile={editingId ? profiles.find((p) => p.id === editingId) : null}
          walletLists={walletLists}
          onSave={handleSave}
          onCancel={() => { setIsCreating(false); setEditingId(null); }}
        />
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-16 bg-app-secondary-80/30 backdrop-blur-md border border-app-primary-20 rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-emerald-400 opacity-50" />
          </div>
          <p className="font-mono text-sm text-app-secondary-60 mb-4">
            {searchTerm || filterActive !== null ? "No profiles found" : "No copy trade profiles yet"}
          </p>
          {!searchTerm && filterActive === null && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-sm font-mono text-emerald-400
                         transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Profile
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onToggle={() => handleToggle(profile.id)}
              onEdit={() => setEditingId(profile.id)}
              onDuplicate={() => handleDuplicate(profile.id)}
              onDelete={() => handleDelete(profile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CopyTrade;
