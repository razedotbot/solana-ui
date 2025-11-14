import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  Edit3,
  Check,
  XCircle,
  Plus,
  Key,
  FileUp,
  ArrowRight,
  Archive
} from 'lucide-react';
import type { Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { WalletTooltip } from '../styles/Styles';
import type { WalletType, WalletCategory } from '../Utils';
import { 
  formatAddress, 
  copyToClipboard, 
  downloadPrivateKey,
  deleteWallet,
  saveWalletsToCookies,
  createNewWallet,
  importWallet,
  fetchSolBalance,
  fetchTokenBalance,
  downloadAllWallets,
  handleCleanupWallets
} from '../Utils';

interface WalletOverviewProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  solBalances: Map<string, number>;
  setSolBalances: (balances: Map<string, number>) => void;
  tokenBalances: Map<string, number>;
  setTokenBalances: (balances: Map<string, number>) => void;
  tokenAddress: string;
  connection: Connection | null;
  handleRefresh: () => void;
  isRefreshing: boolean;
  showToast: (message: string, type: 'success' | 'error') => void;
  onOpenSettings: () => void;
}

// Prefix unused parameters with underscore to satisfy linting rules

type SortField = 'solBalance' | 'tokenBalance';
type SortDirection = 'asc' | 'desc';

const WalletOverview: React.FC<WalletOverviewProps> = ({
  isOpen,
  onClose,
  wallets,
  setWallets,
  solBalances,
  setSolBalances,
  tokenBalances,
  setTokenBalances,
  tokenAddress,
  connection,
  handleRefresh: _handleRefresh,
  isRefreshing: _isRefreshing,
  showToast,
  onOpenSettings: _onOpenSettings
}) => {
  // All hooks must be called before any conditional returns
  const [sortField, setSortField] = useState<SortField>('solBalance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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

  // Filter and sort wallets - useMemo must also be called before conditional return
  const filteredAndSortedWallets = useMemo(() => {
    const filtered = wallets.filter(wallet => {
      // Archive filter - show only archived or only non-archived based on showArchived state
      const matchesArchivedFilter = showArchived ? wallet.isArchived === true : !wallet.isArchived;
      
      // Address search filter
      const matchesAddressSearch = wallet.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Label search filter
      const matchesLabelSearch = labelSearchTerm.trim() === '' || 
        (wallet.label && wallet.label.toLowerCase().includes(labelSearchTerm.toLowerCase()));
      
      return matchesArchivedFilter && matchesAddressSearch && matchesLabelSearch;
    });

    // Sort filtered results
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
  }, [wallets, sortField, sortDirection, searchTerm, labelSearchTerm, solBalances, tokenBalances, showArchived]);

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

  // Now we can have conditional returns after all hooks are called
  if (!isOpen) return null;

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

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-app-overlay flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-app-primary border border-app-primary-30 rounded-xl p-6 
                     w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-app-primary-20 gap-3 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-2 sm:flex sm:gap-6 text-xs sm:text-sm font-mono w-full sm:w-auto">
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

            <div className="flex gap-2 self-end sm:self-auto">              
              <button 
                onClick={onClose}
                className="p-2 color-primary hover-color-primary-light transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
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
                    setSelectedWallets(new Set()); // Clear selection when switching views
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
                            // Keep search open if there's a search term
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
                          <X size={12} className="text-app-secondary-80 hover:text-app-primary" />
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
                    {showAddressSearch ? (
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                        <input
                          type="text"
                          placeholder="Search address..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onBlur={() => {
                            // Keep search open if there's a search term
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
                          <X size={12} className="text-app-secondary-80 hover:text-app-primary" />
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
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  };

export default WalletOverview;