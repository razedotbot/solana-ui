import { Connection } from '@solana/web3.js';

export interface RPCEndpoint {
  id: string;
  url: string;
  name: string;
  isActive: boolean;
  priority: number; // Lower number = higher priority
  lastUsed?: number;
  failureCount: number;
  lastFailure?: number;
}

export class RPCManager {
  private endpoints: RPCEndpoint[];
  private currentIndex: number = 0;
  private maxFailures: number = 3;
  private failureResetTime: number = 60000; // 1 minute

  constructor(endpoints: RPCEndpoint[]) {
    this.endpoints = this.sortEndpoints(endpoints.filter(e => e.isActive));
    if (this.endpoints.length === 0) {
      throw new Error('At least one active RPC endpoint is required');
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

  private resetFailureIfNeeded(endpoint: RPCEndpoint): void {
    if (endpoint.lastFailure && Date.now() - endpoint.lastFailure > this.failureResetTime) {
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
    this.endpoints.forEach(e => this.resetFailureIfNeeded(e));

    // Filter out endpoints that have exceeded max failures
    const availableEndpoints = this.endpoints.filter(
      e => e.failureCount < this.maxFailures
    );

    if (availableEndpoints.length === 0) {
      // All endpoints have failed, reset all failure counts and try again
      this.endpoints.forEach(e => {
        e.failureCount = 0;
        e.lastFailure = undefined;
      });
      return this.endpoints[0] || null;
    }

    // Rotate through available endpoints
    this.currentIndex = (this.currentIndex + 1) % availableEndpoints.length;
    return availableEndpoints[this.currentIndex];
  }

  public createConnection(): Promise<Connection> {
    const errors: Error[] = [];
    
    // Try each endpoint until one succeeds
    for (let attempt = 0; attempt < this.endpoints.length; attempt++) {
      const endpoint = this.getNextEndpoint();
      
      if (!endpoint) {
        return Promise.reject(new Error('No RPC endpoints available'));
      }

      try {
        const connection = new Connection(endpoint.url, 'confirmed');
        
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
        `All RPC endpoints failed. Errors: ${errors.map(e => e.message).join(', ')}`
      )
    );
  }

  public getCurrentEndpoint(): RPCEndpoint | null {
    const availableEndpoints = this.endpoints.filter(
      e => e.failureCount < this.maxFailures
    );
    return availableEndpoints[this.currentIndex] || this.endpoints[0] || null;
  }

  public getAllEndpoints(): RPCEndpoint[] {
    return [...this.endpoints];
  }

  public updateEndpoints(endpoints: RPCEndpoint[]): void {
    this.endpoints = this.sortEndpoints(endpoints.filter(e => e.isActive));
    this.currentIndex = 0;
  }
}

export const createDefaultEndpoints = (): RPCEndpoint[] => {
  return [
    {
      id: 'default-1',
      url: 'https://solana.drpc.org',
      name: 'dRPC',
      isActive: true,
      priority: 1,
      failureCount: 0,
    },
    {
      id: 'default-2',
      url: 'https://solana-rpc.publicnode.com',
      name: 'PublicNode',
      isActive: true,
      priority: 2,
      failureCount: 0,
    },
    {
      id: 'default-4',
      url: 'https://public.rpc.solanavibestation.com',
      name: 'Solana Vibe Station',
      isActive: true,
      priority: 4,
      failureCount: 0,
    },
    {
      id: 'default-5',
      url: 'https://solana.rpc.subquery.network/public',
      name: 'SubQuery',
      isActive: true,
      priority: 5,
      failureCount: 0,
    },
  ];
};

/**
 * Create a connection using RPC manager from config
 * This is a helper for components that need to create connections on-demand
 */
export const createConnectionFromConfig = async (
  rpcEndpoints?: string
): Promise<Connection> => {
  try {
    if (rpcEndpoints) {
      const endpoints = JSON.parse(rpcEndpoints) as RPCEndpoint[];
      const manager = new RPCManager(endpoints);
      return await manager.createConnection();
    }
  } catch (error) {
    console.error('Error creating connection from config:', error);
  }

  // Fallback to default endpoints
  const defaultEndpoints = createDefaultEndpoints();
  const manager = new RPCManager(defaultEndpoints);
  return await manager.createConnection();
};
