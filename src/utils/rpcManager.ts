import { Connection } from "@solana/web3.js";

export interface RPCEndpoint {
  id: string;
  url: string;
  name: string;
  isActive: boolean;
  priority: number; // Lower number = higher priority
  weight: number; // Weight for selection (0-100, should total 100 for all active endpoints)
  lastUsed?: number;
  failureCount: number;
  lastFailure?: number;
  // Health check fields
  latency?: number; // Last measured latency in ms
  lastHealthCheck?: number; // Timestamp of last health check
  healthStatus?: "healthy" | "slow" | "unhealthy" | "unknown"; // Current health status
  autoDisabled?: boolean; // Whether endpoint was automatically disabled due to health
  consecutiveFailures?: number; // Track consecutive failures for auto-disable
}

export interface RPCManagerConfig {
  maxFailures?: number; // Max failures before marking as unavailable
  failureResetTime?: number; // Time in ms before resetting failure count
  autoDisableThreshold?: number; // Consecutive failures before auto-disable
  autoDisableOnUnhealthy?: boolean; // Auto-disable when health check fails
  autoReEnableOnHealthy?: boolean; // Auto re-enable when health check succeeds
}

export class RPCManager {
  private endpoints: RPCEndpoint[];
  private currentIndex: number = 0;
  private readonly maxFailures: number;
  private readonly failureResetTime: number;
  private readonly autoDisableThreshold: number;
  private readonly autoDisableOnUnhealthy: boolean;
  private readonly autoReEnableOnHealthy: boolean;

  constructor(endpoints: RPCEndpoint[], config?: RPCManagerConfig) {
    this.maxFailures = config?.maxFailures ?? 3;
    this.failureResetTime = config?.failureResetTime ?? 60000; // 1 minute
    this.autoDisableThreshold = config?.autoDisableThreshold ?? 3;
    this.autoDisableOnUnhealthy = config?.autoDisableOnUnhealthy ?? true;
    this.autoReEnableOnHealthy = config?.autoReEnableOnHealthy ?? true;

    this.endpoints = this.sortEndpoints(endpoints.filter((e) => e.isActive));
    if (this.endpoints.length === 0) {
      throw new Error("At least one active RPC endpoint is required");
    }
  }

  private sortEndpoints(endpoints: RPCEndpoint[]): RPCEndpoint[] {
    return [...endpoints].sort((a, b) => {
      // Sort by priority first, then by failure count
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.failureCount - b.failureCount;
    });
  }

  private selectEndpointByWeight(
    availableEndpoints: RPCEndpoint[],
  ): RPCEndpoint | null {
    if (availableEndpoints.length === 0) return null;
    if (availableEndpoints.length === 1) return availableEndpoints[0];

    // Calculate total weight of available endpoints
    const totalWeight = availableEndpoints.reduce(
      (sum, e) => sum + (e.weight || 0),
      0,
    );

    if (totalWeight === 0) {
      // If no weights set, use round-robin
      this.currentIndex = (this.currentIndex + 1) % availableEndpoints.length;
      return availableEndpoints[this.currentIndex];
    }

    // Weighted random selection
    let random = Math.random() * totalWeight;
    for (const endpoint of availableEndpoints) {
      random -= endpoint.weight || 0;
      if (random <= 0) {
        return endpoint;
      }
    }

    // Fallback to first endpoint
    return availableEndpoints[0];
  }

  private resetFailureIfNeeded(endpoint: RPCEndpoint): void {
    if (
      endpoint.lastFailure &&
      Date.now() - endpoint.lastFailure > this.failureResetTime
    ) {
      endpoint.failureCount = 0;
      endpoint.lastFailure = undefined;
    }
  }

  private markFailure(endpoint: RPCEndpoint): void {
    endpoint.failureCount++;
    endpoint.lastFailure = Date.now();
    endpoint.consecutiveFailures = (endpoint.consecutiveFailures || 0) + 1;

    // Auto-disable if consecutive failures exceed threshold
    if (
      this.autoDisableOnUnhealthy &&
      endpoint.consecutiveFailures >= this.autoDisableThreshold
    ) {
      this.autoDisableEndpoint(endpoint);
    }
  }

  private markSuccess(endpoint: RPCEndpoint): void {
    endpoint.lastUsed = Date.now();
    endpoint.failureCount = 0;
    endpoint.lastFailure = undefined;
    endpoint.consecutiveFailures = 0;

    // Auto re-enable if it was auto-disabled and now healthy
    if (
      this.autoReEnableOnHealthy &&
      endpoint.autoDisabled &&
      !endpoint.isActive
    ) {
      this.autoEnableEndpoint(endpoint);
    }
  }

  private autoDisableEndpoint(endpoint: RPCEndpoint): void {
     
    endpoint.isActive = false;
    endpoint.autoDisabled = true;
    endpoint.healthStatus = "unhealthy";

    // Ensure we still have at least one active endpoint
    const activeCount = this.endpoints.filter((e) => e.isActive).length;
    if (activeCount === 0) {
       
      // Find the endpoint with the lowest failure count and re-enable it
      const leastFailed = [...this.endpoints].sort(
        (a, b) => (a.failureCount || 0) - (b.failureCount || 0),
      )[0];
      if (leastFailed) {
        leastFailed.isActive = true;
        leastFailed.autoDisabled = false;
      }
    }
  }

  private autoEnableEndpoint(endpoint: RPCEndpoint): void {
     
    endpoint.isActive = true;
    endpoint.autoDisabled = false;
    endpoint.healthStatus = "healthy";
    endpoint.consecutiveFailures = 0;
  }

  private getNextEndpoint(): RPCEndpoint | null {
    // Reset failures for endpoints that have been idle long enough
    this.endpoints.forEach((e) => this.resetFailureIfNeeded(e));

    // Filter out endpoints that have exceeded max failures
    const availableEndpoints = this.endpoints.filter(
      (e) => e.failureCount < this.maxFailures,
    );

    if (availableEndpoints.length === 0) {
      // All endpoints have failed, reset all failure counts and try again
      this.endpoints.forEach((e) => {
        e.failureCount = 0;
        e.lastFailure = undefined;
      });
      return (
        this.selectEndpointByWeight(this.endpoints) || this.endpoints[0] || null
      );
    }

    // Use weighted selection
    return this.selectEndpointByWeight(availableEndpoints);
  }

  public createConnection(): Promise<Connection> {
    // Try each endpoint until one succeeds
    for (let attempt = 0; attempt < this.endpoints.length; attempt++) {
      const endpoint = this.getNextEndpoint();

      if (!endpoint) {
        return Promise.reject(new Error("No RPC endpoints available"));
      }

      try {
        const connection = new Connection(endpoint.url, "confirmed");

        // Return connection without testing (errors will be caught when actually used)
        this.markSuccess(endpoint);
        return Promise.resolve(connection);
      } catch {
        this.markFailure(endpoint);
        continue;
      }
    }

    // All endpoints failed
    return Promise.reject(
      new Error("All RPC endpoints failed"),
    );
  }

  public getCurrentEndpoint(): RPCEndpoint | null {
    const availableEndpoints = this.endpoints.filter(
      (e) => e.failureCount < this.maxFailures,
    );
    return availableEndpoints[this.currentIndex] || this.endpoints[0] || null;
  }

  public getAllEndpoints(): RPCEndpoint[] {
    return [...this.endpoints];
  }

  public updateEndpoints(endpoints: RPCEndpoint[]): void {
    // Normalize weights to ensure they total 100 for active endpoints
    const activeEndpoints = endpoints.filter((e) => e.isActive);
    const totalWeight = activeEndpoints.reduce(
      (sum, e) => sum + (e.weight || 0),
      0,
    );

    if (totalWeight > 0 && activeEndpoints.length > 0) {
      // Normalize weights proportionally
      endpoints.forEach((e) => {
        if (e.isActive && e.weight !== undefined) {
          e.weight = Math.round((e.weight / totalWeight) * 100);
        }
      });
    } else if (activeEndpoints.length > 0) {
      // If no weights set, distribute evenly
      const evenWeight = Math.round(100 / activeEndpoints.length);
      endpoints.forEach((e) => {
        if (e.isActive) {
          e.weight = evenWeight;
        }
      });
    }

    this.endpoints = this.sortEndpoints(endpoints.filter((e) => e.isActive));
    this.currentIndex = 0;
  }

  /**
   * Process health check results and automatically disable/enable endpoints
   * Returns updated endpoints array
   */
  public processHealthChecks(endpoints: RPCEndpoint[]): RPCEndpoint[] {
    const updatedEndpoints = endpoints.map((endpoint) => {
      const updated = { ...endpoint };

      // Auto-disable unhealthy endpoints
      if (
        this.autoDisableOnUnhealthy &&
        updated.isActive &&
        !updated.autoDisabled &&
        updated.healthStatus === "unhealthy"
      ) {
        updated.consecutiveFailures = (updated.consecutiveFailures || 0) + 1;

        if (updated.consecutiveFailures >= this.autoDisableThreshold) {
           
          updated.isActive = false;
          updated.autoDisabled = true;
        }
      }

      // Auto re-enable healthy endpoints that were auto-disabled
      if (
        this.autoReEnableOnHealthy &&
        updated.autoDisabled &&
        !updated.isActive &&
        updated.healthStatus === "healthy"
      ) {
         
        updated.isActive = true;
        updated.autoDisabled = false;
        updated.consecutiveFailures = 0;
        updated.failureCount = 0;
      }

      // Reset consecutive failures for healthy endpoints
      if (updated.healthStatus === "healthy" || updated.healthStatus === "slow") {
        updated.consecutiveFailures = 0;
      }

      return updated;
    });

    // Ensure at least one endpoint remains active
    const activeCount = updatedEndpoints.filter((e) => e.isActive).length;
    if (activeCount === 0 && updatedEndpoints.length > 0) {
       
      // Find the endpoint with the lowest failure count and re-enable it
      const leastFailed = [...updatedEndpoints].sort(
        (a, b) => (a.failureCount || 0) - (b.failureCount || 0),
      )[0];
      if (leastFailed) {
        leastFailed.isActive = true;
        leastFailed.autoDisabled = false;
      }
    }

    return updatedEndpoints;
  }
}

export const createDefaultEndpoints = (): RPCEndpoint[] => {
  return [
    {
      id: "default",
      url: "https://solana-rpc.publicnode.com",
      name: "PublicNode",
      isActive: true,
      priority: 1,
      weight: 100,
      failureCount: 0,
    }
  ];
};

/**
 * Create a connection using RPC manager from config
 * This is a helper for components that need to create connections on-demand
 */
export const createConnectionFromConfig = async (
  rpcEndpoints?: string,
): Promise<Connection> => {
  try {
    if (rpcEndpoints) {
      const endpoints = JSON.parse(rpcEndpoints) as RPCEndpoint[];
      const manager = new RPCManager(endpoints);
      return await manager.createConnection();
    }
  } catch {
    // Failed to parse RPC endpoints, use defaults
  }

  // Fallback to default endpoints
  const defaultEndpoints = createDefaultEndpoints();
  const manager = new RPCManager(defaultEndpoints);
  return await manager.createConnection();
};
