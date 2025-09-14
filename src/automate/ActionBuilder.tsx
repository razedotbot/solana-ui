import React from 'react';
import { Trash2 } from 'lucide-react';
import { TradingAction } from './types';

interface ActionBuilderProps {
  action: TradingAction;
  index: number;
  onUpdate: (updates: Partial<TradingAction>) => void;
  onRemove: () => void;
}

const ActionBuilder: React.FC<ActionBuilderProps> = ({ action, index, onUpdate, onRemove }) => {
  const actionTypes = [
    { value: 'buy', label: 'Buy' },
    { value: 'sell', label: 'Sell' }
  ];

  const amountTypes = [
    { value: 'percentage', label: 'Percentage of Balance' },
    { value: 'sol', label: 'Fixed Amount (SOL)' },
    { value: 'lastTrade', label: 'Last Trade Amount' },
    { value: 'volume', label: 'Volume-based Amount' },
    { value: 'whitelistVolume', label: 'Whitelist Volume-based Amount' }
  ];

  const volumeTypes = [
    { value: 'buyVolume', label: 'Buy Volume' },
    { value: 'sellVolume', label: 'Sell Volume' },
    { value: 'netVolume', label: 'Net Volume' }
  ];
  
  const whitelistActivityTypes = [
    { value: 'buyVolume', label: 'Buy Volume' },
    { value: 'sellVolume', label: 'Sell Volume' },
    { value: 'netVolume', label: 'Net Volume' }
  ];



  return (
    <div className="bg-app-accent border border-app-primary-40 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm color-primary">Action {index + 1}</span>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-error-alt-60 transition-colors"
        >
          <Trash2 className="w-4 h-4 text-app-secondary-60 hover:text-error-alt" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-mono color-primary mb-1">Action</label>
          <select
            value={action.type}
            onChange={(e) => onUpdate({ type: e.target.value as any })}
            className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
          >
            {actionTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono color-primary mb-1">Amount Type</label>
          <select
            value={action.amountType}
            onChange={(e) => onUpdate({ amountType: e.target.value as any })}
            className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
          >
            {amountTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {(action.amountType === 'sol' || action.amountType === 'percentage') && (
          <div>
            <label className="block text-xs font-mono color-primary mb-1">
              {action.amountType === 'percentage' ? 'Percentage (%)' : 'Amount (SOL)'}
            </label>
            <input
              type="number"
              value={action.amount}
              onChange={(e) => onUpdate({ amount: Number(e.target.value) })}
              min="0"
              max={action.amountType === 'percentage' ? 100 : undefined}
              step={action.amountType === 'percentage' ? 1 : 0.01}
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
              placeholder={action.amountType === 'percentage' ? '10' : '0.1'}
            />
          </div>
        )}

        {action.amountType === 'lastTrade' && (
          <div>
            <label className="block text-xs font-mono color-primary mb-1">Multiplier</label>
            <input
              type="number"
              value={action.amount}
              onChange={(e) => onUpdate({ amount: Number(e.target.value) })}
              min="0"
              step="0.1"
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
              placeholder="1.0"
            />
            <div className="text-xs text-app-secondary-60 mt-1">Amount = Last Trade × Multiplier</div>
          </div>
        )}

        {action.amountType === 'volume' && (
          <div>
            <label className="block text-xs font-mono color-primary mb-1">Volume Type</label>
            <select
              value={action.volumeType || 'buyVolume'}
              onChange={(e) => onUpdate({ volumeType: e.target.value as any })}
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
            >
              {volumeTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        )}
        
        {action.amountType === 'whitelistVolume' && (
          <>
            <div>
              <label className="block text-xs font-mono color-primary mb-1">Whitelist Address</label>
              <input
                type="text"
                value={action.whitelistAddress || ''}
                onChange={(e) => onUpdate({ whitelistAddress: e.target.value })}
                className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
                placeholder="Enter wallet address"
              />
            </div>
            <div>
              <label className="block text-xs font-mono color-primary mb-1">Activity Type</label>
              <select
                value={action.whitelistActivityType || 'buyVolume'}
                onChange={(e) => onUpdate({ whitelistActivityType: e.target.value as 'buyVolume' | 'sellVolume' | 'netVolume' })}
                className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
              >
                {whitelistActivityTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </>
        )}


      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div>
          <label className="block text-xs font-mono color-primary mb-1">Slippage (%)</label>
          <input
            type="number"
            value={action.slippage}
            onChange={(e) => onUpdate({ slippage: Number(e.target.value) })}
            min="0"
            max="100"
            step="0.1"
            className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
            placeholder="5"
          />
        </div>

        <div>
          <label className="block text-xs font-mono color-primary mb-1">Priority</label>
          <select
            value={action.priority}
            onChange={(e) => onUpdate({ priority: e.target.value as any })}
            className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {(action.amountType === 'volume' || action.amountType === 'whitelistVolume') && (
        <div className="mt-3">
          <label className="block text-xs font-mono color-primary mb-1">Volume Multiplier</label>
          <input
            type="number"
            value={action.volumeMultiplier || 0.1}
            onChange={(e) => onUpdate({ volumeMultiplier: Number(e.target.value) })}
            min="0"
            max="1"
            step="0.01"
            className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
            placeholder="0.1"
          />
          <div className="text-xs text-app-secondary-60 mt-1">
            {action.amountType === 'volume' ? 
              `Amount = ${action.volumeType || 'buyVolume'} × Multiplier` : 
              `Amount = Whitelist ${action.whitelistActivityType || 'any'} Volume × Multiplier`}
          </div>
        </div>
      )}


    </div>
  );
};

export default ActionBuilder;