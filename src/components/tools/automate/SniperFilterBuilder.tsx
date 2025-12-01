/**
 * SniperFilterBuilder - Filter configuration for Sniper Bot
 */

import React from 'react';
import { Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { SniperFilter, SniperEventType, FilterMatchType } from './types';

const PLATFORMS = [
  { value: '', label: 'Any Platform' },
  { value: 'Pumpfun', label: 'Pumpfun' },
  { value: 'Bonk', label: 'Bonk' },
  { value: 'Raydium', label: 'Raydium' },
  { value: 'Moonshot', label: 'Moonshot' },
];

const MATCH_TYPES = [
  { value: 'contains', label: 'Contains' },
  { value: 'exact', label: 'Exact' },
  { value: 'regex', label: 'Regex' },
];

interface SniperFilterBuilderProps {
  filter: SniperFilter;
  index: number;
  eventType: SniperEventType;
  onUpdate: (updates: Partial<SniperFilter>) => void;
  onRemove: () => void;
  onToggle: () => void;
}

const formatAddress = (address: string): string => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const SniperFilterBuilder: React.FC<SniperFilterBuilderProps> = ({
  filter,
  index,
  eventType,
  onUpdate,
  onRemove,
  onToggle,
}) => {
  const showCreatorFilter = eventType === 'deploy' || eventType === 'both';

  return (
    <div className={`
      bg-app-accent border rounded-lg p-4 transition-all duration-200
      ${filter.enabled 
        ? 'border-app-primary-color/30 bg-app-primary-10' 
        : 'border-app-primary-40 opacity-60'
      }
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`
            w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono
            ${filter.enabled ? 'bg-app-primary-10 color-primary' : 'bg-app-primary-20 text-app-secondary-60'}
          `}>
            {index + 1}
          </span>
          <span className="text-xs font-mono text-app-secondary-60 uppercase tracking-wider">
            Filter
          </span>
          <button
            onClick={onToggle}
            className={`
              p-1 rounded-md transition-colors
              ${filter.enabled 
                ? 'text-success hover:bg-success-20' 
                : 'text-app-secondary-60 hover:bg-app-primary-20'
              }
            `}
            title={filter.enabled ? 'Disable filter' : 'Enable filter'}
          >
            {filter.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md text-app-secondary-60 hover:text-error-alt hover:bg-error-alt-20 transition-colors"
          title="Remove filter"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Platform Filter */}
        <div>
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
            Platform
          </label>
          <select
            value={filter.platform || ''}
            onChange={(e) => onUpdate({ platform: e.target.value || undefined })}
            className="w-full px-3 py-2 bg-app-accent border border-app-primary-40 rounded font-mono text-sm text-app-primary 
                       focus:outline-none focus:border-app-primary-color transition-colors"
          >
            {PLATFORMS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Mint Address Filter */}
        <div>
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
            Mint Address
          </label>
          <input
            type="text"
            value={filter.mint || ''}
            onChange={(e) => onUpdate({ mint: e.target.value || undefined })}
            placeholder="Specific mint address..."
            className="w-full px-3 py-2 bg-app-accent border border-app-primary-40 rounded font-mono text-sm text-app-primary 
                       focus:outline-none focus:border-app-primary-color transition-colors placeholder:text-app-secondary-60"
          />
          {filter.mint && (
            <p className="mt-1 text-xs text-app-secondary-60 font-mono">{formatAddress(filter.mint)}</p>
          )}
        </div>

        {/* Creator/Signer Filter */}
        {showCreatorFilter && (
          <div>
            <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
              Creator Address
            </label>
            <input
              type="text"
              value={filter.signer || ''}
              onChange={(e) => onUpdate({ signer: e.target.value || undefined })}
              placeholder="Creator wallet address..."
              className="w-full px-3 py-2 bg-app-accent border border-app-primary-40 rounded font-mono text-sm text-app-primary 
                         focus:outline-none focus:border-warning/50 transition-colors placeholder:text-app-secondary-60"
            />
            {filter.signer && (
              <p className="mt-1 text-xs text-app-secondary-60 font-mono">{formatAddress(filter.signer)}</p>
            )}
          </div>
        )}

        {/* Name Pattern Filter */}
        <div>
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
            Token Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={filter.namePattern || ''}
              onChange={(e) => onUpdate({ namePattern: e.target.value || undefined })}
              placeholder="Name pattern..."
              className="flex-1 px-3 py-2 bg-app-accent border border-app-primary-40 rounded font-mono text-sm text-app-primary 
                         focus:outline-none focus:border-warning/50 transition-colors placeholder:text-app-secondary-60"
            />
            <select
              value={filter.nameMatchType || 'contains'}
              onChange={(e) => onUpdate({ nameMatchType: e.target.value as FilterMatchType })}
              className="px-2 py-2 bg-app-accent border border-app-primary-40 rounded font-mono text-xs text-app-secondary-80 
                         focus:outline-none focus:border-app-primary-color transition-colors"
            >
              {MATCH_TYPES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Symbol Pattern Filter */}
        <div>
          <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
            Token Symbol
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={filter.symbolPattern || ''}
              onChange={(e) => onUpdate({ symbolPattern: e.target.value || undefined })}
              placeholder="Symbol pattern..."
              className="flex-1 px-3 py-2 bg-app-accent border border-app-primary-40 rounded font-mono text-sm text-app-primary 
                         focus:outline-none focus:border-warning/50 transition-colors placeholder:text-app-secondary-60"
            />
            <select
              value={filter.symbolMatchType || 'contains'}
              onChange={(e) => onUpdate({ symbolMatchType: e.target.value as FilterMatchType })}
              className="px-2 py-2 bg-app-accent border border-app-primary-40 rounded font-mono text-xs text-app-secondary-80 
                         focus:outline-none focus:border-app-primary-color transition-colors"
            >
              {MATCH_TYPES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filter Summary */}
      {filter.enabled && (
        <div className="mt-4 p-3 bg-app-primary rounded-md border border-app-primary-40">
          <div className="text-[11px] font-mono text-app-secondary-60">
            {!filter.platform && !filter.mint && !filter.signer && !filter.namePattern && !filter.symbolPattern ? (
              <span className="color-primary opacity-70">⚠ No filters set - will match all {eventType} events</span>
            ) : (
              <span className="text-success/70">
                ✓ Filter active
                {filter.platform && ` • Platform: ${filter.platform}`}
                {filter.mint && ` • Mint: ${formatAddress(filter.mint)}`}
                {filter.signer && ` • Creator: ${formatAddress(filter.signer)}`}
                {filter.namePattern && ` • Name: "${filter.namePattern}"`}
                {filter.symbolPattern && ` • Symbol: "${filter.symbolPattern}"`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SniperFilterBuilder;
