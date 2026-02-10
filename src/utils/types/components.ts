/**
 * Component Type Definitions
 *
 * This module contains all UI component-related type definitions
 * for the Solana trading application, including modal props,
 * page props, and shared UI component interfaces.
 */

import type { WalletType, MasterWallet } from "./wallet";


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


/**
 * Mobile page type
 */
export type MobilePage = "chart" | "actions";

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
    Frame: React.ReactNode;
    ActionsPage: React.ReactNode;
  };
}

/**
 * Wallet amount for modal operations
 */
export interface WalletAmount {
  /** Wallet address */
  address: string;
  /** Amount as string for input handling */
  amount: string;
}
