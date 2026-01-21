/**
 * AutomatePage - Unified Trading Tools Page
 *
 * Combines Sniper Bot, Copy Trade, and Automate into a single interface
 * with real-time WebSocket connections and trade execution.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Zap,
  Users,
  Bot,
  Activity,
  Key,
  AlertCircle,
  Rocket,
  Clock,
  CheckCircle,
  XCircle,
  Crosshair,
  RefreshCw,
} from "lucide-react";
import { HorizontalHeader } from "../components/HorizontalHeader";
import { useAppContext } from "../contexts";
import { formatAddress } from "../utils/formatting";
import { executeTrade } from "../utils/trading";
import type { TradingConfig } from "../utils/trading";
import type { WalletType } from "../utils/types";

// Import unified components
import { TradingTools } from "../components/tools";
import type {
  ToolType,
  SniperProfile,
  CopyTradeProfile,
  TradingStrategy,
  SniperEvent,
  DeployEvent,
  MigrationEvent,
  CopyTradeData,
  WalletType as UnifiedWalletType,
} from "../components/tools/automate/types";
import {
  loadSniperProfiles,
  loadCopyTradeProfiles,
  loadStrategies,
  updateSniperProfile,
  updateCopyTradeProfile,
} from "../components/tools/automate/storage";

// Import WebSocket managers
import {
  SniperBotWebSocketManager,
  CopyTradeWebSocketManager,
} from "../utils/websocket";
import type { MultiTokenWebSocketManager } from "../utils/websocket";

// Unified styles are handled by app's global CSS

// ============================================================================
// Types
// ============================================================================

interface ExecutionLogEntry {
  id: string;
  type: ToolType;
  profileName: string;
  action: string;
  amount: number;
  token?: string;
  success: boolean;
  error?: string;
  timestamp: number;
}

interface RecentEvent {
  id: string;
  type: "deploy" | "migration" | "trade";
  data: SniperEvent | CopyTradeData;
  matchedProfiles: string[];
  executed: boolean;
  timestamp: number;
}

// ============================================================================
// Component
// ============================================================================

export const AutomatePage: React.FC = () => {
  // Get shared state from context
  const {
    wallets: contextWallets,
    config: contextConfig,
    baseCurrencyBalances,
    showToast: contextShowToast,
  } = useAppContext();

  // WebSocket refs
  const sniperWsRef = useRef<SniperBotWebSocketManager | null>(null);
  const copyTradeWsRef = useRef<CopyTradeWebSocketManager | null>(null);
  const automateWsRef = useRef<MultiTokenWebSocketManager | null>(null);

  // Connection states
  const [sniperConnected, setSniperConnected] = useState(false);
  const [copyTradeConnected, setCopyTradeConnected] = useState(false);
  const [automateConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  // Profile states (for execution logic)
  const [sniperProfiles, setSniperProfiles] = useState<SniperProfile[]>([]);
  const [copyTradeProfiles, setCopyTradeProfiles] = useState<
    CopyTradeProfile[]
  >([]);
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);

  // Execution logs and events
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);

  // Selected wallets for trading (uses first available wallet by default)
  const selectedWalletAddresses = useMemo(() => {
    return contextWallets.map((w) => w.address);
  }, [contextWallets]);

  // Stats
  const [stats, setStats] = useState({
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    activeProfiles: 0,
  });

  // ========== Load Profiles ==========
  useEffect(() => {
    const loadAll = (): void => {
      setSniperProfiles(loadSniperProfiles());
      setCopyTradeProfiles(loadCopyTradeProfiles());
      setStrategies(loadStrategies());
    };
    loadAll();

    // Refresh every 5 seconds to sync with TradingTools component
    const interval = setInterval(loadAll, 5000);
    return () => clearInterval(interval);
  }, []);

  // ========== Calculate Stats ==========
  useEffect(() => {
    const activeSniper = sniperProfiles.filter((p) => p.isActive).length;
    const activeCopyTrade = copyTradeProfiles.filter((p) => p.isActive).length;
    const activeAutomate = strategies.filter((s) => s.isActive).length;

    const successful = executionLogs.filter((l) => l.success).length;
    const failed = executionLogs.filter((l) => !l.success).length;

    setStats({
      totalExecutions: executionLogs.length,
      successfulExecutions: successful,
      failedExecutions: failed,
      activeProfiles: activeSniper + activeCopyTrade + activeAutomate,
    });
  }, [sniperProfiles, copyTradeProfiles, strategies, executionLogs]);

  // ========== Convert wallets for TradingTools ==========
  const availableWallets: UnifiedWalletType[] = useMemo(() => {
    return contextWallets.map((w) => {
      const walletName = (w as { name?: string }).name;
      return {
        address: w.address,
        privateKey: w.privateKey,
        name: walletName || formatAddress(w.address),
        balance: baseCurrencyBalances.get(w.address) ?? 0,
      };
    });
  }, [contextWallets, baseCurrencyBalances]);

  // ========== Execute Trade Helper ==========
  const executeTradeAction = useCallback(
    async (
      actionType: "buy" | "sell",
      tokenAddress: string,
      amount: number,
      walletAddresses: string[],
      profileName: string,
      toolType: ToolType,
    ): Promise<boolean> => {
      const walletsToUse = contextWallets.filter((w) =>
        walletAddresses.includes(w.address),
      );

      if (walletsToUse.length === 0) {
        contextShowToast?.("No wallets available for trading", "error");
        return false;
      }

      const walletsForTrade: WalletType[] = walletsToUse.map((w, index) => ({
        id: index,
        address: w.address,
        privateKey: w.privateKey || "",
        isActive: true,
      }));

      try {
        const tradingConfig: TradingConfig = {
          tokenAddress,
          ...(actionType === "buy"
            ? { solAmount: amount }
            : { sellPercent: amount }),
        };

        const selectedDex = contextConfig?.selectedDex || "raydium";

        await executeTrade(
          selectedDex,
          walletsForTrade,
          tradingConfig,
          actionType === "buy",
          baseCurrencyBalances,
        );

        // Log success
        const logEntry: ExecutionLogEntry = {
          id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: toolType,
          profileName,
          action: actionType.toUpperCase(),
          amount,
          token: tokenAddress,
          success: true,
          timestamp: Date.now(),
        };
        setExecutionLogs((prev) => [logEntry, ...prev].slice(0, 100));

        contextShowToast?.(
          `${actionType.toUpperCase()} executed for ${profileName}`,
          "success",
        );
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Log failure
        const logEntry: ExecutionLogEntry = {
          id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: toolType,
          profileName,
          action: actionType.toUpperCase(),
          amount,
          token: tokenAddress,
          success: false,
          error: errorMessage,
          timestamp: Date.now(),
        };
        setExecutionLogs((prev) => [logEntry, ...prev].slice(0, 100));

        console.error(`Trade execution error:`, errorMessage);
        contextShowToast?.(`Trade failed: ${errorMessage}`, "error");
        return false;
      }
    },
    [contextWallets, contextConfig, baseCurrencyBalances, contextShowToast],
  );

  // ========== Sniper Bot Logic ==========
  const handleSniperEvent = useCallback(
    async (event: SniperEvent) => {
      // Add to recent events
      const recentEvent: RecentEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: event.type,
        data: event,
        matchedProfiles: [],
        executed: false,
        timestamp: Date.now(),
      };

      // Find matching active profiles
      const currentProfiles = loadSniperProfiles();
      const matchingProfiles = currentProfiles.filter((profile) => {
        if (!profile.isActive) return false;
        if (profile.eventType !== "both" && profile.eventType !== event.type)
          return false;

        // Check cooldown
        if (profile.lastExecuted) {
          let cooldownMs = profile.cooldown;
          if (profile.cooldownUnit === "seconds") cooldownMs *= 1000;
          if (profile.cooldownUnit === "minutes") cooldownMs *= 60000;
          if (Date.now() - profile.lastExecuted < cooldownMs) return false;
        }

        // Check max executions
        if (
          profile.maxExecutions &&
          profile.executionCount >= profile.maxExecutions
        )
          return false;

        // Check filters (if any)
        if (profile.filters.length > 0) {
          const enabledFilters = profile.filters.filter((f) => f.enabled);
          if (enabledFilters.length > 0) {
            const allMatch = enabledFilters.every((filter) => {
              if (filter.platform && event.data.platform !== filter.platform)
                return false;
              if (filter.mint && event.data.mint !== filter.mint) return false;
              if (filter.signer && event.type === "deploy") {
                if (event.data.signer !== filter.signer) return false;
              }
              return true;
            });
            if (!allMatch) return false;
          }
        }

        return true;
      });

      recentEvent.matchedProfiles = matchingProfiles.map((p) => p.id);
      setRecentEvents((prev) => [recentEvent, ...prev].slice(0, 50));

      // Execute for matching profiles
      for (const profile of matchingProfiles) {
        // Calculate buy amount
        let solAmount = profile.buyAmount;
        if (
          profile.buyAmountType === "percentage" &&
          selectedWalletAddresses.length > 0
        ) {
          const firstWalletBalance =
            baseCurrencyBalances.get(selectedWalletAddresses[0]) ?? 0;
          solAmount = (firstWalletBalance * profile.buyAmount) / 100;
        }

        const success = await executeTradeAction(
          "buy",
          event.data.mint,
          solAmount,
          selectedWalletAddresses,
          profile.name,
          "sniper",
        );

        if (success) {
          recentEvent.executed = true;
          // Update profile
          updateSniperProfile({
            ...profile,
            executionCount: profile.executionCount + 1,
            lastExecuted: Date.now(),
          });
          setSniperProfiles(loadSniperProfiles());
        }
      }

      // Update event in list
      setRecentEvents((prev) =>
        prev.map((e) => (e.id === recentEvent.id ? recentEvent : e)),
      );
    },
    [selectedWalletAddresses, baseCurrencyBalances, executeTradeAction],
  );

  // ========== Copy Trade Logic ==========
  const handleCopyTrade = useCallback(
    async (trade: CopyTradeData) => {
      // Add to recent events
      const recentEvent: RecentEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "trade",
        data: trade,
        matchedProfiles: [],
        executed: false,
        timestamp: Date.now(),
      };

      // Find matching active profiles
      const currentProfiles = loadCopyTradeProfiles();
      const matchingProfiles = currentProfiles.filter((profile) => {
        if (!profile.isActive) return false;
        if (!profile.walletAddresses.includes(trade.signerAddress))
          return false;

        // Check token filtering
        if (profile.tokenFilterMode === "specific") {
          if (!profile.specificTokens.includes(trade.tokenMint)) return false;
        }
        if (profile.blacklistedTokens.includes(trade.tokenMint)) return false;

        // Check cooldown
        if (profile.lastExecuted) {
          let cooldownMs = profile.cooldown;
          if (profile.cooldownUnit === "seconds") cooldownMs *= 1000;
          if (profile.cooldownUnit === "minutes") cooldownMs *= 60000;
          if (Date.now() - profile.lastExecuted < cooldownMs) return false;
        }

        // Check max executions
        if (
          profile.maxExecutions &&
          profile.executionCount >= profile.maxExecutions
        )
          return false;

        return true;
      });

      recentEvent.matchedProfiles = matchingProfiles.map((p) => p.id);
      setRecentEvents((prev) => [recentEvent, ...prev].slice(0, 50));

      // Execute for matching profiles
      for (const profile of matchingProfiles) {
        let actionType: "buy" | "sell" = trade.type;
        let solAmount = trade.solAmount;

        if (profile.mode === "simple" && profile.simpleConfig) {
          if (profile.simpleConfig.mirrorTradeType) {
            actionType = trade.type;
          }
          solAmount = trade.solAmount * profile.simpleConfig.amountMultiplier;
        }

        const success = await executeTradeAction(
          actionType,
          trade.tokenMint,
          solAmount,
          selectedWalletAddresses,
          profile.name,
          "copytrade",
        );

        if (success) {
          recentEvent.executed = true;
          // Update profile
          updateCopyTradeProfile({
            ...profile,
            executionCount: profile.executionCount + 1,
            lastExecuted: Date.now(),
          });
          setCopyTradeProfiles(loadCopyTradeProfiles());
        }
      }

      // Update event in list
      setRecentEvents((prev) =>
        prev.map((e) => (e.id === recentEvent.id ? recentEvent : e)),
      );
    },
    [selectedWalletAddresses, executeTradeAction],
  );

  // ========== Initialize Sniper WebSocket ==========
  useEffect(() => {
    const activeSniper = sniperProfiles.some((p) => p.isActive);

    if (!activeSniper) {
      if (sniperWsRef.current) {
        sniperWsRef.current.disconnect();
        sniperWsRef.current = null;
        setSniperConnected(false);
      }
      return;
    }

    if (!sniperWsRef.current) {
      sniperWsRef.current = new SniperBotWebSocketManager();
    }

    sniperWsRef.current.connect({
      apiKey: contextConfig?.streamApiKey || undefined,
      onDeploy: (event: DeployEvent) => void handleSniperEvent(event),
      onMigration: (event: MigrationEvent) => void handleSniperEvent(event),
      onConnect: () => {
        setSniperConnected(true);
        setWsError(null);
      },
      onDisconnect: () => setSniperConnected(false),
      onError: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        setWsError(msg);
        setSniperConnected(false);
      },
    });

    return () => {
      // Don't disconnect on cleanup, let it stay connected
    };
  }, [sniperProfiles, contextConfig?.streamApiKey, handleSniperEvent]);

  // ========== Initialize CopyTrade WebSocket ==========
  useEffect(() => {
    const activeCopyTrade = copyTradeProfiles.filter((p) => p.isActive);
    const walletsToMonitor = [
      ...new Set(activeCopyTrade.flatMap((p) => p.walletAddresses)),
    ];

    if (walletsToMonitor.length === 0) {
      if (copyTradeWsRef.current) {
        copyTradeWsRef.current.disconnect();
        copyTradeWsRef.current = null;
        setCopyTradeConnected(false);
      }
      return;
    }

    if (!copyTradeWsRef.current) {
      copyTradeWsRef.current = new CopyTradeWebSocketManager();
    }

    copyTradeWsRef.current.connect({
      signers: walletsToMonitor,
      apiKey: contextConfig?.streamApiKey || undefined,
      onTrade: (trade: CopyTradeData) => void handleCopyTrade(trade),
      onConnect: () => {
        setCopyTradeConnected(true);
        setWsError(null);
      },
      onDisconnect: () => setCopyTradeConnected(false),
      onError: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        setWsError(msg);
        setCopyTradeConnected(false);
      },
    });

    return () => {
      // Don't disconnect on cleanup
    };
  }, [copyTradeProfiles, contextConfig?.streamApiKey, handleCopyTrade]);

  // ========== Cleanup on unmount ==========
  useEffect(() => {
    const sniperWs = sniperWsRef.current;
    const copyTradeWs = copyTradeWsRef.current;
    const automateWs = automateWsRef.current;
    return () => {
      sniperWs?.disconnect();
      copyTradeWs?.disconnect();
      automateWs?.disconnect();
    };
  }, []);

  // ========== Handle Execute from TradingTools ==========
  const handleExecute = useCallback(
    (_type: ToolType, _profileId: string, _action: unknown) => {
      // This is called when user manually triggers an action from TradingTools
      // The automatic execution is handled by the WebSocket handlers above
    },
    [],
  );

  // ========== Connection Status ==========
  const isAnyConnected =
    sniperConnected || copyTradeConnected || automateConnected;
  const hasActiveProfiles = stats.activeProfiles > 0;

  return (
    <div className="min-h-screen bg-app-primary text-app-tertiary flex flex-col">
      {/* Horizontal Header */}
      <HorizontalHeader />

      {/* Main Content */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden w-full pt-16 bg-app-primary">
        {/* Background effects */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-app-primary opacity-90">
            <div className="absolute inset-0 bg-gradient-to-b from-app-primary-05 to-transparent"></div>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(rgba(2, 179, 109, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(2, 179, 109, 0.05) 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
              }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-4 md:p-6">
          {/* Page Header */}
          <div className="mb-6 flex flex-wrap items-start gap-3 justify-between border-b border-app-primary-20 pb-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-app-primary font-mono tracking-wide">
                  AUTOMATE
                </h1>
                <p className="text-xs text-app-secondary-80 font-mono">
                  Unified trading tools - Sniper, Copy Trade, and Strategy
                  automation
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-6 text-xs sm:text-sm font-mono">
                <div className="text-center">
                  <div className="text-success font-bold">
                    {stats.activeProfiles}
                  </div>
                  <div className="text-app-secondary-80 text-[10px] sm:text-xs">
                    ACTIVE
                  </div>
                </div>
                <div className="text-center">
                  <div className="color-primary font-bold">
                    {stats.totalExecutions}
                  </div>
                  <div className="text-app-secondary-80 text-[10px] sm:text-xs">
                    TOTAL
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-success font-bold">
                    {stats.successfulExecutions}
                  </div>
                  <div className="text-app-secondary-80 text-[10px] sm:text-xs">
                    SUCCESS
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-error-alt font-bold">
                    {stats.failedExecutions}
                  </div>
                  <div className="text-app-secondary-80 text-[10px] sm:text-xs">
                    FAILED
                  </div>
                </div>
              </div>

              {/* Connection Status Badges */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono ${
                    sniperConnected
                      ? "bg-app-primary-10 color-primary border border-app-primary-color/30"
                      : "bg-app-primary-20 text-app-secondary-60 border border-app-primary-40"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                </div>
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono ${
                    copyTradeConnected
                      ? "bg-app-primary-10 color-primary border border-app-primary-color/30"
                      : "bg-app-primary-20 text-app-secondary-60 border border-app-primary-40"
                  }`}
                >
                  <Users className="w-3 h-3" />
                </div>
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono ${
                    automateConnected
                      ? "bg-app-primary-10 color-primary border border-app-primary-color/30"
                      : "bg-app-primary-20 text-app-secondary-60 border border-app-primary-40"
                  }`}
                >
                  <Bot className="w-3 h-3" />
                </div>
              </div>

              {/* Overall Status */}
              {!hasActiveProfiles ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-app-primary-20 border border-app-primary-40 rounded text-app-secondary-60 text-xs font-mono font-bold">
                  <Activity className="w-3 h-3" />
                  IDLE
                </span>
              ) : isAnyConnected ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-success-20 border border-success/30 rounded text-success text-xs font-mono font-bold">
                  <Activity className="w-3 h-3 animate-pulse" />
                  STREAMING
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-warning-20 border border-warning/30 rounded text-warning text-xs font-mono font-bold">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  CONNECTING
                </span>
              )}
            </div>
          </div>

          {/* Alerts */}
          {wsError && (
            <div className="mb-4 p-3 bg-error-alt-20 border border-error-alt rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-error-alt" />
              <span className="font-mono text-sm text-error-alt">
                {wsError}
              </span>
            </div>
          )}

          {!contextConfig?.streamApiKey && (
            <div className="mb-4 p-3 bg-warning-20 border border-warning rounded flex items-center gap-2">
              <Key className="w-4 h-4 text-warning" />
              <span className="font-mono text-sm text-warning">
                No API key configured. Go to Settings to add your streaming API
                key for real-time data.
              </span>
            </div>
          )}

          {/* Main Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Trading Tools - Main Area */}
            <div className="xl:col-span-3">
              <TradingTools
                availableWallets={availableWallets}
                onExecute={handleExecute}
              />
            </div>

            {/* Sidebar - Activity Feed */}
            <div className="xl:col-span-1 space-y-4">
              {/* Recent Events */}
              <div className="bg-app-accent border border-app-primary-40 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-app-primary-40 flex items-center justify-between">
                  <h3 className="font-mono text-sm font-medium color-primary flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-warning" />
                    Recent Events
                  </h3>
                  <span className="text-xs font-mono text-app-secondary-60">
                    {recentEvents.length}
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {recentEvents.length === 0 ? (
                    <div className="p-4 text-center text-app-secondary-60 font-mono text-xs">
                      Waiting for events...
                    </div>
                  ) : (
                    <div className="divide-y divide-app-primary-20">
                      {recentEvents.slice(0, 15).map((event) => (
                        <div
                          key={event.id}
                          className="px-4 py-2.5 hover:bg-app-primary-10 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                event.type === "deploy"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : event.type === "migration"
                                    ? "bg-purple-500/20 text-purple-400"
                                    : "bg-app-primary-10 color-primary"
                              }`}
                            >
                              {event.type.toUpperCase()}
                            </span>
                            {event.executed && (
                              <Crosshair className="w-3 h-3 text-success" />
                            )}
                          </div>
                          <div className="text-xs font-mono text-app-secondary-60 truncate">
                            {event.type === "trade"
                              ? formatAddress(
                                  (event.data as CopyTradeData).tokenMint,
                                )
                              : formatAddress(
                                  (event.data as SniperEvent).data.mint,
                                )}
                          </div>
                          <div className="text-[10px] font-mono text-app-secondary-40">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Log */}
              <div className="bg-app-accent border border-app-primary-40 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-app-primary-40 flex items-center justify-between">
                  <h3 className="font-mono text-sm font-medium color-primary flex items-center gap-2">
                    <Clock className="w-4 h-4 text-success" />
                    Execution Log
                  </h3>
                  <span className="text-xs font-mono text-app-secondary-60">
                    {executionLogs.length}
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {executionLogs.length === 0 ? (
                    <div className="p-4 text-center text-app-secondary-60 font-mono text-xs">
                      No executions yet
                    </div>
                  ) : (
                    <div className="divide-y divide-app-primary-20">
                      {executionLogs.slice(0, 15).map((log) => (
                        <div
                          key={log.id}
                          className={`px-4 py-2.5 ${log.success ? "bg-success-10" : "bg-error-alt-10"}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {log.success ? (
                                <CheckCircle className="w-3 h-3 text-success" />
                              ) : (
                                <XCircle className="w-3 h-3 text-error-alt" />
                              )}
                              <span className="text-xs font-mono text-app-primary">
                                {log.profileName}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                log.action === "BUY"
                                  ? "bg-success-20 text-success"
                                  : "bg-error-alt-20 text-error-alt"
                              }`}
                            >
                              {log.action}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-app-secondary-60">
                              {log.amount.toFixed(4)} SOL
                            </span>
                            <span className="text-app-secondary-40">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {log.error && (
                            <div className="mt-1 text-[10px] font-mono text-error-alt truncate">
                              {log.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-app-accent border border-app-primary-40 rounded-lg p-4">
                <h3 className="font-mono text-sm font-medium color-primary mb-3">
                  Session Stats
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-app-primary rounded-lg border border-app-primary-40">
                    <div className="text-lg font-mono font-semibold text-success">
                      {stats.activeProfiles}
                    </div>
                    <div className="text-[10px] font-mono text-app-secondary-60 uppercase">
                      Active
                    </div>
                  </div>
                  <div className="text-center p-2 bg-app-primary rounded-lg border border-app-primary-40">
                    <div className="text-lg font-mono font-semibold color-primary">
                      {stats.totalExecutions}
                    </div>
                    <div className="text-[10px] font-mono text-app-secondary-60 uppercase">
                      Total
                    </div>
                  </div>
                  <div className="text-center p-2 bg-app-primary rounded-lg border border-app-primary-40">
                    <div className="text-lg font-mono font-semibold text-success">
                      {stats.successfulExecutions}
                    </div>
                    <div className="text-[10px] font-mono text-app-secondary-60 uppercase">
                      Success
                    </div>
                  </div>
                  <div className="text-center p-2 bg-app-primary rounded-lg border border-app-primary-40">
                    <div className="text-lg font-mono font-semibold text-error-alt">
                      {stats.failedExecutions}
                    </div>
                    <div className="text-[10px] font-mono text-app-secondary-60 uppercase">
                      Failed
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomatePage;
