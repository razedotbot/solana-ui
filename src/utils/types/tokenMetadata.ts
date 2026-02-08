/**
 * Token Metadata Type Definitions
 *
 * Types for the token metadata API (https://public.raze.sh/api/metadata/{mint})
 * and the local cache layer.
 */

/** On-chain metadata from Metaplex or similar sources */
export interface TokenOnChainMetadata {
  name: string;
  symbol: string;
  uri: string;
  source: string;
}

/** Off-chain metadata fetched from the URI */
export interface TokenOffChainMetadata {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
}

/** Raw API response from public.raze.sh */
export interface TokenMetadataApiResponse {
  success: boolean;
  metadata: {
    tokenMint: string;
    onChain: TokenOnChainMetadata | null;
    offChain: TokenOffChainMetadata | null;
    metadataSource?: string;
    timestamp?: string;
  };
}

/** Resolved/cached token metadata used by the UI */
export interface TokenMetadataInfo {
  mint: string;
  name: string;
  symbol: string;
  image: string;
  fetchedAt: number;
}
