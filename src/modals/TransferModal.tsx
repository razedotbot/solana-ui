import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, X, CheckCircle, DollarSign, Info, Search, ChevronRight, Coins } from 'lucide-react';
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  VersionedTransaction, 
  TransactionMessage,
  MessageV0
} from '@solana/web3.js';
import bs58 from 'bs58';
import { useToast } from "../Notifications";
import { WalletType, getWalletDisplayName } from '../Utils';
import { Buffer } from 'buffer';
import { sendToJitoBundleService } from '../utils/jitoService';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletType[];
  solBalances: Map<string, number>;
  connection: Connection;
  tokenAddress?: string; // Add tokenAddress prop
  tokenBalances?: Map<string, number>; // Add tokenBalances prop
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  wallets,
  solBalances,
  connection,
  tokenAddress = '',
  tokenBalances = new Map()
}) => {
  // States for the modal
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { showToast } = useToast();

  // States for transfer operation
  const [sourceWallets, setSourceWallets] = useState<string[]>([]); // Multiple source wallets
  const [receiverAddresses, setReceiverAddresses] = useState<string[]>([]); // Multiple recipients
  const [newRecipientAddress, setNewRecipientAddress] = useState(''); // Input for new recipient
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [transferType, setTransferType] = useState<'SOL' | 'TOKEN'>('SOL');
  const [distributionMode, setDistributionMode] = useState<'percentage' | 'amount'>('amount'); // How to distribute amounts
  
  // States for batch transfer processing
  const [transferQueue, setTransferQueue] = useState<Array<{
    sourceWallet: string;
    recipient: string;
    amount: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
    signature?: string;
  }>>([]);
  const [currentTransferIndex, setCurrentTransferIndex] = useState(0);
  const [batchProcessing, setBatchProcessing] = useState(false);
  
  // States for enhanced functionality
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [showInfoTip, setShowInfoTip] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Update selectedToken when transferType changes to TOKEN
  useEffect(() => {
    if (transferType === 'TOKEN' && tokenAddress) {
      setSelectedToken(tokenAddress);
    } else if (transferType === 'SOL') {
      setSelectedToken('');
    }
  }, [transferType, tokenAddress]);

  // Format SOL balance for display
  const formatSolBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  // Format token balance for display
  const formatTokenBalance = (balance: number) => {
    if (balance === 0) return '0';
    if (balance < 0.001 && balance > 0) {
      return balance.toExponential(4);
    }
    return balance.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get wallet SOL balance by address
  const getWalletBalance = (address: string): number => {
    return solBalances.has(address) ? (solBalances.get(address) ?? 0) : 0;
  };

  // Get wallet token balance by address
  const getWalletTokenBalance = (address: string): number => {
    return tokenBalances.has(address) ? (tokenBalances.get(address) ?? 0) : 0;
  };

  // Get wallet by privateKey
  const getWalletByPrivateKey = (privateKey: string) => {
    return wallets.find(wallet => wallet.privateKey === privateKey);
  };

  // Helper functions for multi-wallet selection
  const toggleSourceWallet = (privateKey: string) => {
    setSourceWallets(prev => 
      prev.includes(privateKey) 
        ? prev.filter(pk => pk !== privateKey)
        : [...prev, privateKey]
    );
  };

  const toggleRecipientAddress = (address: string) => {
    setReceiverAddresses(prev => 
      prev.includes(address) 
        ? prev.filter(addr => addr !== address)
        : [...prev, address]
    );
  };

  const addRecipientAddress = (address: string) => {
    if (address.trim() && !receiverAddresses.includes(address.trim())) {
      setReceiverAddresses(prev => [...prev, address.trim()]);
      setNewRecipientAddress(''); // Clear the input field
    }
  };

  const removeRecipientAddress = (address: string) => {
    setReceiverAddresses(prev => prev.filter(addr => addr !== address));
  };

  // Calculate transfer amounts based on distribution mode
  const calculateTransferAmounts = () => {
    const inputAmount = parseFloat(amount || '0');
    const numRecipients = receiverAddresses.length;
    
    if (distributionMode === 'percentage') {
      // In percentage mode, the input amount is a percentage (0-100)
      // Calculate the percentage of each wallet's balance to transfer
      const percentage = inputAmount / 100;
      
      return sourceWallets.map(privateKey => {
        const wallet = getWalletByPrivateKey(privateKey);
        if (!wallet) return '0';
        
        const balance = transferType === 'SOL' 
          ? getWalletBalance(wallet.address)
          : getWalletTokenBalance(wallet.address);
          
        const transferAmount = balance * percentage;
        return transferAmount.toString();
      });
    } else {
      // In amount mode, the input amount is the exact amount to transfer from each wallet
      return sourceWallets.map(() => inputAmount.toString());
    }
  };

  // Create transfer queue from selected wallets and recipients
  const createTransferQueue = () => {
    const amounts = calculateTransferAmounts();
    const queue: typeof transferQueue = [];
    
    sourceWallets.forEach((sourceWallet, walletIndex) => {
      receiverAddresses.forEach((recipient) => {
        // In percentage mode, each wallet has its own calculated amount
        // In amount mode, all wallets use the same amount
        const transferAmount = distributionMode === 'percentage' 
          ? amounts[walletIndex] 
          : amounts[0]; // All wallets use the same amount in 'amount' mode
          
        queue.push({
          sourceWallet,
          recipient,
          amount: transferAmount,
          status: 'pending'
        });
      });
    });
    
    setTransferQueue(queue);
    return queue;
  };

  // Reset form state
  const resetForm = () => {
    setCurrentStep(0);
    setIsConfirmed(false);
    setSourceWallets([]);
    setReceiverAddresses([]);
    setNewRecipientAddress('');
    setSelectedToken('');
    setAmount('');
    setTransferType('SOL');
    setDistributionMode('amount');
    setTransferQueue([]);
    setCurrentTransferIndex(0);
    setBatchProcessing(false);
    setSourceSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
  };

  // Handle batch transfer operation with local signing and direct RPC submission
  const handleBatchTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    
    setBatchProcessing(true);
    setIsSubmitting(true);
    
    const queue = createTransferQueue();
    let completedCount = 0;
    let failedCount = 0;
    
    try {
      for (let i = 0; i < queue.length; i++) {
        setCurrentTransferIndex(i);
        const transfer = queue[i];
        
        // Update status to processing
        setTransferQueue(prev => prev.map((t, idx) => 
          idx === i ? { ...t, status: 'processing' } : t
        ));
        
        try {
          const selectedWalletObj = getWalletByPrivateKey(transfer.sourceWallet);
          if (!selectedWalletObj) {
            throw new Error('Source wallet not found');
          }

          const baseUrl = 'https://solana.fury.bot';
          
          // Step 1: Request the transaction from the backend
          const buildResponse = await fetch(`${baseUrl}/api/tokens/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderPublicKey: selectedWalletObj.address,
              receiver: transfer.recipient,
              tokenAddress: transferType === 'TOKEN' ? selectedToken : null,
              amount: transfer.amount,
            }),
          });

          if (!buildResponse.ok) {
            throw new Error(`HTTP error! status: ${buildResponse.status}`);
          }

          const buildResult = await buildResponse.json();
          if (!buildResult.success) {
            throw new Error(buildResult.error);
          }

          // Step 2: Deserialize the transaction message from Base58
          const transactionBuffer = Buffer.from(bs58.decode(buildResult.data.transaction));
          const messageV0 = MessageV0.deserialize(transactionBuffer);
          
          // Step 3: Create and sign the versioned transaction
          const transaction = new VersionedTransaction(messageV0);
          
          // Create keypair from private key
          const keypair = Keypair.fromSecretKey(bs58.decode(transfer.sourceWallet));
          
          // Sign the transaction
          transaction.sign([keypair]);
          
          // Step 4: Send the signed transaction via Jito Bundle Service
          const serializedTransaction = bs58.encode(transaction.serialize());
          const jitoResult = await sendToJitoBundleService(serializedTransaction);
          
          // Extract signature from Jito result
          const signature = jitoResult.signature || jitoResult.txid || 'Unknown';
          
          // Update status to completed
          setTransferQueue(prev => prev.map((t, idx) => 
            idx === i ? { ...t, status: 'completed', signature } : t
          ));
          
          completedCount++;
          
        } catch (error) {
          console.error(`Transfer ${i + 1} failed:`, error);
          
          let errorMessage = 'Transfer failed';
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          // Update status to failed
          setTransferQueue(prev => prev.map((t, idx) => 
            idx === i ? { ...t, status: 'failed', error: errorMessage } : t
          ));
          
          failedCount++;
        }
        
        // Small delay between transfers to avoid rate limiting
        if (i < queue.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Show summary
      showToast(
        `Batch transfer completed: ${completedCount} successful, ${failedCount} failed`, 
        completedCount > 0 ? "success" : "error"
      );
      
      if (completedCount === queue.length) {
        // All transfers successful, close modal after delay
        setTimeout(() => {
          resetForm();
          onClose();
        }, 3000);
      }
      
    } catch (error) {
      console.error('Batch transfer error:', error);
      showToast('Batch transfer failed', "error");
    } finally {
      setBatchProcessing(false);
      setIsSubmitting(false);
    }
  };

  // Filter and sort wallets based on search term and other criteria
  const filterWallets = (walletList: WalletType[], search: string) => {
    // Filter based on transfer type and balance
    let filtered = walletList.filter(wallet => {
      if (transferType === 'SOL') {
        return (getWalletBalance(wallet.address) || 0) > 0;
      } else {
        return (getWalletTokenBalance(wallet.address) || 0) > 0;
      }
    });
    
    // Then apply search filter
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Then apply additional balance filter
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'highBalance') {
        if (transferType === 'SOL') {
          filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) >= 0.1);
        } else {
          filtered = filtered.filter(wallet => (getWalletTokenBalance(wallet.address) || 0) >= 1000);
        }
      } else if (balanceFilter === 'lowBalance') {
        if (transferType === 'SOL') {
          filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) < 0.1);
        } else {
          filtered = filtered.filter(wallet => (getWalletTokenBalance(wallet.address) || 0) < 1000);
        }
      }
    }
    
    // Finally, sort the wallets
    return filtered.sort((a, b) => {
      if (sortOption === 'address') {
        return sortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (sortOption === 'balance') {
        const balanceA = transferType === 'SOL' 
          ? (getWalletBalance(a.address) || 0)
          : (getWalletTokenBalance(a.address) || 0);
        const balanceB = transferType === 'SOL' 
          ? (getWalletBalance(b.address) || 0)
          : (getWalletTokenBalance(b.address) || 0);
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
    
    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    
    @keyframes scale-in {
      0% { transform: scale(0); }
      100% { transform: scale(1); }
    }
    
    .scrollbar-thin::-webkit-scrollbar {
      width: 4px;
    }
    
    .scrollbar-thin::-webkit-scrollbar-track {
      background: var(--color-bg-tertiary);
    }
    
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: var(--color-primary);
      border-radius: 2px;
    }
    
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background: var(--color-primary-dark);
    }
  `;
  document.head.appendChild(modalStyleElement);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm modal-cyberpunk-container bg-app-primary-85">
      <div className="relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-7xl max-h-[90vh] overflow-hidden transform modal-cyberpunk-content modal-glow">
        {/* Ambient grid background */}
        <div className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid"></div>

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
              <ArrowUpDown size={16} className="color-primary" />
            </div>
            <h2 className="text-lg font-semibold text-app-primary font-mono">
              <span className="color-primary">/</span> TRANSFER CONSOLE <span className="color-primary">/</span>
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

        {/* Main Content - Horizontal Layout */}
        <div className="relative z-10 h-[calc(90vh-120px)] overflow-hidden">
          <div className="h-full flex">
            {/* Left Panel - Configuration */}
            <div className="flex-1 border-r border-app-primary-20 overflow-y-auto">
              <div className="p-5 space-y-4">
                <div className="animate-[fadeIn_0.3s_ease]">
                  {/* Transfer Type Selection */}
                  <div className="group mb-4">
                    <label className="block text-sm font-medium text-app-secondary mb-2 group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Transfer Type <span className="color-primary">&#60;</span>
                    </label>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setTransferType('SOL')}
                        className={`flex-1 flex items-center justify-center p-3 rounded-lg border transition-all duration-200 font-mono modal-btn-cyberpunk ${
                          transferType === 'SOL'
                            ? 'bg-primary-20 border-app-primary color-primary shadow-md shadow-app-primary-40'
                            : 'bg-app-tertiary border-app-primary-30 text-app-secondary hover-border-primary hover:color-primary'
                        }`}
                      >
                        <DollarSign size={16} className="mr-2" />
                        SOL
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransferType('TOKEN')}
                        disabled={!tokenAddress}
                        className={`flex-1 flex items-center justify-center p-3 rounded-lg border transition-all duration-200 font-mono modal-btn-cyberpunk ${
                          transferType === 'TOKEN'
                            ? 'bg-primary-20 border-app-primary color-primary shadow-md shadow-app-primary-40'
                            : tokenAddress
                              ? 'bg-app-tertiary border-app-primary-30 text-app-secondary hover-border-primary hover:color-primary'
                              : 'bg-app-tertiary border-app-primary-20 text-app-secondary-40 cursor-not-allowed'
                        }`}
                      >
                        <Coins size={16} className="mr-2" />
                        TOKEN
                      </button>
                    </div>
                    {!tokenAddress && (
                      <div className="mt-2 text-xs text-app-secondary font-mono">
                        <Info size={12} className="inline mr-1" />
                        Set a token address in the main app to enable token transfers
                      </div>
                    )}
                    {tokenAddress && transferType === 'TOKEN' && (
                      <div className="mt-2 text-xs color-primary font-mono">
                        <span className="text-app-secondary">TOKEN:</span> {formatAddress(tokenAddress)}
                      </div>
                    )}
                  </div>

                  {/* Source Wallets */}
                  <div className="group mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-app-secondary group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                        <span className="color-primary">&#62;</span> Source Wallets ({sourceWallets.length} selected) <span className="color-primary">&#60;</span>
                      </label>
                    </div>

                    {/* Source Search and Filters */}
                    <div className="mb-2 flex space-x-2">
                      <div className="relative flex-grow">
                        <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary" />
                        <input
                          type="text"
                          value={sourceSearchTerm}
                          onChange={(e) => setSourceSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input-cyberpunk font-mono"
                          placeholder="SEARCH WALLETS..."
                        />
                      </div>
                      
                      <select 
                        className="bg-app-tertiary border border-app-primary-30 rounded-lg px-2 text-sm text-app-primary focus:outline-none focus-border-primary modal-input-cyberpunk font-mono"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                      >
                        <option value="address">ADDRESS</option>
                        <option value="balance">BALANCE</option>
                      </select>
                      
                      <button
                        className="p-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-secondary hover:color-primary hover-border-primary transition-all modal-btn-cyberpunk"
                        onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                      >
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>

                    <div className="h-48 overflow-y-auto border border-app-primary-20 rounded-lg shadow-inner bg-app-tertiary transition-all duration-200 group-hover:border-app-primary-40 scrollbar-thin">
                      {filterWallets(wallets, sourceSearchTerm).length > 0 ? (
                        filterWallets(wallets, sourceSearchTerm).map((wallet) => (
                          <div 
                            key={wallet.id}
                            className={`flex items-center p-2.5 hover-bg-secondary cursor-pointer transition-all duration-200 border-b border-app-primary-20 last:border-b-0
                                      ${sourceWallets.includes(wallet.privateKey) ? 'bg-primary-10 border-app-primary-30' : ''}`}
                            onClick={() => toggleSourceWallet(wallet.privateKey)}
                          >
                            <div className={`w-5 h-5 mr-3 rounded flex items-center justify-center transition-all duration-300
                                            ${sourceWallets.includes(wallet.privateKey)
                                              ? 'bg-app-primary-color shadow-md shadow-app-primary-40' 
                                              : 'border border-app-primary-30 bg-app-tertiary'}`}>
                              {sourceWallets.includes(wallet.privateKey) && (
                                <CheckCircle size={14} className="text-app-primary animate-[fadeIn_0.2s_ease]" />
                              )}
                            </div>
                            <div className="flex-1 flex flex-col">
                              <span className="font-mono text-sm text-app-primary glitch-text">{getWalletDisplayName(wallet)}</span>
                              <div className="flex items-center mt-0.5">
                                {transferType === 'SOL' ? (
                                  <>
                                    <DollarSign size={12} className="text-app-secondary mr-1" />
                                    <span className="text-xs text-app-secondary font-mono">{formatSolBalance(getWalletBalance(wallet.address) || 0)} SOL</span>
                                  </>
                                ) : (
                                  <>
                                    <Coins size={12} className="text-app-secondary mr-1" />
                                    <span className="text-xs text-app-secondary font-mono">{formatTokenBalance(getWalletTokenBalance(wallet.address) || 0)} TKN</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-app-secondary text-center font-mono">
                          {sourceSearchTerm 
                            ? `NO WALLETS FOUND WITH ${transferType} BALANCE > 0` 
                            : `NO WALLETS AVAILABLE WITH ${transferType} BALANCE > 0`}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Recipient Addresses */}
                  <div className="group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-app-secondary group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                        <span className="color-primary">&#62;</span> Recipients ({receiverAddresses.length}) <span className="color-primary">&#60;</span>
                      </label>
                    </div>

                    {/* Add new recipient */}
                    <div className="relative mb-3">
                      <input
                        type="text"
                        value={newRecipientAddress}
                        onChange={(e) => setNewRecipientAddress(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newRecipientAddress.trim()) {
                            addRecipientAddress(newRecipientAddress.trim());
                          }
                        }}
                        className="w-full px-4 py-2.5 pr-16 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary shadow-inner focus-border-primary focus:ring-1 ring-primary-50 focus:outline-none transition-all duration-200 modal-input-cyberpunk font-mono tracking-wider"
                        placeholder="ENTER RECIPIENT ADDRESS"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newRecipientAddress.trim()) {
                            addRecipientAddress(newRecipientAddress.trim());
                          }
                        }}
                        disabled={!newRecipientAddress.trim()}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-app-primary-color text-app-primary text-xs font-bold rounded hover:bg-app-primary-dark disabled:bg-primary-30 disabled:text-app-secondary disabled:cursor-not-allowed transition-all duration-200 font-mono tracking-wider"
                      >
                        ADD
                      </button>
                    </div>

                    {/* Recipients list */}
                    <div className="h-32 overflow-y-auto border border-app-primary-20 rounded-lg bg-app-tertiary scrollbar-thin">
                      {receiverAddresses.length > 0 ? (
                        receiverAddresses.map((address, index) => (
                          <div key={index} className="flex items-center justify-between p-2.5 border-b border-app-primary-20 last:border-b-0 hover-bg-secondary transition-all duration-200">
                            <div className="flex-1">
                              <span className="font-mono text-sm text-app-primary">{formatAddress(address)}</span>
                              {transferType === 'SOL' && solBalances.has(address) && (
                                <div className="flex items-center mt-0.5">
                                  <DollarSign size={12} className="text-app-secondary mr-1" />
                                  <span className="text-xs text-app-secondary font-mono">{formatSolBalance(getWalletBalance(address) || 0)} SOL</span>
                                </div>
                              )}
                              {transferType === 'TOKEN' && tokenBalances.has(address) && (
                                <div className="flex items-center mt-0.5">
                                  <Coins size={12} className="text-app-secondary mr-1" />
                                  <span className="text-xs text-app-secondary font-mono">{formatTokenBalance(getWalletTokenBalance(address) || 0)} TKN</span>
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRecipientAddress(address)}
                              className="ml-2 p-1 text-warning hover:text-error-alt hover:bg-error-alt-20 rounded transition-all duration-200"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-app-secondary text-center font-mono">
                          NO RECIPIENTS ADDED YET
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Configuration & Summary */}
            <div className="w-96 overflow-y-auto">
              <div className="p-5 space-y-4">
                {/* Distribution Mode */}
                {sourceWallets.length > 0 && receiverAddresses.length > 0 && (
                  <div className="group">
                    <label className="block text-sm font-medium text-app-secondary mb-2 group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Distribution Mode <span className="color-primary">&#60;</span>
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setDistributionMode('amount')}
                        className={`w-full p-3 rounded-lg border transition-all duration-200 font-mono text-sm ${
                          distributionMode === 'amount'
                            ? 'bg-primary-10 border-app-primary color-primary'
                            : 'bg-app-tertiary border-app-primary-30 text-app-secondary hover-border-primary hover:color-primary'
                        }`}
                      >
                        <div className="font-semibold mb-1">FIXED AMOUNT</div>
                        <div className="text-xs opacity-80">Transfer exact amount from each wallet</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDistributionMode('percentage')}
                        className={`w-full p-3 rounded-lg border transition-all duration-200 font-mono text-sm ${
                          distributionMode === 'percentage'
                            ? 'bg-primary-10 border-app-primary color-primary'
                            : 'bg-app-tertiary border-app-primary-30 text-app-secondary hover-border-primary hover:color-primary'
                        }`}
                      >
                        <div className="font-semibold mb-1">PERCENTAGE</div>
                        <div className="text-xs opacity-80">Transfer % of each wallet's balance</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Amount Input */}
                <div className="group">
                  <label className="block text-sm font-medium text-app-secondary mb-1.5 group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> 
                    {distributionMode === 'percentage' ? 'Percentage (%)' : `Amount (${transferType})`} 
                    <span className="color-primary">&#60;</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2.5 pr-16 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary shadow-inner focus-border-primary focus:ring-1 ring-primary-50 focus:outline-none transition-all duration-200 modal-input-cyberpunk font-mono tracking-wider"
                      placeholder={distributionMode === 'percentage' ? 'ENTER %' : `ENTER ${transferType}`}
                      step={distributionMode === 'percentage' ? '0.1' : (transferType === 'SOL' ? '0.0001' : '1')}
                      min="0"
                      max={distributionMode === 'percentage' ? '100' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (sourceWallets.length > 0) {
                          if (distributionMode === 'percentage') {
                            setAmount('100');
                          } else {
                            const maxBalance = Math.min(...sourceWallets.map(privateKey => {
                              const wallet = getWalletByPrivateKey(privateKey);
                              if (!wallet) return 0;
                              return transferType === 'SOL' 
                                ? getWalletBalance(wallet.address) || 0
                                : getWalletTokenBalance(wallet.address) || 0;
                            }));
                            setAmount(maxBalance.toString());
                          }
                        }
                      }}
                      disabled={sourceWallets.length === 0}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-app-primary-color text-app-primary text-xs font-bold rounded hover:bg-app-primary-dark disabled:bg-primary-30 disabled:text-app-secondary disabled:cursor-not-allowed transition-all duration-200 font-mono tracking-wider"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Transfer Summary */}
                {sourceWallets.length > 0 && receiverAddresses.length > 0 && amount && (
                  <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-4">
                    <h3 className="text-base font-semibold text-app-primary mb-3 font-mono tracking-wider">TRANSFER SUMMARY</h3>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <span className="text-app-secondary">SOURCES:</span>
                          <span className="color-primary ml-1 font-semibold">{sourceWallets.length}</span>
                        </div>
                        <div>
                          <span className="text-app-secondary">RECIPIENTS:</span>
                          <span className="color-primary ml-1 font-semibold">{receiverAddresses.length}</span>
                        </div>
                        <div>
                          <span className="text-app-secondary">AMOUNT:</span>
                          <span className="color-primary ml-1 font-semibold">
                            {distributionMode === 'percentage' ? `${amount}%` : `${amount} ${transferType}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-app-secondary">TOTAL TXN:</span>
                          <span className="color-primary ml-1 font-semibold">{sourceWallets.length * receiverAddresses.length}</span>
                        </div>
                      </div>

                      <div className="text-xs font-mono text-app-secondary">
                        {distributionMode === 'percentage' ? (
                          `${amount}% of each wallet's balance to each of ${receiverAddresses.length} recipient(s)`
                        ) : (
                          `${amount} ${transferType} from each wallet to each of ${receiverAddresses.length} recipient(s)`
                        )}
                      </div>

                      {transferType === 'TOKEN' && selectedToken && (
                        <div className="p-2 bg-app-primary rounded border border-app-primary-20">
                          <p className="text-xs text-app-secondary font-mono mb-1">TOKEN:</p>
                          <p className="text-xs text-app-primary font-mono break-all">{selectedToken}</p>
                        </div>
                      )}
                    </div>

                    {/* Confirmation Checkbox */}
                    <div 
                      className="flex items-center px-3 py-3 bg-app-primary rounded-lg border border-app-primary-40 mt-4 cursor-pointer"
                      onClick={() => setIsConfirmed(!isConfirmed)}
                    >
                      <div className="relative mx-1">
                        <div 
                          className={`w-5 h-5 border border-app-primary-40 rounded transition-all ${isConfirmed ? 'bg-app-primary-color border-0' : ''}`}
                        ></div>
                        <CheckCircle size={14} className={`absolute top-0.5 left-0.5 text-app-primary transition-all ${isConfirmed ? 'opacity-100' : 'opacity-0'}`} />
                      </div>
                      <span className="text-app-primary text-sm ml-2 select-none font-mono">
                        CONFIRM BATCH TRANSFER
                      </span>
                    </div>

                    {/* Execute Button */}
                    <button
                      onClick={handleBatchTransfer}
                      disabled={!isConfirmed || isSubmitting || batchProcessing}
                      className={`w-full mt-4 px-5 py-3 rounded-lg shadow-lg flex items-center justify-center transition-all duration-300 font-mono tracking-wider
                                ${!isConfirmed || isSubmitting || batchProcessing
                                  ? 'bg-primary-50 text-app-secondary-80 cursor-not-allowed opacity-50' 
                                  : 'bg-app-primary-color text-app-primary hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-cyberpunk'}`}
                    >
                      {isSubmitting || batchProcessing ? (
                        <>
                          <div className="h-4 w-4 rounded-full border-2 border-app-secondary-80 border-t-transparent animate-spin mr-2"></div>
                          {batchProcessing ? 'PROCESSING...' : 'INITIALIZING...'}
                        </>
                      ) : (
                        `EXECUTE BATCH (${sourceWallets.length * receiverAddresses.length} TXN)`
                      )}
                    </button>
                  </div>
                )}

                {/* Processing Progress */}
                {batchProcessing && transferQueue.length > 0 && (
                  <div className="bg-app-quaternary border border-app-primary-40 rounded-lg p-4">
                    <p className="text-sm color-primary font-medium mb-3 font-mono">PROCESSING PROGRESS</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-app-secondary">CURRENT:</span>
                        <span className="color-primary">{currentTransferIndex + 1} / {transferQueue.length}</span>
                      </div>
                      <div className="w-full bg-app-tertiary rounded-full h-2">
                        <div 
                          className="bg-app-primary-color h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((currentTransferIndex + 1) / transferQueue.length) * 100}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono mt-2">
                        <div className="text-center">
                          <span className="text-app-secondary">DONE:</span>
                          <span className="color-primary ml-1">{transferQueue.filter(t => t.status === 'completed').length}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-app-secondary">ACTIVE:</span>
                          <span className="text-warning ml-1">{transferQueue.filter(t => t.status === 'processing').length}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-app-secondary">FAILED:</span>
                          <span className="text-warning ml-1">{transferQueue.filter(t => t.status === 'failed').length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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