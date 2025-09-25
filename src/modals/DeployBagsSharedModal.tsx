import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, X, CheckCircle, Info, Search, ChevronRight, Settings, DollarSign, ArrowUp, ArrowDown, Upload, RefreshCw, Copy, Check, ExternalLink, Users, Percent } from 'lucide-react';
import { getWallets, getWalletDisplayName, loadConfigFromCookies } from '../Utils';
import { useToast } from "../Notifications";
import { 
  executeSharedFeesBagsCreate, 
  WalletForBagsSharedCreate, 
  createSharedFeesConfig, 
  createSharedCreateConfig, 
  BagsSharedFeesConfig,
  BagsSharedCreateConfig,
  checkSharedFeesConfig, 
  signAndSendSharedConfigTransaction, 
  BagsSharedConfigResponse,
  createTokenAndConfig,
  BagsSharedTokenCreateConfig,
  BagsSharedTokenCreateResponse,
  sendLaunchTransactions
} from '../utils/bagscreateshared';

const STEPS_DEPLOY = ["Token & Fees Details", "Select Wallets", "Review"];
const MAX_WALLETS = 5; // Maximum number of wallets that can be selected
const MIN_WALLETS = 2; // Minimum number of wallets required (developer + 1 buyer)

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeployBagsSharedFeesModalProps extends BaseModalProps {
  onDeploy: (data: any) => void;
  handleRefresh: () => void;
  solBalances: Map<string, number>;
}

// Update TokenMetadata interface for shared fees
interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  totalSupply: string;
  links: Array<{url: string, label: string}>;
}

// Shared fees configuration
interface SharedFeesConfig {
  feeClaimerTwitterHandle: string;
  creatorFeeBps: number;
  feeClaimerFeeBps: number;
}

export const DeployBagsSharedFeesModal: React.FC<DeployBagsSharedFeesModalProps> = ({
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
    imageUrl: '',
    totalSupply: '1000000000', // Default supply for Bags
    links: [] // Links array for Bags
  });
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showInfoTip, setShowInfoTip] = useState(false);
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Shared fees configuration state
  const [sharedFeesConfig, setSharedFeesConfig] = useState<SharedFeesConfig>({
    feeClaimerTwitterHandle: '',
    creatorFeeBps: 1000, // 10% for creator
    feeClaimerFeeBps: 9000, // 90% for fee claimer
  });
  
  // Config-related state
  const [configNeeded, setConfigNeeded] = useState(false);
  const [configTransaction, setConfigTransaction] = useState<string>('');
  const [configInstructions, setConfigInstructions] = useState<string>('');
  const [configKey, setConfigKey] = useState<string>('');
  const [feeShareInfo, setFeeShareInfo] = useState<any>(null);
  const [isCheckingConfig, setIsCheckingConfig] = useState(false);
  const [isSendingConfig, setIsSendingConfig] = useState(false);
  
  // Two-step process state
  const [tokenMint, setTokenMint] = useState<string>('');
  const [metadataUrl, setMetadataUrl] = useState<string>('');
  const [step1Completed, setStep1Completed] = useState(false);
  const [isStep1Processing, setIsStep1Processing] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState<'step1' | 'step2'>('step1');

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
          setTokenData(prev => ({ ...prev, imageUrl: response.url }));
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

  // Update social links when fields change
  const updateSocialLinks = (type: 'twitter' | 'telegram' | 'website', value: string) => {
    setTokenData(prev => {
      // Remove old link of this type if it exists
      const filteredLinks = prev.links.filter(link => link.label !== type);
      
      // Add new link if value is not empty
      let newLinks = [...filteredLinks];
      if (value) {
        let url = value;
        let label = '';
        
        // Format the URL properly
        if (type === 'twitter') {
          url = url.startsWith('https://') ? url : `https://x.com/${url.replace('@', '').replace('twitter.com/', '').replace('x.com/', '')}`;
          label = 'twitter';
        } else if (type === 'telegram') {
          url = url.startsWith('https://') ? url : `https://t.me/${url.replace('@', '').replace('t.me/', '')}`;
          label = 'telegram';
        } else if (type === 'website') {
          url = url.startsWith('http') ? url : `https://${url}`;
          label = 'website';
        }
        
        newLinks.push({ url, label });
      }
      
      return {
        ...prev,
        links: newLinks
      };
    });
  };

  // Helper functions to get social values from links array
  const getTwitter = () => {
    const twitterLink = tokenData.links.find(link => link.label === 'twitter');
    return twitterLink ? twitterLink.url : '';
  };
  
  const getWebsite = () => {
    const websiteLink = tokenData.links.find(link => link.label === 'website');
    return websiteLink ? websiteLink.url : '';
  };

  const getTelegram = () => {
    const telegramLink = tokenData.links.find(link => link.label === 'telegram');
    return telegramLink ? telegramLink.url : '';
  };

  // Handle fee split changes
  const handleFeeSplitChange = (field: 'creatorFeeBps' | 'feeClaimerFeeBps', value: string) => {
    const numValue = parseInt(value) || 0;
    
    setSharedFeesConfig(prev => {
      const newConfig = { ...prev };
      newConfig[field] = numValue;
      
      // Auto-adjust the other field to maintain 100% total
      if (field === 'creatorFeeBps') {
        newConfig.feeClaimerFeeBps = 10000 - numValue;
      } else {
        newConfig.creatorFeeBps = 10000 - numValue;
      }
      
      return newConfig;
    });
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
      setConfigNeeded(false);
      setConfigKey('');
      setMetadataUrl('');
      setFeeShareInfo(null);
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
        if (!tokenData.name || !tokenData.symbol || !tokenData.imageUrl || !tokenData.description) {
          showToast("Name, symbol, description and logo image are required", "error");
          return false;
        }
        if (!sharedFeesConfig.feeClaimerTwitterHandle) {
          showToast("Fee claimer Twitter handle is required", "error");
          return false;
        }
        if (sharedFeesConfig.creatorFeeBps + sharedFeesConfig.feeClaimerFeeBps !== 10000) {
          showToast("Fee split must total 100%", "error");
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

    // If step 1 is already completed and user clicks launch again, restart from step 1
    if (step1Completed && deploymentStep === 'step2') {
      setStep1Completed(false);
      setDeploymentStep('step1');
      setTokenMint('');
      setConfigKey('');
      setMetadataUrl('');
      showToast("Restarting deployment from step 1...", "error");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get owner wallet (first selected wallet)
      const ownerWallet = wallets.find(w => w.privateKey === selectedWallets[0]);
      if (!ownerWallet) {
        throw new Error('Owner wallet not found');
      }
      
      // Load config to get RPC endpoint
      const savedConfig = loadConfigFromCookies();
      const rpcEndpoint = savedConfig?.rpcEndpoint;
      
      if (deploymentStep === 'step1') {
        // Step 1: Create token and fee share configuration
        setIsStep1Processing(true);
        
        const step1Config: BagsSharedTokenCreateConfig = {
          ownerPublicKey: ownerWallet.address,
          feeClaimerTwitterHandle: sharedFeesConfig.feeClaimerTwitterHandle,
          metadata: {
            name: tokenData.name,
            symbol: tokenData.symbol,
            description: tokenData.description,
            telegram: tokenData.links.find(link => link.label.toLowerCase() === 'telegram')?.url || '',
            twitter: tokenData.links.find(link => link.label.toLowerCase() === 'twitter')?.url || '',
            website: tokenData.links.find(link => link.label.toLowerCase() === 'website')?.url || ''
          },
          imageSource: tokenData.imageUrl,
          creatorFeeBps: sharedFeesConfig.creatorFeeBps,
          feeClaimerFeeBps: sharedFeesConfig.feeClaimerFeeBps,
          rpcUrl: rpcEndpoint
        };
        
        console.log('Step 1: Creating token and fee share configuration');
        const step1Result = await createTokenAndConfig(step1Config);
        
        if (step1Result.success) {
          // Check if we have ready-to-send transactions (new format)
          if (step1Result.transactions && step1Result.transactions.length > 0) {
            console.log('Backend returned ready-to-send transactions, proceeding with launch');
            
            // Format wallets for sending transactions
            const walletObjs: WalletForBagsSharedCreate[] = selectedWallets.map(privateKey => {
              const wallet = wallets.find(w => w.privateKey === privateKey);
              if (!wallet) {
                throw new Error(`Wallet not found for private key`);
              }
              return {
                address: wallet.address,
                privateKey
              };
            });
            
            // Send the launch transactions
            const launchResult = await sendLaunchTransactions(
              step1Result.transactions, 
              walletObjs, 
              step1Result.bundleOrder
            );
            
            if (launchResult.success) {
              const mintAddress = step1Result.tokenInfo?.mintAddress || step1Result.tokenMint;
              
              if (!mintAddress) {
                throw new Error('No mint address returned from step 1');
              }
              
              showToast(`Config bundle sent successfully! Mint address: ${mintAddress}. Now proceeding to step 2...`, "success");
              
              // Show URLs if available
              if (step1Result.urls) {
                console.log('Token URLs:', step1Result.urls);
              }
              
              // After config bundle is sent, proceed to step 2: fetch and send create transactions
              console.log('Step 1 completed, proceeding to step 2: fetching create transactions');
              
              try {
                // Format wallets for step 2
                const walletObjs: WalletForBagsSharedCreate[] = selectedWallets.map(privateKey => {
                  const wallet = wallets.find(w => w.privateKey === privateKey);
                  if (!wallet) {
                    throw new Error(`Wallet not found for private key`);
                  }
                  return {
                    address: wallet.address,
                    privateKey
                  };
                });
                
                // Create buyer wallets array from selected wallets (excluding the first one which is the owner)
                const buyerWallets = selectedWallets.slice(1).map(privateKey => {
                  const wallet = wallets.find(w => w.privateKey === privateKey);
                  return {
                    publicKey: wallet!.address,
                    amount: parseFloat(walletAmounts[privateKey] || "0.1")
                  };
                });
                
                // Get owner wallet (first selected wallet)
                const ownerWallet = wallets.find(w => w.privateKey === selectedWallets[0]);
                if (!ownerWallet) {
                  throw new Error('Owner wallet not found');
                }
                
                // Calculate total initial buy amount from all buyer wallets
                const initialBuyAmount = buyerWallets.reduce((total, wallet) => total + wallet.amount, 0);
                
                // Create shared create config for step 2
                const sharedCreateConfig = createSharedCreateConfig({
                  tokenMintAddress: mintAddress,
                  configKey: step1Result.tokenInfo?.configKey || step1Result.configKey || '',
                  metadataUrl: step1Result.tokenInfo?.metadataUrl || '',
                  ownerPublicKey: ownerWallet.address,
                  initialBuyAmount,
                  buyerWallets,
                  rpcUrl: rpcEndpoint
                });
                
                // Execute step 2: get transactions from create endpoint and send them
                console.log('Fetching step 2 transactions from create endpoint...');
                const step2Result = await executeSharedFeesBagsCreate(
                  walletObjs, 
                  createSharedFeesConfig({
                    ownerPublicKey: ownerWallet.address,
                    feeClaimerTwitterHandle: sharedFeesConfig.feeClaimerTwitterHandle,
                    creatorFeeBps: sharedFeesConfig.creatorFeeBps,
                    feeClaimerFeeBps: sharedFeesConfig.feeClaimerFeeBps,
                    rpcUrl: rpcEndpoint
                  }), 
                  sharedCreateConfig, 
                  true // Skip config check since we already completed step 1
                );
                
                if (step2Result.success) {
                  showToast(`Token deployment completed successfully! Mint: ${mintAddress}`, "success");
                } else {
                  throw new Error(step2Result.error || 'Step 2 failed');
                }
                
              } catch (step2Error) {
                console.error('Step 2 error:', step2Error);
                showToast(`Step 2 failed - Token launch: ${step2Error.message}`, "error");
                return; // Don't close modal on step 2 failure
              }
              
              // Reset form state and close modal only after successful completion
              setSelectedWallets([]);
              setWalletAmounts({});
              setTokenData({
                name: '',
                symbol: '',
                description: '',
                imageUrl: '',
                totalSupply: '1000000000',
                links: []
              });
              setSharedFeesConfig({
                feeClaimerTwitterHandle: '',
                creatorFeeBps: 1000,
                feeClaimerFeeBps: 9000,
              });
              setIsConfirmed(false);
              setCurrentStep(0);
              setConfigNeeded(false);
              setConfigTransaction('');
              setConfigInstructions('');
              setConfigKey('');
              setFeeShareInfo(null);
              setTokenMint('');
              setMetadataUrl('');
              setStep1Completed(false);
              setDeploymentStep('step1');
              onClose();
              
              // Redirect to token address page
              const currentUrl = new URL(window.location.href);
              currentUrl.searchParams.set('tokenAddress', mintAddress);
              window.history.pushState({}, '', currentUrl.toString());
              
              // Reload the page to show the new token
              window.location.reload();
              
              return; // Exit early since we're done
            } else {
              throw new Error(launchResult.error || 'Failed to send launch transactions');
            }
          }
          
          // Legacy format - continue with two-step process
          if (step1Result.tokenMint && step1Result.configKey) {
            setTokenMint(step1Result.tokenMint);
            setConfigKey(step1Result.configKey);
            setMetadataUrl(step1Result.tokenInfo?.metadataUrl || '');
            setStep1Completed(true);
            setIsStep1Processing(false);
            
            console.log('Step 1 completed:', {
              tokenMint: step1Result.tokenMint,
              configKey: step1Result.configKey
            });
            
            // Automatically proceed to step 2
            setDeploymentStep('step2');
            
            // Small delay to allow UI to update, then trigger step 2
            setTimeout(async () => {
              try {
                console.log('Auto-triggering Step 2: Creating launch transactions');
                
                // Format wallets for Bags
                const walletObjs: WalletForBagsSharedCreate[] = selectedWallets.map(privateKey => {
                  const wallet = wallets.find(w => w.privateKey === privateKey);
                  if (!wallet) {
                    throw new Error(`Wallet not found for private key`);
                  }
                  return {
                    address: wallet.address,
                    privateKey
                  };
                });
                
                // Create buyer wallets array from selected wallets (excluding the first one which is the owner)
                const buyerWallets = selectedWallets.slice(1).map(privateKey => {
                  const wallet = wallets.find(w => w.privateKey === privateKey);
                  return {
                    publicKey: wallet!.address,
                    amount: parseFloat(walletAmounts[privateKey] || "0.1")
                  };
                });
                
                // Get owner wallet (first selected wallet)
                const ownerWallet = wallets.find(w => w.privateKey === selectedWallets[0]);
                if (!ownerWallet) {
                  throw new Error('Owner wallet not found');
                }
                
                // Ensure we have required values from step1Result
                if (!step1Result.tokenMint || !step1Result.configKey) {
                  throw new Error('Missing tokenMint or configKey from step 1 result');
                }
                
                // Calculate total initial buy amount from all buyer wallets
                const initialBuyAmount = buyerWallets.reduce((total, wallet) => total + wallet.amount, 0);
                
                // Create shared create config
                const sharedCreateConfig = createSharedCreateConfig({
                  tokenMintAddress: step1Result.tokenMint,
                  configKey: step1Result.configKey,
                  metadataUrl: step1Result.tokenInfo?.metadataUrl || '',
                  ownerPublicKey: ownerWallet.address,
                  initialBuyAmount,
                  buyerWallets,
                  rpcUrl: rpcEndpoint
                });
                
                // Create shared fees config
                const sharedFeesConfigObj = createSharedFeesConfig({
                  ownerPublicKey: ownerWallet.address,
                  feeClaimerTwitterHandle: sharedFeesConfig.feeClaimerTwitterHandle,
                  creatorFeeBps: sharedFeesConfig.creatorFeeBps,
                  feeClaimerFeeBps: sharedFeesConfig.feeClaimerFeeBps,
                  rpcUrl: rpcEndpoint
                });
                
                // Execute the shared fees bags create with correct parameter order, skipping config check since we already have the data
                const result = await executeSharedFeesBagsCreate(walletObjs, sharedFeesConfigObj, sharedCreateConfig, true);
                
                if (result.success) {
                  showToast(`Token deployment completed successfully! Mint: ${step1Result.tokenMint}`, "success");
                  
                  // Reset form state and close modal
                  setSelectedWallets([]);
                  setWalletAmounts({});
                  setTokenData({
                    name: '',
                    symbol: '',
                    description: '',
                    imageUrl: '',
                    totalSupply: '1000000000',
                    links: []
                  });
                  setSharedFeesConfig({
                    feeClaimerTwitterHandle: '',
                    creatorFeeBps: 1000,
                    feeClaimerFeeBps: 9000,
                  });
                  setIsConfirmed(false);
                  setCurrentStep(0);
                  setConfigNeeded(false);
                  setConfigTransaction('');
                  setConfigInstructions('');
                  setConfigKey('');
                  setFeeShareInfo(null);
                  setTokenMint('');
                  setMetadataUrl('');
                  setStep1Completed(false);
                  setDeploymentStep('step1');
                  onClose();
                  
                  // Redirect to token address page
                  const currentUrl = new URL(window.location.href);
                  currentUrl.searchParams.set('tokenAddress', step1Result.tokenMint);
                  window.history.pushState({}, '', currentUrl.toString());
                  
                  // Reload the page to show the new token
                  window.location.reload();
                } else {
                  throw new Error(result.error || 'Failed to launch token');
                }
              } catch (error) {
                console.error('Error during automatic step 2:', error);
                showToast(`Step 2 failed - Token launch: ${error.message}`, "error");
                setDeploymentStep('step1'); // Reset to step 1 on failure
              } finally {
                setIsSubmitting(false);
              }
            }, 1000);
            
            return; // Exit early to prevent further execution
          } else {
            throw new Error('Invalid response format from backend');
          }
        } else {
          throw new Error(step1Result.error || 'Failed to create token and config');
        }
      }
      // Note: Step 2 is now automatically handled in the legacy format case above
    } catch (error) {
      console.error('Error during deployment:', error);
      
      // Provide specific error messages based on deployment step
      let errorMessage = 'Deployment failed';
      if (deploymentStep === 'step1') {
        errorMessage = `Step 1 failed - Token creation: ${error.message}`;
        setIsStep1Processing(false);
        setDeploymentStep('step1'); // Reset to step 1 on failure
      } else {
        errorMessage = `Step 2 failed - Token launch: ${error.message}`;
        setDeploymentStep('step1'); // Reset to step 1 on step 2 failure
      }
      
      showToast(errorMessage, "error");
      setIsStep1Processing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle shared fees config transaction signing and sending
  const handleSendSharedConfigTransaction = async () => {
    if (!configTransaction || selectedWallets.length === 0) {
      showToast("No config transaction or owner wallet available", "error");
      return;
    }

    setIsSendingConfig(true);
    
    try {
      // Get owner wallet (first selected wallet)
      const ownerWallet = wallets.find(w => w.privateKey === selectedWallets[0]);
      if (!ownerWallet) {
        throw new Error('Owner wallet not found');
      }

      const walletObj: WalletForBagsSharedCreate = {
        address: ownerWallet.address,
        privateKey: ownerWallet.privateKey
      };

      // Load config to get RPC endpoint
      const savedConfig = loadConfigFromCookies();
      const rpcEndpoint = savedConfig?.rpcEndpoint;
      
      const result = await signAndSendSharedConfigTransaction(configTransaction, walletObj, rpcEndpoint);
      
      if (result.success) {
        setConfigNeeded(false);
        setConfigTransaction('');
        setConfigInstructions('');
        
        // After config transaction is successful, proceed with token creation
        try {
          // Check if we have the required values from feeShareInfo
          if (!configKey || !feeShareInfo) {
            throw new Error('Missing config key or fee share info. Please restart the deployment process.');
          }
          
          // Format wallets for Bags
          const walletObjs: WalletForBagsSharedCreate[] = selectedWallets.map(privateKey => {
            const wallet = wallets.find(w => w.privateKey === privateKey);
            if (!wallet) {
              throw new Error(`Wallet not found for private key`);
            }
            return {
              address: wallet.address,
              privateKey
            };
          });
          
          // Create buyer wallets array from selected wallets (excluding the first one which is the owner)
          const buyerWallets = selectedWallets.slice(1).map(privateKey => {
            const wallet = wallets.find(w => w.privateKey === privateKey);
            return {
              publicKey: wallet!.address,
              amount: parseFloat(walletAmounts[privateKey] || "0.1")
            };
          });
          
          // Calculate total initial buy amount from all buyer wallets
          const initialBuyAmount = buyerWallets.reduce((total, wallet) => total + wallet.amount, 0);
          
          // Create shared create config using the stored configKey
          const sharedCreateConfig = createSharedCreateConfig({
            tokenMintAddress: '', // This will be generated during token creation
            configKey: configKey,
            metadataUrl: '', // This will be generated during token creation
            ownerPublicKey: ownerWallet.address,
            initialBuyAmount,
            buyerWallets,
            rpcUrl: rpcEndpoint
          });
          
          // Create shared fees config
          const sharedFeesConfigObj = createSharedFeesConfig({
            ownerPublicKey: ownerWallet.address,
            feeClaimerTwitterHandle: sharedFeesConfig.feeClaimerTwitterHandle,
            creatorFeeBps: sharedFeesConfig.creatorFeeBps,
            feeClaimerFeeBps: sharedFeesConfig.feeClaimerFeeBps,
            rpcUrl: rpcEndpoint
          });
          
          // Execute the shared fees bags create with correct parameter order, skipping config check since it was already sent
          const createResult = await executeSharedFeesBagsCreate(walletObjs, sharedFeesConfigObj, sharedCreateConfig, true);
          
          if (createResult.success) {
            showToast(`Token deployment completed successfully! Mint: ${tokenMint}`, "success");
            
            // Reset form state and close modal
            setSelectedWallets([]);
            setWalletAmounts({});
            setTokenData({
              name: '',
              symbol: '',
              description: '',
              imageUrl: '',
              totalSupply: '1000000000',
              links: []
            });
            setSharedFeesConfig({
              feeClaimerTwitterHandle: '',
              creatorFeeBps: 1000,
              feeClaimerFeeBps: 9000,
            });
            setIsConfirmed(false);
            setCurrentStep(0);
            setConfigNeeded(false);
            setConfigTransaction('');
            setConfigInstructions('');
            setConfigKey('');
            setFeeShareInfo(null);
            setTokenMint('');
            setMetadataUrl('');
            setStep1Completed(false);
            setDeploymentStep('step1');
            onClose();
            
            // Redirect to token address page
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('tokenAddress', tokenMint);
            window.history.pushState({}, '', currentUrl.toString());
            
            // Reload the page to show the new token
            window.location.reload();
          } else {
            throw new Error(createResult.error || 'Failed to create token');
          }
        } catch (createError) {
          console.error('Error creating token after config:', createError);
          showToast(`Failed to create token: ${createError.message}`, "error");
        }
      } else {
        throw new Error(result.error || "Failed to send shared fees config transaction");
      }
    } catch (error) {
      console.error('Error sending shared fees config transaction:', error);
      showToast(`Failed to send shared fees config transaction: ${error.message}`, "error");
    } finally {
      setIsSendingConfig(false);
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
                <Users size={16} className="color-primary" />
              </div>
              <h3 className="text-lg font-semibold text-app-primary font-mono">
                <span className="color-primary">/</span> TOKEN DETAILS & SHARED FEES <span className="color-primary">/</span>
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
                      className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-70 focus:outline-none focus:ring-1 focus:ring-primary-50 focus-border-primary transition-all modal-input-cyberpunk font-mono"
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
                      className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-70 focus:outline-none focus:ring-1 focus:ring-primary-50 focus-border-primary transition-all modal-input-cyberpunk font-mono"
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
                          ? 'bg-app-tertiary text-app-secondary-70 cursor-not-allowed border border-app-primary-20' 
                          : 'bg-app-tertiary hover-bg-secondary border border-app-primary-40 hover-border-primary text-app-primary shadow-lg hover:shadow-app-primary-40 transform hover:-translate-y-0.5 modal-btn-cyberpunk'
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
                    
                    {tokenData.imageUrl && (
                      <div className="flex items-center gap-3 flex-grow">
                        <div className="h-12 w-12 rounded overflow-hidden border border-app-primary-40 bg-app-tertiary flex items-center justify-center">
                          <img 
                            src={tokenData.imageUrl}
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
                          onClick={() => setTokenData(prev => ({ ...prev, imageUrl: '' }))}
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
                    className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-70 focus:outline-none focus:ring-1 focus:ring-primary-50 focus-border-primary transition-all modal-input-cyberpunk min-h-24 font-mono"
                    placeholder="DESCRIBE YOUR TOKEN"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Twitter <span className="color-primary">&#60;</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={getTwitter()}
                        onChange={(e) => updateSocialLinks('twitter', e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary placeholder-app-secondary-70 focus:outline-none focus:ring-1 focus:ring-primary-50 focus-border-primary transition-all modal-input-cyberpunk font-mono"
                        placeholder="HTTPS://X.COM/YOURHANDLE"
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
                      <span className="color-primary">&#62;</span> Telegram <span className="color-primary">&#60;</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={getTelegram()}
                        onChange={(e) => updateSocialLinks('telegram', e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary placeholder-app-secondary-70 focus:outline-none focus:ring-1 focus:ring-primary-50 focus-border-primary transition-all modal-input-cyberpunk font-mono"
                        placeholder="HTTPS://T.ME/YOURCHANNEL"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-app-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-8.609 3.33c-2.068.8-4.133 1.598-5.724 2.21a205.66 205.66 0 0 1-2.849 1.09c-.42.15-.593.27-.593.442 0 .173.173.293.593.442.42.15 1.537.593 2.849 1.09 1.591.612 3.656 1.41 5.724 2.21l8.609 3.33c.35.135.672.215 1.022.215.35 0 .672-.08 1.022-.215.35-.135.593-.35.593-.593V3.026c0-.243-.243-.458-.593-.593a2.242 2.242 0 0 0-1.022-.215z" />
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
                        value={getWebsite()}
                        onChange={(e) => updateSocialLinks('website', e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary placeholder-app-secondary-70 focus:outline-none focus:ring-1 focus:ring-primary-50 focus-border-primary transition-all modal-input-cyberpunk font-mono"
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

                {/* Shared Fees Configuration Section */}
                <div className="h-px bg-app-primary-30 my-6"></div>
                
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Percent size={18} className="color-primary" />
                    <h4 className="text-md font-semibold text-app-primary font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Shared Fees Configuration <span className="color-primary">&#60;</span>
                    </h4>
                  </div>
                  
                  <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-app-secondary flex items-center gap-1 font-mono uppercase tracking-wider">
                          <span className="color-primary">&#62;</span> Fee Claimer Twitter <span className="color-primary">*</span> <span className="color-primary">&#60;</span>
                        </label>
                        <input
                          type="text"
                          value={sharedFeesConfig.feeClaimerTwitterHandle}
                          onChange={(e) => setSharedFeesConfig(prev => ({ ...prev, feeClaimerTwitterHandle: e.target.value }))}
                          className="w-full bg-app-primary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-70 focus:outline-none focus:ring-1 focus:ring-primary-50 focus-border-primary transition-all modal-input-cyberpunk font-mono"
                          placeholder="@ELONMUSK"
                        />
                        <p className="text-xs text-app-secondary font-mono">Twitter username of fee recipient</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-app-secondary flex items-center gap-1 font-mono uppercase tracking-wider">
                          <span className="color-primary">&#62;</span> Creator Fee % <span className="color-primary">&#60;</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sharedFeesConfig.creatorFeeBps / 100}
                            onChange={(e) => handleFeeSplitChange('creatorFeeBps', (parseFloat(e.target.value) * 100).toString())}
                            className="w-full bg-app-primary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-70 focus:outline-none focus:ring-1 focus:ring-primary-50 focus-border-primary transition-all modal-input-cyberpunk font-mono"
                            placeholder="10"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Percent size={14} className="text-app-secondary" />
                          </div>
                        </div>
                        <p className="text-xs text-app-secondary font-mono">Your share of trading fees</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-app-secondary flex items-center gap-1 font-mono uppercase tracking-wider">
                          <span className="color-primary">&#62;</span> Fee Claimer % <span className="color-primary">&#60;</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sharedFeesConfig.feeClaimerFeeBps / 100}
                            onChange={(e) => handleFeeSplitChange('feeClaimerFeeBps', (parseFloat(e.target.value) * 100).toString())}
                            className="w-full bg-app-primary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-70 focus:outline-none focus:ring-1 focus:ring-primary-50 focus-border-primary transition-all modal-input-cyberpunk font-mono"
                            placeholder="90"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Percent size={14} className="text-app-secondary" />
                          </div>
                        </div>
                        <p className="text-xs text-app-secondary font-mono">Fee claimer's share</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-app-primary border border-app-primary-40 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-app-secondary font-mono">TOTAL FEE SPLIT:</span>
                        <span className={`text-sm font-medium font-mono ${
                          sharedFeesConfig.creatorFeeBps + sharedFeesConfig.feeClaimerFeeBps === 10000 
                            ? 'color-primary' 
                            : 'text-red-500'
                        }`}>
                          {((sharedFeesConfig.creatorFeeBps + sharedFeesConfig.feeClaimerFeeBps) / 100).toFixed(1)}%
                        </span>
                      </div>
                      {sharedFeesConfig.creatorFeeBps + sharedFeesConfig.feeClaimerFeeBps !== 10000 && (
                        <p className="text-xs text-red-500 mt-1 font-mono">Fee split must total exactly 100%</p>
                      )}
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
                  className="text-sm color-primary hover-color-primary-light font-medium transition duration-200 font-mono glitch-text"
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
                  className="w-full pl-9 pr-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input-cyberpunk font-mono"
                  placeholder="SEARCH WALLETS..."
                />
              </div>
              
              <select 
                className="bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-2.5 text-sm text-app-primary focus:outline-none focus-border-primary modal-input-cyberpunk font-mono"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="address">ADDRESS</option>
                <option value="balance">BALANCE</option>
              </select>
              
              <button
                className="p-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-secondary hover-border-primary hover:color-primary transition-all modal-btn-cyberpunk flex items-center justify-center"
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              </button>

              <select 
                className="bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-2.5 text-sm text-app-primary focus:outline-none focus-border-primary modal-input-cyberpunk font-mono"
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
                  YOU CAN SELECT A MAXIMUM OF {MAX_WALLETS} WALLETS
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
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary-40 scrollbar-track-app-tertiary">
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
                            className="p-3 rounded-lg border-app-primary bg-primary-10 mb-2 shadow-lg modal-glow"
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
                                    <span className="text-sm font-medium color-primary font-mono">{index === 0 ? 'CREATOR' : `#${index + 1}`}</span>
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
                                    className="w-32 pl-9 pr-2 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary placeholder-app-secondary-70 focus:outline-none focus:ring-1 focus:ring-primary-50 focus-border-primary transition-all modal-input-cyberpunk font-mono"
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
                            className="flex items-center justify-between p-3 rounded-lg border border-app-primary-40 hover-border-primary hover:bg-app-tertiary transition-all duration-200 mb-2 cursor-pointer"
                            onClick={() => handleWalletSelection(wallet.privateKey)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-5 h-5 rounded-full border border-app-primary-40 flex items-center justify-center cursor-pointer hover-border-primary transition-all">
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
                <span className="color-primary">/</span> REVIEW SHARED FEES DEPLOYMENT <span className="color-primary">/</span>
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
                    {tokenData.imageUrl && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-app-secondary font-mono">LOGO:</span>
                        <div className="bg-app-tertiary border border-app-primary-40 rounded-lg p-1 w-12 h-12 flex items-center justify-center">
                          <img 
                            src={tokenData.imageUrl}
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
                  
                  {tokenData.links.length > 0 && (
                    <>
                      <div className="h-px bg-app-primary-30 my-3"></div>
                  
                  {/* Two-step deployment progress */}
                  <h4 className="text-sm font-medium text-app-secondary mb-3 font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Deployment Progress <span className="color-primary">&#60;</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">STEP 1:</span>
                      <span className={`text-sm font-mono ${
                        step1Completed ? 'color-primary' : 
                        deploymentStep === 'step1' && isSubmitting ? 'text-yellow-500' : 
                        'text-app-secondary'
                      }`}>
                        {step1Completed ? '✓ TOKEN CREATED' : 
                         deploymentStep === 'step1' && isSubmitting ? '⏳ CREATING...' : 
                         'CREATE TOKEN & CONFIG'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">STEP 2:</span>
                      <span className={`text-sm font-mono ${
                        deploymentStep === 'step2' && isSubmitting ? 'text-yellow-500' : 
                        step1Completed ? 'text-app-secondary' : 'text-app-primary-60'
                      }`}>
                        {deploymentStep === 'step2' && isSubmitting ? '⏳ LAUNCHING...' : 
                         step1Completed ? 'LAUNCH TOKEN' : 
                         'PENDING'}
                      </span>
                    </div>
                    
                    {tokenMint && (
                      <div className="mt-3 p-3 bg-app-tertiary border border-app-primary-30 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-app-secondary font-mono">TOKEN MINT:</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(tokenMint);
                              showToast('Token mint copied to clipboard', 'success');
                            }}
                            className="text-xs color-primary hover:text-app-primary-dark font-mono flex items-center gap-1"
                          >
                            <Copy size={12} />
                            COPY
                          </button>
                        </div>
                        <div className="text-xs color-primary font-mono break-all">
                          {tokenMint}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="h-px bg-app-primary-30 my-3"></div>
                      <h4 className="text-sm font-medium text-app-secondary mb-2 font-mono uppercase tracking-wider">
                        <span className="color-primary">&#62;</span> Social Links <span className="color-primary">&#60;</span>
                      </h4>
                      <div className="space-y-2">
                        {getTwitter() && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-app-secondary font-mono">TWITTER:</span>
                            <span className="text-sm color-primary font-mono">{getTwitter()}</span>
                          </div>
                        )}
                        {getTelegram() && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-app-secondary font-mono">TELEGRAM:</span>
                            <span className="text-sm color-primary font-mono">{getTelegram()}</span>
                          </div>
                        )}
                        {getWebsite() && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-app-secondary font-mono">WEBSITE:</span>
                            <span className="text-sm color-primary font-mono">{getWebsite()}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  <div className="h-px bg-app-primary-30 my-3"></div>
                  
                  {/* Shared Fees Information */}
                  <h4 className="text-sm font-medium text-app-secondary mb-2 font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Shared Fees <span className="color-primary">&#60;</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">FEE CLAIMER:</span>
                      <span className="text-sm color-primary font-mono">@{sharedFeesConfig.feeClaimerTwitterHandle}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">CREATOR FEE:</span>
                      <span className="text-sm font-medium color-primary font-mono">{sharedFeesConfig.creatorFeeBps / 100}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">CLAIMER FEE:</span>
                      <span className="text-sm font-medium color-primary font-mono">{sharedFeesConfig.feeClaimerFeeBps / 100}%</span>
                    </div>
                  </div>
                  
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
                  <div className="max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-primary-40 scrollbar-track-app-tertiary">
                    {selectedWallets.map((key, index) => {
                      const wallet = getWalletByPrivateKey(key);
                      const solBalance = wallet ? solBalances.get(wallet.address) || 0 : 0;
                      
                      return (
                        <div key={index} className="flex justify-between items-center p-3 bg-app-tertiary rounded-lg mb-2 border border-app-primary-30 hover-border-primary transition-all">
                          <div className="flex items-center gap-2">
                            <span className="color-primary text-xs font-medium w-6 font-mono">{index === 0 ? 'CRET' : `#${index + 1}`}</span>
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
                      <CheckCircle size={14} className="absolute top-0.5 left-0.5 text-app-primary" />
                    )}
                  </div>
                  <label 
                    onClick={() => setIsConfirmed(!isConfirmed)}
                    className="text-sm text-app-primary leading-relaxed cursor-pointer select-none font-mono"
                  >
                    I CONFIRM THAT I WANT TO DEPLOY THIS SHARED FEES TOKEN USING {selectedWallets.length} WALLET{selectedWallets.length !== 1 ? 'S' : ''}. 
                    FEES WILL BE SPLIT {sharedFeesConfig.creatorFeeBps / 100}% CREATOR / {sharedFeesConfig.feeClaimerFeeBps / 100}% CLAIMER.
                    THIS ACTION CANNOT BE UNDONE.
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };
  
  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // Animation keyframes for cyberpunk elements (same as original)
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
      <div className="relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-4xl overflow-hidden transform modal-cyberpunk-content modal-glow">
        {/* Ambient grid background */}
        <div className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid"></div>

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
              <Users size={16} className="color-primary" />
            </div>
            <h2 className="text-lg font-semibold text-app-primary font-mono">
              <span className="color-primary">/</span> DEPLOY BAGS TOKEN WITH SHARED FEES <span className="color-primary">/</span>
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-app-secondary hover:color-primary transition-colors p-1 hover:bg-primary-20 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Indicator - Only show for steps 0-2 */}
        <div className="relative w-full h-1 bg-app-tertiary progress-bar-cyberpunk">
          <div 
            className="h-full bg-app-primary-color transition-all duration-300"
            style={{ width: `${(currentStep + 1) / 3 * 100}%` }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-primary-40 scrollbar-track-app-tertiary">
          <form onSubmit={currentStep === 2 ? handleDeploy : (e) => e.preventDefault()}>
            <div className="min-h-[300px]">
              {configNeeded ? (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-500/20 mr-3">
                      <Settings size={16} className="text-yellow-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-app-primary font-mono">
                      <span className="color-primary">/</span> SHARED FEES CONFIG REQUIRED <span className="color-primary">/</span>
                    </h3>
                  </div>
                  
                  <div className="bg-app-primary border border-yellow-500/40 rounded-lg shadow-lg modal-glow">
                    <div className="p-6 space-y-4 relative">
                      <div className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid"></div>
                      
                      <div className="relative z-10 space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <Info size={20} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                          <div className="space-y-2">
                            <h4 className="font-semibold text-yellow-500 font-mono">SHARED FEES SETUP REQUIRED</h4>
                            <p className="text-app-secondary text-sm leading-relaxed">
                              {configInstructions}
                            </p>
                            {feeShareInfo && (
                              <div className="mt-3 p-3 bg-app-tertiary border border-app-primary-30 rounded-lg">
                                <h5 className="text-sm font-medium text-app-primary font-mono mb-2">FEE SHARING DETAILS:</h5>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-app-secondary font-mono">CLAIMER:</span>
                                    <span className="color-primary font-mono">@{feeShareInfo.twitterHandle}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-app-secondary font-mono">CREATOR:</span>
                                    <span className="color-primary font-mono">{feeShareInfo.feeSplit.creator / 100}%</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-app-secondary font-mono">CLAIMER:</span>
                                    <span className="color-primary font-mono">{feeShareInfo.feeSplit.feeClaimer / 100}%</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-app-secondary flex items-center gap-1 font-mono uppercase tracking-wider">
                            <span className="color-primary">&#62;</span> CONFIG TRANSACTION <span className="color-primary">&#60;</span>
                          </label>
                          <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-3 font-mono text-xs text-app-secondary break-all">
                            {configTransaction}
                          </div>
                        </div>
                        
                        <div className="flex gap-3 pt-4">
                          <button
                            type="button"
                            onClick={handleSendSharedConfigTransaction}
                            disabled={isSendingConfig}
                            className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-mono tracking-wider ${
                              isSendingConfig
                                ? 'bg-primary-50 text-app-primary-80 cursor-not-allowed opacity-50'
                                : 'bg-app-primary-color hover:bg-primary-60 text-app-primary shadow-lg hover:shadow-app-primary-40 transform hover:-translate-y-0.5 modal-btn-cyberpunk'
                            }`}
                          >
                            {isSendingConfig ? (
                              <>
                                <RefreshCw size={16} className="animate-spin" />
                                SENDING...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={16} />
                                INITIALIZE SHARED FEES CONFIG
                              </>
                            )}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setConfigNeeded(false);
                              setConfigTransaction('');
                              setConfigInstructions('');
                              setFeeShareInfo(null);
                            }}
                            disabled={isSendingConfig}
                            className="px-4 py-3 text-app-primary bg-app-tertiary border border-app-primary-30 hover:bg-app-secondary hover-border-primary rounded-lg transition-all font-mono tracking-wider modal-btn-cyberpunk"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                renderStepContent()
              )}
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t border-app-primary-30">
              <button
                type="button"
                onClick={currentStep === 0 ? onClose : handleBack}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-app-primary bg-app-tertiary border border-app-primary-30 hover:bg-app-secondary hover-border-primary rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-cyberpunk"
              >
                {currentStep === 0 ? 'CANCEL' : 'BACK'}
              </button>

              <button
                type={currentStep === 2 ? 'submit' : 'button'}
                onClick={currentStep === 2 ? undefined : handleNext}
                disabled={currentStep === 2 ? (isSubmitting || !isConfirmed) : isSubmitting}
                className={`px-5 py-2.5 rounded-lg flex items-center transition-all shadow-lg font-mono tracking-wider ${
                  currentStep === 2 && (isSubmitting || !isConfirmed)
                    ? 'bg-primary-50 text-app-primary-80 cursor-not-allowed opacity-50'
                    : 'bg-app-primary-color text-app-primary hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-cyberpunk'
                }`}
              >
                {currentStep === 2 ? (
                  isSubmitting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-app-primary-80 border-t-transparent animate-spin mr-2"></div>
                      <span>
                        {deploymentStep === 'step1' ? (
                          isStep1Processing ? 'CREATING TOKEN...' : 'CREATING TOKEN & CONFIG...'
                        ) : (
                          'LAUNCHING TOKEN...'
                        )}
                      </span>
                    </>
                  ) : (
                    deploymentStep === 'step1' ? 'CREATE TOKEN & CONFIG' : 'LAUNCH TOKEN'
                  )
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