import type {
  WalletType,
  WalletCategory,
  MasterWallet,
  CategoryQuickTradeSettings,
} from "../../utils/types";
import type { BaseCurrencyConfig } from "../../utils/constants";

export type SortField = "solBalance";
export type SortDirection = "asc" | "desc";
export type ViewMode = "all" | "hd" | "imported";
export type ActiveModal =
  | "distribute"
  | "consolidate"
  | "transfer"
  | "deposit"
  | "mixer"
  | "burn"
  | null;

export interface WalletQuickStatsProps {
  filteredCount: number;
  totalCount: number;
  totalBalance: number;
  activeOrArchivedCount: number;
  showArchived: boolean;
  baseCurrency: BaseCurrencyConfig;
}

export interface MasterWalletSectionProps {
  masterWallets: MasterWallet[];
  wallets: WalletType[];
  expandedMasterWallets: Set<string>;
  baseCurrencyBalances: Map<string, number>;
  baseCurrency: BaseCurrencyConfig;
  onToggleExpansion: (masterWalletId: string) => void;
  onExportSeedPhrase: (masterWallet: MasterWallet) => void;
  onDeleteMasterWallet: (masterWalletId: string) => void;
  onCreateMasterWallet: () => void;
  onImportMasterWallet: () => void;
  onRefreshBalances: () => Promise<void>;
  isRefreshing: boolean;
  connection: unknown;
  showToast: (message: string, type: "success" | "error") => void;
}

export interface MasterWalletExpandedDetailsProps {
  masterWallets: MasterWallet[];
  wallets: WalletType[];
  expandedMasterWallets: Set<string>;
  baseCurrencyBalances: Map<string, number>;
  baseCurrency: BaseCurrencyConfig;
  onExportSeedPhrase: (masterWallet: MasterWallet) => void;
  onDeleteMasterWallet: (masterWalletId: string) => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export interface WalletToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showViewModeDropdown: boolean;
  setShowViewModeDropdown: (show: boolean) => void;
  viewModeDropdownRef: React.RefObject<HTMLDivElement>;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  onCreateWallet: () => void;
  onImportWallet: () => void;
  onDownloadAll: () => void;
  onCleanup: () => void;
  onFund: () => void;
  onConsolidate: () => void;
  onTransfer: () => void;
  onBurn: () => void;
  onDeposit: () => void;
  connection: unknown;
  baseCurrency: BaseCurrencyConfig;
  setSelectedWallets: (wallets: Set<number>) => void;
}

export interface WalletTableProps {
  wallets: WalletType[];
  filteredAndSortedWallets: WalletType[];
  selectedWallets: Set<number>;
  baseCurrencyBalances: Map<string, number>;
  baseCurrency: BaseCurrencyConfig;
  sortField: SortField | null;
  sortDirection: SortDirection;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showAddressSearch: boolean;
  setShowAddressSearch: (show: boolean) => void;
  labelSearchTerm: string;
  setLabelSearchTerm: (term: string) => void;
  showLabelSearch: boolean;
  setShowLabelSearch: (show: boolean) => void;
  editingLabel: number | null;
  editLabelValue: string;
  editingCategory: number | null;
  draggedWalletId: number | null;
  dragOverWalletId: number | null;
  onSort: (field: SortField) => void;
  onToggleSelection: (walletId: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onStartEditingLabel: (wallet: WalletType) => void;
  onSaveLabel: (walletId: number) => void;
  onCancelEditingLabel: () => void;
  onLabelKeyPress: (e: React.KeyboardEvent, walletId: number) => void;
  setEditLabelValue: (value: string) => void;
  setEditingCategory: (walletId: number | null) => void;
  onSaveCategory: (walletId: number, category: WalletCategory) => void;
  onDragStart: (e: React.DragEvent, walletId: number) => void;
  onDragOver: (e: React.DragEvent, walletId: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetWalletId: number) => void;
  onDragEnd: () => void;
  onArchiveWallet: (walletId: number) => void;
  onUnarchiveWallet: (walletId: number) => void;
  onDeleteWallet: (walletId: number) => void;
  onDownloadPrivateKey: (wallet: WalletType) => void;
  onCopyToClipboard: (text: string) => void;
  onOpenQuickTradeSettings: () => void;
  onEditWalletQuickTrade: (wallet: WalletType) => void;
  categorySettings: Record<WalletCategory, CategoryQuickTradeSettings>;
}

export interface WalletTableRowProps {
  wallet: WalletType;
  isSelected: boolean;
  solBalance: number;
  isDragging: boolean;
  isDragOver: boolean;
  editingLabel: number | null;
  editLabelValue: string;
  editingCategory: number | null;
  onToggleSelection: (walletId: number) => void;
  onStartEditingLabel: (wallet: WalletType) => void;
  onSaveLabel: (walletId: number) => void;
  onCancelEditingLabel: () => void;
  onLabelKeyPress: (e: React.KeyboardEvent, walletId: number) => void;
  setEditLabelValue: (value: string) => void;
  setEditingCategory: (walletId: number | null) => void;
  onSaveCategory: (walletId: number, category: WalletCategory) => void;
  onDragStart: (e: React.DragEvent, walletId: number) => void;
  onDragOver: (e: React.DragEvent, walletId: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetWalletId: number) => void;
  onDragEnd: () => void;
  onArchiveWallet: (walletId: number) => void;
  onUnarchiveWallet: (walletId: number) => void;
  onDeleteWallet: (walletId: number) => void;
  onDownloadPrivateKey: (wallet: WalletType) => void;
  onCopyToClipboard: (text: string) => void;
  onEditWalletQuickTrade: (wallet: WalletType) => void;
}

export interface BulkActionsPanelProps {
  selectedCount: number;
  showArchived: boolean;
  onDownload: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}
