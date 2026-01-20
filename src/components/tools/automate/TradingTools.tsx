/**
 * TradingTools - Unified Trading Tools Component
 *
 * Combines Sniper Bot, Copy Trade, and Automate into a single, cohesive interface
 * Uses app's existing styling conventions
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Zap,
  Users,
  Bot,
  Plus,
  Download,
  Upload,
  Search,
  Activity,
  Pause,
} from "lucide-react";

import type {
  ToolType,
  SniperProfile,
  CopyTradeProfile,
  TradingStrategy,
  WalletList,
  WalletType,
} from "./types";

import {
  loadSniperProfiles,
  addSniperProfile,
  updateSniperProfile,
  deleteSniperProfile,
  toggleSniperProfile,
  loadCopyTradeProfiles,
  addCopyTradeProfile,
  updateCopyTradeProfile,
  deleteCopyTradeProfile,
  toggleCopyTradeProfile,
  loadStrategies,
  addStrategy,
  updateStrategy,
  deleteStrategy,
  toggleStrategy,
  loadCopyTradeWalletLists,
  exportAllProfiles,
  importAllProfiles,
  duplicateProfile,
} from "./storage";

import ProfileCard from "./ProfileCard";
import ProfileBuilder from "./ProfileBuilder";

// ============================================================================
// Constants
// ============================================================================

const TOOL_CONFIG = {
  sniper: {
    name: "Sniper Bot",
    description: "Auto-buy on deploy/migration events",
    icon: Zap,
    accentClass: "color-primary",
    bgClass: "bg-app-primary-10",
    borderClass: "border-app-primary-color/30",
  },
  copytrade: {
    name: "Copy Trade",
    description: "Mirror trades from watched wallets",
    icon: Users,
    accentClass: "color-primary",
    bgClass: "bg-app-primary-10",
    borderClass: "border-app-primary-color/30",
  },
  automate: {
    name: "Automate",
    description: "Strategy-based automated trading",
    icon: Bot,
    accentClass: "color-primary",
    bgClass: "bg-app-primary-10",
    borderClass: "border-app-primary-color/30",
  },
} as const;

// ============================================================================
// Props
// ============================================================================

interface TradingToolsProps {
  availableWallets?: WalletType[];
  onExecute?: (type: ToolType, profileId: string, action: unknown) => void;
}

// ============================================================================
// Main Component
// ============================================================================

const TradingTools: React.FC<TradingToolsProps> = ({
  availableWallets = [],
}) => {
  // ========== State ==========
  const [activeTab, setActiveTab] = useState<ToolType>("sniper");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Profile states
  const [sniperProfiles, setSniperProfiles] = useState<SniperProfile[]>([]);
  const [copyTradeProfiles, setCopyTradeProfiles] = useState<
    CopyTradeProfile[]
  >([]);
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [walletLists, setWalletLists] = useState<WalletList[]>([]);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========== Load Data ==========
  useEffect(() => {
    setSniperProfiles(loadSniperProfiles());
    setCopyTradeProfiles(loadCopyTradeProfiles());
    setStrategies(loadStrategies());
    setWalletLists(loadCopyTradeWalletLists());
  }, []);

  // ========== Filtered Profiles ==========
  const filteredProfiles = useMemo(() => {
    let profiles: (SniperProfile | CopyTradeProfile | TradingStrategy)[] = [];

    switch (activeTab) {
      case "sniper":
        profiles = sniperProfiles;
        break;
      case "copytrade":
        profiles = copyTradeProfiles;
        break;
      case "automate":
        profiles = strategies;
        break;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      profiles = profiles.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term),
      );
    }

    if (filterActive !== null) {
      profiles = profiles.filter((p) => p.isActive === filterActive);
    }

    return profiles;
  }, [
    activeTab,
    sniperProfiles,
    copyTradeProfiles,
    strategies,
    searchTerm,
    filterActive,
  ]);

  // ========== Profile Actions ==========
  const handleToggleProfile = (id: string): void => {
    switch (activeTab) {
      case "sniper":
        setSniperProfiles(toggleSniperProfile(id));
        break;
      case "copytrade":
        setCopyTradeProfiles(toggleCopyTradeProfile(id));
        break;
      case "automate":
        setStrategies(toggleStrategy(id));
        break;
    }
  };

  const handleDeleteProfile = (id: string): void => {
    if (!confirm("Are you sure you want to delete this profile?")) return;

    switch (activeTab) {
      case "sniper":
        setSniperProfiles(deleteSniperProfile(id));
        break;
      case "copytrade":
        setCopyTradeProfiles(deleteCopyTradeProfile(id));
        break;
      case "automate":
        setStrategies(deleteStrategy(id));
        break;
    }
  };

  const handleDuplicateProfile = (id: string): void => {
    switch (activeTab) {
      case "sniper": {
        const profile = sniperProfiles.find((p) => p.id === id);
        if (profile) {
          const dup = duplicateProfile(profile, "sniper");
          setSniperProfiles(addSniperProfile(dup));
        }
        break;
      }
      case "copytrade": {
        const profile = copyTradeProfiles.find((p) => p.id === id);
        if (profile) {
          const dup = duplicateProfile(profile, "copytrade");
          setCopyTradeProfiles(addCopyTradeProfile(dup));
        }
        break;
      }
      case "automate": {
        const strategy = strategies.find((s) => s.id === id);
        if (strategy) {
          const dup = duplicateProfile(strategy, "automate");
          setStrategies(addStrategy(dup));
        }
        break;
      }
    }
  };

  // ========== Import/Export ==========
  const handleExportAll = (): void => {
    const data = exportAllProfiles();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trading_tools_backup_${Date.now()}.json`;
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
        const counts = importAllProfiles(content);
        setSniperProfiles(loadSniperProfiles());
        setCopyTradeProfiles(loadCopyTradeProfiles());
        setStrategies(loadStrategies());
        alert(
          `Imported: ${counts.sniper} sniper, ${counts.copytrade} copy trade, ${counts.automate} automate profiles`,
        );
      } catch {
        alert("Failed to import profiles. Invalid file format.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // ========== Stats ==========
  const stats = useMemo(() => {
    return {
      sniper: {
        total: sniperProfiles.length,
        active: sniperProfiles.filter((p) => p.isActive).length,
      },
      copytrade: {
        total: copyTradeProfiles.length,
        active: copyTradeProfiles.filter((p) => p.isActive).length,
      },
      automate: {
        total: strategies.length,
        active: strategies.filter((s) => s.isActive).length,
      },
    };
  }, [sniperProfiles, copyTradeProfiles, strategies]);

  const config = TOOL_CONFIG[activeTab];
  const Icon = config.icon;

  return (
    <div className="bg-app-primary text-app-tertiary">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />

      {/* Header */}
      <div className="bg-app-accent border border-app-primary-40 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg ${config.bgClass} ${config.borderClass} border`}
            >
              <Icon className={`w-5 h-5 ${config.accentClass}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-app-primary font-mono tracking-tight">
                Trading Tools
              </h2>
              <p className="text-xs text-app-secondary-60 font-mono">
                {config.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-app-primary border border-app-primary-40 rounded font-mono text-xs text-app-secondary-80
                         hover:bg-app-primary-20 hover:text-app-primary transition-colors flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </button>
            <button
              onClick={handleExportAll}
              className="px-3 py-2 bg-app-primary border border-app-primary-40 rounded font-mono text-xs text-app-secondary-80
                         hover:bg-app-primary-20 hover:text-app-primary transition-colors flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={() => {
                setIsCreating(true);
                setEditingId(null);
              }}
              className={`
                px-4 py-2 rounded font-mono text-xs font-medium
                transition-all flex items-center gap-2
                ${config.bgClass} ${config.borderClass} border ${config.accentClass}
                hover:opacity-90
              `}
            >
              <Plus className="w-4 h-4" />
              New Profile
            </button>
          </div>
        </div>

        {/* Tool Tabs */}
        <div className="flex items-center gap-2">
          {(Object.keys(TOOL_CONFIG) as ToolType[]).map((tool) => {
            const toolConfig = TOOL_CONFIG[tool];
            const ToolIcon = toolConfig.icon;
            const isActive = activeTab === tool;
            const toolStats = stats[tool];

            return (
              <button
                key={tool}
                onClick={() => {
                  setActiveTab(tool);
                  setSearchTerm("");
                  setFilterActive(null);
                }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded font-mono text-xs
                  transition-all
                  ${
                    isActive
                      ? `${toolConfig.bgClass} ${toolConfig.borderClass} border ${toolConfig.accentClass}`
                      : "bg-app-primary border border-app-primary-40 text-app-secondary-60 hover:bg-app-primary-20 hover:text-app-secondary-80"
                  }
                `}
              >
                <ToolIcon className="w-4 h-4" />
                <span>{toolConfig.name}</span>
                <span
                  className={`
                  px-1.5 py-0.5 rounded text-[10px] font-medium
                  ${isActive ? "bg-app-primary/30" : "bg-app-primary-20"}
                `}
                >
                  {toolStats.active}/{toolStats.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-secondary-60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search profiles..."
            className="w-full pl-10 pr-4 py-2 bg-app-quaternary border border-app-primary-30 rounded font-mono text-sm text-app-primary
                       focus:outline-none focus:border-app-primary-60 transition-colors placeholder:text-app-secondary-60"
          />
        </div>

        <div className="flex items-center gap-1 bg-app-accent border border-app-primary-40 rounded p-1">
          <button
            onClick={() => setFilterActive(null)}
            className={`
              px-3 py-1.5 rounded font-mono text-xs transition-colors
              ${filterActive === null ? "bg-app-primary-20 text-app-primary" : "text-app-secondary-60 hover:text-app-secondary-80"}
            `}
          >
            All
          </button>
          <button
            onClick={() => setFilterActive(true)}
            className={`
              px-3 py-1.5 rounded font-mono text-xs transition-colors flex items-center gap-1.5
              ${filterActive === true ? "bg-success-20 text-success" : "text-app-secondary-60 hover:text-app-secondary-80"}
            `}
          >
            <Activity className="w-3 h-3" />
            Active
          </button>
          <button
            onClick={() => setFilterActive(false)}
            className={`
              px-3 py-1.5 rounded font-mono text-xs transition-colors flex items-center gap-1.5
              ${filterActive === false ? "bg-app-primary-20 text-app-primary" : "text-app-secondary-60 hover:text-app-secondary-80"}
            `}
          >
            <Pause className="w-3 h-3" />
            Inactive
          </button>
        </div>
      </div>

      {/* Profile Grid or Builder */}
      {isCreating || editingId ? (
        <ProfileBuilder
          type={activeTab}
          profile={
            editingId
              ? activeTab === "sniper"
                ? sniperProfiles.find((p) => p.id === editingId)
                : activeTab === "copytrade"
                  ? copyTradeProfiles.find((p) => p.id === editingId)
                  : strategies.find((s) => s.id === editingId)
              : null
          }
          availableWallets={availableWallets}
          walletLists={walletLists}
          onSave={(profile) => {
            switch (activeTab) {
              case "sniper":
                if (editingId) {
                  setSniperProfiles(
                    updateSniperProfile(profile as SniperProfile),
                  );
                } else {
                  setSniperProfiles(addSniperProfile(profile as SniperProfile));
                }
                break;
              case "copytrade":
                if (editingId) {
                  setCopyTradeProfiles(
                    updateCopyTradeProfile(profile as CopyTradeProfile),
                  );
                } else {
                  setCopyTradeProfiles(
                    addCopyTradeProfile(profile as CopyTradeProfile),
                  );
                }
                break;
              case "automate":
                if (editingId) {
                  setStrategies(updateStrategy(profile as TradingStrategy));
                } else {
                  setStrategies(addStrategy(profile as TradingStrategy));
                }
                break;
            }
            setIsCreating(false);
            setEditingId(null);
          }}
          onCancel={() => {
            setIsCreating(false);
            setEditingId(null);
          }}
        />
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-12 bg-app-accent border border-app-primary-40 rounded-lg">
          <div
            className={`w-14 h-14 mx-auto mb-4 rounded-xl ${config.bgClass} flex items-center justify-center`}
          >
            <Icon className={`w-7 h-7 ${config.accentClass} opacity-50`} />
          </div>
          <h3 className="text-sm font-mono text-app-secondary-60 mb-2">
            {searchTerm || filterActive !== null
              ? "No profiles found"
              : `No ${config.name} profiles yet`}
          </h3>
          <p className="text-xs font-mono text-app-secondary-40 mb-4">
            {searchTerm || filterActive !== null
              ? "Try adjusting your search or filters"
              : "Create your first profile to get started"}
          </p>
          {!searchTerm && filterActive === null && (
            <button
              onClick={() => setIsCreating(true)}
              className={`
                px-4 py-2 rounded font-mono text-xs font-medium
                ${config.bgClass} ${config.borderClass} border ${config.accentClass}
                hover:opacity-90 transition-all
              `}
            >
              <Plus className="w-4 h-4 inline-block mr-2" />
              Create Profile
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              type={activeTab}
              profile={profile}
              onToggle={() => handleToggleProfile(profile.id)}
              onEdit={() => setEditingId(profile.id)}
              onDuplicate={() => handleDuplicateProfile(profile.id)}
              onDelete={() => handleDeleteProfile(profile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TradingTools;
