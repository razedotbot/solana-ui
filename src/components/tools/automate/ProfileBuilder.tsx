/**
 * ProfileBuilder - Unified profile creation/editing component
 *
 * Handles Sniper, Copy Trade, and Automate profile configuration
 * Uses app-consistent styling
 */

import React, { useState, useMemo } from "react";
import {
  Save,
  X,
  Plus,
  Zap,
  Users,
  Bot,
  Settings2,
  Filter,
  Target,
  Wallet,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
} from "lucide-react";

import type {
  ToolType,
  SniperProfile,
  SniperFilter,
  SniperEventType,
  BuyAmountType,
  CopyTradeProfile,
  CopyTradeCondition,
  CopyTradeAction,
  CopyTradeMode,
  SimpleModeCopyConfig,
  TradingStrategy,
  TradingCondition,
  TradingAction,
  PriorityLevel,
  ActionPriority,
  CooldownUnit,
  WalletList,
  WalletType,
} from "./types";

import {
  createDefaultSniperProfile,
  createDefaultSniperFilter,
  createDefaultCopyTradeProfile,
  createDefaultCopyTradeCondition,
  createDefaultCopyTradeAction,
  createDefaultStrategy,
  createDefaultTradingCondition,
  createDefaultTradingAction,
} from "./storage";

import SniperFilterBuilder from "./SniperFilterBuilder";
import UnifiedConditionBuilder from "./UnifiedConditionBuilder";
import UnifiedActionBuilder from "./UnifiedActionBuilder";
import UnifiedWalletManager from "./UnifiedWalletManager";

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
  { value: "deploy", label: "Deploy Events" },
  { value: "migration", label: "Migration Events" },
  { value: "both", label: "Both" },
];

const formatAddress = (address: string): string => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const getWalletDisplayName = (wallet: WalletType): string => {
  return wallet.name || formatAddress(wallet.address);
};

// ============================================================================
// Props
// ============================================================================

interface ProfileBuilderProps {
  type: ToolType;
  profile?: SniperProfile | CopyTradeProfile | TradingStrategy | null;
  availableWallets: WalletType[];
  walletLists: WalletList[];
  onSave: (profile: SniperProfile | CopyTradeProfile | TradingStrategy) => void;
  onCancel: () => void;
}

// ============================================================================
// Component
// ============================================================================

const ProfileBuilder: React.FC<ProfileBuilderProps> = ({
  type,
  profile,
  availableWallets,
  onSave,
  onCancel,
}) => {
  const isEditing = !!profile;

  // ========== Common State ==========
  const [name, setName] = useState(profile?.name || "");
  const [description, setDescription] = useState(profile?.description || "");
  const [cooldown, setCooldown] = useState(
    profile?.cooldown ||
      (type === "sniper" ? 1000 : type === "copytrade" ? 5 : 5),
  );
  const [cooldownUnit, setCooldownUnit] = useState<CooldownUnit>(
    profile?.cooldownUnit ||
      (type === "sniper"
        ? "milliseconds"
        : type === "copytrade"
          ? "seconds"
          : "minutes"),
  );
  const [maxExecutions, setMaxExecutions] = useState<number | undefined>(
    profile?.maxExecutions,
  );

  // ========== Sniper State ==========
  const [eventType, setEventType] = useState<SniperEventType>(
    (profile as SniperProfile)?.eventType || "deploy",
  );
  const [filters, setFilters] = useState<SniperFilter[]>(
    (profile as SniperProfile)?.filters || [],
  );
  const [buyAmountType, setBuyAmountType] = useState<BuyAmountType>(
    (profile as SniperProfile)?.buyAmountType || "fixed",
  );
  const [buyAmount, setBuyAmount] = useState(
    (profile as SniperProfile)?.buyAmount || 0.01,
  );
  const [sniperSlippage, setSniperSlippage] = useState(
    (profile as SniperProfile)?.slippage || 15,
  );
  const [sniperPriority, setSniperPriority] = useState<PriorityLevel>(
    (profile as SniperProfile)?.priority || "high",
  );

  // ========== Copy Trade State ==========
  const [mode, setMode] = useState<CopyTradeMode>(
    (profile as CopyTradeProfile)?.mode || "simple",
  );
  const [simpleConfig, setSimpleConfig] = useState<SimpleModeCopyConfig>(
    (profile as CopyTradeProfile)?.simpleConfig || {
      amountMultiplier: 1.0,
      slippage: 5,
      priority: "medium",
      mirrorTradeType: true,
    },
  );
  const [copyConditions, setCopyConditions] = useState<CopyTradeCondition[]>(
    (profile as CopyTradeProfile)?.conditions || [],
  );
  const [conditionLogic, setConditionLogic] = useState<"and" | "or">(
    (profile as CopyTradeProfile)?.conditionLogic || "and",
  );
  const [copyActions, setCopyActions] = useState<CopyTradeAction[]>(
    (profile as CopyTradeProfile)?.actions || [],
  );
  const [selectedWalletListId] = useState<string | null>(
    (profile as CopyTradeProfile)?.walletListId || null,
  );
  const [walletAddresses, setWalletAddresses] = useState<string[]>(
    (profile as CopyTradeProfile)?.walletAddresses || [],
  );

  // ========== Automate State ==========
  const [tradingConditions, setTradingConditions] = useState<
    TradingCondition[]
  >((profile as TradingStrategy)?.conditions || []);
  const [autoConditionLogic, setAutoConditionLogic] = useState<"and" | "or">(
    (profile as TradingStrategy)?.conditionLogic || "and",
  );
  const [tradingActions, setTradingActions] = useState<TradingAction[]>(
    (profile as TradingStrategy)?.actions || [],
  );
  const [whitelistedAddresses, setWhitelistedAddresses] = useState<string[]>(
    (profile as TradingStrategy)?.whitelistedAddresses || [],
  );
  const [selectedWalletAddresses, setSelectedWalletAddresses] = useState<
    string[]
  >((profile as TradingStrategy)?.walletAddresses || []);
  const [walletSearchTerm, setWalletSearchTerm] = useState("");

  // ========== UI State ==========
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "basic",
  );

  // ========== Filtered Wallets ==========
  const filteredWallets = useMemo(() => {
    if (!walletSearchTerm) return availableWallets;
    const term = walletSearchTerm.toLowerCase();
    return availableWallets.filter(
      (w) =>
        w.address.toLowerCase().includes(term) ||
        getWalletDisplayName(w).toLowerCase().includes(term),
    );
  }, [availableWallets, walletSearchTerm]);

  // ========== Handlers ==========
  const toggleSection = (section: string): void => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Sniper filter handlers
  const addFilter = (): void =>
    setFilters([...filters, createDefaultSniperFilter()]);
  const updateFilter = (id: string, updates: Partial<SniperFilter>): void => {
    setFilters(filters.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };
  const removeFilter = (id: string): void =>
    setFilters(filters.filter((f) => f.id !== id));
  const toggleFilter = (id: string): void => {
    setFilters(
      filters.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
  };

  // Copy Trade condition/action handlers
  const addCopyCondition = (): void =>
    setCopyConditions([...copyConditions, createDefaultCopyTradeCondition()]);
  const updateCopyCondition = (
    id: string,
    updates: Partial<CopyTradeCondition>,
  ): void => {
    setCopyConditions(
      copyConditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };
  const removeCopyCondition = (id: string): void =>
    setCopyConditions(copyConditions.filter((c) => c.id !== id));

  const addCopyAction = (): void =>
    setCopyActions([...copyActions, createDefaultCopyTradeAction()]);
  const updateCopyAction = (
    id: string,
    updates: Partial<CopyTradeAction>,
  ): void => {
    setCopyActions(
      copyActions.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    );
  };
  const removeCopyAction = (id: string): void =>
    setCopyActions(copyActions.filter((a) => a.id !== id));

  // Automate condition/action handlers
  const addTradingCondition = (): void =>
    setTradingConditions([
      ...tradingConditions,
      createDefaultTradingCondition(),
    ]);
  const updateTradingCondition = (
    id: string,
    updates: Partial<TradingCondition>,
  ): void => {
    setTradingConditions(
      tradingConditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };
  const removeTradingCondition = (id: string): void =>
    setTradingConditions(tradingConditions.filter((c) => c.id !== id));

  const addTradingAction = (): void =>
    setTradingActions([...tradingActions, createDefaultTradingAction()]);
  const updateTradingAction = (
    id: string,
    updates: Partial<TradingAction>,
  ): void => {
    setTradingActions(
      tradingActions.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    );
  };
  const removeTradingAction = (id: string): void =>
    setTradingActions(tradingActions.filter((a) => a.id !== id));

  // Wallet selection handlers
  const toggleWalletSelection = (address: string): void => {
    setSelectedWalletAddresses((prev) =>
      prev.includes(address)
        ? prev.filter((a) => a !== address)
        : [...prev, address],
    );
  };

  const selectAllWallets = (): void => {
    if (selectedWalletAddresses.length === availableWallets.length) {
      setSelectedWalletAddresses([]);
    } else {
      setSelectedWalletAddresses(availableWallets.map((w) => w.address));
    }
  };

  // ========== Save Handler ==========
  const handleSave = (): void => {
    if (!name.trim()) {
      alert("Please provide a profile name.");
      return;
    }

    switch (type) {
      case "sniper": {
        const sniperProfile: SniperProfile = {
          id: (profile as SniperProfile)?.id || createDefaultSniperProfile().id,
          name: name.trim(),
          description: description.trim(),
          isActive: false,
          eventType,
          filters,
          buyAmountType,
          buyAmount,
          slippage: sniperSlippage,
          priority: sniperPriority,
          cooldown,
          cooldownUnit,
          maxExecutions,
          executionCount: (profile as SniperProfile)?.executionCount || 0,
          lastExecuted: (profile as SniperProfile)?.lastExecuted,
          createdAt: (profile as SniperProfile)?.createdAt || Date.now(),
          updatedAt: Date.now(),
        };
        onSave(sniperProfile);
        break;
      }

      case "copytrade": {
        if (walletAddresses.length === 0) {
          alert("Please add wallet addresses to monitor.");
          return;
        }
        if (mode === "advanced" && copyActions.length === 0) {
          alert("Please add at least one action for advanced mode.");
          return;
        }

        const copyProfile: CopyTradeProfile = {
          id:
            (profile as CopyTradeProfile)?.id ||
            createDefaultCopyTradeProfile().id,
          name: name.trim(),
          description: description.trim(),
          isActive: false,
          mode,
          simpleConfig: mode === "simple" ? simpleConfig : undefined,
          conditions: copyConditions,
          conditionLogic,
          actions: copyActions,
          walletListId: selectedWalletListId,
          walletAddresses,
          tokenFilterMode: "all",
          specificTokens: [],
          blacklistedTokens: [],
          cooldown,
          cooldownUnit,
          maxExecutions,
          executionCount: (profile as CopyTradeProfile)?.executionCount || 0,
          lastExecuted: (profile as CopyTradeProfile)?.lastExecuted,
          createdAt: (profile as CopyTradeProfile)?.createdAt || Date.now(),
          updatedAt: Date.now(),
        };
        onSave(copyProfile);
        break;
      }

      case "automate": {
        if (tradingConditions.length === 0 || tradingActions.length === 0) {
          alert("Please add at least one condition and one action.");
          return;
        }
        if (selectedWalletAddresses.length === 0) {
          alert("Please select at least one wallet.");
          return;
        }

        const strategy: TradingStrategy = {
          id: (profile as TradingStrategy)?.id || createDefaultStrategy().id,
          name: name.trim(),
          description: description.trim(),
          conditions: tradingConditions,
          conditionLogic: autoConditionLogic,
          actions: tradingActions,
          isActive: false,
          cooldown,
          cooldownUnit,
          maxExecutions,
          executionCount: (profile as TradingStrategy)?.executionCount || 0,
          lastExecuted: (profile as TradingStrategy)?.lastExecuted,
          createdAt: (profile as TradingStrategy)?.createdAt || Date.now(),
          updatedAt: Date.now(),
          whitelistedAddresses,
          tokenAddresses: (profile as TradingStrategy)?.tokenAddresses || [],
          walletAddresses: selectedWalletAddresses,
        };
        onSave(strategy);
        break;
      }
    }
  };

  // ========== Render Helpers ==========
  const renderSection = (
    id: string,
    title: string,
    icon: React.ReactNode,
    content: React.ReactNode,
    badge?: string,
  ): React.ReactElement => {
    const isExpanded = expandedSection === id;
    return (
      <div className="border border-app-primary-40 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className={`
            w-full flex items-center justify-between p-4 text-left
            transition-colors
            ${isExpanded ? "bg-app-primary-20" : "bg-app-accent hover:bg-app-primary-10"}
          `}
        >
          <div className="flex items-center gap-3">
            <span className="text-app-secondary-60">{icon}</span>
            <span className="font-mono text-sm font-medium text-app-primary">
              {title}
            </span>
            {badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-app-primary-20 text-app-secondary-60">
                {badge}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-app-secondary-60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-app-secondary-60" />
          )}
        </button>
        {isExpanded && (
          <div className="p-4 border-t border-app-primary-40 bg-app-primary">
            {content}
          </div>
        )}
      </div>
    );
  };

  // ========== Get Tool Config ==========
  const getToolConfig = (): {
    icon: React.ReactNode;
    color: string;
    name: string;
    accentClass: string;
    bgClass: string;
  } => {
    switch (type) {
      case "sniper":
        return {
          icon: <Zap className="w-5 h-5" />,
          color: "primary",
          name: "Sniper Bot",
          accentClass: "color-primary",
          bgClass: "bg-app-primary-10",
        };
      case "copytrade":
        return {
          icon: <Users className="w-5 h-5" />,
          color: "primary",
          name: "Copy Trade",
          accentClass: "color-primary",
          bgClass: "bg-app-primary-10",
        };
      case "automate":
        return {
          icon: <Bot className="w-5 h-5" />,
          color: "primary",
          name: "Automate",
          accentClass: "color-primary",
          bgClass: "bg-app-primary-10",
        };
    }
  };

  const toolConfig = getToolConfig();

  return (
    <div className="bg-app-accent border border-app-primary-40 rounded-lg p-6 max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${toolConfig.bgClass} ${toolConfig.accentClass}`}
          >
            {toolConfig.icon}
          </div>
          <div>
            <h2 className="font-mono text-lg font-semibold text-app-primary">
              {isEditing ? `Edit ${toolConfig.name}` : `New ${toolConfig.name}`}
            </h2>
            <p className="text-xs text-app-secondary-60 font-mono">
              Configure your {type} profile
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-app-secondary-60 hover:text-app-secondary-80 hover:bg-app-primary-20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* Basic Info Section */}
        {renderSection(
          "basic",
          "Basic Information",
          <Settings2 className="w-4 h-4" />,
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
                  Profile Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Profile"
                  className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                             focus:outline-none focus:border-app-primary-60 transition-colors placeholder:text-app-secondary-60"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                             focus:outline-none focus:border-app-primary-60 transition-colors placeholder:text-app-secondary-60"
                />
              </div>
            </div>
          </div>,
        )}

        {/* Sniper-specific sections */}
        {type === "sniper" && (
          <>
            {/* Event Type */}
            {renderSection(
              "event",
              "Event Configuration",
              <Zap className="w-4 h-4" />,
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-2">
                    Event Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((et) => (
                      <button
                        key={et.value}
                        onClick={() => setEventType(et.value)}
                        className={`
                          px-4 py-2 rounded font-mono text-sm transition-colors
                          ${
                            eventType === et.value
                              ? "bg-app-primary-10 border border-app-primary-color/30 color-primary"
                              : "bg-app-accent border border-app-primary-40 text-app-secondary-60 hover:bg-app-primary-20"
                          }
                        `}
                      >
                        {et.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>,
            )}

            {/* Filters */}
            {renderSection(
              "filters",
              "Filters",
              <Filter className="w-4 h-4" />,
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-app-secondary-60 font-mono">
                    Define conditions to match events
                  </p>
                  <button
                    onClick={addFilter}
                    className="px-3 py-1.5 bg-app-primary-10 border border-app-primary-color/30 rounded
                               font-mono text-xs color-primary hover:opacity-90 transition-colors
                               flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Filter
                  </button>
                </div>
                {filters.length === 0 ? (
                  <div className="text-center py-8 text-app-secondary-60 font-mono text-sm">
                    No filters - will match all {eventType} events
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filters.map((filter, idx) => (
                      <SniperFilterBuilder
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
              </div>,
              `${filters.length}`,
            )}

            {/* Buy Configuration */}
            {renderSection(
              "buy",
              "Buy Configuration",
              <Target className="w-4 h-4" />,
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
                    Amount Type
                  </label>
                  <select
                    value={buyAmountType}
                    onChange={(e) =>
                      setBuyAmountType(e.target.value as BuyAmountType)
                    }
                    className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary focus:outline-none focus:border-app-primary-60"
                  >
                    <option value="fixed">Fixed (SOL)</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
                    {buyAmountType === "fixed" ? "SOL Amount" : "Percentage"}
                  </label>
                  <input
                    type="number"
                    step={buyAmountType === "fixed" ? "0.001" : "1"}
                    min="0"
                    value={buyAmount}
                    onChange={(e) =>
                      setBuyAmount(parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary focus:outline-none focus:border-app-primary-60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
                    Slippage (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="50"
                    value={sniperSlippage}
                    onChange={(e) =>
                      setSniperSlippage(parseFloat(e.target.value) || 15)
                    }
                    className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary focus:outline-none focus:border-app-primary-60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={sniperPriority}
                    onChange={(e) =>
                      setSniperPriority(e.target.value as PriorityLevel)
                    }
                    className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary focus:outline-none focus:border-app-primary-60"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>,
            )}
          </>
        )}

        {/* Copy Trade-specific sections */}
        {type === "copytrade" && (
          <>
            {/* Mode Selection */}
            {renderSection(
              "mode",
              "Trading Mode",
              <Settings2 className="w-4 h-4" />,
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => setMode("simple")}
                    className={`
                      flex-1 p-4 rounded-lg border text-left transition-colors
                      ${
                        mode === "simple"
                          ? "bg-app-primary-10 border-app-primary-color/30"
                          : "bg-app-accent border-app-primary-40 hover:bg-app-primary-20"
                      }
                    `}
                  >
                    <div
                      className={`font-mono text-sm font-medium ${mode === "simple" ? "color-primary" : "text-app-secondary-80"}`}
                    >
                      Simple Mode
                    </div>
                    <div className="text-xs text-app-secondary-60 mt-1">
                      Mirror trades with a multiplier
                    </div>
                  </button>
                  <button
                    onClick={() => setMode("advanced")}
                    className={`
                      flex-1 p-4 rounded-lg border text-left transition-colors
                      ${
                        mode === "advanced"
                          ? "bg-app-primary-10 border-app-primary-color/30"
                          : "bg-app-accent border-app-primary-40 hover:bg-app-primary-20"
                      }
                    `}
                  >
                    <div
                      className={`font-mono text-sm font-medium ${mode === "advanced" ? "color-primary" : "text-app-secondary-80"}`}
                    >
                      Advanced Mode
                    </div>
                    <div className="text-xs text-app-secondary-60 mt-1">
                      Custom conditions and actions
                    </div>
                  </button>
                </div>

                {mode === "simple" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                    <div>
                      <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
                        Amount Multiplier
                      </label>
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
                        className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary focus:outline-none focus:border-app-primary-60"
                      />
                      <p className="text-[10px] text-app-secondary-60 mt-1">
                        {(simpleConfig.amountMultiplier * 100).toFixed(0)}% of
                        their trade size
                      </p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
                        Slippage (%)
                      </label>
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
                        className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary focus:outline-none focus:border-app-primary-60"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
                        Priority
                      </label>
                      <select
                        value={simpleConfig.priority}
                        onChange={(e) =>
                          setSimpleConfig({
                            ...simpleConfig,
                            priority: e.target.value as ActionPriority,
                          })
                        }
                        className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary focus:outline-none focus:border-app-primary-60"
                      >
                        {PRIORITIES.slice(0, 3).map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
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
                        <div
                          className={`
                          w-10 h-6 rounded-full transition-colors
                          ${simpleConfig.mirrorTradeType ? "bg-app-primary-color" : "bg-app-primary-40"}
                          peer-focus:ring-2 peer-focus:ring-app-primary-color/20
                        `}
                        >
                          <div
                            className={`
                            w-4 h-4 mt-1 rounded-full bg-white transition-transform
                            ${simpleConfig.mirrorTradeType ? "translate-x-5" : "translate-x-1"}
                          `}
                          />
                        </div>
                        <span className="text-xs font-mono text-app-secondary-60">
                          Mirror Trade Type
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>,
            )}

            {/* Wallet Lists */}
            {renderSection(
              "wallets",
              "Wallets to Monitor",
              <Users className="w-4 h-4" />,
              <UnifiedWalletManager
                type="copytrade"
                onSelectList={setWalletAddresses}
                selectedListId={selectedWalletListId}
                currentAddresses={walletAddresses}
                onAddressesChange={setWalletAddresses}
              />,
              `${walletAddresses.length}`,
            )}

            {/* Advanced Conditions/Actions */}
            {mode === "advanced" && (
              <>
                {renderSection(
                  "conditions",
                  "Conditions",
                  <Filter className="w-4 h-4" />,
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-app-secondary-60 font-mono">
                          Logic:
                        </span>
                        <div className="flex bg-app-accent rounded p-0.5 border border-app-primary-40">
                          <button
                            onClick={() => setConditionLogic("and")}
                            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                              conditionLogic === "and"
                                ? "bg-app-primary-20 text-app-primary"
                                : "text-app-secondary-60"
                            }`}
                          >
                            AND
                          </button>
                          <button
                            onClick={() => setConditionLogic("or")}
                            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                              conditionLogic === "or"
                                ? "bg-app-primary-20 text-app-primary"
                                : "text-app-secondary-60"
                            }`}
                          >
                            OR
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={addCopyCondition}
                        className="px-3 py-1.5 bg-app-primary-10 border border-app-primary-color/30 rounded
                                   font-mono text-xs color-primary hover:opacity-90 transition-colors
                                   flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Condition
                      </button>
                    </div>
                    {copyConditions.map((cond, idx) => (
                      <UnifiedConditionBuilder
                        key={cond.id}
                        toolType="copytrade"
                        condition={cond}
                        index={idx}
                        onUpdate={(updates) =>
                          updateCopyCondition(
                            cond.id,
                            updates as Partial<CopyTradeCondition>,
                          )
                        }
                        onRemove={() => removeCopyCondition(cond.id)}
                      />
                    ))}
                  </div>,
                  `${copyConditions.length}`,
                )}

                {renderSection(
                  "actions",
                  "Actions",
                  <Target className="w-4 h-4" />,
                  <div className="space-y-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={addCopyAction}
                        className="px-3 py-1.5 bg-app-primary-10 border border-app-primary-color/30 rounded
                                   font-mono text-xs color-primary hover:opacity-90 transition-colors
                                   flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Action
                      </button>
                    </div>
                    {copyActions.map((action, idx) => (
                      <UnifiedActionBuilder
                        key={action.id}
                        toolType="copytrade"
                        action={action}
                        index={idx}
                        onUpdate={(updates) =>
                          updateCopyAction(
                            action.id,
                            updates as Partial<CopyTradeAction>,
                          )
                        }
                        onRemove={() => removeCopyAction(action.id)}
                      />
                    ))}
                  </div>,
                  `${copyActions.length}`,
                )}
              </>
            )}
          </>
        )}

        {/* Automate-specific sections */}
        {type === "automate" && (
          <>
            {/* Wallet Selection */}
            {renderSection(
              "wallets",
              "Trading Wallets",
              <Wallet className="w-4 h-4" />,
              <div className="space-y-3">
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-secondary-60" />
                    <input
                      type="text"
                      value={walletSearchTerm}
                      onChange={(e) => setWalletSearchTerm(e.target.value)}
                      placeholder="Search wallets..."
                      className="w-full pl-9 pr-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-xs text-app-primary focus:outline-none focus:border-app-primary-60"
                    />
                  </div>
                  <button
                    onClick={selectAllWallets}
                    className="px-3 py-2 bg-app-accent border border-app-primary-40 rounded font-mono text-xs text-app-secondary-80 hover:bg-app-primary-20"
                  >
                    {selectedWalletAddresses.length === availableWallets.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
                <div className="border border-app-primary-40 rounded-lg bg-app-accent max-h-48 overflow-y-auto">
                  {availableWallets.length === 0 ? (
                    <div className="p-4 text-center text-app-secondary-60 font-mono text-xs">
                      No wallets available
                    </div>
                  ) : (
                    <div className="divide-y divide-app-primary-20">
                      {filteredWallets.map((wallet) => {
                        const isSelected = selectedWalletAddresses.includes(
                          wallet.address,
                        );
                        return (
                          <button
                            key={wallet.address}
                            onClick={() =>
                              toggleWalletSelection(wallet.address)
                            }
                            className={`w-full flex items-center justify-between p-3 hover:bg-app-primary-10 transition-colors ${
                              isSelected ? "bg-app-primary-10" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center ${
                                  isSelected
                                    ? "bg-app-primary-color border-app-primary-color"
                                    : "border-app-primary-40"
                                }`}
                              >
                                {isSelected && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <div className="text-left">
                                <div className="font-mono text-xs text-app-primary">
                                  {getWalletDisplayName(wallet)}
                                </div>
                                <div className="font-mono text-[10px] text-app-secondary-60">
                                  {formatAddress(wallet.address)}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>,
              `${selectedWalletAddresses.length}`,
            )}

            {/* Conditions */}
            {renderSection(
              "conditions",
              "Conditions",
              <Filter className="w-4 h-4" />,
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-app-secondary-60 font-mono">
                      Logic:
                    </span>
                    <div className="flex bg-app-accent rounded p-0.5 border border-app-primary-40">
                      <button
                        onClick={() => setAutoConditionLogic("and")}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                          autoConditionLogic === "and"
                            ? "bg-app-primary-20 text-app-primary"
                            : "text-app-secondary-60"
                        }`}
                      >
                        AND
                      </button>
                      <button
                        onClick={() => setAutoConditionLogic("or")}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                          autoConditionLogic === "or"
                            ? "bg-app-primary-20 text-app-primary"
                            : "text-app-secondary-60"
                        }`}
                      >
                        OR
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={addTradingCondition}
                    className="px-3 py-1.5 bg-app-primary-10 border border-app-primary-color/30 rounded
                               font-mono text-xs color-primary hover:opacity-90 transition-colors
                               flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Condition
                  </button>
                </div>
                {tradingConditions.length === 0 ? (
                  <div className="text-center py-6 text-app-secondary-60 font-mono text-sm">
                    Add conditions to trigger this strategy
                  </div>
                ) : (
                  tradingConditions.map((cond, idx) => (
                    <UnifiedConditionBuilder
                      key={cond.id}
                      toolType="automate"
                      condition={cond}
                      index={idx}
                      onUpdate={(updates) =>
                        updateTradingCondition(
                          cond.id,
                          updates as Partial<TradingCondition>,
                        )
                      }
                      onRemove={() => removeTradingCondition(cond.id)}
                    />
                  ))
                )}
              </div>,
              `${tradingConditions.length}`,
            )}

            {/* Actions */}
            {renderSection(
              "actions",
              "Actions",
              <Target className="w-4 h-4" />,
              <div className="space-y-3">
                <div className="flex items-center justify-end">
                  <button
                    onClick={addTradingAction}
                    className="px-3 py-1.5 bg-app-primary-10 border border-app-primary-color/30 rounded
                               font-mono text-xs color-primary hover:opacity-90 transition-colors
                               flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Action
                  </button>
                </div>
                {tradingActions.length === 0 ? (
                  <div className="text-center py-6 text-app-secondary-60 font-mono text-sm">
                    Add actions to execute when conditions are met
                  </div>
                ) : (
                  tradingActions.map((action, idx) => (
                    <UnifiedActionBuilder
                      key={action.id}
                      toolType="automate"
                      action={action}
                      index={idx}
                      onUpdate={(updates) =>
                        updateTradingAction(
                          action.id,
                          updates as Partial<TradingAction>,
                        )
                      }
                      onRemove={() => removeTradingAction(action.id)}
                    />
                  ))
                )}
              </div>,
              `${tradingActions.length}`,
            )}

            {/* Whitelist */}
            {renderSection(
              "whitelist",
              "Whitelist Addresses",
              <Users className="w-4 h-4" />,
              <UnifiedWalletManager
                type="whitelist"
                onSelectList={setWhitelistedAddresses}
                currentAddresses={whitelistedAddresses}
                onAddressesChange={setWhitelistedAddresses}
              />,
              `${whitelistedAddresses.length}`,
            )}
          </>
        )}

        {/* Execution Settings */}
        {renderSection(
          "execution",
          "Execution Settings",
          <Settings2 className="w-4 h-4" />,
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
                Cooldown
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={cooldown}
                  onChange={(e) => setCooldown(parseInt(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary focus:outline-none focus:border-app-primary-60"
                />
                <select
                  value={cooldownUnit}
                  onChange={(e) =>
                    setCooldownUnit(e.target.value as CooldownUnit)
                  }
                  className="px-2 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary focus:outline-none focus:border-app-primary-60"
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
              <label className="block text-[11px] font-mono text-app-secondary-60 uppercase tracking-wider mb-1.5">
                Max Executions
              </label>
              <input
                type="number"
                min="0"
                value={maxExecutions || ""}
                onChange={(e) =>
                  setMaxExecutions(
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
                placeholder="Unlimited"
                className="w-full px-3 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary focus:outline-none focus:border-app-primary-60 placeholder:text-app-secondary-60"
              />
            </div>
          </div>,
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-app-primary-40">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-app-primary border border-app-primary-40 rounded font-mono text-sm text-app-secondary-80
                     hover:bg-app-primary-20 transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-success-20 border border-success/30 rounded font-mono text-sm text-success
                     hover:bg-success-40 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isEditing ? "Update Profile" : "Create Profile"}
        </button>
      </div>
    </div>
  );
};

export default ProfileBuilder;
