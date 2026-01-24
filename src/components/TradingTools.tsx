/**
 * TradingTools - Unified Trading Tools Component
 *
 * Combines Sniper, CopyTrade, and Automate into a tabbed interface.
 */

import React, { useState, useMemo } from "react";
import { Zap, Users, Bot } from "lucide-react";

import { Sniper } from "./sniper";
import { CopyTrade } from "./copytrade";
import { Automate } from "./automate";

import {
  loadSniperProfiles,
  loadCopyTradeProfiles,
  loadStrategies,
} from "../utils/storage/automation";

import type { ToolType } from "../utils/types/automation";

// ============================================================================
// Types
// ============================================================================

export interface WalletType {
  address: string;
  privateKey?: string;
  name?: string;
  balance?: number;
}

interface TradingToolsProps {
  availableWallets?: WalletType[];
  onExecute?: (type: ToolType, profileId: string, action: unknown) => void;
}

// ============================================================================
// Component
// ============================================================================

export const TradingTools: React.FC<TradingToolsProps> = ({
  availableWallets = [],
  onExecute,
}) => {
  const [activeTab, setActiveTab] = useState<ToolType>("sniper");

  // Get stats for badges
  const stats = useMemo(() => {
    const sniperProfiles = loadSniperProfiles();
    const copyTradeProfiles = loadCopyTradeProfiles();
    const strategies = loadStrategies();

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
  }, []);

  const tabs = [
    {
      id: "sniper" as ToolType,
      label: "Sniper",
      icon: Zap,
      color: "yellow",
      stats: stats.sniper,
    },
    {
      id: "copytrade" as ToolType,
      label: "Copy Trade",
      icon: Users,
      color: "emerald",
      stats: stats.copytrade,
    },
    {
      id: "automate" as ToolType,
      label: "Automate",
      icon: Bot,
      color: "purple",
      stats: stats.automate,
    },
  ];

  const getTabColors = (id: ToolType, isActive: boolean) => {
    const colors = {
      sniper: {
        active: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
        inactive:
          "bg-app-accent border-app-primary-40 text-app-secondary-60 hover:bg-app-primary-10 hover:border-app-primary-60 hover:text-app-secondary-80",
        badge: "bg-yellow-500/20 text-yellow-400",
      },
      copytrade: {
        active: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        inactive:
          "bg-app-accent border-app-primary-40 text-app-secondary-60 hover:bg-app-primary-10 hover:border-app-primary-60 hover:text-app-secondary-80",
        badge: "bg-emerald-500/20 text-emerald-400",
      },
      automate: {
        active: "bg-purple-500/10 border-purple-500/30 text-purple-400",
        inactive:
          "bg-app-accent border-app-primary-40 text-app-secondary-60 hover:bg-app-primary-10 hover:border-app-primary-60 hover:text-app-secondary-80",
        badge: "bg-purple-500/20 text-purple-400",
      },
    };
    return isActive ? colors[id].active : colors[id].inactive;
  };

  const getBadgeColors = (id: ToolType) => {
    const colors = {
      sniper: "bg-yellow-500/20 text-yellow-400",
      copytrade: "bg-emerald-500/20 text-emerald-400",
      automate: "bg-purple-500/20 text-purple-400",
    };
    return colors[id];
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-3 px-5 py-3 rounded-xl border transition-all duration-200
                ${getTabColors(tab.id, isActive)}
                ${isActive ? "shadow-lg" : ""}
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? "animate-pulse" : ""}`} />
              <span className="font-mono text-sm font-medium">{tab.label}</span>
              {tab.stats.active > 0 && (
                <span
                  className={`
                    px-2 py-0.5 rounded-full text-[10px] font-mono font-bold
                    ${getBadgeColors(tab.id)}
                  `}
                >
                  {tab.stats.active}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "sniper" && (
          <Sniper
            availableWallets={availableWallets}
            onExecute={(profileId, action) =>
              onExecute?.("sniper", profileId, action)
            }
          />
        )}
        {activeTab === "copytrade" && (
          <CopyTrade
            availableWallets={availableWallets}
            onExecute={(profileId, action) =>
              onExecute?.("copytrade", profileId, action)
            }
          />
        )}
        {activeTab === "automate" && (
          <Automate
            availableWallets={availableWallets}
            onExecute={(strategyId, action) =>
              onExecute?.("automate", strategyId, action)
            }
          />
        )}
      </div>
    </div>
  );
};

export default TradingTools;
