import React, { useState, useMemo, useRef, useEffect } from "react";
import { HorizontalHeader } from "../components/HorizontalHeader";
import bs58 from "bs58";
import type {
  WalletType,
  WalletCategory,
  MasterWallet,
  CustomQuickTradeSettings,
  CategoryQuickTradeSettings,
} from "../utils/types";
import {
  copyToClipboard,
  downloadPrivateKey,
  deleteWallet,
  importWallet,
  fetchBaseCurrencyBalance,
  downloadAllWallets,
  handleCleanupWallets,
  saveMasterWallets,
  loadMasterWallets,
  createMasterWallet,
  createHDWalletFromMaster,
  deleteMasterWallet as deleteMasterWalletUtil,
  getMasterWalletMnemonic,
  updateMasterWalletAccountCount,
} from "../utils/wallet";
import { loadWalletsFromCookies, saveWalletsToCookies } from "../utils/storage";
import CreateMasterWalletModal from "../components/modals/CreateMasterWalletModal";
import CreateWalletModal from "../components/modals/CreateWalletModal";
import ImportWalletModal from "../components/modals/ImportWalletModal";
import ExportSeedPhraseModal from "../components/modals/ExportSeedPhraseModal";
import { FundModal } from "../components/modals/FundModal";
import { ConsolidateModal } from "../components/modals/ConsolidateModal";
import { TransferModal } from "../components/modals/TransferModal";
import { DepositModal } from "../components/modals/DepositModal";
import { QuickTradeModal } from "../components/modals/QuickTradeModal";
import { WalletQuickTradeModal } from "../components/modals/WalletQuickTradeModal";
import { BurnModal } from "../components/modals/BurnModal";
import {
  deriveMultipleWallets,
  validateMnemonic,
  getMnemonicWordCount,
} from "../utils/hdWallet";
import { useAppContext } from "../contexts";
import { useToast } from "../utils/hooks";

import {
  WalletQuickStats,
  MasterWalletSection,
  MasterWalletExpandedDetails,
  WalletToolbar,
  WalletTable,
  BulkActionsPanel,
} from "../components/wallets";
import type { SortField, SortDirection, ViewMode, ActiveModal } from "../components/wallets";

export const WalletsPage: React.FC = () => {
  const { showToast } = useToast();

  const {
    wallets,
    setWallets,
    baseCurrencyBalances,
    setBaseCurrencyBalances,
    baseCurrency,
    connection,
    refreshBalances,
    isRefreshing,
  } = useAppContext();

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [labelSearchTerm, setLabelSearchTerm] = useState("");
  const [showLabelSearch, setShowLabelSearch] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<Set<number>>(
    new Set()
  );
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [editLabelValue, setEditLabelValue] = useState<string>("");
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateWalletModalOpen, setIsCreateWalletModalOpen] = useState(false);

  // Master Wallet State
  const [masterWallets, setMasterWallets] = useState<MasterWallet[]>([]);
  const [expandedMasterWallets, setExpandedMasterWallets] = useState<
    Set<string>
  >(new Set());
  const [isCreateMasterWalletModalOpen, setIsCreateMasterWalletModalOpen] =
    useState(false);
  const [isImportMasterWalletModalOpen, setIsImportMasterWalletModalOpen] =
    useState(false);
  const [exportSeedPhraseMasterWallet, setExportSeedPhraseMasterWallet] =
    useState<MasterWallet | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const viewModeDropdownRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isQuickTradeModalOpen, setIsQuickTradeModalOpen] = useState(false);
  const [editingWalletQuickTrade, setEditingWalletQuickTrade] =
    useState<WalletType | null>(null);
  const [burnTokenAddress, setBurnTokenAddress] = useState<string>("");
  const [burnTokenBalances, setBurnTokenBalances] = useState<
    Map<string, number>
  >(new Map());

  // Drag and drop state
  const [draggedWalletId, setDraggedWalletId] = useState<number | null>(null);
  const [dragOverWalletId, setDragOverWalletId] = useState<number | null>(null);

  // Category settings for quick trade (loaded from localStorage)
  const [categorySettings, setCategorySettings] = useState<
    Record<WalletCategory, CategoryQuickTradeSettings>
  >(() => {
    const saved = localStorage.getItem("categoryQuickTradeSettings");
    if (saved) {
      try {
        return JSON.parse(saved) as Record<
          WalletCategory,
          CategoryQuickTradeSettings
        >;
      } catch (error) {
        console.error("Error loading category settings:", error);
      }
    }
    // Default settings
    return {
      Soft: {
        enabled: true,
        buyAmount: 0.01,
        buyMinAmount: 0.01,
        buyMaxAmount: 0.03,
        useBuyRange: false,
        sellPercentage: 100,
        sellMinPercentage: 50,
        sellMaxPercentage: 100,
        useSellRange: false,
      },
      Medium: {
        enabled: true,
        buyAmount: 0.05,
        buyMinAmount: 0.03,
        buyMaxAmount: 0.07,
        useBuyRange: false,
        sellPercentage: 100,
        sellMinPercentage: 50,
        sellMaxPercentage: 100,
        useSellRange: false,
      },
      Hard: {
        enabled: true,
        buyAmount: 0.1,
        buyMinAmount: 0.07,
        buyMaxAmount: 0.15,
        useBuyRange: false,
        sellPercentage: 100,
        sellMinPercentage: 50,
        sellMaxPercentage: 100,
        useSellRange: false,
      },
    };
  });

  // Load wallets from storage when component mounts
  useEffect(() => {
    try {
      const savedWallets = loadWalletsFromCookies();
      if (savedWallets && savedWallets.length > 0) {
        if (wallets.length === 0) {
          setWallets(savedWallets);
        } else {
          const contextAddresses = new Set(wallets.map((w) => w.address));
          const missingWallets = savedWallets.filter(
            (w) => !contextAddresses.has(w.address)
          );
          if (missingWallets.length > 0) {
            setWallets([...wallets, ...missingWallets]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading wallets from storage:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAttemptedLoadRef = useRef(false);
  useEffect(() => {
    if (wallets.length === 0 && !hasAttemptedLoadRef.current) {
      hasAttemptedLoadRef.current = true;
      const timeoutId = setTimeout(() => {
        try {
          const savedWallets = loadWalletsFromCookies();
          if (savedWallets && savedWallets.length > 0) {
            setWallets(savedWallets);
          }
        } catch (error) {
          console.error("Error loading wallets from storage (delayed):", error);
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
    if (wallets.length > 0) {
      hasAttemptedLoadRef.current = false;
    }
    return undefined;
  }, [wallets.length, setWallets]);

  // Load master wallets on mount
  useEffect(() => {
    const loaded = loadMasterWallets();
    setMasterWallets(loaded);
  }, []);

  const walletAddresses = useMemo(
    () =>
      wallets
        .map((w) => w.address)
        .sort()
        .join(","),
    [wallets]
  );

  const lastRefreshedAddressesRef = useRef<string>("");
  const lastConnectionRef = useRef<typeof connection>(null);

  useEffect(() => {
    if (connection !== lastConnectionRef.current) {
      lastConnectionRef.current = connection;
      lastRefreshedAddressesRef.current = "";
    }

    if (connection && wallets.length > 0) {
      const currentAddresses = walletAddresses;

      if (currentAddresses !== lastRefreshedAddressesRef.current) {
        lastRefreshedAddressesRef.current = currentAddresses;
        void refreshBalances();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, walletAddresses]);

  // Wallet creation and import handlers
  const handleImportPrivateKey = async (privateKey: string): Promise<void> => {
    if (!connection) return;

    try {
      const { wallet, error } = importWallet(privateKey.trim());

      if (error) {
        showToast(error, "error");
        return;
      }

      if (wallet) {
        const exists = wallets.some((w) => w.address === wallet.address);
        if (exists) {
          showToast("Wallet already exists", "error");
          return;
        }

        const newWallets = [...wallets, wallet];
        setWallets(newWallets);

        const balance = await fetchBaseCurrencyBalance(
          connection,
          wallet.address,
          baseCurrency
        );
        const newBalances = new Map(baseCurrencyBalances);
        newBalances.set(wallet.address, balance);
        setBaseCurrencyBalances(newBalances);

        showToast("Wallet imported successfully", "success");
      } else {
        showToast("Failed to import wallet", "error");
      }
    } catch (error) {
      console.error("Error importing wallet:", error);
      showToast("Failed to import wallet", "error");
    }
  };

  const handleCreateWallet = async (wallet: WalletType): Promise<void> => {
    if (!connection) {
      throw new Error("Connection not available");
    }

    try {
      const balance = await fetchBaseCurrencyBalance(
        connection,
        wallet.address,
        baseCurrency
      );

      setBaseCurrencyBalances((prevBalances) => {
        const newBalances = new Map(prevBalances);
        newBalances.set(wallet.address, balance);
        return newBalances;
      });

      setWallets((prevWallets) => {
        const alreadyExists = prevWallets.some(
          (w) => w.address === wallet.address
        );
        if (alreadyExists) {
          return prevWallets;
        }
        const newWallets = [...prevWallets, wallet];
        saveWalletsToCookies(newWallets);
        return newWallets;
      });

      if (
        wallet.source === "hd-derived" &&
        wallet.masterWalletId &&
        wallet.derivationIndex !== undefined
      ) {
        setMasterWallets((prevMasterWallets) => {
          const updatedMasterWallets = updateMasterWalletAccountCount(
            prevMasterWallets,
            wallet.masterWalletId!,
            wallet.derivationIndex! + 1
          );
          saveMasterWallets(updatedMasterWallets);
          return updatedMasterWallets;
        });
      }

      showToast("Wallet created successfully", "success");
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw error;
    }
  };

  const handleImportFromFile = async (file: File): Promise<void> => {
    if (!connection) {
      throw new Error("Connection not available");
    }

    const text = await file.text();
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
    let foundKeys: string[] = [];
    let foundMnemonics: string[] = [];

    if (fileExtension === "key") {
      const trimmedText = text.trim();
      if (base58Pattern.test(trimmedText)) {
        foundKeys = [trimmedText];
      } else {
        const wordCount = getMnemonicWordCount(trimmedText);
        if (wordCount && validateMnemonic(trimmedText)) {
          foundMnemonics = [trimmedText];
        }
      }
    } else if (fileExtension === "json") {
      try {
        const jsonData: unknown = JSON.parse(text);

        if (Array.isArray(jsonData) && jsonData.length === 64) {
          const secretKey = new Uint8Array(jsonData as number[]);
          const privateKey = bs58.encode(secretKey);
          foundKeys = [privateKey];
        } else if (Array.isArray(jsonData)) {
          for (const item of jsonData) {
            if (Array.isArray(item) && item.length === 64) {
              const secretKey = new Uint8Array(item as number[]);
              const privateKey = bs58.encode(secretKey);
              foundKeys.push(privateKey);
            } else if (typeof item === "string") {
              if (base58Pattern.test(item.trim())) {
                foundKeys.push(item.trim());
              } else {
                const wordCount = getMnemonicWordCount(item.trim());
                if (wordCount && validateMnemonic(item.trim())) {
                  foundMnemonics.push(item.trim());
                }
              }
            }
          }
        } else if (
          typeof jsonData === "object" &&
          jsonData !== null &&
          "secretKey" in jsonData &&
          Array.isArray((jsonData as { secretKey: unknown }).secretKey)
        ) {
          const secretKey = new Uint8Array(
            (jsonData as { secretKey: number[] }).secretKey
          );
          const privateKey = bs58.encode(secretKey);
          foundKeys = [privateKey];
        }
      } catch {
        throw new Error("Invalid JSON format");
      }
    } else {
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (base58Pattern.test(trimmed)) {
          foundKeys.push(trimmed);
        } else {
          const wordCount = getMnemonicWordCount(trimmed);
          if (wordCount && validateMnemonic(trimmed)) {
            foundMnemonics.push(trimmed);
          }
        }
      }
    }

    if (foundKeys.length === 0 && foundMnemonics.length === 0) {
      throw new Error("No valid private keys or seed phrases found in file");
    }

    const importedWallets: WalletType[] = [];
    const newSolBalances = new Map(baseCurrencyBalances);

    for (const key of foundKeys) {
      try {
        const { wallet, error } = importWallet(key);

        if (error || !wallet) continue;

        const exists = wallets.some((w) => w.address === wallet.address);
        if (exists) continue;

        importedWallets.push(wallet);

        const balance = await fetchBaseCurrencyBalance(
          connection,
          wallet.address,
          baseCurrency
        );
        newSolBalances.set(wallet.address, balance);

        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        console.error("Error importing wallet:", error);
      }
    }

    for (const mnemonic of foundMnemonics) {
      try {
        const masterWalletName = `Imported Master ${Date.now()}`;
        await handleImportMasterWallet(masterWalletName, mnemonic, 0);
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (error) {
        console.error("Error importing master wallet:", error);
      }
    }

    setBaseCurrencyBalances(newSolBalances);

    if (importedWallets.length === 0 && foundMnemonics.length === 0) {
      throw new Error("No new wallets could be imported");
    }

    if (importedWallets.length > 0) {
      const newWallets = [...wallets, ...importedWallets];
      setWallets(newWallets);
    }

    const totalImported = importedWallets.length + foundMnemonics.length;
    showToast(
      `Successfully imported ${totalImported} wallet${totalImported > 1 ? "s" : ""}`,
      "success"
    );
  };

  // Master Wallet Handlers
  const handleCreateMasterWallet = async (
    name: string,
    mnemonic: string
  ): Promise<void> => {
    if (!connection) return;

    try {
      const newMasterWallet = createMasterWallet(name, mnemonic);

      const masterWallet = createHDWalletFromMaster(newMasterWallet, 0);
      const newWallets: WalletType[] = [masterWallet];
      const newSolBalances = new Map(baseCurrencyBalances);

      const balance = await fetchBaseCurrencyBalance(
        connection,
        masterWallet.address,
        baseCurrency
      );
      newSolBalances.set(masterWallet.address, balance);

      newMasterWallet.accountCount = 1;

      const updatedMasterWallets = [...masterWallets, newMasterWallet];
      setMasterWallets(updatedMasterWallets);
      saveMasterWallets(updatedMasterWallets);

      const allWallets = [...wallets, ...newWallets];
      setWallets(allWallets);
      setBaseCurrencyBalances(newSolBalances);

      showToast("Master wallet created with primary wallet", "success");
    } catch (error) {
      console.error("Error creating master wallet:", error);
      showToast("Failed to create master wallet", "error");
    }
  };

  const handleImportMasterWallet = async (
    name: string,
    mnemonic: string,
    initialWalletCount: number
  ): Promise<void> => {
    if (!connection) return;

    try {
      const newMasterWallet = createMasterWallet(name, mnemonic);

      const masterWallet = createHDWalletFromMaster(newMasterWallet, 0);
      const newWallets: WalletType[] = [masterWallet];
      const newSolBalances = new Map(baseCurrencyBalances);

      const balance = await fetchBaseCurrencyBalance(
        connection,
        masterWallet.address,
        baseCurrency
      );
      newSolBalances.set(masterWallet.address, balance);

      await new Promise((resolve) => setTimeout(resolve, 10));

      if (initialWalletCount > 0) {
        const derivedWallets = deriveMultipleWallets(
          mnemonic,
          initialWalletCount,
          1
        );

        for (let i = 0; i < derivedWallets.length; i++) {
          const derived = derivedWallets[i];
          const uniqueId =
            Date.now() * 1000 + Math.floor(Math.random() * 1000) + i + 1;
          const wallet: WalletType = {
            id: uniqueId,
            address: derived.address,
            privateKey: derived.privateKey,
            isActive: false,
            category: "Medium",
            source: "hd-derived",
            masterWalletId: newMasterWallet.id,
            derivationIndex: derived.accountIndex,
          };
          newWallets.push(wallet);

          const walletBalance = await fetchBaseCurrencyBalance(
            connection,
            wallet.address,
            baseCurrency
          );
          newSolBalances.set(wallet.address, walletBalance);

          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        newMasterWallet.accountCount = initialWalletCount + 1;
      } else {
        newMasterWallet.accountCount = 1;
      }

      const updatedMasterWallets = [...masterWallets, newMasterWallet];
      setMasterWallets(updatedMasterWallets);
      saveMasterWallets(updatedMasterWallets);

      const allWallets = [...wallets, ...newWallets];
      setWallets(allWallets);
      setBaseCurrencyBalances(newSolBalances);

      const totalWallets = initialWalletCount + 1;
      showToast(
        `Master wallet imported with ${totalWallets} wallet${totalWallets > 1 ? "s" : ""}`,
        "success"
      );
    } catch (error) {
      console.error("Error importing master wallet:", error);
      showToast("Failed to import master wallet", "error");
    }
  };

  const handleDeleteMasterWallet = (masterWalletId: string): void => {
    const derivedWallets = wallets.filter(
      (w) => w.masterWalletId === masterWalletId
    );
    if (derivedWallets.length > 0) {
      const confirmed = window.confirm(
        `This master wallet has ${derivedWallets.length} derived wallet(s). ` +
          `The wallets will remain but you won't be able to generate new ones. Continue?`
      );
      if (!confirmed) return;
    }

    const updatedMasterWallets = deleteMasterWalletUtil(
      masterWallets,
      masterWalletId
    );
    setMasterWallets(updatedMasterWallets);
    saveMasterWallets(updatedMasterWallets);
    showToast("Master wallet deleted", "success");
  };

  const toggleMasterWalletExpansion = (masterWalletId: string): void => {
    const newExpanded = new Set(expandedMasterWallets);
    if (newExpanded.has(masterWalletId)) {
      newExpanded.delete(masterWalletId);
    } else {
      newExpanded.add(masterWalletId);
    }
    setExpandedMasterWallets(newExpanded);
  };

  const handleSaveCategorySettings = (
    settings: Record<WalletCategory, CategoryQuickTradeSettings>
  ): void => {
    setCategorySettings(settings);
    localStorage.setItem(
      "categoryQuickTradeSettings",
      JSON.stringify(settings)
    );
    showToast("Quick trade settings saved", "success");
  };

  const handleSaveWalletCustomSettings = (
    walletId: number,
    settings: CustomQuickTradeSettings | null
  ): void => {
    const updatedWallets = wallets.map((w) =>
      w.id === walletId
        ? { ...w, customQuickTradeSettings: settings || undefined }
        : w
    );
    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
    showToast(
      settings
        ? "Custom quick trade settings saved"
        : "Custom settings removed",
      "success"
    );
  };

  // Filter and sort wallets
  const filteredAndSortedWallets = useMemo(() => {
    const filtered = wallets.filter((wallet) => {
      const matchesArchivedFilter = showArchived
        ? wallet.isArchived === true
        : !wallet.isArchived;
      const matchesAddressSearch = wallet.address
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesLabelSearch =
        labelSearchTerm.trim() === "" ||
        (wallet.label &&
          wallet.label.toLowerCase().includes(labelSearchTerm.toLowerCase()));
      const matchesViewMode =
        viewMode === "all"
          ? true
          : viewMode === "hd"
            ? wallet.source === "hd-derived"
            : viewMode === "imported"
              ? wallet.source === "imported" || !wallet.source
              : true;

      return (
        matchesArchivedFilter &&
        matchesAddressSearch &&
        matchesLabelSearch &&
        matchesViewMode
      );
    });

    if (!sortField) {
      return filtered;
    }

    return filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case "solBalance":
          aValue = baseCurrencyBalances.get(a.address) || 0;
          bValue = baseCurrencyBalances.get(b.address) || 0;
          break;
        default:
          aValue = baseCurrencyBalances.get(a.address) || 0;
          bValue = baseCurrencyBalances.get(b.address) || 0;
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });
  }, [
    wallets,
    sortField,
    sortDirection,
    searchTerm,
    labelSearchTerm,
    baseCurrencyBalances,
    showArchived,
    viewMode,
  ]);

  // Keep search inputs visible when there's a search term
  useEffect(() => {
    if (searchTerm.trim() && !showAddressSearch) {
      setShowAddressSearch(true);
    }
  }, [searchTerm, showAddressSearch]);

  useEffect(() => {
    if (labelSearchTerm.trim() && !showLabelSearch) {
      setShowLabelSearch(true);
    }
  }, [labelSearchTerm, showLabelSearch]);

  // Close view mode dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        viewModeDropdownRef.current &&
        !viewModeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowViewModeDropdown(false);
      }
    };

    if (showViewModeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
    return undefined;
  }, [showViewModeDropdown]);

  // Sorting function
  const handleSort = (field: SortField): void => {
    const newDirection =
      sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(newDirection);

    const sortedWallets = [...wallets].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (field) {
        case "solBalance":
          aValue = baseCurrencyBalances.get(a.address) || 0;
          bValue = baseCurrencyBalances.get(b.address) || 0;
          break;
        default:
          aValue = baseCurrencyBalances.get(a.address) || 0;
          bValue = baseCurrencyBalances.get(b.address) || 0;
      }

      return newDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    setWallets(sortedWallets);
    showToast(
      `Sorted by ${field} (${newDirection === "asc" ? "ascending" : "descending"})`,
      "success"
    );
  };

  // Selection functions
  const toggleWalletSelection = (walletId: number): void => {
    const newSelected = new Set(selectedWallets);
    if (newSelected.has(walletId)) {
      newSelected.delete(walletId);
    } else {
      newSelected.add(walletId);
    }
    setSelectedWallets(newSelected);
  };

  const selectAllVisible = (): void => {
    const newSelected = new Set(filteredAndSortedWallets.map((w) => w.id));
    setSelectedWallets(newSelected);
  };

  const clearSelection = (): void => {
    setSelectedWallets(new Set());
  };

  // Label editing functions
  const startEditingLabel = (wallet: WalletType): void => {
    setEditingLabel(wallet.id);
    setEditLabelValue(wallet.label || "");
  };

  const saveLabel = (walletId: number): void => {
    const updatedWallets = wallets.map((wallet) =>
      wallet.id === walletId
        ? { ...wallet, label: editLabelValue.trim() || undefined }
        : wallet
    );
    saveWalletsToCookies(updatedWallets);
    setWallets(updatedWallets);
    setEditingLabel(null);
    setEditLabelValue("");
    showToast("Label updated", "success");
  };

  const cancelEditingLabel = (): void => {
    setEditingLabel(null);
    setEditLabelValue("");
  };

  const handleLabelKeyPress = (
    e: React.KeyboardEvent,
    walletId: number
  ): void => {
    if (e.key === "Enter") {
      saveLabel(walletId);
    } else if (e.key === "Escape") {
      cancelEditingLabel();
    }
  };

  // Category editing functions
  const saveCategory = (walletId: number, category: WalletCategory): void => {
    const updatedWallets = wallets.map((wallet) =>
      wallet.id === walletId ? { ...wallet, category } : wallet
    );
    saveWalletsToCookies(updatedWallets);
    setWallets(updatedWallets);
    setEditingCategory(null);
    showToast("Category updated", "success");
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, walletId: number): void => {
    e.stopPropagation();
    setDraggedWalletId(walletId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", walletId.toString());
  };

  const handleDragOver = (e: React.DragEvent, walletId: number): void => {
    if (!draggedWalletId) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    if (draggedWalletId !== walletId) {
      setDragOverWalletId(walletId);
    }
  };

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragOverWalletId(null);
  };

  const handleDrop = (e: React.DragEvent, targetWalletId: number): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverWalletId(null);

    if (!draggedWalletId || draggedWalletId === targetWalletId) {
      setDraggedWalletId(null);
      return;
    }

    const draggedIndex = wallets.findIndex((w) => w.id === draggedWalletId);
    const targetIndex = wallets.findIndex((w) => w.id === targetWalletId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWalletId(null);
      return;
    }

    const reorderedWallets = [...wallets];
    const [draggedWallet] = reorderedWallets.splice(draggedIndex, 1);
    reorderedWallets.splice(targetIndex, 0, draggedWallet);

    setWallets(reorderedWallets);
    saveWalletsToCookies(reorderedWallets);
    setDraggedWalletId(null);

    if (sortField !== null) {
      setSortField(null);
      showToast("Wallet order updated", "success");
    } else {
      showToast("Wallet order updated", "success");
    }
  };

  const handleDragEnd = (): void => {
    setDraggedWalletId(null);
    setDragOverWalletId(null);
  };

  // Bulk operations
  const deleteSelectedWallets = (): void => {
    if (selectedWallets.size === 0) return;

    const newWallets = wallets.filter((w) => !selectedWallets.has(w.id));
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);

    showToast(
      `Deleted ${selectedWallets.size} wallet${selectedWallets.size > 1 ? "s" : ""}`,
      "success"
    );
    setSelectedWallets(new Set());
  };

  const downloadSelectedWallets = (): void => {
    if (selectedWallets.size === 0) return;

    const selectedWalletData = wallets
      .filter((w) => selectedWallets.has(w.id))
      .map((w) => w.privateKey)
      .join("\n");

    const blob = new Blob([selectedWalletData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected_wallets_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(
      `Downloaded ${selectedWallets.size} wallet${selectedWallets.size > 1 ? "s" : ""}`,
      "success"
    );
  };

  const archiveSelectedWallets = (): void => {
    if (selectedWallets.size === 0) return;

    const newWallets = wallets.map((w) =>
      selectedWallets.has(w.id) ? { ...w, isArchived: true, isActive: false } : w
    );
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);

    showToast(
      `Archived ${selectedWallets.size} wallet${selectedWallets.size > 1 ? "s" : ""}`,
      "success"
    );
    setSelectedWallets(new Set());
  };

  const unarchiveSelectedWallets = (): void => {
    if (selectedWallets.size === 0) return;

    const newWallets = wallets.map((w) =>
      selectedWallets.has(w.id) ? { ...w, isArchived: false } : w
    );
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);

    showToast(
      `Unarchived ${selectedWallets.size} wallet${selectedWallets.size > 1 ? "s" : ""}`,
      "success"
    );
    setSelectedWallets(new Set());
  };

  const archiveWallet = (walletId: number): void => {
    const newWallets = wallets.map((w) =>
      w.id === walletId ? { ...w, isArchived: true, isActive: false } : w
    );
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
    showToast("Wallet archived", "success");
  };

  const unarchiveWallet = (walletId: number): void => {
    const newWallets = wallets.map((w) =>
      w.id === walletId ? { ...w, isArchived: false } : w
    );
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
    showToast("Wallet unarchived", "success");
  };

  const handleDeleteWallet = (walletId: number): void => {
    const newWallets = deleteWallet(wallets, walletId);
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
    showToast("Wallet deleted", "success");
  };

  // Calculate totals excluding archived wallets
  const nonArchivedWallets = wallets.filter((w) => !w.isArchived);
  const totalSOL = nonArchivedWallets.reduce(
    (sum, wallet) => sum + (baseCurrencyBalances.get(wallet.address) || 0),
    0
  );
  const activeWallets = nonArchivedWallets.filter(
    (w) => (baseCurrencyBalances.get(w.address) || 0) > 0
  ).length;
  const archivedCount = wallets.filter((w) => w.isArchived).length;

  return (
    <div className="h-full min-h-screen md:h-screen bg-app-primary text-app-tertiary flex flex-col overflow-hidden">
      <HorizontalHeader />

      <div className="relative flex-1 overflow-hidden w-full pt-16 bg-app-primary flex flex-col">
        {/* Background effects */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-app-primary opacity-90">
            <div className="absolute inset-0 bg-gradient-to-b from-app-primary-05 to-transparent"></div>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(2, 179, 109, 0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(2, 179, 109, 0.05) 1px, transparent 1px)
                `,
                backgroundSize: "20px 20px",
              }}
            ></div>
          </div>
        </div>

        {/* Content container */}
        <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 pb-20 md:pb-6 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Quick Stats & Master Wallets Row */}
          <div className="mb-6 pb-4 border-b border-app-primary-20 flex-shrink-0">
            <div className="flex flex-wrap items-start gap-3 justify-between">
              <WalletQuickStats
                filteredCount={filteredAndSortedWallets.length}
                totalCount={wallets.length}
                totalBalance={totalSOL}
                activeOrArchivedCount={showArchived ? archivedCount : activeWallets}
                showArchived={showArchived}
                baseCurrency={baseCurrency}
              />

              <MasterWalletSection
                masterWallets={masterWallets}
                wallets={wallets}
                expandedMasterWallets={expandedMasterWallets}
                baseCurrencyBalances={baseCurrencyBalances}
                baseCurrency={baseCurrency}
                onToggleExpansion={toggleMasterWalletExpansion}
                onExportSeedPhrase={setExportSeedPhraseMasterWallet}
                onDeleteMasterWallet={handleDeleteMasterWallet}
                onCreateMasterWallet={() => setIsCreateMasterWalletModalOpen(true)}
                onImportMasterWallet={() => setIsImportMasterWalletModalOpen(true)}
                onRefreshBalances={async () => {
                  await refreshBalances();
                  setBaseCurrencyBalances((prev) => new Map(prev));
                }}
                isRefreshing={isRefreshing}
                connection={connection}
                showToast={showToast}
              />
            </div>
          </div>

          {/* Expanded Master Wallet Details */}
          <MasterWalletExpandedDetails
            masterWallets={masterWallets}
            wallets={wallets}
            expandedMasterWallets={expandedMasterWallets}
            baseCurrencyBalances={baseCurrencyBalances}
            baseCurrency={baseCurrency}
            onExportSeedPhrase={setExportSeedPhraseMasterWallet}
            onDeleteMasterWallet={handleDeleteMasterWallet}
            showToast={showToast}
          />

          {/* Controls */}
          <WalletToolbar
            viewMode={viewMode}
            setViewMode={setViewMode}
            showViewModeDropdown={showViewModeDropdown}
            setShowViewModeDropdown={setShowViewModeDropdown}
            viewModeDropdownRef={viewModeDropdownRef}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
            onCreateWallet={() => setIsCreateWalletModalOpen(true)}
            onImportWallet={() => setIsImportModalOpen(true)}
            onDownloadAll={() => downloadAllWallets(wallets)}
            onCleanup={() =>
              handleCleanupWallets(
                wallets,
                baseCurrencyBalances,
                new Map<string, number>(),
                setWallets,
                showToast
              )
            }
            onFund={() => setActiveModal("distribute")}
            onConsolidate={() => setActiveModal("consolidate")}
            onTransfer={() => setActiveModal("transfer")}
            onBurn={() => {
              setBurnTokenAddress("");
              setActiveModal("burn");
            }}
            onDeposit={() => setActiveModal("deposit")}
            connection={connection}
            baseCurrency={baseCurrency}
            setSelectedWallets={setSelectedWallets}
          />

          {/* Table Container */}
          <WalletTable
            wallets={wallets}
            filteredAndSortedWallets={filteredAndSortedWallets}
            selectedWallets={selectedWallets}
            baseCurrencyBalances={baseCurrencyBalances}
            baseCurrency={baseCurrency}
            sortField={sortField}
            sortDirection={sortDirection}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showAddressSearch={showAddressSearch}
            setShowAddressSearch={setShowAddressSearch}
            labelSearchTerm={labelSearchTerm}
            setLabelSearchTerm={setLabelSearchTerm}
            showLabelSearch={showLabelSearch}
            setShowLabelSearch={setShowLabelSearch}
            editingLabel={editingLabel}
            editLabelValue={editLabelValue}
            editingCategory={editingCategory}
            draggedWalletId={draggedWalletId}
            dragOverWalletId={dragOverWalletId}
            onSort={handleSort}
            onToggleSelection={toggleWalletSelection}
            onSelectAll={selectAllVisible}
            onClearSelection={clearSelection}
            onStartEditingLabel={startEditingLabel}
            onSaveLabel={saveLabel}
            onCancelEditingLabel={cancelEditingLabel}
            onLabelKeyPress={handleLabelKeyPress}
            setEditLabelValue={setEditLabelValue}
            setEditingCategory={setEditingCategory}
            onSaveCategory={saveCategory}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onArchiveWallet={archiveWallet}
            onUnarchiveWallet={unarchiveWallet}
            onDeleteWallet={handleDeleteWallet}
            onDownloadPrivateKey={downloadPrivateKey}
            onCopyToClipboard={(text) => copyToClipboard(text, showToast)}
            onOpenQuickTradeSettings={() => {
              setEditingWalletQuickTrade(null);
              setIsQuickTradeModalOpen(true);
            }}
            onEditWalletQuickTrade={(wallet) => {
              setEditingWalletQuickTrade(wallet);
              setIsQuickTradeModalOpen(true);
            }}
            categorySettings={categorySettings}
          />
        </div>

        {/* Master Wallet Modals */}
        {isCreateMasterWalletModalOpen && (
          <CreateMasterWalletModal
            key="create-master-wallet-modal"
            isOpen={isCreateMasterWalletModalOpen}
            onClose={() => setIsCreateMasterWalletModalOpen(false)}
            onCreateMasterWallet={handleCreateMasterWallet}
          />
        )}

        {isImportMasterWalletModalOpen && (
          <ImportWalletModal
            key="import-master-wallet-modal"
            isOpen={isImportMasterWalletModalOpen}
            onClose={() => setIsImportMasterWalletModalOpen(false)}
            onImportMasterWallet={handleImportMasterWallet}
            onImportPrivateKey={handleImportPrivateKey}
            onImportFromFile={handleImportFromFile}
          />
        )}

        {/* Create Wallet Modal */}
        {isCreateWalletModalOpen && (
          <CreateWalletModal
            key="create-wallet-modal"
            isOpen={isCreateWalletModalOpen}
            onClose={() => setIsCreateWalletModalOpen(false)}
            masterWallets={masterWallets}
            onCreateWallet={handleCreateWallet}
          />
        )}

        {/* Regular Import Modal */}
        {isImportModalOpen && (
          <ImportWalletModal
            key="import-wallet-modal"
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImportMasterWallet={handleImportMasterWallet}
            onImportPrivateKey={handleImportPrivateKey}
            onImportFromFile={handleImportFromFile}
          />
        )}

        {exportSeedPhraseMasterWallet && (
          <ExportSeedPhraseModal
            key="export-seed-phrase-modal"
            isOpen={true}
            onClose={() => setExportSeedPhraseMasterWallet(null)}
            mnemonic={getMasterWalletMnemonic(exportSeedPhraseMasterWallet)}
            masterWalletName={exportSeedPhraseMasterWallet.name}
          />
        )}

        {/* Wallet Operations Modals */}
        {connection && (
          <>
            <FundModal
              isOpen={activeModal === "distribute" || activeModal === "mixer"}
              onClose={() => setActiveModal(null)}
              wallets={wallets}
              baseCurrencyBalances={baseCurrencyBalances}
              connection={connection}
              initialMode={activeModal === "mixer" ? "mixer" : "distribute"}
            />

            <ConsolidateModal
              isOpen={activeModal === "consolidate"}
              onClose={() => setActiveModal(null)}
              wallets={wallets}
              baseCurrencyBalances={baseCurrencyBalances}
              connection={connection}
            />

            <TransferModal
              isOpen={activeModal === "transfer"}
              onClose={() => setActiveModal(null)}
              wallets={wallets}
              baseCurrencyBalances={baseCurrencyBalances}
              connection={connection}
            />

            <DepositModal
              isOpen={activeModal === "deposit"}
              onClose={() => setActiveModal(null)}
              wallets={wallets}
              baseCurrencyBalances={baseCurrencyBalances}
              setBaseCurrencyBalances={setBaseCurrencyBalances}
              connection={connection}
            />

            <BurnModal
              isOpen={activeModal === "burn"}
              onClose={() => {
                setActiveModal(null);
                setBurnTokenBalances(new Map());
              }}
              tokenAddress={burnTokenAddress}
              baseCurrencyBalances={baseCurrencyBalances}
              tokenBalances={burnTokenBalances}
            />
          </>
        )}

        {/* Bulk Actions */}
        <BulkActionsPanel
          selectedCount={selectedWallets.size}
          showArchived={showArchived}
          onDownload={downloadSelectedWallets}
          onArchive={archiveSelectedWallets}
          onUnarchive={unarchiveSelectedWallets}
          onDelete={deleteSelectedWallets}
        />

        {/* Quick Trade Modals */}
        {editingWalletQuickTrade ? (
          <WalletQuickTradeModal
            isOpen={isQuickTradeModalOpen}
            onClose={() => {
              setIsQuickTradeModalOpen(false);
              setEditingWalletQuickTrade(null);
            }}
            wallet={editingWalletQuickTrade}
            categorySettings={categorySettings}
            onSaveCustomSettings={handleSaveWalletCustomSettings}
          />
        ) : (
          <QuickTradeModal
            isOpen={isQuickTradeModalOpen}
            onClose={() => setIsQuickTradeModalOpen(false)}
            categorySettings={categorySettings}
            setCategorySettings={handleSaveCategorySettings}
          />
        )}
      </div>
    </div>
  );
};
