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
import { WalletType, saveWalletsToCookies } from '../Utils';
import { DistributeModal } from '../modals/DistributeModal';
import { ConsolidateModal } from '../modals/ConsolidateModal';
import { TransferModal } from '../modals/TransferModal';
import { DepositModal } from '../modals/DepositModal';
import { MixerModal } from '../modals/MixerModal';
import { QuickTradeModal } from '../modals/QuickTradeModal';

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
    setIsQuickBuySettingsOpen(true);
    setIsDrawerOpen(false);
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
      <QuickTradeModal
        isOpen={isQuickBuySettingsOpen}
        onClose={() => setIsQuickBuySettingsOpen(false)}
        quickBuyEnabled={quickBuyEnabled}
        setQuickBuyEnabled={setQuickBuyEnabled || (() => {})}
        quickBuyAmount={quickBuyAmount}
        setQuickBuyAmount={setQuickBuyAmount || (() => {})}
        quickBuyMinAmount={quickBuyMinAmount}
        setQuickBuyMinAmount={setQuickBuyMinAmount || (() => {})}
        quickBuyMaxAmount={quickBuyMaxAmount}
        setQuickBuyMaxAmount={setQuickBuyMaxAmount || (() => {})}
        useQuickBuyRange={useQuickBuyRange}
        setUseQuickBuyRange={setUseQuickBuyRange || (() => {})}
        quickSellPercentage={quickSellPercentage}
        setQuickSellPercentage={setQuickSellPercentage || (() => {})}
        quickSellMinPercentage={quickSellMinPercentage}
        setQuickSellMinPercentage={setQuickSellMinPercentage || (() => {})}
        quickSellMaxPercentage={quickSellMaxPercentage}
        setQuickSellMaxPercentage={setQuickSellMaxPercentage || (() => {})}
        useQuickSellRange={useQuickSellRange}
        setUseQuickSellRange={setUseQuickSellRange || (() => {})}
      />

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
                onClick={openWalletsModal}
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