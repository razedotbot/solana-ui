/**
 * Sniper - Token Sniping Component
 *
 * Auto-buy on deploy/migration events with advanced filtering.
 * Cyberpunk neon green aesthetic matching app design.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Zap,
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
  Filter,
  ToggleLeft,
  ToggleRight,
  Crosshair,
  Play,
} from "lucide-react";

import type {
  SniperProfile,
  SniperFilter,
  SniperEventType,
  BuyAmountType,
  FilterMatchType,
  PriorityLevel,
  CooldownUnit,
} from "../../utils/types/automation";

import {
  loadSniperProfiles,
  saveSniperProfiles,
  addSniperProfile,
  updateSniperProfile,
  deleteSniperProfile,
  toggleSniperProfile,
  createDefaultSniperProfile,
  createDefaultSniperFilter,
  duplicateProfile,
} from "../../utils/storage/automation";

// ============================================================================
// Types
// ============================================================================

interface SniperWallet {
  address: string;
  privateKey?: string;
  name?: string;
  balance?: number;
}

interface SniperProps {
  availableWallets?: SniperWallet[];
  onExecute?: (profileId: string, action: unknown) => void;
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITIES: { value: PriorityLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "turbo", label: "Turbo" },
];

const COOLDOWN_UNITS: { value: CooldownUnit; label: string }[] = [
  { value: "milliseconds", label: "ms" },
  { value: "seconds", label: "sec" },
  { value: "minutes", label: "min" },
];

const EVENT_TYPES: { value: SniperEventType; label: string }[] = [
  { value: "deploy", label: "Deploy" },
  { value: "migration", label: "Migration" },
  { value: "both", label: "Both" },
];

const PLATFORMS = [
  { value: "", label: "Any Platform" },
  { value: "Pumpfun", label: "Pumpfun" },
  { value: "Bonk", label: "Bonk" },
  { value: "Raydium", label: "Raydium" },
  { value: "Moonshot", label: "Moonshot" },
];

const MATCH_TYPES: { value: FilterMatchType; label: string }[] = [
  { value: "contains", label: "Contains" },
  { value: "exact", label: "Exact" },
  { value: "regex", label: "Regex" },
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

// ============================================================================
// Profile Card Component
// ============================================================================

interface ProfileCardProps {
  profile: SniperProfile;
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
            ? "border-app-primary-color shadow-[0_0_30px_rgba(2,179,109,0.2)]"
            : "border-app-primary-20 hover:border-app-primary-40 hover:shadow-[0_0_20px_rgba(2,179,109,0.1)]"
        }
      `}
    >
      {/* Scanline effect for active */}
      {profile.isActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-app-primary-color to-transparent opacity-50"
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
                    ? "bg-app-primary-color text-app-quaternary shadow-[0_0_15px_rgba(2,179,109,0.5)]"
                    : "bg-app-primary-20 text-app-secondary-60 hover:bg-app-primary-40 hover:text-app-secondary"
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
                  <span className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-app-primary-20 color-primary animate-pulse">
                    ARMED
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
              className="p-2 rounded-lg text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-20 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDuplicate}
              className="p-2 rounded-lg text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-20 transition-colors"
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
          <span className="px-2 py-1 rounded bg-app-primary-10 text-app-secondary font-mono text-xs flex items-center gap-1.5">
            <Zap className="w-3 h-3 color-primary" />
            {profile.eventType.toUpperCase()}
          </span>
          <span className="text-app-secondary-60 font-mono text-xs flex items-center gap-1">
            <Filter className="w-3 h-3" />
            {profile.filters.length}
          </span>
          <span className="text-app-secondary-60 font-mono text-xs">
            {profile.buyAmount} SOL
          </span>
          <span className="text-app-secondary-60 font-mono text-xs capitalize">
            {profile.priority}
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
          <ChevronRight className="w-4 h-4 text-app-secondary-40 group-hover:text-app-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Filter Builder Component
// ============================================================================

interface FilterBuilderProps {
  filter: SniperFilter;
  index: number;
  eventType: SniperEventType;
  onUpdate: (updates: Partial<SniperFilter>) => void;
  onRemove: () => void;
  onToggle: () => void;
}

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  filter,
  index,
  eventType,
  onUpdate,
  onRemove,
  onToggle,
}) => {
  const showCreatorFilter = eventType === "deploy" || eventType === "both";

  return (
    <div
      className={`
        bg-app-primary border rounded-lg p-4 transition-all duration-200
        ${filter.enabled ? "border-app-primary-40" : "border-app-primary-20 opacity-50"}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-app-primary-20 flex items-center justify-center text-xs font-mono text-app-secondary-60">
            {index + 1}
          </span>
          <span className="text-xs font-mono text-app-secondary-60 uppercase tracking-wider">
            Filter
          </span>
          <button
            onClick={onToggle}
            className={`p-1 rounded transition-colors ${
              filter.enabled ? "text-success" : "text-app-secondary-60 hover:text-app-secondary"
            }`}
          >
            {filter.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded text-app-secondary-60 hover:text-error hover:bg-error-20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Platform
          </label>
          <select
            value={filter.platform || ""}
            onChange={(e) => onUpdate({ platform: e.target.value || undefined })}
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       focus:outline-none focus:border-app-primary-40 focus:ring-1 focus:ring-app-primary-40 transition-all"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Mint Address
          </label>
          <input
            type="text"
            value={filter.mint || ""}
            onChange={(e) => onUpdate({ mint: e.target.value || undefined })}
            placeholder="Specific mint..."
            className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                       placeholder:text-app-secondary-40 focus:outline-none focus:border-app-primary-40 focus:ring-1 focus:ring-app-primary-40 transition-all"
          />
        </div>

        {showCreatorFilter && (
          <div>
            <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
              Creator
            </label>
            <input
              type="text"
              value={filter.signer || ""}
              onChange={(e) => onUpdate({ signer: e.target.value || undefined })}
              placeholder="Creator wallet..."
              className="w-full h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         placeholder:text-app-secondary-40 focus:outline-none focus:border-app-primary-40 focus:ring-1 focus:ring-app-primary-40 transition-all"
            />
          </div>
        )}

        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Token Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={filter.namePattern || ""}
              onChange={(e) => onUpdate({ namePattern: e.target.value || undefined })}
              placeholder="Pattern..."
              className="flex-1 h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         placeholder:text-app-secondary-40 focus:outline-none focus:border-app-primary-40 focus:ring-1 focus:ring-app-primary-40 transition-all"
            />
            <select
              value={filter.nameMatchType || "contains"}
              onChange={(e) => onUpdate({ nameMatchType: e.target.value as FilterMatchType })}
              className="h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-secondary
                         focus:outline-none focus:border-app-primary-40 transition-all"
            >
              {MATCH_TYPES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
            Symbol
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={filter.symbolPattern || ""}
              onChange={(e) => onUpdate({ symbolPattern: e.target.value || undefined })}
              placeholder="Pattern..."
              className="flex-1 h-9 px-3 bg-app-quaternary border border-app-primary-20 rounded text-sm font-mono text-app-primary
                         placeholder:text-app-secondary-40 focus:outline-none focus:border-app-primary-40 focus:ring-1 focus:ring-app-primary-40 transition-all"
            />
            <select
              value={filter.symbolMatchType || "contains"}
              onChange={(e) => onUpdate({ symbolMatchType: e.target.value as FilterMatchType })}
              className="h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-secondary
                         focus:outline-none focus:border-app-primary-40 transition-all"
            >
              {MATCH_TYPES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Profile Builder Component
// ============================================================================

interface ProfileBuilderProps {
  profile?: SniperProfile | null;
  onSave: (profile: SniperProfile) => void;
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
  const [eventType, setEventType] = useState<SniperEventType>(profile?.eventType || "deploy");
  const [filters, setFilters] = useState<SniperFilter[]>(profile?.filters || []);
  const [buyAmountType, setBuyAmountType] = useState<BuyAmountType>(profile?.buyAmountType || "fixed");
  const [buyAmount, setBuyAmount] = useState(profile?.buyAmount || 0.01);
  const [slippage, setSlippage] = useState(profile?.slippage || 15);
  const [priority, setPriority] = useState<PriorityLevel>(profile?.priority || "high");
  const [cooldown, setCooldown] = useState(profile?.cooldown || 1000);
  const [cooldownUnit, setCooldownUnit] = useState<CooldownUnit>(profile?.cooldownUnit || "milliseconds");
  const [maxExecutions, setMaxExecutions] = useState<number | undefined>(profile?.maxExecutions);

  const addFilter = (): void => {
    setFilters([...filters, createDefaultSniperFilter()]);
  };

  const updateFilter = (id: string, updates: Partial<SniperFilter>): void => {
    setFilters(filters.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeFilter = (id: string): void => {
    setFilters(filters.filter((f) => f.id !== id));
  };

  const toggleFilter = (id: string): void => {
    setFilters(filters.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  };

  const handleSave = (): void => {
    if (!name.trim()) return;

    const sniperProfile: SniperProfile = {
      id: profile?.id || createDefaultSniperProfile().id,
      name: name.trim(),
      description: description.trim(),
      isActive: false,
      eventType,
      filters,
      buyAmountType,
      buyAmount,
      slippage,
      priority,
      cooldown,
      cooldownUnit,
      maxExecutions,
      executionCount: profile?.executionCount || 0,
      lastExecuted: profile?.lastExecuted,
      createdAt: profile?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    onSave(sniperProfile);
  };

  return (
    <div className="bg-app-secondary-80/50 backdrop-blur-md border border-app-primary-20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-app-primary-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-app-primary-20 flex items-center justify-center">
            <Zap className="w-5 h-5 color-primary" />
          </div>
          <div>
            <h2 className="font-mono text-base font-semibold text-app-primary">
              {isEditing ? "Edit Sniper" : "New Sniper Profile"}
            </h2>
            <p className="text-xs text-app-secondary-60 font-mono">Configure auto-buy settings</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1">
              Profile Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Sniper"
              className="w-full h-10 px-3 bg-app-quaternary border border-app-primary-20 rounded-lg text-sm font-mono text-app-primary
                         placeholder:text-app-secondary-40 focus:outline-none focus:border-app-primary-40 focus:ring-1 focus:ring-app-primary-40 transition-all"
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
                         placeholder:text-app-secondary-40 focus:outline-none focus:border-app-primary-40 focus:ring-1 focus:ring-app-primary-40 transition-all"
            />
          </div>
        </div>

        {/* Event Type */}
        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-2">
            Event Type
          </label>
          <div className="flex gap-2">
            {EVENT_TYPES.map((et) => (
              <button
                key={et.value}
                onClick={() => setEventType(et.value)}
                className={`
                  flex-1 h-10 rounded-lg font-mono text-xs font-medium transition-all duration-200
                  ${eventType === et.value
                    ? "bg-app-primary-color text-app-quaternary shadow-[0_0_15px_rgba(2,179,109,0.3)]"
                    : "bg-app-primary-20 text-app-secondary-60 hover:bg-app-primary-40 hover:text-app-secondary"
                  }
                `}
              >
                {et.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buy Configuration */}
        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-2">
            Buy Configuration
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-mono text-app-secondary-40 mb-1">Type</label>
              <select
                value={buyAmountType}
                onChange={(e) => setBuyAmountType(e.target.value as BuyAmountType)}
                className="w-full h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-primary
                           focus:outline-none focus:border-app-primary-40 transition-all"
              >
                <option value="fixed">Fixed SOL</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-app-secondary-40 mb-1">Amount</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={buyAmount}
                onChange={(e) => setBuyAmount(parseFloat(e.target.value) || 0)}
                className="w-full h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-primary text-center
                           focus:outline-none focus:border-app-primary-40 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-app-secondary-40 mb-1">Slippage %</label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                max="50"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value) || 15)}
                className="w-full h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-primary text-center
                           focus:outline-none focus:border-app-primary-40 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-app-secondary-40 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-primary
                           focus:outline-none focus:border-app-primary-40 transition-all"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Execution Settings */}
        <div>
          <label className="block text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider mb-2">
            Execution
          </label>
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
                             focus:outline-none focus:border-app-primary-40 transition-all"
                />
                <select
                  value={cooldownUnit}
                  onChange={(e) => setCooldownUnit(e.target.value as CooldownUnit)}
                  className="h-9 px-2 bg-app-quaternary border border-app-primary-20 rounded text-xs font-mono text-app-secondary
                             focus:outline-none focus:border-app-primary-40 transition-all"
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
                           placeholder:text-app-secondary-40 focus:outline-none focus:border-app-primary-40 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider">
              Filters ({filters.length})
            </label>
            <button
              onClick={addFilter}
              className="px-3 py-1.5 bg-app-primary-20 hover:bg-app-primary-40 rounded text-xs font-mono color-primary
                         transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
          {filters.length === 0 ? (
            <div className="text-center py-8 text-app-secondary-60 font-mono text-xs border border-dashed border-app-primary-20 rounded-lg">
              No filters - will match all {eventType} events
            </div>
          ) : (
            <div className="space-y-3">
              {filters.map((filter, idx) => (
                <FilterBuilder
                  key={filter.id}
                  filter={filter}
                  index={idx}
                  eventType={eventType}
                  onUpdate={(updates) => updateFilter(filter.id, updates)}
                  onRemove={() => removeFilter(filter.id)}
                  onToggle={() => toggleFilter(filter.id)}
                />
              ))}
            </div>
          )}
        </div>
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
          disabled={!name.trim()}
          className="px-6 py-2 bg-app-primary-color hover:bg-app-primary-light rounded-lg text-sm font-mono font-medium text-app-quaternary
                     transition-all hover:shadow-[0_0_20px_rgba(2,179,109,0.3)] disabled:opacity-50 disabled:cursor-not-allowed
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

const Sniper: React.FC<SniperProps> = ({ availableWallets: _availableWallets = [] }) => {
  const [profiles, setProfiles] = useState<SniperProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfiles(loadSniperProfiles());
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
    setProfiles(toggleSniperProfile(id));
  };

  const handleDelete = (id: string): void => {
    if (!confirm("Delete this profile?")) return;
    setProfiles(deleteSniperProfile(id));
  };

  const handleDuplicate = (id: string): void => {
    const profile = profiles.find((p) => p.id === id);
    if (profile) {
      const dup = duplicateProfile(profile, "sniper");
      setProfiles(addSniperProfile(dup));
    }
  };

  const handleSave = (profile: SniperProfile): void => {
    if (editingId) {
      setProfiles(updateSniperProfile(profile));
    } else {
      setProfiles(addSniperProfile(profile));
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
    a.download = `sniper_profiles_${Date.now()}.json`;
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
        const imported = JSON.parse(content) as SniperProfile[];
        if (Array.isArray(imported)) {
          imported.forEach((p) => {
            p.id = `sniper_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            p.isActive = false;
            p.executionCount = 0;
          });
          const updated = [...profiles, ...imported];
          saveSniperProfiles(updated);
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
          <div className="w-10 h-10 rounded-lg bg-app-primary-20 flex items-center justify-center shadow-[0_0_15px_rgba(2,179,109,0.2)]">
            <Zap className="w-5 h-5 color-primary" />
          </div>
          <div>
            <h2 className="font-mono text-lg font-semibold text-app-primary">Sniper Bot</h2>
            <div className="flex items-center gap-3 text-xs font-mono text-app-secondary-60">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {stats.active} armed
              </span>
              <span>{stats.total} total</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-app-primary-20 text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-40 transition-colors"
            title="Import"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg bg-app-primary-20 text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-40 transition-colors"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setIsCreating(true); setEditingId(null); }}
            className="px-4 py-2 bg-app-primary-color hover:bg-app-primary-light rounded-lg text-sm font-mono font-medium text-app-quaternary
                       transition-all hover:shadow-[0_0_20px_rgba(2,179,109,0.3)] flex items-center gap-2"
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
                       placeholder:text-app-secondary-40 focus:outline-none focus:border-app-primary-40 focus:ring-1 focus:ring-app-primary-40 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-app-primary-10 rounded-lg">
          {[
            { value: null, label: "All" },
            { value: true, label: "Armed" },
            { value: false, label: "Off" },
          ].map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setFilterActive(f.value)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all ${
                filterActive === f.value
                  ? "bg-app-primary-color text-app-quaternary shadow-sm"
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
          onSave={handleSave}
          onCancel={() => { setIsCreating(false); setEditingId(null); }}
        />
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-16 bg-app-secondary-80/30 backdrop-blur-md border border-app-primary-20 rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-app-primary-10 flex items-center justify-center">
            <Zap className="w-8 h-8 color-primary opacity-50" />
          </div>
          <p className="font-mono text-sm text-app-secondary-60 mb-4">
            {searchTerm || filterActive !== null ? "No profiles found" : "No sniper profiles yet"}
          </p>
          {!searchTerm && filterActive === null && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-app-primary-20 hover:bg-app-primary-40 rounded-lg text-sm font-mono color-primary
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

export default Sniper;
