import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, X, CheckCircle, DollarSign, Info, Search, ChevronRight } from 'lucide-react';
import { Connection } from '@solana/web3.js';
import { useToast } from "../components/Notifications";
import { WalletType, getWalletDisplayName } from '../Utils';
import { formatAddress, formatSolBalance } from '../utils/formatting';
import { consolidateSOL, validateConsolidationInputs } from '../utils/consolidate';

interface ConsolidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletType[];
  solBalances: Map<string, number>;
  connection: Connection;
}

export const ConsolidateModal: React.FC<ConsolidateModalProps> = ({
  isOpen,
  onClose,
  wallets,
  solBalances
}) => {
  // States for the modal
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { showToast } = useToast();

  // States for consolidate operation
  const [selectedSourceWallets, setSelectedSourceWallets] = useState<string[]>([]);
  const [selectedRecipientWallet, setSelectedRecipientWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
  const [recipientSearchTerm, setRecipientSearchTerm] = useState('');
  const [showInfoTip, setShowInfoTip] = useState(false);
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Get wallet SOL balance by address
  const getWalletBalance = (address: string): number => {
    return solBalances.has(address) ? (solBalances.get(address) ?? 0) : 0;
  };

  // Get wallet by address
  const getWalletByAddress = (address: string) => {
    return wallets.find(wallet => wallet.address === address);
  };

  // Get wallet private key by address
  const getPrivateKeyByAddress = (address: string) => {
    const wallet = getWalletByAddress(address);
    return wallet ? wallet.privateKey : '';
  };

  // Reset form state
  const resetForm = () => {
    setCurrentStep(0);
    setIsConfirmed(false);
    setSelectedRecipientWallet('');
    setSelectedSourceWallets([]);
    setAmount('');
    setSourceSearchTerm('');
    setRecipientSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
  };

  // Calculate total amount to be consolidated
  const getTotalConsolidationAmount = () => {
    return selectedSourceWallets.reduce((total, address) => {
      const balance = getWalletBalance(address) || 0;
      return total + (balance * parseFloat(amount) / 100);
    }, 0);
  };

  const handleConsolidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    setIsSubmitting(true);
    
    try {
      // Get the receiver private key
      const receiverPrivateKey = getPrivateKeyByAddress(selectedRecipientWallet);
      if (!receiverPrivateKey) {
        showToast("Receiver wallet private key not found", "error");
        setIsSubmitting(false);
        return;
      }
      
      // Prepare receiver wallet data
      const receiverWallet = {
        address: selectedRecipientWallet,
        privateKey: receiverPrivateKey
      };
      
      // Prepare source wallets with their private keys
      const sourceWallets = selectedSourceWallets
        .map(address => ({
          address,
          privateKey: getPrivateKeyByAddress(address)
        }))
        .filter(wallet => wallet.privateKey);
      
      // Validate all inputs
      const validation = validateConsolidationInputs(
        sourceWallets,
        receiverWallet,
        parseFloat(amount),
        solBalances
      );
      
      if (!validation.valid) {
        showToast(validation.error || "Invalid consolidation data", "error");
        setIsSubmitting(false);
        return;
      }
      
      // Execute the consolidation
      const result = await consolidateSOL(
        sourceWallets,
        receiverWallet,
        parseFloat(amount)
      );
      
      if (result.success) {
        showToast("SOL consolidated successfully", "success");
        resetForm();
        onClose();
      } else {
        showToast(result.error || "Consolidation failed", "error");
      }
    } catch (error) {
      console.error('Consolidation error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast("Consolidation failed: " + (errorMessage || "Unknown error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle source wallet selection toggles for consolidate
  const toggleSourceWalletSelection = (address: string) => {
    setSelectedSourceWallets(prev => {
      if (prev.includes(address)) {
        return prev.filter(a => a !== address);
      } else {
        return [...prev, address];
      }
    });
  };

  // Get available wallets for consolidate source selection (exclude recipient)
  const getAvailableSourceWallets = () => {
    return wallets.filter(wallet => 
      wallet.address !== selectedRecipientWallet && 
      (getWalletBalance(wallet.address) || 0) > 0
    );
  };

  // Get available wallets for recipient selection in consolidate (exclude sources)
  const getAvailableRecipientWalletsForConsolidate = () => {
    return wallets.filter(wallet => 
      !selectedSourceWallets.includes(wallet.address) && 
      (getWalletBalance(wallet.address) || 0) > 0
    );
  };
  
  // Handle select/deselect all for source wallets
  const handleSelectAllSources = () => {
    if (selectedSourceWallets.length === getAvailableSourceWallets().length) {
      // If all are selected, deselect all
      setSelectedSourceWallets([]);
    } else {
      // Otherwise, select all
      setSelectedSourceWallets(getAvailableSourceWallets().map(wallet => wallet.address));
    }
  };

  // Filter and sort wallets based on search term and other criteria
  const filterWallets = (walletList: WalletType[], search: string) => {
    // First apply search filter
    let filtered = walletList;
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Then apply balance filter
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) >= 0.1);
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) < 0.1);
      }
    }
    
    // Finally, sort the wallets
    return filtered.sort((a, b) => {
      if (sortOption === 'address') {
        return sortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (sortOption === 'balance') {
        const balanceA = getWalletBalance(a.address) || 0;
        const balanceB = getWalletBalance(b.address) || 0;
        return sortDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
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
    
    @keyframes data-transfer {
      0% { transform: translateY(0); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { transform: translateY(20px); opacity: 0; }
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
    
    .data-flow {
      position: relative;
      overflow: hidden;
    }
    
    .data-flow::before {
      content: "";
      position: absolute;
      height: 6px;
      width: 6px;
      background-color: var(--color-primary-70);
      border-radius: 50%;
      top: 30%;
      left: 50%;
      animation: data-transfer 2s infinite;
      opacity: 0;
    }
    
    .scrollbar-thin::-webkit-scrollbar {
      width: 4px;
    }
    
    .scrollbar-thin::-webkit-scrollbar-track {
      background: var(--color-primary-10);
    }
    
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: var(--color-primary-50);
      border-radius: 2px;
    }
    
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background: var(--color-primary-70);
    }
  `;
  document.head.appendChild(modalStyleElement);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm modal-cyberpunk-container bg-app-primary-85">
      <div className="relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-6xl overflow-hidden transform modal-cyberpunk-content modal-glow">
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
              <span className="color-primary">/</span> CONSOLIDATE SOL <span className="color-primary">/</span>
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
            style={{ width: currentStep === 0 ? '50%' : '100%' }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-5 space-y-5">
          {currentStep === 0 && (
            <div className="animate-[fadeIn_0.3s_ease] flex flex-col space-y-4">
              {/* Row 1: Wallet Selection (Side by Side) */}
              <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                {/* Left Side - Recipient Wallet Selector */}
                <div className="w-full md:w-1/2">
                  <div className="group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-app-secondary group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                        <span className="color-primary">&#62;</span> Recipient Wallet <span className="color-primary">&#60;</span>
                      </label>
                      {selectedRecipientWallet && (
                        <div className="flex items-center gap-1 text-xs">
                          <DollarSign size={10} className="text-app-secondary" />
                          <span className="color-primary font-medium font-mono">
                            {formatSolBalance(getWalletBalance(selectedRecipientWallet))} SOL
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Recipient Search and Filters */}
                    <div className="mb-2 flex space-x-2">
                      <div className="relative flex-grow">
                        <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary" />
                        <input
                          type="text"
                          value={recipientSearchTerm}
                          onChange={(e) => setRecipientSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus:border-app-primary transition-all modal-input-cyberpunk font-mono"
                          placeholder="SEARCH RECIPIENT..."
                        />
                      </div>
                      
                      <select 
                        className="bg-app-tertiary border border-app-primary-30 rounded-lg px-2 text-sm text-app-primary focus:outline-none focus:border-app-primary modal-input-cyberpunk font-mono"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                      >
                        <option value="address">ADDRESS</option>
                        <option value="balance">BALANCE</option>
                      </select>
                      
                      <button
                        className="p-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-secondary hover:color-primary hover:border-app-primary transition-all modal-btn-cyberpunk"
                        onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                      >
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>

                    <div className="h-52 overflow-y-auto border border-app-primary-20 rounded-lg shadow-inner bg-app-tertiary transition-all duration-200 group-hover:border-app-primary-40 scrollbar-thin">
                      {filterWallets(getAvailableRecipientWalletsForConsolidate(), recipientSearchTerm).length > 0 ? (
                        filterWallets(getAvailableRecipientWalletsForConsolidate(), recipientSearchTerm).map((wallet) => (
                          <div 
                            key={wallet.id}
                            className={`flex items-center p-2.5 hover-bg-secondary cursor-pointer transition-all duration-200 border-b border-app-primary-20 last:border-b-0
                                      ${selectedRecipientWallet === wallet.address ? 'bg-primary-10 border-app-primary-30' : ''}`}
                            onClick={() => setSelectedRecipientWallet(wallet.address)}
                          >
                            <div className={`w-5 h-5 mr-3 rounded flex items-center justify-center transition-all duration-300
                                            ${selectedRecipientWallet === wallet.address
                                              ? 'bg-app-primary-color shadow-md shadow-app-primary-40' 
                                              : 'border border-app-primary-30 bg-app-tertiary'}`}>
                              {selectedRecipientWallet === wallet.address && (
                                <CheckCircle size={14} className="text-app-primary animate-[fadeIn_0.2s_ease]" />
                              )}
                            </div>
                            <div className="flex-1 flex flex-col">
                              <span className="font-mono text-sm text-app-primary glitch-text">{getWalletDisplayName(wallet)}</span>
                              <div className="flex items-center mt-0.5">
                                <DollarSign size={12} className="text-app-secondary mr-1" />
                                <span className="text-xs text-app-secondary font-mono">{formatSolBalance(getWalletBalance(wallet.address) || 0)} SOL</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-app-secondary text-center font-mono">
                          {recipientSearchTerm ? "NO WALLETS FOUND" : "NO WALLETS AVAILABLE"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Right Side - Source Wallets */}
                <div className="w-full md:w-1/2">
                  <div className="group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-app-secondary group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                        <span className="color-primary">&#62;</span> Source Wallets <span className="color-primary">&#60;</span>
                      </label>
                      <button 
                        onClick={handleSelectAllSources}
                        className="text-xs px-2 py-0.5 bg-app-tertiary hover-bg-secondary text-app-secondary hover:color-primary rounded transition-all border border-app-primary-20 hover:border-app-primary font-mono"
                      >
                        {selectedSourceWallets.length === getAvailableSourceWallets().length ? 'DESELECT ALL' : 'SELECT ALL'}
                      </button>
                    </div>

                    {/* Source Search and Filters */}
                    <div className="mb-2 flex space-x-2">
                      <div className="relative flex-grow">
                        <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary" />
                        <input
                          type="text"
                          value={sourceSearchTerm}
                          onChange={(e) => setSourceSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus:border-app-primary transition-all modal-input-cyberpunk font-mono"
                          placeholder="SEARCH SOURCES..."
                        />
                      </div>
                      
                      <select 
                        className="bg-app-tertiary border border-app-primary-30 rounded-lg px-2 text-sm text-app-primary focus:outline-none focus:border-app-primary modal-input-cyberpunk font-mono"
                        value={balanceFilter}
                        onChange={(e) => setBalanceFilter(e.target.value)}
                      >
                        <option value="all">ALL</option>
                        <option value="highBalance">HIGH</option>
                        <option value="lowBalance">LOW</option>
                      </select>
                    </div>

                    <div className="h-52 overflow-y-auto border border-app-primary-20 rounded-lg shadow-inner bg-app-tertiary transition-all duration-200 group-hover:border-app-primary-40 scrollbar-thin">
                      {filterWallets(getAvailableSourceWallets(), sourceSearchTerm).length > 0 ? (
                        filterWallets(getAvailableSourceWallets(), sourceSearchTerm).map((wallet) => {
                          const balance = getWalletBalance(wallet.address) || 0;
                          const transferAmount = balance * parseFloat(amount || '0') / 100;
                          
                          return (
                            <div 
                              key={wallet.id}
                              className={`flex items-center p-2.5 hover-bg-secondary cursor-pointer transition-all duration-200 border-b border-app-primary-20 last:border-b-0 data-flow
                                        ${selectedSourceWallets.includes(wallet.address) ? 'bg-primary-10 border-app-primary-30' : ''}`}
                              onClick={() => toggleSourceWalletSelection(wallet.address)}
                            >
                              <div className={`w-5 h-5 mr-3 rounded flex items-center justify-center transition-all duration-300
                                              ${selectedSourceWallets.includes(wallet.address) 
                                                ? 'bg-app-primary-color shadow-md shadow-app-primary-40' 
                                                : 'border border-app-primary-30 bg-app-tertiary'}`}>
                                {selectedSourceWallets.includes(wallet.address) && (
                                  <CheckCircle size={14} className="text-app-primary animate-[fadeIn_0.2s_ease]" />
                                )}
                              </div>
                              <div className="flex-1 flex justify-between items-center">
                                <span className="font-mono text-sm text-app-primary glitch-text">{getWalletDisplayName(wallet)}</span>
                                <div className="flex flex-col items-end">
                                  <span className="text-xs text-app-secondary font-mono">{formatSolBalance(balance)} SOL</span>
                                  {selectedSourceWallets.includes(wallet.address) && amount && (
                                    <span className="text-xs color-primary font-mono">-{transferAmount.toFixed(4)} SOL</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 text-sm text-app-secondary text-center font-mono">
                          {sourceSearchTerm ? "NO WALLETS FOUND" : "NO WALLETS AVAILABLE"}
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-app-secondary font-mono">
                        SELECTED: <span className="color-primary font-medium">{selectedSourceWallets.length}</span> WALLETS
                      </span>
                      {selectedSourceWallets.length > 0 && amount && (
                        <span className="text-app-secondary font-mono">
                          TOTAL TO CONSOLIDATE: <span className="color-primary font-medium">
                            {getTotalConsolidationAmount().toFixed(4)} SOL
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Row 2: Live Preview, Percentage Input, and Buttons */}
              <div className="mt-4 border-t border-app-primary-20 pt-4">
                <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                  {/* Percentage Input */}
                  <div className="w-full md:w-1/3">
                    <div className="group">
                      <div className="flex items-center gap-1 mb-2">
                        <label className="text-sm font-medium text-app-secondary group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                          <span className="color-primary">&#62;</span> Percentage to Consolidate (%) <span className="color-primary">&#60;</span>
                        </label>
                        <div className="relative" onMouseEnter={() => setShowInfoTip(true)} onMouseLeave={() => setShowInfoTip(false)}>
                          <Info size={14} className="text-app-secondary cursor-help" />
                          {showInfoTip && (
                            <div className="absolute left-0 bottom-full mb-2 p-2 bg-app-tertiary border border-app-primary-30 rounded shadow-lg text-xs text-app-primary w-48 z-10 font-mono">
                              Percentage of SOL to consolidate from each source wallet
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value) && parseFloat(value) <= 100) {
                              setAmount(value);
                            }
                          }}
                          className="w-full px-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary shadow-inner focus:border-app-primary focus:ring-1 focus:ring-primary-50 focus:outline-none transition-all duration-200 modal-input-cyberpunk font-mono tracking-wider"
                          placeholder="ENTER PERCENTAGE (E.G. 90)"
                        />
                        <div className="absolute inset-0 rounded-lg pointer-events-none border border-transparent group-hover:border-app-primary-30 transition-all duration-300"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Live Preview / Summary Box */}
                  <div className="w-full md:w-2/3">
                    {selectedRecipientWallet && selectedSourceWallets.length > 0 ? (
                      <div className="bg-app-tertiary rounded-lg p-3 border border-app-primary-30 h-full shadow-inner">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-app-primary font-mono tracking-wider">
                            <span className="color-primary">//</span> LIVE PREVIEW
                          </h3>
                          {amount && (
                            <div className="px-2 py-1 bg-primary-20 rounded-md border border-app-primary-30">
                              <span className="text-xs font-medium color-primary font-mono">
                                {amount ? `${amount}% CONSOLIDATION` : 'SET PERCENTAGE'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="flex flex-col space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-app-secondary font-mono">SOURCE WALLETS:</span>
                              <span className="text-xs text-app-primary font-mono">{selectedSourceWallets.length} SELECTED</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-app-secondary font-mono">RECIPIENT:</span>
                              <span className="text-xs text-app-primary font-mono">{formatAddress(selectedRecipientWallet)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-app-secondary font-mono">RECIPIENT BALANCE:</span>
                              <span className="text-xs text-app-primary font-mono">{formatSolBalance(getWalletBalance(selectedRecipientWallet))} SOL</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-1">
                            {amount && (
                              <>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-app-secondary font-mono">AMOUNT TO MOVE:</span>
                                  <span className="text-xs font-semibold color-primary font-mono">
                                    {getTotalConsolidationAmount().toFixed(4)} SOL
                                  </span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-app-secondary font-mono">NEW BALANCE:</span>
                                  <span className="text-xs text-app-primary font-mono">
                                    {(getWalletBalance(selectedRecipientWallet) + getTotalConsolidationAmount()).toFixed(4)} SOL
                                  </span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-app-secondary font-mono">CHANGE:</span>
                                  <span className="text-xs font-semibold color-primary font-mono">
                                    +{getTotalConsolidationAmount().toFixed(4)} SOL
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-app-tertiary rounded-lg p-3 border border-app-primary-20 h-full flex items-center justify-center text-app-secondary text-sm font-mono">
                        SELECT RECIPIENT AND SOURCE WALLETS TO SEE LIVE PREVIEW
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-app-primary bg-app-tertiary border border-app-primary-30 hover-bg-secondary hover:border-app-primary rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-cyberpunk"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => setCurrentStep(1)}
                    disabled={!selectedRecipientWallet || !amount || selectedSourceWallets.length === 0}
                    className={`px-5 py-2.5 rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider
                              ${!selectedRecipientWallet || !amount || selectedSourceWallets.length === 0
                                ? 'bg-primary-50 cursor-not-allowed opacity-50 text-app-primary-80' 
                                : 'bg-app-primary-color text-app-primary hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-cyberpunk'}`}
                  >
                    <span>REVIEW</span>
                    <ChevronRight size={16} className="ml-1" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 1 && (
            <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 animate-[fadeIn_0.3s_ease]">
              {/* Left Side - Summary */}
              <div className="w-full md:w-1/2 space-y-4">
                <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30 shadow-inner">
                  <h3 className="text-base font-semibold text-app-primary mb-3 font-mono tracking-wider">
                    <span className="color-primary">//</span> CONSOLIDATION SUMMARY
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">TO WALLET:</span>
                      <div className="flex items-center bg-app-secondary px-2 py-1 rounded border border-app-primary-20">
                        <span className="text-sm font-mono text-app-primary glitch-text">{getWalletByAddress(selectedRecipientWallet) ? getWalletDisplayName(getWalletByAddress(selectedRecipientWallet)!) : formatAddress(selectedRecipientWallet)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">CURRENT BALANCE:</span>
                      <span className="text-sm text-app-primary font-mono">{formatSolBalance(getWalletBalance(selectedRecipientWallet) || 0)} SOL</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">SOURCE WALLETS:</span>
                      <span className="text-sm text-app-primary font-mono">{selectedSourceWallets.length} WALLETS</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">PERCENTAGE PER SOURCE:</span>
                      <span className="text-sm color-primary font-medium font-mono">{amount}%</span>
                    </div>
                    
                    <div className="pt-2 border-t border-app-primary-20 flex items-center justify-between">
                      <span className="text-sm font-medium text-app-secondary font-mono">TOTAL TO CONSOLIDATE:</span>
                      <span className="text-sm font-semibold color-primary font-mono">{getTotalConsolidationAmount().toFixed(4)} SOL</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">NEW BALANCE (ESTIMATED):</span>
                      <span className="text-sm text-app-primary font-mono">
                        {(getWalletBalance(selectedRecipientWallet) + getTotalConsolidationAmount()).toFixed(4)} SOL
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Confirmation Checkbox */}
                <div className="flex items-center px-3 py-3 bg-app-tertiary rounded-lg border border-app-primary-30">
                  <div 
                    className="flex items-center cursor-pointer"
                    onClick={() => setIsConfirmed(!isConfirmed)}
                  >
                    <div className="relative mx-1">
                      <div 
                        className="w-5 h-5 border border-app-primary-40 rounded transition-all cursor-pointer"
                        style={{
                          backgroundColor: isConfirmed ? 'var(--color-primary)' : 'transparent',
                          borderColor: isConfirmed ? 'var(--color-primary)' : 'var(--color-primary-40)'
                        }}
                      ></div>
                      <CheckCircle size={14} className={`absolute top-0.5 left-0.5 text-app-primary transition-all ${isConfirmed ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                    <span className="text-app-primary text-sm ml-2 cursor-pointer select-none font-mono">
                      I CONFIRM THIS CONSOLIDATION OPERATION
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Right Side - Source Wallets List */}
              <div className="w-full md:w-1/2">
                <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30 h-full shadow-inner">
                  <h3 className="text-base font-semibold text-app-primary mb-3 font-mono tracking-wider">
                    <span className="color-primary">//</span> SELECTED SOURCE WALLETS
                  </h3>
                  
                  <div className="max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                    {selectedSourceWallets.length > 0 ? (
                      selectedSourceWallets.map((address, index) => {
                        const wallet = getWalletByAddress(address);
                        const balance = getWalletBalance(address) || 0;
                        const transferAmount = balance * parseFloat(amount) / 100;
                        
                        return wallet ? (
                          <div key={wallet.id} className="flex items-center justify-between py-1.5 border-b border-app-primary-20 last:border-b-0">
                            <div className="flex items-center">
                              <span className="text-app-secondary text-xs mr-2 w-6 font-mono">{index + 1}.</span>
                              <span className="font-mono text-sm text-app-primary glitch-text">{getWalletDisplayName(wallet)}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs text-app-secondary mr-2 font-mono">CURRENT: {formatSolBalance(balance)} SOL</span>
                              <span className="text-xs color-primary font-mono">-{transferAmount.toFixed(4)} SOL</span>
                            </div>
                          </div>
                        ) : null;
                      })
                    ) : (
                      <div className="p-3 text-sm text-app-secondary text-center font-mono">
                        NO SOURCE WALLETS SELECTED
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Back/Consolidate Buttons - Only show on step 1 */}
          {currentStep === 1 && (
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setCurrentStep(0)}
                className="px-5 py-2.5 text-app-primary bg-app-tertiary border border-app-primary-30 hover-bg-secondary hover:border-app-primary rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-cyberpunk"
              >
                BACK
              </button>
              <button
                onClick={handleConsolidate}
                disabled={!isConfirmed || isSubmitting}
                className={`px-5 py-2.5 rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider
                          ${!isConfirmed || isSubmitting
                            ? 'bg-primary-50 cursor-not-allowed opacity-50 text-app-primary-80' 
                            : 'bg-app-primary-color text-app-primary hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-cyberpunk'}`}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-app-primary-80 border-t-transparent animate-spin mr-2"></div>
                    PROCESSING...
                  </>
                ) : (
                  "CONSOLIDATE SOL"
                )}
              </button>
            </div>
          )}
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

export default ConsolidateModal;