/**
 * WebSocket manager for fetching trade data independently
 * Connects to the same WebSocket endpoint that Furyframe uses
 */

export interface NonWhitelistedTrade {
  type: 'buy' | 'sell';
  address: string;
  tokensAmount: number;
  avgPrice: number;
  solAmount: number;
  timestamp: number;
  signature: string;
  tokenMint: string;
  marketCap: number;
  walletAddress?: string;
}

export interface TradeWebSocketConfig {
  tokenMint: string;
  solPrice: number;
  tokenSupply: number;
  onTrade: (trade: NonWhitelistedTrade) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// WebSocket message types
interface WebSocketWelcomeMessage {
  type: 'welcome';
  message?: string;
}

interface WebSocketConnectionMessage {
  type: 'connection';
  clientId?: string;
}

interface WebSocketSubscriptionMessage {
  type: 'event_subscription_confirmed';
}

interface WebSocketTradeMessage {
  type: 'trade' | 'transaction';
  transaction?: TradeTransactionData;
  data?: TradeTransactionData;
  priceInfo?: {
    solPrice?: number;
  };
  timestamp?: number;
  signature?: string;
  tokenMint?: string;
  mint?: string;
}

interface WebSocketErrorMessage {
  type: 'error';
  message?: string;
  error?: string;
}

interface TradeTransactionData {
  tokenMint?: string;
  mint?: string;
  type?: string;
  transactionType?: string;
  tradeType?: string;
  tokenAmount?: string | number;
  tokensAmount?: string | number;
  solAmount?: string | number;
  avgPrice?: string | number;
  avgPriceUsd?: string | number;
  signature?: string;
  signer?: string;
  trader?: string;
  timestamp?: number;
}

type WebSocketMessage = WebSocketWelcomeMessage | WebSocketConnectionMessage | WebSocketSubscriptionMessage | WebSocketTradeMessage | WebSocketErrorMessage;

const WS_URL = 'wss://sol.fury.bot';
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10;

export class TradeWebSocketManager {
  private ws: WebSocket | null = null;
  private config: TradeWebSocketConfig | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private subscribedTokenMint: string | null = null;

  /**
   * Connect to WebSocket and subscribe to trade events
   */
  connect(config: TradeWebSocketConfig): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Already connected, just update config and resubscribe if token changed
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
    if (this.isManualClose) {
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        // eslint-disable-next-line no-console
        console.log('[TradeWebSocket] Connected to WebSocket');
        this.reconnectAttempts = 0;
        this.config?.onConnect?.();

        // Subscribe to trade events
        this.subscribeToTradeEvents();
        
        // Subscribe to specific token if provided
        if (this.config?.tokenMint) {
          this.subscribeToToken(this.config.tokenMint);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as WebSocketMessage;
          this.handleMessage(data);
        } catch (error) {
          // Silently handle parse errors
          this.config?.onError?.(error instanceof Error ? error : new Error('Failed to parse WebSocket message'));
        }
      };

      this.ws.onerror = () => {
        this.config?.onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        // eslint-disable-next-line no-console
        console.log('[TradeWebSocket] WebSocket closed');
        this.ws = null;
        this.config?.onDisconnect?.();

        // Attempt to reconnect if not manually closed
        if (!this.isManualClose && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          // eslint-disable-next-line no-console
          console.log(`[TradeWebSocket] Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          
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

  private subscribeToTradeEvents(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const subscriptionMessage = {
      action: 'subscribe',
      subscriptions: ['trade']
    };

    // eslint-disable-next-line no-console
    console.log('[TradeWebSocket] Subscribing to trade events');
    this.ws.send(JSON.stringify(subscriptionMessage));
  }

  private subscribeToToken(tokenMint: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Subscribe to specific token mint (matching Furyframe format)
    const tokenSubscription = {
      action: 'subscribe',
      tokenMint: tokenMint
    };

    // eslint-disable-next-line no-console
    console.log(`[TradeWebSocket] Subscribing to token: ${tokenMint}`);
    this.ws.send(JSON.stringify(tokenSubscription));
    this.subscribedTokenMint = tokenMint;
  }

  private handleMessage(data: WebSocketMessage): void {
    if (!this.config) {
      return;
    }

    // Handle welcome message
    if (data.type === 'welcome') {
      // eslint-disable-next-line no-console
      console.log('[TradeWebSocket] Welcome message:', 'message' in data ? data.message : undefined);
      return;
    }

    // Handle connection confirmation
    if (data.type === 'connection') {
      // eslint-disable-next-line no-console
      console.log('[TradeWebSocket] Connection confirmed:', 'clientId' in data ? data.clientId : undefined);
      return;
    }

    // Handle trade/transaction messages
    if (data.type === 'trade' || data.type === 'transaction') {
      this.processTradeMessage(data);
      return;
    }

    // Handle subscription confirmation
    if (data.type === 'event_subscription_confirmed') {
      // eslint-disable-next-line no-console
      console.log('[TradeWebSocket] Subscription confirmed');
      return;
    }

    // Handle errors
    if (data.type === 'error') {
      const errorMessage = ('message' in data ? data.message : undefined) || ('error' in data ? data.error : undefined) || 'Unknown server error';
      this.config.onError?.(new Error(errorMessage));
      return;
    }
  }

  private processTradeMessage(message: WebSocketTradeMessage): void {
    if (!this.config) {
      return;
    }

    try {
      // Extract transaction data from nested structure
      const txData: TradeTransactionData = message.transaction || message.data || {};
      
      // Extract token mint
      const tokenMint = txData.tokenMint || txData.mint || message.tokenMint || message.mint;
      
      // Filter by current token mint
      if (tokenMint && this.config.tokenMint && tokenMint !== this.config.tokenMint) {
        return; // Ignore trades for other tokens
      }

      // If no token mint in message but we have a subscribed token, use it
      const finalTokenMint = tokenMint || this.config.tokenMint;
      if (!finalTokenMint) {
        return; // Can't process without token mint
      }

      // Extract transaction type
      let transactionType = txData.type || txData.transactionType || txData.tradeType || 'buy';
      if (typeof transactionType === 'string') {
        transactionType = transactionType.toLowerCase();
        if (transactionType !== 'buy' && transactionType !== 'sell') {
          transactionType = 'buy'; // Default to buy
        }
      } else {
        transactionType = 'buy';
      }

      // Extract trade data with proper type handling
      const tokenAmountStr = txData.tokenAmount?.toString() || txData.tokensAmount?.toString() || '0';
      const tokensAmount = parseFloat(tokenAmountStr);
      const solAmountStr = txData.solAmount?.toString() || '0';
      const solAmount = parseFloat(solAmountStr);
      const avgPriceStr = txData.avgPrice?.toString() || txData.avgPriceUsd?.toString() || '0';
      const avgPrice = parseFloat(avgPriceStr);
      const signature = txData.signature || message.signature || '';
      const signer = txData.signer || txData.trader || '';
      const timestamp = txData.timestamp || message.timestamp || Date.now();

      // Calculate market cap
      const solPrice = message.priceInfo?.solPrice || this.config.solPrice;
      const tokenSupply = this.config.tokenSupply;
      const marketCap = (solPrice > 0 && avgPrice > 0 && tokenSupply > 0)
        ? avgPrice * solPrice * tokenSupply
        : 0;

      // Create trade object
      const trade: NonWhitelistedTrade = {
        type: transactionType as 'buy' | 'sell',
        address: signer,
        tokensAmount: isNaN(tokensAmount) ? 0 : tokensAmount,
        avgPrice: isNaN(avgPrice) ? 0 : avgPrice,
        solAmount: isNaN(solAmount) ? 0 : solAmount,
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
        signature: signature,
        tokenMint: finalTokenMint,
        marketCap: marketCap,
        walletAddress: signer // Same as address for non-whitelisted trades
      };

      // Call the callback
      this.config.onTrade(trade);
    } catch (error) {
      // Silently handle processing errors
      this.config.onError?.(error instanceof Error ? error : new Error('Failed to process trade message'));
    }
  }

  /**
   * Update token subscription
   */
  updateToken(tokenMint: string): void {
    if (!this.config) {
      return;
    }

    // Unsubscribe from previous token if different
    if (this.subscribedTokenMint && this.subscribedTokenMint !== tokenMint) {
      this.unsubscribeFromToken(this.subscribedTokenMint);
    }

    // Update config
    this.config.tokenMint = tokenMint;

    // Subscribe to new token if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.subscribeToToken(tokenMint);
    }
  }

  /**
   * Update SOL price for market cap calculations
   */
  updateSolPrice(solPrice: number): void {
    if (this.config) {
      this.config.solPrice = solPrice;
    }
  }

  /**
   * Update token supply for market cap calculations
   */
  updateTokenSupply(tokenSupply: number): void {
    if (this.config) {
      this.config.tokenSupply = tokenSupply;
    }
  }

  private unsubscribeFromToken(tokenMint: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const unsubscribeMessage = {
      action: 'unsubscribe',
      tokenMint: tokenMint
    };

    // eslint-disable-next-line no-console
    console.log(`[TradeWebSocket] Unsubscribing from token: ${tokenMint}`);
    this.ws.send(JSON.stringify(unsubscribeMessage));
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isManualClose = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      // Unsubscribe from token if subscribed
      if (this.subscribedTokenMint) {
        this.unsubscribeFromToken(this.subscribedTokenMint);
      }

      this.ws.close();
      this.ws = null;
    }

    this.subscribedTokenMint = null;
    this.config = null;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

