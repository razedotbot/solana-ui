import React, { useState, useRef } from 'react';
import { Plus, Save, X, List, Download, Upload } from 'lucide-react';
import { TradingStrategy, TradingCondition, TradingAction } from './types';
import { generateStrategyId, generateConditionId, generateActionId } from './utils';
import ConditionBuilder from './ConditionBuilder';
import ActionBuilder from './ActionBuilder';
import WhitelistListManager from './WhitelistListManager';

interface StrategyBuilderProps {
  strategy?: TradingStrategy | null;
  onSave: (strategy: TradingStrategy) => void;
  onCancel: () => void;
}

const StrategyBuilder: React.FC<StrategyBuilderProps> = ({ strategy, onSave, onCancel }) => {
  const [name, setName] = useState(strategy?.name || '');
  const [description, setDescription] = useState(strategy?.description || '');
  const [conditions, setConditions] = useState<TradingCondition[]>(strategy?.conditions || []);
  const [actions, setActions] = useState<TradingAction[]>(strategy?.actions || []);
  const [cooldown, setCooldown] = useState(strategy?.cooldown || 5);
  const [maxExecutions, setMaxExecutions] = useState(strategy?.maxExecutions || undefined);
  const [isActive, setIsActive] = useState(strategy?.isActive || false);
  const [whitelistedAddresses, setWhitelistedAddresses] = useState<string[]>(strategy?.whitelistedAddresses || []);
  const [newWhitelistAddress, setNewWhitelistAddress] = useState<string>('');
  const [showWhitelistManager, setShowWhitelistManager] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addCondition = () => {
    const newCondition: TradingCondition = {
      id: generateConditionId(),
      type: 'marketCap',
      operator: 'greater',
      value: 1000000,
      timeframe: 5
    };
    setConditions([...conditions, newCondition]);
  };

  const updateCondition = (id: string, updates: Partial<TradingCondition>) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const addAction = () => {
    const newAction: TradingAction = {
      id: generateActionId(),
      type: 'buy',
      amount: 10,
      amountType: 'percentage',
      volumeType: 'buyVolume',
      volumeMultiplier: 0.1,
      slippage: 5,
      priority: 'medium'
    };
    setActions([...actions, newAction]);
  };

  const updateAction = (id: string, updates: Partial<TradingAction>) => {
    setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const handleSave = () => {
    if (!name.trim() || conditions.length === 0 || actions.length === 0) {
      alert('Please provide a name, at least one condition, and at least one action.');
      return;
    }

    const newStrategy: TradingStrategy = {
      id: strategy?.id || generateStrategyId(),
      name: name.trim(),
      description: description.trim(),
      conditions,
      conditionLogic: 'and',
      actions,
      isActive,
      cooldown,
      maxExecutions,
      executionCount: strategy?.executionCount || 0,
      lastExecuted: strategy?.lastExecuted,
      createdAt: strategy?.createdAt || Date.now(),
      updatedAt: Date.now(),
      whitelistedAddresses: whitelistedAddresses
    };

    onSave(newStrategy);
  };
  
  const handleExportStrategy = () => {
    // Create a strategy object for export
    const strategyToExport: TradingStrategy = {
      id: strategy?.id || generateStrategyId(),
      name: name.trim() || 'Unnamed Strategy',
      description: description.trim(),
      conditions,
      conditionLogic: 'and',
      actions,
      isActive,
      cooldown,
      maxExecutions,
      executionCount: strategy?.executionCount || 0,
      lastExecuted: strategy?.lastExecuted,
      createdAt: strategy?.createdAt || Date.now(),
      updatedAt: Date.now(),
      whitelistedAddresses: whitelistedAddresses
    };
    
    // Convert to JSON and create a downloadable file
    const jsonContent = JSON.stringify(strategyToExport, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link and trigger it
    const a = document.createElement('a');
    a.href = url;
    a.download = `${strategyToExport.name.replace(/\s+/g, '_')}_strategy.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleImportStrategy = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) return;
        
        const importedStrategy = JSON.parse(content) as TradingStrategy;
        
        // Update all state with imported strategy data
        setName(importedStrategy.name || '');
        setDescription(importedStrategy.description || '');
        setConditions(importedStrategy.conditions || []);
        setActions(importedStrategy.actions || []);
        setCooldown(importedStrategy.cooldown || 5);
        setMaxExecutions(importedStrategy.maxExecutions);
        setIsActive(importedStrategy.isActive || false);
        setWhitelistedAddresses(importedStrategy.whitelistedAddresses || []);
        
        // Show a success message
        alert('Strategy imported successfully!');
      } catch (error) {
        console.error('Error importing strategy:', error);
        alert('Error importing strategy. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-mono color-primary mb-2">Strategy Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
            placeholder="e.g., Buy on High Volume"
          />
        </div>
        <div>
          <label className="block text-sm font-mono color-primary mb-2">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
            placeholder="Brief description of the strategy"
          />
        </div>
      </div>

      {/* Strategy Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-mono color-primary mb-2">Cooldown (minutes)</label>
          <input
            type="number"
            value={cooldown}
            onChange={(e) => setCooldown(Number(e.target.value))}
            min="1"
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-mono color-primary mb-2">Max Executions (optional)</label>
          <input
            type="number"
            value={maxExecutions || ''}
            onChange={(e) => setMaxExecutions(e.target.value ? Number(e.target.value) : undefined)}
            min="1"
              className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
            placeholder="Unlimited"
          />
        </div>
        <div className="flex items-center">
          <label className="flex items-center gap-2 font-mono text-sm color-primary">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            Start Active
          </label>
        </div>
      </div>
      
      {/* Whitelist Addresses */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-mono color-primary">Whitelist Addresses</label>
          <button
            onClick={() => setShowWhitelistManager(!showWhitelistManager)}
            className="flex items-center text-app-accent hover:text-app-primary transition-colors font-mono text-xs"
          >
            <List className="w-3 h-3 mr-1" />
            <span>Saved Lists</span>
          </button>
        </div>
        
        {showWhitelistManager && (
          <div className="mb-4 p-3 border border-app-primary-40 rounded bg-app-primary">
            <WhitelistListManager 
              onSelectList={(addresses) => {
                setWhitelistedAddresses(addresses);
                setShowWhitelistManager(false);
              }}
              currentAddresses={whitelistedAddresses}
            />
          </div>
        )}
        
        <div className="flex items-center mb-2">
          <input
            type="text"
            value={newWhitelistAddress}
            onChange={(e) => setNewWhitelistAddress(e.target.value)}
            className="w-full px-2 py-1.5 bg-app-primary border border-app-primary-40 rounded font-mono text-sm color-primary focus:outline-none focus:border-app-primary"
            placeholder="Enter wallet address"
          />
          <button
            onClick={() => {
              if (newWhitelistAddress && !whitelistedAddresses.includes(newWhitelistAddress)) {
                setWhitelistedAddresses([...whitelistedAddresses, newWhitelistAddress]);
                setNewWhitelistAddress('');
              }
            }}
            className="px-3 py-2 bg-app-accent border border-app-primary-40 rounded-r font-mono text-sm color-primary hover:bg-app-primary hover:border-app-primary transition-colors"
          >
            Add
          </button>
        </div>
        <div className="text-xs text-app-secondary-60 mb-2">Add addresses to track for whitelist-based conditions and actions</div>
        
        <div className="flex flex-wrap gap-2">
          {whitelistedAddresses.map((address, index) => (
            <div key={index} className="flex items-center bg-app-accent px-2 py-1 rounded border border-app-primary-40">
              <span className="font-mono text-xs truncate max-w-[150px]">{address}</span>
              <button
                onClick={() => {
                  const newAddresses = [...whitelistedAddresses];
                  newAddresses.splice(index, 1);
                  setWhitelistedAddresses(newAddresses);
                }}
                className="ml-1 p-0.5 rounded hover:bg-app-primary transition-colors"
              >
                <X className="w-3 h-3 text-app-secondary-60" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-mono font-semibold color-primary">Conditions</h4>
          <button
            onClick={addCondition}
            className="px-3 py-1.5 bg-app-accent border border-app-primary-40 rounded color-primary font-mono text-sm hover:bg-app-primary hover:border-app-primary transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Condition
          </button>
        </div>
        
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <ConditionBuilder
              key={condition.id}
              condition={condition}
              index={index}
              onUpdate={(updates) => updateCondition(condition.id, updates)}
              onRemove={() => removeCondition(condition.id)}
            />
          ))}
          
          {conditions.length === 0 && (
            <div className="text-center py-4 text-app-secondary-60 font-mono text-sm">
              No conditions added. Click "Add Condition" to create your first rule.
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-mono font-semibold color-primary">Actions</h4>
          <button
            onClick={addAction}
            className="px-3 py-1.5 bg-app-accent border border-app-primary-40 rounded color-primary font-mono text-sm hover:bg-app-primary hover:border-app-primary transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Action
          </button>
        </div>
        
        <div className="space-y-3">
          {actions.map((action, index) => (
            <ActionBuilder
              key={action.id}
              action={action}
              index={index}
              onUpdate={(updates) => updateAction(action.id, updates)}
              onRemove={() => removeAction(action.id)}
            />
          ))}
          
          {actions.length === 0 && (
            <div className="text-center py-4 text-app-secondary-60 font-mono text-sm">
              No actions added. Click "Add Action" to define what should happen.
            </div>
          )}
        </div>
      </div>

      {/* Save/Cancel Buttons */}
      <div className="flex justify-between pt-4 border-t border-app-primary-40">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImportStrategy} 
          accept=".json" 
          className="hidden" 
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-app-primary-40 rounded font-mono text-sm text-app-secondary-60 hover:bg-app-primary-60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-app-accent border border-app-primary-40 rounded color-primary font-mono text-sm hover:bg-app-primary hover:border-app-primary transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {strategy ? 'Update Strategy' : 'Create Strategy'}
          </button>
        </div>
      </div>
     </div>
   );
 };

export default StrategyBuilder;