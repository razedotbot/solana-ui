/**
 * Centralized iframe communication manager
 * Handles message queuing, deduplication, and request coalescing
 */

export interface NavigateMessage {
  type: 'NAVIGATE';
  view: 'holdings' | 'token' | 'monitor';
  tokenMint?: string;
  wallets?: string[];
}

export interface WalletMessage {
  type: 'ADD_WALLETS' | 'CLEAR_WALLETS';
  wallets?: Array<string | { address: string; label?: string }>;
}

export type IframeMessage = NavigateMessage | WalletMessage | {
  type: 'TOGGLE_NON_WHITELISTED_TRADES';
  enabled: boolean;
} | {
  type: 'GET_WALLETS';
} | {
  type: 'SET_QUICK_BUY_CONFIG';
  config: {
    enabled: boolean;
    amount: number;
    minAmount: number;
    maxAmount: number;
    useRange: boolean;
  };
};

interface QueuedMessage {
  message: IframeMessage;
  timestamp: number;
}

class IframeManager {
  private iframeWindow: Window | null = null;
  private isReady: boolean = false;
  private messageQueue: QueuedMessage[] = [];
  private lastNavigateMessage: NavigateMessage | null = null;
  private lastWalletMessage: WalletMessage | null = null;
  private navigateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly NAVIGATE_DEBOUNCE_MS = 100;

  /**
   * Set the iframe window reference
   */
  setIframeWindow(window: Window | null): void {
    this.iframeWindow = window;
  }

  /**
   * Mark iframe as ready and process queued messages
   */
  setReady(ready: boolean): void {
    this.isReady = ready;
    if (ready) {
      this.processQueue();
    }
  }

  /**
   * Check if iframe is ready
   */
  getReady(): boolean {
    return this.isReady;
  }

  /**
   * Send a message to the iframe with deduplication
   */
  sendMessage(message: IframeMessage): void {
    if (!this.isReady || !this.iframeWindow) {
      this.messageQueue.push({ message, timestamp: Date.now() });
      return;
    }

    // Deduplicate navigation messages
    if (message.type === 'NAVIGATE') {
      this.sendNavigateMessage(message);
      return;
    }

    // Deduplicate wallet messages
    if (message.type === 'ADD_WALLETS' || message.type === 'CLEAR_WALLETS') {
      this.sendWalletMessage(message);
      return;
    }

    // Send other messages immediately
    this.iframeWindow.postMessage(message, '*');
  }

  /**
   * Send navigation message with debouncing and deduplication
   */
  private sendNavigateMessage(message: NavigateMessage): void {
    // Clear any pending navigation
    if (this.navigateDebounceTimer) {
      clearTimeout(this.navigateDebounceTimer);
      this.navigateDebounceTimer = null;
    }

    // Check if this is a duplicate of the last message
    if (this.isDuplicateNavigate(message)) {
      return;
    }

    // Debounce rapid navigation changes
    this.navigateDebounceTimer = setTimeout(() => {
      if (this.iframeWindow) {
        this.lastNavigateMessage = message;
        this.iframeWindow.postMessage(message, '*');
      }
      this.navigateDebounceTimer = null;
    }, this.NAVIGATE_DEBOUNCE_MS);
  }

  /**
   * Send wallet message with deduplication
   */
  private sendWalletMessage(message: WalletMessage): void {
    // Check if this is a duplicate
    if (this.isDuplicateWallet(message)) {
      return;
    }

    this.lastWalletMessage = message;
    if (this.iframeWindow) {
      this.iframeWindow.postMessage(message, '*');
    }
  }

  /**
   * Check if navigation message is duplicate
   */
  private isDuplicateNavigate(message: NavigateMessage): boolean {
    if (!this.lastNavigateMessage) return false;

    const last = this.lastNavigateMessage;
    return (
      last.view === message.view &&
      last.tokenMint === message.tokenMint &&
      JSON.stringify(last.wallets?.sort()) === JSON.stringify(message.wallets?.sort())
    );
  }

  /**
   * Check if wallet message is duplicate
   */
  private isDuplicateWallet(message: WalletMessage): boolean {
    if (!this.lastWalletMessage) return false;

    const last = this.lastWalletMessage;
    if (last.type !== message.type) return false;

    if (message.type === 'CLEAR_WALLETS') {
      return last.type === 'CLEAR_WALLETS';
    }

    // Compare wallet arrays for ADD_WALLETS
    const normalizeWallets = (wallets?: Array<string | { address: string; label?: string }>): string[] => {
      if (!wallets) return [];
      return wallets.map(w => typeof w === 'string' ? w : w.address).sort();
    };

    const lastWallets = normalizeWallets(last.wallets);
    const currentWallets = normalizeWallets(message.wallets);
    return JSON.stringify(lastWallets) === JSON.stringify(currentWallets);
  }

  /**
   * Process queued messages
   */
  private processQueue(): void {
    while (this.messageQueue.length > 0 && this.isReady && this.iframeWindow) {
      const queued = this.messageQueue.shift();
      if (queued) {
        this.sendMessage(queued.message);
      }
    }
    this.messageQueue = [];
  }

  /**
   * Clear all queued messages
   */
  clearQueue(): void {
    this.messageQueue = [];
    if (this.navigateDebounceTimer) {
      clearTimeout(this.navigateDebounceTimer);
      this.navigateDebounceTimer = null;
    }
  }

  /**
   * Reset state (useful for cleanup)
   */
  reset(): void {
    this.clearQueue();
    this.lastNavigateMessage = null;
    this.lastWalletMessage = null;
    this.isReady = false;
    this.iframeWindow = null;
  }
}

// Singleton instance
export const iframeManager = new IframeManager();

