import { useState, useEffect } from "react";
import type { TokenMetadataApiResponse, TokenMetadataInfo } from "../types";

const STORAGE_KEY = "raze_token_metadata_cache";
const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 200;

// Module-level shared state (all hook instances share one cache)
const cache: Map<string, TokenMetadataInfo> = new Map();
const inflight: Map<string, Promise<TokenMetadataInfo | null>> = new Map();
let initialized = false;

function hydrateCache(): void {
  if (initialized) return;
  initialized = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const entries = JSON.parse(stored) as TokenMetadataInfo[];
      if (Array.isArray(entries)) {
        for (const entry of entries) {
          if (entry.mint && entry.fetchedAt) {
            cache.set(entry.mint, entry);
          }
        }
      }
    }
  } catch {
    // Corrupted data, ignore
  }
}

function persistCache(): void {
  try {
    const entries = Array.from(cache.values())
      .sort((a, b) => b.fetchedAt - a.fetchedAt)
      .slice(0, MAX_CACHE_SIZE);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full, ignore
  }
}

function isStale(entry: TokenMetadataInfo): boolean {
  return Date.now() - entry.fetchedAt > STALE_MS;
}

function isValidMint(mint: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint);
}

async function fetchMetadata(mint: string): Promise<TokenMetadataInfo | null> {
  const existing = inflight.get(mint);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const resp = await fetch(`https://public.raze.sh/api/metadata/${mint}`);
      if (!resp.ok) return null;
      const data = (await resp.json()) as TokenMetadataApiResponse;
      if (!data.success || !data.metadata) return null;

      const { onChain, offChain } = data.metadata;
      const info: TokenMetadataInfo = {
        mint,
        name: offChain?.name || onChain?.name || "",
        symbol: offChain?.symbol || onChain?.symbol || "",
        image: offChain?.image || "",
        fetchedAt: Date.now(),
      };

      cache.set(mint, info);
      persistCache();
      return info;
    } catch {
      return null;
    } finally {
      inflight.delete(mint);
    }
  })();

  inflight.set(mint, promise);
  return promise;
}

/** Synchronous cache-only lookup. Returns null if not cached. */
export function getTokenMetadataSync(mint: string): TokenMetadataInfo | null {
  hydrateCache();
  return cache.get(mint) ?? null;
}

/** Pre-fetch metadata for multiple mints in parallel. */
export function prefetchTokenMetadata(mints: string[]): void {
  hydrateCache();
  for (const mint of mints) {
    if (!mint || !isValidMint(mint)) continue;
    const cached = cache.get(mint);
    if (!cached || isStale(cached)) {
      void fetchMetadata(mint);
    }
  }
}

/** React hook: fetch + cache metadata for a single mint. */
export function useTokenMetadata(
  mint: string | undefined,
): { metadata: TokenMetadataInfo | null; isLoading: boolean } {
  hydrateCache();

  const [metadata, setMetadata] = useState<TokenMetadataInfo | null>(
    () => (mint && isValidMint(mint) ? cache.get(mint) ?? null : null),
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!mint || !isValidMint(mint)) {
      setMetadata(null);
      return;
    }

    const cached = cache.get(mint);
    if (cached && !isStale(cached)) {
      setMetadata(cached);
      return;
    }

    // Show stale data immediately while refetching
    if (cached) setMetadata(cached);

    setIsLoading(true);
    void fetchMetadata(mint).then((result) => {
      setMetadata(result ?? cached ?? null);
      setIsLoading(false);
    });
  }, [mint]);

  return { metadata, isLoading };
}
