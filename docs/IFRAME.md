# Trading App Iframe Integration with TypeScript

This guide shows how to integrate the trading app as an iframe in your TypeScript application and control wallet whitelisting programmatically.

## Table of Contents

- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [TypeScript Types](#typescript-types)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Security Considerations](#security-considerations)
- [Error Handling](#error-handling)

## Installation

1. Embed the trading app as an iframe in your application:

```html
<iframe 
  id="trading-iframe" 
  src="https://iframe.raze.sh/sol/" 
  frameborder="0">
</iframe>
```

## Basic Setup

```typescript
// Get iframe reference
const iframe = document.getElementById('trading-iframe') as HTMLIFrameElement;

// Listen for messages from iframe
window.addEventListener('message', (event: MessageEvent<IframeResponse>) => {
  if (event.source !== iframe.contentWindow) return;
  
  handleIframeMessage(event.data);
});

// Send message to iframe
function sendMessage(message: IframeMessage): void {
  iframe.contentWindow?.postMessage(message, '*');
}
```

## TypeScript Types

```typescript
// Wallet types
interface Wallet {
  address: string;
  label?: string;
}

interface WhitelistItem {
  id: string;
  address: string;
  label?: string;
  isActive: boolean;
  addedAt: number;
}

// Message types sent TO iframe
type IframeMessage = 
  | AddWalletsMessage
  | ClearWalletsMessage
  | GetWalletsMessage;

interface AddWalletsMessage {
  type: 'ADD_WALLETS';
  wallets: (string | Wallet)[];
}

interface ClearWalletsMessage {
  type: 'CLEAR_WALLETS';
}

interface GetWalletsMessage {
  type: 'GET_WALLETS';
}

// Response types received FROM iframe
type IframeResponse = 
  | IframeReadyResponse
  | WalletsAddedResponse
  | WalletsClearedResponse
  | CurrentWalletsResponse;

interface IframeReadyResponse {
  type: 'IFRAME_READY';
}

interface WalletsAddedResponse {
  type: 'WALLETS_ADDED';
  success: boolean;
  count: number;
}

interface WalletsClearedResponse {
  type: 'WALLETS_CLEARED';
  success: boolean;
}

interface CurrentWalletsResponse {
  type: 'CURRENT_WALLETS';
  wallets: WhitelistItem[];
}
```

## API Reference

### Commands (Sent to Iframe)

#### ADD_WALLETS
Adds wallets to the whitelist.

```typescript
interface AddWalletsMessage {
  type: 'ADD_WALLETS';
  wallets: (string | Wallet)[];
}
```

**Wallet Formats:**
- String: `"ABCD"` or `"ABCD:Label"`
- Object: `{ address: "ABCD", label: "Label" }`

#### CLEAR_WALLETS
Removes all iframe-added wallets from the whitelist.

```typescript
interface ClearWalletsMessage {
  type: 'CLEAR_WALLETS';
}
```

#### GET_WALLETS
Retrieves current whitelist.

```typescript
interface GetWalletsMessage {
  type: 'GET_WALLETS';
}
```

### Responses (Received from Iframe)

#### IFRAME_READY
Sent when iframe is loaded and ready for communication.

#### WALLETS_ADDED
Confirms wallets were added successfully.

#### WALLETS_CLEARED
Confirms iframe wallets were cleared.

#### CURRENT_WALLETS
Returns current whitelist data.

#### WHITELIST_TRADING_STATS
Sent automatically whenever whitelist trading statistics update. Contains real-time trading data for whitelisted addresses.

```typescript
interface WhitelistTradingStatsResponse {
  type: 'WHITELIST_TRADING_STATS';
  data: {
    bought: number;    // Total SOL bought by whitelisted addresses
    sold: number;      // Total SOL sold by whitelisted addresses
    net: number;       // Net SOL (sold - bought)
    trades: number;    // Total number of trades
    solPrice: number;  // Current SOL price in USD
    timestamp: number; // When the stats were calculated
  };
}
```

#### SOL_PRICE_UPDATE
Sent automatically whenever the SOL price updates. Provides real-time SOL price data.

```typescript
interface SolPriceUpdateResponse {
  type: 'SOL_PRICE_UPDATE';
  data: {
    solPrice: number;  // Current SOL price in USD
    timestamp: number; // When the price was updated
  };
}
```

#### WHITELIST_TRADE
Sent automatically for each individual trade made by whitelisted addresses. Provides real-time individual trade data.

```typescript
interface WhitelistTradeResponse {
  type: 'WHITELIST_TRADE';
  data: {
    type: 'buy' | 'sell';     // Trade type
    address: string;          // Trader's wallet address (signer)
    tokensAmount: number;     // Amount of tokens traded
    avgPrice: number;         // Average price per token
    solAmount: number;        // SOL amount involved in trade
    timestamp: number;        // When the trade occurred
    signature: string;        // Transaction signature
  };
}
```

#### TOKEN_PRICE_UPDATE
Sent automatically for every trade (including non-whitelisted). Provides real-time token price updates from all trading activity.

```typescript
interface TokenPriceUpdateResponse {
  type: 'TOKEN_PRICE_UPDATE';
  data: {
    tokenPrice: number;       // Current token price from latest trade
    tokenMint: string;        // Token mint address
    timestamp: number;        // When the trade occurred
    tradeType: 'buy' | 'sell'; // Type of trade that updated the price
    volume: number;           // SOL volume of the trade
  };
}
```

## Usage Examples

### 1. Complete TypeScript Class

```typescript
class TradingAppIframe {
  private iframe: HTMLIFrameElement;
  private isReady: boolean = false;
  private messageQueue: IframeMessage[] = [];

  constructor(iframeId: string) {
    this.iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    window.addEventListener('message', (event: MessageEvent<IframeResponse>) => {
      if (event.source !== this.iframe.contentWindow) return;
      
      this.handleMessage(event.data);
    });
  }

  private handleMessage(data: IframeResponse): void {
    switch (data.type) {
      case 'IFRAME_READY':
        this.isReady = true;
        this.processMessageQueue();
        break;
      
      case 'WALLETS_ADDED':
        console.log(`Successfully added ${data.count} wallets`);
        break;
      
      case 'WALLETS_CLEARED':
        console.log('Cleared all iframe wallets');
        break;
      
      case 'CURRENT_WALLETS':
        console.log('Current wallets:', data.wallets);
        break;
      
      case 'WHITELIST_TRADING_STATS':
        console.log('Trading stats updated:', {
          bought: `${data.data.bought.toFixed(3)} SOL`,
          sold: `${data.data.sold.toFixed(3)} SOL`,
          net: `${data.data.net.toFixed(3)} SOL`,
          trades: data.data.trades,
          solPrice: `$${data.data.solPrice.toFixed(2)}`
        });
        // You can update your UI here with the new trading statistics
        this.updateTradingStatsUI(data.data);
        break;
      
      case 'SOL_PRICE_UPDATE':
        console.log('SOL price updated:', `$${data.data.solPrice.toFixed(2)}`);
        // You can update your UI here with the new SOL price
        this.updateSolPriceUI(data.data.solPrice);
        break;
      
      case 'WHITELIST_TRADE':
        console.log('New whitelist trade:', {
          type: data.data.type,
          address: data.data.address,
          tokensAmount: data.data.tokensAmount,
          avgPrice: data.data.avgPrice,
          solAmount: `${data.data.solAmount.toFixed(3)} SOL`
        });
        // You can update your UI here with the new trade data
        this.updateTradeUI(data.data);
        break;
      
      case 'TOKEN_PRICE_UPDATE':
        console.log('Token price updated:', {
          tokenPrice: data.data.tokenPrice,
          tokenMint: data.data.tokenMint,
          tradeType: data.data.tradeType,
          volume: `${data.data.volume.toFixed(3)} SOL`
        });
        // You can update your UI here with the new token price
        this.updateTokenPriceUI(data.data);
        break;
    }
  }

  private updateTradingStatsUI(stats: any): void {
    // Example: Update DOM elements with trading statistics
    // document.getElementById('bought-amount')?.textContent = `${stats.bought.toFixed(3)} SOL`;
    // document.getElementById('sold-amount')?.textContent = `${stats.sold.toFixed(3)} SOL`;
    // document.getElementById('net-amount')?.textContent = `${stats.net.toFixed(3)} SOL`;
    // document.getElementById('trade-count')?.textContent = stats.trades.toString();
  }

  private updateSolPriceUI(solPrice: number): void {
    // Example: Update DOM elements with SOL price
    // document.getElementById('sol-price')?.textContent = `$${solPrice.toFixed(2)}`;
  }

  private updateTradeUI(trade: any): void {
    // Example: Update DOM elements with new trade data
    // const tradeElement = document.createElement('div');
    // tradeElement.innerHTML = `${trade.type.toUpperCase()}: ${trade.tokensAmount} tokens at $${trade.avgPrice.toFixed(4)} by ${trade.address.slice(0, 8)}...`;
    // document.getElementById('trades-list')?.appendChild(tradeElement);
  }

  private updateTokenPriceUI(priceData: any): void {
    // Example: Update DOM elements with new token price
    // document.getElementById('token-price')?.textContent = `$${priceData.tokenPrice.toFixed(6)}`;
    // document.getElementById('last-trade-type')?.textContent = priceData.tradeType.toUpperCase();
    // document.getElementById('trade-volume')?.textContent = `${priceData.volume.toFixed(3)} SOL`;
  }

  private sendMessage(message: IframeMessage): void {
    if (!this.isReady) {
      this.messageQueue.push(message);
      return;
    }

    this.iframe.contentWindow?.postMessage(message, '*');
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  // Public API methods
  addWallets(wallets: (string | Wallet)[]): void {
    this.sendMessage({
      type: 'ADD_WALLETS',
      wallets
    });
  }

  clearWallets(): void {
    this.sendMessage({
      type: 'CLEAR_WALLETS'
    });
  }

  getCurrentWallets(): void {
    this.sendMessage({
      type: 'GET_WALLETS'
    });
  }
}
```

### 2. Usage with React Hook

```typescript
import { useEffect, useRef, useState } from 'react';

interface TradingStats {
  bought: number;
  sold: number;
  net: number;
  trades: number;
  timestamp: number;
}

interface WhitelistTrade {
  type: 'buy' | 'sell';
  address: string;
  tokensAmount: number;
  avgPrice: number;
  solAmount: number;
  timestamp: number;
  signature: string;
}

interface TokenPriceData {
  tokenPrice: number;
  tokenMint: string;
  timestamp: number;
  tradeType: 'buy' | 'sell';
  volume: number;
}

interface UseTradingIframeReturn {
  addWallets: (wallets: (string | Wallet)[]) => void;
  clearWallets: () => void;
  getCurrentWallets: () => void;
  isReady: boolean;
  currentWallets: WhitelistItem[];
  tradingStats: TradingStats | null;
  solPrice: number | null;
  recentTrades: WhitelistTrade[];
  tokenPrice: TokenPriceData | null;
}

export function useTradingIframe(iframeRef: React.RefObject<HTMLIFrameElement>): UseTradingIframeReturn {
  const [isReady, setIsReady] = useState(false);
  const [currentWallets, setCurrentWallets] = useState<WhitelistItem[]>([]);
  const [tradingStats, setTradingStats] = useState<TradingStats | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [recentTrades, setRecentTrades] = useState<WhitelistTrade[]>([]);
  const [tokenPrice, setTokenPrice] = useState<TokenPriceData | null>(null);
  const messageQueue = useRef<IframeMessage[]>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<IframeResponse>) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      
      switch (event.data.type) {
        case 'IFRAME_READY':
          setIsReady(true);
          // Process queued messages
          messageQueue.current.forEach(message => {
            sendMessage(message);
          });
          messageQueue.current = [];
          break;
        
        case 'CURRENT_WALLETS':
          setCurrentWallets(event.data.wallets);
          break;
        
        case 'WHITELIST_TRADING_STATS':
          setTradingStats(event.data.data);
          break;
        
        case 'SOL_PRICE_UPDATE':
          setSolPrice(event.data.data.solPrice);
          break;
        
        case 'WHITELIST_TRADE':
          setRecentTrades(prev => {
            const newTrades = [event.data.data, ...prev];
            // Keep only the last 50 trades to prevent memory issues
            return newTrades.slice(0, 50);
          });
          break;
        
        case 'TOKEN_PRICE_UPDATE':
          setTokenPrice(event.data.data);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [iframeRef]);

  const sendMessage = (message: IframeMessage): void => {
    if (!isReady || !iframeRef.current) {
      messageQueue.current.push(message);
      return;
    }

    iframeRef.current.contentWindow?.postMessage(message, '*');
  };

  const addWallets = (wallets: (string | Wallet)[]): void => {
    sendMessage({ type: 'ADD_WALLETS', wallets });
  };

  const clearWallets = (): void => {
    sendMessage({ type: 'CLEAR_WALLETS' });
  };

  const getCurrentWallets = (): void => {
    sendMessage({ type: 'GET_WALLETS' });
  };

  return {
    addWallets,
    clearWallets,
    getCurrentWallets,
    isReady,
    currentWallets,
    tradingStats,
    solPrice,
    recentTrades,
    tokenPrice
  };
}
```

### 3. React Component Example

```typescript
import React, { useRef } from 'react';

const TradingDashboard: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { addWallets, clearWallets, getCurrentWallets, isReady, tradingStats, solPrice, recentTrades, tokenPrice } = useTradingIframe(iframeRef);

  const handleAddExampleWallets = (): void => {
    const wallets: Wallet[] = [
      { address: 'ABCD', label: 'Whale Trader' },
      { address: 'EFGH', label: 'Smart Money' },
      { address: '1234' } // No label
    ];
    
    addWallets(wallets);
  };

  const handleAddStringWallets = (): void => {
    const wallets = [
      'XYZ1:DeFi Protocol',
      'XYZ2:Market Maker',
      'XYZ3' // No label
    ];
    
    addWallets(wallets);
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3>Trading App Controls</h3>
        <p>Status: {isReady ? 'Ready' : 'Loading...'}</p>
        
        <button onClick={handleAddExampleWallets} disabled={!isReady}>
          Add Example Wallets (Objects)
        </button>
        
        <button onClick={handleAddStringWallets} disabled={!isReady}>
          Add Example Wallets (Strings)
        </button>
        
        <button onClick={getCurrentWallets} disabled={!isReady}>
          Get Current Wallets
        </button>
        
        <button onClick={clearWallets} disabled={!isReady}>
          Clear Wallets
        </button>
      </div>
      
      {/* SOL Price Display */}
      {solPrice && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h4>Real-time SOL Price</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22C55E' }}>
            ${solPrice.toFixed(2)}
          </div>
        </div>
      )}
      
      {/* Trading Statistics Display */}
      {tradingStats && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h4>Whitelist Trading Statistics</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <div>
              <strong>Bought:</strong>
              <div style={{ color: '#22C55E' }}>{tradingStats.bought.toFixed(3)} SOL</div>
            </div>
            <div>
              <strong>Sold:</strong>
              <div style={{ color: '#EF4444' }}>{tradingStats.sold.toFixed(3)} SOL</div>
            </div>
            <div>
              <strong>Net:</strong>
              <div style={{ color: tradingStats.net >= 0 ? '#22C55E' : '#EF4444' }}>
                {tradingStats.net.toFixed(3)} SOL
              </div>
            </div>
            <div>
              <strong>Trades:</strong>
              <div>{tradingStats.trades}</div>
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
            Last updated: {new Date(tradingStats.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
      
      {/* Recent Trades Display */}
      {recentTrades.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h4>Recent Whitelist Trades</h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {recentTrades.map((trade, index) => (
              <div key={`${trade.signature}-${index}`} style={{
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: trade.type === 'buy' ? '#f0f9ff' : '#fef2f2',
                border: `1px solid ${trade.type === 'buy' ? '#3b82f6' : '#ef4444'}`,
                borderRadius: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{
                      fontWeight: 'bold',
                      color: trade.type === 'buy' ? '#3b82f6' : '#ef4444',
                      textTransform: 'uppercase'
                    }}>
                      {trade.type}
                    </span>
                    <span style={{ marginLeft: '10px', fontSize: '14px' }}>
                      {trade.tokensAmount.toLocaleString()} tokens @ ${trade.avgPrice.toFixed(4)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Trader: {trade.address.slice(0, 8)}...{trade.address.slice(-4)} | 
                  SOL Amount: {trade.solAmount.toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        src="http://localhost:3001"
        width="100%"
        height="800px"
        style={{ border: '1px solid #ccc' }}
      />
    </div>
  );
};

export default TradingDashboard;
```

### 4. Advanced Example with Error Handling

```typescript
class TradingAppManager {
  private iframe: HTMLIFrameElement;
  private isReady: boolean = false;
  private timeout: number = 10000; // 10 seconds

  constructor(iframeId: string) {
    this.iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    this.setupMessageListener();
  }

  async addWallets(wallets: (string | Wallet)[]): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('Iframe not ready'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for response'));
      }, this.timeout);

      const handleResponse = (event: MessageEvent<IframeResponse>) => {
        if (event.source !== this.iframe.contentWindow) return;
        
        if (event.data.type === 'WALLETS_ADDED') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleResponse);
          resolve(event.data.success);
        }
      };

      window.addEventListener('message', handleResponse);
      
      this.iframe.contentWindow?.postMessage({
        type: 'ADD_WALLETS',
        wallets
      }, '*');
    });
  }

  async getCurrentWallets(): Promise<WhitelistItem[]> {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('Iframe not ready'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for response'));
      }, this.timeout);

      const handleResponse = (event: MessageEvent<IframeResponse>) => {
        if (event.source !== this.iframe.contentWindow) return;
        
        if (event.data.type === 'CURRENT_WALLETS') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleResponse);
          resolve(event.data.wallets);
        }
      };

      window.addEventListener('message', handleResponse);
      
      this.iframe.contentWindow?.postMessage({
        type: 'GET_WALLETS'
      }, '*');
    });
  }
}
```

## Security Considerations

### 1. Origin Validation

In production, validate the origin of messages:

```typescript
window.addEventListener('message', (event: MessageEvent<IframeResponse>) => {
  // Validate origin
  if (event.origin !== 'https://your-trading-app-domain.com') {
    console.warn('Received message from untrusted origin:', event.origin);
    return;
  }
  
  // Process message
  handleMessage(event.data);
});
```

### 2. Content Security Policy

Add CSP headers to allow iframe embedding:

```
Content-Security-Policy: frame-ancestors 'self' https://trusted-domain.com;
```

### 3. Input Validation

Validate wallet addresses before sending:

```typescript
function isValidSolanaAddress(address: string): boolean {
  // Basic Solana address validation
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function validateWallets(wallets: (string | Wallet)[]): boolean {
  return wallets.every(wallet => {
    const address = typeof wallet === 'string' 
      ? wallet.split(':')[0] 
      : wallet.address;
    
    return address && address.length >= 3; // Allow partial addresses
  });
}
```

## Error Handling

```typescript
interface ErrorResponse {
  type: 'ERROR';
  message: string;
  code?: string;
}

//  message handler with error handling
function handleMessage(data: IframeResponse | ErrorResponse): void {
  if (data.type === 'ERROR') {
    console.error('Iframe error:', data.message);
    return;
  }
  
  // Handle normal responses
  switch (data.type) {
    case 'IFRAME_READY':
      console.log('Iframe ready for communication');
      break;
    // ... other cases
  }
}
```

## Best Practices

1. **Wait for Ready Signal**: Always wait for `IFRAME_READY` before sending commands
2. **Queue Messages**: Queue messages if iframe isn't ready yet
3. **Validate Input**: Validate wallet addresses before sending
4. **Handle Timeouts**: Implement timeouts for async operations
5. **Error Handling**: Always handle potential errors and edge cases
6. **Type Safety**: Use TypeScript types for better development experience
7. **Security**: Validate message origins in production

## Troubleshooting

### Common Issues

1. **Messages not received**: Check if iframe is fully loaded
2. **CORS errors**: Ensure proper CORS configuration
3. **Type errors**: Verify message structure matches interfaces
4. **Timeout errors**: Increase timeout or check network connectivity

### Debug Mode

```typescript
const DEBUG = true;

function debugLog(message: string, data?: any): void {
  if (DEBUG) {
    console.log(`[TradingIframe] ${message}`, data);
  }
}
```

This comprehensive guide should help you integrate the trading app iframe with full TypeScript support and proper error handling.