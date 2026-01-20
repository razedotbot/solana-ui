/**
 * UnifiedActionBuilder - Shared action builder for Copy Trade and Automate
 */

import React from "react";
import { Trash2, AlertCircle } from "lucide-react";
import type {
  CopyTradeAction,
  TradingAction,
  PriorityLevel,
  ActionPriority,
} from "./types";

// Copy Trade action types
const COPYTRADE_ACTION_TYPES = [
  { value: "mirror", label: "Mirror (Same as trader)" },
  { value: "buy", label: "Always Buy" },
  { value: "sell", label: "Always Sell" },
];

// Automate action types
const AUTOMATE_ACTION_TYPES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
];

// Copy Trade amount types
const COPYTRADE_AMOUNT_TYPES = [
  { value: "multiplier", label: "Multiplier (% of their trade)" },
  { value: "fixed", label: "Fixed Amount (SOL)" },
  { value: "percentage", label: "Percentage of Wallet" },
];

// Automate amount types
const AUTOMATE_AMOUNT_TYPES = [
  { value: "percentage", label: "Percentage of Balance" },
  { value: "sol", label: "Fixed Amount (SOL)" },
  { value: "lastTrade", label: "Last Trade Amount" },
  { value: "volume", label: "Volume-based Amount" },
  { value: "whitelistVolume", label: "Whitelist Volume-based Amount" },
];

const PRIORITIES: { value: PriorityLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const VOLUME_TYPES = [
  { value: "buyVolume", label: "Buy Volume" },
  { value: "sellVolume", label: "Sell Volume" },
  { value: "netVolume", label: "Net Volume" },
];

interface UnifiedActionBuilderProps {
  toolType: "copytrade" | "automate";
  action: CopyTradeAction | TradingAction;
  index: number;
  onUpdate: (
    updates: Partial<CopyTradeAction> | Partial<TradingAction>,
  ) => void;
  onRemove: () => void;
}

const UnifiedActionBuilder: React.FC<UnifiedActionBuilderProps> = ({
  toolType,
  action,
  index,
  onUpdate,
  onRemove,
}) => {
  const isCopyTrade = toolType === "copytrade";
  const isAutomate = toolType === "automate";

  const actionTypes = isCopyTrade
    ? COPYTRADE_ACTION_TYPES
    : AUTOMATE_ACTION_TYPES;
  const amountTypes = isCopyTrade
    ? COPYTRADE_AMOUNT_TYPES
    : AUTOMATE_AMOUNT_TYPES;

  const getAmountLabel = (): string => {
    if (isCopyTrade) {
      const ct = action as CopyTradeAction;
      switch (ct.amountType) {
        case "multiplier":
          return "Multiplier";
        case "fixed":
          return "SOL Amount";
        case "percentage":
          return "Wallet %";
        default:
          return "Amount";
      }
    } else {
      const at = action as TradingAction;
      switch (at.amountType) {
        case "percentage":
          return "Percentage (%)";
        case "sol":
          return "Amount (SOL)";
        case "lastTrade":
          return "Multiplier";
        case "volume":
          return "Volume Multiplier";
        case "whitelistVolume":
          return "Volume Multiplier";
        default:
          return "Amount";
      }
    }
  };

  const getAmountHelp = (): string => {
    if (isCopyTrade) {
      const ct = action as CopyTradeAction;
      switch (ct.amountType) {
        case "multiplier":
          return `${(ct.amount * 100).toFixed(0)}% of their trade size`;
        case "fixed":
          return `Always use ${ct.amount} SOL`;
        case "percentage":
          return `${ct.amount}% of your wallet balance`;
        default:
          return "";
      }
    } else {
      const at = action as TradingAction;
      switch (at.amountType) {
        case "lastTrade":
          return "Amount = Last Trade × Multiplier";
        case "volume":
          return `Amount = ${at.volumeType || "buyVolume"} × Multiplier`;
        case "whitelistVolume":
          return `Amount = Whitelist ${at.whitelistActivityType || "any"} Volume × Multiplier`;
        case "sol":
        case "percentage":
        default:
          return "";
      }
    }
  };

  const getActionDescription = (): string => {
    if (isCopyTrade) {
      const ct = action as CopyTradeAction;
      switch (ct.type) {
        case "mirror":
          return "Will execute the same action (buy/sell) as the trader";
        case "buy":
          return "Will always buy, regardless of what the trader does";
        case "sell":
          return "Will always sell, regardless of what the trader does";
        default:
          return "";
      }
    }
    return "";
  };

  // Check for volume-based amount types in automate
  const showVolumeType =
    isAutomate && (action as TradingAction).amountType === "volume";
  const showWhitelistVolume =
    isAutomate && (action as TradingAction).amountType === "whitelistVolume";
  const showVolumeMultiplier =
    isAutomate && (showVolumeType || showWhitelistVolume);
  const showBasicAmount =
    !showVolumeType &&
    !showWhitelistVolume &&
    (!isAutomate || (action as TradingAction).amountType !== "lastTrade");
  const showLastTradeMultiplier =
    isAutomate && (action as TradingAction).amountType === "lastTrade";

  return (
    <div className="bg-app-accent border border-app-primary-40 rounded-lg p-4 hover:border-app-primary-60 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-success-20 flex items-center justify-center text-xs font-mono text-success">
            {index + 1}
          </span>
          <span className="text-xs font-mono text-app-secondary-60 uppercase tracking-wider">
            Action
          </span>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md text-app-secondary-60 hover:text-error-alt hover:bg-error-alt-20 transition-colors"
          title="Remove action"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Grid - First Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Action Type */}
        <div>
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
            Action
          </label>
          <select
            value={action.type}
            onChange={(e) =>
              onUpdate({
                type: e.target.value as
                  | CopyTradeAction["type"]
                  | TradingAction["type"],
              })
            }
            className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                       focus:outline-none focus:border-app-primary-60 transition-colors"
          >
            {actionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Type */}
        <div>
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
            Amount Type
          </label>
          <select
            value={action.amountType}
            onChange={(e) =>
              onUpdate({
                amountType: e.target.value as
                  | CopyTradeAction["amountType"]
                  | TradingAction["amountType"],
              })
            }
            className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                       focus:outline-none focus:border-app-primary-60 transition-colors"
          >
            {amountTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Value */}
        {showBasicAmount && (
          <div>
            <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
              {getAmountLabel()}
            </label>
            <input
              type="number"
              step={
                isCopyTrade && action.amountType === "multiplier"
                  ? "0.1"
                  : action.amountType === "fixed" ||
                      (isAutomate && action.amountType === "sol")
                    ? "0.01"
                    : "1"
              }
              min="0"
              max={
                (isCopyTrade && action.amountType === "percentage") ||
                (isAutomate && action.amountType === "percentage")
                  ? 100
                  : undefined
              }
              value={action.amount}
              onChange={(e) =>
                onUpdate({ amount: parseFloat(e.target.value) || 0 })
              }
              placeholder={
                action.amountType === "multiplier"
                  ? "1.0"
                  : action.amountType === "fixed" || action.amountType === "sol"
                    ? "0.1"
                    : "10"
              }
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors
                         placeholder:text-app-secondary-60"
            />
          </div>
        )}

        {/* Last Trade Multiplier */}
        {showLastTradeMultiplier && (
          <div>
            <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
              Multiplier
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={action.amount}
              onChange={(e) =>
                onUpdate({ amount: parseFloat(e.target.value) || 0 })
              }
              placeholder="1.0"
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors
                         placeholder:text-app-secondary-60"
            />
          </div>
        )}

        {/* Slippage */}
        <div>
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
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
            placeholder="5"
            className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                       focus:outline-none focus:border-app-primary-60 transition-colors
                       placeholder:text-app-secondary-60"
          />
        </div>
      </div>

      {/* Second Row - Volume Options */}
      {showVolumeType && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
              Volume Type
            </label>
            <select
              value={(action as TradingAction).volumeType || "buyVolume"}
              onChange={(e) =>
                onUpdate({
                  volumeType: e.target.value as TradingAction["volumeType"],
                })
              }
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors"
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

      {/* Whitelist Volume Options */}
      {showWhitelistVolume && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
              Whitelist Address
            </label>
            <input
              type="text"
              value={(action as TradingAction).whitelistAddress || ""}
              onChange={(e) => onUpdate({ whitelistAddress: e.target.value })}
              placeholder="Enter wallet address..."
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors
                         placeholder:text-app-secondary-60"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
              Activity Type
            </label>
            <select
              value={
                (action as TradingAction).whitelistActivityType || "buyVolume"
              }
              onChange={(e) =>
                onUpdate({
                  whitelistActivityType: e.target
                    .value as TradingAction["whitelistActivityType"],
                })
              }
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors"
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

      {/* Volume Multiplier */}
      {showVolumeMultiplier && (
        <div className="mt-3">
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
            Volume Multiplier
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={(action as TradingAction).volumeMultiplier || 0.1}
            onChange={(e) =>
              onUpdate({ volumeMultiplier: parseFloat(e.target.value) || 0.1 })
            }
            placeholder="0.1"
            className="w-full md:w-48 px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                       focus:outline-none focus:border-app-primary-60 transition-colors
                       placeholder:text-app-secondary-60"
          />
        </div>
      )}

      {/* Third Row - Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div>
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
            Priority
          </label>
          <select
            value={action.priority}
            onChange={(e) =>
              onUpdate({ priority: e.target.value as ActionPriority })
            }
            className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                       focus:outline-none focus:border-app-primary-60 transition-colors"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Helper text */}
        {getAmountHelp() && (
          <div className="flex items-end">
            <div className="text-[11px] text-app-secondary-60 font-mono py-2">
              {getAmountHelp()}
            </div>
          </div>
        )}
      </div>

      {/* Action Description */}
      {isCopyTrade && getActionDescription() && (
        <div className="mt-3 p-3 bg-app-primary-10 rounded-md border border-app-primary-20">
          <div className="flex items-start gap-2 text-[11px] text-app-secondary-60 font-mono">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-app-secondary-40" />
            <span>{getActionDescription()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedActionBuilder;
