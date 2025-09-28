import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, ChevronLeft, ChevronRight, Info, Search, X, ArrowDown } from 'lucide-react';
import { getWallets, getWalletDisplayName } from '../Utils';
import { useToast } from "../Notifications";
import { loadConfigFromCookies } from '../Utils';
import * as web3 from '@solana/web3.js';
import bs58 from 'bs58';
import { sendToJitoBundleService } from '../utils/jitoService';

const STEPS_BURN = ['Select Source', 'Burn Details', 'Review'];

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BurnModalProps extends BaseModalProps {
  onBurn: (amount: string) => void;
  handleRefresh: () => void;
  tokenAddress: string; 
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
}

export const BurnModal: React.FC<BurnModalProps> = ({
  isOpen,
  onClose,
  onBurn,
  handleRefresh,
  tokenAddress,
  solBalances,
  tokenBalances
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sourceWallet, setSourceWallet] = useState<string>('');
  const [tokenAccounts, setTokenAccounts] = useState<Array<{
    mint: string;
    balance: number;
    symbol: string;
  }>>([]);
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showInfoTip, setShowInfoTip] = useState(false);
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [modalClass, setModalClass] = useState('');
  const [buttonHover, setButtonHover] = useState(false);
  
  const wallets = getWallets();
  const { showToast } = useToast();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      handleRefresh();
      resetForm();
      // Add entrance animation class
      setModalClass('animate-modal-in');
      
      // Simulate a typing/loading effect for a cyberpunk feel
      const timer = setTimeout(() => {
        setModalClass('');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset form state
  const resetForm = () => {
    setCurrentStep(0);
    setSourceWallet('');
    setAmount('');
    setIsConfirmed(false);
    setSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
  };

  // Fetch token accounts when source wallet is selected
  useEffect(() => {
    const fetchTokenAccounts = async () => {
      if (!sourceWallet) return;
      
      setIsLoadingTokens(true);
      try {
        const savedConfig = loadConfigFromCookies();
        const rpcurl = (savedConfig as any).rpcEndpoint
        const connection = new web3.Connection(rpcurl);

        const keypair = web3.Keypair.fromSecretKey(
          bs58.decode(sourceWallet)
        );
        const publicKey = keypair.publicKey;
              
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          {
            programId: new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          }
        );

        // Transform the token accounts data - exclude SOL
        const transformedAccounts = await Promise.all(tokenAccounts.value.map(async (account) => {
          const parsedInfo = account.account.data.parsed.info;
          const mintAddress = parsedInfo.mint;
          const balance = parsedInfo.tokenAmount.uiAmount;

          return {
            mint: mintAddress,
            balance: balance,
            symbol: mintAddress.slice(0, 4) // Placeholder - you should fetch actual symbols
          };
        }));

        setTokenAccounts(transformedAccounts.filter(account => account.balance > 0));
      } catch (error) {
        console.error('Error fetching token accounts:', error);
        showToast("Failed to fetch token accounts", "error");
      } finally {
        setIsLoadingTokens(false);
      }
    };

    fetchTokenAccounts();
  }, [sourceWallet]);

  const handleNext = () => {
    if (currentStep === 0 && !sourceWallet) {
      showToast("Please select source wallet", "error");
      return;
    }
    
    if (currentStep === 1) {
      if (!amount || parseFloat(amount) <= 0) {
        showToast("Please enter a valid amount", "error");
        return;
      }
    }
    
    // Add transition animation
    setModalClass('animate-step-out');
    setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, STEPS_BURN.length - 1));
      setModalClass('animate-step-in');
      
      // Remove animation class after it completes
      setTimeout(() => setModalClass(''), 500);
    }, 300);
  };

  const handleBack = () => {
    // Add transition animation
    setModalClass('animate-step-back-out');
    setTimeout(() => {
      setCurrentStep(prev => Math.max(prev - 1, 0));
      setModalClass('animate-step-back-in');
      
      // Remove animation class after it completes
      setTimeout(() => setModalClass(''), 500);
    }, 300);
  };

  const handleBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      // Get the wallet keypair
      const walletKeypair = web3.Keypair.fromSecretKey(
        bs58.decode(sourceWallet)
      );
      
      // 1. Request unsigned transaction from backend
      const baseUrl = 'https://solana.fury.bot';
      
      const prepareResponse = await fetch(`${baseUrl}/api/tokens/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletPublicKey: walletKeypair.publicKey.toString(),
          tokenAddress: tokenAddress,
          amount: amount
        }),
      });

      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json();
        throw new Error(errorData.error || `Failed to prepare transaction: HTTP ${prepareResponse.status}`);
      }

      const prepareResult = await prepareResponse.json();
      
      if (!prepareResult.success) {
        throw new Error(prepareResult.error || 'Failed to prepare transaction');
      }

      // 2. Deserialize and sign the transaction (now expecting base58)
      const transactionData = prepareResult.data;
      const transactionBuffer = bs58.decode(transactionData.transaction); // Changed from base64 to base58
      
      // Deserialize the transaction
      const transaction = web3.VersionedTransaction.deserialize(transactionBuffer);
      
      // Sign the transaction with the wallet's private key
      transaction.sign([walletKeypair]);
      
      // Serialize the signed transaction
      const signedTransactionBuffer = transaction.serialize();

      const signedTransactionBs58 = bs58.encode(signedTransactionBuffer);
      // 3. Submit the signed transaction to Jito via the bundle service
      try {
        const submitResult = await sendToJitoBundleService(signedTransactionBs58);
        console.log('Transaction successfully submitted to Jito:', submitResult);
      } catch (error) {
        console.error('Error submitting transaction:', error);
        throw new Error(`Failed to submit transaction: ${error.message}`);
      }

      showToast("Token burn completed successfully", "success");
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      showToast(`Token burn failed: ${error.message || 'Unknown error'}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get wallet by address
  const getWalletByAddress = (address: string) => {
    return wallets.find(wallet => wallet.address === address);
  };

  // Get the token balance for the selected token
  const getSelectedTokenBalance = () => {
    return tokenAccounts.find(t => t.mint === tokenAddress)?.balance || 0;
  };

  // Get the token symbol for the selected token
  const getSelectedTokenSymbol = () => {
    return tokenAccounts.find(t => t.mint === tokenAddress)?.symbol || 'TKN';
  };

  // Filter wallets based on search and other filters
  const filterWallets = (walletList: any[], search: string) => {
    // First filter out wallets with zero token balance
    let filtered = walletList.filter(wallet => 
      (tokenBalances.get(wallet.address) || 0) > 0
    );
    
    // Then apply search filter
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Then apply balance filter
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'nonZero') {
        filtered = filtered.filter(wallet => 
          (solBalances.get(wallet.address) || 0) > 0 || 
          (tokenBalances.get(wallet.address) || 0) > 0
        );
      } else if (balanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => 
          (solBalances.get(wallet.address) || 0) >= 0.1 || 
          (tokenBalances.get(wallet.address) || 0) >= 10
        );
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => 
          ((solBalances.get(wallet.address) || 0) < 0.1 && (solBalances.get(wallet.address) || 0) > 0) ||
          ((tokenBalances.get(wallet.address) || 0) < 10 && (tokenBalances.get(wallet.address) || 0) > 0)
        );
      }
    }
    
    // Finally, sort the wallets
    return filtered.sort((a, b) => {
      if (sortOption === 'address') {
        return sortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (sortOption === 'balance') {
        const balanceA = solBalances.get(a.address) || 0;
        const balanceB = solBalances.get(b.address) || 0;
        return sortDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
      } else if (sortOption === 'tokenBalance') {
        const tokenBalanceA = tokenBalances.get(a.address) || 0;
        const tokenBalanceB = tokenBalances.get(b.address) || 0;
        return sortDirection === 'asc' ? tokenBalanceA - tokenBalanceB : tokenBalanceB - tokenBalanceA;
      }
      return 0;
    });
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // Animation keyframes for cyberpunk elements
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
        transparent 0%,
        var(--color-primary-30) 50%,
        transparent 100%
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
    
    /* Animation classes for step transitions */
    @keyframes modal-in {
      0% { transform: translateY(20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }

    @keyframes step-out {
      0% { transform: translateX(0); opacity: 1; }
      100% { transform: translateX(-20px); opacity: 0; }
    }

    @keyframes step-in {
      0% { transform: translateX(20px); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }

    @keyframes step-back-out {
      0% { transform: translateX(0); opacity: 1; }
      100% { transform: translateX(20px); opacity: 0; }
    }

    @keyframes step-back-in {
      0% { transform: translateX(-20px); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }

    @keyframes content-fade {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    
    .animate-modal-in {
      animation: modal-in 0.5s ease-out forwards;
    }

    .animate-step-out {
      animation: step-out 0.3s ease-out forwards;
    }

    .animate-step-in {
      animation: step-in 0.3s ease-out forwards;
    }

    .animate-step-back-out {
      animation: step-back-out 0.3s ease-out forwards;
    }

    .animate-step-back-in {
      animation: step-back-in 0.3s ease-out forwards;
    }

    .animate-content-fade {
      animation: content-fade 0.5s ease forwards;
    }
    
    .animate-pulse-slow {
      animation: pulse-slow 2s infinite;
    }
    
    @keyframes pulse-slow {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.7; }
    }
    
    /* Cyberpunk scrollbar */
    .cyberpunk-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    
    .cyberpunk-scrollbar::-webkit-scrollbar-track {
      background: var(--color-bg-tertiary);
      border-radius: 3px;
    }
    
    .cyberpunk-scrollbar::-webkit-scrollbar-thumb {
      background: var(--color-scrollbar-thumb);
      border-radius: 3px;
    }
    
    .cyberpunk-scrollbar::-webkit-scrollbar-thumb:hover {
      background: var(--color-primary);
    }
    
    /* Responsive styles */
    @media (max-width: 768px) {
      .modal-cyberpunk-content {
        width: 95% !important;
        max-height: 90vh;
        overflow-y: auto;
      }
    }
  `;
  document.head.appendChild(modalStyleElement);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm modal-cyberpunk-container bg-app-primary-85">
      <div className="relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-2xl overflow-hidden transform modal-cyberpunk-content modal-glow">
        {/* Ambient grid background */}
        <div className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid">
        </div>

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
              <ArrowDown size={16} className="color-primary" />
            </div>
            <h2 className="text-lg font-semibold text-app-primary font-mono">
              <span className="color-primary">/</span> BURN PROTOCOL <span className="color-primary">/</span>
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
            style={{ width: `${((currentStep + 1) / STEPS_BURN.length) * 100}%` }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-5 space-y-5 max-h-[70vh] overflow-y-auto cyberpunk-scrollbar">
          {/* Step Indicator */}
          <div className="flex w-full mb-6 relative">
            {STEPS_BURN.map((step, index) => (
              <React.Fragment key={step}>
                {/* Step circle */}
                <div className="flex-1 flex flex-col items-center relative z-10">
                  <div className={`w-8 h-8 rounded-full font-mono flex items-center justify-center border-2 transition-all duration-300 ${
                    index < currentStep 
                      ? 'border-app-primary bg-app-primary-color text-app-primary' 
                      : index === currentStep 
                        ? 'border-app-primary color-primary bg-app-primary modal-glow' 
                        : 'border-app-primary-20 text-app-muted bg-app-primary'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle size={16} />
                    ) : (
                      <span className="text-sm">{index + 1}</span>
                    )}
                  </div>
                  
                  {/* Step label */}
                  <span className={`mt-2 text-xs transition-all duration-300 font-mono tracking-wide ${
                    index <= currentStep ? 'text-app-primary' : 'text-app-muted'
                  }`}>
                    {step}
                  </span>
                </div>
                
                {/* Connector line between steps */}
                {index < STEPS_BURN.length - 1 && (
                  <div className="flex-1 flex items-center justify-center relative -mx-1 pb-8 z-0">
                    <div className="h-px w-full bg-app-primary-20 relative">
                      <div 
                        className="absolute top-0 left-0 h-full bg-app-primary-color transition-all duration-500"
                        style={{ width: index < currentStep ? '100%' : '0%' }}
                      ></div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step Content */}
          <form onSubmit={currentStep === STEPS_BURN.length - 1 ? handleBurn : (e) => e.preventDefault()}>
            {/* Step 1: Select Source Wallet */}
            {currentStep === 0 && (
              <div className={`space-y-4 ${modalClass || 'animate-content-fade'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="color-primary border border-app-primary-30 p-1 rounded">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <path d="M16 10h2M6 14h12" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-app-primary font-mono">
                      <span className="color-primary">/</span> SELECT SOURCE <span className="color-primary">/</span>
                    </h3>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="mb-3 flex space-x-2">
                  <div className="relative flex-grow">
                    <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input-cyberpunk font-mono tracking-wider"
                      placeholder="SEARCH WALLETS_"
                    />
                  </div>
                  
                  <select 
                    className="bg-app-tertiary border border-app-primary-30 rounded-lg px-3 text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input-cyberpunk font-mono"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                  >
                    <option value="address">ADDRESS</option>
                    <option value="balance">SOL BAL</option>
                    <option value="tokenBalance">TOKEN BAL</option>
                  </select>
                  
                  <button
                    type="button"
                    className="p-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-secondary hover:text-app-primary hover-border-primary transition-all modal-btn-cyberpunk"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                </div>

                <div className="mb-3">
                  <select 
                    className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2 text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input-cyberpunk font-mono"
                    value={balanceFilter}
                    onChange={(e) => setBalanceFilter(e.target.value)}
                  >
                    <option value="all">ALL WALLETS</option>
                    <option value="nonZero">NON-ZERO BALANCE</option>
                    <option value="highBalance">HIGH BALANCE</option>
                    <option value="lowBalance">LOW BALANCE</option>
                  </select>
                </div>

                {/* Wallet Selection */}
                <div className="bg-app-tertiary rounded-lg overflow-hidden border border-app-primary-30">
                  <div className="max-h-64 overflow-y-auto cyberpunk-scrollbar">
                    {filterWallets(wallets, searchTerm).length > 0 ? (
                      filterWallets(wallets, searchTerm).map((wallet) => (
                        <div 
                          key={wallet.id}
                          className={`flex items-center p-3 cursor-pointer border-b border-app-primary-20 last:border-b-0 transition-all duration-150 hover:bg-app-secondary
                                    ${sourceWallet === wallet.privateKey 
                                      ? 'bg-primary-10 border-l-2 border-l-app-primary' 
                                      : 'border-l-2 border-l-transparent hover:border-l-app-primary-50'}`}
                          onClick={() => setSourceWallet(wallet.privateKey)}
                        >
                          <div className={`w-4 h-4 mr-3 rounded-full flex items-center justify-center transition-all duration-200
                                          ${sourceWallet === wallet.privateKey
                                            ? 'bg-app-primary-color modal-glow' 
                                            : 'border border-app-secondary'}`}>
                            {sourceWallet === wallet.privateKey && (
                              <CheckCircle size={10} className="text-app-primary" />
                            )}
                          </div>
                          <div className="flex-1 flex justify-between items-center">
                            <span className="font-mono text-sm text-app-primary glitch-text">{getWalletDisplayName(wallet)}</span>
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-app-secondary font-mono">
                                {(solBalances.get(wallet.address) || 0).toFixed(4)} SOL
                              </span>
                              {(tokenBalances.get(wallet.address) || 0) > 0 && (
                                <span className="text-xs color-primary font-mono">
                                  {(tokenBalances.get(wallet.address) || 0).toFixed(4)} {tokenAddress.slice(0, 4)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-app-secondary text-center font-mono">
                        {searchTerm 
                          ? "[ NO MATCHING WALLETS FOUND ]" 
                          : "[ NO WALLETS AVAILABLE ]"}
                      </div>
                    )}
                  </div>
                </div>

                {sourceWallet && (
                  <div className="mt-4 p-4 rounded-lg border border-app-primary-30 bg-primary-05 modal-glow">
                    <div className="flex justify-between items-center">
                      <span className="text-sm color-primary font-mono tracking-wide">SELECTED_WALLET</span>
                      <div className="flex items-center bg-app-tertiary px-2 py-1 rounded-lg border border-app-primary-20">
                        <span className="text-sm font-mono text-app-primary glitch-text">
                          {getWalletDisplayName(wallets.find(w => w.privateKey === sourceWallet)!)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-app-secondary font-mono">BALANCES</span>
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-app-primary font-mono">
                          {(solBalances.get(wallets.find(w => w.privateKey === sourceWallet)?.address || '') || 0).toFixed(4)} SOL
                        </span>
                        <span className="text-sm color-primary font-mono">
                          {(tokenBalances.get(wallets.find(w => w.privateKey === sourceWallet)?.address || '') || 0).toFixed(4)} {tokenAddress.slice(0, 4)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Enter Burn Amount */}
            {currentStep === 1 && (
              <div className={`space-y-6 ${modalClass || 'animate-content-fade'}`}>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="color-primary border border-app-primary-30 p-1 rounded">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 19l-7-7 7-7M5 12h14" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-app-primary font-mono">
                    <span className="color-primary">/</span> BURN AMOUNT <span className="color-primary">/</span>
                  </h3>
                </div>

                {isLoadingTokens ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="relative h-12 w-12">
                      <div className="absolute inset-0 rounded-full border-2 border-t-app-primary border-r-app-primary-30 border-b-app-primary-10 border-l-app-primary-30 animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-app-primary-70 border-b-app-primary-50 border-l-transparent animate-spin-slow"></div>
                      <div className="absolute inset-0 rounded-full border border-app-primary-20 modal-glow"></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected Token Info */}
                    <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-app-primary font-mono">SELECTED_TOKEN</span>
                        {tokenAccounts.find(t => t.mint === tokenAddress) ? (
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-primary-20 border border-app-primary-30 flex items-center justify-center mr-2">
                              <span className="text-xs color-primary font-mono">
                                {getSelectedTokenSymbol()[0] || 'T'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm text-app-primary font-mono">
                                {getSelectedTokenSymbol()}
                              </span>
                              <span className="text-xs text-app-secondary font-mono">
                                BAL: {getSelectedTokenBalance()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-app-secondary font-mono">
                            {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Source Wallet Info */}
                    <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-app-primary font-mono">SOURCE_WALLET</span>
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-app-tertiary border border-app-primary-30 flex items-center justify-center mr-2">
                            <svg className="w-3 h-3 text-app-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="5" width="20" height="14" rx="2" />
                              <path d="M16 10h2M6 14h12" />
                            </svg>
                          </div>
                          <span className="text-sm text-app-primary font-mono glitch-text">
                            {getWalletDisplayName(wallets.find(w => w.privateKey === sourceWallet)!)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-app-secondary font-mono">BALANCES</span>
                        <div className="flex flex-col items-end">
                          <span className="text-sm text-app-primary font-mono">
                            {(solBalances.get(wallets.find(w => w.privateKey === sourceWallet)?.address || '') || 0).toFixed(4)} SOL
                          </span>
                          <span className="text-sm color-primary font-mono">
                            {(tokenBalances.get(wallets.find(w => w.privateKey === sourceWallet)?.address || '') || 0).toFixed(4)} {tokenAddress.slice(0, 4)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Amount Input with cyberpunk design */}
                    <div className="space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <label className="text-sm font-medium text-app-primary font-mono">
                            BURN_AMOUNT
                          </label>
                          <div className="relative" onMouseEnter={() => setShowInfoTip(true)} onMouseLeave={() => setShowInfoTip(false)}>
                            <Info size={14} className="text-app-secondary cursor-help" />
                            {showInfoTip && (
                              <div className="absolute left-0 bottom-full mb-2 p-2 bg-app-tertiary border border-app-primary-30 rounded-lg shadow-lg text-xs text-app-primary w-48 z-10 font-mono modal-glow">
                                <span className="color-primary">!</span> This amount will be permanently destroyed
                              </div>
                            )}
                          </div>
                        </div>
                        {tokenAccounts.find(t => t.mint === tokenAddress) && (
                          <button
                            type="button"
                            onClick={() => setAmount(getSelectedTokenBalance().toString())}
                            className="text-xs px-2 py-0.5 bg-primary-10 hover:bg-primary-20 border border-app-primary-30 color-primary rounded-lg transition-all modal-btn-cyberpunk font-mono"
                          >
                            MAX
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        {/* Decorative elements for cyberpunk input */}
                        <div className="absolute -top-px left-4 right-4 h-px bg-app-primary-50"></div>
                        <div className="absolute -bottom-px left-4 right-4 h-px bg-app-primary-50"></div>
                        <div className="absolute top-3 -left-px bottom-3 w-px bg-app-primary-50"></div>
                        <div className="absolute top-3 -right-px bottom-3 w-px bg-app-primary-50"></div>
                        
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setAmount(value);
                            }
                          }}
                          placeholder="ENTER_AMOUNT_TO_BURN"
                          className="w-full pl-4 pr-16 py-3 bg-app-primary border border-app-primary-30 rounded-lg text-app-primary focus:outline-none focus-border-primary transition-all modal-input-cyberpunk font-mono tracking-wider"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm color-primary font-mono">
                          {getSelectedTokenSymbol()}
                        </div>
                      </div>
                    </div>

                    {/* Summary Box with burn visualization */}
                    {amount && parseFloat(amount) > 0 && (
                      <div className="relative mt-6 rounded-lg overflow-hidden">
                        {/* Cyberpunk burn effect background */}
                        <div className="absolute inset-0 bg-gradient-to-b from-primary-05 to-transparent"></div>
                        <div className="absolute inset-0 modal-cyberpunk-content::before pointer-events-none opacity-30"></div>
                        
                        <div className="relative p-4 border border-app-primary-30 rounded-lg">
                          <div className="absolute top-0 right-0 p-1 bg-app-primary border-l border-b border-app-primary-30 color-primary text-xs font-mono">
                            BURN_PREVIEW
                          </div>
                          
                          <div className="flex justify-between items-center mt-4">
                            <span className="text-sm text-app-secondary font-mono">BURN_AMOUNT</span>
                            <span className="text-sm font-semibold color-primary font-mono glitch-text">
                              {amount} {getSelectedTokenSymbol()}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-app-secondary font-mono">CURRENT_BALANCE</span>
                            <span className="text-sm text-app-primary font-mono">{getSelectedTokenBalance()} {getSelectedTokenSymbol()}</span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-app-secondary font-mono">BALANCE_AFTER_BURN</span>
                            <span className="text-sm text-app-primary font-mono">
                              {Math.max(0, getSelectedTokenBalance() - parseFloat(amount)).toFixed(4)} {getSelectedTokenSymbol()}
                            </span>
                          </div>
                          
                          {/* Visual representation of burning */}
                          <div className="mt-4 h-2 bg-app-tertiary rounded-lg overflow-hidden">
                            <div 
                              className="h-full bg-app-primary-color transition-all duration-500"
                              style={{ 
                                width: `${Math.min(100, (parseFloat(amount) / getSelectedTokenBalance()) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <div className="mt-1 flex justify-between text-xs text-app-secondary font-mono">
                            <span>0</span>
                            <span>{getSelectedTokenBalance()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review and Confirm */}
            {currentStep === 2 && (
              <div className={`space-y-6 ${modalClass || 'animate-content-fade'}`}>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="color-primary border border-app-primary-30 p-1 rounded">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-app-primary font-mono">
                    <span className="color-primary">/</span> REVIEW BURN <span className="color-primary">/</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column - Summary */}
                  <div className="space-y-4">
                    <div className="bg-app-tertiary rounded-lg border border-app-primary-30 p-4">
                      <h4 className="text-base font-semibold text-app-primary font-mono mb-3">
                        <span className="color-primary">&gt;</span> BURN_SUMMARY
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-app-secondary font-mono">TOKEN</span>
                          <div className="flex items-center">
                            <div className="w-5 h-5 rounded-full bg-primary-20 border border-app-primary-30 flex items-center justify-center mr-2">
                              <span className="text-xs color-primary font-mono">
                                {getSelectedTokenSymbol()[0] || 'T'}
                              </span>
                            </div>
                            <span className="text-sm text-app-primary font-mono">{getSelectedTokenSymbol()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-app-secondary font-mono">TOKEN_ADDR</span>
                          <span className="text-sm font-mono text-app-primary glitch-text">
                            {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-app-secondary font-mono">SOURCE</span>
                          <span className="text-sm font-mono text-app-primary glitch-text">
                            {formatAddress(wallets.find(w => w.privateKey === sourceWallet)?.address || '')}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-app-secondary font-mono">BALANCE</span>
                          <span className="text-sm text-app-primary font-mono">{getSelectedTokenBalance()} {getSelectedTokenSymbol()}</span>
                        </div>
                        
                        <div className="pt-2 border-t border-app-primary-30 flex items-center justify-between">
                          <span className="text-sm font-medium text-app-primary font-mono">BURN_AMOUNT</span>
                          <span className="text-sm font-semibold color-primary font-mono glitch-text">
                            {amount} {getSelectedTokenSymbol()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-app-secondary font-mono">NEW_BALANCE</span>
                          <span className="text-sm text-app-primary font-mono">
                            {Math.max(0, getSelectedTokenBalance() - parseFloat(amount)).toFixed(4)} {getSelectedTokenSymbol()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Warning Box */}
                    <div className="relative bg-primary-05 border border-app-primary-20 rounded-lg p-3 overflow-hidden">
                      {/* Scanline effect */}
                      <div className="absolute inset-0 modal-cyberpunk-content::before pointer-events-none opacity-20"></div>
                      
                      <div className="flex items-start color-primary text-sm">
                        <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-mono leading-relaxed">
                          <span className="font-bold">WARNING:</span> This burn operation is permanent and irreversible. The tokens will be destroyed from the blockchain.
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column - Burn Effect Visualization */}
                  <div className="bg-app-tertiary rounded-lg border border-app-primary-30 p-4 relative overflow-hidden">
                    {/* Futuristic decorations */}
                    <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-app-primary-20"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-app-primary-20"></div>
                    
                    <h4 className="text-base font-semibold text-app-primary font-mono mb-6 relative z-10">
                      <span className="color-primary">&gt;</span> BURN_EFFECT
                    </h4>
                    
                    <div className="flex flex-col items-center justify-center h-44 space-y-6 relative z-10">
                      <div className="flex items-center justify-center w-full">
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-app-secondary mb-1 font-mono">CURRENT</span>
                          <div className="text-lg font-semibold text-app-primary font-mono">
                            {getSelectedTokenBalance()} {getSelectedTokenSymbol()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Animated burn arrow */}
                      <div className="relative">
                        <ArrowDown size={24} className="color-primary" />
                        <div className="absolute inset-0 animate-pulse-slow color-primary">
                          <ArrowDown size={24} className="opacity-50" />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center w-full">
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-app-secondary mb-1 font-mono">AFTER_BURN</span>
                          <div className="text-lg font-semibold color-primary font-mono glitch-text">
                            {Math.max(0, getSelectedTokenBalance() - parseFloat(amount)).toFixed(4)} {getSelectedTokenSymbol()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Destructive animation effect */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/4 from-primary-10 bg-gradient-to-t to-transparent"></div>
                  </div>
                </div>

                {/* Confirmation Checkbox with cyberpunk style */}
                <div className="bg-app-tertiary rounded-lg border border-app-primary-30 p-4 mt-4">
                  <div 
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setIsConfirmed(!isConfirmed)}
                  >
                    <div className="relative mt-1">
                      <div 
                        className={`w-5 h-5 border border-app-primary-40 rounded transition-all ${isConfirmed ? 'bg-app-primary-color border-0' : ''}`}
                      ></div>
                      <CheckCircle 
                        size={14} 
                        className={`absolute top-0.5 left-0.5 text-app-primary transition-all ${isConfirmed ? 'opacity-100' : 'opacity-0'}`}
                      />
                    </div>
                    <span className="text-sm text-app-primary leading-relaxed font-mono select-none">
                      I confirm that I want to burn <span className="color-primary font-medium">
                        {amount} {getSelectedTokenSymbol()}
                      </span>. I understand this action cannot be undone and the tokens will be permanently removed from circulation.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Futuristic Navigation Button Bar */}
            <div className="flex justify-between mt-8 relative">
              {/* Back Button */}
              <button
                type="button"
                onClick={currentStep === 0 ? onClose : handleBack}
                disabled={isSubmitting}
                className={`px-4 py-2 bg-app-tertiary border border-app-primary-30 hover-border-primary rounded-lg transition-all modal-btn-cyberpunk flex items-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {currentStep === 0 ? (
                  <span className="font-mono text-app-primary">CANCEL</span>
                ) : (
                  <div className="flex items-center font-mono text-app-primary">
                    <ChevronLeft size={16} className="mr-1" />
                    BACK
                  </div>
                )}
              </button>

              {/* Next/Submit Button */}
              <button
                type={currentStep === STEPS_BURN.length - 1 ? 'submit' : 'button'}
                onClick={currentStep === STEPS_BURN.length - 1 ? undefined : handleNext}
                disabled={
                  isSubmitting || 
                  (currentStep === 0 && !sourceWallet) ||
                  (currentStep === 1 && (!amount || parseFloat(amount) <= 0)) ||
                  (currentStep === STEPS_BURN.length - 1 && !isConfirmed)
                }
                onMouseEnter={() => setButtonHover(true)}
                onMouseLeave={() => setButtonHover(false)}
                className={`px-5 py-2.5 rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider 
                          ${(isSubmitting || 
                            (currentStep === 0 && !sourceWallet) ||
                            (currentStep === 1 && (!amount || parseFloat(amount) <= 0)) ||
                            (currentStep === STEPS_BURN.length - 1 && !isConfirmed))
                              ? 'bg-app-primary-50 text-app-primary-80 cursor-not-allowed opacity-50' 
                              : 'bg-app-primary-color text-app-primary hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-cyberpunk'}`}
              >
                {/* Button Content */}
                {currentStep === STEPS_BURN.length - 1 ? (
                  isSubmitting ? (
                    <div className="flex items-center justify-center font-mono">
                      <div className="h-4 w-4 rounded-full border-2 border-app-primary-80 border-t-transparent animate-spin mr-2"></div>
                      <span>PROCESSING...</span>
                    </div>
                  ) : (
                    <span>CONFIRM_BURN</span>
                  )
                ) : (
                  <div className="flex items-center font-mono">
                    <span>NEXT</span>
                    <ChevronRight size={16} className="ml-1" />
                  </div>
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