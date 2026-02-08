import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Zap,
  Save,
  Wifi,
  Server,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Settings,
  ChevronRight,
  Check,
  Gauge,
  Network,
  Timer,
  Percent,
  Coins,
  Layers,
  Radio,
  Send,
} from "lucide-react";
import { useAppContext } from "../contexts";
import { useToast } from "../utils/hooks";
import { saveConfigToCookies } from "../utils/storage";
import { HorizontalHeader } from "../components/HorizontalHeader";
import { PageBackground } from "../components/PageBackground";
import type { ServerInfo } from "../utils/types";
import { RPCEndpointManager } from "../components/RPCEndpointManager";
import { createDefaultEndpoints, type RPCEndpoint } from "../utils/rpcManager";
import { OnboardingTutorial } from "../components/OnboardingTutorial";

type SettingsTab =
  | "network"
  | "trading"
  | "execution"
  | "help";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: "network",
    label: "Network",
    icon: <Globe size={18} />,
    description: "RPC Endpoints",
  },
  {
    id: "trading",
    label: "Trading",
    icon: <Server size={18} />,
    description: "Server & Routing",
  },
  {
    id: "execution",
    label: "Execution",
    icon: <Zap size={18} />,
    description: "Trade Settings",
  },
  {
    id: "help",
    label: "Help",
    icon: <BookOpen size={18} />,
    description: "Tutorial",
  },
];

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const { config, setConfig } = useAppContext();

  const [activeTab, setActiveTab] = useState<SettingsTab>("network");
  const [currentRegion, setCurrentRegion] = useState<string>("US");
  const [availableServers, setAvailableServers] = useState<ServerInfo[]>([]);
  const [isChangingServer, setIsChangingServer] = useState(false);
  const [isLoadingServers, setIsLoadingServers] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleConfigChange = (
    key: keyof typeof config,
    value: string,
  ): void => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
  };

  const handleSaveAndClose = (): void => {
    saveConfigToCookies(config);
    showToast("Settings saved successfully", "success");
  };

  const updateServerData = useCallback((): void => {
    if (window.serverRegion) {
      setCurrentRegion(window.serverRegion);
    }
    if (window.availableServers && window.availableServers.length > 0) {
      setAvailableServers(window.availableServers);
      setIsLoadingServers(false);
    }
  }, []);

  useEffect(() => {
    updateServerData();
    const handleServerUpdate = (): void => updateServerData();
    window.addEventListener("serverChanged", handleServerUpdate);
    return (): void =>
      window.removeEventListener("serverChanged", handleServerUpdate);
  }, [updateServerData]);

  const handleServerSwitch = async (serverId: string): Promise<void> => {
    if (!window.switchServer) return;
    setIsChangingServer(true);
    try {
      const success = await window.switchServer(serverId);
      if (success) {
        const server = availableServers.find((s) => s.id === serverId);
        if (server) {
          setCurrentRegion(server.region);
          showToast(`Switched to ${server.name} (${server.region})`, "success");
        }
      } else {
        showToast("Failed to switch trading server", "error");
      }
    } catch {
      showToast("Error switching trading server", "error");
    } finally {
      setIsChangingServer(false);
    }
  };

  const getPingColor = (ping?: number): string => {
    if (!ping || ping === Infinity) return "text-app-secondary-40";
    if (ping < 50) return "text-ping-good";
    if (ping < 100) return "text-ping-medium";
    return "text-ping-poor";
  };

  const getPingBg = (ping?: number): string => {
    if (!ping || ping === Infinity) return "bg-app-primary-10";
    if (ping < 50) return "bg-ping-good-10";
    if (ping < 100) return "bg-ping-medium-20";
    return "bg-ping-poor-10";
  };

  // ========== TAB CONTENT RENDERERS ==========

  const renderNetworkTab = (): JSX.Element => (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-app-primary-20">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
          <Network size={24} className="color-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-app-primary font-mono">
            RPC Configuration
          </h2>
          <p className="text-xs text-app-secondary-60 font-mono">
            Manage RPC endpoints with weighted load balancing
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-app-primary-color/5 to-transparent border border-app-primary-color/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-app-primary-color/20 flex items-center justify-center flex-shrink-0">
            <Gauge size={16} className="color-primary" />
          </div>
          <div>
            <p className="text-sm text-app-primary font-mono font-medium">
              Weighted Distribution
            </p>
            <p className="text-xs text-app-secondary-60 font-mono mt-1">
              Configure weights (0-100%) for each endpoint. Higher weights
              increase selection probability. Total must equal 100%.
            </p>
          </div>
        </div>
      </div>

      {/* RPC Manager */}
      <div className="bg-app-tertiary/50 rounded-xl border border-app-primary-20 p-4">
        <RPCEndpointManager
          endpoints={
            config.rpcEndpoints
              ? (JSON.parse(config.rpcEndpoints) as RPCEndpoint[])
              : createDefaultEndpoints()
          }
          onChange={(endpoints) =>
            handleConfigChange("rpcEndpoints", JSON.stringify(endpoints))
          }
        />
      </div>
    </div>
  );

  const renderTradingTab = (): JSX.Element => {
    // Check which endpoints are configured
    const hasRpcEndpoint = !!config.customRpcEndpoint?.trim();
    const hasJitoSingleEndpoint = !!config.customJitoSingleEndpoint?.trim();
    const hasJitoBundleEndpoint = !!config.customJitoBundleEndpoint?.trim();

    // Determine if current selections are valid
    const singleTxMode = config.singleTxMode || "rpc";
    const multiTxMode = config.multiTxMode || "bundle";

    const isSingleModeValid =
      singleTxMode === "rpc" ? hasRpcEndpoint : hasJitoSingleEndpoint;
    const isMultiModeValid =
      multiTxMode === "bundle" ? hasJitoBundleEndpoint : hasRpcEndpoint;

    // Handler that validates before changing mode
    const handleSingleTxModeChange = (value: string): void => {
      if (value === "rpc" && !hasRpcEndpoint) {
        showToast("Please configure RPC Endpoint first", "error");
        return;
      }
      if (value === "jito" && !hasJitoSingleEndpoint) {
        showToast("Please configure Jito Single TX Endpoint first", "error");
        return;
      }
      handleConfigChange("singleTxMode", value);
    };

    const handleMultiTxModeChange = (value: string): void => {
      if (value === "bundle" && !hasJitoBundleEndpoint) {
        showToast("Please configure Jito Bundle Endpoint first", "error");
        return;
      }
      if ((value === "parallel" || value === "sequential") && !hasRpcEndpoint) {
        showToast("Please configure RPC Endpoint first", "error");
        return;
      }
      handleConfigChange("multiTxMode", value);
    };

    return (
      <div className="space-y-6 animate-fade-in-down">
        {/* Section Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-app-primary-20">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
            <Server size={24} className="color-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-app-primary font-mono">
              Trading Configuration
            </h2>
            <p className="text-xs text-app-secondary-60 font-mono">
              Configure server connection and transaction routing
            </p>
          </div>
        </div>

        {/* Regional Server Selection */}
        <div className="p-5 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
            <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
              <Radio size={14} className="color-primary" />
              Regional Server Selection
            </label>

            {/* Current Region Badge */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-app-quaternary border border-app-primary-20">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${isLoadingServers ? "bg-app-primary-color animate-pulse" : "bg-app-primary-color"}`}
                />
                <span className="text-sm font-mono text-app-primary font-bold">
                  {isLoadingServers
                    ? "DETECTING..."
                    : `REGION: ${currentRegion}`}
                </span>
              </div>
              {isChangingServer && (
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin color-primary" />
                  <span className="text-xs font-mono color-primary">
                    SWITCHING
                  </span>
                </div>
              )}
            </div>

            {/* Server List */}
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {isLoadingServers ? (
                <div className="p-6 text-center">
                  <RefreshCw
                    size={24}
                    className="animate-spin color-primary mx-auto mb-2"
                  />
                  <span className="text-xs text-app-secondary-60 font-mono">
                    Checking server availability...
                  </span>
                </div>
              ) : availableServers.length > 0 ? (
                availableServers.map((server) => (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => void handleServerSwitch(server.id)}
                    disabled={isChangingServer}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 group ${
                      server.region === currentRegion
                        ? "bg-app-primary-color/10 border-2 border-app-primary-color/50 shadow-[0_0_15px_rgba(2,179,109,0.15)]"
                        : "bg-app-quaternary/50 border border-app-primary-20 hover:border-app-primary-40 hover:bg-app-quaternary"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{server.flag}</span>
                      <div>
                        <div
                          className={`text-sm font-mono font-bold ${server.region === currentRegion ? "color-primary" : "text-app-primary"}`}
                        >
                          {server.name}
                        </div>
                        <div className="text-[10px] font-mono text-app-secondary-40 truncate max-w-[180px]">
                          {server.url}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {server.ping && server.ping < Infinity && (
                        <div
                          className={`text-xs font-mono px-2 py-1 rounded-full border ${getPingBg(server.ping)} ${getPingColor(server.ping)} border-current/20`}
                        >
                          {Math.round(server.ping)}ms
                        </div>
                      )}
                      {server.region === currentRegion && (
                        <div className="w-6 h-6 rounded-full bg-app-primary-color flex items-center justify-center">
                          <Check size={14} className="text-black" />
                        </div>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-error font-mono text-sm">
                  No servers reachable. Check your connection.
                </div>
              )}
            </div>
          </div>

        {/* Sending Mode Toggle */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono uppercase tracking-wider">
            <Radio size={14} className="color-primary" />
            Sending Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                value: "server",
                label: "Trading Server",
                icon: <Server size={20} />,
                desc: "Use configured trading server",
              },
              {
                value: "custom",
                label: "Custom Endpoints",
                icon: <Wifi size={20} />,
                desc: "Use your own RPC/Jito endpoints",
              },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleConfigChange("sendingMode", opt.value)}
                className={`relative group p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden ${
                  (config.sendingMode || "server") === opt.value
                    ? "border-app-primary-color/50 bg-app-primary-color/10 shadow-[0_0_20px_rgba(2,179,109,0.15)]"
                    : "border-app-primary-20 bg-app-tertiary/50 hover:border-app-primary-40 hover:bg-app-tertiary"
                }`}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-app-primary-color/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`${(config.sendingMode || "server") === opt.value ? "color-primary" : "text-app-secondary-60"}`}
                    >
                      {opt.icon}
                    </span>
                    {(config.sendingMode || "server") === opt.value && (
                      <div className="w-5 h-5 rounded-full bg-app-primary-color flex items-center justify-center">
                        <Check size={12} className="text-black" />
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-sm font-bold font-mono ${(config.sendingMode || "server") === opt.value ? "color-primary" : "text-app-primary"}`}
                  >
                    {opt.label}
                  </div>
                  <div className="text-[10px] font-mono text-app-secondary-40 mt-1">
                    {opt.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Endpoints - Only shown when custom mode is selected */}
        {(config.sendingMode || "server") === "custom" && (
          <div className="space-y-4 animate-fade-in-down">
            {/* RPC Endpoint */}
            <div
              className={`p-5 rounded-xl bg-app-tertiary/50 border ${hasRpcEndpoint ? "border-app-primary-20" : "border-red-500/30"}`}
            >
              <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
                <Globe size={14} className="color-primary" />
                RPC Endpoint
                {hasRpcEndpoint && (
                  <Check size={12} className="text-green-500 ml-auto" />
                )}
              </label>
              <input
                type="text"
                value={config.customRpcEndpoint || ""}
                onChange={(e) =>
                  handleConfigChange("customRpcEndpoint", e.target.value)
                }
                className={`w-full bg-app-quaternary border rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:ring-1 focus:ring-app-primary-color/50 focus:outline-none font-mono transition-all ${hasRpcEndpoint ? "border-app-primary-30" : "border-red-500/50"}`}
                placeholder="https://your-rpc.solana-mainnet.quiknode.pro/..."
              />
              <p className="text-[10px] text-app-secondary-40 font-mono mt-2">
                Required for RPC single TX and RPC parallel/sequential modes
              </p>
            </div>

            {/* Jito Single TX Endpoint */}
            <div
              className={`p-5 rounded-xl bg-app-tertiary/50 border ${hasJitoSingleEndpoint ? "border-app-primary-20" : "border-red-500/30"}`}
            >
              <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
                <Zap size={14} className="color-primary" />
                Jito Single TX Endpoint
                {hasJitoSingleEndpoint && (
                  <Check size={12} className="text-green-500 ml-auto" />
                )}
              </label>
              <input
                type="text"
                value={config.customJitoSingleEndpoint || ""}
                onChange={(e) =>
                  handleConfigChange("customJitoSingleEndpoint", e.target.value)
                }
                className={`w-full bg-app-quaternary border rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:ring-1 focus:ring-app-primary-color/50 focus:outline-none font-mono transition-all ${hasJitoSingleEndpoint ? "border-app-primary-30" : "border-red-500/50"}`}
                placeholder="https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/transactions?uuid=..."
              />
              <p className="text-[10px] text-app-secondary-40 font-mono mt-2">
                Required for Jito single transaction mode
              </p>
            </div>

            {/* Jito Bundle Endpoint */}
            <div
              className={`p-5 rounded-xl bg-app-tertiary/50 border ${hasJitoBundleEndpoint ? "border-app-primary-20" : "border-red-500/30"}`}
            >
              <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
                <Layers size={14} className="color-primary" />
                Jito Bundle Endpoint
                {hasJitoBundleEndpoint && (
                  <Check size={12} className="text-green-500 ml-auto" />
                )}
              </label>
              <input
                type="text"
                value={config.customJitoBundleEndpoint || ""}
                onChange={(e) =>
                  handleConfigChange("customJitoBundleEndpoint", e.target.value)
                }
                className={`w-full bg-app-quaternary border rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:ring-1 focus:ring-app-primary-color/50 focus:outline-none font-mono transition-all ${hasJitoBundleEndpoint ? "border-app-primary-30" : "border-red-500/50"}`}
                placeholder="https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles?uuid=..."
              />
              <p className="text-[10px] text-app-secondary-40 font-mono mt-2">
                Required for Jito bundle mode (multiple transactions)
              </p>
            </div>
          </div>
        )}

        {/* Transaction Routing Options - Only shown when custom mode is selected */}
        {(config.sendingMode || "server") === "custom" && (
          <>
            {/* Single Transaction Mode */}
            <div className="space-y-3 animate-fade-in-down">
              <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono uppercase tracking-wider">
                <Send size={14} className="color-primary" />
                Single Transaction Mode
                {!isSingleModeValid && (
                  <span className="text-red-400 text-[10px] ml-2">
                    (endpoint not configured)
                  </span>
                )}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    value: "rpc",
                    label: "RPC",
                    icon: <Globe size={18} />,
                    desc: "Send via RPC sendTransaction",
                    disabled: !hasRpcEndpoint,
                  },
                  {
                    value: "jito",
                    label: "Jito",
                    icon: <Zap size={18} />,
                    desc: "Send via Jito with tip",
                    disabled: !hasJitoSingleEndpoint,
                  },
                ].map((opt) => {
                  const isSelected = singleTxMode === opt.value;
                  const isDisabled = opt.disabled && !isSelected;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSingleTxModeChange(opt.value)}
                      disabled={isDisabled}
                      className={`relative group p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden ${
                        isSelected
                          ? "border-app-primary-color/50 bg-app-primary-color/10 shadow-[0_0_20px_rgba(2,179,109,0.15)]"
                          : isDisabled
                            ? "border-app-primary-10 bg-app-tertiary/30 opacity-50 cursor-not-allowed"
                            : "border-app-primary-20 bg-app-tertiary/50 hover:border-app-primary-40 hover:bg-app-tertiary"
                      }`}
                    >
                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`${isSelected ? "color-primary" : "text-app-secondary-60"}`}
                          >
                            {opt.icon}
                          </span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-app-primary-color flex items-center justify-center">
                              <Check size={12} className="text-black" />
                            </div>
                          )}
                          {isDisabled && (
                            <AlertCircle size={14} className="text-red-400" />
                          )}
                        </div>
                        <div
                          className={`text-sm font-bold font-mono ${isSelected ? "color-primary" : "text-app-primary"}`}
                        >
                          {opt.label}
                        </div>
                        <div className="text-[10px] font-mono text-app-secondary-40 mt-1">
                          {opt.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-app-secondary-40 font-mono">
                How to send when there's only 1 transaction
              </p>
            </div>

            {/* Multiple Transactions Mode */}
            <div className="space-y-3 animate-fade-in-down">
              <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono uppercase tracking-wider">
                <Layers size={14} className="color-primary" />
                Multiple Transactions Mode
                {!isMultiModeValid && (
                  <span className="text-red-400 text-[10px] ml-2">
                    (endpoint not configured)
                  </span>
                )}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    value: "bundle",
                    label: "Jito Bundle",
                    icon: "📦",
                    desc: "Atomic bundle via Jito",
                    disabled: !hasJitoBundleEndpoint,
                  },
                  {
                    value: "parallel",
                    label: "RPC Parallel",
                    icon: "⚡",
                    desc: "All at once via RPC",
                    disabled: !hasRpcEndpoint,
                  },
                  {
                    value: "sequential",
                    label: "RPC Sequential",
                    icon: "🔄",
                    desc: "One by one via RPC",
                    disabled: !hasRpcEndpoint,
                  },
                ].map((opt) => {
                  const isSelected = multiTxMode === opt.value;
                  const isDisabled = opt.disabled && !isSelected;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleMultiTxModeChange(opt.value)}
                      disabled={isDisabled}
                      className={`relative group p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden ${
                        isSelected
                          ? "border-app-primary-color/50 bg-app-primary-color/10 shadow-[0_0_20px_rgba(2,179,109,0.15)]"
                          : isDisabled
                            ? "border-app-primary-10 bg-app-tertiary/30 opacity-50 cursor-not-allowed"
                            : "border-app-primary-20 bg-app-tertiary/50 hover:border-app-primary-40 hover:bg-app-tertiary"
                      }`}
                    >
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-app-primary-color/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{opt.icon}</span>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-app-primary-color flex items-center justify-center">
                              <Check size={12} className="text-black" />
                            </div>
                          )}
                          {isDisabled && (
                            <AlertCircle size={14} className="text-red-400" />
                          )}
                        </div>
                        <div
                          className={`text-sm font-bold font-mono ${isSelected ? "color-primary" : "text-app-primary"}`}
                        >
                          {opt.label}
                        </div>
                        <div className="text-[10px] font-mono text-app-secondary-40 mt-1">
                          {opt.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-app-secondary-40 font-mono">
                How to send when there are 2+ transactions
              </p>
            </div>
          </>
        )}

        {/* Info Card */}
        <div
          className={`p-4 rounded-xl bg-gradient-to-r border ${
            (config.sendingMode || "server") === "custom" &&
            (!isSingleModeValid || !isMultiModeValid)
              ? "from-red-500/5 to-transparent border-red-500/20"
              : "from-app-primary-color/5 to-transparent border-app-primary-color/20"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                (config.sendingMode || "server") === "custom" &&
                (!isSingleModeValid || !isMultiModeValid)
                  ? "bg-red-500/20"
                  : "bg-app-primary-color/20"
              }`}
            >
              <AlertCircle
                size={16}
                className={
                  (config.sendingMode || "server") === "custom" &&
                  (!isSingleModeValid || !isMultiModeValid)
                    ? "text-red-400"
                    : "color-primary"
                }
              />
            </div>
            <div>
              <p className="text-sm text-app-primary font-mono font-medium">
                Transaction Routing Summary
              </p>
              <p className="text-xs text-app-secondary-60 font-mono mt-1">
                {(config.sendingMode || "server") === "server" ? (
                  "Transactions are sent through the configured trading server."
                ) : !isSingleModeValid || !isMultiModeValid ? (
                  <span className="text-red-400">
                    Warning: Some selected modes don't have their required
                    endpoints configured. Please add the missing endpoints
                    above.
                  </span>
                ) : (
                  <>
                    Single TX:{" "}
                    {singleTxMode === "jito"
                      ? "Jito sendTransaction"
                      : "RPC sendTransaction"}
                    {" | "}
                    Multi TX:{" "}
                    {multiTxMode === "bundle"
                      ? "Jito Bundle"
                      : multiTxMode === "parallel"
                        ? "RPC Parallel"
                        : "RPC Sequential"}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExecutionTab = (): JSX.Element => (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-app-primary-20">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
          <Zap size={24} className="color-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-app-primary font-mono">
            Execution Engine
          </h2>
          <p className="text-xs text-app-secondary-60 font-mono">
            Configure trading execution and balance refresh settings
          </p>
        </div>
      </div>

      {/* Bundle Strategy */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono uppercase tracking-wider">
          <Layers size={14} className="color-primary" />
          Bundle Strategy
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              value: "single",
              label: "Single",
              icon: "🔄",
              desc: "Sequential",
              color: "blue",
            },
            {
              value: "batch",
              label: "Batch",
              icon: "📦",
              desc: "5 per block",
              color: "purple",
            },
            {
              value: "all-in-one",
              label: "All-In-One",
              icon: "🚀",
              desc: "Max speed",
              color: "green",
            },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleConfigChange("bundleMode", opt.value)}
              className={`relative group p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden ${
                config.bundleMode === opt.value
                  ? "border-app-primary-color bg-app-primary-color/10 shadow-[0_0_20px_rgba(2,179,109,0.15)]"
                  : "border-app-primary-20 bg-app-tertiary/50 hover:border-app-primary-40 hover:bg-app-tertiary"
              }`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-app-primary-color/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{opt.icon}</span>
                  {config.bundleMode === opt.value && (
                    <div className="w-5 h-5 rounded-full bg-app-primary-color flex items-center justify-center">
                      <Check size={12} className="text-black" />
                    </div>
                  )}
                </div>
                <div
                  className={`text-sm font-bold font-mono ${config.bundleMode === opt.value ? "color-primary" : "text-app-primary"}`}
                >
                  {opt.label}
                </div>
                <div className="text-[10px] font-mono text-app-secondary-40 mt-1">
                  {opt.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Timing Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
          <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
            <Timer size={14} className="color-primary" />
            Single Delay
          </label>
          <div className="relative">
            <input
              type="number"
              min="50"
              max="5000"
              step="50"
              value={config.singleDelay || "200"}
              onChange={(e) =>
                handleConfigChange("singleDelay", e.target.value)
              }
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:ring-1 focus:ring-app-primary-color/50 focus:outline-none font-mono transition-all"
            />
            <span className="absolute right-4 top-3 text-xs text-app-secondary-40 font-mono">
              ms
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
          <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
            <Timer size={14} className="color-primary" />
            Batch Delay
          </label>
          <div className="relative">
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={config.batchDelay || "1000"}
              onChange={(e) => handleConfigChange("batchDelay", e.target.value)}
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:ring-1 focus:ring-app-primary-color/50 focus:outline-none font-mono transition-all"
            />
            <span className="absolute right-4 top-3 text-xs text-app-secondary-40 font-mono">
              ms
            </span>
          </div>
        </div>
      </div>

      {/* Fee Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
          <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
            <Coins size={14} className="color-primary" />
            Priority Fee
          </label>
          <div className="relative">
            <input
              type="text"
              value={config.transactionFee}
              onChange={(e) =>
                handleConfigChange("transactionFee", e.target.value)
              }
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:ring-1 focus:ring-app-primary-color/50 focus:outline-none font-mono transition-all"
            />
            <span className="absolute right-4 top-3 text-xs text-app-secondary-40 font-mono">
              SOL
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
          <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
            <Percent size={14} className="color-primary" />
            Max Slippage
          </label>
          <div className="relative">
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={
                config.slippageBps
                  ? (parseFloat(config.slippageBps) / 100).toString()
                  : "99"
              }
              onChange={(e) => {
                const percentage = parseFloat(e.target.value) || 99;
                const bps = Math.round(percentage * 100).toString();
                handleConfigChange("slippageBps", bps);
              }}
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:ring-1 focus:ring-app-primary-color/50 focus:outline-none font-mono transition-all"
            />
            <span className="absolute right-4 top-3 text-xs text-app-secondary-40 font-mono">
              %
            </span>
          </div>
        </div>
      </div>

      {/* Balance Refresh Section */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-app-tertiary to-app-quaternary/50 border border-app-primary-20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-app-primary-color/20 border border-app-primary-color/30 flex items-center justify-center">
            <RefreshCw size={18} className="color-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-app-primary font-mono">
              Balance Refresh
            </h3>
            <p className="text-[10px] text-app-secondary-40 font-mono">
              Configure how wallet balances are refreshed
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            {
              value: "sequential",
              label: "Sequential",
              icon: "🔄",
              desc: "Safest",
            },
            { value: "batch", label: "Batch", icon: "📦", desc: "Balanced" },
            {
              value: "parallel",
              label: "Parallel",
              icon: "⚡",
              desc: "Fastest",
            },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                handleConfigChange("balanceRefreshStrategy", opt.value)
              }
              className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                (config.balanceRefreshStrategy || "batch") === opt.value
                  ? "border-app-primary-color/50 bg-app-primary-color/10"
                  : "border-app-primary-20 bg-app-quaternary/50 hover:border-app-primary-40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{opt.icon}</span>
                {(config.balanceRefreshStrategy || "batch") === opt.value && (
                  <Check size={14} className="color-primary" />
                )}
              </div>
              <div
                className={`text-xs font-bold font-mono ${(config.balanceRefreshStrategy || "batch") === opt.value ? "color-primary" : "text-app-primary"}`}
              >
                {opt.label}
              </div>
              <div className="text-[10px] font-mono text-app-secondary-40">
                {opt.desc}
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-app-secondary-40 font-mono uppercase mb-2 block">
              Batch Size
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={config.balanceRefreshBatchSize || "5"}
              onChange={(e) =>
                handleConfigChange("balanceRefreshBatchSize", e.target.value)
              }
              disabled={(config.balanceRefreshStrategy || "batch") !== "batch"}
              className={`w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-sm text-app-primary font-mono transition-all ${(config.balanceRefreshStrategy || "batch") !== "batch" ? "opacity-40" : "focus:border-app-primary-color"}`}
            />
          </div>
          <div>
            <label className="text-[10px] text-app-secondary-40 font-mono uppercase mb-2 block">
              Delay (ms)
            </label>
            <input
              type="number"
              min="0"
              max="5000"
              value={config.balanceRefreshDelay || "50"}
              onChange={(e) =>
                handleConfigChange("balanceRefreshDelay", e.target.value)
              }
              disabled={
                (config.balanceRefreshStrategy || "batch") === "parallel"
              }
              className={`w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-sm text-app-primary font-mono transition-all ${(config.balanceRefreshStrategy || "batch") === "parallel" ? "opacity-40" : "focus:border-app-primary-color"}`}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderHelpTab = (): JSX.Element => (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-app-primary-20">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
          <BookOpen size={24} className="color-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-app-primary font-mono">
            Help & Resources
          </h2>
          <p className="text-xs text-app-secondary-60 font-mono">
            Access tutorials and documentation
          </p>
        </div>
      </div>

      {/* Tutorial Card */}
      <button
        onClick={() => setShowTutorial(true)}
        className="w-full group relative overflow-hidden p-6 rounded-xl bg-gradient-to-br from-app-tertiary to-app-quaternary border border-app-primary-20 hover:border-app-primary-color/40 transition-all duration-300 text-left"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-app-primary-color/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-app-primary-color/20 border border-app-primary-color/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen size={28} className="color-primary" />
            </div>
            <div>
              <div className="text-base font-bold text-app-primary font-mono group-hover:color-primary transition-colors">
                Onboarding Tutorial
              </div>
              <div className="text-xs text-app-secondary-60 font-mono mt-1">
                Take a guided tour of the application features
              </div>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-app-primary-color/20 border border-app-primary-color/30 flex items-center justify-center group-hover:bg-app-primary-color transition-all">
            <ChevronRight
              size={20}
              className="color-primary group-hover:text-black transition-colors"
            />
          </div>
        </div>
      </button>
    </div>
  );

  const renderTabContent = (): JSX.Element | null => {
    switch (activeTab) {
      case "network":
        return renderNetworkTab();
      case "trading":
        return renderTradingTab();
      case "execution":
        return renderExecutionTab();
      case "help":
        return renderHelpTab();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-app-primary text-app-tertiary flex flex-col">
      <HorizontalHeader />

      <div className="relative flex-1 overflow-y-auto overflow-x-hidden w-full pt-16 bg-app-primary">
        {/* Background */}
        <PageBackground />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="mb-6 flex flex-wrap items-center gap-4 justify-between pb-4 border-b border-app-primary-20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-app-primary-color/30 to-app-primary-color/10 border border-app-primary-color/40 flex items-center justify-center shadow-[0_0_30px_rgba(2,179,109,0.2)]">
                <Settings size={28} className="color-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-app-primary font-mono tracking-wide">
                  SETTINGS
                </h1>
                <p className="text-xs text-app-secondary-60 font-mono">
                  Configure your trading environment
                </p>
              </div>
            </div>

            {/* Quick Status */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-6 px-4 py-2 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
                <div className="text-center">
                  <div className="text-xs font-mono color-primary font-bold">
                    {config.bundleMode?.toUpperCase() || "BATCH"}
                  </div>
                  <div className="text-[10px] text-app-secondary-40 font-mono">
                    MODE
                  </div>
                </div>
                <div className="w-px h-8 bg-app-primary-20" />
                <div className="text-center">
                  <div className="text-xs font-mono color-primary font-bold">
                    {currentRegion}
                  </div>
                  <div className="text-[10px] text-app-secondary-40 font-mono">
                    REGION
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Tabs */}
            <div className="lg:w-56 flex-shrink-0">
              <div className="lg:sticky lg:top-6 space-y-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-sm transition-all duration-200 group ${
                      activeTab === tab.id
                        ? "bg-app-primary-color text-black font-bold shadow-[0_0_20px_rgba(2,179,109,0.3)]"
                        : "bg-app-tertiary/50 hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary-40 text-app-primary"
                    }`}
                  >
                    <span
                      className={`${activeTab === tab.id ? "text-black" : "color-primary group-hover:text-app-primary-light"} transition-colors`}
                    >
                      {tab.icon}
                    </span>
                    <div className="text-left">
                      <div className="font-bold">{tab.label}</div>
                      <div
                        className={`text-[10px] ${activeTab === tab.id ? "text-black/60" : "text-app-secondary-40"}`}
                      >
                        {tab.description}
                      </div>
                    </div>
                    {activeTab === tab.id && (
                      <ChevronRight size={16} className="ml-auto text-black" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              <div className="bg-app-secondary/80 backdrop-blur-sm rounded-2xl border border-app-primary-20 p-6 shadow-xl">
                {renderTabContent()}
              </div>

              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveAndClose}
                  className="group relative px-8 py-3 bg-app-primary-color hover:bg-app-primary-dark text-black font-bold font-mono tracking-wide rounded-xl shadow-[0_0_20px_rgba(2,179,109,0.4)] hover:shadow-[0_0_30px_rgba(2,179,109,0.6)] flex items-center gap-3 text-sm transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <Save size={18} />
                  <span>SAVE CONFIGURATION</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OnboardingTutorial
        forceShow={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
};
