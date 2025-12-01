import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import type { RPCEndpoint } from '../utils/rpcManager';

interface RPCEndpointManagerProps {
  endpoints: RPCEndpoint[];
  onChange: (endpoints: RPCEndpoint[]) => void;
}

const POPULAR_ENDPOINTS = [
  { name: 'dRPC', url: 'https://solana.drpc.org' },
  { name: 'PublicNode', url: 'https://solana-rpc.publicnode.com' },
  { name: 'Solana Vibe Station', url: 'https://public.rpc.solanavibestation.com' }
];

export const RPCEndpointManager: React.FC<RPCEndpointManagerProps> = ({ endpoints, onChange }) => {
  const [newEndpointUrl, setNewEndpointUrl] = useState('');
  const [newEndpointName, setNewEndpointName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const hasInitializedWeights = useRef(false);

  const normalizeWeights = (endpointsToNormalize: RPCEndpoint[]): void => {
    const active = endpointsToNormalize.filter(e => e.isActive);
    if (active.length === 0) return;

    const currentTotal = active.reduce((sum, e) => sum + (e.weight || 0), 0);
    
    if (currentTotal === 0) {
      // Distribute evenly if no weights set
      const evenWeight = Math.round(100 / active.length);
      endpointsToNormalize.forEach(e => {
        if (e.isActive) {
          e.weight = evenWeight;
        }
      });
    } else if (currentTotal !== 100) {
      // Normalize proportionally to total 100
      endpointsToNormalize.forEach(e => {
        if (e.isActive && e.weight !== undefined) {
          e.weight = Math.round((e.weight / currentTotal) * 100);
        }
      });
    }
  };

  // Initialize weights for endpoints that don't have them (backward compatibility)
  useEffect(() => {
    // Only initialize once to avoid infinite loops
    if (hasInitializedWeights.current) return;
    
    const needsWeightInit = endpoints.some(e => e.isActive && (e.weight === undefined || e.weight === null));
    if (needsWeightInit) {
      hasInitializedWeights.current = true;
      const active = endpoints.filter(e => e.isActive);
      const evenWeight = active.length > 0 ? Math.round(100 / active.length) : 0;
      const updatedEndpoints = endpoints.map(e => {
        if (e.isActive && (e.weight === undefined || e.weight === null)) {
          return { ...e, weight: evenWeight };
        }
        return e;
      });
      // Normalize to ensure total is 100
      normalizeWeights(updatedEndpoints);
      onChange(updatedEndpoints);
    }
  }, [endpoints, onChange]); // Include dependencies as required by ESLint

  // Calculate total weight of active endpoints
  const activeEndpoints = endpoints.filter(e => e.isActive);
  const totalWeight = activeEndpoints.reduce((sum, e) => sum + (e.weight || 0), 0);

  const addEndpoint = (): void => {
    if (!newEndpointUrl.trim()) return;

    // Calculate default weight for new endpoint
    const activeCount = endpoints.filter(e => e.isActive).length;
    const defaultWeight = activeCount > 0 ? Math.round(100 / (activeCount + 1)) : 100;

    const newEndpoint: RPCEndpoint = {
      id: `rpc-${Date.now()}`,
      url: newEndpointUrl.trim(),
      name: newEndpointName.trim() || `RPC ${endpoints.length + 1}`,
      isActive: true,
      priority: endpoints.length + 1,
      weight: defaultWeight,
      failureCount: 0,
    };

    // Normalize existing weights when adding new endpoint
    const updatedEndpoints = [...endpoints, newEndpoint];
    normalizeWeights(updatedEndpoints);
    onChange(updatedEndpoints);
    setNewEndpointUrl('');
    setNewEndpointName('');
  };

  const updateEndpointWeight = (id: string, newWeight: number): void => {
    const updatedEndpoints = endpoints.map(e => {
      if (e.id === id) {
        return { ...e, weight: Math.max(0, Math.min(100, newWeight)) };
      }
      return e;
    });

    // Normalize weights to total 100
    normalizeWeights(updatedEndpoints);
    onChange(updatedEndpoints);
  };

  const removeEndpoint = (id: string): void => {
    if (endpoints.filter(e => e.isActive).length <= 1) {
      alert('You must have at least one active RPC endpoint');
      return;
    }
    const updatedEndpoints = endpoints.filter(e => e.id !== id);
    // Normalize weights after removal
    normalizeWeights(updatedEndpoints);
    onChange(updatedEndpoints);
  };

  const toggleEndpoint = (id: string): void => {
    const activeCount = endpoints.filter(e => e.isActive).length;
    const endpoint = endpoints.find(e => e.id === id);
    
    if (endpoint?.isActive && activeCount <= 1) {
      alert('You must have at least one active RPC endpoint');
      return;
    }

    const updatedEndpoints = endpoints.map(e =>
      e.id === id ? { ...e, isActive: !e.isActive } : e
    );

    // Normalize weights when toggling endpoints
    normalizeWeights(updatedEndpoints);
    onChange(updatedEndpoints);
  };

  const movePriority = (id: string, direction: 'up' | 'down'): void => {
    const index = endpoints.findIndex(e => e.id === id);
    if (index === -1) return;

    const newEndpoints = [...endpoints];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newEndpoints.length) return;

    [newEndpoints[index], newEndpoints[targetIndex]] = [newEndpoints[targetIndex], newEndpoints[index]];
    
    // Update priorities
    newEndpoints.forEach((e, i) => {
      e.priority = i + 1;
    });

    onChange(newEndpoints);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-xs sm:text-sm font-mono mb-2 uppercase tracking-wider" style={{ color: 'var(--app-secondary, #7ddfbd)' }}>
          <span style={{ color: 'var(--app-primary-color, #02b36d)' }}>&#62;</span> RPC Endpoints <span style={{ color: 'var(--app-primary-color, #02b36d)' }}>&#60;</span>
        </label>
        <div className="text-[10px] sm:text-xs font-mono mb-3 flex items-start gap-2" style={{ color: 'var(--app-secondary-80, rgba(125, 223, 189, 0.8))' }}>
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            Add multiple RPC endpoints with weights for weighted selection. Weights should total 100% across all active endpoints.
          </span>
        </div>
        
        {/* Weight Total Indicator */}
        {activeEndpoints.length > 0 && (
          <div className={`text-[10px] font-mono mb-2 px-2 py-1 rounded ${
            totalWeight === 100 
              ? 'bg-app-primary-color/20 text-app-primary-color border border-app-primary-color/40' 
              : 'bg-ping-poor-10 text-ping-poor border border-ping-poor/40'
          }`}>
            Total Weight: {totalWeight}% {totalWeight !== 100 && '(Should be 100%)'}
          </div>
        )}

        {/* Endpoint List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {endpoints.map((endpoint, index) => (
            <div
              key={endpoint.id}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                endpoint.isActive
                  ? 'bg-app-tertiary border-app-primary-40'
                  : 'bg-app-quaternary border-app-primary-20 opacity-60'
              }`}
            >
              {/* Priority Controls */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => movePriority(endpoint.id, 'up')}
                  disabled={index === 0}
                  className="p-0.5 hover:bg-app-primary-20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp size={14} className="text-app-primary" />
                </button>
                <button
                  type="button"
                  onClick={() => movePriority(endpoint.id, 'down')}
                  disabled={index === endpoints.length - 1}
                  className="p-0.5 hover:bg-app-primary-20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown size={14} className="text-app-primary" />
                </button>
              </div>

              {/* Endpoint Info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-app-primary font-mono truncate">
                  {endpoint.name}
                </div>
                <div className="text-[10px] text-app-secondary font-mono truncate">
                  {endpoint.url}
                </div>
              </div>

              {/* Weight Input */}
              {endpoint.isActive && (
                <div className="flex items-center gap-1.5">
                  <label className="text-[9px] font-mono text-app-secondary-80 whitespace-nowrap">
                    Weight:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={endpoint.weight || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      updateEndpointWeight(endpoint.id, value);
                    }}
                    className="w-14 bg-app-quaternary border border-app-primary-30 rounded px-1.5 py-0.5 text-[10px] text-app-primary focus:border-app-primary-60 focus:outline-none font-mono"
                  />
                  <span className="text-[9px] font-mono text-app-secondary-60">%</span>
                </div>
              )}

              {/* Status Badge */}
              {endpoint.failureCount > 0 && (
                <div className="text-[10px] px-2 py-0.5 rounded bg-ping-poor-10 text-ping-poor font-mono">
                  {endpoint.failureCount} fails
                </div>
              )}

              {/* Toggle Active */}
              <button
                type="button"
                onClick={() => toggleEndpoint(endpoint.id)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  endpoint.isActive ? 'bg-app-primary-color' : 'bg-app-primary-30'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    endpoint.isActive ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => removeEndpoint(endpoint.id)}
                className="p-1.5 hover:bg-ping-poor-10 rounded text-app-secondary hover:text-ping-poor transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add New Endpoint */}
        <div className="space-y-2 pt-2 border-t border-app-primary-20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono" style={{ color: 'var(--app-secondary, #7ddfbd)' }}>
              Add New Endpoint
            </span>
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="text-[10px] font-mono px-2 py-1 rounded hover:bg-app-primary-20 transition-colors"
              style={{ color: 'var(--app-primary-color, #02b36d)' }}
            >
              {showPresets ? 'Hide' : 'Show'} Popular
            </button>
          </div>

          {showPresets && (
            <div className="space-y-1 mb-2 p-2 rounded" style={{ backgroundColor: 'var(--app-quaternary, rgba(5, 10, 14, 0.5))' }}>
              {POPULAR_ENDPOINTS.map((preset) => {
                const alreadyAdded = endpoints.some(e => e.url === preset.url);
                return (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      if (!alreadyAdded) {
                        setNewEndpointName(preset.name);
                        setNewEndpointUrl(preset.url);
                      }
                    }}
                    disabled={alreadyAdded}
                    className="w-full text-left px-2 py-1.5 rounded text-[10px] font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-app-primary-20"
                    style={{ color: 'var(--app-secondary, #7ddfbd)' }}
                  >
                    <div className="font-medium">{preset.name}</div>
                    <div className="opacity-70 truncate">{preset.url}</div>
                    {alreadyAdded && <div className="text-[9px] opacity-60">(Already added)</div>}
                  </button>
                );
              })}
            </div>
          )}

          <input
            type="text"
            value={newEndpointName}
            onChange={(e) => setNewEndpointName(e.target.value)}
            placeholder="Endpoint name (optional)"
            className="w-full bg-app-tertiary border border-app-primary-40 rounded p-2 text-xs text-app-primary focus-border-primary focus:outline-none font-mono"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newEndpointUrl}
              onChange={(e) => setNewEndpointUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEndpoint()}
              placeholder="https://api.mainnet-beta.solana.com"
              className="flex-1 bg-app-tertiary border border-app-primary-40 rounded p-2 text-xs text-app-primary focus-border-primary focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={addEndpoint}
              disabled={!newEndpointUrl.trim()}
              className="px-3 py-2 bg-app-primary-color text-app-quaternary rounded font-mono text-xs hover:bg-app-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
