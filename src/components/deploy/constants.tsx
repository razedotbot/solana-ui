import { Zap, Sparkles, Wallet, Layers } from "lucide-react";
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

export const PlatformIcons: Record<PlatformType, JSX.Element> = {
  pumpfun: (
    <svg width="24" height="24" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(45 256 256)">
        <path d="M156 256V156a100 100 0 0 1 200 0v100Z" fill="#f2f7f8" />
        <path d="M156 256v100a100 100 0 0 0 200 0V256Z" fill="#4dd994" />
        <path d="M356 256V156a100 100 0 0 0-56-90q20 34 20 90v100Z" fill="#c1cdd2" />
        <path d="M356 256v100a100 100 0 0 1-56 90q20-36 20-90V256Z" fill="#2a9d70" />
        <path stroke="#163430" strokeWidth="24" strokeLinecap="round" d="M156 256h200" />
        <rect x="156" y="56" width="200" height="400" rx="100" ry="100" fill="none" stroke="#163430" strokeWidth="24" />
      </g>
    </svg>
  ),
  bonk: (
    <svg width="24" height="24" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#bonk-clip)">
        <path d="M104 162.1s-15.5 19.55-10.35 108c0 0-33.85 86.75-22.35 131.05 11.5 44.2 56.25 42 56.25 42s71.8 63.1 126.9 7.5c55.2-55.85-45.95-271.8-45.95-271.8l-12.65-74.65s-13.8 10.9-12.05 82.75c1.75 71.8-28.15 21.2-28.15 21.2z" fill="#3c2d0c" />
        <path d="m109.75 240.3-19 53.45-6.9 37.35s-23.55 83.4 73.6 82.15c0 0 75.8 67.85 125.25 22.4l13.25-14.4 23-35.65 37.95-113.2s-12.1-77.55-88.5-109.7c0 0-6.3-3.35-17.8 1.2 0 0-31.65-71.25-51.7-62.6 0 0-17.2 9.15-2.35 79.35L169.6 192.7s-29.5-56-56.8-44.75c-25.45 10.2-3.05 92.35-3.05 92.35" fill="#e78c19" />
      </g>
      <defs><clipPath id="bonk-clip"><path fill="#fff" d="M0 0h500v500H0z" /></clipPath></defs>
    </svg>
  ),
  meteoraDBC: (
    <svg width="24" height="24" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M185.89 66.887c3.313-3.314 8.445-3.119 10.567.39 2.296 3.767 4.029 7.839 5.263 12.105.693 2.425-.109 5.261-2.122 7.275l-64.902 64.902c-3.919 3.92-8.792 6.626-13.967 7.731l-5.393 1.147c-5.154 1.126-10.07 3.834-13.968 7.732l-49.829 49.829c-2.122-8.186-3.053-13.708 3.595-20.357zm14.055 27.96c2.166-2.165 5.501-.909 5.285 1.95-1.343 17.497-9.68 35.926-24.535 50.782-11.326 12.409-43.29 31.379-66.136 44.091-4.678 2.598-8.49-2.945-4.656-6.779l90.021-90.021z" fill="url(#meteora-g1)" />
      <defs>
        <linearGradient id="meteora-g1" x1="236" y1="22" x2="68" y2="218" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5bd00" /><stop offset=".4" stopColor="#f54b00" /><stop offset="1" stopColor="#6e45ff" />
        </linearGradient>
      </defs>
    </svg>
  ),
  meteoraCPAMM: (
    <svg width="24" height="24" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M185.89 66.887c3.313-3.314 8.445-3.119 10.567.39 2.296 3.767 4.029 7.839 5.263 12.105.693 2.425-.109 5.261-2.122 7.275l-64.902 64.902c-3.919 3.92-8.792 6.626-13.967 7.731l-5.393 1.147c-5.154 1.126-10.07 3.834-13.968 7.732l-49.829 49.829c-2.122-8.186-3.053-13.708 3.595-20.357zm14.055 27.96c2.166-2.165 5.501-.909 5.285 1.95-1.343 17.497-9.68 35.926-24.535 50.782-11.326 12.409-43.29 31.379-66.136 44.091-4.678 2.598-8.49-2.945-4.656-6.779l90.021-90.021z" fill="url(#meteora-g2)" />
      <defs>
        <linearGradient id="meteora-g2" x1="236" y1="22" x2="68" y2="218" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00d4ff" /><stop offset=".4" stopColor="#0099ff" /><stop offset="1" stopColor="#0055ff" />
        </linearGradient>
      </defs>
    </svg>
  ),
};

export const PLATFORMS: PlatformConfig[] = [
  { id: "pumpfun", name: "Pump.fun", desc: "Bonding curve", color: "emerald" },
  { id: "bonk", name: "Bonk.fun", desc: "Bot integration", color: "orange" },
  { id: "meteoraDBC", name: "Meteora DBC", desc: "Dynamic curve", color: "amber" },
  { id: "meteoraCPAMM", name: "Meteora AMM", desc: "Liquidity pool", color: "blue" },
];

export const TABS: TabConfig[] = [
  { id: "platform", label: "Platform", icon: <Zap size={18} />, description: "Select Platform" },
  { id: "token", label: "Token", icon: <Sparkles size={18} />, description: "Token Details" },
  { id: "wallets", label: "Wallets", icon: <Wallet size={18} />, description: "Primary Wallets" },
  { id: "deploys", label: "Deploys", icon: <Layers size={18} />, description: "Additional Tokens" },
];
