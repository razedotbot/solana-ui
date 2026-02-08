import React from "react";
import {
  Plus,
  Key,
  Download,
  Upload,
  Share,
  GitMerge,
  Send,
  Trash2,
  Flame,
  Settings,
  Layers,
  Archive,
  Wallet,
  RefreshCw,
} from "lucide-react";
import type { Command } from "./CommandPalette";

export const createWalletCommands = (handlers: {
  onCreateWallet: () => void;
  onImportWallet: () => void;
  onCreateMasterWallet: () => void;
  onImportMasterWallet: () => void;
  onDistribute: () => void;
  onConsolidate: () => void;
  onTransfer: () => void;
  onDeposit: () => void;
  onExportKeys: () => void;
  onBurnTokens: () => void;
  onCleanup: () => void;
  onQuickTradeSettings: () => void;
  onManageGroups: () => void;
  onToggleArchived: () => void;
  onRefresh: () => void;
}): Command[] => [
  {
    id: "create-wallet",
    label: "Create Wallet",
    description: "Generate a new wallet",
    icon: React.createElement(Plus, { size: 16 }),
    shortcut: "N",
    category: "wallet",
    action: handlers.onCreateWallet,
  },
  {
    id: "import-wallet",
    label: "Import Wallet",
    description: "Import from private key",
    icon: React.createElement(Key, { size: 16 }),
    shortcut: "I",
    category: "wallet",
    action: handlers.onImportWallet,
  },
  {
    id: "create-master",
    label: "Create Master Wallet",
    description: "Create HD wallet with seed phrase",
    icon: React.createElement(Wallet, { size: 16 }),
    category: "wallet",
    action: handlers.onCreateMasterWallet,
  },
  {
    id: "import-master",
    label: "Import Master Wallet",
    description: "Import from seed phrase",
    icon: React.createElement(Upload, { size: 16 }),
    category: "wallet",
    action: handlers.onImportMasterWallet,
  },
  {
    id: "distribute",
    label: "Distribute Funds",
    description: "Split SOL across wallets",
    icon: React.createElement(Share, { size: 16 }),
    category: "funds",
    action: handlers.onDistribute,
  },
  {
    id: "consolidate",
    label: "Consolidate",
    description: "Merge funds to one wallet",
    icon: React.createElement(GitMerge, { size: 16 }),
    category: "funds",
    action: handlers.onConsolidate,
  },
  {
    id: "transfer",
    label: "Transfer",
    description: "Send between wallets",
    icon: React.createElement(Send, { size: 16 }),
    category: "funds",
    action: handlers.onTransfer,
  },
  {
    id: "deposit",
    label: "Deposit",
    description: "Add funds from external",
    icon: React.createElement(Download, { size: 16 }),
    category: "funds",
    action: handlers.onDeposit,
  },
  {
    id: "export-keys",
    label: "Export Keys",
    description: "Download private keys",
    icon: React.createElement(Download, { size: 16 }),
    category: "manage",
    action: handlers.onExportKeys,
  },
  {
    id: "burn-tokens",
    label: "Burn Tokens",
    description: "Burn unwanted tokens",
    icon: React.createElement(Flame, { size: 16 }),
    category: "manage",
    action: handlers.onBurnTokens,
  },
  {
    id: "cleanup",
    label: "Cleanup Empty",
    description: "Delete empty wallets",
    icon: React.createElement(Trash2, { size: 16 }),
    category: "manage",
    action: handlers.onCleanup,
  },
  {
    id: "refresh",
    label: "Refresh Balances",
    description: "Update all balances",
    icon: React.createElement(RefreshCw, { size: 16 }),
    shortcut: "R",
    category: "manage",
    action: handlers.onRefresh,
  },
  {
    id: "quick-trade",
    label: "Quick Trade Settings",
    description: "Configure buy/sell amounts",
    icon: React.createElement(Settings, { size: 16 }),
    category: "settings",
    action: handlers.onQuickTradeSettings,
  },
  {
    id: "manage-groups",
    label: "Manage Groups",
    description: "Open groups drawer",
    icon: React.createElement(Layers, { size: 16 }),
    shortcut: "G",
    category: "settings",
    action: handlers.onManageGroups,
  },
  {
    id: "toggle-archived",
    label: "Toggle Archived View",
    description: "Show/hide archived wallets",
    icon: React.createElement(Archive, { size: 16 }),
    shortcut: "A",
    category: "settings",
    action: handlers.onToggleArchived,
  },
];
