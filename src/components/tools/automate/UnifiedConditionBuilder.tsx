/**
 * UnifiedConditionBuilder - Shared condition builder for Copy Trade and Automate
 */

import React from "react";
import { Trash2, AlertCircle } from "lucide-react";
import type {
  CopyTradeCondition,
  TradingCondition,
  OperatorType,
} from "./types";

// Copy Trade condition types
const COPYTRADE_CONDITION_TYPES = [
  { value: "tradeSize", label: "Trade Size (SOL)" },
  { value: "marketCap", label: "Market Cap ($)" },
  { value: "tradeType", label: "Trade Type" },
  { value: "signerBalance", label: "Signer Balance (SOL)" },
  { value: "tokenAge", label: "Token Age (hours)" },
];

// Automate condition types
const AUTOMATE_CONDITION_TYPES = [
  { value: "marketCap", label: "Market Cap" },
  { value: "buyVolume", label: "Buy Volume" },
  { value: "sellVolume", label: "Sell Volume" },
  { value: "netVolume", label: "Net Volume" },
  { value: "lastTradeAmount", label: "Last Trade Amount" },
  { value: "lastTradeType", label: "Last Trade Type" },
  { value: "whitelistActivity", label: "Whitelist Activity" },
];

const OPERATORS = [
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

interface UnifiedConditionBuilderProps {
  toolType: "copytrade" | "automate";
  condition: CopyTradeCondition | TradingCondition;
  index: number;
  onUpdate: (
    updates: Partial<CopyTradeCondition> | Partial<TradingCondition>,
  ) => void;
  onRemove: () => void;
}

const UnifiedConditionBuilder: React.FC<UnifiedConditionBuilderProps> = ({
  toolType,
  condition,
  index,
  onUpdate,
  onRemove,
}) => {
  const conditionTypes =
    toolType === "copytrade"
      ? COPYTRADE_CONDITION_TYPES
      : AUTOMATE_CONDITION_TYPES;

  const isCopyTrade = toolType === "copytrade";
  const isAutomate = toolType === "automate";

  const getValueLabel = (): string => {
    if (isCopyTrade) {
      const ct = condition.type as CopyTradeCondition["type"];
      switch (ct) {
        case "tradeSize":
          return "SOL Amount";
        case "marketCap":
          return "USD Value";
        case "tradeType":
          return "Type";
        case "signerBalance":
          return "SOL Balance";
        case "tokenAge":
          return "Hours";
        default:
          return "Value";
      }
    } else {
      const at = condition.type as TradingCondition["type"];
      switch (at) {
        case "lastTradeType":
          return "Trade Type";
        case "whitelistActivity":
          return "Activity Type";
        case "priceChange":
          return "% Change";
        case "marketCap":
        case "buyVolume":
        case "sellVolume":
        case "netVolume":
        case "lastTradeAmount":
        default:
          return "Value";
      }
    }
  };

  const getHelperText = (): string => {
    if (isCopyTrade) {
      const ct = condition.type as CopyTradeCondition["type"];
      switch (ct) {
        case "tradeSize":
          return "Only copy trades where SOL amount matches this condition";
        case "marketCap":
          return "Only copy trades for tokens with this market cap";
        case "tradeType":
          return "Only copy buy or sell trades";
        case "signerBalance":
          return "Only copy trades from wallets with this SOL balance";
        case "tokenAge":
          return "Only copy trades for tokens older than X hours";
        default:
          return "";
      }
    }
    return "";
  };

  const showTradeTypeSelector =
    (isCopyTrade && condition.type === "tradeType") ||
    (isAutomate && (condition as TradingCondition).type === "lastTradeType");

  const showWhitelistFields =
    isAutomate && (condition as TradingCondition).type === "whitelistActivity";

  const showTimeframe =
    isAutomate &&
    !showWhitelistFields &&
    (condition as TradingCondition).type !== "lastTradeType";

  return (
    <div className="bg-app-accent border border-app-primary-40 rounded-lg p-4 hover:border-app-primary-60 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-app-primary-20 flex items-center justify-center text-xs font-mono text-app-secondary-60">
            {index + 1}
          </span>
          <span className="text-xs font-mono text-app-secondary-60 uppercase tracking-wider">
            Condition
          </span>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md text-app-secondary-60 hover:text-error-alt hover:bg-error-alt-20 transition-colors"
          title="Remove condition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Grid */}
      <div
        className={`grid gap-3 ${showWhitelistFields ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3 lg:grid-cols-4"}`}
      >
        {/* Condition Type */}
        <div>
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
            Type
          </label>
          <select
            value={condition.type}
            onChange={(e) =>
              onUpdate({
                type: e.target.value as
                  | CopyTradeCondition["type"]
                  | TradingCondition["type"],
              })
            }
            className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                       focus:outline-none focus:border-app-primary-60 transition-colors"
          >
            {conditionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Operator */}
        <div>
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
            Operator
          </label>
          {showTradeTypeSelector && isCopyTrade ? (
            <select
              value={condition.operator}
              onChange={(e) =>
                onUpdate({ operator: e.target.value as OperatorType })
              }
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors"
            >
              <option value="equal">=</option>
            </select>
          ) : (
            <select
              value={condition.operator}
              onChange={(e) =>
                onUpdate({ operator: e.target.value as OperatorType })
              }
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Value / Trade Type Selector / Whitelist Activity */}
        <div>
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
            {getValueLabel()}
          </label>
          {showTradeTypeSelector ? (
            <select
              value={
                isCopyTrade
                  ? (condition as CopyTradeCondition).tradeType || "buy"
                  : condition.value
              }
              onChange={(e) => {
                if (isCopyTrade) {
                  onUpdate({
                    tradeType: e.target.value as "buy" | "sell",
                    value: e.target.value === "buy" ? 1 : 0,
                  });
                } else {
                  onUpdate({ value: Number(e.target.value) });
                }
              }}
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors"
            >
              <option value={isCopyTrade ? "buy" : 1}>Buy</option>
              <option value={isCopyTrade ? "sell" : 0}>Sell</option>
            </select>
          ) : showWhitelistFields ? (
            <select
              value={
                (condition as TradingCondition).whitelistActivityType ||
                "buyVolume"
              }
              onChange={(e) =>
                onUpdate({
                  whitelistActivityType: e.target
                    .value as TradingCondition["whitelistActivityType"],
                  value: 1,
                })
              }
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors"
            >
              <option value="buyVolume">Buy Volume</option>
              <option value="sellVolume">Sell Volume</option>
              <option value="netVolume">Net Volume</option>
              <option value="lastTradeAmount">Last Trade Amount</option>
              <option value="lastTradeType">Last Trade Type</option>
            </select>
          ) : (
            <input
              type="number"
              step={
                isCopyTrade && condition.type === "tradeSize" ? "0.01" : "1"
              }
              min="0"
              value={condition.value}
              onChange={(e) =>
                onUpdate({ value: parseFloat(e.target.value) || 0 })
              }
              placeholder="0"
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors
                         placeholder:text-app-secondary-60"
            />
          )}
        </div>

        {/* Timeframe (Automate only) or Whitelist Address */}
        {showTimeframe && (
          <div>
            <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
              Timeframe
            </label>
            <select
              value={(condition as TradingCondition).timeframe || 0}
              onChange={(e) => onUpdate({ timeframe: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf.value} value={tf.value}>
                  {tf.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showWhitelistFields && (
          <div className="md:col-span-2">
            <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
              Whitelist Address
            </label>
            <input
              type="text"
              value={(condition as TradingCondition).whitelistAddress || ""}
              onChange={(e) => onUpdate({ whitelistAddress: e.target.value })}
              placeholder="Enter wallet address..."
              className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                         focus:outline-none focus:border-app-primary-60 transition-colors
                         placeholder:text-app-secondary-60"
            />
          </div>
        )}
      </div>

      {/* Helper Text */}
      {isCopyTrade && getHelperText() && (
        <div className="mt-3 flex items-start gap-2 text-[11px] text-app-secondary-60 font-mono">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{getHelperText()}</span>
        </div>
      )}
    </div>
  );
};

export default UnifiedConditionBuilder;
