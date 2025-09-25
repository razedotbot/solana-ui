import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, X, CheckCircle, Info, Search, ChevronRight, Settings, DollarSign, ArrowUp, ArrowDown, Upload, RefreshCw, Copy, Check, ExternalLink } from 'lucide-react';
import { getWallets, getWalletDisplayName } from '../Utils';
import { useToast } from "../Notifications";
import { executeBonkCreate, WalletForBonkCreate, TokenMetadata, BonkCreateConfig } from '../utils/bonkcreate';

const STEPS_DEPLOY = ["Token Details", "Select Wallets", "Review"];
const MAX_WALLETS = 5; // Maximum number of wallets that can be selected
const MIN_WALLETS = 2; // Minimum number of wallets required (developer + 1 buyer)

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeployBonkModalProps extends BaseModalProps {
  onDeploy: (data: any) => void;
  handleRefresh: () => void;
  solBalances: Map<string, number>;
}

export const DeployBonkModal: React.FC<DeployBonkModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
  handleRefresh,
  solBalances,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [tokenData, setTokenData] = useState<TokenMetadata>({
    name: '',
    symbol: '',
    description: '',
    decimals: 6,
    supply: '1000000000000000',
    totalSellA: '793100000000000',
    telegram: '',
    twitter: '',
    website: '',
    createdOn: 'https://bonk.fun',
    uri: '', // image URL
    type: 'meme' // default to meme
  });
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showInfoTip, setShowInfoTip] = useState(false);
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      showToast("Please select a valid image file (JPEG, PNG, GIF, SVG)", "error");
      return;
    }
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image file size should be less than 2MB", "error");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // Create URL based on base URL
      const baseUrl = 'https://img.fury.bot';
      const uploadUrl = `${baseUrl}/upload-image`;
      
      // Upload with progress tracking
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          setTokenData(prev => ({ ...prev, uri: response.url }));
          showToast("Image uploaded successfully", "success");
        } else {
          showToast("Failed to upload image", "error");
        }
        setIsUploading(false);
      });
      
      xhr.addEventListener('error', () => {
        showToast("Failed to upload image", "error");
        setIsUploading(false);
      });
      
      xhr.open('POST', uploadUrl);
      xhr.send(formData);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast("Failed to upload image", "error");
      setIsUploading(false);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Get all wallets and filter those with SOL balance > 0
  const allWallets = getWallets();
  const wallets = allWallets.filter(wallet => (solBalances.get(wallet.address) || 0) > 0);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      handleRefresh();
      // Reset states when opening modal
      setCurrentStep(0);
      setSelectedWallets([]);
      setWalletAmounts({});
      setIsConfirmed(false);
    }
  }, [isOpen]);

  // Filter and sort wallets based on search term and other criteria
  const filterWallets = (walletList, search: string) => {
    // Apply search filter
    let filtered = walletList;
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Apply balance filter
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'nonZero') {
        filtered = filtered.filter(wallet => (solBalances.get(wallet.address) || 0) > 0);
      } else if (balanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => (solBalances.get(wallet.address) || 0) >= 0.1);
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => (solBalances.get(wallet.address) || 0) < 0.1 && (solBalances.get(wallet.address) || 0) > 0);
      }
    }
    
    // Sort the wallets
    return filtered.sort((a, b) => {
      if (sortOption === 'address') {
        return sortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (sortOption === 'balance') {
        const balanceA = solBalances.get(a.address) || 0;
        const balanceB = solBalances.get(b.address) || 0;
        return sortDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
      }
      return 0;
    });
  };

  const handleWalletSelection = (privateKey: string) => {
    setSelectedWallets(prev => {
      if (prev.includes(privateKey)) {
        return prev.filter(key => key !== privateKey);
      }
      // Check if already at max capacity
      if (prev.length >= MAX_WALLETS) {
        showToast(`Maximum ${MAX_WALLETS} wallets can be selected`, "error");
        return prev;
      }
      return [...prev, privateKey];
    });
  };

  const handleAmountChange = (privateKey: string, amount: string) => {
    if (amount === '' || /^\d*\.?\d*$/.test(amount)) {
      setWalletAmounts(prev => ({
        ...prev,
        [privateKey]: amount
      }));
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0:
        if (!tokenData.name || !tokenData.symbol || !tokenData.uri || !tokenData.description) {
          showToast("Name, symbol, description and logo image are required", "error");
          return false;
        }
        break;
      case 1:
        if (selectedWallets.length < MIN_WALLETS) {
          showToast("Please select at least 2 wallets (developer + 1 buyer)", "error");
          return false;
        }
        if (selectedWallets.length > MAX_WALLETS) {
          showToast(`Maximum ${MAX_WALLETS} wallets can be selected`, "error");
          return false;
        }
        const hasAllAmounts = selectedWallets.every(wallet => 
          walletAmounts[wallet] && Number(walletAmounts[wallet]) > 0
        );
        if (!hasAllAmounts) {
          showToast("Please enter valid amounts for all selected wallets", "error");
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep(prev => Math.min(prev + 1, STEPS_DEPLOY.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsSubmitting(true);
    
    try {
      // Get owner wallet (first wallet)
      if (selectedWallets.length === 0) {
        throw new Error("No wallets selected");
      }
      
      const ownerPrivateKey = selectedWallets[0];
      const ownerWallet = wallets.find(w => w.privateKey === ownerPrivateKey);
      
      if (!ownerWallet) {
        throw new Error("Owner wallet not found");
      }
      
      // Format buyer wallets (all wallets except the first/owner)
      const buyerWallets: WalletForBonkCreate[] = selectedWallets.slice(1).map(privateKey => {
        const wallet = wallets.find(w => w.privateKey === privateKey);
        if (!wallet) {
          throw new Error(`Wallet not found`);
        }
        return {
          publicKey: wallet.address,
          privateKey: privateKey,
          amount: parseFloat(walletAmounts[privateKey]) * 1e9 // Convert to lamports
        };
      });
      
      // Create config object
      const config: BonkCreateConfig = {
        tokenMetadata: tokenData,
        ownerPublicKey: ownerWallet.address,
        initialBuyAmount: parseFloat(walletAmounts[ownerPrivateKey]) || 0.1,
        type: tokenData.type || 'meme'
      };
      
      console.log(`Starting token creation with ${buyerWallets.length + 1} wallets`);
      
      // Call our bonk create execution function
      const result = await executeBonkCreate(
        config,
        {
          publicKey: ownerWallet.address, 
          privateKey: ownerPrivateKey
        },
        buyerWallets
      );
      
      if (result.success && result.mintAddress && result.poolId) {
        showToast(`Token deployment successful! Mint: ${result.mintAddress}`, "success");
        
        // Reset form states
        setSelectedWallets([]);
        setWalletAmounts({});
        setTokenData({
          name: '',
          symbol: '',
          description: '',
          decimals: 6,
          supply: '1000000000000000',
          totalSellA: '793100000000000',
          telegram: '',
          twitter: '',
          website: '',
          createdOn: 'https://bonk.fun',
          uri: '',
          type: 'meme'
        });
        setIsConfirmed(false);
        setCurrentStep(0);
        
        // Close modal
        onClose();
        
        // Set tokenAddress in URL and reload page
        const url = new URL(window.location.href);
        url.searchParams.set('tokenAddress', result.mintAddress);
        window.history.pushState({}, '', url);
        window.location.reload();
      } else {
        throw new Error(result.error || "Token deployment failed");
      }
    } catch (error) {
      console.error('Error during token deployment:', error);
      showToast(`Token deployment failed: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Format SOL balance for display
  const formatSolBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  // Calculate total SOL to be used
  const calculateTotalAmount = () => {
    return selectedWallets.reduce((total, wallet) => {
      return total + (parseFloat(walletAmounts[wallet]) || 0);
    }, 0);
  };

  // Get wallet by private key
  const getWalletByPrivateKey = (privateKey: string) => {
    return wallets.find(wallet => wallet.privateKey === privateKey);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
                <PlusCircle size={16} className="color-primary" />
              </div>
              <h3 className="text-lg font-semibold text-app-primary font-mono">
                <span className="color-primary">/</span> TOKEN DETAILS <span className="color-primary">/</span>
              </h3>
            </div>
            
            <div className="bg-app-primary border border-app-primary-40 rounded-lg shadow-lg modal-glow">
              <div className="p-6 space-y-6 relative">
                {/* Ambient grid background */}
                <div className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid"></div>
              
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-app-secondary flex items-center gap-1 font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Name <span className="color-primary">*</span> <span className="color-primary">&#60;</span>
                    </label>
                    <input
                      type="text"
                      value={tokenData.name}
                      onChange={(e) => setTokenData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all modal-input-cyberpunk font-mono"
                      placeholder="ENTER TOKEN NAME"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-app-secondary flex items-center gap-1 font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Symbol <span className="color-primary">*</span> <span className="color-primary">&#60;</span>
                    </label>
                    <input
                      type="text"
                      value={tokenData.symbol}
                      onChange={(e) => setTokenData(prev => ({ ...prev, symbol: e.target.value }))}
                      className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all modal-input-cyberpunk font-mono"
                      placeholder="ENTER TOKEN SYMBOL"
                    />
                  </div>
                  
                <div className="space-y-3">
                  <label className="text-sm font-medium text-app-secondary flex items-center gap-1 font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Token Logo <span className="color-primary">*</span> <span className="color-primary">&#60;</span>
                  </label>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/jpeg, image/png, image/gif, image/svg+xml"
                    className="hidden"
                  />
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      disabled={isUploading}
                      className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all ${
                        isUploading 
                          ? 'bg-app-tertiary text-app-secondary cursor-not-allowed border border-app-primary-20' 
                          : 'bg-app-tertiary hover:bg-app-secondary border border-app-primary-40 hover:border-app-primary text-app-primary shadow-lg hover:shadow-app-primary-40 transform hover:-translate-y-0.5 modal-btn-cyberpunk'
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin color-primary" />
                          <span className="font-mono tracking-wider">UPLOADING... {uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} className="color-primary" />
                          <span className="font-mono tracking-wider">UPLOAD</span>
                        </>
                      )}
                    </button>
                    
                    {tokenData.uri && (
                      <div className="flex items-center gap-3 flex-grow">
                        <div className="h-12 w-12 rounded overflow-hidden border border-app-primary-40 bg-app-tertiary flex items-center justify-center">
                          <img 
                            src={tokenData.uri}
                            alt="Logo Preview"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '/api/placeholder/48/48';
                              e.currentTarget.alt = 'Failed to load';
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setTokenData(prev => ({ ...prev, uri: '' }))}
                          className="p-1.5 rounded-full hover:bg-app-tertiary text-app-secondary hover:text-app-primary transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {isUploading && (
                    <div className="w-full bg-app-tertiary rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-app-primary-color h-1.5 rounded-full transition-all duration-300 progress-bar-cyberpunk"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                </div>
  
                <div className="space-y-2 relative z-10">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                  <span className="color-primary">&#62;</span> Description <span className="color-primary">*</span> <span className="color-primary">&#60;</span>
                  </label>
                  <textarea
                    value={tokenData.description}
                    onChange={(e) => setTokenData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all modal-input-cyberpunk min-h-24 font-mono"
                    placeholder="DESCRIBE YOUR TOKEN"
                    rows={3}
                  />
                </div>

                <div className="space-y-2 relative z-10">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Token Type <span className="color-primary">*</span> <span className="color-primary">&#60;</span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setTokenData(prev => ({ ...prev, type: 'meme' }))}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-mono tracking-wider transition-all ${
                        tokenData.type === 'meme'
                          ? 'bg-app-primary-color text-app-primary border border-app-primary shadow-lg transform -translate-y-0.5'
                          : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary hover-bg-secondary'
                      }`}
                    >
                      MEME
                    </button>
                    <button
                      type="button"
                      onClick={() => setTokenData(prev => ({ ...prev, type: 'tech' }))}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-mono tracking-wider transition-all ${
                        tokenData.type === 'tech'
                          ? 'bg-app-primary-color text-app-primary border border-app-primary shadow-lg transform -translate-y-0.5'
                          : 'bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary hover-bg-secondary'
                      }`}
                    >
                      TECH
                    </button>
                  </div>
                </div>
  
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Telegram <span className="color-primary">&#60;</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={tokenData.telegram}
                        onChange={(e) => setTokenData(prev => ({ ...prev, telegram: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all modal-input-cyberpunk font-mono"
                        placeholder="T.ME/YOURGROUP"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-app-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21.8,5.1c-0.2-0.8-0.9-1.4-1.7-1.6C18.4,3,12,3,12,3S5.6,3,3.9,3.5C3.1,3.7,2.4,4.3,2.2,5.1C1.7,6.8,1.7,10,1.7,10s0,3.2,0.5,4.9c0.2,0.8,0.9,1.4,1.7,1.6C5.6,17,12,17,12,17s6.4,0,8.1-0.5c0.8-0.2,1.5-0.8,1.7-1.6c0.5-1.7,0.5-4.9,0.5-4.9S22.3,6.8,21.8,5.1z M9.9,13.1V6.9l5.4,3.1L9.9,13.1z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Twitter <span className="color-primary">&#60;</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={tokenData.twitter}
                        onChange={(e) => setTokenData(prev => ({ ...prev, twitter: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all modal-input-cyberpunk font-mono"
                        placeholder="@YOURHANDLE"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-app-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 4.01c-1 .49-1.98.689-3 .99-1.121-1.265-2.783-1.335-4.38-.737S11.977 6.323 12 8v1c-3.245.083-6.135-1.395-8-4 0 0-4.182 7.433 4 11-1.872 1.247-3.739 2.088-6 2 3.308 1.803 6.913 2.423 10.034 1.517 3.58-1.04 6.522-3.723 7.651-7.742a13.84 13.84 0 0 0 .497-3.753C20.18 7.773 21.692 5.25 22 4.009z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Website <span className="color-primary">&#60;</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={tokenData.website}
                        onChange={(e) => setTokenData(prev => ({ ...prev, website: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all modal-input-cyberpunk font-mono"
                        placeholder="HTTPS://YOURSITE.COM"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-app-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0zm14-6a9 9 0 0 0-4-2m-6 2a9 9 0 0 0-2 4m2 6a9 9 0 0 0 4 2m6-2a9 9 0 0 0 2-4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
                  <Settings size={16} className="color-primary" />
                </div>
                <h3 className="text-lg font-semibold text-app-primary font-mono">
                  <span className="color-primary">/</span> SELECT WALLETS & ORDER <span className="color-primary">/</span>
                </h3>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedWallets.length === wallets.length || selectedWallets.length > 0) {
                      setSelectedWallets([]);
                    } else {
                      // Only select up to MAX_WALLETS
                      const walletsToSelect = wallets.slice(0, MAX_WALLETS);
                      setSelectedWallets(walletsToSelect.map(w => w.privateKey));
                      if (wallets.length > MAX_WALLETS) {
                        showToast(`Maximum ${MAX_WALLETS} wallets can be selected`, "error");
                      }
                    }
                  }}
                  className="text-sm color-primary hover:text-app-secondary font-medium transition duration-200 font-mono glitch-text"
                >
                  {selectedWallets.length > 0 ? 'DESELECT ALL' : 'SELECT ALL'}
                </button>
              </div>
            </div>
  
            {/* Search and Filter Controls */}
            <div className="flex items-center space-x-3 mb-3">
              <div className="relative flex-grow">
                <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus:border-app-primary transition-all modal-input-cyberpunk font-mono"
                  placeholder="SEARCH WALLETS..."
                />
              </div>
              
              <select 
                className="bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-2.5 text-sm text-app-primary focus:outline-none focus:border-app-primary modal-input-cyberpunk font-mono"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="address">ADDRESS</option>
                <option value="balance">BALANCE</option>
              </select>
              
              <button
                className="p-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-secondary hover:border-app-primary hover:color-primary transition-all modal-btn-cyberpunk flex items-center justify-center"
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              </button>

              <select 
                className="bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-2.5 text-sm text-app-primary focus:outline-none focus:border-app-primary modal-input-cyberpunk font-mono"
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value)}
              >
                <option value="all">ALL BALANCES</option>
                <option value="nonZero">NON-ZERO</option>
                <option value="highBalance">HIGH BALANCE</option>
                <option value="lowBalance">LOW BALANCE</option>
              </select>
            </div>

            {/* Wallet Selection Limit Info */}
            <div className="bg-app-tertiary border border-app-primary-40 rounded-lg p-3 mb-3 shadow-lg">
              <div className="flex items-center gap-2">
                <Info size={14} className="color-primary" />
                <span className="text-sm text-app-secondary font-mono">
                  YOU CAN SELECT A MAXIMUM OF {MAX_WALLETS} WALLETS (INCLUDING DEVELOPER WALLET)
                </span>
              </div>
            </div>

            {/* Summary Stats */}
            {selectedWallets.length > 0 && (
              <div className="bg-app-primary border border-app-primary-40 rounded-lg p-3 mb-3 shadow-lg modal-glow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-app-secondary font-mono">SELECTED:</span>
                    <span className="text-sm font-medium color-primary font-mono">
                      {selectedWallets.length} / {MAX_WALLETS} WALLET{selectedWallets.length !== 1 ? 'S' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-app-secondary font-mono">TOTAL SOL:</span>
                    <span className="text-sm font-medium color-primary font-mono">{calculateTotalAmount().toFixed(4)} SOL</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-app-primary border border-app-primary-40 rounded-lg shadow-lg modal-glow relative">
              {/* Ambient grid background */}
              <div className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid"></div>
              
              <div className="p-4 relative z-10">
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {/* Selected Wallets */}
                  {selectedWallets.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-app-secondary mb-2 font-mono uppercase tracking-wider">
                        <span className="color-primary">&#62;</span> Selected Wallets <span className="color-primary">&#60;</span>
                      </div>
                      {selectedWallets.map((privateKey, index) => {
                        const wallet = getWalletByPrivateKey(privateKey);
                        const solBalance = wallet ? solBalances.get(wallet.address) || 0 : 0;
                        
                        return (
                          <div
                            key={wallet?.id}
                            className="p-3 rounded-lg border border-app-primary bg-primary-10 mb-2 shadow-lg modal-glow"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (index > 0) {
                                        const newOrder = [...selectedWallets];
                                        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                                        setSelectedWallets(newOrder);
                                      }
                                    }}
                                    disabled={index === 0}
                                    className={`p-1 rounded hover:bg-app-tertiary transition-all ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'modal-btn-cyberpunk'}`}
                                  >
                                    <ArrowUp size={16} className="text-app-primary" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (index < selectedWallets.length - 1) {
                                        const newOrder = [...selectedWallets];
                                        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                        setSelectedWallets(newOrder);
                                      }
                                    }}
                                    disabled={index === selectedWallets.length - 1}
                                    className={`p-1 rounded hover:bg-app-tertiary transition-all ${index === selectedWallets.length - 1 ? 'opacity-50 cursor-not-allowed' : 'modal-btn-cyberpunk'}`}
                                  >
                                    <ArrowDown size={16} className="text-app-primary" />
                                  </button>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium color-primary font-mono">{index === 0 ? 'DEVELOPER' : `#${index + 1}`}</span>
                                    <span className="text-sm font-medium text-app-primary font-mono glitch-text">
                                      {wallet ? getWalletDisplayName(wallet) : 'UNKNOWN'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-app-secondary font-mono">BALANCE:</span>
                                    <span className="text-sm font-medium text-app-primary font-mono">{formatSolBalance(solBalance)} SOL</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <DollarSign size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary" />
                                  <input
                                    type="text"
                                    value={walletAmounts[privateKey] || ''}
                                    onChange={(e) => handleAmountChange(privateKey, e.target.value)}
                                    placeholder="AMOUNT"
                                    className="w-32 pl-9 pr-2 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all modal-input-cyberpunk font-mono"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleWalletSelection(privateKey)}
                                  className="p-1 rounded hover:bg-app-tertiary transition-all modal-btn-cyberpunk"
                                >
                                  <X size={18} className="text-app-secondary hover:text-app-primary" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Available Wallets - Only show if we haven't reached the maximum */}
                  {selectedWallets.length < MAX_WALLETS && (
                    <div>
                      <div className="text-sm font-medium text-app-secondary mb-2 font-mono uppercase tracking-wider">
                        <span className="color-primary">&#62;</span> Available Wallets <span className="color-primary">&#60;</span>
                      </div>
                      {filterWallets(wallets.filter(w => !selectedWallets.includes(w.privateKey)), searchTerm).map((wallet) => {
                        const solBalance = solBalances.get(wallet.address) || 0;
                        
                        return (
                          <div
                            key={wallet.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-app-primary-40 hover:border-app-primary hover:bg-app-tertiary transition-all duration-200 mb-2 cursor-pointer"
                            onClick={() => handleWalletSelection(wallet.privateKey)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-5 h-5 rounded-full border border-app-primary-40 flex items-center justify-center cursor-pointer hover:border-app-primary transition-all">
                                <PlusCircle size={14} className="text-app-secondary" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-sm font-medium text-app-primary font-mono glitch-text">
                                  {getWalletDisplayName(wallet)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-app-secondary font-mono">BALANCE:</span>
                                  <span className="text-sm font-medium text-app-primary font-mono">{formatSolBalance(solBalance)} SOL</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {filterWallets(wallets.filter(w => !selectedWallets.includes(w.privateKey)), searchTerm).length === 0 && (
                        <div className="text-center py-4 text-app-secondary font-mono">
                          {searchTerm ? "NO WALLETS FOUND MATCHING YOUR SEARCH" : "NO WALLETS AVAILABLE"}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Message when max wallets reached */}
                  {selectedWallets.length >= MAX_WALLETS && (
                    <div className="text-center py-4 bg-app-tertiary border border-app-primary-40 rounded-lg">
                      <div className="color-primary font-mono">
                        MAXIMUM NUMBER OF WALLETS ({MAX_WALLETS}) REACHED
                      </div>
                      <div className="text-app-secondary text-sm font-mono mt-1">
                        REMOVE A WALLET TO ADD A DIFFERENT ONE
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
  
      case 2:
        return (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
                <CheckCircle size={16} className="color-primary" />
              </div>
              <h3 className="text-lg font-semibold text-app-primary font-mono">
                <span className="color-primary">/</span> REVIEW DEPLOYMENT <span className="color-primary">/</span>
              </h3>
            </div>
  
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left column - Token Details */}
              <div className="bg-app-primary border border-app-primary-40 rounded-lg shadow-lg modal-glow relative">
                {/* Ambient grid background */}
                <div className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid"></div>
                
                <div className="p-6 space-y-4 relative z-10">
                  <h4 className="text-sm font-medium text-app-secondary mb-3 font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Token Details <span className="color-primary">&#60;</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">NAME:</span>
                      <span className="text-sm font-medium text-app-primary font-mono">{tokenData.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">SYMBOL:</span>
                      <span className="text-sm font-medium text-app-primary font-mono">{tokenData.symbol}</span>
                    </div>
                    {tokenData.description && (
                      <div className="flex items-start justify-between">
                        <span className="text-sm text-app-secondary font-mono">DESCRIPTION:</span>
                        <span className="text-sm text-app-primary text-right max-w-[70%] font-mono">
                          {tokenData.description.substring(0, 100)}{tokenData.description.length > 100 ? '...' : ''}
                        </span>
                      </div>
                    )}
                    {tokenData.uri && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-app-secondary font-mono">LOGO:</span>
                        <div className="bg-app-tertiary border border-app-primary-40 rounded-lg p-1 w-12 h-12 flex items-center justify-center">
                          <img 
                            src={tokenData.uri}
                            alt="Token Logo"
                            className="max-w-full max-h-full rounded object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '/api/placeholder/48/48';
                              e.currentTarget.alt = 'Failed to load';
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {(tokenData.telegram || tokenData.twitter || tokenData.website) && (
                    <>
                      <div className="h-px bg-app-primary-30 my-3"></div>
                      <h4 className="text-sm font-medium text-app-secondary mb-2 font-mono uppercase tracking-wider">
                        <span className="color-primary">&#62;</span> Social Links <span className="color-primary">&#60;</span>
                      </h4>
                      <div className="space-y-2">
                        {tokenData.telegram && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-app-secondary font-mono">TELEGRAM:</span>
                            <span className="text-sm color-primary font-mono">{tokenData.telegram}</span>
                          </div>
                        )}
                        {tokenData.twitter && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-app-secondary font-mono">TWITTER:</span>
                            <span className="text-sm color-primary font-mono">{tokenData.twitter}</span>
                          </div>
                        )}
                        {tokenData.website && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-app-secondary font-mono">WEBSITE:</span>
                            <span className="text-sm color-primary font-mono">{tokenData.website}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  <div className="h-px bg-app-primary-30 my-3"></div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">TOTAL SOL:</span>
                      <span className="text-sm font-medium color-primary font-mono">{calculateTotalAmount().toFixed(4)} SOL</span>
                    </div>
                  </div>
                </div>
                
                {/* Cyberpunk decorative corner elements */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-app-primary opacity-70"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-app-primary opacity-70"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-app-primary opacity-70"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-app-primary opacity-70"></div>
              </div>
              
              {/* Right column - Selected Wallets */}
              <div className="bg-app-primary border border-app-primary-40 rounded-lg shadow-lg modal-glow relative">
                {/* Ambient grid background */}
                <div className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid"></div>
                
                <div className="p-6 space-y-4 relative z-10">
                  <h4 className="text-sm font-medium text-app-secondary mb-3 font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Selected Wallets <span className="color-primary">&#60;</span>
                  </h4>
                  <div className="max-h-64 overflow-y-auto pr-1">
                    {selectedWallets.map((key, index) => {
                      const wallet = getWalletByPrivateKey(key);
                      const solBalance = wallet ? solBalances.get(wallet.address) || 0 : 0;
                      
                      return (
                        <div key={index} className="flex justify-between items-center p-3 bg-app-tertiary rounded-lg mb-2 border border-app-primary-30 hover:border-app-primary transition-all">
                          <div className="flex items-center gap-2">
                            <span className="color-primary text-xs font-medium w-6 font-mono">{index === 0 ? 'DEV' : `#${index + 1}`}</span>
                            <span className="font-mono text-sm text-app-primary glitch-text">
                              {wallet ? getWalletDisplayName(wallet) : 'UNKNOWN'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-app-secondary font-mono">CURRENT: {formatSolBalance(solBalance)} SOL</span>
                            <span className="text-sm font-medium color-primary font-mono">{walletAmounts[key]} SOL</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Cyberpunk decorative corner elements */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-app-primary opacity-70"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-app-primary opacity-70"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-app-primary opacity-70"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-app-primary opacity-70"></div>
              </div>
            </div>
  
            <div className="bg-app-primary border border-app-primary-40 rounded-lg shadow-lg modal-glow">
              <div className="p-4 relative">
                {/* Ambient grid background */}
                <div className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid"></div>
                
                <div className="flex items-center gap-4 relative z-10">
                  <div 
                    onClick={() => setIsConfirmed(!isConfirmed)}
                    className="relative w-5 h-5 cursor-pointer"
                  >
                    <div className={`w-5 h-5 border rounded transition-all ${isConfirmed ? 'bg-app-primary-color border-app-primary' : 'border-app-primary-40'}`}></div>
                    {isConfirmed && (
                      <CheckCircle size={14} className="absolute top-0.5 left-0.5" style={{ color: 'var(--color-bg-primary)' }} />
                    )}
                  </div>
                  <label 
                    onClick={() => setIsConfirmed(!isConfirmed)}
                    className="text-sm text-app-primary leading-relaxed cursor-pointer select-none font-mono"
                  >
                    I CONFIRM THAT I WANT TO DEPLOY THIS TOKEN USING {selectedWallets.length} WALLET{selectedWallets.length !== 1 ? 'S' : ''}.
                    THIS ACTION CANNOT BE UNDONE.
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      
      // New Success Step
    }
  };
  
  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // Animation keyframes for cyberpunk elements - updated to use CSS variables
  const modalStyleElement = document.createElement('style');
  modalStyleElement.textContent = `
    @keyframes modal-pulse {
      0% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
      50% { box-shadow: 0 0 15px var(--color-primary-80), 0 0 25px var(--color-primary-40); }
      100% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
    }
    
    @keyframes modal-fade-in {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    
    @keyframes modal-slide-up {
      0% { transform: translateY(20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes modal-scan-line {
      0% { transform: translateY(-100%); opacity: 0.3; }
      100% { transform: translateY(100%); opacity: 0; }
    }
    
    .modal-cyberpunk-container {
      animation: modal-fade-in 0.3s ease;
    }
    
    .modal-cyberpunk-content {
      animation: modal-slide-up 0.4s ease;
      position: relative;
    }
    
    .modal-cyberpunk-content::before {
      content: "";
      position: absolute;
      width: 100%;
      height: 5px;
      background: linear-gradient(to bottom, 
        transparent 0%,
        var(--color-primary-20) 50%,
        transparent 100%);
      z-index: 10;
      animation: modal-scan-line 8s linear infinite;
      pointer-events: none;
    }
    
    .modal-glow {
      animation: modal-pulse 4s infinite;
    }
    
    .modal-input-cyberpunk:focus {
      box-shadow: 0 0 0 1px var(--color-primary-70), 0 0 15px var(--color-primary-50);
      transition: all 0.3s ease;
    }
    
    .modal-btn-cyberpunk {
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .modal-btn-cyberpunk::after {
      content: "";
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        to bottom right,
        var(--color-primary-05) 0%,
        var(--color-primary-30) 50%,
        var(--color-primary-05) 100%
      );
      transform: rotate(45deg);
      transition: all 0.5s ease;
      opacity: 0;
    }
    
    .modal-btn-cyberpunk:hover::after {
      opacity: 1;
      transform: rotate(45deg) translate(50%, 50%);
    }
    
    .modal-btn-cyberpunk:active {
      transform: scale(0.95);
    }
    
    .progress-bar-cyberpunk {
      position: relative;
      overflow: hidden;
    }
    
    .progress-bar-cyberpunk::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        var(--color-primary-70) 50%,
        transparent 100%
      );
      width: 100%;
      height: 100%;
      transform: translateX(-100%);
      animation: progress-shine 3s infinite;
    }
    
    @keyframes progress-shine {
      0% { transform: translateX(-100%); }
      20% { transform: translateX(100%); }
      100% { transform: translateX(100%); }
    }
    
    .glitch-text:hover {
      text-shadow: 0 0 2px var(--color-primary), 0 0 4px var(--color-primary);
      animation: glitch 2s infinite;
    }
    
    @keyframes glitch {
      2%, 8% { transform: translate(-2px, 0) skew(0.3deg); }
      4%, 6% { transform: translate(2px, 0) skew(-0.3deg); }
      62%, 68% { transform: translate(0, 0) skew(0.33deg); }
      64%, 66% { transform: translate(0, 0) skew(-0.33deg); }
    }
  `;
  document.head.appendChild(modalStyleElement);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm modal-cyberpunk-container bg-app-primary-85">
      <div className="relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-3xl overflow-hidden transform modal-cyberpunk-content modal-glow">
        {/* Ambient grid background */}
        <div className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid"></div>

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
              <PlusCircle size={16} className="color-primary" />
            </div>
            <h2 className="text-lg font-semibold text-app-primary font-mono">
              <span className="color-primary">/</span> DEPLOY BONK TOKEN <span className="color-primary">/</span>
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-app-secondary hover:color-primary transition-colors p-1 hover:bg-primary-20 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="relative w-full h-1 bg-app-tertiary progress-bar-cyberpunk">
          <div 
            className="h-full bg-app-primary-color transition-all duration-300"
            style={{ width: `${(currentStep + 1) / 3 * 100}%` }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 max-h-[80vh] overflow-y-auto">
          <form onSubmit={currentStep === 2 ? handleDeploy : (e) => e.preventDefault()}>
            <div className="min-h-[300px]">
              {renderStepContent()}
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t border-app-primary-30">
              <button
                type="button"
                onClick={currentStep === 0 ? onClose : handleBack}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-app-primary bg-app-tertiary border border-app-primary-30 hover-bg-secondary hover:border-app-primary rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-cyberpunk"
              >
                {currentStep === 0 ? 'CANCEL' : 'BACK'}
              </button>

              <button
                type={currentStep === 2 ? 'submit' : 'button'}
                onClick={currentStep === 2 ? undefined : handleNext}
                disabled={currentStep === 2 ? (isSubmitting || !isConfirmed) : isSubmitting}
                className={`px-5 py-2.5 rounded-lg flex items-center transition-all shadow-lg font-mono tracking-wider ${
                  currentStep === 2 && (isSubmitting || !isConfirmed)
                    ? 'bg-primary-50 cursor-not-allowed opacity-50'
                    : 'bg-app-primary-color hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-cyberpunk'
                } text-app-primary`}
              >
                {currentStep === 2 ? (
                  isSubmitting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-app-primary border-t-transparent animate-spin mr-2"></div>
                      <span>DEPLOYING...</span>
                    </>
                  ) : 'CONFIRM DEPLOY'
                ) : (
                  <span className="flex items-center">
                    NEXT
                    <ChevronRight size={16} className="ml-1" />
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Cyberpunk decorative corner elements */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-app-primary opacity-70"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-app-primary opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-app-primary opacity-70"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-app-primary opacity-70"></div>
      </div>
    </div>,
    document.body
  );
};