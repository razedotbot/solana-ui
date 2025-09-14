import React from 'react';
import { Trash2 } from 'lucide-react';
import { TradingCondition } from './types';

interface ConditionBuilderProps {
  condition: TradingCondition;
  index: number;
  onUpdate: (updates: Partial<TradingCondition>) => void;
  onRemove: () => void;
}

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ condition, index, onUpdate, onRemove }) => {
  const conditionTypes = [
    { value: 'marketCap', label: 'Market Cap' },
    { value: 'buyVolume', label: 'Buy Volume' },
    { value: 'sellVolume', label: 'Sell Volume' },
    { value: 'netVolume', label: 'Net Volume' },
    { value: 'lastTradeAmount', label: 'Last Trade Amount' },
    { value: 'lastTradeType', label: 'Last Trade Type' },
    { value: 'whitelistActivity', label: 'Whitelist Activity' }
  ];

  const operators = [
    { value: 'greater', label: '>' },
    { value: 'less', label: '<' },
    { value: 'equal', label: '=' },
    { value: 'greaterEqual', label: '>=' },
    { value: 'lessEqual', label: '<=' }
  ];

  const timeframes = [
    { value: 0, label: 'Current' },
    { value: 1, label: 'Last 1 minute' },
    { value: 5, label: 'Last 5 minutes' },
    { value: 15, label: 'Last 15 minutes' },
    { value: 60, label: 'Last 1 hour' }
  ];

  return (
    <div className="bg-app-accent border border-app-primary-40 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm color-primary">Condition {index + 1}</span>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-error-alt-60 transition-colors"
        >
          <Trash2 className="w-4 h-4 text-app-secondary-60 hover:text-error-alt" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-mono color-primary mb-1">Type</label>
          <select
            value={condition.type}
            onChange={(e) => onUpdate({ type: e.target.value as any })}
            className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
          >
            {conditionTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono color-primary mb-1">Operator</label>
          <select
            value={condition.operator}
            onChange={(e) => onUpdate({ operator: e.target.value as any })}
            className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
          >
            {operators.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono color-primary mb-1">
            {condition.type === 'lastTradeType' ? 'Trade Type' : 
             condition.type === 'whitelistActivity' ? 'Activity Type' : 'Value'}
          </label>
          {condition.type === 'lastTradeType' ? (
            <select
              value={condition.value as number}
              onChange={(e) => onUpdate({ value: Number(e.target.value) })}
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
            >
              <option value={1}>Buy</option>
              <option value={0}>Sell</option>
            </select>
          ) : condition.type === 'whitelistActivity' ? (
            <select
              value={condition.whitelistActivityType || 'buyVolume'}
              onChange={(e) => onUpdate({ whitelistActivityType: e.target.value as 'buyVolume' | 'sellVolume' | 'netVolume' | 'lastTradeAmount' | 'lastTradeType', value: 1 })}
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
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
              value={condition.value as number}
              onChange={(e) => onUpdate({ value: Number(e.target.value) })}
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
              placeholder="0"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-mono color-primary mb-1">
            {condition.type === 'whitelistActivity' ? 'Whitelist Address' : 'Timeframe'}
          </label>
          {condition.type === 'whitelistActivity' ? (
            <input
              type="text"
              value={condition.whitelistAddress || ''}
              onChange={(e) => onUpdate({ whitelistAddress: e.target.value })}
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
              placeholder="Enter wallet address"
            />
          ) : (
            <select
              value={condition.timeframe || 0}
              onChange={(e) => onUpdate({ timeframe: Number(e.target.value) })}
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
            >
              {timeframes.map(tf => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConditionBuilder;