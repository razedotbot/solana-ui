import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Trash2, 
  Search, 
  CheckSquare,
  Square,
  Wallet,
  Edit3,
  Check,
  XCircle,
  Plus,
  Key,
  Archive,
  ChevronDown,
  Network,
  Send,
  HandCoins,
  Share,
  Settings,
  Flame,
  GripVertical,
  RefreshCw
} from 'lucide-react';
import { UnifiedHeader } from '../components/Header';
import bs58 from 'bs58';
import { WalletTooltip } from '../components/Styles';
import type { WalletType, WalletCategory, MasterWallet, CustomQuickTradeSettings } from '../utils/types';
import { 
  formatAddress, 
  copyToClipboard, 
  downloadPrivateKey,
  deleteWallet,
  saveWalletsToCookies,
  loadWalletsFromCookies,
  importWallet,
  fetchSolBalance,
  downloadAllWallets,
  handleCleanupWallets,
  loadMasterWallets,
  saveMasterWallets,
  createMasterWallet,
  createHDWalletFromMaster,
  deleteMasterWallet as deleteMasterWalletUtil,
  getMasterWalletMnemonic,
  updateMasterWalletAccountCount
} from '../Utils';
import CreateMasterWalletModal from '../components/modals/CreateMasterWalletModal';
import CreateWalletModal from '../components/modals/CreateWalletModal';
import ImportWalletModal from '../components/modals/ImportWalletModal';
import ExportSeedPhraseModal from '../components/modals/ExportSeedPhraseModal';
import { FundModal } from '../components/modals/FundModal';
import { ConsolidateModal } from '../components/modals/ConsolidateModal';
import { TransferModal } from '../components/modals/TransferModal';
import { DepositModal } from '../components/modals/DepositModal';
import { QuickTradeModal } from '../components/modals/QuickTradeModal';
import type { CategoryQuickTradeSettings } from '../utils/types';
import { WalletQuickTradeModal } from '../components/modals/WalletQuickTradeModal';
import { BurnModal } from '../components/modals/BurnModal';
import { deriveMultipleWallets, validateMnemonic, getMnemonicWordCount } from '../utils/hdWallet';
import { useAppContext } from '../contexts/useAppContext';
import { useToast } from '../utils/useToast';

type SortField = 'solBalance';
type SortDirection = 'asc' | 'desc';

export const WalletsPage: React.FC = () => {
  const { showToast } = useToast();
  
  const {
    wallets,
    setWallets,
    solBalances,
    setSolBalances,
    connection,
    refreshBalances,
    isRefreshing
  } = useAppContext();

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [labelSearchTerm, setLabelSearchTerm] = useState('');
  const [showLabelSearch, setShowLabelSearch] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<Set<number>>(new Set());
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [editLabelValue, setEditLabelValue] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateWalletModalOpen, setIsCreateWalletModalOpen] = useState(false);
  
  // Master Wallet State
  const [masterWallets, setMasterWallets] = useState<MasterWallet[]>([]);
  const [expandedMasterWallets, setExpandedMasterWallets] = useState<Set<string>>(new Set());
  const [isCreateMasterWalletModalOpen, setIsCreateMasterWalletModalOpen] = useState(false);
  const [isImportMasterWalletModalOpen, setIsImportMasterWalletModalOpen] = useState(false);
  const [exportSeedPhraseMasterWallet, setExportSeedPhraseMasterWallet] = useState<MasterWallet | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'hd' | 'imported'>('all');
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const viewModeDropdownRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [activeModal, setActiveModal] = useState<'distribute' | 'consolidate' | 'transfer' | 'deposit' | 'mixer' | 'burn' | null>(null);
  const [isQuickTradeModalOpen, setIsQuickTradeModalOpen] = useState(false);
  const [editingWalletQuickTrade, setEditingWalletQuickTrade] = useState<WalletType | null>(null);
  const [burnTokenAddress, setBurnTokenAddress] = useState<string>('');
  const [burnTokenBalances, setBurnTokenBalances] = useState<Map<string, number>>(new Map());
  
  // Drag and drop state
  const [draggedWalletId, setDraggedWalletId] = useState<number | null>(null);
  const [dragOverWalletId, setDragOverWalletId] = useState<number | null>(null);
  
  // Category settings for quick trade (loaded from localStorage)
  const [categorySettings, setCategorySettings] = useState<Record<WalletCategory, CategoryQuickTradeSettings>>(() => {
    const saved = localStorage.getItem('categoryQuickTradeSettings');
    if (saved) {
      try {
        return JSON.parse(saved) as Record<WalletCategory, CategoryQuickTradeSettings>;
      } catch (error) {
        console.error('Error loading category settings:', error);
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
        useSellRange: false
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
        useSellRange: false
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
        useSellRange: false
      }
    };
  });

  // Load wallets from storage when component mounts (fallback in case AppContext hasn't loaded them yet)
  // This ensures wallets are always loaded when navigating directly to the wallets page
  useEffect(() => {
    try {
      const savedWallets = loadWalletsFromCookies();
      if (savedWallets && savedWallets.length > 0) {
        // Always ensure wallets from storage are loaded into context
        // This handles the case where AppContext hasn't loaded them yet or if navigating directly to /wallets
        if (wallets.length === 0) {
          // Context has no wallets, load from storage
          setWallets(savedWallets);
        } else {
          // Context has wallets, check if storage has any additional ones
          const contextAddresses = new Set(wallets.map(w => w.address));
          const missingWallets = savedWallets.filter(w => !contextAddresses.has(w.address));
          if (missingWallets.length > 0) {
            // Add any wallets from storage that aren't in context
            setWallets([...wallets, ...missingWallets]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading wallets from storage:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Also ensure wallets are loaded if they become available later (e.g., AppContext loads them asynchronously)
  // Use a ref to track if we've already attempted to load wallets to prevent loops
  const hasAttemptedLoadRef = useRef(false);
  useEffect(() => {
    // Only attempt once if wallets are empty
    if (wallets.length === 0 && !hasAttemptedLoadRef.current) {
      hasAttemptedLoadRef.current = true;
      const timeoutId = setTimeout(() => {
        try {
          const savedWallets = loadWalletsFromCookies();
          if (savedWallets && savedWallets.length > 0) {
            setWallets(savedWallets);
          }
        } catch (error) {
          console.error('Error loading wallets from storage (delayed):', error);
        }
      }, 500); // Wait 500ms for AppContext to load wallets
      return () => clearTimeout(timeoutId);
    }
    // Reset ref when wallets are loaded
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

  // Create a stable wallet identifier that only changes when wallet addresses change (not selection)
  const walletAddresses = useMemo(() => 
    wallets.map(w => w.address).sort().join(','),
    [wallets]
  );

  // Track the last wallet addresses we refreshed for to prevent unnecessary refreshes
  const lastRefreshedAddressesRef = useRef<string>('');
  const lastConnectionRef = useRef<typeof connection>(null);

  // Refresh balances when component mounts or when wallets/connection changes
  useEffect(() => {
    // Reset tracking refs if connection changed (new connection means we need fresh balances)
    if (connection !== lastConnectionRef.current) {
      lastConnectionRef.current = connection;
      lastRefreshedAddressesRef.current = '';
    }

    if (connection && wallets.length > 0) {
      const currentAddresses = walletAddresses;
      
      // Only refresh if addresses actually changed
      if (currentAddresses !== lastRefreshedAddressesRef.current) {
        lastRefreshedAddressesRef.current = currentAddresses;
        void refreshBalances();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, walletAddresses]); // Removed refreshBalances and wallets.length from deps

  // Wallet creation and import handlers
  const handleImportPrivateKey = async (privateKey: string): Promise<void> => {
    if (!connection) return;
    
    try {
      const { wallet, error } = importWallet(privateKey.trim());
      
      if (error) {
        showToast(error, 'error');
        return;
      }
      
      if (wallet) {
        const exists = wallets.some(w => w.address === wallet.address);
        if (exists) {
          showToast('Wallet already exists', 'error');
          return;
        }
        
        const newWallets = [...wallets, wallet];
        setWallets(newWallets);
        
        const solBalance = await fetchSolBalance(connection, wallet.address);
        const newSolBalances = new Map(solBalances);
        newSolBalances.set(wallet.address, solBalance);
        setSolBalances(newSolBalances);
        
        showToast('Wallet imported successfully', 'success');
      } else {
        showToast('Failed to import wallet', 'error');
      }
    } catch (error) {
      console.error('Error importing wallet:', error);
      showToast('Failed to import wallet', 'error');
    }
  };

  const handleCreateWallet = async (wallet: WalletType): Promise<void> => {
    if (!connection) {
      throw new Error('Connection not available');
    }

    try {
      // Fetch balance first
      const solBalance = await fetchSolBalance(connection, wallet.address);
      
      // Use functional updates to ensure we're working with the latest state
      // This is critical when creating multiple wallets in sequence
      setSolBalances(prevBalances => {
        const newSolBalances = new Map(prevBalances);
        newSolBalances.set(wallet.address, solBalance);
        return newSolBalances;
      });

      // Add wallet to list using functional update to handle concurrent additions
      // This ensures each wallet is added to the latest state, not a stale closure
      setWallets(prevWallets => {
        // Check if wallet already exists in the current state (race condition protection)
        const alreadyExists = prevWallets.some(w => w.address === wallet.address);
        if (alreadyExists) {
          // Wallet already exists, don't add it again
          return prevWallets;
        }
        // Add the new wallet
        const newWallets = [...prevWallets, wallet];
        saveWalletsToCookies(newWallets);
        return newWallets;
      });

      // If it's an HD wallet, update master wallet account count
      if (wallet.source === 'hd-derived' && wallet.masterWalletId && wallet.derivationIndex !== undefined) {
        setMasterWallets(prevMasterWallets => {
          const updatedMasterWallets = updateMasterWalletAccountCount(
            prevMasterWallets,
            wallet.masterWalletId!,
            wallet.derivationIndex! + 1
          );
          saveMasterWallets(updatedMasterWallets);
          return updatedMasterWallets;
        });
      }

      showToast('Wallet created successfully', 'success');
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  };

  const handleImportFromFile = async (file: File): Promise<void> => {
    if (!connection) {
      throw new Error('Connection not available');
    }

    const text = await file.text();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
    let foundKeys: string[] = [];
    let foundMnemonics: string[] = [];
    
    if (fileExtension === 'key') {
      const trimmedText = text.trim();
      if (base58Pattern.test(trimmedText)) {
        foundKeys = [trimmedText];
      } else {
        // Check if it's a seed phrase
        const wordCount = getMnemonicWordCount(trimmedText);
        if (wordCount && validateMnemonic(trimmedText)) {
          foundMnemonics = [trimmedText];
        }
      }
    } else if (fileExtension === 'json') {
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
            } else if (typeof item === 'string') {
              // Could be a private key or seed phrase
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
        } else if (typeof jsonData === 'object' && jsonData !== null && 'secretKey' in jsonData && Array.isArray((jsonData as { secretKey: unknown }).secretKey)) {
          const secretKey = new Uint8Array((jsonData as { secretKey: number[] }).secretKey);
          const privateKey = bs58.encode(secretKey);
          foundKeys = [privateKey];
        }
      } catch {
        throw new Error('Invalid JSON format');
      }
    } else {
      // .txt file - parse line by line
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Check if it's a private key
        if (base58Pattern.test(trimmed)) {
          foundKeys.push(trimmed);
        } else {
          // Check if it's a seed phrase
          const wordCount = getMnemonicWordCount(trimmed);
          if (wordCount && validateMnemonic(trimmed)) {
            foundMnemonics.push(trimmed);
          }
        }
      }
    }

    if (foundKeys.length === 0 && foundMnemonics.length === 0) {
      throw new Error('No valid private keys or seed phrases found in file');
    }

    const importedWallets: WalletType[] = [];
    const newSolBalances = new Map(solBalances);
    
    // Import private keys
    for (const key of foundKeys) {
      try {
        const { wallet, error } = importWallet(key);
        
        if (error || !wallet) continue;
        
        const exists = wallets.some(w => w.address === wallet.address);
        if (exists) continue;
        
        importedWallets.push(wallet);
        
        const solBalance = await fetchSolBalance(connection, wallet.address);
        newSolBalances.set(wallet.address, solBalance);
        
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        console.error('Error importing wallet:', error);
      }
    }
    
    // Import seed phrases as master wallets
    for (const mnemonic of foundMnemonics) {
      try {
        const masterWalletName = `Imported Master ${Date.now()}`;
        await handleImportMasterWallet(masterWalletName, mnemonic, 0);
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        console.error('Error importing master wallet:', error);
      }
    }
    
    setSolBalances(newSolBalances);
    
    if (importedWallets.length === 0 && foundMnemonics.length === 0) {
      throw new Error('No new wallets could be imported');
    }
    
    if (importedWallets.length > 0) {
      const newWallets = [...wallets, ...importedWallets];
      setWallets(newWallets);
    }
    
    const totalImported = importedWallets.length + foundMnemonics.length;
    showToast(`Successfully imported ${totalImported} wallet${totalImported > 1 ? 's' : ''}`, 'success');
  };

  // Master Wallet Handlers
  const handleCreateMasterWallet = async (name: string, mnemonic: string): Promise<void> => {
    if (!connection) return;

    try {
      const newMasterWallet = createMasterWallet(name, mnemonic);
      
      const masterWallet = createHDWalletFromMaster(newMasterWallet, 0);
      const newWallets: WalletType[] = [masterWallet];
      const newSolBalances = new Map(solBalances);

      const solBalance = await fetchSolBalance(connection, masterWallet.address);
      newSolBalances.set(masterWallet.address, solBalance);

      newMasterWallet.accountCount = 1;

      const updatedMasterWallets = [...masterWallets, newMasterWallet];
      setMasterWallets(updatedMasterWallets);
      saveMasterWallets(updatedMasterWallets);

      const allWallets = [...wallets, ...newWallets];
      setWallets(allWallets);
      setSolBalances(newSolBalances);

      showToast('Master wallet created with primary wallet', 'success');
    } catch (error) {
      console.error('Error creating master wallet:', error);
      showToast('Failed to create master wallet', 'error');
    }
  };

  const handleImportMasterWallet = async (name: string, mnemonic: string, initialWalletCount: number): Promise<void> => {
    if (!connection) return;

    try {
      const newMasterWallet = createMasterWallet(name, mnemonic);
      
      const masterWallet = createHDWalletFromMaster(newMasterWallet, 0);
      const newWallets: WalletType[] = [masterWallet];
      const newSolBalances = new Map(solBalances);

      const solBalance = await fetchSolBalance(connection, masterWallet.address);
      newSolBalances.set(masterWallet.address, solBalance);

      await new Promise(resolve => setTimeout(resolve, 10));

      if (initialWalletCount > 0) {
        const derivedWallets = deriveMultipleWallets(mnemonic, initialWalletCount, 1);
        
        for (let i = 0; i < derivedWallets.length; i++) {
          const derived = derivedWallets[i];
          const uniqueId = Date.now() * 1000 + Math.floor(Math.random() * 1000) + i + 1;
          const wallet: WalletType = {
            id: uniqueId,
            address: derived.address,
            privateKey: derived.privateKey,
            isActive: false,
            category: 'Medium',
            source: 'hd-derived',
            masterWalletId: newMasterWallet.id,
            derivationIndex: derived.accountIndex,
          };
          newWallets.push(wallet);

          const solBalance = await fetchSolBalance(connection, wallet.address);
          newSolBalances.set(wallet.address, solBalance);

          await new Promise(resolve => setTimeout(resolve, 10));
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
      setSolBalances(newSolBalances);

      const totalWallets = initialWalletCount + 1;
      showToast(`Master wallet imported with ${totalWallets} wallet${totalWallets > 1 ? 's' : ''}`, 'success');
    } catch (error) {
      console.error('Error importing master wallet:', error);
      showToast('Failed to import master wallet', 'error');
    }
  };


  const handleDeleteMasterWallet = (masterWalletId: string): void => {
    const derivedWallets = wallets.filter(w => w.masterWalletId === masterWalletId);
    if (derivedWallets.length > 0) {
      const confirmed = window.confirm(
        `This master wallet has ${derivedWallets.length} derived wallet(s). ` +
        `The wallets will remain but you won't be able to generate new ones. Continue?`
      );
      if (!confirmed) return;
    }

    const updatedMasterWallets = deleteMasterWalletUtil(masterWallets, masterWalletId);
    setMasterWallets(updatedMasterWallets);
    saveMasterWallets(updatedMasterWallets);
    showToast('Master wallet deleted', 'success');
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

  // Handle category settings save
  const handleSaveCategorySettings = (settings: Record<WalletCategory, CategoryQuickTradeSettings>): void => {
    setCategorySettings(settings);
    localStorage.setItem('categoryQuickTradeSettings', JSON.stringify(settings));
    showToast('Quick trade settings saved', 'success');
  };

  // Handle custom wallet quick trade settings
  const handleSaveWalletCustomSettings = (walletId: number, settings: CustomQuickTradeSettings | null): void => {
    const updatedWallets = wallets.map(w => 
      w.id === walletId 
        ? { ...w, customQuickTradeSettings: settings || undefined }
        : w
    );
    setWallets(updatedWallets);
    saveWalletsToCookies(updatedWallets);
    showToast(settings ? 'Custom quick trade settings saved' : 'Custom settings removed', 'success');
  };


  // Filter and sort wallets
  const filteredAndSortedWallets = useMemo(() => {
    const filtered = wallets.filter(wallet => {
      const matchesArchivedFilter = showArchived ? wallet.isArchived === true : !wallet.isArchived;
      const matchesAddressSearch = wallet.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLabelSearch = labelSearchTerm.trim() === '' || 
        (wallet.label && wallet.label.toLowerCase().includes(labelSearchTerm.toLowerCase()));
      const matchesViewMode = 
        viewMode === 'all' ? true :
        viewMode === 'hd' ? wallet.source === 'hd-derived' :
        viewMode === 'imported' ? (wallet.source === 'imported' || !wallet.source) :
        true;
      
      return matchesArchivedFilter && matchesAddressSearch && matchesLabelSearch && matchesViewMode;
    });

    // If no sort field is set, preserve manual order
    if (!sortField) {
      return filtered;
    }

    return filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'solBalance':
          aValue = solBalances.get(a.address) || 0;
          bValue = solBalances.get(b.address) || 0;
          break;
        default:
          aValue = solBalances.get(a.address) || 0;
          bValue = solBalances.get(b.address) || 0;
      }

      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [wallets, sortField, sortDirection, searchTerm, labelSearchTerm, solBalances, showArchived, viewMode]);

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
      if (viewModeDropdownRef.current && !viewModeDropdownRef.current.contains(event.target as Node)) {
        setShowViewModeDropdown(false);
      }
    };

    if (showViewModeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [showViewModeDropdown]);

  // Sorting function - now persists to storage
  const handleSort = (field: SortField): void => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    
    // Sort the actual wallets array and save to storage
    const sortedWallets = [...wallets].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (field) {
        case 'solBalance':
          aValue = solBalances.get(a.address) || 0;
          bValue = solBalances.get(b.address) || 0;
          break;
        default:
          aValue = solBalances.get(a.address) || 0;
          bValue = solBalances.get(b.address) || 0;
      }

      return newDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    });
    
    setWallets(sortedWallets);
    saveWalletsToCookies(sortedWallets);
    showToast(`Sorted by ${field} (${newDirection === 'asc' ? 'ascending' : 'descending'})`, 'success');
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
    const newSelected = new Set(filteredAndSortedWallets.map(w => w.id));
    setSelectedWallets(newSelected);
  };

  const clearSelection = (): void => {
    setSelectedWallets(new Set());
  };

  // Label editing functions
  const startEditingLabel = (wallet: WalletType): void => {
    setEditingLabel(wallet.id);
    setEditLabelValue(wallet.label || '');
  };

  const saveLabel = (walletId: number): void => {
    const updatedWallets = wallets.map(wallet => 
      wallet.id === walletId 
        ? { ...wallet, label: editLabelValue.trim() || undefined }
        : wallet
    );
    saveWalletsToCookies(updatedWallets);
    setWallets(updatedWallets);
    setEditingLabel(null);
    setEditLabelValue('');
    showToast('Label updated', 'success');
  };

  const cancelEditingLabel = (): void => {
    setEditingLabel(null);
    setEditLabelValue('');
  };

  const handleLabelKeyPress = (e: React.KeyboardEvent, walletId: number): void => {
    if (e.key === 'Enter') {
      saveLabel(walletId);
    } else if (e.key === 'Escape') {
      cancelEditingLabel();
    }
  };

  // Category editing functions
  const saveCategory = (walletId: number, category: WalletCategory): void => {
    const updatedWallets = wallets.map(wallet => 
      wallet.id === walletId 
        ? { ...wallet, category }
        : wallet
    );
    saveWalletsToCookies(updatedWallets);
    setWallets(updatedWallets);
    setEditingCategory(null);
    showToast('Category updated', 'success');
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, walletId: number): void => {
    e.stopPropagation();
    setDraggedWalletId(walletId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', walletId.toString());
  };

  const handleDragOver = (e: React.DragEvent, walletId: number): void => {
    if (!draggedWalletId) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
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

    // Find indices in the full wallets array
    const draggedIndex = wallets.findIndex(w => w.id === draggedWalletId);
    const targetIndex = wallets.findIndex(w => w.id === targetWalletId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWalletId(null);
      return;
    }

    // Create a new array with the reordered wallets
    const reorderedWallets = [...wallets];
    
    // Remove the dragged wallet
    const [draggedWallet] = reorderedWallets.splice(draggedIndex, 1);
    
    // Insert the dragged wallet at the target position
    reorderedWallets.splice(targetIndex, 0, draggedWallet);

    // Update state and save to storage
    setWallets(reorderedWallets);
    saveWalletsToCookies(reorderedWallets);
    setDraggedWalletId(null);
    
    // Clear sorting so manual order is visible
    if (sortField !== null) {
      setSortField(null);
      showToast('Wallet order updated', 'success');
    } else {
      showToast('Wallet order updated', 'success');
    }
  };

  const handleDragEnd = (): void => {
    setDraggedWalletId(null);
    setDragOverWalletId(null);
  };

  // Bulk operations
  const deleteSelectedWallets = (): void => {
    if (selectedWallets.size === 0) return;
    
    const newWallets = wallets.filter(w => !selectedWallets.has(w.id));
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
    
    showToast(`Deleted ${selectedWallets.size} wallet${selectedWallets.size > 1 ? 's' : ''}`, 'success');
    setSelectedWallets(new Set());
  };

  const downloadSelectedWallets = (): void => {
    if (selectedWallets.size === 0) return;
    
    const selectedWalletData = wallets
      .filter(w => selectedWallets.has(w.id))
      .map(w => w.privateKey)
      .join('\n');
    
    const blob = new Blob([selectedWalletData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected_wallets_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Downloaded ${selectedWallets.size} wallet${selectedWallets.size > 1 ? 's' : ''}`, 'success');
  };

  const archiveSelectedWallets = (): void => {
    if (selectedWallets.size === 0) return;
    
    const newWallets = wallets.map(w => 
      selectedWallets.has(w.id) ? { ...w, isArchived: true, isActive: false } : w
    );
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
    
    showToast(`Archived ${selectedWallets.size} wallet${selectedWallets.size > 1 ? 's' : ''}`, 'success');
    setSelectedWallets(new Set());
  };

  const unarchiveSelectedWallets = (): void => {
    if (selectedWallets.size === 0) return;
    
    const newWallets = wallets.map(w => 
      selectedWallets.has(w.id) ? { ...w, isArchived: false } : w
    );
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
    
    showToast(`Unarchived ${selectedWallets.size} wallet${selectedWallets.size > 1 ? 's' : ''}`, 'success');
    setSelectedWallets(new Set());
  };

  const archiveWallet = (walletId: number): void => {
    const newWallets = wallets.map(w => 
      w.id === walletId ? { ...w, isArchived: true, isActive: false } : w
    );
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
    showToast('Wallet archived', 'success');
  };

  const unarchiveWallet = (walletId: number): void => {
    const newWallets = wallets.map(w => 
      w.id === walletId ? { ...w, isArchived: false } : w
    );
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
    showToast('Wallet unarchived', 'success');
  };

  const SortIcon = ({ field }: { field: SortField }): JSX.Element => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-app-secondary-80" />;
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="color-primary" />
      : <ArrowDown size={14} className="color-primary" />;
  };

  // Calculate totals excluding archived wallets
  const nonArchivedWallets = wallets.filter(w => !w.isArchived);
  const totalSOL = nonArchivedWallets.reduce((sum, wallet) => sum + (solBalances.get(wallet.address) || 0), 0);
  const activeWallets = nonArchivedWallets.filter(w => (solBalances.get(w.address) || 0) > 0).length;
  const archivedCount = wallets.filter(w => w.isArchived).length;

  return (
    <div className="h-screen bg-app-primary text-app-tertiary flex overflow-hidden">
      {/* Unified Header */}
      <UnifiedHeader />

      {/* Main Content - with left margin for sidebar */}
      <div className="relative flex-1 overflow-hidden w-full md:w-auto md:ml-48 bg-app-primary flex flex-col">
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
                backgroundSize: '20px 20px',
              }}
            ></div>
          </div>
        </div>

        {/* Content container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Quick Stats & Master Wallets Row */}
          <div className="mb-6 pb-4 border-b border-app-primary-20 flex-shrink-0">
            <div className="flex flex-wrap items-start gap-3 justify-between">
              {/* Quick Stats - Left Side */}
              <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-6 text-xs sm:text-sm font-mono">
                <div className="text-center">
                  <div className="color-primary font-bold">
                    {filteredAndSortedWallets.length} of {wallets.length}
                  </div>
                  <div className="text-app-secondary-80 text-[10px] sm:text-xs">
                    SHOWN
                  </div>
                </div>
                <div className="text-center">
                  <div className="color-primary font-bold text-xs sm:text-sm">
                    {totalSOL.toFixed(4)}
                  </div>
                  <div className="text-app-secondary-80 text-[10px] sm:text-xs">
                    TOTAL SOL
                  </div>
                </div>
                <div className="text-center">
                  <div className="color-primary font-bold">
                    {showArchived ? archivedCount : activeWallets}
                  </div>
                  <div className="text-app-secondary-80 text-[10px] sm:text-xs">
                    {showArchived ? "ARCHIVED" : "ACTIVE"}
                  </div>
                </div>
              </div>

              {/* Master Wallets & Actions - Right Side */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Master Wallet Cards */}
                {masterWallets.map((masterWallet) => {
                  const derivedWallets = wallets.filter(
                    (w) => w.masterWalletId === masterWallet.id
                  );
                  const isExpanded = expandedMasterWallets.has(masterWallet.id);

                  return (
                    <button
                      key={masterWallet.id}
                      onClick={() => toggleMasterWalletExpansion(masterWallet.id)}
                      className={`text-center px-3 py-1 border rounded text-xs font-mono transition-colors
                              ${
                                isExpanded
                                  ? "border-app-primary-color bg-app-primary-color/10 color-primary"
                                  : "border-app-primary-30 hover:border-app-primary-40 color-primary hover-color-primary-light"
                              }`}
                    >
                      <div className="font-bold">{masterWallet.name}</div>
                      <div className="text-app-secondary-80 text-[10px]">
                        {derivedWallets.length} wallet
                        {derivedWallets.length !== 1 ? "s" : ""}
                      </div>
                    </button>
                  );
                })}

                {/* Action Buttons */}
                <button
                  onClick={() => setIsCreateMasterWalletModalOpen(true)}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 color-primary hover-color-primary-light 
                          border border-app-primary-30 rounded text-xs sm:text-sm font-mono"
                >
                  + NEW
                </button>
                <button
                  onClick={() => setIsImportMasterWalletModalOpen(true)}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 color-primary hover-color-primary-light 
                          border border-app-primary-30 rounded text-xs sm:text-sm font-mono"
                >
                  IMPORT
                </button>
                <button
                  onClick={async () => {
                    if (!connection || isRefreshing) return;
                    try {
                      await refreshBalances();
                      // Force a re-render by creating a new Map reference
                      setSolBalances(prev => new Map(prev));
                      showToast('Balances refreshed', 'success');
                    } catch (error) {
                      console.error('Error refreshing balances:', error);
                      showToast('Failed to refresh balances', 'error');
                    }
                  }}
                  disabled={!connection || isRefreshing}
                  className={`flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation whitespace-nowrap ${
                    !connection || isRefreshing
                      ? 'bg-primary-20 cursor-not-allowed text-app-secondary-80'
                      : 'bg-app-primary-color hover:bg-app-primary-dark text-black font-bold btn'
                  }`}
                >
                  <RefreshCw size={12} className={`sm:hidden ${isRefreshing ? 'animate-spin' : ''}`} />
                  <RefreshCw size={14} className={`hidden sm:block ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline ml-0.5">REFRESH</span>
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Master Wallet Details */}
          {masterWallets.map((masterWallet) => {
            const derivedWallets = wallets.filter(
              (w) => w.masterWalletId === masterWallet.id
            );
            const isExpanded = expandedMasterWallets.has(masterWallet.id);

            if (!isExpanded) return null;

            return (
              <div
                key={masterWallet.id}
                className="mb-4 pb-4 border-b border-app-primary-20 flex-shrink-0"
              >
                {/* Master Wallet Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="font-mono">
                    <div className="text-sm text-app-primary font-bold">
                      {masterWallet.name}
                    </div>
                    {(() => {
                      const masterWalletAccount = derivedWallets.find(
                        (w) => w.derivationIndex === 0
                      );
                      return masterWalletAccount ? (
                        <div className="text-xs text-app-secondary-80 mt-1 flex items-center gap-2">
                          <span>Master:</span>
                          <WalletTooltip
                            content="Click to copy master wallet address"
                            position="top"
                          >
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  masterWalletAccount.address,
                                  showToast
                                )
                              }
                              className="color-primary hover-color-primary-light transition-colors"
                            >
                              {formatAddress(masterWalletAccount.address)}
                            </button>
                          </WalletTooltip>
                          <span>
                            (
                            {(
                              solBalances.get(masterWalletAccount.address) || 0
                            ).toFixed(4)}{" "}
                            SOL)
                          </span>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  <div className="flex gap-2">
                    <WalletTooltip content="Export Seed Phrase" position="top">
                      <button
                        onClick={() => setExportSeedPhraseMasterWallet(masterWallet)}
                        className="px-2 py-1 text-[10px] font-mono color-primary 
                                hover-color-primary-light border border-app-primary-20 rounded"
                      >
                        EXPORT
                      </button>
                    </WalletTooltip>

                    <WalletTooltip content="Delete Master Wallet" position="top">
                      <button
                        onClick={() => handleDeleteMasterWallet(masterWallet.id)}
                        className="px-2 py-1 text-[10px] font-mono text-red-500 
                                hover:text-red-400 border border-red-500/30 rounded"
                      >
                        DELETE
                      </button>
                    </WalletTooltip>
                  </div>
                </div>

                {/* Derived Wallets List */}
                {derivedWallets.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {derivedWallets
                      .sort(
                        (a, b) =>
                          (a.derivationIndex || 0) - (b.derivationIndex || 0)
                      )
                      .map((wallet) => {
                        const isMasterWallet = wallet.derivationIndex === 0;
                        return (
                          <div
                            key={wallet.id}
                            className="flex justify-between items-center py-1 text-xs font-mono"
                          >
                            <span
                              className={
                                isMasterWallet
                                  ? "text-app-primary-color font-bold"
                                  : "text-app-secondary-80"
                              }
                            >
                              {isMasterWallet
                                ? "★ #0 (Master)"
                                : `#${wallet.derivationIndex}`}
                            </span>
                            <span className="text-app-primary">
                              {formatAddress(wallet.address)}
                            </span>
                            <span className="text-app-secondary-80">
                              {(solBalances.get(wallet.address) || 0).toFixed(3)} SOL
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}


          {/* Controls */}
          <div className="mb-4 flex-shrink-0">
            <div className="flex flex-row flex-wrap items-center gap-0.5 sm:gap-1">
              {/* View Mode Dropdown */}
              <div className="relative" ref={viewModeDropdownRef}>
                <button
                  onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                  className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 
                          bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 
                          text-app-primary whitespace-nowrap"
                >
                  <span className="hidden sm:inline text-xs sm:text-sm text-app-secondary-80">VIEW:</span>
                  <span className="font-bold">
                    {viewMode === 'all' ? 'ALL' : viewMode === 'hd' ? 'HD' : 'IMP'}
                  </span>
                  <ChevronDown size={12} className={`sm:hidden transition-transform duration-200 ${showViewModeDropdown ? 'rotate-180' : ''}`} />
                  <ChevronDown size={14} className={`hidden sm:block transition-transform duration-200 ${showViewModeDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showViewModeDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-app-primary border border-app-primary-30 rounded-lg shadow-lg z-20 min-w-full">
                    {(['all', 'hd', 'imported'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setViewMode(mode);
                          setShowViewModeDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-mono transition-colors ${
                          viewMode === mode
                            ? 'bg-app-primary-color text-black font-bold'
                            : 'text-app-primary hover:bg-app-quaternary'
                        } ${mode === 'all' ? 'rounded-t-lg' : mode === 'imported' ? 'rounded-b-lg' : ''}`}
                      >
                        {mode === 'all' ? 'ALL' : mode === 'hd' ? 'HD WALLETS' : 'IMPORTED'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Single Wallet */}
              <button
                onClick={() => setIsCreateWalletModalOpen(true)}
                disabled={!connection}
                className={`flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation whitespace-nowrap ${
                  !connection
                    ? 'bg-primary-20 cursor-not-allowed text-app-secondary-80'
                    : 'bg-app-primary-color hover:bg-app-primary-dark text-black font-bold btn'
                }`}
              >
                <Plus size={12} className="sm:hidden" />
                <Plus size={14} className="hidden sm:block" />
                <span className="hidden sm:inline ml-0.5">CREATE</span>
              </button>

              {/* Import Wallet */}
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation whitespace-nowrap bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary"
              >
                <Key size={12} className="sm:hidden" />
                <Key size={14} className="hidden sm:block" />
                <span className="hidden sm:inline ml-0.5">IMPORT</span>
              </button>

              {/* Quick Actions */}
              <WalletTooltip content="Export all wallets" position="bottom">
                <button
                  onClick={() => downloadAllWallets(wallets)}
                  className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary text-app-primary border border-app-primary-40 hover:border-app-primary-60 hover:bg-app-tertiary whitespace-nowrap"
                >
                  <Download size={12} className="sm:hidden" />
                  <Download size={14} className="hidden sm:block" />
                  <span className="hidden sm:inline ml-0.5">DOWNLOAD</span>
                </button>
              </WalletTooltip>

              <WalletTooltip content="Remove empty wallets" position="bottom">
                <button
                  onClick={() => handleCleanupWallets(wallets, solBalances, new Map<string, number>(), setWallets, showToast)}
                  className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary border border-error-alt-40 hover:border-error-alt text-error-alt hover:bg-app-tertiary whitespace-nowrap"
                >
                  <Trash2 size={12} className="sm:hidden" />
                  <Trash2 size={14} className="hidden sm:block" />
                  <span className="hidden sm:inline ml-0.5">CLEANUP</span>
                </button>
              </WalletTooltip>

              {/* Archive View Toggle */}
              <WalletTooltip content={showArchived ? "Show active wallets" : "Show archived wallets"} position="bottom">
                <button
                  onClick={() => {
                    setShowArchived(!showArchived);
                    setSelectedWallets(new Set());
                  }}
                  className={`flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation whitespace-nowrap ${
                    showArchived
                      ? 'bg-app-primary-color text-black border border-app-primary-60 font-bold'
                      : 'bg-app-quaternary text-app-primary border border-app-primary-40 hover:border-app-primary-60 hover:bg-app-tertiary'
                  }`}
                >
                  <Archive size={12} className="sm:hidden" />
                  <Archive size={14} className="hidden sm:block" />
                  <span className="hidden sm:inline ml-0.5">{showArchived ? 'ARCHIVED' : 'ARCHIVE'}</span>
                </button>
              </WalletTooltip>

              {/* End Row Buttons */}
              <div className="flex items-center gap-0.5 sm:gap-1 ml-auto">
                <WalletTooltip content="Fund Wallets" position="bottom">
                  <button
                    onClick={() => setActiveModal('distribute')}
                    className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary whitespace-nowrap"
                  >
                    <HandCoins size={12} className="sm:hidden" />
                    <HandCoins size={14} className="hidden sm:block" />
                    <span className="hidden sm:inline ml-0.5">FUND</span>
                  </button>
                </WalletTooltip>
                
                <WalletTooltip content="Consolidate SOL" position="bottom">
                  <button
                    onClick={() => setActiveModal('consolidate')}
                    className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary whitespace-nowrap"
                  >
                    <Share size={12} className="sm:hidden" />
                    <Share size={14} className="hidden sm:block" />
                    <span className="hidden sm:inline ml-0.5">CONSOLIDATE</span>
                  </button>
                </WalletTooltip>
                
                <WalletTooltip content="Transfer Assets" position="bottom">
                  <button
                    onClick={() => setActiveModal('transfer')}
                    className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary whitespace-nowrap"
                  >
                    <Network size={12} className="sm:hidden" />
                    <Network size={14} className="hidden sm:block" />
                    <span className="hidden sm:inline ml-0.5">TRANSFER</span>
                  </button>
                </WalletTooltip>
                
                <WalletTooltip content="Burn Tokens" position="bottom">
                  <button
                    onClick={() => {
                      setBurnTokenAddress('');
                      setActiveModal('burn');
                    }}
                    className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary whitespace-nowrap"
                  >
                    <Flame size={12} className="sm:hidden" />
                    <Flame size={14} className="hidden sm:block" />
                    <span className="hidden sm:inline ml-0.5">BURN</span>
                  </button>
                </WalletTooltip>
                
                <WalletTooltip content="Deposit SOL" position="bottom">
                  <button
                    onClick={() => setActiveModal('deposit')}
                    className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary whitespace-nowrap"
                  >
                    <Send size={12} className="sm:hidden" />
                    <Send size={14} className="hidden sm:block" />
                    <span className="hidden sm:inline ml-0.5">DEPOSIT</span>
                  </button>
                </WalletTooltip>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-auto border border-app-primary-20 rounded-lg min-h-0">
              <table className="w-full text-xs sm:text-sm font-mono min-w-[600px]">
                {/* Header */}
                <thead className="sticky top-0 bg-app-primary border-b border-app-primary-20 z-10">
                <tr>
                  <th className="p-2 sm:p-3 text-left bg-app-primary">
                    <div className="flex items-center gap-2">
                      <GripVertical 
                        size={12} 
                        className="text-app-secondary-60 opacity-40" 
                      />
                      <button
                        onClick={selectedWallets.size === filteredAndSortedWallets.length ? clearSelection : selectAllVisible}
                        className="color-primary hover-text-app-primary transition-colors touch-manipulation"
                      >
                        {selectedWallets.size === filteredAndSortedWallets.length && filteredAndSortedWallets.length > 0 ? 
                          <CheckSquare size={14} className="sm:w-4 sm:h-4" /> : <Square size={14} className="sm:w-4 sm:h-4" />
                        }
                      </button>
                    </div>
                  </th>
                  <th className="p-2 sm:p-3 text-left bg-app-primary">
                    {showLabelSearch ? (
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                        <input
                          type="text"
                          placeholder="Search label..."
                          value={labelSearchTerm}
                          onChange={(e) => setLabelSearchTerm(e.target.value)}
                          onBlur={() => {
                            if (!labelSearchTerm.trim()) {
                              setShowLabelSearch(false);
                            }
                          }}
                          autoFocus
                          className="bg-app-quaternary border border-app-primary-20 rounded px-2 py-1 text-xs text-app-primary focus:border-app-primary-60 focus:outline-none font-mono w-32"
                        />
                        <button
                          onClick={() => {
                            setLabelSearchTerm('');
                            setShowLabelSearch(false);
                          }}
                          className="p-1 hover:bg-app-quaternary rounded transition-colors touch-manipulation"
                        >
                          <XCircle size={12} className="text-app-secondary-80 hover:text-app-primary" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                        <span className="text-app-secondary-80">LABEL</span>
                        <button
                          onClick={() => setShowLabelSearch(true)}
                          className="p-1 hover:bg-app-quaternary rounded transition-colors touch-manipulation"
                        >
                          <Search size={14} className="text-app-secondary-80 hover:color-primary" />
                        </button>
                      </div>
                    )}
                  </th>
                  <th className="p-2 sm:p-3 text-left bg-app-primary">
                      <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                        <span className="text-app-secondary-80">QUICKMODE</span>
                        <WalletTooltip content="Configure Quick Trade Category Settings" position="bottom">
                          <button
                            onClick={() => {
                              setEditingWalletQuickTrade(null);
                              setIsQuickTradeModalOpen(true);
                            }}
                            className="p-1 hover:bg-app-quaternary rounded transition-colors touch-manipulation"
                          >
                            <Settings size={12} className="text-app-secondary-80 hover:text-app-primary" />
                          </button>
                        </WalletTooltip>
                      </div>
                  </th>
                  <th className="p-2 sm:p-3 text-left bg-app-primary">
                    <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                      <span className="text-app-secondary-80">TYPE</span>
                    </div>
                  </th>
                  <th className="p-2 sm:p-3 text-left bg-app-primary">
                    {showAddressSearch ? (
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                        <input
                          type="text"
                          placeholder="Search address..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onBlur={() => {
                            if (!searchTerm.trim()) {
                              setShowAddressSearch(false);
                            }
                          }}
                          autoFocus
                          className="bg-app-quaternary border border-app-primary-20 rounded px-2 py-1 text-xs text-app-primary focus:border-app-primary-60 focus:outline-none font-mono w-32"
                        />
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setShowAddressSearch(false);
                          }}
                          className="p-1 hover:bg-app-quaternary rounded transition-colors touch-manipulation"
                        >
                          <XCircle size={12} className="text-app-secondary-80 hover:text-app-primary" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
                        <span className="text-app-secondary-80">ADDRESS</span>
                        <button
                          onClick={() => setShowAddressSearch(true)}
                          className="p-1 hover:bg-app-quaternary rounded transition-colors touch-manipulation"
                        >
                          <Search size={14} className="text-app-secondary-80 hover:color-primary" />
                        </button>
                      </div>
                    )}
                  </th>
                  <th className="p-2 sm:p-3 text-left bg-app-primary">
                    <button
                      onClick={() => handleSort('solBalance')}
                      className="flex items-center gap-1 sm:gap-2 text-app-secondary-80 hover:color-primary transition-colors touch-manipulation text-[10px] sm:text-xs"
                    >
                      SOL BALANCE
                      <SortIcon field="solBalance" />
                    </button>
                  </th>
                  <th className="p-2 sm:p-3 text-left text-app-secondary-80 text-[10px] sm:text-xs bg-app-primary">PRIVATE KEY</th>
                  <th className="p-2 sm:p-3 text-left text-app-secondary-80 text-[10px] sm:text-xs bg-app-primary">ACTIONS</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {filteredAndSortedWallets.map((wallet) => {
                  const isSelected = selectedWallets.has(wallet.id);
                  const solBalance = solBalances.get(wallet.address) || 0;
                  const isDragging = draggedWalletId === wallet.id;
                  const isDragOver = dragOverWalletId === wallet.id;
                  
                  return (
                    <tr 
                      key={wallet.id}
                      onDragOver={(e) => handleDragOver(e, wallet.id)}
                      onDragLeave={(e) => handleDragLeave(e)}
                      onDrop={(e) => handleDrop(e, wallet.id)}
                      className={`border-b border-app-primary-20 hover:bg-app-quaternary transition-all ${
                        isSelected ? 'bg-app-quaternary' : ''
                      } ${
                        isDragging ? 'opacity-40 bg-app-primary-color/5' : ''
                      } ${
                        isDragOver ? 'border-t-2 border-t-app-primary-color bg-app-primary-color/10' : ''
                      }`}
                    >
                      <td className="p-2 sm:p-3">
                        <div className="flex items-center gap-2">
                          <div 
                            data-grip-handle
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, wallet.id)}
                            onDragEnd={handleDragEnd}
                            className="cursor-grab active:cursor-grabbing flex items-center"
                          >
                            <GripVertical 
                              size={14} 
                              className="text-app-secondary-60 opacity-60 hover:opacity-100 transition-opacity" 
                            />
                          </div>
                          <button
                            onClick={() => toggleWalletSelection(wallet.id)}
                            className="color-primary hover-text-app-primary transition-colors touch-manipulation"
                          >
                            {isSelected ? <CheckSquare size={14} className="sm:w-4 sm:h-4" /> : <Square size={14} className="sm:w-4 sm:h-4" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3">
                        {editingLabel === wallet.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editLabelValue}
                              onChange={(e) => setEditLabelValue(e.target.value)}
                              onKeyDown={(e) => handleLabelKeyPress(e, wallet.id)}
                              className="bg-app-quaternary border border-app-primary-20 rounded-lg px-2 py-1.5 sm:py-1 text-xs sm:text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono flex-1"
                              placeholder="Enter label..."
                              autoFocus
                            />
                            <button
                              onClick={() => saveLabel(wallet.id)}
                              className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 touch-manipulation"
                            >
                              <Check size={14} className="color-primary" />
                            </button>
                            <button
                              onClick={cancelEditingLabel}
                              className="p-1.5 sm:p-1 hover:bg-app-quaternary border border-app-primary-20 rounded-lg transition-all duration-300 touch-manipulation"
                            >
                              <XCircle size={14} className="text-red-500" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-app-primary font-mono text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
                              {wallet.label || 'No label'}
                            </span>
                            <button
                              onClick={() => startEditingLabel(wallet)}
                              className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 opacity-60 hover:opacity-100 touch-manipulation"
                            >
                              <Edit3 size={12} className="color-primary" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-2 sm:p-3">
                        {editingCategory === wallet.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={wallet.category || 'Medium'}
                              onChange={(e) => {
                                const value = e.target.value as WalletCategory;
                                saveCategory(wallet.id, value);
                              }}
                              onBlur={() => setEditingCategory(null)}
                              autoFocus
                              className="bg-app-quaternary border border-app-primary-20 rounded-lg px-2 py-1.5 sm:py-1 text-xs sm:text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono"
                            >
                              <option value="Soft">Soft</option>
                              <option value="Medium">Medium</option>
                              <option value="Hard">Hard</option>
                            </select>
                            <button
                              onClick={() => setEditingCategory(null)}
                              className="p-1.5 sm:p-1 hover:bg-app-quaternary border border-app-primary-20 rounded-lg transition-all duration-300 touch-manipulation"
                            >
                              <XCircle size={14} className="text-red-500" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <WalletTooltip 
                              content={wallet.customQuickTradeSettings 
                                ? "Using custom quick trade settings (click to configure)" 
                                : `Using ${wallet.category || 'Medium'} category settings (click to configure)`
                              } 
                              position="top"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingWalletQuickTrade(wallet);
                                  setIsQuickTradeModalOpen(true);
                                }}
                                className={`text-app-primary font-mono text-xs sm:text-sm px-2 py-1 rounded transition-all hover:opacity-80 ${
                                  wallet.customQuickTradeSettings
                                    ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                    : wallet.category === 'Soft' 
                                      ? 'bg-green-500/20 text-green-400' 
                                      : wallet.category === 'Medium' 
                                        ? 'bg-yellow-500/20 text-yellow-400' 
                                        : wallet.category === 'Hard' 
                                          ? 'bg-red-500/20 text-red-400' 
                                          : 'bg-yellow-500/20 text-yellow-400'
                                }`}
                              >
                                {wallet.customQuickTradeSettings 
                                  ? 'Custom' 
                                  : (wallet.category || 'Medium')
                                }
                              </button>
                            </WalletTooltip>
                            <button
                              onClick={() => setEditingCategory(wallet.id)}
                              className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 opacity-60 hover:opacity-100 touch-manipulation"
                            >
                              <Edit3 size={12} className="color-primary" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-2 sm:p-3">
                        <span className={`text-app-primary font-mono text-xs sm:text-sm px-2 py-1 rounded ${
                          wallet.source === 'hd-derived' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {wallet.source === 'hd-derived' ? 'HD' : 'IM'}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3">
                        <WalletTooltip content="Click to copy address" position="top">
                          <button
                            onClick={() => copyToClipboard(wallet.address, showToast)}
                            className="text-app-primary hover:color-primary transition-colors font-mono text-[10px] sm:text-xs touch-manipulation"
                          >
                            {formatAddress(wallet.address)}
                          </button>
                        </WalletTooltip>
                      </td>
                      <td className="p-2 sm:p-3">
                        <span className={`${solBalance > 0 ? 'color-primary' : 'text-app-secondary-80'} font-bold text-xs sm:text-sm`}>
                          {solBalance.toFixed(4)}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3">
                        <WalletTooltip content="Click to copy private key" position="top">
                          <button
                            onClick={() => copyToClipboard(wallet.privateKey, showToast)}
                            className="text-app-secondary-80 hover:color-primary transition-colors font-mono text-[10px] sm:text-xs touch-manipulation"
                          >
                            {wallet.privateKey.substring(0, 12)}...
                          </button>
                        </WalletTooltip>
                      </td>
                      <td className="p-2 sm:p-3">
                        <div className="flex gap-1">
                          {wallet.isArchived ? (
                            <WalletTooltip content="Unarchive Wallet" position="top">
                              <button
                                onClick={() => unarchiveWallet(wallet.id)}
                                className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 touch-manipulation"
                              >
                                <Archive size={14} className="text-app-primary-color" />
                              </button>
                            </WalletTooltip>
                          ) : (
                            <WalletTooltip content="Archive Wallet" position="top">
                              <button
                                onClick={() => archiveWallet(wallet.id)}
                                className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 touch-manipulation"
                              >
                                <Archive size={14} className="color-primary" />
                              </button>
                            </WalletTooltip>
                          )}

                          <WalletTooltip content="Download Private Key" position="top">
                            <button
                              onClick={() => downloadPrivateKey(wallet)}
                              className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 touch-manipulation"
                            >
                              <Download size={14} className="color-primary" />
                            </button>
                          </WalletTooltip>
                          
                          <WalletTooltip content="Delete Wallet" position="top">
                            <button
                              onClick={() => {
                                const newWallets = deleteWallet(wallets, wallet.id);
                                saveWalletsToCookies(newWallets);
                                setWallets(newWallets);
                                showToast('Wallet deleted', 'success');
                              }}
                              className="p-1.5 sm:p-1 hover:bg-app-quaternary rounded-lg transition-all duration-300 touch-manipulation"
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </button>
                          </WalletTooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

              {/* Empty State */}
              {filteredAndSortedWallets.length === 0 && (
                <div className="p-6 sm:p-8 text-center text-app-secondary-80">
                  <Wallet size={40} className="sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                  <div className="font-mono text-xs sm:text-sm">
                    {searchTerm || labelSearchTerm
                      ? 'No wallets match your search' 
                      : 'No wallets found'
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
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
              isOpen={activeModal === 'distribute' || activeModal === 'mixer'}
              onClose={() => setActiveModal(null)}
              wallets={wallets}
              solBalances={solBalances}
              connection={connection}
              initialMode={activeModal === 'mixer' ? 'mixer' : 'distribute'}
            />
            
            <ConsolidateModal
              isOpen={activeModal === 'consolidate'}
              onClose={() => setActiveModal(null)}
              wallets={wallets}
              solBalances={solBalances}
              connection={connection}
            />
            
            <TransferModal
              isOpen={activeModal === 'transfer'}
              onClose={() => setActiveModal(null)}
              wallets={wallets}
              solBalances={solBalances}
              connection={connection}
            />
            
            <DepositModal
              isOpen={activeModal === 'deposit'}
              onClose={() => setActiveModal(null)}
              wallets={wallets}
              solBalances={solBalances}
              setSolBalances={setSolBalances}
              connection={connection}
            />
            
            <BurnModal
              isOpen={activeModal === 'burn'}
              onClose={() => {
                setActiveModal(null);
                setBurnTokenBalances(new Map());
              }}
              handleRefresh={() => void refreshBalances()}
              tokenAddress={burnTokenAddress}
              solBalances={solBalances}
              tokenBalances={burnTokenBalances}
            />
          </>
        )}

        {/* Bulk Actions - Fixed Floating on Right */}
        {selectedWallets.size > 0 && (
          <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3">
            <div className="flex flex-col items-center gap-2 bg-app-primary border border-app-primary-30 rounded-lg p-3 shadow-lg">
              <WalletTooltip content="Download Selected" position="left">
                <button
                  onClick={downloadSelectedWallets}
                  className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-app-primary-60 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Download size={16} className="color-primary" />
                </button>
              </WalletTooltip>
              
              {!showArchived && (
                <WalletTooltip content="Archive Selected" position="left">
                  <button
                    onClick={archiveSelectedWallets}
                    className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-app-primary-60 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Archive size={16} className="color-primary" />
                  </button>
                </WalletTooltip>
              )}
              
              {showArchived && (
                <WalletTooltip content="Unarchive Selected" position="left">
                  <button
                    onClick={unarchiveSelectedWallets}
                    className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-app-primary-60 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Archive size={16} className="text-app-primary-color" />
                  </button>
                </WalletTooltip>
              )}
              
              <WalletTooltip content="Delete Selected" position="left">
                <button
                  onClick={deleteSelectedWallets}
                  className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-red-500 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </WalletTooltip>
            </div>
            
            <span className="px-3 py-2 bg-app-primary border border-app-primary-30 rounded-lg text-xs sm:text-sm font-mono color-primary whitespace-nowrap shadow-lg">
              {selectedWallets.size} selected
            </span>
          </div>
        )}

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

