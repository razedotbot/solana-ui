/**
 * Unified WebSocket manager for automate and copytrade features
 * Shares common utilities and connection logic
 */

import type {
  WebSocketWelcomeMessage,
  WebSocketConnectionMessage,
  WebSocketSubscriptionMessage,
  WebSocketTradeMessage,
  WebSocketErrorMessage,
  TradeTransactionData,
  WebSocketMessage,
  AutomateTrade,
  AutomateWebSocketConfig,
  MultiTokenWebSocketConfig,
  WebSocketCopyTradeData as CopyTradeData,
  CopyTradeWebSocketConfig,
} from './types';

// Re-export types for backward compatibility
export type {
  WebSocketWelcomeMessage,
  WebSocketConnectionMessage,
  WebSocketSubscriptionMessage,
  WebSocketTradeMessage,
  WebSocketErrorMessage,
  TradeTransactionData,
  WebSocketMessage,
  AutomateTrade,
  AutomateWebSocketConfig,
  MultiTokenWebSocketConfig,
  CopyTradeWebSocketConfig,
};
export type { WebSocketCopyTradeData as CopyTradeData } from './types';

// ============================================================================
// Shared Constants
// ============================================================================

export const RECONNECT_DELAY = 3000; // 3 seconds
export const MAX_RECONNECT_ATTEMPTS = 10;

// ============================================================================
// Shared Utility Functions
// ============================================================================

/**
 * Gets the WebSocket URL based on the current trading server URL
 * Converts HTTPS URL to WSS URL and appends /ws/sol path
 */
function getWebSocketUrl(): string {
  // Get the trading server URL from window (set in index.tsx)
  const tradingServerUrl = (window as { tradingServerUrl?: string }).tradingServerUrl;
  
  if (tradingServerUrl) {
    try {
      // Convert HTTPS URL to WSS URL
      const url = new URL(tradingServerUrl);
      const wsUrl = `wss://${url.hostname}/ws/sol`;
      return wsUrl;
    } catch (error) {
      console.warn('[WebSocket] Failed to parse trading server URL, using default:', error);
    }
  }
  
  // Fallback to default if trading server URL is not available
  return 'wss://de.raze.sh/ws/sol';
}

export function buildWebSocketUrl(apiKey?: string): string {
  const wsUrl = getWebSocketUrl();
  
  if (!apiKey) {
    return wsUrl;
  }
  
  const separator = wsUrl.includes('?') ? '&' : '?';
  return `${wsUrl}${separator}apiKey=${encodeURIComponent(apiKey)}`;
}

export function isAuthenticationError(event: CloseEvent): boolean {
  const isAuthClose = event.code === 1008 || event.code === 1003;
  
  if (isAuthClose) {
    return true;
  }
  
  if (event.reason) {
    const reason = event.reason.toLowerCase();
    return reason.includes('authentication') ||
           reason.includes('api key') ||
           reason.includes('unauthorized');
  }
  
  return false;
}

export function isAuthenticationErrorMessage(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase();
  return msg.includes('authentication') || 
         msg.includes('api key') ||
         msg.includes('unauthorized') ||
         (msg.includes('connection') && msg.includes('exceeded'));
}

export function extractTransactionType(txData: TradeTransactionData): 'buy' | 'sell' {
  const transactionType = txData.type || txData.transactionType || txData.tradeType || 'buy';
  
  if (typeof transactionType === 'string') {
    const normalized = transactionType.toLowerCase();
    if (normalized === 'buy' || normalized === 'sell') {
      return normalized;
    }
  }
  
  return 'buy';
}

export function parseNumericValue(value: string | number | undefined, defaultValue = 0): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? defaultValue : parsed;
}

export function extractTokenMint(message: WebSocketTradeMessage, txData: TradeTransactionData): string | null {
  return txData.tokenMint || txData.mint || message.tokenMint || message.mint || null;
}

export function extractSignerAddress(txData: TradeTransactionData): string | null {
  return txData.signer || txData.trader || null;
}

export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

// ============================================================================
// Automate WebSocket Manager (formerly TradeWebSocket)
// ============================================================================

export class AutomateWebSocketManager {
  private ws: WebSocket | null = null;
  private config: AutomateWebSocketConfig | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private subscribedTokenMint: string | null = null;

  connect(config: AutomateWebSocketConfig): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.subscribedTokenMint !== config.tokenMint) {
        this.subscribeToToken(config.tokenMint);
      }
      this.config = config;
      return;
    }

    this.config = config;
    this.isManualClose = false;
    this.reconnectAttempts = 0;
    this.attemptConnection();
  }

  private attemptConnection(): void {
    if (this.isManualClose) return;

    try {
      const wsUrl = buildWebSocketUrl(this.config?.apiKey);
      
      if (this.config?.apiKey) {
        // eslint-disable-next-line no-console
        console.log('[AutomateWebSocket] Connecting with API key authentication');
      } else {
        console.warn('[AutomateWebSocket] Connecting without API key - connection may be rejected');
      }
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // eslint-disable-next-line no-console
        console.log('[AutomateWebSocket] Connected to WebSocket');
        this.reconnectAttempts = 0;
        this.config?.onConnect?.();

        if (this.config?.tokenMint) {
          this.subscribeToToken(this.config.tokenMint);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as WebSocketMessage;
          this.handleMessage(data);
        } catch (error) {
          this.config?.onError?.(error instanceof Error ? error : new Error('Failed to parse WebSocket message'));
        }
      };

      this.ws.onerror = () => {
        this.config?.onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = (event) => {
        // eslint-disable-next-line no-console
        console.log('[AutomateWebSocket] WebSocket closed', { code: event.code, reason: event.reason });
        this.ws = null;
        this.config?.onDisconnect?.();

        if (isAuthenticationError(event)) {
          this.isManualClose = true;
          const errorMsg = event.reason || 'Authentication failed. Please check your API key.';
          this.config?.onError?.(new Error(errorMsg));
          return;
        }

        if (!this.isManualClose && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          // eslint-disable-next-line no-console
          console.log(`[AutomateWebSocket] Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          this.reconnectTimeout = setTimeout(() => {
            this.attemptConnection();
          }, RECONNECT_DELAY);
        } else if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          this.config?.onError?.(new Error('Max reconnection attempts reached'));
        }
      };
    } catch (error) {
      this.config?.onError?.(error instanceof Error ? error : new Error('Failed to create WebSocket'));
    }
  }

  private subscribeToToken(tokenMint: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const tokenSubscription = {
      action: 'subscribe',
      tokenMint: tokenMint
    };

    // eslint-disable-next-line no-console
    console.log(`[AutomateWebSocket] Subscribing to token: ${tokenMint}`);
    this.ws.send(JSON.stringify(tokenSubscription));
    this.subscribedTokenMint = tokenMint;
  }

  private handleMessage(data: WebSocketMessage): void {
    if (!this.config) return;

    if (data.type === 'welcome') {
      // eslint-disable-next-line no-console
      console.log('[AutomateWebSocket] Welcome message:', 'message' in data ? data.message : undefined);
      return;
    }

    if (data.type === 'connection') {
      // eslint-disable-next-line no-console
      console.log('[AutomateWebSocket] Connection confirmed:', 'clientId' in data ? data.clientId : undefined);
      return;
    }

    if (data.type === 'trade' || data.type === 'transaction') {
      this.processTradeMessage(data);
      return;
    }

    if (data.type === 'event_subscription_confirmed') {
      // eslint-disable-next-line no-console
      console.log('[AutomateWebSocket] Subscription confirmed');
      return;
    }

    if (data.type === 'error') {
      const errorMessage = ('message' in data ? data.message : undefined) || ('error' in data ? data.error : undefined) || 'Unknown server error';
      
      if (isAuthenticationErrorMessage(errorMessage)) {
        this.isManualClose = true;
        this.ws?.close();
      }
      
      this.config.onError?.(new Error(errorMessage));
      return;
    }
  }

  private processTradeMessage(message: WebSocketTradeMessage): void {
    if (!this.config) return;

    try {
      const txData: TradeTransactionData = message.transaction || message.data || {};
      const tokenMint = extractTokenMint(message, txData);
      
      if (tokenMint && this.config.tokenMint && tokenMint !== this.config.tokenMint) {
        return;
      }

      const finalTokenMint = tokenMint || this.config.tokenMint;
      if (!finalTokenMint) return;

      const transactionType = extractTransactionType(txData);
      const tokensAmount = parseNumericValue(txData.tokenAmount || txData.tokensAmount);
      const solAmount = parseNumericValue(txData.solAmount);
      const avgPrice = parseNumericValue(txData.avgPrice || txData.avgPriceUsd);
      const signature = txData.signature || message.signature || '';
      const signer = extractSignerAddress(txData) || '';
      const timestamp = txData.timestamp || message.timestamp || Date.now();

      const solPrice = message.priceInfo?.solPrice || this.config.solPrice;
      const tokenSupply = this.config.tokenSupply;
      const marketCap = (solPrice > 0 && avgPrice > 0 && tokenSupply > 0)
        ? avgPrice * solPrice * tokenSupply
        : 0;

      const trade: AutomateTrade = {
        type: transactionType,
        address: signer,
        tokensAmount,
        avgPrice,
        solAmount,
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        signature,
        tokenMint: finalTokenMint,
        marketCap,
        walletAddress: signer
      };

      this.config.onTrade(trade);
    } catch (error) {
      this.config.onError?.(error instanceof Error ? error : new Error('Failed to process trade message'));
    }
  }

  updateToken(tokenMint: string): void {
    if (!this.config) return;

    if (this.subscribedTokenMint && this.subscribedTokenMint !== tokenMint) {
      this.unsubscribeFromToken(this.subscribedTokenMint);
    }

    this.config.tokenMint = tokenMint;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.subscribeToToken(tokenMint);
    }
  }

  updateSolPrice(solPrice: number): void {
    if (this.config) {
      this.config.solPrice = solPrice;
    }
  }

  updateTokenSupply(tokenSupply: number): void {
    if (this.config) {
      this.config.tokenSupply = tokenSupply;
    }
  }

  private unsubscribeFromToken(tokenMint: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const unsubscribeMessage = {
      action: 'unsubscribe',
      tokenMint: tokenMint
    };

    // eslint-disable-next-line no-console
    console.log(`[AutomateWebSocket] Unsubscribing from token: ${tokenMint}`);
    this.ws.send(JSON.stringify(unsubscribeMessage));
  }

  disconnect(): void {
    this.isManualClose = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      if (this.subscribedTokenMint) {
        this.unsubscribeFromToken(this.subscribedTokenMint);
      }

      this.ws.close();
      this.ws = null;
    }

    this.subscribedTokenMint = null;
    this.config = null;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// ============================================================================
// Multi-Token WebSocket Manager
// ============================================================================

export class MultiTokenWebSocketManager {
  private ws: WebSocket | null = null;
  private config: MultiTokenWebSocketConfig | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private subscribedTokens: Set<string> = new Set();
  private pendingSubscriptions: Set<string> = new Set();

  connect(config: MultiTokenWebSocketConfig): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.config = config;
      return;
    }

    this.config = config;
    this.isManualClose = false;
    this.reconnectAttempts = 0;
    this.attemptConnection();
  }

  private attemptConnection(): void {
    if (this.isManualClose) return;

    try {
      const wsUrl = buildWebSocketUrl(this.config?.apiKey);
      
      if (this.config?.apiKey) {
        // eslint-disable-next-line no-console
        console.log('[MultiTokenWebSocket] Connecting with API key authentication');
      } else {
        console.warn('[MultiTokenWebSocket] Connecting without API key - connection may be rejected');
      }
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // eslint-disable-next-line no-console
        console.log('[MultiTokenWebSocket] Connected to WebSocket');
        this.reconnectAttempts = 0;
        this.config?.onConnect?.();

        // Re-subscribe to all tokens that were subscribed before
        if (this.subscribedTokens.size > 0) {
          const tokensToResubscribe = Array.from(this.subscribedTokens);
          this.subscribedTokens.clear();
          tokensToResubscribe.forEach(token => this.subscribeToToken(token));
        }
        
        // Subscribe to any pending subscriptions
        if (this.pendingSubscriptions.size > 0) {
          const pendingTokens = Array.from(this.pendingSubscriptions);
          this.pendingSubscriptions.clear();
          pendingTokens.forEach(token => this.subscribeToToken(token));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as WebSocketMessage;
          this.handleMessage(data);
        } catch (error) {
          this.config?.onError?.(error instanceof Error ? error : new Error('Failed to parse WebSocket message'));
        }
      };

      this.ws.onerror = () => {
        this.config?.onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = (event) => {
        // eslint-disable-next-line no-console
        console.log('[MultiTokenWebSocket] WebSocket closed', { code: event.code, reason: event.reason });
        this.ws = null;
        this.config?.onDisconnect?.();

        if (isAuthenticationError(event)) {
          this.isManualClose = true;
          const errorMsg = event.reason || 'Authentication failed. Please check your API key.';
          this.config?.onError?.(new Error(errorMsg));
          return;
        }

        if (!this.isManualClose && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          // eslint-disable-next-line no-console
          console.log(`[MultiTokenWebSocket] Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          this.reconnectTimeout = setTimeout(() => {
            this.attemptConnection();
          }, RECONNECT_DELAY);
        } else if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          this.config?.onError?.(new Error('Max reconnection attempts reached'));
        }
      };
    } catch (error) {
      this.config?.onError?.(error instanceof Error ? error : new Error('Failed to create WebSocket'));
    }
  }

  private subscribeToToken(tokenMint: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingSubscriptions.add(tokenMint);
      return;
    }

    if (this.subscribedTokens.has(tokenMint)) {
      return;
    }

    const tokenSubscription = {
      action: 'subscribe',
      tokenMint: tokenMint
    };

    // eslint-disable-next-line no-console
    console.log(`[MultiTokenWebSocket] Subscribing to token: ${tokenMint}`);
    this.ws.send(JSON.stringify(tokenSubscription));
    this.subscribedTokens.add(tokenMint);
  }

  private unsubscribeFromToken(tokenMint: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingSubscriptions.delete(tokenMint);
      this.subscribedTokens.delete(tokenMint);
      return;
    }

    if (!this.subscribedTokens.has(tokenMint)) {
      return;
    }

    const unsubscribeMessage = {
      action: 'unsubscribe',
      tokenMint: tokenMint
    };

    // eslint-disable-next-line no-console
    console.log(`[MultiTokenWebSocket] Unsubscribing from token: ${tokenMint}`);
    this.ws.send(JSON.stringify(unsubscribeMessage));
    this.subscribedTokens.delete(tokenMint);
    this.config?.onTokenUnsubscribed?.(tokenMint);
  }

  private handleMessage(data: WebSocketMessage): void {
    if (!this.config) return;

    if (data.type === 'welcome') {
      // eslint-disable-next-line no-console
      console.log('[MultiTokenWebSocket] Welcome message:', 'message' in data ? data.message : undefined);
      return;
    }

    if (data.type === 'connection') {
      // eslint-disable-next-line no-console
      console.log('[MultiTokenWebSocket] Connection confirmed:', 'clientId' in data ? data.clientId : undefined);
      return;
    }

    if (data.type === 'trade' || data.type === 'transaction') {
      this.processTradeMessage(data);
      return;
    }

    if (data.type === 'event_subscription_confirmed') {
      // eslint-disable-next-line no-console
      console.log('[MultiTokenWebSocket] Subscription confirmed');
      return;
    }

    if (data.type === 'error') {
      const errorMessage = ('message' in data ? data.message : undefined) || ('error' in data ? data.error : undefined) || 'Unknown server error';
      
      if (isAuthenticationErrorMessage(errorMessage)) {
        this.isManualClose = true;
        this.ws?.close();
      }
      
      this.config.onError?.(new Error(errorMessage));
      return;
    }
  }

  private processTradeMessage(message: WebSocketTradeMessage): void {
    if (!this.config) return;

    try {
      const txData: TradeTransactionData = message.transaction || message.data || {};
      const tokenMint = extractTokenMint(message, txData);
      
      if (!tokenMint) return;
      
      // Only process trades for subscribed tokens
      if (!this.subscribedTokens.has(tokenMint)) {
        return;
      }

      const transactionType = extractTransactionType(txData);
      const tokensAmount = parseNumericValue(txData.tokenAmount || txData.tokensAmount);
      const solAmount = parseNumericValue(txData.solAmount);
      const avgPrice = parseNumericValue(txData.avgPrice || txData.avgPriceUsd);
      const signature = txData.signature || message.signature || '';
      const signer = extractSignerAddress(txData) || '';
      const timestamp = txData.timestamp || message.timestamp || Date.now();

      const solPrice = message.priceInfo?.solPrice || this.config.solPrice;
      const tokenSupply = this.config.defaultTokenSupply;
      const marketCap = (solPrice > 0 && avgPrice > 0 && tokenSupply > 0)
        ? avgPrice * solPrice * tokenSupply
        : 0;

      const trade: AutomateTrade = {
        type: transactionType,
        address: signer,
        tokensAmount,
        avgPrice,
        solAmount,
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        signature,
        tokenMint,
        marketCap,
        walletAddress: signer
      };

      this.config.onTrade(trade, tokenMint);
    } catch (error) {
      this.config.onError?.(error instanceof Error ? error : new Error('Failed to process trade message'));
    }
  }

  // Public API methods

  addToken(tokenMint: string): void {
    this.subscribeToToken(tokenMint);
  }

  removeToken(tokenMint: string): void {
    this.unsubscribeFromToken(tokenMint);
  }

  subscribeToTokens(tokenMints: string[]): void {
    tokenMints.forEach(token => this.subscribeToToken(token));
  }

  unsubscribeFromAllTokens(): void {
    const tokens = Array.from(this.subscribedTokens);
    tokens.forEach(token => this.unsubscribeFromToken(token));
  }

  getSubscribedTokens(): string[] {
    return Array.from(this.subscribedTokens);
  }

  isTokenSubscribed(tokenMint: string): boolean {
    return this.subscribedTokens.has(tokenMint);
  }

  updateSolPrice(solPrice: number): void {
    if (this.config) {
      this.config.solPrice = solPrice;
    }
  }

  disconnect(): void {
    this.isManualClose = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      // Unsubscribe from all tokens before closing
      this.unsubscribeFromAllTokens();
      this.ws.close();
      this.ws = null;
    }

    this.subscribedTokens.clear();
    this.pendingSubscriptions.clear();
    this.config = null;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// ============================================================================
// CopyTrade WebSocket Manager
// ============================================================================

export class CopyTradeWebSocketManager {
  private ws: WebSocket | null = null;
  private config: CopyTradeWebSocketConfig | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private subscribedSigners: string[] = [];

  connect(config: CopyTradeWebSocketConfig): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const signersChanged = !arraysEqual(this.subscribedSigners, config.signers);
      if (signersChanged) {
        if (this.subscribedSigners.length > 0) {
          this.unsubscribeFromSigners(this.subscribedSigners);
        }
        if (config.signers.length > 0) {
          this.subscribeToSigners(config.signers);
        }
      }
      this.config = config;
      return;
    }

    this.config = config;
    this.isManualClose = false;
    this.reconnectAttempts = 0;
    this.attemptConnection();
  }

  private attemptConnection(): void {
    if (this.isManualClose) return;

    try {
      const wsUrl = buildWebSocketUrl(this.config?.apiKey);
      
      if (this.config?.apiKey) {
        // eslint-disable-next-line no-console
        console.log('[CopyTradeWebSocket] Connecting with API key authentication');
      } else {
        console.warn('[CopyTradeWebSocket] Connecting without API key - connection may be rejected');
      }
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // eslint-disable-next-line no-console
        console.log('[CopyTradeWebSocket] Connected to WebSocket');
        this.reconnectAttempts = 0;
        this.config?.onConnect?.();

        if (this.config?.signers && this.config.signers.length > 0) {
          this.subscribeToSigners(this.config.signers);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as WebSocketMessage;
          this.handleMessage(data);
        } catch (error) {
          this.config?.onError?.(error instanceof Error ? error : new Error('Failed to parse WebSocket message'));
        }
      };

      this.ws.onerror = () => {
        this.config?.onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = (event) => {
        // eslint-disable-next-line no-console
        console.log('[CopyTradeWebSocket] WebSocket closed', { code: event.code, reason: event.reason });
        this.ws = null;
        this.config?.onDisconnect?.();

        if (isAuthenticationError(event)) {
          this.isManualClose = true;
          const errorMsg = event.reason || 'Authentication failed. Please check your API key.';
          this.config?.onError?.(new Error(errorMsg));
          return;
        }

        if (!this.isManualClose && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          // eslint-disable-next-line no-console
          console.log(`[CopyTradeWebSocket] Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          this.reconnectTimeout = setTimeout(() => {
            this.attemptConnection();
          }, RECONNECT_DELAY);
        } else if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          this.config?.onError?.(new Error('Max reconnection attempts reached'));
        }
      };
    } catch (error) {
      this.config?.onError?.(error instanceof Error ? error : new Error('Failed to create WebSocket'));
    }
  }

  private subscribeToSigners(signers: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || signers.length === 0) return;

    const subscriptionMessage = {
      action: 'subscribe',
      signers: signers
    };

    // eslint-disable-next-line no-console
    console.log(`[CopyTradeWebSocket] Subscribing to ${signers.length} signers:`, signers.slice(0, 3).join(', ') + (signers.length > 3 ? '...' : ''));
    this.ws.send(JSON.stringify(subscriptionMessage));
    this.subscribedSigners = [...signers];
  }

  private unsubscribeFromSigners(signers: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || signers.length === 0) return;

    const unsubscribeMessage = {
      action: 'unsubscribe',
      signers: signers
    };

    // eslint-disable-next-line no-console
    console.log(`[CopyTradeWebSocket] Unsubscribing from ${signers.length} signers`);
    this.ws.send(JSON.stringify(unsubscribeMessage));
  }

  private handleMessage(data: WebSocketMessage): void {
    if (!this.config) return;

    if (data.type === 'welcome') {
      // eslint-disable-next-line no-console
      console.log('[CopyTradeWebSocket] Welcome message:', 'message' in data ? data.message : undefined);
      return;
    }

    if (data.type === 'connection') {
      // eslint-disable-next-line no-console
      console.log('[CopyTradeWebSocket] Connection confirmed:', 'clientId' in data ? data.clientId : undefined);
      return;
    }

    if (data.type === 'trade' || data.type === 'transaction') {
      this.processTradeMessage(data);
      return;
    }

    if (data.type === 'subscription_confirmed' || data.type === 'event_subscription_confirmed') {
      // eslint-disable-next-line no-console
      console.log('[CopyTradeWebSocket] Subscription confirmed');
      return;
    }

    if (data.type === 'error') {
      const errorMessage = ('message' in data ? data.message : undefined) || ('error' in data ? data.error : undefined) || 'Unknown server error';
      
      if (isAuthenticationErrorMessage(errorMessage)) {
        this.isManualClose = true;
        this.ws?.close();
      }
      
      this.config.onError?.(new Error(errorMessage));
      return;
    }
  }

  private processTradeMessage(message: WebSocketTradeMessage): void {
    if (!this.config) return;

    try {
      const txData: TradeTransactionData = message.transaction || message.data || {};
      const signerAddress = extractSignerAddress(txData);
      
      if (!signerAddress || !this.subscribedSigners.includes(signerAddress)) {
        return;
      }

      const tokenMint = extractTokenMint(message, txData);
      if (!tokenMint) return;

      const transactionType = extractTransactionType(txData);
      const tokenAmount = parseNumericValue(txData.tokenAmount || txData.tokensAmount);
      const solAmount = parseNumericValue(txData.solAmount);
      const avgPrice = parseNumericValue(txData.avgPrice || txData.avgPriceUsd);
      const signature = txData.signature || message.signature || '';
      const timestamp = txData.timestamp || message.timestamp || Date.now();
      const marketCap = txData.marketCap || 0;

      const trade: CopyTradeData = {
        type: transactionType,
        signerAddress,
        tokenMint,
        tokenAmount,
        solAmount,
        avgPrice,
        marketCap,
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        signature
      };

      this.config.onTrade(trade);
    } catch (error) {
      this.config.onError?.(error instanceof Error ? error : new Error('Failed to process trade message'));
    }
  }

  updateSigners(signers: string[]): void {
    if (!this.config) return;

    const signersChanged = !arraysEqual(this.subscribedSigners, signers);
    if (!signersChanged) return;

    if (this.subscribedSigners.length > 0) {
      this.unsubscribeFromSigners(this.subscribedSigners);
    }

    this.config.signers = signers;

    if (this.ws && this.ws.readyState === WebSocket.OPEN && signers.length > 0) {
      this.subscribeToSigners(signers);
    }
  }

  addSigners(signers: string[]): void {
    if (!this.config) return;

    const newSigners = signers.filter(s => !this.subscribedSigners.includes(s));
    if (newSigners.length === 0) return;

    this.config.signers = [...this.config.signers, ...newSigners];

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.subscribeToSigners(newSigners);
      this.subscribedSigners = [...this.subscribedSigners, ...newSigners];
    }
  }

  removeSigners(signers: string[]): void {
    if (!this.config) return;

    const signersToRemove = signers.filter(s => this.subscribedSigners.includes(s));
    if (signersToRemove.length === 0) return;

    this.config.signers = this.config.signers.filter(s => !signersToRemove.includes(s));

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.unsubscribeFromSigners(signersToRemove);
      this.subscribedSigners = this.subscribedSigners.filter(s => !signersToRemove.includes(s));
    }
  }

  getSubscribedSigners(): string[] {
    return [...this.subscribedSigners];
  }

  disconnect(): void {
    this.isManualClose = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      if (this.subscribedSigners.length > 0) {
        this.unsubscribeFromSigners(this.subscribedSigners);
      }

      this.ws.close();
      this.ws = null;
    }

    this.subscribedSigners = [];
    this.config = null;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// ============================================================================
// Sniper Bot WebSocket Manager
// ============================================================================

import type {
  SniperBotWebSocketConfig,
  DeployEvent,
  MigrationEvent,
  DeployEventData,
  MigrationEventData,
} from '../components/tools/automate/types';

// Re-export sniper bot types
export type { SniperBotWebSocketConfig, DeployEvent, MigrationEvent };

/**
 * WebSocket message types for sniper bot
 */
interface SniperWebSocketMessage {
  type: string;
  timestamp?: number;
  data?: DeployEventData | MigrationEventData;
  message?: string;
  error?: string;
  clientId?: string;
  subscriptions?: string[];
}

export class SniperBotWebSocketManager {
  private ws: WebSocket | null = null;
  private config: SniperBotWebSocketConfig | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private isSubscribed = false;

  connect(config: SniperBotWebSocketConfig): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Already connected, just update config
      this.config = config;
      if (!this.isSubscribed) {
        this.subscribeToEvents();
      }
      return;
    }

    this.config = config;
    this.isManualClose = false;
    this.reconnectAttempts = 0;
    this.attemptConnection();
  }

  private attemptConnection(): void {
    if (this.isManualClose) return;

    try {
      const wsUrl = buildWebSocketUrl(this.config?.apiKey);
      
      if (this.config?.apiKey) {
        // eslint-disable-next-line no-console
        console.log('[SniperBotWebSocket] Connecting with API key authentication');
      } else {
        console.warn('[SniperBotWebSocket] Connecting without API key - connection may be rejected');
      }
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // eslint-disable-next-line no-console
        console.log('[SniperBotWebSocket] Connected to WebSocket');
        this.reconnectAttempts = 0;
        // Don't call onConnect yet - wait for welcome message and subscription confirmation
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as SniperWebSocketMessage;
          this.handleMessage(data);
        } catch (error) {
          this.config?.onError?.(error instanceof Error ? error : new Error('Failed to parse WebSocket message'));
        }
      };

      this.ws.onerror = () => {
        this.config?.onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = (event) => {
        // eslint-disable-next-line no-console
        console.log('[SniperBotWebSocket] WebSocket closed', { code: event.code, reason: event.reason });
        this.ws = null;
        this.isSubscribed = false;
        this.config?.onDisconnect?.();

        if (isAuthenticationError(event)) {
          this.isManualClose = true;
          const errorMsg = event.reason || 'Authentication failed. Please check your API key.';
          this.config?.onError?.(new Error(errorMsg));
          return;
        }

        if (!this.isManualClose && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          // eslint-disable-next-line no-console
          console.log(`[SniperBotWebSocket] Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          this.reconnectTimeout = setTimeout(() => {
            this.attemptConnection();
          }, RECONNECT_DELAY);
        } else if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          this.config?.onError?.(new Error('Max reconnection attempts reached'));
        }
      };
    } catch (error) {
      this.config?.onError?.(error instanceof Error ? error : new Error('Failed to create WebSocket'));
    }
  }

  private subscribeToEvents(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to deploy and migration events
    const subscriptionMessage = {
      action: 'subscribe',
      subscriptions: ['deploy', 'migration']
    };

    // eslint-disable-next-line no-console
    console.log('[SniperBotWebSocket] Subscribing to deploy and migration events');
    this.ws.send(JSON.stringify(subscriptionMessage));
  }

  private handleMessage(data: SniperWebSocketMessage): void {
    if (!this.config) return;

    // Handle welcome message - subscribe after receiving it
    if (data.type === 'welcome') {
      // eslint-disable-next-line no-console
      console.log('[SniperBotWebSocket] Welcome message received');
      this.subscribeToEvents();
      return;
    }

    // Handle connection confirmation
    if (data.type === 'connection') {
      // eslint-disable-next-line no-console
      console.log('[SniperBotWebSocket] Connection confirmed:', data.clientId);
      return;
    }

    // Handle subscription confirmation
    if (data.type === 'subscription_confirmed' || data.type === 'event_subscription_confirmed') {
      // eslint-disable-next-line no-console
      console.log('[SniperBotWebSocket] Subscription confirmed:', data.subscriptions);
      this.isSubscribed = true;
      this.config.onConnect?.();
      return;
    }

    // Handle deploy events
    if (data.type === 'deploy' && data.data) {
      const deployData = data.data as DeployEventData;
      
      // Validate required fields
      if (!deployData.mint || !deployData.platform) {
        return;
      }

      const deployEvent: DeployEvent = {
        type: 'deploy',
        timestamp: data.timestamp || Date.now(),
        data: deployData
      };

      // eslint-disable-next-line no-console
      console.log('[SniperBotWebSocket] Deploy event:', deployData.symbol, deployData.name, deployData.platform);
      this.config.onDeploy(deployEvent);
      return;
    }

    // Handle migration events
    if (data.type === 'migration' && data.data) {
      const migrationData = data.data as MigrationEventData;
      
      // Validate required fields
      if (!migrationData.mint) {
        return;
      }

      const migrationEvent: MigrationEvent = {
        type: 'migration',
        timestamp: data.timestamp || Date.now(),
        data: migrationData
      };

      // eslint-disable-next-line no-console
      console.log('[SniperBotWebSocket] Migration event:', migrationData.mint, migrationData.platform);
      this.config.onMigration(migrationEvent);
      return;
    }

    // Handle error messages
    if (data.type === 'error') {
      const errorMessage = data.message || data.error || 'Unknown server error';
      
      if (isAuthenticationErrorMessage(errorMessage)) {
        this.isManualClose = true;
        this.ws?.close();
      }
      
      this.config.onError?.(new Error(errorMessage));
      return;
    }
  }

  disconnect(): void {
    this.isManualClose = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      // Unsubscribe from events before closing
      if (this.isSubscribed && this.ws.readyState === WebSocket.OPEN) {
        const unsubscribeMessage = {
          action: 'unsubscribe',
          subscriptions: ['deploy', 'migration']
        };
        this.ws.send(JSON.stringify(unsubscribeMessage));
      }

      this.ws.close();
      this.ws = null;
    }

    this.isSubscribed = false;
    this.config = null;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.isSubscribed;
  }

  /**
   * Update the API key and reconnect
   */
  updateApiKey(apiKey: string): void {
    if (!this.config) return;
    
    this.config.apiKey = apiKey;
    
    // Reconnect with new API key
    this.disconnect();
    this.isManualClose = false;
    this.connect(this.config);
  }
}
