import React, { useState, useEffect } from 'react';
import { BarChart2, CheckCircle, ChevronLeft, ChevronRight, Info, Search, X } from 'lucide-react';
import { getWallets, getWalletDisplayName } from '../Utils';
import PnlCard from '../PnlCard';
import { useToast } from "../Notifications";
import { loadConfigFromCookies } from '../Utils';
import { createPortal } from 'react-dom';

const STEPS_PNL = ['Select Wallets', 'View Results', 'Share Card'];

interface BasePnlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PnlModalProps extends BasePnlModalProps {
  handleRefresh: () => void;
  tokenAddress: string;
  iframeData?: {
    tradingStats: any;
    solPrice: number | null;
    currentWallets: any[];
    recentTrades: {
      type: 'buy' | 'sell';
      address: string;
      tokensAmount: number;
      avgPrice: number;
      solAmount: number;
      timestamp: number;
      signature: string;
    }[];
    tokenPrice: {
      tokenPrice: number;
      tokenMint: string;
      timestamp: number;
      tradeType: 'buy' | 'sell';
      volume: number;
    } | null;
  } | null;
  tokenBalances: Map<string, number>;
}

interface PnlData {
  profit: number;
  timestamp: string;
}

export const PnlModal: React.FC<PnlModalProps> = ({
  isOpen,
  onClose,
  handleRefresh,
  tokenAddress,
  iframeData,
  tokenBalances
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [pnlData, setPnlData] = useState<Record<string, PnlData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showInfoTip, setShowInfoTip] = useState(false);

  const wallets = getWallets();
  const { showToast } = useToast();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      handleRefresh();
      resetForm();
    }
  }, [isOpen]);

  // Reset form state
  const resetForm = () => {
    setCurrentStep(0);
    // Automatically select all wallets
    const allWalletKeys = wallets.map(wallet => wallet.privateKey);
    setSelectedWallets(allWalletKeys);
    setPnlData({});
    setSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
  };

  const handleNext = () => {
    if (currentStep === 0 && selectedWallets.length === 0) {
      showToast("Please select at least one wallet", "error");
      return;
    }
    
    if (currentStep === 0) {
      fetchPnlData();
    }
    
    setCurrentStep(prev => Math.min(prev + 1, STEPS_PNL.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const fetchPnlData = async () => {
    if (selectedWallets.length === 0 || !iframeData || !iframeData.tradingStats) return;
    
    setIsLoading(true);
    try {
      // Get wallet addresses from private keys
      const selectedAddresses = selectedWallets.map(privateKey => 
        wallets.find(wallet => wallet.privateKey === privateKey)?.address || ''
      ).filter(address => address !== '');
      
      // Calculate PNL data directly from iframeData
      const calculatedPnlData: Record<string, PnlData> = {};
      
      // Use trading stats for overall PNL calculation
      const { tradingStats, recentTrades } = iframeData;
      const currentTimestamp = new Date().toISOString();
      
      // For each selected wallet, calculate its contribution to the overall PNL
      selectedAddresses.forEach(address => {
        // Filter trades for this wallet
        const walletTrades = recentTrades.filter(trade => trade.address === address);
        
        // Calculate wallet's contribution to PNL
        let walletProfit = 0;
        
        // If we have specific wallet trades, calculate from those
        if (walletTrades.length > 0) {
          const buyTrades = walletTrades.filter(trade => trade.type === 'buy');
          const sellTrades = walletTrades.filter(trade => trade.type === 'sell');
          
          const totalBought = buyTrades.reduce((sum, trade) => sum + trade.solAmount, 0);
          const totalSold = sellTrades.reduce((sum, trade) => sum + trade.solAmount, 0);
          
          walletProfit = totalSold - totalBought;
        } else {
          // If no specific trades, estimate based on overall stats and token balance
          const walletTokenBalance = tokenBalances.get(address) || 0;
          const totalTokens = Array.from(tokenBalances.values()).reduce((sum, balance) => sum + balance, 0);
          
          if (totalTokens > 0) {
            // Estimate wallet's contribution to PNL based on its proportion of tokens
            const proportion = walletTokenBalance / totalTokens;
            walletProfit = tradingStats.net * proportion;
          }
        }
        
        calculatedPnlData[address] = {
          profit: walletProfit,
          timestamp: currentTimestamp
        };
      });
      
      setPnlData(calculatedPnlData);
    } catch (error) {
      console.error('Error calculating PNL data:', error);
      showToast("Failed to calculate PNL data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Toggle wallet selection
  const toggleWalletSelection = (privateKey: string) => {
    setSelectedWallets(prev => {
      if (prev.includes(privateKey)) {
        return prev.filter(key => key !== privateKey);
      } else {
        return [...prev, privateKey];
      }
    });
  };

  // Format the timestamp to a readable format
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format profit as a readable string with color class
  const formatProfit = (profit: number) => {
    return {
      text: profit > 0 ? `+${profit.toFixed(4)}` : profit.toFixed(4),
      class: profit > 0 ? 'color-primary' : profit < 0 ? 'text-red-400' : 'text-app-secondary'
    };
  };

  // Filter wallets based on search and sort options
  const filterWallets = (walletList: any[], search: string) => {
    let filtered = walletList;
    
    // Apply search filter
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Sort wallets
    return filtered.sort((a, b) => {
      if (sortOption === 'address') {
        return sortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      }
      return 0;
    });
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // Get address from private key
  const getAddressFromPrivateKey = (privateKey: string) => {
    return wallets.find(wallet => wallet.privateKey === privateKey)?.address || '';
  };

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

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .grid-cols-responsive {
        grid-template-columns: 1fr;
      }
      
      .flex-responsive {
        flex-direction: column;
      }
      
      .w-responsive {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(modalStyleElement);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm modal-cyberpunk-container bg-app-primary-85">
      <div className="relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-2xl mx-4 overflow-hidden transform modal-cyberpunk-content modal-glow">
        {/* Ambient grid background */}
        <div className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid">
        </div>

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
              <BarChart2 size={16} className="color-primary" />
            </div>
            <h2 className="text-lg font-semibold text-app-primary font-mono">
              <span className="color-primary">/</span> TOKEN PNL CALCULATOR <span className="color-primary">/</span>
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-app-secondary hover-color-primary-light transition-colors p-1 hover:bg-primary-20 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="relative w-full h-1 bg-app-tertiary progress-bar-cyberpunk">
          <div 
            className="h-full bg-app-primary-color transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS_PNL.length) * 100}%` }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-5 space-y-5 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#02b36d40] scrollbar-track-app-tertiary">
          <form onSubmit={(e) => e.preventDefault()}>
            {/* Step 1: Select Wallets */}
            {currentStep === 0 && (
              <div className="animate-[fadeIn_0.3s_ease]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 color-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M16 10h2M6 14h12" />
                    </svg>
                    <h3 className="text-lg font-medium text-app-primary font-mono">
                      <span className="color-primary">&#62;</span> SELECT WALLETS <span className="color-primary">&#60;</span>
                    </h3>
                  </div>
                </div>

                {/* Token Information */}
                <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-app-secondary font-mono">TOKEN ADDRESS:</span>
                    <div className="flex items-center bg-app-secondary px-2 py-1 rounded border border-app-primary-20">
                      <span className="text-sm font-mono text-app-primary glitch-text">
                        {`${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="mb-2 flex space-x-2">
                  <div className="relative flex-grow">
                    <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
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
                  </select>
                  
                  <button
                    type="button"
                    className="p-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-secondary hover-color-primary-light hover-border-primary transition-all modal-btn-cyberpunk"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
                
                {/* Select All Button */}
                <div className="mb-3">
                  <button
                    type="button"
                    className="w-full py-2 bg-app-tertiary border border-app-primary-40 rounded-lg text-app-secondary hover-color-primary-light hover-border-primary hover:bg-primary-10 transition-all modal-btn-cyberpunk font-mono text-sm"
                    onClick={() => {
                      // Get all wallet private keys
                      const allWalletKeys = wallets.map(wallet => wallet.privateKey);
                      // If all wallets are already selected, deselect all. Otherwise, select all.
                      if (selectedWallets.length === allWalletKeys.length) {
                        setSelectedWallets([]);
                      } else {
                        setSelectedWallets(allWalletKeys);
                      }
                    }}
                  >
                    {selectedWallets.length === wallets.length ? 'DESELECT ALL WALLETS' : 'SELECT ALL WALLETS'}
                  </button>
                </div>

                {/* Wallet Selection */}
                <div className="bg-app-tertiary rounded-lg overflow-hidden border border-app-primary-20 shadow-inner transition-all duration-200 hover-border-primary-40">
                  <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-[#02b36d40] scrollbar-track-app-tertiary">
                    {filterWallets(wallets, searchTerm).length > 0 ? (
                      filterWallets(wallets, searchTerm).map((wallet) => (
                        <div 
                          key={wallet.id}
                          className={`flex items-center p-2.5 hover:bg-app-secondary cursor-pointer transition-all duration-200 border-b border-app-primary-20 last:border-b-0
                                    ${selectedWallets.includes(wallet.privateKey) ? 'bg-primary-10 border-app-primary-30' : ''}`}
                          onClick={() => toggleWalletSelection(wallet.privateKey)}
                        >
                          <div className={`w-5 h-5 mr-3 rounded flex items-center justify-center transition-all duration-300
                                          ${selectedWallets.includes(wallet.privateKey)
                                            ? 'bg-app-primary-color shadow-md shadow-app-primary-40' 
                                            : 'border border-app-primary-30 bg-app-tertiary'}`}>
                            {selectedWallets.includes(wallet.privateKey) && (
                              <CheckCircle size={14} className="text-app-primary animate-[fadeIn_0.2s_ease]" />
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="font-mono text-sm text-app-primary glitch-text">{getWalletDisplayName(wallet)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-app-secondary text-center font-mono">
                        {searchTerm ? "NO WALLETS FOUND" : "NO WALLETS AVAILABLE"}
                      </div>
                    )}
                  </div>
                </div>

                {selectedWallets.length > 0 && (
                  <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30 mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-app-secondary font-mono">SELECTED WALLETS: {selectedWallets.length}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedWallets([])}
                        className="text-xs px-2 py-0.5 bg-app-secondary rounded text-app-primary hover:bg-primary-20 hover-color-primary-light transition-all font-mono modal-btn-cyberpunk"
                      >
                        CLEAR ALL
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedWallets.slice(0, 5).map((privateKey) => {
                        const address = getAddressFromPrivateKey(privateKey);
                        return (
                          <div key={privateKey} className="bg-app-secondary rounded px-2 py-1 text-xs font-mono text-app-primary flex items-center border border-app-primary-20">
                            {formatAddress(address)}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWalletSelection(privateKey);
                              }}
                              className="ml-1 text-app-secondary hover-color-primary-light"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                      {selectedWallets.length > 5 && (
                        <div className="bg-app-secondary rounded px-2 py-1 text-xs text-app-primary font-mono border border-app-primary-20">
                          +{selectedWallets.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: View Results */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-[fadeIn_0.3s_ease]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 color-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                    <h3 className="text-lg font-medium text-app-primary font-mono">
                      <span className="color-primary">&#62;</span> PNL RESULTS <span className="color-primary">&#60;</span>
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center px-3 py-1.5 bg-app-tertiary hover:bg-app-secondary text-app-primary rounded-lg transition-all border border-app-primary-30 hover-border-primary font-mono text-sm modal-btn-cyberpunk"
                  >
                    <svg className="w-4 h-4 mr-1.5 color-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
                    </svg>
                    CREATE SHARE CARD
                  </button>
                </div>

                {/* Token Information */}
                <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30 mb-4">
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-app-secondary font-mono">TOKEN ADDRESS:</span>
                    <span className="text-sm font-mono text-app-primary glitch-text">
                      {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-app-secondary font-mono">WALLETS ANALYZED:</span>
                    <span className="text-sm text-app-primary font-mono">{selectedWallets.length}</span>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-12 w-12 border-4 border-app-primary-30 border-t-app-primary-color rounded-full animate-spin mb-4"></div>
                    <p className="text-app-primary font-mono">CALCULATING PNL ACROSS WALLETS...</p>
                  </div>
                ) : (
                  <>
                    {/* Results Table */}
                    <div className="bg-app-tertiary rounded-lg overflow-hidden border border-app-primary-30">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-app-secondary">
                              <th className="px-4 py-3 text-left text-xs font-medium text-app-secondary uppercase tracking-wider border-b border-app-primary-30 font-mono">
                                Wallet
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-app-secondary uppercase tracking-wider border-b border-app-primary-30 font-mono">
                                PNL
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-app-secondary uppercase tracking-wider border-b border-app-primary-30 font-mono">
                                Balance
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-app-secondary uppercase tracking-wider border-b border-app-primary-30 font-mono">
                                Last Update
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedWallets.map(privateKey => {
                              const address = getAddressFromPrivateKey(privateKey);
                              const data = pnlData[address];
                              const profit = data ? formatProfit(data.profit) : { text: '0.0000', class: 'text-app-secondary' };
                              return (
                                <tr key={privateKey} className="border-b border-app-primary-20 last:border-b-0 hover:bg-app-secondary">
                                  <td className="px-4 py-3 text-sm font-mono text-app-primary whitespace-nowrap glitch-text">
                                    {formatAddress(address)}
                                  </td>
                                  <td className={`px-4 py-3 text-sm text-right font-semibold whitespace-nowrap font-mono ${profit.class}`}>
                                    {data ? profit.text : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right text-app-primary whitespace-nowrap font-mono">
                                    -
                                  </td>
                                  <td className="px-4 py-3 text-xs text-right text-app-secondary whitespace-nowrap font-mono">
                                    {data ? formatTimestamp(data.timestamp) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4 mt-4 grid-cols-responsive">
                      <div className="bg-app-tertiary rounded-lg border border-app-primary-30 p-4">
                        <h4 className="text-base font-semibold text-app-primary mb-3 font-mono">
                          <span className="color-primary">&lt;</span> PNL SUMMARY <span className="color-primary">&gt;</span>
                        </h4>
                        
                        {/* Calculate total profit, best and worst performers */}
                        {(() => {
                          let totalProfit = 0;
                          let bestAddress = '';
                          let bestProfit = -Infinity;
                          let worstAddress = '';
                          let worstProfit = Infinity;
                          
                          selectedWallets.forEach(privateKey => {
                            const address = getAddressFromPrivateKey(privateKey);
                            const data = pnlData[address];
                            if (data) {
                              totalProfit += data.profit;
                              
                              if (data.profit > bestProfit) {
                                bestProfit = data.profit;
                                bestAddress = address;
                              }
                              
                              if (data.profit < worstProfit) {
                                worstProfit = data.profit;
                                worstAddress = address;
                              }
                            }
                          });
                          
                          const hasData = Object.keys(pnlData).length > 0;
                          
                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-app-secondary font-mono">TOTAL PNL:</span>
                                <span className={`text-sm font-semibold font-mono ${totalProfit > 0 ? 'color-primary' : totalProfit < 0 ? 'text-red-400' : 'text-app-secondary'}`}>
                                  {hasData ? (totalProfit > 0 ? '+' : '') + totalProfit.toFixed(4) : '-'}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-app-secondary font-mono">BEST PERFORMER:</span>
                                <div className="flex items-center">
                                  {hasData && bestProfit !== -Infinity ? (
                                    <>
                                      <span className="text-sm font-mono text-app-primary mr-2 glitch-text">
                                        {formatAddress(bestAddress)}
                                      </span>
                                      <span className="text-sm font-semibold color-primary font-mono">
                                        {bestProfit > 0 ? '+' : ''}{bestProfit.toFixed(4)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-sm text-app-secondary font-mono">-</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-app-secondary font-mono">WORST PERFORMER:</span>
                                <div className="flex items-center">
                                  {hasData && worstProfit !== Infinity ? (
                                    <>
                                      <span className="text-sm font-mono text-app-primary mr-2 glitch-text">
                                        {formatAddress(worstAddress)}
                                      </span>
                                      <span className={`text-sm font-semibold font-mono ${worstProfit < 0 ? 'text-red-400' : 'color-primary'}`}>
                                        {worstProfit > 0 ? '+' : ''}{worstProfit.toFixed(4)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-sm text-app-secondary font-mono">-</span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-app-secondary font-mono">PROFITABLE WALLETS:</span>
                                <span className="text-sm color-primary font-mono">
                                  {hasData ? Object.values(pnlData).filter(data => data.profit > 0).length : '-'}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-app-secondary font-mono">UNPROFITABLE WALLETS:</span>
                                <span className="text-sm text-red-400 font-mono">
                                  {hasData ? Object.values(pnlData).filter(data => data.profit < 0).length : '-'}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div className="bg-app-tertiary rounded-lg border border-app-primary-30 p-4">
                        <h4 className="text-base font-semibold text-app-primary mb-3 font-mono">
                          <span className="color-primary">&lt;</span> DATA INFO <span className="color-primary">&gt;</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-app-secondary font-mono">DATA UPDATED:</span>
                            <span className="text-sm text-app-primary font-mono">
                              {Object.values(pnlData).length > 0 
                                ? new Date(Math.max(...Object.values(pnlData).map(d => new Date(d.timestamp).getTime()))).toLocaleString() 
                                : '-'}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-app-secondary font-mono">WALLETS WITH DATA:</span>
                            <span className="text-sm text-app-primary font-mono">{Object.keys(pnlData).length} / {selectedWallets.length}</span>
                          </div>
                          
                          <div className="text-xs text-app-secondary mt-2 leading-relaxed font-mono">
                            PNL data shows the calculated profit or loss for each wallet based on buys and sells.
                          </div>
                          
                          {Object.keys(pnlData).length < selectedWallets.length && (
                            <div className="flex items-center mt-2 p-2 bg-app-tertiary border border-app-primary-30 rounded text-xs text-app-primary font-mono">
                              <Info size={14} className="mr-1 flex-shrink-0 color-primary" />
                              <span>
                                Some selected wallets don't have PNL data available. This may be because they have no history with this token.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Share Card */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-[fadeIn_0.3s_ease]">
                <div className="flex items-center space-x-2 mb-3">
                  <svg className="w-5 h-5 color-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <h3 className="text-lg font-medium text-app-primary font-mono">
                    <span className="color-primary">&#62;</span> PNL SHARE CARD <span className="color-primary">&#60;</span>
                  </h3>
                </div>
                
                {/* PNL Card */}
                <div className="bg-app-tertiary rounded-lg border border-app-primary-30 p-4">
                  <PnlCard 
                    pnlData={pnlData} 
                    tokenAddress={tokenAddress} 
                    backgroundImageUrl="https://i.ibb.co/tpzsPFdS/imgPnl.jpg"
                  />
                </div>
                
                <div className="mt-2 p-3 bg-app-tertiary rounded-lg border border-app-primary-20">
                  <p className="text-xs text-app-secondary font-mono">
                    Download this card to share your PNL results with others. All sensitive wallet information is hidden.
                  </p>
                </div>
              </div>
            )}
  
            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={currentStep === 0 ? onClose : handleBack}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-app-primary bg-app-tertiary border border-app-primary-30 hover:bg-app-secondary hover-border-primary rounded-lg transition-all shadow-md font-mono tracking-wider modal-btn-cyberpunk"
              >
                {currentStep === 0 ? 'CANCEL' : (
                  <div className="flex items-center">
                    <ChevronLeft size={16} className="mr-1" />
                    BACK
                  </div>
                )}
              </button>

              {currentStep === 0 && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting || selectedWallets.length === 0}
                  className={`px-5 py-2.5 rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider
                            ${isSubmitting || selectedWallets.length === 0
                              ? 'bg-primary-50 text-app-primary cursor-not-allowed opacity-50' 
                              : 'bg-app-primary-color text-app-primary hover:bg-primary-60 transform hover:-translate-y-0.5 modal-btn-cyberpunk'}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-app-primary border-t-transparent animate-spin mr-2"></div>
                      PROCESSING...
                    </>
                  ) : (
                    <div className="flex items-center">
                      CALCULATE PNL
                      <ChevronRight size={16} className="ml-1" />
                    </div>
                  )}
                </button>
              )}
              
              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 bg-app-primary-color text-app-primary hover:bg-primary-60 rounded-lg transition-all font-mono tracking-wider modal-btn-cyberpunk transform hover:-translate-y-0.5 shadow-lg"
                >
                  <div className="flex items-center">
                    CREATE SHARE CARD
                    <ChevronRight size={16} className="ml-1" />
                  </div>
                </button>
              )}
              
              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-app-primary-color text-app-primary hover:bg-primary-60 rounded-lg transition-all font-mono tracking-wider modal-btn-cyberpunk transform hover:-translate-y-0.5 shadow-lg"
                >
                  CLOSE
                </button>
              )}
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