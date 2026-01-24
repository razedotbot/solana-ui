/**
 * Automate - Enhanced Strategy Automation Component
 *
 * Create complex trading strategies with conditions and actions.
 * Cyberpunk neon aesthetic matching app design with purple accent.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Bot,
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
  Cpu,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Wallet,
  Play,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import type {
  TradingStrategy,
  TradingCondition,
  TradingAction,
  TradingConditionType,
  ActionAmountType,
  VolumeType,
  OperatorType,
  ActionPriority,
  CooldownUnit,
  ConditionLogic,
} from "../../utils/types/automation";

import {
  loadStrategies,
  saveStrategies,
  addStrategy,
  updateStrategy,
  deleteStrategy,
  toggleStrategy,
  createDefaultStrategy,
  createDefaultTradingCondition,
  createDefaultTradingAction,
  duplicateProfile,
} from "../../utils/storage/automation";

// ============================================================================
// Types
// ============================================================================

interface AutomateWallet {
  address: string;
  privateKey?: string;
  name?: string;
  balance?: number;
}

interface AutomateProps {
  availableWallets?: AutomateWallet[];
  onExecute?: (strategyId: string, action: unknown) => void;
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

const CONDITION_TYPES: { value: TradingConditionType; label: string; icon: React.ReactNode }[] = [
  { value: "marketCap", label: "Market Cap", icon: <BarChart3 className="w-4 h-4" /> },
  { value: "buyVolume", label: "Buy Volume", icon: <TrendingUp className="w-4 h-4" /> },
  { value: "sellVolume", label: "Sell Volume", icon: <TrendingDown className="w-4 h-4" /> },
  { value: "netVolume", label: "Net Volume", icon: <Activity className="w-4 h-4" /> },
  { value: "lastTradeAmount", label: "Last Trade Amount", icon: <Target className="w-4 h-4" /> },
  { value: "lastTradeType", label: "Last Trade Type", icon: <Target className="w-4 h-4" /> },
  { value: "whitelistActivity", label: "Whitelist Activity", icon: <Wallet className="w-4 h-4" /> },
];

const ACTION_TYPES: { value: "buy" | "sell"; label: string }[] = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
];

const AMOUNT_TYPES: { value: ActionAmountType; label: string }[] = [
  { value: "percentage", label: "Percentage of Balance" },
  { value: "sol", label: "Fixed Amount (SOL)" },
  { value: "lastTrade", label: "Last Trade Amount" },
  { value: "volume", label: "Volume-based Amount" },
  { value: "whitelistVolume", label: "Whitelist Volume-based" },
];

const VOLUME_TYPES: { value: VolumeType; label: string }[] = [
  { value: "buyVolume", label: "Buy Volume" },
  { value: "sellVolume", label: "Sell Volume" },
  { value: "netVolume", label: "Net Volume" },
];

const OPERATORS: { value: OperatorType; label: string }[] = [
  { value: "greater", label: ">" },
  { value: "less", label: "<" },
  { value: "equal", label: "=" },
  { value: "greaterEqual", label: ">=" },
  { value: "lessEqual", label: "<=" },
];

const TIMEFRAMES = [
  { value: 0, label: "Current" },
  { value: 1, label: "Last 1 minute" },
  { value: 5, label: "Last 5 minutes" },
  { value: 15, label: "Last 15 minutes" },
  { value: 60, label: "Last 1 hour" },
];

// ============================================================================
// Helper Functions
// ============================================================================

const formatTime = (ms: number): string => {
  const date = new Date(ms);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAddress = (address: string): string => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// ============================================================================
// Strategy Card Component
// ============================================================================

interface StrategyCardProps {
  strategy: TradingStrategy;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
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
          strategy.isActive
            ? "border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.25)]"
            : "border-app-primary-20 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]"
        }
      `}
    >
      {/* Scanline effect for active */}
      {strategy.isActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-50"
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
                  strategy.isActive
                    ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                    : "bg-app-primary-20 text-app-secondary-60 hover:bg-purple-500/20 hover:text-purple-400"
                }
              `}
              title={strategy.isActive ? "Deactivate" : "Activate"}
            >
              {strategy.isActive ? (
                <Cpu className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-mono text-sm font-semibold text-app-primary truncate">
                  {strategy.name}
                </h3>
                {strategy.isActive && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 animate-pulse">
                    RUNNING
                  </span>
                )}
              </div>
              {strategy.description && (
                <p className="text-xs text-app-secondary-60 truncate font-mono">
                  {strategy.description}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg text-app-secondary-60 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDuplicate}
              className="p-2 rounded-lg text-app-secondary-60 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
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
          <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 font-mono text-xs flex items-center gap-1.5">
            <Filter className="w-3 h-3" />
            {strategy.conditions.length}
          </span>
          <span className="px-2 py-1 rounded bg-app-primary-10 text-app-secondary font-mono text-xs flex items-center gap-1.5">
            <Target className="w-3 h-3" />
            {strategy.actions.length}
          </span>
          <span className="text-app-secondary-60 font-mono text-xs uppercase">
            {strategy.conditionLogic}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-app-primary-20">
          <div className="flex items-center gap-4 text-[11px] font-mono text-app-secondary-60">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {strategy.executionCount}
            </span>
            {strategy.lastExecuted && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(strategy.lastExecuted)}
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-app-secondary-40 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Condition Builder Component
// ============================================================================

interface ConditionBuilderProps {
  condition: TradingCondition;
  index: number;
  onUpdate: (updates: Partial<TradingCondition>) => void;
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
  const isTradeType = condition.type === "lastTradeType";
  const isWhitelist = condition.type === "whitelistActivity";
  const showTimeframe = !isWhitelist && !isTradeType;
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
          <span className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center text-xs font-mono text-purple-400">
            {index + 1}
          </span>
          <span className="text-xs font-mono text-app-secondary-60 uppercase tracking-wider">
            Condition
          </span>
          <button
            onClick={onToggle}
            className={`p-1 rounded transition-colors ${
              isEnabled ? "text-purple-400" : "text-app-secondary-60 hover:text-app-secondary"
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

      <div className={`grid gap-3 ${isWhitelist ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
        {/* Type */}
        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Type
          </label>
          <select
            value={condition.type}
            onChange={(e) => onUpdate({ type: e.target.value as TradingConditionType })}
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-purple-500/50 transition-colors"
          >
            {CONDITION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Operator */}
        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Operator
          </label>
          <select
            value={condition.operator}
            onChange={(e) => onUpdate({ operator: e.target.value as OperatorType })}
            disabled={isTradeType}
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-purple-500/50 transition-colors disabled:opacity-50"
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        {/* Value */}
        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            {isTradeType ? "Trade Type" : isWhitelist ? "Activity Type" : "Value"}
          </label>
          {isTradeType ? (
            <select
              value={condition.value}
              onChange={(e) => onUpdate({ value: Number(e.target.value) })}
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         focus:outline-none focus:border-purple-500/50 transition-colors"
            >
              <option value={1}>Buy</option>
              <option value={0}>Sell</option>
            </select>
          ) : isWhitelist ? (
            <select
              value={condition.whitelistActivityType || "buyVolume"}
              onChange={(e) => onUpdate({ whitelistActivityType: e.target.value as TradingCondition["whitelistActivityType"], value: 1 })}
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         focus:outline-none focus:border-purple-500/50 transition-colors"
            >
              {VOLUME_TYPES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
              <option value="lastTradeAmount">Last Trade Amount</option>
              <option value="lastTradeType">Last Trade Type</option>
            </select>
          ) : (
            <input
              type="number"
              min="0"
              value={condition.value}
              onChange={(e) => onUpdate({ value: parseFloat(e.target.value) || 0 })}
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          )}
        </div>

        {/* Timeframe */}
        {showTimeframe && (
          <div>
            <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
              Timeframe
            </label>
            <select
              value={condition.timeframe || 0}
              onChange={(e) => onUpdate({ timeframe: Number(e.target.value) })}
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         focus:outline-none focus:border-purple-500/50 transition-colors"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf.value} value={tf.value}>
                  {tf.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Whitelist Address */}
        {isWhitelist && (
          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
              Whitelist Address
            </label>
            <input
              type="text"
              value={condition.whitelistAddress || ""}
              onChange={(e) => onUpdate({ whitelistAddress: e.target.value })}
              placeholder="Enter wallet address..."
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-app-secondary-40"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Action Builder Component
// ============================================================================

interface ActionBuilderProps {
  action: TradingAction;
  index: number;
  onUpdate: (updates: Partial<TradingAction>) => void;
  onRemove: () => void;
}

const ActionBuilder: React.FC<ActionBuilderProps> = ({
  action,
  index,
  onUpdate,
  onRemove,
}) => {
  const showVolumeType = action.amountType === "volume";
  const showWhitelistVolume = action.amountType === "whitelistVolume";
  const showMultiplier = action.amountType === "lastTrade" || showVolumeType || showWhitelistVolume;
  const showBasicAmount = !showMultiplier;

  return (
    <div className="bg-app-primary border border-app-primary-40 rounded-lg p-4 hover:border-purple-500/30 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center text-xs font-mono text-purple-400">
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
        {/* Action Type */}
        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Action
          </label>
          <select
            value={action.type}
            onChange={(e) => onUpdate({ type: e.target.value as "buy" | "sell" })}
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-purple-500/50 transition-colors"
          >
            {ACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Type */}
        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Amount Type
          </label>
          <select
            value={action.amountType}
            onChange={(e) => onUpdate({ amountType: e.target.value as ActionAmountType })}
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-purple-500/50 transition-colors"
          >
            {AMOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Value */}
        {showBasicAmount && (
          <div>
            <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
              {action.amountType === "percentage" ? "Percentage (%)" : "Amount (SOL)"}
            </label>
            <input
              type="number"
              step={action.amountType === "sol" ? "0.01" : "1"}
              min="0"
              max={action.amountType === "percentage" ? 100 : undefined}
              value={action.amount}
              onChange={(e) => onUpdate({ amount: parseFloat(e.target.value) || 0 })}
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
        )}

        {/* Multiplier */}
        {showMultiplier && (
          <div>
            <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
              Multiplier
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={action.amount}
              onChange={(e) => onUpdate({ amount: parseFloat(e.target.value) || 0 })}
              placeholder="1.0"
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
        )}

        {/* Slippage */}
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
            onChange={(e) => onUpdate({ slippage: parseFloat(e.target.value) || 5 })}
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Volume Options */}
      {showVolumeType && (
        <div className="mt-3">
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Volume Type
          </label>
          <select
            value={action.volumeType || "buyVolume"}
            onChange={(e) => onUpdate({ volumeType: e.target.value as VolumeType })}
            className="w-full sm:w-48 h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-purple-500/50 transition-colors"
          >
            {VOLUME_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Whitelist Volume Options */}
      {showWhitelistVolume && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
              Whitelist Address
            </label>
            <input
              type="text"
              value={action.whitelistAddress || ""}
              onChange={(e) => onUpdate({ whitelistAddress: e.target.value })}
              placeholder="Enter wallet address..."
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-app-secondary-40"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
              Activity Type
            </label>
            <select
              value={action.whitelistActivityType || "buyVolume"}
              onChange={(e) => onUpdate({ whitelistActivityType: e.target.value as TradingAction["whitelistActivityType"] })}
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         focus:outline-none focus:border-purple-500/50 transition-colors"
            >
              {VOLUME_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Priority */}
      <div className="mt-3">
        <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
          Priority
        </label>
        <select
          value={action.priority}
          onChange={(e) => onUpdate({ priority: e.target.value as ActionPriority })}
          className="w-full sm:w-48 h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                     focus:outline-none focus:border-purple-500/50 transition-colors"
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
// Strategy Builder Component
// ============================================================================

interface StrategyBuilderProps {
  strategy?: TradingStrategy | null;
  onSave: (strategy: TradingStrategy) => void;
  onCancel: () => void;
}

const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  strategy,
  onSave,
  onCancel,
}) => {
  const isEditing = !!strategy;

  const [name, setName] = useState(strategy?.name || "");
  const [description, setDescription] = useState(strategy?.description || "");
  const [conditions, setConditions] = useState<TradingCondition[]>(strategy?.conditions || []);
  const [conditionLogic, setConditionLogic] = useState<ConditionLogic>(strategy?.conditionLogic || "and");
  const [actions, setActions] = useState<TradingAction[]>(strategy?.actions || []);
  const [cooldown, setCooldown] = useState(strategy?.cooldown || 5);
  const [cooldownUnit, setCooldownUnit] = useState<CooldownUnit>(strategy?.cooldownUnit || "seconds");
  const [maxExecutions, setMaxExecutions] = useState<number | undefined>(strategy?.maxExecutions);
  const [tokenAddresses, setTokenAddresses] = useState<string[]>(strategy?.tokenAddresses || []);
  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>("basic");

  const toggleSection = (section: string): void => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const addCondition = (): void => {
    setConditions([...conditions, createDefaultTradingCondition()]);
  };

  const updateCondition = (id: string, updates: Partial<TradingCondition>): void => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeCondition = (id: string): void => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const toggleCondition = (_id: string): void => {
    // Conditions are always enabled when in the array
  };

  const addAction = (): void => {
    setActions([...actions, createDefaultTradingAction()]);
  };

  const updateAction = (id: string, updates: Partial<TradingAction>): void => {
    setActions(actions.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAction = (id: string): void => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const addTokenAddress = (): void => {
    const addr = newTokenAddress.trim();
    if (addr && !tokenAddresses.includes(addr)) {
      setTokenAddresses([...tokenAddresses, addr]);
      setNewTokenAddress("");
    }
  };

  const removeTokenAddress = (addr: string): void => {
    setTokenAddresses(tokenAddresses.filter((a) => a !== addr));
  };

  const handleSave = (): void => {
    if (!name.trim()) return;
    if (conditions.length === 0) return;
    if (actions.length === 0) return;

    const tradingStrategy: TradingStrategy = {
      id: strategy?.id || createDefaultStrategy().id,
      name: name.trim(),
      description: description.trim(),
      isActive: false,
      conditions,
      conditionLogic,
      actions,
      cooldown,
      cooldownUnit,
      maxExecutions,
      executionCount: strategy?.executionCount || 0,
      lastExecuted: strategy?.lastExecuted,
      createdAt: strategy?.createdAt || Date.now(),
      updatedAt: Date.now(),
      whitelistedAddresses: [],
      tokenAddresses,
      walletAddresses: [],
    };
    onSave(tradingStrategy);
  };

  const renderSection = (
    id: string,
    title: string,
    icon: React.ReactNode,
    content: React.ReactNode,
    badge?: string
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
            <span className="text-purple-400">{icon}</span>
            <span className="font-mono text-sm font-medium text-app-primary">
              {title}
            </span>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-400">
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
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-mono text-base font-semibold text-app-primary">
              {isEditing ? "Edit Strategy" : "New Strategy"}
            </h2>
            <p className="text-xs text-app-secondary-60 font-mono">Configure your automated trading strategy</p>
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
                Strategy Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Strategy"
                className="w-full h-10 px-3 bg-app-quaternary border border-app-primary-20 rounded-lg text-sm font-mono text-app-primary
                           placeholder:text-app-secondary-40 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
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
                           placeholder:text-app-secondary-40 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
              />
            </div>
          </div>
        )}

        {/* Conditions */}
        {renderSection(
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
                        ? "bg-purple-500/20 text-purple-400"
                        : "text-app-secondary-60 hover:text-app-secondary-80"
                    }`}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => setConditionLogic("or")}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                      conditionLogic === "or"
                        ? "bg-purple-500/20 text-purple-400"
                        : "text-app-secondary-60 hover:text-app-secondary-80"
                    }`}
                  >
                    OR
                  </button>
                </div>
              </div>
              <button
                onClick={addCondition}
                className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded text-xs font-mono text-purple-400 hover:bg-purple-500/30 transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            {conditions.length === 0 ? (
              <div className="text-center py-8 text-app-secondary-60 font-mono text-xs border border-dashed border-app-primary-20 rounded-lg">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Add conditions to trigger this strategy
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
          `${conditions.length}`
        )}

        {/* Actions */}
        {renderSection(
          "actions",
          "Actions",
          <Target className="w-5 h-5" />,
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <button
                onClick={addAction}
                className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded text-xs font-mono text-purple-400 hover:bg-purple-500/30 transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            {actions.length === 0 ? (
              <div className="text-center py-8 text-app-secondary-60 font-mono text-xs border border-dashed border-app-primary-20 rounded-lg">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Add actions to execute when conditions are met
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
          `${actions.length}`
        )}

        {/* Token Addresses */}
        {renderSection(
          "tokens",
          "Token Addresses",
          <Wallet className="w-5 h-5" />,
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTokenAddress}
                onChange={(e) => setNewTokenAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTokenAddress()}
                placeholder="Enter token mint address..."
                className="flex-1 h-10 px-3 bg-app-quaternary border border-app-primary-20 rounded-lg font-mono text-sm text-app-primary
                           focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-app-secondary-40"
              />
              <button
                onClick={addTokenAddress}
                className="px-4 h-10 bg-purple-500/20 border border-purple-500/30 rounded-lg
                           font-mono text-sm text-purple-400 hover:bg-purple-500/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {tokenAddresses.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tokenAddresses.map((addr) => (
                  <div
                    key={addr}
                    className="flex items-center justify-between p-3 bg-app-primary-10 rounded-lg group"
                  >
                    <span className="font-mono text-xs text-app-secondary-80" title={addr}>
                      {formatAddress(addr)}
                    </span>
                    <button
                      onClick={() => removeTokenAddress(addr)}
                      className="p-1 rounded text-app-secondary-40 hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>,
          `${tokenAddresses.length}`
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
                             focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <select
                  value={cooldownUnit}
                  onChange={(e) => setCooldownUnit(e.target.value as CooldownUnit)}
                  className="h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-secondary
                             focus:outline-none focus:border-purple-500/50 transition-colors"
                >
                  {COOLDOWN_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
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
                onChange={(e) =>
                  setMaxExecutions(e.target.value ? parseInt(e.target.value) : undefined)
                }
                placeholder="∞"
                className="w-full h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-primary text-center
                           placeholder:text-app-secondary-40 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>
          </div>
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
          disabled={!name.trim() || conditions.length === 0 || actions.length === 0}
          className="px-6 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-mono font-medium text-white
                     transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed
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

const Automate: React.FC<AutomateProps> = ({ availableWallets: _availableWallets = [] }) => {
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStrategies(loadStrategies());
  }, []);

  const filteredStrategies = useMemo(() => {
    let result = strategies;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(term) || s.description.toLowerCase().includes(term)
      );
    }
    if (filterActive !== null) {
      result = result.filter((s) => s.isActive === filterActive);
    }
    return result;
  }, [strategies, searchTerm, filterActive]);

  const stats = useMemo(() => ({
    total: strategies.length,
    active: strategies.filter((s) => s.isActive).length,
  }), [strategies]);

  const handleToggle = (id: string): void => {
    setStrategies(toggleStrategy(id));
  };

  const handleDelete = (id: string): void => {
    if (!confirm("Delete this strategy?")) return;
    setStrategies(deleteStrategy(id));
  };

  const handleDuplicate = (id: string): void => {
    const strategy = strategies.find((s) => s.id === id);
    if (strategy) {
      const dup = duplicateProfile(strategy, "automate");
      setStrategies(addStrategy(dup as TradingStrategy));
    }
  };

  const handleSave = (strategy: TradingStrategy): void => {
    if (editingId) {
      setStrategies(updateStrategy(strategy));
    } else {
      setStrategies(addStrategy(strategy));
    }
    setIsCreating(false);
    setEditingId(null);
  };

  const handleExport = (): void => {
    const data = JSON.stringify(strategies, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `automate_strategies_${Date.now()}.json`;
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
        const imported = JSON.parse(content) as TradingStrategy[];
        if (Array.isArray(imported)) {
          imported.forEach((s) => {
            s.id = `automate_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            s.isActive = false;
            s.executionCount = 0;
          });
          const updated = [...strategies, ...imported];
          saveStrategies(updated);
          setStrategies(updated);
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
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-mono text-lg font-semibold text-app-primary">Automate</h2>
            <div className="flex items-center gap-3 text-xs font-mono text-app-secondary-60">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                {stats.active} running
              </span>
              <span>{stats.total} total</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-app-primary-20 text-app-secondary-60 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
            title="Import"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg bg-app-primary-20 text-app-secondary-60 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setIsCreating(true); setEditingId(null); }}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-mono font-medium text-white
                       transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Strategy
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
            placeholder="Search strategies..."
            className="w-full h-10 pl-10 pr-4 bg-app-quaternary border border-app-primary-20 rounded-lg text-sm font-mono text-app-primary
                       placeholder:text-app-secondary-40 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-app-primary-10 rounded-lg">
          {[
            { value: null, label: "All" },
            { value: true, label: "Running" },
            { value: false, label: "Off" },
          ].map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setFilterActive(f.value)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                filterActive === f.value
                  ? "bg-purple-500 text-white shadow-sm"
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
        <StrategyBuilder
          strategy={editingId ? strategies.find((s) => s.id === editingId) : null}
          onSave={handleSave}
          onCancel={() => { setIsCreating(false); setEditingId(null); }}
        />
      ) : filteredStrategies.length === 0 ? (
        <div className="text-center py-16 bg-app-secondary-80/30 backdrop-blur-md border border-app-primary-20 rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Bot className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
          <p className="font-mono text-sm text-app-secondary-60 mb-4">
            {searchTerm || filterActive !== null ? "No strategies found" : "No strategies yet"}
          </p>
          {!searchTerm && filterActive === null && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-sm font-mono text-purple-400
                         transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Strategy
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStrategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              onToggle={() => handleToggle(strategy.id)}
              onEdit={() => setEditingId(strategy.id)}
              onDuplicate={() => handleDuplicate(strategy.id)}
              onDelete={() => handleDelete(strategy.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Automate;
