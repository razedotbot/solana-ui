import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  RefreshCw, Coins, CheckSquare, Square, ArrowDownAZ, ArrowUpAZ, 
  Wallet, Share2, Network, Send, HandCoins, DollarSign, 
  Menu, X, ChevronRight,
  Share, Zap
} from 'lucide-react';
import type { Connection } from '@solana/web3.js';
import type { WalletType, WalletCategory } from '../Utils';
import { saveWalletsToCookies } from '../Utils';
import { DistributeModal } from '../modals/DistributeModal';
import { ConsolidateModal } from '../modals/ConsolidateModal';
import { TransferModal } from '../modals/TransferModal';
import { DepositModal } from '../modals/DepositModal';
import { MixerModal } from '../modals/MixerModal';
import { QuickTradeModal, type CategoryQuickTradeSettings } from '../modals/QuickTradeModal';
import Cookies from 'js-cookie';

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
  quickBuyEnabled?: boolean;
  quickBuyMinAmount?: number;
  quickBuyMaxAmount?: number;
  useQuickBuyRange?: boolean;
  onCategorySettingsChange?: (settings: Record<WalletCategory, CategoryQuickTradeSettings>) => void;
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
  quickBuyAmount: _quickBuyAmount = 0.01,
  quickBuyEnabled: _quickBuyEnabled = true,
  quickBuyMinAmount: _quickBuyMinAmount = 0.01,
  quickBuyMaxAmount: _quickBuyMaxAmount = 0.05,
  useQuickBuyRange: _useQuickBuyRange = false,
  onCategorySettingsChange
}) => {
  // State for active modal
  const [activeModal, setActiveModal] = useState<OperationTab | null>(null);
  
  // State for fund wallets modal
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  
  // State for operations drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // State for quick buy settings modal
  const [isQuickBuySettingsOpen, setIsQuickBuySettingsOpen] = useState(false);
  
  // Category-based settings
  const getDefaultCategorySettings = (): Record<WalletCategory, CategoryQuickTradeSettings> => ({
    Soft: {
      enabled: true,
      buyAmount: 0.01,
      buyMinAmount: 0.01,
      buyMaxAmount: 0.05,
      useBuyRange: false,
      sellPercentage: 100,
      sellMinPercentage: 25,
      sellMaxPercentage: 100,
      useSellRange: false
    },
    Medium: {
      enabled: true,
      buyAmount: 0.05,
      buyMinAmount: 0.05,
      buyMaxAmount: 0.15,
      useBuyRange: false,
      sellPercentage: 100,
      sellMinPercentage: 50,
      sellMaxPercentage: 100,
      useSellRange: false
    },
    Hard: {
      enabled: true,
      buyAmount: 0.1,
      buyMinAmount: 0.1,
      buyMaxAmount: 0.5,
      useBuyRange: false,
      sellPercentage: 100,
      sellMinPercentage: 75,
      sellMaxPercentage: 100,
      useSellRange: false
    }
  });

  const loadCategorySettings = (): Record<WalletCategory, CategoryQuickTradeSettings> => {
    try {
      const saved = Cookies.get('categoryQuickTradeSettings');
      if (saved) {
        const parsed = JSON.parse(saved) as Record<WalletCategory, Partial<CategoryQuickTradeSettings>>;
        const defaults = getDefaultCategorySettings();
        return {
          Soft: { ...defaults.Soft, ...parsed.Soft },
          Medium: { ...defaults.Medium, ...parsed.Medium },
          Hard: { ...defaults.Hard, ...parsed.Hard }
        };
      }
    } catch (error) {
      console.error('Error loading category settings:', error);
    }
    return getDefaultCategorySettings();
  };

  const [categorySettings, setCategorySettings] = useState<Record<WalletCategory, CategoryQuickTradeSettings>>(() => loadCategorySettings());

  // Save category settings to cookies and notify parent
  useEffect(() => {
    Cookies.set('categoryQuickTradeSettings', JSON.stringify(categorySettings), { expires: 365 });
    if (onCategorySettingsChange) {
      onCategorySettingsChange(categorySettings);
    }
  }, [categorySettings, onCategorySettingsChange]);
  
  // Function to toggle drawer
  const toggleDrawer = (): void => {
    setIsDrawerOpen(prev => !prev);
  };
  
  // Function to open a specific modal
  const openModal = (modal: OperationTab): void => {
    setActiveModal(modal);
    setIsDrawerOpen(false); // Close drawer when opening modal
  };
  
  // Function to close the active modal
  const closeModal = (): void => {
    setActiveModal(null);
  };
  
  // Function to open fund wallets modal
  const openFundModal = (): void => {
    setIsFundModalOpen(true);
    setIsDrawerOpen(false);
  };
  
  // Function to close fund wallets modal
  const closeFundModal = (): void => {
    setIsFundModalOpen(false);
  };
  
  // Function to open distribute from fund modal
  const openDistributeFromFund = (): void => {
    setIsFundModalOpen(false);
    setActiveModal('distribute');
  };
  
  // Function to open mixer from fund modal
  const openMixerFromFund = (): void => {
    setIsFundModalOpen(false);
    setActiveModal('mixer');
  };
  
  // Function to open quick buy settings
  const openQuickBuySettings = (): void => {
    setIsQuickBuySettingsOpen(true);
    setIsDrawerOpen(false);
  };

  // Check if all wallets are active
  const allWalletsActive = wallets.every(wallet => wallet.isActive);

  // Function to toggle all wallets
  const toggleAllWalletsHandler = (): void => {
    const allActive = wallets.every(wallet => wallet.isActive);
    const newWallets = wallets.map(wallet => ({
      ...wallet,
      isActive: !allActive
    }));
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
  };

  // Function to open wallets modal
  const openWalletsModal = (): void => {
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

  // CSS classes for transitions
  const drawerClass = isDrawerOpen 
    ? 'max-h-96 opacity-100 mb-3' 
    : 'max-h-0 opacity-0 mb-0';

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
        <div
          className="fixed inset-0 bg-app-overlay flex items-center justify-center z-50 animate-fadeIn"
          onClick={closeFundModal}
        >
          <div
            className="bg-app-primary border border-app-primary-30 rounded-lg p-6 max-w-md w-full mx-4 animate-scaleIn"
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
              <button
                onClick={openDistributeFromFund}
                className="w-full flex items-center gap-3 p-4 rounded-md
                         bg-app-quaternary border border-app-primary-30 hover-border-primary-60
                         color-primary hover-color-primary-light transition-all duration-200
                         hover:shadow-md hover:shadow-app-primary-15 active:scale-95"
              >
                <Share2 size={20} />
                <div className="text-left">
                  <div className="font-mono text-sm tracking-wider">Distribute SOL</div>
                  <div className="text-xs text-app-secondary-80 mt-1">Send SOL from main wallet to multiple wallets</div>
                </div>
              </button>
              
              <button
                onClick={openMixerFromFund}
                className="w-full flex items-center gap-3 p-4 rounded-md
                         bg-app-quaternary border border-app-primary-30 hover-border-primary-60
                         color-primary hover-color-primary-light transition-all duration-200
                         hover:shadow-md hover:shadow-app-primary-15 active:scale-95"
              >
                <Share size={20} />
                <div className="text-left">
                  <div className="font-mono text-sm tracking-wider">Mixer SOL</div>
                  <div className="text-xs text-app-secondary-80 mt-1">Mix SOL between wallets for privacy</div>
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Quick Buy Settings Modal */}
      <QuickTradeModal
        isOpen={isQuickBuySettingsOpen}
        onClose={() => setIsQuickBuySettingsOpen(false)}
        categorySettings={categorySettings}
        setCategorySettings={setCategorySettings}
      />

      {/* Main controls bar - slimmer and more minimal */}
      <div className="w-full bg-app-primary-80 backdrop-blur-sm rounded-md p-0.5 
                    border border-app-primary-20">
        <div className="flex justify-between items-stretch h-8">
          {/* Primary action buttons - without tooltips */}
          <div className="flex items-center gap-0.5 flex-1">
            {wallets.length === 0 ? (
              <button
                onClick={openWalletsModal}
                className="flex items-center text-xs font-mono tracking-wider color-primary 
                           hover-color-primary-light px-2 py-1 rounded bg-app-quaternary border 
                           border-app-primary-30 hover-border-primary-60 transition-all duration-150 active:scale-95"
              >
                <span>Start Here &gt;</span>
              </button>
            ) : (
              primaryActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="p-1.5 color-primary hover-color-primary-light disabled:opacity-50 
                           bg-app-quaternary border border-app-primary-20 hover-border-primary-40 rounded 
                           transition-all duration-150 flex-shrink-0 flex items-center justify-center active:scale-95"
                >
                  <span>{action.icon}</span>
                </button>
              ))
            )}
          </div>
          
          {/* Quick Buy Settings and Menu toggle buttons */}
          <div className="flex items-stretch gap-0.5">
            {wallets.length > 0 && (
              <button
                onClick={openQuickBuySettings}
                className={`flex items-center gap-1 px-2 h-full text-xs font-mono tracking-wider
                         bg-app-quaternary border rounded transition-all duration-150 active:scale-95 ${
                  categorySettings.Medium.enabled 
                    ? 'color-primary hover-color-primary-light border-app-primary-20 hover-border-primary-40'
                    : 'color-primary-40 border-app-primary-10 opacity-60'
                }`}
              >
                <Zap size={12} />
                <span>
                  {categorySettings.Medium.enabled 
                    ? (categorySettings.Medium.useBuyRange 
                        ? `${categorySettings.Medium.buyMinAmount.toFixed(3)}-${categorySettings.Medium.buyMaxAmount.toFixed(3)}` 
                        : `${categorySettings.Medium.buyAmount}`
                      ) 
                    : 'OFF'
                  }
                </span>
              </button>
            )}
            
            <button
              onClick={toggleDrawer}
              className="ml-0.5 px-1.5 h-full flex items-center justify-center rounded
                       bg-gradient-to-r from-app-primary-color to-app-primary-dark 
                       text-app-quaternary hover-from-app-primary-light hover-to-app-primary-color
                       transition-all duration-150 active:scale-95"
            >
              {isDrawerOpen ? <X size={14} /> : <Menu size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Operations drawer - expandable */}
      <div 
        className={`bg-app-primary-80 backdrop-blur-sm rounded-lg overflow-hidden
                   border border-app-primary-30 shadow-lg shadow-app-primary-10
                   transition-all duration-200 ${drawerClass}`}
      >
        {isDrawerOpen && (
          <div className="p-3">
            {/* Drawer header */}
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-app-primary-20">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-app-primary-color" />
                <span className="text-xs font-mono tracking-wider color-primary uppercase">Wallet Operations</span>
              </div>
            </div>

            {/* Operation buttons - Single column slim layout */}
            <div className="flex flex-col space-y-1">
              {operations.map((op, index) => (
                <button
                  key={index}
                  onClick={op.onClick}
                  className="flex justify-between items-center w-full py-2 px-3 rounded-md
                           bg-app-quaternary border border-app-primary-30 hover-border-primary-60
                           color-primary hover-color-primary-light transition-all duration-150
                           hover:shadow-md hover:shadow-app-primary-15 active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <span>{op.icon}</span>
                    <span className="text-xs font-mono tracking-wider">{op.label}</span>
                  </div>
                  <ChevronRight size={14} className="text-app-secondary-80" />
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Decorative bottom edge */}
        {isDrawerOpen && (
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-app-primary-40 to-transparent"/>
        )}
      </div>
    </>
  );
};