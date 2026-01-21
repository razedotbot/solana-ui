import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { RPCEndpoint } from "../utils/rpcManager";

interface RPCEndpointManagerProps {
  endpoints: RPCEndpoint[];
  onChange: (endpoints: RPCEndpoint[]) => void;
}

const POPULAR_ENDPOINTS = [
  { name: "dRPC", url: "https://solana.drpc.org" },
  { name: "PublicNode", url: "https://solana-rpc.publicnode.com" },
  {
    name: "Solana Vibe Station",
    url: "https://public.rpc.solanavibestation.com",
  },
];

/**
 * Perform a health check on an RPC endpoint
 * Uses getHealth or getSlot to measure latency
 */
const checkEndpointHealth = async (
  url: string,
): Promise<{ latency: number; status: "healthy" | "slow" | "unhealthy" }> => {
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSlot",
        params: [],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const latency = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return { latency, status: "unhealthy" };
    }

    const data = (await response.json()) as {
      result?: number;
      error?: unknown;
    };

    if (data.error) {
      return { latency, status: "unhealthy" };
    }

    // Determine health status based on latency
    if (latency < 200) {
      return { latency, status: "healthy" };
    } else if (latency < 500) {
      return { latency, status: "slow" };
    } else {
      return { latency, status: "slow" };
    }
  } catch {
    const latency = Math.round(performance.now() - startTime);
    return {
      latency: latency > 10000 ? Infinity : latency,
      status: "unhealthy",
    };
  }
};

export const RPCEndpointManager: React.FC<RPCEndpointManagerProps> = ({
  endpoints,
  onChange,
}) => {
  const [newEndpointUrl, setNewEndpointUrl] = useState("");
  const [newEndpointName, setNewEndpointName] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [checkingEndpointId, setCheckingEndpointId] = useState<string | null>(
    null,
  );
  const hasInitializedWeights = useRef(false);
  const hasCheckedHealthOnMount = useRef(false);

  const normalizeWeights = (endpointsToNormalize: RPCEndpoint[]): void => {
    const active = endpointsToNormalize.filter((e) => e.isActive);
    if (active.length === 0) return;

    const currentTotal = active.reduce((sum, e) => sum + (e.weight || 0), 0);

    if (currentTotal === 0) {
      // Distribute evenly if no weights set
      const evenWeight = Math.round(100 / active.length);
      endpointsToNormalize.forEach((e) => {
        if (e.isActive) {
          e.weight = evenWeight;
        }
      });
    } else if (currentTotal !== 100) {
      // Normalize proportionally to total 100
      endpointsToNormalize.forEach((e) => {
        if (e.isActive && e.weight !== undefined) {
          e.weight = Math.round((e.weight / currentTotal) * 100);
        }
      });
    }
  };

  // Check health of all endpoints
  const checkAllEndpointsHealth = useCallback(async () => {
    if (isCheckingHealth) return;

    setIsCheckingHealth(true);

    const updatedEndpoints = await Promise.all(
      endpoints.map(async (endpoint) => {
        if (!endpoint.isActive) {
          return { ...endpoint, healthStatus: "unknown" as const };
        }

        const { latency, status } = await checkEndpointHealth(endpoint.url);
        return {
          ...endpoint,
          latency,
          healthStatus: status,
          lastHealthCheck: Date.now(),
        };
      }),
    );

    onChange(updatedEndpoints);
    setIsCheckingHealth(false);
  }, [endpoints, onChange, isCheckingHealth]);

  // Check health of a single endpoint
  const checkSingleEndpointHealth = async (
    endpointId: string,
  ): Promise<void> => {
    setCheckingEndpointId(endpointId);

    const endpoint = endpoints.find((e) => e.id === endpointId);
    if (!endpoint) {
      setCheckingEndpointId(null);
      return;
    }

    const { latency, status } = await checkEndpointHealth(endpoint.url);

    const updatedEndpoints = endpoints.map((e) => {
      if (e.id === endpointId) {
        return {
          ...e,
          latency,
          healthStatus: status,
          lastHealthCheck: Date.now(),
        };
      }
      return e;
    });

    onChange(updatedEndpoints);
    setCheckingEndpointId(null);
  };

  // Initialize weights for endpoints that don't have them (backward compatibility)
  useEffect(() => {
    // Only initialize once to avoid infinite loops
    if (hasInitializedWeights.current) return;

    const needsWeightInit = endpoints.some(
      (e) => e.isActive && (e.weight === undefined || e.weight === null),
    );
    if (needsWeightInit) {
      hasInitializedWeights.current = true;
      const active = endpoints.filter((e) => e.isActive);
      const evenWeight =
        active.length > 0 ? Math.round(100 / active.length) : 0;
      const updatedEndpoints = endpoints.map((e) => {
        if (e.isActive && (e.weight === undefined || e.weight === null)) {
          return { ...e, weight: evenWeight };
        }
        return e;
      });
      // Normalize to ensure total is 100
      normalizeWeights(updatedEndpoints);
      onChange(updatedEndpoints);
    }
  }, [endpoints, onChange]);

  // Auto-check health on mount
  useEffect(() => {
    if (hasCheckedHealthOnMount.current) return;
    if (endpoints.length === 0) return;

    // Check if any endpoint needs health check (no recent check)
    const needsHealthCheck = endpoints.some(
      (e) =>
        e.isActive &&
        (!e.lastHealthCheck || Date.now() - e.lastHealthCheck > 60000),
    );

    if (needsHealthCheck) {
      hasCheckedHealthOnMount.current = true;
      void checkAllEndpointsHealth();
    }
  }, [endpoints, checkAllEndpointsHealth]);

  // Calculate total weight of active endpoints
  const activeEndpoints = endpoints.filter((e) => e.isActive);
  const totalWeight = activeEndpoints.reduce(
    (sum, e) => sum + (e.weight || 0),
    0,
  );

  const addEndpoint = (): void => {
    if (!newEndpointUrl.trim()) return;

    // Calculate default weight for new endpoint
    const activeCount = endpoints.filter((e) => e.isActive).length;
    const defaultWeight =
      activeCount > 0 ? Math.round(100 / (activeCount + 1)) : 100;

    const newEndpoint: RPCEndpoint = {
      id: `rpc-${Date.now()}`,
      url: newEndpointUrl.trim(),
      name: newEndpointName.trim() || `RPC ${endpoints.length + 1}`,
      isActive: true,
      priority: endpoints.length + 1,
      weight: defaultWeight,
      failureCount: 0,
      healthStatus: "unknown",
    };

    // Normalize existing weights when adding new endpoint
    const updatedEndpoints = [...endpoints, newEndpoint];
    normalizeWeights(updatedEndpoints);
    onChange(updatedEndpoints);
    setNewEndpointUrl("");
    setNewEndpointName("");

    // Check health of the new endpoint
    setTimeout(() => {
      void checkSingleEndpointHealth(newEndpoint.id);
    }, 100);
  };

  const updateEndpointWeight = (id: string, newWeight: number): void => {
    const updatedEndpoints = endpoints.map((e) => {
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
    if (endpoints.filter((e) => e.isActive).length <= 1) {
      alert("You must have at least one active RPC endpoint");
      return;
    }
    const updatedEndpoints = endpoints.filter((e) => e.id !== id);
    // Normalize weights after removal
    normalizeWeights(updatedEndpoints);
    onChange(updatedEndpoints);
  };

  const toggleEndpoint = (id: string): void => {
    const activeCount = endpoints.filter((e) => e.isActive).length;
    const endpoint = endpoints.find((e) => e.id === id);

    if (endpoint?.isActive && activeCount <= 1) {
      alert("You must have at least one active RPC endpoint");
      return;
    }

    const updatedEndpoints = endpoints.map((e) =>
      e.id === id ? { ...e, isActive: !e.isActive } : e,
    );

    // Normalize weights when toggling endpoints
    normalizeWeights(updatedEndpoints);
    onChange(updatedEndpoints);
  };

  const movePriority = (id: string, direction: "up" | "down"): void => {
    const index = endpoints.findIndex((e) => e.id === id);
    if (index === -1) return;

    const newEndpoints = [...endpoints];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newEndpoints.length) return;

    [newEndpoints[index], newEndpoints[targetIndex]] = [
      newEndpoints[targetIndex],
      newEndpoints[index],
    ];

    // Update priorities
    newEndpoints.forEach((e, i) => {
      e.priority = i + 1;
    });

    onChange(newEndpoints);
  };

  // Get health status color and icon
  const getHealthIndicator = (
    endpoint: RPCEndpoint,
  ): { color: string; bg: string; icon: React.ReactNode } => {
    if (!endpoint.isActive) {
      return {
        color: "text-app-secondary-40",
        bg: "bg-app-secondary-20",
        icon: <WifiOff size={12} />,
      };
    }

    if (checkingEndpointId === endpoint.id) {
      return {
        color: "text-blue-400",
        bg: "bg-blue-500/20",
        icon: <RefreshCw size={12} className="animate-spin" />,
      };
    }

    switch (endpoint.healthStatus) {
      case "healthy":
        return {
          color: "text-green-400",
          bg: "bg-green-500/20",
          icon: <Wifi size={12} />,
        };
      case "slow":
        return {
          color: "text-yellow-400",
          bg: "bg-yellow-500/20",
          icon: <Activity size={12} />,
        };
      case "unhealthy":
        return {
          color: "text-red-400",
          bg: "bg-red-500/20",
          icon: <WifiOff size={12} />,
        };
      case "unknown":
      case undefined:
        return {
          color: "text-app-secondary-40",
          bg: "bg-app-secondary-20",
          icon: <Activity size={12} />,
        };
    }
  };

  const getLatencyColor = (latency?: number): string => {
    if (latency === undefined || latency === Infinity)
      return "text-app-secondary-40";
    if (latency < 100) return "text-green-400";
    if (latency < 200) return "text-green-300";
    if (latency < 500) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <label
            className="block text-xs sm:text-sm font-mono uppercase tracking-wider"
            style={{ color: "var(--app-secondary, #7ddfbd)" }}
          >
            <span style={{ color: "var(--app-primary-color, #02b36d)" }}>
              &#62;
            </span>{" "}
            RPC Endpoints{" "}
            <span style={{ color: "var(--app-primary-color, #02b36d)" }}>
              &#60;
            </span>
          </label>

          {/* Refresh All Health Button */}
          <button
            type="button"
            onClick={() => void checkAllEndpointsHealth()}
            disabled={isCheckingHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded-lg bg-app-tertiary border border-app-primary-30 hover:border-app-primary-color hover:bg-app-primary-color/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: "var(--app-primary-color, #02b36d)" }}
          >
            <RefreshCw
              size={12}
              className={isCheckingHealth ? "animate-spin" : ""}
            />
            {isCheckingHealth ? "Checking..." : "Check Health"}
          </button>
        </div>

        <div
          className="text-[10px] sm:text-xs font-mono mb-3 flex items-start gap-2"
          style={{ color: "var(--app-secondary-80, rgba(125, 223, 189, 0.8))" }}
        >
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            Add multiple RPC endpoints with weights for weighted selection.
            Health checks measure latency and reliability.
          </span>
        </div>

        {/* Weight Total Indicator */}
        {activeEndpoints.length > 0 && (
          <div
            className={`text-[10px] font-mono mb-2 px-2 py-1 rounded ${
              totalWeight === 100
                ? "bg-app-primary-color/20 text-app-primary-color border border-app-primary-color/40"
                : "bg-ping-poor-10 text-ping-poor border border-ping-poor/40"
            }`}
          >
            Total Weight: {totalWeight}%{" "}
            {totalWeight !== 100 && "(Should be 100%)"}
          </div>
        )}

        {/* Endpoint List */}
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
          {endpoints.map((endpoint, index) => {
            const healthIndicator = getHealthIndicator(endpoint);
            return (
              <div
                key={endpoint.id}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                  endpoint.isActive
                    ? "bg-app-tertiary border-app-primary-40"
                    : "bg-app-quaternary border-app-primary-20 opacity-60"
                }`}
              >
                {/* Priority Controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => movePriority(endpoint.id, "up")}
                    disabled={index === 0}
                    className="p-0.5 hover:bg-app-primary-20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={14} className="text-app-primary" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePriority(endpoint.id, "down")}
                    disabled={index === endpoints.length - 1}
                    className="p-0.5 hover:bg-app-primary-20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={14} className="text-app-primary" />
                  </button>
                </div>

                {/* Health Status Indicator */}
                <button
                  type="button"
                  onClick={() => void checkSingleEndpointHealth(endpoint.id)}
                  disabled={checkingEndpointId === endpoint.id}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg ${healthIndicator.bg} ${healthIndicator.color} hover:opacity-80 transition-opacity`}
                  title={`Status: ${endpoint.healthStatus || "unknown"}${endpoint.latency !== undefined ? ` | Latency: ${endpoint.latency === Infinity ? "Timeout" : endpoint.latency + "ms"}` : ""}\nClick to refresh`}
                >
                  {healthIndicator.icon}
                </button>

                {/* Endpoint Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-app-primary font-mono truncate">
                      {endpoint.name}
                    </span>
                    {/* Latency Badge */}
                    {endpoint.isActive && endpoint.latency !== undefined && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${getLatencyColor(endpoint.latency)} bg-app-quaternary`}
                      >
                        {endpoint.latency === Infinity
                          ? "Timeout"
                          : `${endpoint.latency}ms`}
                      </span>
                    )}
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
                    <span className="text-[9px] font-mono text-app-secondary-60">
                      %
                    </span>
                  </div>
                )}

                {/* Failure Count Badge */}
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
                    endpoint.isActive
                      ? "bg-app-primary-color"
                      : "bg-app-primary-30"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      endpoint.isActive ? "translate-x-5" : "translate-x-1"
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
            );
          })}
        </div>

        {/* Health Summary */}
        {activeEndpoints.length > 0 && (
          <div className="flex items-center gap-4 text-[10px] font-mono py-2 px-3 rounded-lg bg-app-quaternary/50 border border-app-primary-20">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-app-secondary">
                Healthy:{" "}
                {
                  endpoints.filter(
                    (e) => e.isActive && e.healthStatus === "healthy",
                  ).length
                }
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-app-secondary">
                Slow:{" "}
                {
                  endpoints.filter(
                    (e) => e.isActive && e.healthStatus === "slow",
                  ).length
                }
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-app-secondary">
                Unhealthy:{" "}
                {
                  endpoints.filter(
                    (e) => e.isActive && e.healthStatus === "unhealthy",
                  ).length
                }
              </span>
            </div>
          </div>
        )}

        {/* Add New Endpoint */}
        <div className="space-y-2 pt-2 border-t border-app-primary-20">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-mono"
              style={{ color: "var(--app-secondary, #7ddfbd)" }}
            >
              Add New Endpoint
            </span>
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="text-[10px] font-mono px-2 py-1 rounded hover:bg-app-primary-20 transition-colors"
              style={{ color: "var(--app-primary-color, #02b36d)" }}
            >
              {showPresets ? "Hide" : "Show"} Popular
            </button>
          </div>

          {showPresets && (
            <div
              className="space-y-1 mb-2 p-2 rounded"
              style={{
                backgroundColor: "var(--app-quaternary, rgba(5, 10, 14, 0.5))",
              }}
            >
              {POPULAR_ENDPOINTS.map((preset) => {
                const alreadyAdded = endpoints.some(
                  (e) => e.url === preset.url,
                );
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
                    style={{ color: "var(--app-secondary, #7ddfbd)" }}
                  >
                    <div className="font-medium">{preset.name}</div>
                    <div className="opacity-70 truncate">{preset.url}</div>
                    {alreadyAdded && (
                      <div className="text-[9px] opacity-60">
                        (Already added)
                      </div>
                    )}
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
              onKeyDown={(e) => e.key === "Enter" && addEndpoint()}
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
