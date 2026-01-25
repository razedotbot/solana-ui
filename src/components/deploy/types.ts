import type { PlatformType } from "../../utils/create";

export const MIN_WALLETS = 1;
export const MAX_WALLETS_STANDARD = 5;
export const MAX_WALLETS_ADVANCED = 20;
export const MAX_TOKENS_PER_DEPLOY = 20; // Total max tokens across all platforms
export const MAX_TOKENS_PER_PLATFORM = 5; // Max tokens per individual platform
export const DELAY_BETWEEN_DEPLOYS_MS = 2000;

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitter: string;
  telegram: string;
  website: string;
}

export interface AdditionalToken {
  platform: PlatformType;
  pumpType: boolean;
  pumpMode: "simple" | "advanced";
  bonkType: "meme" | "tech";
  bonkMode: "simple" | "advanced";
  meteoraDBCMode: "simple" | "advanced";
  meteoraDBCConfigAddress: string;
  meteoraCPAMMConfigAddress: string;
  meteoraCPAMMInitialLiquidity: string;
  meteoraCPAMMInitialTokenPercent: string;
  // Per-token wallet configuration
  useCustomWallets?: boolean;
  wallets?: string[]; // private keys
  walletAmounts?: Record<string, string>;
}

export interface DeploymentProgressItem {
  tokenIndex: number;
  status: "pending" | "deploying" | "success" | "failed";
  mintAddress?: string;
  error?: string;
}

export type DeployTab = "platform" | "token" | "wallets" | "deploys";

export interface TabConfig {
  id: DeployTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export interface PlatformConfig {
  id: PlatformType;
  name: string;
  desc: string;
  color: string;
}
