import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Zap,
  Save,
  Wifi,
  Key,
  Server,
  AlertCircle,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { useAppContext } from "../contexts";
import { useToast } from "../utils/hooks";
import { saveConfigToCookies } from "../utils/storage";
import { HorizontalHeader } from "../components/HorizontalHeader";
import type { ServerInfo } from "../utils/types";
import { RPCEndpointManager } from "../components/RPCEndpointManager";
import { createDefaultEndpoints, type RPCEndpoint } from "../utils/rpcManager";
import { OnboardingTutorial } from "../components/OnboardingTutorial";

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const { config, setConfig } = useAppContext();

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

    const handleServerUpdate = (): void => {
      updateServerData();
    };

    window.addEventListener("serverChanged", handleServerUpdate);

    return (): void => {
      window.removeEventListener("serverChanged", handleServerUpdate);
    };
  }, [updateServerData]);

  const handleServerSwitch = async (serverId: string): Promise<void> => {
    if (!window.switchServer) {
      console.error("Server switching not available");
      return;
    }

    setIsChangingServer(true);

    try {
      const success = await window.switchServer(serverId);
      if (success) {
        const server = availableServers.find((s): boolean => s.id === serverId);
        if (server) {
          setCurrentRegion(server.region);
          showToast(`Switched to ${server.name} (${server.region})`, "success");
        }
      } else {
        console.error("Failed to switch server");
        showToast("Failed to switch trading server", "error");
      }
    } catch (error) {
      console.error("Error switching server:", error);
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

  return (
    <div className="h-screen bg-app-primary text-app-tertiary flex flex-col overflow-hidden">
      {/* Horizontal Header */}
      <HorizontalHeader />

      {/* Main Content - full width with top padding */}
      <div className="relative flex-1 overflow-hidden w-full pt-16 bg-app-primary flex flex-col">
        {/* Background effects */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-app-primary opacity-90">
            <div className="absolute inset-0 bg-gradient-to-b from-app-primary-05 to-transparent"></div>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(2, 179, 109, 0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(2, 179, 109, 0.05) 1px, transparent 1px)
                `,
                backgroundSize: "20px 20px",
              }}
            ></div>
          </div>
        </div>

        {/* Content container - scrollable area */}
        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header Title */}
            <div className="mb-6 flex items-center justify-between border-b border-app-primary-20 pb-4">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-bold text-app-primary font-mono tracking-wide">
                    SYSTEM SETTINGS
                  </h1>
                  <p className="text-xs text-app-secondary-80 font-mono">
                    Configure trading engine parameters
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Network Configuration Section */}
              <div className="bg-app-secondary border border-app-primary-20 rounded-lg p-5 sm:p-6 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Globe size={80} />
                </div>

                <h3 className="text-sm sm:text-base font-bold text-app-primary font-mono mb-2 flex items-center gap-2 uppercase tracking-wider">
                  <Globe size={16} className="color-primary" />
                  Network RPC
                </h3>
                <p className="text-[10px] text-app-secondary-80 font-mono mb-4">
                  Configure RPC endpoints with custom weights (0-100%). Higher
                  weights increase selection probability. Total must equal 100%.
                </p>

                <div className="space-y-4 relative z-10">
                  <RPCEndpointManager
                    endpoints={
                      config.rpcEndpoints
                        ? (JSON.parse(config.rpcEndpoints) as RPCEndpoint[])
                        : createDefaultEndpoints()
                    }
                    onChange={(endpoints) => {
                      handleConfigChange(
                        "rpcEndpoints",
                        JSON.stringify(endpoints),
                      );
                    }}
                  />
                </div>
              </div>

              {/* Trading Server Configuration Section */}
              <div className="bg-app-secondary border border-app-primary-20 rounded-lg p-5 sm:p-6 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Server size={80} />
                </div>

                <h3 className="text-sm sm:text-base font-bold text-app-primary font-mono mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <Server size={16} className="color-primary" />
                  Trading Server
                </h3>

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between p-3 bg-app-tertiary border border-app-primary-20 rounded-lg gap-4 transition-colors hover:border-app-primary-40">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-app-primary font-mono">
                        Self-Hosted Mode
                      </div>
                      <div className="text-xs text-app-secondary-80 font-mono mt-0.5">
                        Use your own local or remote trading server instance
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleConfigChange(
                          "tradingServerEnabled",
                          config.tradingServerEnabled === "true"
                            ? "false"
                            : "true",
                        )
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-manipulation flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-primary-color focus:ring-offset-app-secondary ${
                        config.tradingServerEnabled === "true"
                          ? "bg-app-primary-color"
                          : "bg-app-quaternary border border-app-primary-30"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          config.tradingServerEnabled === "true"
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {config.tradingServerEnabled === "true" ? (
                    <div className="animate-fade-in-down">
                      <label className="block text-xs text-app-secondary-80 font-mono mb-2 uppercase tracking-wider">
                        Trading Server URL
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={
                            config.tradingServerUrl || "http://localhost:4444"
                          }
                          onChange={(e) =>
                            handleConfigChange(
                              "tradingServerUrl",
                              e.target.value,
                            )
                          }
                          className="w-full bg-app-quaternary border border-app-primary-30 rounded px-3 py-2.5 text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono"
                          placeholder="http://localhost:4444"
                        />
                        <div className="absolute right-3 top-2.5">
                          <Wifi size={16} className="text-app-secondary-60" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-app-secondary-60 font-mono">
                        <AlertCircle size={10} />
                        Ensure your local server is running and accessible
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 animate-fade-in-down">
                      <label className="block text-xs text-app-secondary-80 font-mono mb-2 uppercase tracking-wider">
                        Regional Server Selection
                      </label>
                      <div className="bg-app-tertiary border border-app-primary-20 rounded-lg p-1">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-app-primary-20 mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${isLoadingServers ? "bg-yellow-500 animate-pulse" : "bg-app-primary-color"}`}
                            ></div>
                            <span className="text-xs font-mono text-app-primary font-bold">
                              {isLoadingServers
                                ? "DETECTING..."
                                : `REGION: ${currentRegion}`}
                            </span>
                          </div>
                          {isChangingServer && (
                            <div className="flex items-center gap-2">
                              <RefreshCw
                                size={12}
                                className="animate-spin color-primary"
                              />
                              <span className="text-[10px] font-mono color-primary">
                                SWITCHING
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-1 p-1 custom-scrollbar">
                          {isLoadingServers ? (
                            <div className="p-4 text-center text-xs text-app-secondary-60 font-mono italic">
                              Checking server availability...
                            </div>
                          ) : availableServers.length > 0 ? (
                            availableServers.map((server) => (
                              <button
                                key={server.id}
                                type="button"
                                onClick={(): void =>
                                  void handleServerSwitch(server.id)
                                }
                                disabled={isChangingServer}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-all duration-200 group ${
                                  server.region === currentRegion
                                    ? "bg-app-primary-color/10 border border-app-primary-color/40"
                                    : "bg-transparent hover:bg-app-quaternary border border-transparent hover:border-app-primary-20"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">{server.flag}</span>
                                  <div>
                                    <div
                                      className={`text-xs font-mono font-bold ${server.region === currentRegion ? "color-primary" : "text-app-primary"}`}
                                    >
                                      {server.name}
                                    </div>
                                    <div className="text-[10px] font-mono text-app-secondary-60 truncate max-w-[150px] sm:max-w-[200px]">
                                      {server.url}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {server.ping && server.ping < Infinity && (
                                    <div
                                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border border-transparent ${getPingBg(server.ping)} ${getPingColor(server.ping)}`}
                                    >
                                      {server.ping}ms
                                    </div>
                                  )}
                                  {server.region === currentRegion && (
                                    <div className="w-1.5 h-1.5 bg-app-primary-color rounded-full shadow-[0_0_5px_rgba(2,179,109,0.8)]" />
                                  )}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-xs text-error font-mono">
                              No servers reachable. Check connection.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* API Configuration Section */}
              <div className="bg-app-secondary border border-app-primary-20 rounded-lg p-5 sm:p-6 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Key size={80} />
                </div>

                <h3 className="text-sm sm:text-base font-bold text-app-primary font-mono mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <Key size={16} className="color-primary" />
                  API Access
                </h3>

                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="block text-xs text-app-secondary-80 font-mono mb-2 uppercase tracking-wider">
                      Data Stream Key
                    </label>
                    <input
                      type="password"
                      value={config.streamApiKey || ""}
                      onChange={(e) =>
                        handleConfigChange("streamApiKey", e.target.value)
                      }
                      className="w-full bg-app-quaternary border border-app-primary-30 rounded px-3 py-2.5 text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono placeholder-app-secondary-40"
                      placeholder="sk_live_xxxxxxxxxxxxxxxxxxxxx"
                    />
                    <div className="text-[10px] text-app-secondary-60 font-mono mt-1.5 flex justify-between">
                      <span>
                        Required for real-time market data websockets.
                      </span>
                      <a
                        href="https://my.raze.bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="color-primary hover:text-app-primary-light hover:underline transition-colors"
                      >
                        Get API Key →
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trading Engine Configuration Section */}
              <div className="bg-app-secondary border border-app-primary-20 rounded-lg p-5 sm:p-6 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap size={80} />
                </div>

                <h3 className="text-sm sm:text-base font-bold text-app-primary font-mono mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <Zap size={16} className="color-primary" />
                  Execution Engine
                </h3>

                <div className="space-y-5 relative z-10">
                  <div>
                    <label className="block text-xs text-app-secondary-80 font-mono mb-2 uppercase tracking-wider">
                      Bundle Strategy
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        {
                          value: "single",
                          label: "Single Thread",
                          icon: "🔄",
                          description: "Sequential execution. Safest, slowest.",
                        },
                        {
                          value: "batch",
                          label: "Batch Mode",
                          icon: "📦",
                          description: "Process 5 wallets per block.",
                        },
                        {
                          value: "all-in-one",
                          label: "All-In-One",
                          icon: "🚀",
                          description: "Concurrent execution. Maximum speed.",
                        },
                      ].map((option) => (
                        <div
                          key={option.value}
                          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 touch-manipulation group/item ${
                            config.bundleMode === option.value
                              ? "bg-app-primary-color/10 border-app-primary-color/50 shadow-[inset_0_0_10px_rgba(2,179,109,0.1)]"
                              : "bg-app-quaternary border-app-primary-20 hover:border-app-primary-40 hover:bg-app-tertiary"
                          }`}
                          onClick={() =>
                            handleConfigChange("bundleMode", option.value)
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="text-xl filter grayscale group-hover/item:grayscale-0 transition-all">
                                {option.icon}
                              </span>
                              <div className="min-w-0">
                                <div
                                  className={`text-sm font-bold font-mono ${config.bundleMode === option.value ? "color-primary" : "text-app-primary"}`}
                                >
                                  {option.label}
                                </div>
                                <div className="text-[10px] text-app-secondary-80 font-mono truncate">
                                  {option.description}
                                </div>
                              </div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
                                config.bundleMode === option.value
                                  ? "border-app-primary-color bg-app-primary-color"
                                  : "border-app-primary-40 bg-transparent"
                              }`}
                            >
                              {config.bundleMode === option.value && (
                                <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-app-secondary-80 font-mono mb-2 uppercase tracking-wider">
                        Single Delay (ms)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="5000"
                        step="50"
                        value={config.singleDelay || "200"}
                        onChange={(e) =>
                          handleConfigChange("singleDelay", e.target.value)
                        }
                        className="w-full bg-app-quaternary border border-app-primary-30 rounded px-3 py-2.5 text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-app-secondary-80 font-mono mb-2 uppercase tracking-wider">
                        Batch Delay (ms)
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="10000"
                        step="100"
                        value={config.batchDelay || "1000"}
                        onChange={(e) =>
                          handleConfigChange("batchDelay", e.target.value)
                        }
                        className="w-full bg-app-quaternary border border-app-primary-30 rounded px-3 py-2.5 text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-app-primary-20 pt-4">
                    <div>
                      <label className="block text-xs text-app-secondary-80 font-mono mb-2 uppercase tracking-wider">
                        Priority Fee (SOL)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={config.transactionFee}
                          onChange={(e) =>
                            handleConfigChange("transactionFee", e.target.value)
                          }
                          className="w-full bg-app-quaternary border border-app-primary-30 rounded px-3 py-2.5 text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-app-secondary-60 font-mono">
                          SOL
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-app-secondary-80 font-mono mb-2 uppercase tracking-wider">
                        Max Slippage (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          value={
                            config.slippageBps
                              ? (
                                  parseFloat(config.slippageBps) / 100
                                ).toString()
                              : "99"
                          }
                          onChange={(e) => {
                            const percentage = parseFloat(e.target.value) || 99;
                            const bps = Math.round(percentage * 100).toString();
                            handleConfigChange("slippageBps", bps);
                          }}
                          className="w-full bg-app-quaternary border border-app-primary-30 rounded px-3 py-2.5 text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-app-secondary-60 font-mono">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Refresh Configuration Section */}
              <div className="bg-app-secondary border border-app-primary-20 rounded-lg p-5 sm:p-6 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <RefreshCw size={80} />
                </div>

                <h3 className="text-sm sm:text-base font-bold text-app-primary font-mono mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <RefreshCw size={16} className="color-primary" />
                  Balance Refresh
                </h3>

                <div className="space-y-5 relative z-10">
                  <div>
                    <label className="block text-xs text-app-secondary-80 font-mono mb-2 uppercase tracking-wider">
                      Refresh Strategy
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        {
                          value: "sequential",
                          label: "One at a Time",
                          icon: "🔄",
                          description:
                            "Safest option. Refreshes wallets sequentially.",
                        },
                        {
                          value: "batch",
                          label: "Batch Mode",
                          icon: "📦",
                          description:
                            "Balanced. Processes wallets in configurable batches.",
                        },
                        {
                          value: "parallel",
                          label: "All at Once",
                          icon: "⚡",
                          description:
                            "Fastest. May hit RPC rate limits with many wallets.",
                        },
                      ].map((option) => (
                        <div
                          key={option.value}
                          className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 touch-manipulation group/item ${
                            (config.balanceRefreshStrategy || "batch") ===
                            option.value
                              ? "bg-app-primary-color/10 border-app-primary-color/50 shadow-[inset_0_0_10px_rgba(2,179,109,0.1)]"
                              : "bg-app-quaternary border-app-primary-20 hover:border-app-primary-40 hover:bg-app-tertiary"
                          }`}
                          onClick={() =>
                            handleConfigChange(
                              "balanceRefreshStrategy",
                              option.value,
                            )
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="text-xl filter grayscale group-hover/item:grayscale-0 transition-all">
                                {option.icon}
                              </span>
                              <div className="min-w-0">
                                <div
                                  className={`text-sm font-bold font-mono ${(config.balanceRefreshStrategy || "batch") === option.value ? "color-primary" : "text-app-primary"}`}
                                >
                                  {option.label}
                                </div>
                                <div className="text-[10px] text-app-secondary-80 font-mono truncate">
                                  {option.description}
                                </div>
                              </div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
                                (config.balanceRefreshStrategy || "batch") ===
                                option.value
                                  ? "border-app-primary-color bg-app-primary-color"
                                  : "border-app-primary-40 bg-transparent"
                              }`}
                            >
                              {(config.balanceRefreshStrategy || "batch") ===
                                option.value && (
                                <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-app-primary-20 pt-4">
                    <div>
                      <label className="block text-xs text-app-secondary-80 font-mono mb-2 uppercase tracking-wider">
                        Batch Size
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        step="1"
                        value={config.balanceRefreshBatchSize || "5"}
                        onChange={(e) =>
                          handleConfigChange(
                            "balanceRefreshBatchSize",
                            e.target.value,
                          )
                        }
                        disabled={
                          (config.balanceRefreshStrategy || "batch") !== "batch"
                        }
                        className={`w-full bg-app-quaternary border border-app-primary-30 rounded px-3 py-2.5 text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono ${(config.balanceRefreshStrategy || "batch") !== "batch" ? "opacity-50 cursor-not-allowed" : ""}`}
                      />
                      <div className="text-[10px] text-app-secondary-60 font-mono mt-1">
                        Wallets per batch (batch mode only)
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-app-secondary-80 font-mono mb-2 uppercase tracking-wider">
                        Delay (ms)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="5000"
                        step="10"
                        value={config.balanceRefreshDelay || "50"}
                        onChange={(e) =>
                          handleConfigChange(
                            "balanceRefreshDelay",
                            e.target.value,
                          )
                        }
                        disabled={
                          (config.balanceRefreshStrategy || "batch") ===
                          "parallel"
                        }
                        className={`w-full bg-app-quaternary border border-app-primary-30 rounded px-3 py-2.5 text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono ${(config.balanceRefreshStrategy || "batch") === "parallel" ? "opacity-50 cursor-not-allowed" : ""}`}
                      />
                      <div className="text-[10px] text-app-secondary-60 font-mono mt-1">
                        Delay between operations
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-app-tertiary border border-app-primary-10 rounded-lg">
                    <div className="flex items-start gap-2 text-[10px] text-app-secondary-80 font-mono">
                      <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="color-primary">Tip:</strong> Use
                        &quot;Batch Mode&quot; for optimal balance between speed
                        and reliability. &quot;All at Once&quot; is faster but
                        may fail with many wallets due to RPC rate limits.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Help & Tutorial Section */}
              <div className="bg-app-secondary border border-app-primary-20 rounded-lg p-5 sm:p-6 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BookOpen size={80} />
                </div>

                <h3 className="text-sm sm:text-base font-bold text-app-primary font-mono mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <BookOpen size={16} className="color-primary" />
                  Help & Tutorial
                </h3>

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between p-3 bg-app-tertiary border border-app-primary-20 rounded-lg gap-4 transition-colors hover:border-app-primary-40">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-app-primary font-mono">
                        Onboarding Tutorial
                      </div>
                      <div className="text-xs text-app-secondary-80 font-mono mt-0.5">
                        Take a guided tour of the application features
                      </div>
                    </div>
                    <button
                      onClick={() => setShowTutorial(true)}
                      className="px-4 py-2 bg-app-primary-color/20 border border-app-primary-color/40 text-app-primary-color rounded-lg font-mono text-xs font-bold hover:bg-app-primary-color/30 hover:border-app-primary-color/60 transition-all flex items-center gap-2"
                    >
                      <BookOpen size={14} />
                      START TUTORIAL
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="sticky bottom-0 mt-8 pt-4 pb-4 bg-app-primary/95 backdrop-blur-sm border-t border-app-primary-20 flex flex-col sm:flex-row justify-end gap-3 z-20">
              <button
                onClick={handleSaveAndClose}
                className="px-8 py-3 bg-app-primary-color hover:bg-app-primary-dark text-black font-bold font-mono tracking-wide rounded shadow-[0_0_15px_rgba(2,179,109,0.4)] hover:shadow-[0_0_20px_rgba(2,179,109,0.6)] flex items-center justify-center gap-2 text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Save size={16} />
                SAVE CONFIGURATION
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Tutorial */}
      <OnboardingTutorial
        forceShow={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
};
