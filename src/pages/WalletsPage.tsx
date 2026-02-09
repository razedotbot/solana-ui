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
import {
  deriveMultipleWallets,
  validateMnemonic,
  getMnemonicWordCount,
} from "../utils/hdWallet";
import { useAppContext } from "../contexts";
import { useToast, useWalletGroups } from "../utils/hooks";

import { formatBaseCurrencyBalance } from "../utils/formatting";
import type { SortField, SortDirection, ActiveModal, FilterTab } from "../components/wallets";
import {
  WalletsHeader,
  WalletListView,
  FilterTabs,
  GroupDrawer,
  SelectionFooter,
  OperationEmptyState,
  FundPanel,
  ConsolidatePanel,
  TransferPanel,
  DepositPanel,
  BurnPanel,
} from "../components/wallets";
import { PageBackground } from "../components/PageBackground";
import { DEFAULT_GROUP_ID } from "../utils/types";

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
  const [sortDirection] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWallets, setSelectedWallets] = useState<Set<number>>(
    new Set()
  );
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [editLabelValue, setEditLabelValue] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateWalletModalOpen, setIsCreateWalletModalOpen] = useState(false);

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
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>("all");
  const [isGroupDrawerOpen, setIsGroupDrawerOpen] = useState(false);

  const [mobileTab, setMobileTab] = useState<"wallets" | "operations">("wallets");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [burnTokenAddress, setBurnTokenAddress] = useState<string>("");
  const [burnTokenBalances, setBurnTokenBalances] = useState<
    Map<string, number>
  >(new Map());

  const [draggedWalletId, setDraggedWalletId] = useState<number | null>(null);
  const [dragOverWalletId, setDragOverWalletId] = useState<number | null>(null);

  const {
    groups,
    createGroup,
    renameGroup,
    deleteGroup,
    reorderGroups: _reorderGroups,
    updateGroupColor,
    moveWalletToGroup,
    moveWalletsToGroup: _moveWalletsToGroup,
  } = useWalletGroups(wallets, setWallets);

  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    return localStorage.getItem("wallets_page_active_group") || "all";
  });

  const handleGroupChange = (groupId: string): void => {
    setActiveGroupId(groupId);
    setSelectedWallets(new Set());
    localStorage.setItem("wallets_page_active_group", groupId);
  };

  // Quick mode settings (loaded from localStorage)
  const [quickModeSettings, setQuickModeSettings] = useState<
    Record<WalletCategory, CategoryQuickTradeSettings>
  >(() => {
    const saved = localStorage.getItem("categoryQuickTradeSettings");
    if (saved) {
      try {
        return JSON.parse(saved) as Record<
          WalletCategory,
          CategoryQuickTradeSettings
        >;
      } catch (ignore) {
        // Invalid JSON, use defaults
      }
    }
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
    } catch (ignore) {
      // Load wallets error, ignore
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
        } catch (ignore) {
          // Load wallets error, ignore
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
    if (wallets.length > 0) {
      hasAttemptedLoadRef.current = false;
    }
    return undefined;
  }, [wallets.length, setWallets]);

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
    [wallets],
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
    } catch (ignore) {
      showToast("Failed to import wallet", "error");
    }
  };

  const handleCreateWallet = async (wallet: WalletType): Promise<void> => {
    if (!connection) {
      throw new Error("Connection not available");
    }

    const balance = await fetchBaseCurrencyBalance(
      connection,
      wallet.address,
      baseCurrency,
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
      } catch (ignore) {
        // Fetch balance error, continue with others
      }
    }

    for (const mnemonic of foundMnemonics) {
      try {
        const masterWalletName = `Imported Master ${Date.now()}`;
        await handleImportMasterWallet(masterWalletName, mnemonic, 0);
        await new Promise((resolve) => setTimeout(resolve, 10));
      } catch (ignore) {
        // Import master wallet error, continue with others
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
      `Successfully imported ${totalImported} wallet${totalImported === 1 ? "" : "s"}`,
      "success"
    );
  };

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
    } catch (ignore) {
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
          1,
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

      showToast(
        "Master wallet imported successfully",
        "success"
      );
    } catch (ignore) {
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
        `Deleting it will also remove all derived wallets. Continue?`,
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

  const handleUpdateQuickMode = (
    category: WalletCategory,
    settings: CategoryQuickTradeSettings
  ): void => {
    const newSettings = { ...quickModeSettings, [category]: settings };
    setQuickModeSettings(newSettings);
    localStorage.setItem(
      "categoryQuickTradeSettings",
      JSON.stringify(newSettings)
    );
  };

  const handleSaveCustomQuickMode = (
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

  const filteredAndSortedWallets = useMemo(() => {
    const filtered = wallets.filter((wallet) => {
      const matchesArchivedFilter = showArchived
        ? wallet.isArchived === true
        : !wallet.isArchived;

      // Combined search: match address OR label
      const searchQuery = searchTerm.toLowerCase().trim();
      const matchesSearch = searchQuery === "" ||
        wallet.address.toLowerCase().includes(searchQuery) ||
        (wallet.label && wallet.label.toLowerCase().includes(searchQuery));

      const matchesViewMode =
        activeFilterTab === "all"
          ? true
          : activeFilterTab === "hd"
            ? wallet.source === "hd-derived"
            : activeFilterTab === "imported"
              ? wallet.source === "imported" || !wallet.source
              : activeFilterTab === "archived"
                ? wallet.isArchived === true
                : true;

      const matchesGroup = activeGroupId === "all"
        ? true
        : (wallet.groupId || DEFAULT_GROUP_ID) === activeGroupId;

      return (
        matchesArchivedFilter &&
        matchesSearch &&
        matchesViewMode &&
        matchesGroup
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
    baseCurrencyBalances,
    showArchived,
    activeFilterTab,
    activeGroupId,
  ]);

  const toggleWalletSelection = (walletId: number): void => {
    const newSelected = new Set(selectedWallets);
    if (newSelected.has(walletId)) {
      newSelected.delete(walletId);
    } else {
      newSelected.add(walletId);
    }
    setSelectedWallets(newSelected);
  };

  const clearSelection = (): void => {
    setSelectedWallets(new Set());
  };

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

  const saveCategory = (walletId: number, category: WalletCategory): void => {
    const updatedWallets = wallets.map((wallet) =>
      wallet.id === walletId ? { ...wallet, category } : wallet
    );
    saveWalletsToCookies(updatedWallets);
    setWallets(updatedWallets);
    showToast("Category updated", "success");
  };

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

  const deleteSelectedWallets = (): void => {
    if (selectedWallets.size === 0) return;

    const newWallets = wallets.filter((w) => !selectedWallets.has(w.id));
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);

    showToast(
      `Successfully deleted ${selectedWallets.size} wallet${selectedWallets.size === 1 ? "" : "s"}`,
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
      `Successfully downloaded ${selectedWallets.size} wallet${selectedWallets.size === 1 ? "" : "s"}`,
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
      `Successfully archived ${selectedWallets.size} wallet${selectedWallets.size === 1 ? "" : "s"}`,
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
      `Successfully unarchived ${selectedWallets.size} wallet${selectedWallets.size === 1 ? "" : "s"}`,
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

  const nonArchivedWallets = wallets.filter((w) => !w.isArchived);
  const totalSOL = nonArchivedWallets.reduce(
    (sum, wallet) => sum + (baseCurrencyBalances.get(wallet.address) || 0),
    0,
  );

  return (
    <div className="h-full min-h-screen md:h-screen bg-app-primary text-app-tertiary flex flex-col overflow-hidden">
      <HorizontalHeader />

      <div className="relative flex-1 overflow-hidden w-full pt-16 bg-app-primary flex flex-col">
        <PageBackground />

        {/* Mobile Tab Bar */}
        <div className="md:hidden relative z-10 flex border-b border-app-primary-20 bg-app-primary">
          <button
            onClick={() => setMobileTab("wallets")}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold uppercase tracking-wider transition-colors ${
              mobileTab === "wallets"
                ? "text-app-primary-color border-b-2 border-app-primary-color"
                : "text-app-secondary-40 hover:text-app-secondary"
            }`}
          >
            Wallets
          </button>
          <button
            onClick={() => setMobileTab("operations")}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold uppercase tracking-wider transition-colors ${
              mobileTab === "operations"
                ? "text-app-primary-color border-b-2 border-app-primary-color"
                : "text-app-secondary-40 hover:text-app-secondary"
            }`}
          >
            Operations
          </button>
        </div>

        {/* Content container - tabs on mobile, 50/50 split on desktop */}
        <div className="relative z-10 w-full flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT PANEL: Wallet list */}
          <div className={`w-full md:w-1/2 relative flex flex-col min-h-0 overflow-hidden md:border-r border-app-primary-20 ${mobileTab === "wallets" ? "flex" : "hidden md:flex"}`}>
          <WalletsHeader
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            walletCount={filteredAndSortedWallets.length}
            totalBalance={formatBaseCurrencyBalance(totalSOL, baseCurrency)}
            onRefresh={refreshBalances}
            isRefreshing={isRefreshing}
            onCreateWallet={() => setIsCreateWalletModalOpen(true)}
            onImportWallet={() => setIsImportModalOpen(true)}
            onCreateMasterWallet={() => setIsCreateMasterWalletModalOpen(true)}
            onImportMasterWallet={() => setIsImportMasterWalletModalOpen(true)}
            onExportKeys={() => downloadAllWallets(wallets)}
            onCleanup={() =>
              handleCleanupWallets(
                wallets,
                baseCurrencyBalances,
                new Map<string, number>(),
                setWallets,
                showToast,
              )
            }
            onOpenGroupDrawer={() => setIsGroupDrawerOpen(true)}
            quickModeSettings={quickModeSettings}
            onUpdateQuickMode={handleUpdateQuickMode}
            groups={groups}
            activeGroupId={activeGroupId}
            onGroupChange={handleGroupChange}
            isConnected={!!connection}
          />

          {/* Filter Tabs */}
          <div className="px-4 py-3 border-b border-app-primary-15">
            <FilterTabs
              activeTab={activeFilterTab}
              onTabChange={(tab) => {
                setActiveFilterTab(tab);
                if (tab === "archived") {
                  setShowArchived(true);
                } else {
                  setShowArchived(false);
                }
              }}
              counts={{
                all: wallets.filter((w) => !w.isArchived).length,
                hd: wallets.filter((w) => !w.isArchived && w.source === "hd-derived").length,
                imported: wallets.filter((w) => !w.isArchived && (w.source === "imported" || !w.source)).length,
                archived: wallets.filter((w) => w.isArchived).length,
              }}
            />
          </div>

          {/* Wallet Grid */}
          <div className="flex-1 min-h-0 flex flex-col p-4 pb-24">
            <WalletListView
              wallets={filteredAndSortedWallets}
              groups={groups}
              selectedWallets={selectedWallets}
              baseCurrencyBalances={baseCurrencyBalances}
              editingLabel={editingLabel}
              editLabelValue={editLabelValue}
              draggedWalletId={draggedWalletId}
              dragOverWalletId={dragOverWalletId}
              quickModeSettings={quickModeSettings}
              onToggleSelection={toggleWalletSelection}
              onStartEditingLabel={startEditingLabel}
              onSaveLabel={saveLabel}
              onCancelEditingLabel={cancelEditingLabel}
              onLabelKeyPress={handleLabelKeyPress}
              setEditLabelValue={setEditLabelValue}
              onSaveCategory={saveCategory}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onArchiveWallet={archiveWallet}
              onUnarchiveWallet={unarchiveWallet}
              onDeleteWallet={handleDeleteWallet}
              onCopyToClipboard={(text: string) => copyToClipboard(text, showToast)}
              onSaveCustomQuickMode={handleSaveCustomQuickMode}
              onMoveWalletToGroup={moveWalletToGroup}
            />
          </div>

          {/* Selection Footer */}
          <SelectionFooter
            selectedCount={selectedWallets.size}
            showArchived={showArchived}
            groups={groups}
            onClearSelection={clearSelection}
            onExportSelected={downloadSelectedWallets}
            onArchiveSelected={archiveSelectedWallets}
            onUnarchiveSelected={unarchiveSelectedWallets}
            onDeleteSelected={deleteSelectedWallets}
            onMoveToGroup={(groupId) => {
              selectedWallets.forEach((walletId) => {
                moveWalletToGroup(walletId, groupId);
              });
              showToast(`Moved ${selectedWallets.size} wallet(s) to group`, "success");
              clearSelection();
            }}
          />

          {/* Group Drawer */}
          <GroupDrawer
            isOpen={isGroupDrawerOpen}
            onClose={() => setIsGroupDrawerOpen(false)}
            groups={groups}
            activeGroupId={activeGroupId}
            walletCounts={new Map(groups.map((g) => [g.id, wallets.filter((w) => (w.groupId || DEFAULT_GROUP_ID) === g.id && !w.isArchived).length]))}
            onGroupChange={(groupId) => {
              handleGroupChange(groupId);
              setIsGroupDrawerOpen(false);
            }}
            onCreateGroup={createGroup}
            onRenameGroup={renameGroup}
            onDeleteGroup={deleteGroup}
            onUpdateGroupColor={updateGroupColor}
            masterWallets={masterWallets}
            wallets={wallets}
            baseCurrencyBalances={baseCurrencyBalances}
            baseCurrency={baseCurrency}
            expandedMasterWallets={expandedMasterWallets}
            onToggleMasterExpansion={toggleMasterWalletExpansion}
            onCreateMasterWallet={() => setIsCreateMasterWalletModalOpen(true)}
            onImportMasterWallet={() => setIsImportMasterWalletModalOpen(true)}
            onExportSeedPhrase={setExportSeedPhraseMasterWallet}
            onDeleteMasterWallet={handleDeleteMasterWallet}
            onCopyToClipboard={(text: string) => copyToClipboard(text, showToast)}
          />
          </div>

          {/* RIGHT PANEL: Operation panel */}
          <div className={`w-full md:w-1/2 flex flex-col min-h-0 overflow-hidden ${mobileTab === "operations" ? "flex" : "hidden md:flex"}`}>
            {activeModal && connection ? (
              <>
                {(activeModal === "distribute" || activeModal === "mixer") && (
                  <FundPanel
                    isOpen={true}
                    inline={true}
                    onClose={() => setActiveModal(null)}
                    wallets={wallets}
                    baseCurrencyBalances={baseCurrencyBalances}
                    connection={connection}
                    initialMode={activeModal === "mixer" ? "mixer" : "distribute"}
                    selectedWalletIds={selectedWallets}
                  />
                )}
                {activeModal === "consolidate" && (
                  <ConsolidatePanel
                    isOpen={true}
                    inline={true}
                    onClose={() => setActiveModal(null)}
                    wallets={wallets}
                    baseCurrencyBalances={baseCurrencyBalances}
                    connection={connection}
                    selectedWalletIds={selectedWallets}
                  />
                )}
                {activeModal === "transfer" && (
                  <TransferPanel
                    isOpen={true}
                    inline={true}
                    onClose={() => setActiveModal(null)}
                    wallets={wallets}
                    baseCurrencyBalances={baseCurrencyBalances}
                    connection={connection}
                    selectedWalletIds={selectedWallets}
                  />
                )}
                {activeModal === "deposit" && (
                  <DepositPanel
                    isOpen={true}
                    inline={true}
                    onClose={() => setActiveModal(null)}
                    wallets={wallets}
                    baseCurrencyBalances={baseCurrencyBalances}
                    setBaseCurrencyBalances={setBaseCurrencyBalances}
                    connection={connection}
                    selectedWalletIds={selectedWallets}
                  />
                )}
                {activeModal === "burn" && (
                  <BurnPanel
                    isOpen={true}
                    inline={true}
                    onClose={() => {
                      setActiveModal(null);
                      setBurnTokenBalances(new Map());
                    }}
                    tokenAddress={burnTokenAddress}
                    baseCurrencyBalances={baseCurrencyBalances}
                    tokenBalances={burnTokenBalances}
                    selectedWalletIds={selectedWallets}
                  />
                )}
              </>
            ) : (
              <OperationEmptyState
                onDistribute={() => setActiveModal("distribute")}
                onMixer={() => setActiveModal("mixer")}
                onConsolidate={() => setActiveModal("consolidate")}
                onTransfer={() => setActiveModal("transfer")}
                onDeposit={() => setActiveModal("deposit")}
                onBurn={() => {
                  setBurnTokenAddress("");
                  setActiveModal("burn");
                }}
                isConnected={!!connection}
              />
            )}
          </div>
        </div>

        {/* Master Wallet Modals (stay as overlays) */}
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

        {isCreateWalletModalOpen && (
          <CreateWalletModal
            key="create-wallet-modal"
            isOpen={isCreateWalletModalOpen}
            onClose={() => setIsCreateWalletModalOpen(false)}
            masterWallets={masterWallets}
            onCreateWallet={handleCreateWallet}
          />
        )}

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

      </div>
    </div>
  );
};
