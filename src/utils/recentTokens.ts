import type { RecentToken } from '../types/recentTokens';

const STORAGE_KEY = 'raze_recent_tokens';
const MAX_RECENT_TOKENS = 10;

/**
 * Add a token to recent history
 */
export const addRecentToken = (
  address: string,
  symbol?: string,
  name?: string
): void => {
  try {
    const recent = getRecentTokens();
    
    // Remove existing entry if present (deduplication)
    const filtered = recent.filter(t => t.address !== address);
    
    // Add new entry at the beginning
    const newToken: RecentToken = {
      address,
      symbol,
      name,
      lastViewed: Date.now()
    };
    
    filtered.unshift(newToken);
    
    // Keep only MAX_RECENT_TOKENS
    const trimmed = filtered.slice(0, MAX_RECENT_TOKENS);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Storage quota exceeded - clear old data and retry
      console.warn('localStorage quota exceeded, clearing recent tokens');
      clearRecentTokens();
      try {
        const newToken: RecentToken = {
          address,
          symbol,
          name,
          lastViewed: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([newToken]));
      } catch (retryError) {
        console.error('Error adding recent token after clearing:', retryError);
      }
    } else {
      console.error('Error adding recent token:', error);
    }
  }
};

/**
 * Get all recent tokens
 */
export const getRecentTokens = (): RecentToken[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed: unknown = JSON.parse(stored);
    
    // Validate data structure
    if (!Array.isArray(parsed)) {
      console.warn('Invalid recent tokens data structure, clearing');
      clearRecentTokens();
      return [];
    }
    
    // Filter out invalid tokens with proper type guard
    const validated = parsed.filter((token: unknown): token is RecentToken => {
      if (typeof token !== 'object' || token === null) return false;
      const t = token as Record<string, unknown>;
      const address = t['address'];
      const lastViewed = t['lastViewed'];
      return (
        typeof address === 'string' &&
        address.length > 0 &&
        typeof lastViewed === 'number' &&
        lastViewed > 0
      );
    });
    
    // If validation removed items, update storage
    if (validated.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    }
    
    return validated;
  } catch (error) {
    console.error('Error loading recent tokens:', error);
    // Clear corrupted data
    clearRecentTokens();
    return [];
  }
};

/**
 * Clear all recent tokens
 */
export const clearRecentTokens = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recent tokens:', error);
  }
};

/**
 * Remove a specific token from recent history
 */
export const removeRecentToken = (address: string): void => {
  try {
    const recent = getRecentTokens();
    const filtered = recent.filter(t => t.address !== address);
    
    if (filtered.length === 0) {
      clearRecentTokens();
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error('Error removing recent token:', error);
  }
};

/**
 * Format timestamp to relative time
 */
export const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};
