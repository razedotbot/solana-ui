import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  FileUp,
  ArrowRight,
  Archive,
  ChevronDown
} from 'lucide-react';
import { UnifiedHeader } from '../components/Header';
import bs58 from 'bs58';
import { WalletTooltip } from '../styles/Styles';
import type { WalletType, WalletCategory, MasterWallet } from '../Utils';
import { 
  formatAddress, 
  copyToClipboard, 
  downloadPrivateKey,
  deleteWallet,
  saveWalletsToCookies,
  loadWalletsFromCookies,
  createNewWallet,
  importWallet,
  fetchSolBalance,
  fetchTokenBalance,
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
import CreateMasterWalletModal from '../modals/CreateMasterWalletModal';
import ImportWalletModal from '../modals/ImportWalletModal';
import ExportSeedPhraseModal from '../modals/ExportSeedPhraseModal';
import { deriveMultipleWallets } from '../utils/hdWallet';
import { useAppContext } from '../contexts/useAppContext';
import { useToast } from '../components/useToast';

type SortField = 'solBalance' | 'tokenBalance';
type SortDirection = 'asc' | 'desc';

export const WalletsPage: React.FC = () => {
  const { tokenAddress: tokenAddressParam } = useParams<{ tokenAddress?: string }>();
  const tokenAddress = tokenAddressParam || '';
  const { showToast } = useToast();
  
  const {
    wallets,
    setWallets,
    solBalances,
    setSolBalances,
    tokenBalances,
    setTokenBalances,
    connection,
    refreshBalances
  } = useAppContext();

  const [sortField, setSortField] = useState<SortField>('solBalance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [labelSearchTerm, setLabelSearchTerm] = useState('');
  const [showLabelSearch, setShowLabelSearch] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<Set<number>>(new Set());
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  const [editLabelValue, setEditLabelValue] = useState<string>('');
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [isCreatingWallets, setIsCreatingWallets] = useState(false);
  const [walletQuantity, setWalletQuantity] = useState('1');
  const [importKey, setImportKey] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showImportInput, setShowImportInput] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  
  // Master Wallet State
  const [masterWallets, setMasterWallets] = useState<MasterWallet[]>([]);
  const [expandedMasterWallets, setExpandedMasterWallets] = useState<Set<string>>(new Set());
  const [isCreateMasterWalletModalOpen, setIsCreateMasterWalletModalOpen] = useState(false);
  const [isImportMasterWalletModalOpen, setIsImportMasterWalletModalOpen] = useState(false);
  const [exportSeedPhraseMasterWallet, setExportSeedPhraseMasterWallet] = useState<MasterWallet | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'hd' | 'imported'>('all');
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const viewModeDropdownRef = useRef<HTMLDivElement>(null);

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
  const lastTokenAddressRef = useRef<string>('');
  const lastConnectionRef = useRef<typeof connection>(null);

  // Refresh balances when component mounts or when wallets/connection/tokenAddress changes
  useEffect(() => {
    // Reset tracking refs if connection changed (new connection means we need fresh balances)
    if (connection !== lastConnectionRef.current) {
      lastConnectionRef.current = connection;
      lastRefreshedAddressesRef.current = '';
      lastTokenAddressRef.current = '';
    }

    if (connection && wallets.length > 0) {
      const currentAddresses = walletAddresses;
      const currentTokenAddress = tokenAddress || '';
      
      // Only refresh if addresses or token address actually changed
      if (
        currentAddresses !== lastRefreshedAddressesRef.current ||
        currentTokenAddress !== lastTokenAddressRef.current
      ) {
        lastRefreshedAddressesRef.current = currentAddresses;
        lastTokenAddressRef.current = currentTokenAddress;
        void refreshBalances(currentTokenAddress || undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, walletAddresses, tokenAddress]); // Removed refreshBalances and wallets.length from deps

  // Wallet creation and import handlers
  const handleCreateMultipleWallets = async (): Promise<void> => {
    if (!connection) return;
    
    const quantity = parseInt(walletQuantity);
    if (isNaN(quantity) || quantity < 1 || quantity > 100) {
      showToast('Please enter a valid number between 1 and 100', 'error');
      return;
    }

    setIsCreatingWallets(true);
    
    try {
      const newWallets: WalletType[] = [];
      const newSolBalances = new Map(solBalances);
      const newTokenBalances = new Map(tokenBalances);
      
      for (let i = 0; i < quantity; i++) {
        const newWallet = createNewWallet();
        newWallets.push(newWallet);
        
        const solBalance = await fetchSolBalance(connection, newWallet.address);
        newSolBalances.set(newWallet.address, solBalance);
        
        if (tokenAddress) {
          const tokenBalance = await fetchTokenBalance(connection, newWallet.address, tokenAddress);
          newTokenBalances.set(newWallet.address, tokenBalance);
        } else {
          newTokenBalances.set(newWallet.address, 0);
        }
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const updatedWallets = [...wallets, ...newWallets];
      setWallets(updatedWallets);
      setSolBalances(newSolBalances);
      setTokenBalances(newTokenBalances);
      
      showToast(`Successfully created ${quantity} wallet${quantity > 1 ? 's' : ''}`, 'success');
      setWalletQuantity('1');
      setShowCreateInput(false);
    } catch (error) {
      console.error('Error creating wallets:', error);
      showToast('Failed to create wallets', 'error');
    } finally {
      setIsCreatingWallets(false);
    }
  };

  const handleImportWallet = async (): Promise<void> => {
    if (!connection || !importKey.trim()) {
      setImportError('Please enter a private key');
      return;
    }
    
    try {
      const { wallet, error } = importWallet(importKey.trim());
      
      if (error) {
        setImportError(error);
        return;
      }
      
      if (wallet) {
        const exists = wallets.some(w => w.address === wallet.address);
        if (exists) {
          setImportError('Wallet already exists');
          return;
        }
        
        const newWallets = [...wallets, wallet];
        setWallets(newWallets);
        
        const solBalance = await fetchSolBalance(connection, wallet.address);
        const newSolBalances = new Map(solBalances);
        newSolBalances.set(wallet.address, solBalance);
        setSolBalances(newSolBalances);
        
        if (tokenAddress) {
          const tokenBalance = await fetchTokenBalance(connection, wallet.address, tokenAddress);
          const newTokenBalances = new Map(tokenBalances);
          newTokenBalances.set(wallet.address, tokenBalance);
          setTokenBalances(newTokenBalances);
        } else {
          const newTokenBalances = new Map(tokenBalances);
          newTokenBalances.set(wallet.address, 0);
          setTokenBalances(newTokenBalances);
        }
        
        setImportKey('');
        setImportError(null);
        setShowImportInput(false);
        showToast('Wallet imported successfully', 'success');
      } else {
        setImportError('Failed to import wallet');
      }
    } catch (error) {
      console.error('Error in handleImportWallet:', error);
      setImportError('Failed to import wallet');
    }
  };

  // Focus import input when it becomes visible
  useEffect(() => {
    if (showImportInput && importInputRef.current) {
      importInputRef.current.focus();
    }
  }, [showImportInput]);

  // Focus create input when it becomes visible
  useEffect(() => {
    if (showCreateInput && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [showCreateInput]);

  // Master Wallet Handlers
  const handleCreateMasterWallet = async (name: string, mnemonic: string): Promise<void> => {
    if (!connection) return;

    try {
      const newMasterWallet = createMasterWallet(name, mnemonic);
      
      const masterWallet = createHDWalletFromMaster(newMasterWallet, 0);
      const newWallets: WalletType[] = [masterWallet];
      const newSolBalances = new Map(solBalances);
      const newTokenBalances = new Map(tokenBalances);

      const solBalance = await fetchSolBalance(connection, masterWallet.address);
      newSolBalances.set(masterWallet.address, solBalance);

      if (tokenAddress) {
        const tokenBalance = await fetchTokenBalance(connection, masterWallet.address, tokenAddress);
        newTokenBalances.set(masterWallet.address, tokenBalance);
      } else {
        newTokenBalances.set(masterWallet.address, 0);
      }

      newMasterWallet.accountCount = 1;

      const updatedMasterWallets = [...masterWallets, newMasterWallet];
      setMasterWallets(updatedMasterWallets);
      saveMasterWallets(updatedMasterWallets);

      const allWallets = [...wallets, ...newWallets];
      setWallets(allWallets);
      setSolBalances(newSolBalances);
      setTokenBalances(newTokenBalances);

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
      const newTokenBalances = new Map(tokenBalances);

      const solBalance = await fetchSolBalance(connection, masterWallet.address);
      newSolBalances.set(masterWallet.address, solBalance);

      if (tokenAddress) {
        const tokenBalance = await fetchTokenBalance(connection, masterWallet.address, tokenAddress);
        newTokenBalances.set(masterWallet.address, tokenBalance);
      } else {
        newTokenBalances.set(masterWallet.address, 0);
      }

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

          if (tokenAddress) {
            const tokenBalance = await fetchTokenBalance(connection, wallet.address, tokenAddress);
            newTokenBalances.set(wallet.address, tokenBalance);
          } else {
            newTokenBalances.set(wallet.address, 0);
          }

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
      setTokenBalances(newTokenBalances);

      const totalWallets = initialWalletCount + 1;
      showToast(`Master wallet imported with ${totalWallets} wallet${totalWallets > 1 ? 's' : ''}`, 'success');
    } catch (error) {
      console.error('Error importing master wallet:', error);
      showToast('Failed to import master wallet', 'error');
    }
  };

  const handleGenerateWalletFromMaster = async (masterWallet: MasterWallet): Promise<void> => {
    if (!connection) return;

    try {
      const newAccountIndex = masterWallet.accountCount === 0 ? 0 : masterWallet.accountCount;
      const newWallet = createHDWalletFromMaster(masterWallet, newAccountIndex);

      const solBalance = await fetchSolBalance(connection, newWallet.address);
      const newSolBalances = new Map(solBalances);
      newSolBalances.set(newWallet.address, solBalance);
      setSolBalances(newSolBalances);

      if (tokenAddress) {
        const tokenBalance = await fetchTokenBalance(connection, newWallet.address, tokenAddress);
        const newTokenBalances = new Map(tokenBalances);
        newTokenBalances.set(newWallet.address, tokenBalance);
        setTokenBalances(newTokenBalances);
      }

      const updatedWallets = [...wallets, newWallet];
      setWallets(updatedWallets);

      const updatedMasterWallets = updateMasterWalletAccountCount(
        masterWallets,
        masterWallet.id,
        newAccountIndex + 1
      );
      setMasterWallets(updatedMasterWallets);
      saveMasterWallets(updatedMasterWallets);

      showToast('Wallet generated from master', 'success');
    } catch (error) {
      console.error('Error generating wallet from master:', error);
      showToast('Failed to generate wallet', 'error');
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file || !connection) return;

    setIsProcessingFile(true);
    setImportError(null);

    try {
      const text = await file.text();
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
      let foundKeys: string[] = [];
      
      if (fileExtension === 'key') {
        const trimmedText = text.trim();
        if (base58Pattern.test(trimmedText)) {
          foundKeys = [trimmedText];
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
              }
            }
          } else if (typeof jsonData === 'object' && jsonData !== null && 'secretKey' in jsonData && Array.isArray((jsonData as { secretKey: unknown }).secretKey)) {
            const secretKey = new Uint8Array((jsonData as { secretKey: number[] }).secretKey);
            const privateKey = bs58.encode(secretKey);
            foundKeys = [privateKey];
          }
        } catch {
          setImportError('Invalid JSON format');
          setIsProcessingFile(false);
          return;
        }
      } else {
        const lines = text.split(/\r?\n/);
        foundKeys = lines
          .map(line => line.trim())
          .filter(line => base58Pattern.test(line));
      }

      if (foundKeys.length === 0) {
        setImportError('No valid private keys found in file');
        setIsProcessingFile(false);
        return;
      }

      const importedWallets: WalletType[] = [];
      const newSolBalances = new Map(solBalances);
      const newTokenBalances = new Map(tokenBalances);
      
      for (const key of foundKeys) {
        try {
          const { wallet, error } = importWallet(key);
          
          if (error || !wallet) continue;
          
          const exists = wallets.some(w => w.address === wallet.address);
          if (exists) continue;
          
          importedWallets.push(wallet);
          
          const solBalance = await fetchSolBalance(connection, wallet.address);
          newSolBalances.set(wallet.address, solBalance);
          
          if (tokenAddress) {
            const tokenBalance = await fetchTokenBalance(connection, wallet.address, tokenAddress);
            newTokenBalances.set(wallet.address, tokenBalance);
          } else {
            newTokenBalances.set(wallet.address, 0);
          }
          
          await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error) {
          console.error('Error importing wallet:', error);
        }
      }
      
      setSolBalances(newSolBalances);
      setTokenBalances(newTokenBalances);
      
      if (importedWallets.length === 0) {
        setImportError('No new wallets could be imported');
      } else {
        const newWallets = [...wallets, ...importedWallets];
        setWallets(newWallets);
        showToast(`Successfully imported ${importedWallets.length} wallets`, 'success');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setImportError('Error processing file');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

    return filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'solBalance':
          aValue = solBalances.get(a.address) || 0;
          bValue = solBalances.get(b.address) || 0;
          break;
        case 'tokenBalance':
          aValue = tokenBalances.get(a.address) || 0;
          bValue = tokenBalances.get(b.address) || 0;
          break;
        default:
          aValue = solBalances.get(a.address) || 0;
          bValue = solBalances.get(b.address) || 0;
      }

      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [wallets, sortField, sortDirection, searchTerm, labelSearchTerm, solBalances, tokenBalances, showArchived, viewMode]);

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

  // Sorting function
  const handleSort = (field: SortField): void => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
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
  const totalTokens = nonArchivedWallets.reduce((sum, wallet) => sum + (tokenBalances.get(wallet.address) || 0), 0);
  const activeWallets = nonArchivedWallets.filter(w => (solBalances.get(w.address) || 0) > 0).length;
  const archivedCount = wallets.filter(w => w.isArchived).length;

  return (
    <div className="min-h-screen bg-app-primary text-app-tertiary">
      {/* Unified Header */}
      <UnifiedHeader tokenAddress={tokenAddress} />

      {/* Main Content - with left margin for sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-6 ml-48">
        {/* Quick Stats */}
        <div className="mb-6 pb-4 border-b border-app-primary-20">
          <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-6 text-xs sm:text-sm font-mono">
            <div className="text-center">
              <div className="color-primary font-bold">{filteredAndSortedWallets.length} of {wallets.length}</div>
              <div className="text-app-secondary-80 text-[10px] sm:text-xs">SHOWN</div>
            </div>
            <div className="text-center">
              <div className="color-primary font-bold text-xs sm:text-sm">{totalSOL.toFixed(4)}</div>
              <div className="text-app-secondary-80 text-[10px] sm:text-xs">TOTAL SOL</div>
            </div>
            <div className="text-center">
              <div className="color-primary font-bold text-xs sm:text-sm">{totalTokens.toLocaleString()}</div>
              <div className="text-app-secondary-80 text-[10px] sm:text-xs">TOTAL TOKENS</div>
            </div>
            <div className="text-center">
              <div className="color-primary font-bold">{showArchived ? archivedCount : activeWallets}</div>
              <div className="text-app-secondary-80 text-[10px] sm:text-xs">{showArchived ? 'ARCHIVED' : 'ACTIVE'}</div>
            </div>
          </div>
        </div>

        {/* Master Wallets Section */}
        {masterWallets.length > 0 && (
          <div className="mb-4 bg-app-quaternary border border-app-primary-40 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-mono color-primary font-bold tracking-wider">
                MASTER WALLETS ({masterWallets.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCreateMasterWalletModalOpen(true)}
                  className="text-xs font-mono color-primary hover-color-primary-light px-3 py-1 
                           bg-app-primary border border-app-primary-40 rounded"
                >
                  + NEW
                </button>
                <button
                  onClick={() => setIsImportMasterWalletModalOpen(true)}
                  className="text-xs font-mono color-primary hover-color-primary-light px-3 py-1 
                           bg-app-primary border border-app-primary-40 rounded"
                >
                  IMPORT
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {masterWallets.map((masterWallet) => {
                const derivedWallets = wallets.filter(w => w.masterWalletId === masterWallet.id);
                const isExpanded = expandedMasterWallets.has(masterWallet.id);
                
                return (
                  <div key={masterWallet.id} className="bg-app-primary border border-app-primary-30 rounded-lg">
                    <div className="p-3 flex justify-between items-center">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleMasterWalletExpansion(masterWallet.id)}
                          className="color-primary hover-color-primary-light"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                        <div className="flex-1">
                          <div className="font-mono text-sm text-app-primary font-bold">
                            {masterWallet.name}
                          </div>
                          <div className="font-mono text-xs text-app-secondary-80">
                            {derivedWallets.length} wallet{derivedWallets.length !== 1 ? 's' : ''} derived
                          </div>
                          {(() => {
                            const masterWalletAccount = derivedWallets.find(w => w.derivationIndex === 0);
                            return masterWalletAccount ? (
                              <div className="font-mono text-xs text-app-primary mt-1 flex items-center gap-2">
                                <span className="text-app-secondary-80">Master:</span>
                                <WalletTooltip content="Click to copy master wallet address" position="top">
                                  <button
                                    onClick={() => copyToClipboard(masterWalletAccount.address, showToast)}
                                    className="hover:color-primary transition-colors"
                                  >
                                    {formatAddress(masterWalletAccount.address)}
                                  </button>
                                </WalletTooltip>
                                <span className="text-app-secondary-80">
                                  ({(solBalances.get(masterWalletAccount.address) || 0).toFixed(4)} SOL)
                                </span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <WalletTooltip content="Generate Next Wallet" position="top">
                          <button
                            onClick={() => handleGenerateWalletFromMaster(masterWallet)}
                            disabled={!connection}
                            className={`px-3 py-1 text-xs font-mono rounded ${
                              connection
                                ? 'bg-app-primary-color hover:bg-app-primary-dark text-black'
                                : 'bg-app-tertiary text-app-secondary-60 cursor-not-allowed'
                            }`}
                          >
                            + GENERATE
                          </button>
                        </WalletTooltip>
                        
                        <WalletTooltip content="Export Seed Phrase" position="top">
                          <button
                            onClick={() => setExportSeedPhraseMasterWallet(masterWallet)}
                            className="px-3 py-1 text-xs font-mono bg-app-quaternary hover:bg-app-tertiary 
                                     text-app-primary border border-app-primary-20 rounded"
                          >
                            EXPORT
                          </button>
                        </WalletTooltip>
                        
                        <WalletTooltip content="Delete Master Wallet" position="top">
                          <button
                            onClick={() => handleDeleteMasterWallet(masterWallet.id)}
                            className="px-3 py-1 text-xs font-mono bg-app-quaternary hover:bg-red-500/20 
                                     text-red-500 border border-red-500/30 rounded"
                          >
                            DELETE
                          </button>
                        </WalletTooltip>
                      </div>
                    </div>
                    
                    {isExpanded && derivedWallets.length > 0 && (
                      <div className="border-t border-app-primary-20 p-2 bg-app-primary-80">
                        <div className="text-xs font-mono text-app-secondary-80 mb-2 px-2">
                          Derived Wallets:
                        </div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {derivedWallets
                            .sort((a, b) => (a.derivationIndex || 0) - (b.derivationIndex || 0))
                            .map(wallet => {
                              const isMasterWallet = wallet.derivationIndex === 0;
                              return (
                                <div
                                  key={wallet.id}
                                  className={`flex justify-between items-center px-2 py-1 rounded text-xs font-mono ${
                                    isMasterWallet
                                      ? 'bg-app-primary-color/20 border border-app-primary-color/40'
                                      : 'bg-app-quaternary'
                                  }`}
                                >
                                  <span className={isMasterWallet ? 'text-app-primary-color font-bold' : 'text-app-secondary-80'}>
                                    {isMasterWallet ? '★ #0 (Master)' : `#${wallet.derivationIndex}`}
                                  </span>
                                  <span className={isMasterWallet ? 'text-app-primary-color font-bold' : 'text-app-primary'}>
                                    {formatAddress(wallet.address)}
                                  </span>
                                  <span className={isMasterWallet ? 'text-app-primary-color font-bold' : 'text-app-secondary-80'}>
                                    {(solBalances.get(wallet.address) || 0).toFixed(3)} SOL
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Create Master Wallet Buttons (if no master wallets exist) */}
        {masterWallets.length === 0 && (
          <div className="mb-4 bg-app-quaternary border border-app-primary-40 rounded-lg p-4">
            <div className="text-center">
              <h3 className="text-sm font-mono color-primary font-bold tracking-wider mb-3">
                HIERARCHICAL DETERMINISTIC WALLETS
              </h3>
              <p className="text-xs font-mono text-app-secondary-80 mb-4">
                Generate multiple wallets from a single seed phrase
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setIsCreateMasterWalletModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm 
                           bg-app-primary-color hover:bg-app-primary-dark text-black"
                >
                  <Plus size={16} />
                  Create Master Wallet
                </button>
                <button
                  onClick={() => setIsImportMasterWalletModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm 
                           bg-app-quaternary hover:bg-app-tertiary text-app-primary border border-app-primary-40"
                >
                  <Key size={16} />
                  Import Master Wallet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
            {/* View Mode Dropdown */}
            <div className="relative" ref={viewModeDropdownRef}>
              <button
                onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all duration-300 
                         bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 
                         text-app-primary whitespace-nowrap"
              >
                <span className="text-xs text-app-secondary-80">VIEW:</span>
                <span className="font-bold">
                  {viewMode === 'all' ? 'ALL' : viewMode === 'hd' ? 'HD WALLETS' : 'IMPORTED'}
                </span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showViewModeDropdown ? 'rotate-180' : ''}`} />
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

            {/* Create Wallet */}
            {showCreateInput ? (
              <div className="relative flex items-center">
                <input
                  ref={createInputRef}
                  type="number"
                  min="1"
                  max="100"
                  value={walletQuantity}
                  onChange={(e) => setWalletQuantity(e.target.value)}
                  onKeyDown={(e): void => {
                    if (e.key === 'Enter' && walletQuantity.trim()) {
                      void handleCreateMultipleWallets();
                    } else if (e.key === 'Escape') {
                      setShowCreateInput(false);
                      setWalletQuantity('1');
                    }
                  }}
                  className="bg-app-primary-color border border-app-primary-20 rounded-lg px-4 py-2 pr-10 text-sm text-black focus:border-app-primary-60 focus:outline-none font-mono font-bold text-center min-w-[120px]"
                  placeholder="1"
                  style={{ width: '120px' }}
                />
                <button
                  onClick={handleCreateMultipleWallets}
                  disabled={isCreatingWallets || !connection || !walletQuantity.trim()}
                  className={`absolute right-2 p-1.5 rounded transition-all duration-300 touch-manipulation ${
                    isCreatingWallets || !connection || !walletQuantity.trim()
                      ? 'cursor-not-allowed text-app-secondary-80'
                      : 'text-black hover:bg-app-primary-dark'
                  }`}
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateInput(true)}
                disabled={!connection}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all duration-300 touch-manipulation whitespace-nowrap ${
                  !connection
                    ? 'bg-primary-20 cursor-not-allowed text-app-secondary-80'
                    : 'bg-app-primary-color hover:bg-app-primary-dark text-black font-bold btn'
                }`}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">CREATE</span>
                <span className="sm:hidden">+</span>
              </button>
            )}

            {/* Import Wallet */}
            {showImportInput ? (
              <div className="relative">
                <div className="relative flex items-center">
                  <input
                    ref={importInputRef}
                    type="text"
                    placeholder="Private Key"
                    value={importKey}
                    onChange={(e) => {
                      setImportKey(e.target.value);
                      setImportError(null);
                    }}
                    onKeyDown={(e): void => {
                      if (e.key === 'Enter' && importKey.trim()) {
                        void handleImportWallet();
                      } else if (e.key === 'Escape') {
                        setShowImportInput(false);
                        setImportKey('');
                        setImportError(null);
                      }
                    }}
                    className={`bg-app-quaternary border ${
                      importError ? 'border-error-alt' : 'border-app-primary-20'
                    } rounded-lg px-4 py-2 pr-10 text-sm text-app-primary focus:border-app-primary-60 focus:outline-none font-mono`}
                    style={{ width: '160px' }}
                  />
                  <button
                    onClick={handleImportWallet}
                    disabled={!importKey.trim()}
                    className={`absolute right-2 p-1.5 rounded transition-all duration-300 touch-manipulation ${
                      !importKey.trim()
                        ? 'cursor-not-allowed text-app-secondary-80'
                        : 'text-app-primary hover:color-primary hover:bg-app-tertiary'
                    }`}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
                {importError && (
                  <div className="text-error-alt text-xs font-mono absolute top-full left-0 mt-1 whitespace-nowrap z-10 bg-app-primary border border-error-alt rounded px-2 py-1">
                    {importError}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowImportInput(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all duration-300 touch-manipulation whitespace-nowrap bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary"
              >
                <Key size={16} />
                <span className="hidden sm:inline">IMPORT WALLET</span>
                <span className="sm:hidden">IMPORT</span>
              </button>
            )}
            
            {/* File Upload */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.key,.json"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessingFile}
              />
              <WalletTooltip content="Import from file (.txt/.key/.json)" position="bottom">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all duration-300 touch-manipulation ${
                    isProcessingFile 
                      ? 'bg-primary-20 cursor-not-allowed text-app-secondary-80' 
                      : 'bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary'
                  }`}
                >
                  <FileUp size={16} />
                  <span className="hidden sm:inline">{isProcessingFile ? 'PROCESSING...' : 'FILE'}</span>
                </button>
              </WalletTooltip>
            </div>

            {/* Quick Actions */}
            <WalletTooltip content="Export all wallets" position="bottom">
              <button
                onClick={() => downloadAllWallets(wallets)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all duration-300 touch-manipulation bg-app-quaternary text-app-primary border border-app-primary-40 hover:border-app-primary-60 hover:bg-app-tertiary"
              >
                <Download size={16} />
                <span className="hidden sm:inline">EXPORT ALL</span>
              </button>
            </WalletTooltip>

            <WalletTooltip content="Remove empty wallets" position="bottom">
              <button
                onClick={() => handleCleanupWallets(wallets, solBalances, tokenBalances, setWallets, showToast)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all duration-300 touch-manipulation bg-app-quaternary border border-error-alt-40 hover:border-error-alt text-error-alt hover:bg-app-tertiary"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">CLEANUP EMPTY</span>
              </button>
            </WalletTooltip>

            {/* Archive View Toggle */}
            <WalletTooltip content={showArchived ? "Show active wallets" : "Show archived wallets"} position="bottom">
              <button
                onClick={() => {
                  setShowArchived(!showArchived);
                  setSelectedWallets(new Set());
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all duration-300 touch-manipulation ${
                  showArchived
                    ? 'bg-app-primary-color text-black border border-app-primary-60 font-bold'
                    : 'bg-app-quaternary text-app-primary border border-app-primary-40 hover:border-app-primary-60 hover:bg-app-tertiary'
                }`}
              >
                <Archive size={16} />
                <span className="hidden sm:inline">{showArchived ? 'ARCHIVED' : 'ARCHIVE'}</span>
              </button>
            </WalletTooltip>

            {/* Bulk Actions */}
            {selectedWallets.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <WalletTooltip content="Download Selected" position="bottom">
                  <button
                    onClick={downloadSelectedWallets}
                    className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-app-primary-60 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Download size={16} className="color-primary" />
                  </button>
                </WalletTooltip>
                
                {!showArchived && (
                  <WalletTooltip content="Archive Selected" position="bottom">
                    <button
                      onClick={archiveSelectedWallets}
                      className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-app-primary-60 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Archive size={16} className="color-primary" />
                    </button>
                  </WalletTooltip>
                )}
                
                {showArchived && (
                  <WalletTooltip content="Unarchive Selected" position="bottom">
                    <button
                      onClick={unarchiveSelectedWallets}
                      className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-app-primary-60 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Archive size={16} className="text-app-primary-color" />
                    </button>
                  </WalletTooltip>
                )}
                
                <WalletTooltip content="Delete Selected" position="bottom">
                  <button
                    onClick={deleteSelectedWallets}
                    className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-red-500 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </WalletTooltip>
                
                <span className="px-3 py-2 bg-app-quaternary border border-app-primary-20 rounded-lg text-xs sm:text-sm font-mono color-primary whitespace-nowrap flex items-center">
                  {selectedWallets.size} selected
                </span>
              </div>
            )}
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
                  <button
                    onClick={selectedWallets.size === filteredAndSortedWallets.length ? clearSelection : selectAllVisible}
                    className="color-primary hover-text-app-primary transition-colors touch-manipulation"
                  >
                    {selectedWallets.size === filteredAndSortedWallets.length && filteredAndSortedWallets.length > 0 ? 
                      <CheckSquare size={14} className="sm:w-4 sm:h-4" /> : <Square size={14} className="sm:w-4 sm:h-4" />
                    }
                  </button>
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
                {tokenAddress && (
                  <th className="p-2 sm:p-3 text-left bg-app-primary">
                    <button
                      onClick={() => handleSort('tokenBalance')}
                      className="flex items-center gap-1 sm:gap-2 text-app-secondary-80 hover:color-primary transition-colors touch-manipulation text-[10px] sm:text-xs"
                    >
                      TOKEN BALANCE
                      <SortIcon field="tokenBalance" />
                    </button>
                  </th>
                )}
                <th className="p-2 sm:p-3 text-left text-app-secondary-80 text-[10px] sm:text-xs bg-app-primary">PRIVATE KEY</th>
                <th className="p-2 sm:p-3 text-left text-app-secondary-80 text-[10px] sm:text-xs bg-app-primary">ACTIONS</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {filteredAndSortedWallets.map((wallet) => {
                const isSelected = selectedWallets.has(wallet.id);
                const solBalance = solBalances.get(wallet.address) || 0;
                const tokenBalance = tokenBalances.get(wallet.address) || 0;
                
                return (
                  <tr 
                    key={wallet.id}
                    className={`border-b border-app-primary-20 hover:bg-app-quaternary transition-colors ${
                      isSelected ? 'bg-app-quaternary' : ''
                    }`}
                  >
                    <td className="p-2 sm:p-3">
                      <button
                        onClick={() => toggleWalletSelection(wallet.id)}
                        className="color-primary hover-text-app-primary transition-colors touch-manipulation"
                      >
                        {isSelected ? <CheckSquare size={14} className="sm:w-4 sm:h-4" /> : <Square size={14} className="sm:w-4 sm:h-4" />}
                      </button>
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
                          <span className={`text-app-primary font-mono text-xs sm:text-sm px-2 py-1 rounded ${
                            wallet.category === 'Soft' ? 'bg-green-500/20 text-green-400' :
                            wallet.category === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            wallet.category === 'Hard' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {wallet.category || 'Medium'}
                          </span>
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
                    {tokenAddress && (
                      <td className="p-2 sm:p-3">
                        <span className={`${tokenBalance > 0 ? 'color-primary' : 'text-app-secondary-80'} font-bold text-xs sm:text-sm`}>
                          {tokenBalance.toLocaleString()}
                        </span>
                      </td>
                    )}
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
          onImportPrivateKey={async (privateKey: string) => {
            if (!connection) return;
            
            try {
              const { wallet, error } = importWallet(privateKey);
              
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
                
                if (tokenAddress) {
                  const tokenBalance = await fetchTokenBalance(connection, wallet.address, tokenAddress);
                  const newTokenBalances = new Map(tokenBalances);
                  newTokenBalances.set(wallet.address, tokenBalance);
                  setTokenBalances(newTokenBalances);
                } else {
                  const newTokenBalances = new Map(tokenBalances);
                  newTokenBalances.set(wallet.address, 0);
                  setTokenBalances(newTokenBalances);
                }
                
                showToast('Wallet imported successfully', 'success');
              } else {
                showToast('Failed to import wallet', 'error');
              }
            } catch (error) {
              console.error('Error importing wallet:', error);
              showToast('Failed to import wallet', 'error');
            }
          }}
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
  );
};

