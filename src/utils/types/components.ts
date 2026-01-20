/**
 * Component Type Definitions
 *
 * This module contains all UI component-related type definitions
 * for the Solana trading application, including modal props,
 * page props, and shared UI component interfaces.
 */

import type { Connection } from "@solana/web3.js";
import type { WalletType, MasterWallet } from "./wallet";

// ============================================================================
// Common UI Types
// ============================================================================

/**
 * Toast notification type
 */
export type ToastType = "success" | "error" | "info" | "warning";

/**
 * Toast notification interface
 */
export interface Toast {
  /** Unique identifier */
  id: string;
  /** Toast message */
  message: string;
  /** Toast type */
  type: ToastType;
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Tab configuration for preset tabs
 */
export interface PresetTab {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Tab configuration */
  config?: Record<string, unknown>;
  /** Whether the tab is active */
  isActive?: boolean;
}

// ============================================================================
// Modal Props Types
// ============================================================================

/**
 * Funding mode for fund modal
 */
export type FundingMode = "distribute" | "mixer";

/**
 * Props for the Fund Modal component
 */
export interface FundModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** List of available wallets */
  wallets: WalletType[];
  /** Map of wallet addresses to SOL balances */
  solBalances: Map<string, number>;
  /** Solana connection instance */
  connection: Connection;
  /** Initial funding mode */
  initialMode?: FundingMode;
}

/**
 * Props for the Transfer Modal component
 */
export interface TransferModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** List of available wallets */
  wallets: WalletType[];
  /** Map of wallet addresses to SOL balances */
  solBalances: Map<string, number>;
  /** Solana connection instance */
  connection: Connection;
  /** Token address for token transfers */
  tokenAddress?: string;
  /** Map of wallet addresses to token balances */
  tokenBalances?: Map<string, number>;
}

/**
 * Props for the Mixer Modal component
 */
export interface MixerModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** List of available wallets */
  wallets: WalletType[];
  /** Map of wallet addresses to SOL balances */
  solBalances: Map<string, number>;
  /** Solana connection instance */
  connection: Connection;
}

/**
 * Props for the Consolidate Modal component
 */
export interface ConsolidateModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** List of available wallets */
  wallets: WalletType[];
  /** Map of wallet addresses to SOL balances */
  solBalances: Map<string, number>;
  /** Solana connection instance */
  connection: Connection;
}

/**
 * Props for the Distribute Modal component
 */
export interface DistributeModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** List of available wallets */
  wallets: WalletType[];
  /** Map of wallet addresses to SOL balances */
  solBalances: Map<string, number>;
  /** Solana connection instance */
  connection: Connection;
}

/**
 * Props for the Deposit Modal component
 */
export interface DepositModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Wallet address to deposit to */
  walletAddress: string;
}

/**
 * Props for the Create Wallet Modal component
 */
export interface CreateWalletModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when wallet is created */
  onWalletCreated: (wallet: WalletType) => void;
}

/**
 * Props for the Import Wallet Modal component
 */
export interface ImportWalletModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when wallet is imported */
  onWalletImported: (wallet: WalletType) => void;
}

/**
 * Props for the Create Master Wallet Modal component
 */
export interface CreateMasterWalletModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when master wallet is created */
  onMasterWalletCreated: (masterWallet: MasterWallet) => void;
}

/**
 * Props for the Export Seed Phrase Modal component
 */
export interface ExportSeedPhraseModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Master wallet to export seed phrase from */
  masterWallet: MasterWallet;
}

/**
 * Props for the Burn Modal component
 */
export interface BurnModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** List of available wallets */
  wallets: WalletType[];
  /** Token address to burn */
  tokenAddress: string;
  /** Map of wallet addresses to token balances */
  tokenBalances: Map<string, number>;
}

/**
 * Props for the Quick Trade Modal component
 */
export interface QuickTradeModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Token address to trade */
  tokenAddress: string;
  /** Trade type */
  tradeType: "buy" | "sell";
  /** List of available wallets */
  wallets: WalletType[];
  /** Map of wallet addresses to SOL balances */
  solBalances: Map<string, number>;
  /** Map of wallet addresses to token balances */
  tokenBalances: Map<string, number>;
}

/**
 * Props for the Wallet Quick Trade Modal component
 */
export interface WalletQuickTradeModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Wallet to trade with */
  wallet: WalletType;
  /** Token address to trade */
  tokenAddress: string;
  /** SOL balance of the wallet */
  solBalance: number;
  /** Token balance of the wallet */
  tokenBalance: number;
}

/**
 * Props for the Calculate PNL Modal component
 */
export interface CalculatePNLModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Wallet address to calculate PNL for */
  walletAddress: string;
  /** Token address */
  tokenAddress: string;
}

// ============================================================================
// Page Props Types
// ============================================================================

/**
 * Mobile page type
 */
export type MobilePage = "wallets" | "chart" | "actions";

/**
 * Props for the Mobile Layout component
 */
export interface MobileLayoutProps {
  /** Current active page */
  currentPage: MobilePage;
  /** Callback to change page */
  setCurrentPage: (page: MobilePage) => void;
  /** Child components for each page */
  children: {
    WalletsPage: React.ReactNode;
    Frame: React.ReactNode;
    ActionsPage: React.ReactNode;
  };
}

/**
 * Props for the Wallets Page component
 */
export interface WalletsPageProps {
  /** List of wallets */
  wallets: WalletType[];
  /** Callback to update wallets */
  setWallets: (wallets: WalletType[]) => void;
  /** Map of wallet addresses to SOL balances */
  solBalances: Map<string, number>;
  /** Map of wallet addresses to token balances */
  tokenBalances: Map<string, number>;
  /** Solana connection instance */
  connection: Connection;
  /** Current token address */
  tokenAddress: string;
}

/**
 * Props for the Deploy Page component
 */
export interface DeployPageProps {
  /** List of wallets */
  wallets: WalletType[];
  /** Map of wallet addresses to SOL balances */
  solBalances: Map<string, number>;
  /** Solana connection instance */
  connection: Connection;
}

/**
 * Props for the Settings Page component
 */
export interface SettingsPageProps {
  /** Callback to close settings */
  onClose?: () => void;
}

// ============================================================================
// Wallet Amount Types
// ============================================================================

/**
 * Wallet amount for modal operations
 */
export interface WalletAmount {
  /** Wallet address */
  address: string;
  /** Amount as string for input handling */
  amount: string;
}

// ============================================================================
// Transfer Queue Types
// ============================================================================

/**
 * Transfer status
 */
export type TransferStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Transfer queue item for batch transfers
 */
export interface TransferQueueItem {
  /** Source wallet private key */
  sourceWallet: string;
  /** Recipient address */
  recipient: string;
  /** Amount to transfer */
  amount: string;
  /** Transfer status */
  status: TransferStatus;
  /** Error message if failed */
  error?: string;
  /** Transaction signature if completed */
  signature?: string;
}
