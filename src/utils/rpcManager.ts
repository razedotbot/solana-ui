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
}

export class RPCManager {
  private endpoints: RPCEndpoint[];
  private currentIndex: number = 0;
  private maxFailures: number = 3;
  private failureResetTime: number = 60000; // 1 minute

  constructor(endpoints: RPCEndpoint[]) {
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
  }

  private markSuccess(endpoint: RPCEndpoint): void {
    endpoint.lastUsed = Date.now();
    endpoint.failureCount = 0;
    endpoint.lastFailure = undefined;
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
    const errors: Error[] = [];

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
      } catch (error) {
        this.markFailure(endpoint);
        errors.push(error instanceof Error ? error : new Error(String(error)));

        // Continue to next endpoint
        continue;
      }
    }

    // All endpoints failed
    return Promise.reject(
      new Error(
        `All RPC endpoints failed. Errors: ${errors.map((e) => e.message).join(", ")}`,
      ),
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
}

export const createDefaultEndpoints = (): RPCEndpoint[] => {
  return [
    {
      id: "default-1",
      url: "https://solana.drpc.org",
      name: "dRPC",
      isActive: true,
      priority: 1,
      weight: 20,
      failureCount: 0,
    },
    {
      id: "default-2",
      url: "https://solana-rpc.publicnode.com",
      name: "PublicNode",
      isActive: true,
      priority: 2,
      weight: 60,
      failureCount: 0,
    },
    {
      id: "default-3",
      url: "https://public.rpc.solanavibestation.com",
      name: "Solana Vibe Station",
      isActive: true,
      priority: 4,
      weight: 20,
      failureCount: 0,
    },
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
  } catch (error) {
    console.error("Error creating connection from config:", error);
  }

  // Fallback to default endpoints
  const defaultEndpoints = createDefaultEndpoints();
  const manager = new RPCManager(defaultEndpoints);
  return await manager.createConnection();
};
