import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, Coins, CheckSquare, Square, ArrowDownAZ, ArrowUpAZ, 
  Wallet, Share2, Network, Send, HandCoins, DollarSign, 
  Menu, X, ChevronRight,
  Share, Zap
} from 'lucide-react';
import { Connection } from '@solana/web3.js';
import { WalletType, saveWalletsToCookies } from './Utils';
import { DistributeModal } from './modals/DistributeModal';
import { ConsolidateModal } from './modals/ConsolidateModal';
import { TransferModal } from './modals/TransferModal';
import { DepositModal } from './modals/DepositModal';
import { MixerModal } from './modals/MixerModal';

interface WalletOperationsButtonsProps {
  wallets: WalletType[];
  solBalances: Map<string, number>;
  setSolBalances?: (balances: Map<string, number>) => void;
  connection: Connection;
  tokenBalances: Map<string, number>;
  tokenAddress: string;
  
  handleRefresh: () => void;
  isRefreshing: boolean;
  showingTokenWallets: boolean;
  handleBalanceToggle: () => void;
  setWallets: (wallets: WalletType[]) => void;
  sortDirection: string;
  handleSortWallets: () => void;
  setIsModalOpen: (open: boolean) => void;
  quickBuyAmount?: number;
  setQuickBuyAmount?: (amount: number) => void;
  quickBuyEnabled?: boolean;
  setQuickBuyEnabled?: (enabled: boolean) => void;
  quickBuyMinAmount?: number;
  setQuickBuyMinAmount?: (amount: number) => void;
  quickBuyMaxAmount?: number;
  setQuickBuyMaxAmount?: (amount: number) => void;
  useQuickBuyRange?: boolean;
  setUseQuickBuyRange?: (useRange: boolean) => void;
  quickSellPercentage?: number;
  setQuickSellPercentage?: (percentage: number) => void;
  quickSellMinPercentage?: number;
  setQuickSellMinPercentage?: (percentage: number) => void;
  quickSellMaxPercentage?: number;
  setQuickSellMaxPercentage?: (percentage: number) => void;
  useQuickSellRange?: boolean;
  setUseQuickSellRange?: (useRange: boolean) => void;
}

type OperationTab = 'distribute' | 'consolidate' | 'transfer' | 'deposit' | 'mixer' | 'fund';

export const WalletOperationsButtons: React.FC<WalletOperationsButtonsProps> = ({
  wallets,
  solBalances,
  setSolBalances,
  connection,
  tokenBalances,
  tokenAddress,
  handleRefresh,
  isRefreshing,
  showingTokenWallets,
  handleBalanceToggle,
  setWallets,
  sortDirection,
  handleSortWallets,
  setIsModalOpen,
  quickBuyAmount = 0.01,
  setQuickBuyAmount,
  quickBuyEnabled = true,
  setQuickBuyEnabled,
  quickBuyMinAmount = 0.01,
  setQuickBuyMinAmount,
  quickBuyMaxAmount = 0.05,
  setQuickBuyMaxAmount,
  useQuickBuyRange = false,
  setUseQuickBuyRange,
  quickSellPercentage = 100,
  setQuickSellPercentage,
  quickSellMinPercentage = 25,
  setQuickSellMinPercentage,
  quickSellMaxPercentage = 100,
  setQuickSellMaxPercentage,
  useQuickSellRange = false,
  setUseQuickSellRange
}) => {
  // State for active modal
  const [activeModal, setActiveModal] = useState<OperationTab | null>(null);
  
  // State for fund wallets modal
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  
  // State for operations drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // State for quick buy settings modal
  const [isQuickBuySettingsOpen, setIsQuickBuySettingsOpen] = useState(false);
  const [tempQuickBuyAmount, setTempQuickBuyAmount] = useState(quickBuyAmount);
  const [tempQuickBuyEnabled, setTempQuickBuyEnabled] = useState(quickBuyEnabled);
  const [tempQuickBuyMinAmount, setTempQuickBuyMinAmount] = useState(quickBuyMinAmount);
  const [tempQuickBuyMaxAmount, setTempQuickBuyMaxAmount] = useState(quickBuyMaxAmount);
  const [tempUseQuickBuyRange, setTempUseQuickBuyRange] = useState(useQuickBuyRange);
  const [tempQuickSellPercentage, setTempQuickSellPercentage] = useState(quickSellPercentage);
  const [tempQuickSellMinPercentage, setTempQuickSellMinPercentage] = useState(quickSellMinPercentage);
  const [tempQuickSellMaxPercentage, setTempQuickSellMaxPercentage] = useState(quickSellMaxPercentage);
  const [tempUseQuickSellRange, setTempUseQuickSellRange] = useState(useQuickSellRange);
  
  // Function to toggle drawer
  const toggleDrawer = () => {
    setIsDrawerOpen(prev => !prev);
  };
  
  // Function to open a specific modal
  const openModal = (modal: OperationTab) => {
    setActiveModal(modal);
    setIsDrawerOpen(false); // Close drawer when opening modal
  };
  
  // Function to close the active modal
  const closeModal = () => {
    setActiveModal(null);
  };
  
  // Function to open fund wallets modal
  const openFundModal = () => {
    setIsFundModalOpen(true);
    setIsDrawerOpen(false);
  };
  
  // Function to close fund wallets modal
  const closeFundModal = () => {
    setIsFundModalOpen(false);
  };
  
  // Function to open distribute from fund modal
  const openDistributeFromFund = () => {
    setIsFundModalOpen(false);
    setActiveModal('distribute');
  };
  
  // Function to open mixer from fund modal
  const openMixerFromFund = () => {
    setIsFundModalOpen(false);
    setActiveModal('mixer');
  };
  
  // Function to open quick buy settings
  const openQuickBuySettings = () => {
    setTempQuickBuyAmount(quickBuyAmount);
    setTempQuickBuyEnabled(quickBuyEnabled);
    setTempQuickBuyMinAmount(quickBuyMinAmount);
    setTempQuickBuyMaxAmount(quickBuyMaxAmount);
    setTempUseQuickBuyRange(useQuickBuyRange);
    setTempQuickSellPercentage(quickSellPercentage);
    setTempQuickSellMinPercentage(quickSellMinPercentage);
    setTempQuickSellMaxPercentage(quickSellMaxPercentage);
    setTempUseQuickSellRange(useQuickSellRange);
    setIsQuickBuySettingsOpen(true);
    setIsDrawerOpen(false);
  };
  
  // Function to save quick buy settings
  const saveQuickBuySettings = () => {
    if (setQuickBuyAmount && tempQuickBuyAmount > 0) {
      setQuickBuyAmount(tempQuickBuyAmount);
    }
    if (setQuickBuyEnabled) {
      setQuickBuyEnabled(tempQuickBuyEnabled);
    }
    if (setQuickBuyMinAmount && tempQuickBuyMinAmount > 0) {
      setQuickBuyMinAmount(tempQuickBuyMinAmount);
    }
    if (setQuickBuyMaxAmount && tempQuickBuyMaxAmount > 0) {
      setQuickBuyMaxAmount(tempQuickBuyMaxAmount);
    }
    if (setUseQuickBuyRange !== undefined) {
      setUseQuickBuyRange(tempUseQuickBuyRange);
    }
    if (setQuickSellPercentage && tempQuickSellPercentage >= 1 && tempQuickSellPercentage <= 100) {
      setQuickSellPercentage(tempQuickSellPercentage);
    }
    if (setQuickSellMinPercentage && tempQuickSellMinPercentage >= 1 && tempQuickSellMinPercentage <= 100) {
      setQuickSellMinPercentage(tempQuickSellMinPercentage);
    }
    if (setQuickSellMaxPercentage && tempQuickSellMaxPercentage >= 1 && tempQuickSellMaxPercentage <= 100) {
      setQuickSellMaxPercentage(tempQuickSellMaxPercentage);
    }
    if (setUseQuickSellRange !== undefined) {
      setUseQuickSellRange(tempUseQuickSellRange);
    }
    setIsQuickBuySettingsOpen(false);
  };

  // Check if all wallets are active
  const allWalletsActive = wallets.every(wallet => wallet.isActive);

  // Function to toggle all wallets
  const toggleAllWalletsHandler = () => {
    const allActive = wallets.every(wallet => wallet.isActive);
    const newWallets = wallets.map(wallet => ({
      ...wallet,
      isActive: !allActive
    }));
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
  };

  // Function to open wallets modal
  const openWalletsModal = () => {
    setIsModalOpen(true);
  };

  // Primary action buttons
  const primaryActions = [
    {
      icon: <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />,
      onClick: handleRefresh,
      disabled: isRefreshing
    },
    {
      icon: showingTokenWallets ? <Coins size={14} /> : <DollarSign size={14} />,
      onClick: handleBalanceToggle
    },
    {
      icon: allWalletsActive ? <Square size={14} /> : <CheckSquare size={14} />,
      onClick: toggleAllWalletsHandler
    },
    {
      icon: sortDirection === 'asc' ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />,
      onClick: handleSortWallets
    }
  ];

  // Operations in drawer
  const operations = [
    {
      icon: <Wallet size={16} />,
      label: "Manage Wallets",
      onClick: () => {
        setIsModalOpen(true);
        setIsDrawerOpen(false);
      }
    },
    {
      icon: <HandCoins size={16} />,
      label: "Fund Wallets",
      onClick: openFundModal
    },
    {
      icon: <Share size={16} />,
      label: "Consolidate SOL",
      onClick: () => openModal('consolidate')
    },
    {
      icon: <Network size={16} />,
      label: "Transfer Assets",
      onClick: () => openModal('transfer')
    },
    {
      icon: <Send size={16} />,
      label: "Deposit SOL",
      onClick: () => openModal('deposit')
    }
  ];

  // Animation variants
  const drawerVariants = {
    hidden: { 
      y: 20, 
      opacity: 0,
      height: 0,
      marginBottom: 0
    },
    visible: {
      y: 0,
      opacity: 1,
      height: 'auto',
      marginBottom: 12,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30
      }
    }
  };
  
  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  return (
    <>
      {/* Modals */}
      <DistributeModal
        isOpen={activeModal === 'distribute'}
        onClose={closeModal}
        wallets={wallets}
        solBalances={solBalances}
        connection={connection}
      />
     
     <MixerModal
        isOpen={activeModal === 'mixer'}
        onClose={closeModal}
        wallets={wallets}
        solBalances={solBalances}
        connection={connection}
      />
      <ConsolidateModal
        isOpen={activeModal === 'consolidate'}
        onClose={closeModal}
        wallets={wallets}
        solBalances={solBalances}
        connection={connection}
      />
     
      <TransferModal
        isOpen={activeModal === 'transfer'}
        onClose={closeModal}
        wallets={wallets}
        solBalances={solBalances}
        tokenBalances={tokenBalances}
        tokenAddress={tokenAddress}
        connection={connection}
      />
     
      <DepositModal
        isOpen={activeModal === 'deposit'}
        onClose={closeModal}
        wallets={wallets}
        solBalances={solBalances}
        setSolBalances={setSolBalances}
        connection={connection}
      />
      
      {/* Fund Wallets Modal */}
      {isFundModalOpen && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-app-overlay flex items-center justify-center z-50"
            onClick={closeFundModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-app-primary border border-app-primary-30 rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-mono color-primary tracking-wider">Fund Wallets</h2>
                <button
                  onClick={closeFundModal}
                  className="color-primary hover-color-primary-light transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-3">
                <motion.button
                  variants={buttonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={openDistributeFromFund}
                  className="w-full flex items-center gap-3 p-4 rounded-md
                           bg-app-quaternary border border-app-primary-30 hover-border-primary-60
                           color-primary hover-color-primary-light transition-all duration-300
                           hover:shadow-md hover:shadow-app-primary-15"
                >
                  <Share2 size={20} />
                  <div className="text-left">
                    <div className="font-mono text-sm tracking-wider">Distribute SOL</div>
                    <div className="text-xs text-app-secondary-80 mt-1">Send SOL from main wallet to multiple wallets</div>
                  </div>
                </motion.button>
                
                <motion.button
                  variants={buttonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={openMixerFromFund}
                  className="w-full flex items-center gap-3 p-4 rounded-md
                           bg-app-quaternary border border-app-primary-30 hover-border-primary-60
                           color-primary hover-color-primary-light transition-all duration-300
                           hover:shadow-md hover:shadow-app-primary-15"
                >
                  <Share size={20} />
                  <div className="text-left">
                    <div className="font-mono text-sm tracking-wider">Mixer SOL</div>
                    <div className="text-xs text-app-secondary-80 mt-1">Mix SOL between wallets for privacy</div>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
      
      {/* Quick Buy Settings Modal */}
      {isQuickBuySettingsOpen && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-app-overlay flex items-center justify-center z-50 p-4"
            onClick={() => setIsQuickBuySettingsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-app-primary border border-app-primary-30 rounded-xl p-6 
                         w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              
              <div className="space-y-6">                
                {/* Buy Amount Configuration */}
                <motion.div 
                  className={`transition-all duration-300 ${tempQuickBuyEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
                  animate={{ opacity: tempQuickBuyEnabled ? 1 : 0.4 }}
                >
                  <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                    <h3 className="font-mono color-primary font-medium mb-4 flex items-center gap-2">
                      <DollarSign size={16} />
                      Buy Amount Configuration
                    </h3>
                    
                    {/* Amount Type Toggle */}
                    <div className="flex items-center gap-3 mb-4 p-3 bg-app-primary border border-app-primary-30 rounded-lg">
                      <div className="flex-1">
                        <div className="font-mono color-primary text-sm mb-1">Amount Type</div>
                        <p className="text-xs text-app-secondary-80">
                          {tempUseQuickBuyRange ? 'Random amounts for natural variation' : 'Fixed amount for consistency'}
                        </p>
                      </div>
                      
                      <div className="flex bg-app-secondary rounded-lg p-1 border border-app-primary-30">
                        <button
                          onClick={() => setTempUseQuickBuyRange(false)}
                          disabled={!tempQuickBuyEnabled}
                          className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                            !tempUseQuickBuyRange && tempQuickBuyEnabled
                              ? 'bg-app-primary-color text-app-quaternary shadow-md'
                              : 'color-primary hover-color-primary-light'
                          }`}
                        >
                          Fixed
                        </button>
                        <button
                          onClick={() => setTempUseQuickBuyRange(true)}
                          disabled={!tempQuickBuyEnabled}
                          className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                            tempUseQuickBuyRange && tempQuickBuyEnabled
                              ? 'bg-app-primary-color text-app-quaternary shadow-md'
                              : 'color-primary hover-color-primary-light'
                          }`}
                        >
                          Range
                        </button>
                      </div>
                    </div>

                    {/* Amount Inputs */}
                    {tempUseQuickBuyRange ? (
                      <div className="space-y-4">
                        {/* Preset buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { min: 0.1, max: 0.5, label: 'Conservative' },
                            { min: 0.7, max: 1.5, label: 'Moderate' },
                            { min: 2, max: 4, label: 'Aggressive' }
                          ].map((preset, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setTempQuickBuyMinAmount(preset.min);
                                setTempQuickBuyMaxAmount(preset.max);
                              }}
                              disabled={!tempQuickBuyEnabled}
                              className="py-2 px-3 text-xs font-mono bg-app-primary border border-app-primary-30 
                                       hover-border-primary-60 rounded-md color-primary hover-color-primary-light 
                                       transition-colors duration-200 disabled:opacity-50"
                            >
                              <div className="font-medium">{preset.label}</div>
                              <div className="text-app-secondary-80">{preset.min}-{preset.max}</div>
                            </button>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                              <span>Min Amount</span>
                              <span className="text-app-secondary-80 text-xs">(SOL)</span>
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              max="10"
                              value={tempQuickBuyMinAmount}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value >= 0.001 && value <= 10) {
                                  setTempQuickBuyMinAmount(value);
                                  if (value >= tempQuickBuyMaxAmount) {
                                    setTempQuickBuyMaxAmount(Math.min(value + 0.01, 10));
                                  }
                                }
                              }}
                              disabled={!tempQuickBuyEnabled}
                              className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                       text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                       transition-colors duration-200 disabled:opacity-50"
                              placeholder="0.01"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                              <span>Max Amount</span>
                              <span className="text-app-secondary-80 text-xs">(SOL)</span>
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              min={tempQuickBuyMinAmount + 0.001}
                              max="10"
                              value={tempQuickBuyMaxAmount}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value > tempQuickBuyMinAmount && value <= 10) {
                                  setTempQuickBuyMaxAmount(value);
                                }
                              }}
                              disabled={!tempQuickBuyEnabled}
                              className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                       text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                       transition-colors duration-200 disabled:opacity-50"
                              placeholder="0.05"
                            />
                          </div>
                        </div>
                        
                        <div className="bg-app-primary border border-app-primary-20 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 bg-app-primary-color rounded-full animate-pulse"></div>
                            <span className="text-xs font-mono color-primary">Preview</span>
                          </div>
                          <p className="text-xs text-app-secondary-80">
                            Each quick buy will randomly spend between <span className="color-primary font-mono">{tempQuickBuyMinAmount.toFixed(3)}</span> and <span className="color-primary font-mono">{tempQuickBuyMaxAmount.toFixed(3)}</span> SOL
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Preset buttons for fixed amounts */}
                        <div className="grid grid-cols-4 gap-2">
                          {[0.01, 0.05, 0.1, 0.25].map((amount) => (
                            <button
                              key={amount}
                              onClick={() => setTempQuickBuyAmount(amount)}
                              disabled={!tempQuickBuyEnabled}
                              className={`py-2 px-2 text-xs font-mono rounded-md transition-colors duration-200 
                                       border disabled:opacity-50 ${
                                tempQuickBuyAmount === amount
                                  ? 'bg-app-primary-color text-app-quaternary border-app-primary-color'
                                  : 'bg-app-primary border-app-primary-30 hover-border-primary-60 color-primary hover-color-primary-light'
                              }`}
                            >
                              {amount} SOL
                            </button>
                          ))}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                            <span>Custom Amount</span>
                            <span className="text-app-secondary-80 text-xs">(SOL)</span>
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            max="10"
                            value={tempQuickBuyAmount}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value) && value >= 0.001 && value <= 10) {
                                setTempQuickBuyAmount(value);
                              }
                            }}
                            disabled={!tempQuickBuyEnabled}
                            className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                     text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                     transition-colors duration-200 disabled:opacity-50"
                            placeholder="0.01"
                          />
                          <p className="text-xs text-app-secondary-80 mt-2">
                            Fixed amount of SOL to spend on each quick buy
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Quick Sell Configuration */}
                <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                  <h3 className="font-mono color-primary font-medium mb-4 flex items-center gap-2">
                    <Share size={16} />
                    Quick Sell Configuration
                  </h3>
                  
                  {/* Percentage Type Toggle */}
                  <div className="flex items-center gap-3 mb-4 p-3 bg-app-primary border border-app-primary-30 rounded-lg">
                    <div className="flex-1">
                      <div className="font-mono color-primary text-sm mb-1">Percentage Type</div>
                      <p className="text-xs text-app-secondary-80">
                        {tempUseQuickSellRange ? 'Random percentages for natural variation' : 'Fixed percentage for consistency'}
                      </p>
                    </div>
                    
                    <div className="flex bg-app-secondary rounded-lg p-1 border border-app-primary-30">
                      <button
                        onClick={() => setTempUseQuickSellRange(false)}
                        className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                          !tempUseQuickSellRange
                            ? 'bg-app-primary-color text-app-quaternary shadow-md'
                            : 'color-primary hover-color-primary-light'
                        }`}
                      >
                        Fixed
                      </button>
                      <button
                        onClick={() => setTempUseQuickSellRange(true)}
                        className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                          tempUseQuickSellRange
                            ? 'bg-app-primary-color text-app-quaternary shadow-md'
                            : 'color-primary hover-color-primary-light'
                        }`}
                      >
                        Range
                      </button>
                    </div>
                  </div>

                  {/* Percentage Inputs */}
                  {tempUseQuickSellRange ? (
                    <div className="space-y-4">
                      {/* Preset buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { min: 25, max: 50, label: 'Conservative' },
                          { min: 50, max: 75, label: 'Moderate' },
                          { min: 75, max: 100, label: 'Aggressive' }
                        ].map((preset, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setTempQuickSellMinPercentage(preset.min);
                              setTempQuickSellMaxPercentage(preset.max);
                            }}
                            className="py-2 px-3 text-xs font-mono bg-app-primary border border-app-primary-30 
                                     hover-border-primary-60 rounded-md color-primary hover-color-primary-light 
                                     transition-colors duration-200"
                          >
                            <div className="font-medium">{preset.label}</div>
                            <div className="text-app-secondary-80">{preset.min}-{preset.max}%</div>
                          </button>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                            <span>Min Percentage</span>
                            <span className="text-app-secondary-80 text-xs">(%)</span>
                          </label>
                          <input
                            type="number"
                            step="5"
                            min="1"
                            max="100"
                            value={tempQuickSellMinPercentage}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value) && value >= 1 && value <= 100) {
                                setTempQuickSellMinPercentage(value);
                                if (value >= tempQuickSellMaxPercentage) {
                                  setTempQuickSellMaxPercentage(Math.min(value + 5, 100));
                                }
                              }
                            }}
                            className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                     text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                     transition-colors duration-200"
                            placeholder="25"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                            <span>Max Percentage</span>
                            <span className="text-app-secondary-80 text-xs">(%)</span>
                          </label>
                          <input
                            type="number"
                            step="5"
                            min={tempQuickSellMinPercentage + 5}
                            max="100"
                            value={tempQuickSellMaxPercentage}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value) && value > tempQuickSellMinPercentage && value <= 100) {
                                setTempQuickSellMaxPercentage(value);
                              }
                            }}
                            className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                     text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                     transition-colors duration-200"
                            placeholder="100"
                          />
                        </div>
                      </div>
                      
                      <div className="bg-app-primary border border-app-primary-30 rounded-lg p-3">
                        <p className="text-xs text-app-secondary-80">
                          Each quick sell will randomly sell between <span className="color-primary font-mono">{tempQuickSellMinPercentage}%</span> and <span className="color-primary font-mono">{tempQuickSellMaxPercentage}%</span> of token balance
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Preset buttons for fixed percentages */}
                      <div className="grid grid-cols-4 gap-2">
                        {[25, 50, 75, 100].map((percentage) => (
                          <button
                            key={percentage}
                            onClick={() => setTempQuickSellPercentage(percentage)}
                            className={`py-2 px-2 text-xs font-mono rounded-md transition-colors duration-200 
                                     border ${
                              tempQuickSellPercentage === percentage
                                ? 'bg-app-primary-color text-app-quaternary border-app-primary-color'
                                : 'bg-app-primary border-app-primary-30 hover-border-primary-60 color-primary hover-color-primary-light'
                            }`}
                          >
                            {percentage}%
                          </button>
                        ))}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                          <span>Custom Percentage</span>
                          <span className="text-app-secondary-80 text-xs">(1-100%)</span>
                        </label>
                        <input
                          type="number"
                          step="5"
                          min="1"
                          max="100"
                          value={tempQuickSellPercentage}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value) && value >= 1 && value <= 100) {
                              setTempQuickSellPercentage(value);
                            }
                          }}
                          className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                   text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                   transition-colors duration-200"
                          placeholder="100"
                        />
                        <p className="text-xs text-app-secondary-80 mt-2">
                          Fixed percentage of token balance to sell on each quick sell
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-app-primary-20">
                  <motion.button
                    variants={buttonVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setIsQuickBuySettingsOpen(false)}
                    className="flex-1 py-3 px-4 rounded-lg border border-app-primary-30
                             color-primary hover-color-primary-light transition-colors duration-200
                             font-mono text-sm hover:bg-app-quaternary"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={saveQuickBuySettings}
                    disabled={tempQuickBuyEnabled && (
                      tempUseQuickBuyRange 
                        ? (tempQuickBuyMinAmount <= 0 || tempQuickBuyMaxAmount <= 0 || tempQuickBuyMinAmount >= tempQuickBuyMaxAmount)
                        : tempQuickBuyAmount <= 0
                    ) || (
                      tempUseQuickSellRange
                        ? (tempQuickSellMinPercentage <= 0 || tempQuickSellMaxPercentage <= 0 || tempQuickSellMinPercentage >= tempQuickSellMaxPercentage)
                        : tempQuickSellPercentage <= 0
                    )}
                    className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-app-primary-color to-app-primary-light
                             text-app-quaternary hover:from-app-primary-light hover:to-app-primary-color 
                             disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 
                             font-mono text-sm shadow-lg disabled:shadow-none"
                  >
                    Save Settings
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Main controls bar - slimmer and more minimal */}
      <div className="w-full mb-1 bg-app-primary-80 backdrop-blur-sm rounded-md p-0.5 
                    border border-app-primary-20">
        <div className="flex justify-between items-center">
          {/* Primary action buttons - without tooltips */}
          <div className="flex items-center gap-0.5 flex-1">
            {wallets.length === 0 ? (
              <motion.button
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={() => {
                  // Open settings modal with wallets tab active
                  setIsModalOpen(false); // Close wallet modal if open
                  // These functions should be passed from parent component
                  if (typeof window !== 'undefined' && window.dispatchEvent) {
                    // Create and dispatch a custom event to open settings with wallets tab
                    const event = new CustomEvent('openSettingsWalletsTab');
                    window.dispatchEvent(event);
                  }
                }}
                className="flex items-center text-xs font-mono tracking-wider color-primary 
                           hover-color-primary-light px-2 py-1 rounded bg-app-quaternary border 
                           border-app-primary-30 hover-border-primary-60 transition-colors duration-200"
              >
                <span>Start Here &gt;</span>
              </motion.button>
            ) : (
              primaryActions.map((action, index) => (
                <motion.button
                  key={index}
                  variants={buttonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="p-1.5 color-primary hover-color-primary-light disabled:opacity-50 
                           bg-app-quaternary border border-app-primary-20 hover-border-primary-40 rounded 
                           transition-colors duration-200 flex-shrink-0 flex items-center justify-center"
                >
                  <span>{action.icon}</span>
                </motion.button>
              ))
            )}
          </div>
          
          {/* Quick Buy Settings and Menu toggle buttons */}
          <div className="flex items-center gap-0.5">
            {wallets.length > 0 && (
              <motion.button
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={openQuickBuySettings}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs font-mono tracking-wider
                         bg-app-quaternary border rounded transition-colors duration-200 ${
                  quickBuyEnabled 
                    ? 'color-primary hover-color-primary-light border-app-primary-20 hover-border-primary-40'
                    : 'color-primary-40 border-app-primary-10 opacity-60'
                }`}
              >
                <Zap size={12} />
                <span>
                  {quickBuyEnabled 
                    ? (useQuickBuyRange 
                        ? `${quickBuyMinAmount?.toFixed(3)}-${quickBuyMaxAmount?.toFixed(3)} SOL` 
                        : `${quickBuyAmount} SOL`
                      ) 
                    : 'OFF'
                  }
                </span>
              </motion.button>
            )}
            
            <motion.button
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              onClick={toggleDrawer}
              className="ml-0.5 p-1.5 flex items-center justify-center rounded
                       bg-gradient-to-r from-app-primary-color to-app-primary-dark 
                       text-app-quaternary hover-from-app-primary-light hover-to-app-primary-color
                       transition-colors duration-200"
            >
              {isDrawerOpen ? <X size={14} /> : <Menu size={14} />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Operations drawer - expandable */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div 
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="bg-app-primary-80 backdrop-blur-sm rounded-lg overflow-hidden
                     border border-app-primary-30 shadow-lg shadow-app-primary-10"
          >
            <div className="p-3">
              {/* Drawer header */}
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-app-primary-20">
                <div className="flex items-center gap-2">
                  <motion.div 
                    className="w-1 h-4 bg-app-primary-color"
                    animate={{ 
                      height: [4, 16, 4],
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity,
                      repeatType: "mirror" 
                    }}
                  />
                  <span className="text-xs font-mono tracking-wider color-primary uppercase">Wallet Operations</span>
                </div>
              </div>
              
              {/* Operation buttons - Single column slim layout */}
              <div className="flex flex-col space-y-1">
                {operations.map((op, index) => (
                  <motion.button
                    key={index}
                    variants={buttonVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={op.onClick}
                    className="flex justify-between items-center w-full py-2 px-3 rounded-md
                             bg-app-quaternary border border-app-primary-30 hover-border-primary-60
                             color-primary hover-color-primary-light transition-all duration-300
                             hover:shadow-md hover:shadow-app-primary-15 relative overflow-hidden"
                  >
                    {/* Subtle glow effect */}
                    <motion.div 
                      className="absolute inset-0 bg-app-primary-color"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 0.05 }}
                    />
                    <div className="flex items-center gap-3 relative z-10">
                      <span>{op.icon}</span>
                      <span className="text-xs font-mono tracking-wider">{op.label}</span>
                    </div>
                    <ChevronRight size={14} className="relative z-10 text-app-secondary-80" />
                  </motion.button>
                ))}
              </div>
            </div>
            
            {/* Decorative bottom edge */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-app-primary-40 to-transparent"/>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};