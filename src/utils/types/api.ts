/**
 * Shared type definitions for API responses and common structures
 * Used across the Solana trading application
 */

/**
 * Generic API response wrapper
 * Used for responses from the trading server endpoints
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  result?: T; // Some endpoints use 'result' instead of 'data'
}

/**
 * Bundle result from Jito block engine
 * Used when sending transaction bundles through the backend proxy
 */
export interface SenderResult {
  jsonrpc: string;
  id: number;
  result?: string;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Trading server instance information
 * Used for regional trading server discovery and selection
 */
export interface ServerInfo {
  id: string;
  name: string;
  url: string;
  region: string;
  flag: string;
  ping?: number;
}

/**
 * Extended Window interface with toast notification support
 * Used for global toast notifications across the application
 */
export interface WindowWithToast extends Window {
  showToast?: (message: string, type: "success" | "error") => void;
}

// Note: TradingStats, IframeWallet, and IframeData types have been moved to iframe.ts
// Import them from the central index.ts or directly from iframe.ts
// Note: PresetTab is defined in components.ts
