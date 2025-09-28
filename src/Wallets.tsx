import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, ExternalLink, DollarSign, Activity, Zap, Check, TrendingDown } from 'lucide-react';
import { saveWalletsToCookies, WalletType, formatAddress, formatTokenBalance, copyToClipboard, toggleWallet, getWalletDisplayName } from './Utils';
import { useToast } from "./Notifications";
import { Connection } from '@solana/web3.js';
import { WalletOperationsButtons } from './OperationsWallets'; // Import the new component
import { executeBuy, createBuyConfig, validateBuyInputs } from './utils/buy';
import { executeSell, createSellConfig, validateSellInputs } from './utils/sell';
import { 
  ScriptType, 
  countActiveWallets, 
  getActiveWallets, 
  toggleAllWallets, 
  toggleAllWalletsWithBalance, 
  toggleWalletsByBalance, 
  getScriptName 
} from './utils/wallets';

// Tooltip Component with cyberpunk styling
export const Tooltip = ({ 
  children, 
  content,
  position = 'top'
}: { 
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-app-quaternary cyberpunk-border color-primary text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

interface WalletsPageProps {
  wallets: WalletType[];
  setWallets: (wallets: WalletType[]) => void;
  handleRefresh: () => void;
  isRefreshing: boolean;
  setIsModalOpen: (open: boolean) => void;
  tokenAddress: string;
  sortDirection: string;
  handleSortWallets: () => void;
  connection: Connection;
  
  // Balance props
  solBalances?: Map<string, number>;
  setSolBalances?: (balances: Map<string, number>) => void;
  tokenBalances?: Map<string, number>;
  setTokenBalances?: (balances: Map<string, number>) => void;
  totalSol?: number;
  setTotalSol?: (total: number) => void;
  activeSol?: number;
  setActiveSol?: (active: number) => void;
  totalTokens?: number;
  setTotalTokens?: (total: number) => void;
  activeTokens?: number;
  setActiveTokens?: (active: number) => void;
  quickBuyEnabled?: boolean;
  setQuickBuyEnabled?: (enabled: boolean) => void;
  quickBuyAmount?: number;
  setQuickBuyAmount?: (amount: number) => void;
  quickBuyMinAmount?: number;
  setQuickBuyMinAmount?: (amount: number) => void;
  quickBuyMaxAmount?: number;
  setQuickBuyMaxAmount?: (amount: number) => void;
  useQuickBuyRange?: boolean;
  setUseQuickBuyRange?: (enabled: boolean) => void;
  quickSellPercentage?: number;
  setQuickSellPercentage?: (percentage: number) => void;
  quickSellMinPercentage?: number;
  setQuickSellMinPercentage?: (percentage: number) => void;
  quickSellMaxPercentage?: number;
  setQuickSellMaxPercentage?: (percentage: number) => void;
  useQuickSellRange?: boolean;
  setUseQuickSellRange?: (useRange: boolean) => void;
}

export const WalletsPage: React.FC<WalletsPageProps> = ({
  wallets,
  setWallets,
  handleRefresh,
  isRefreshing,
  setIsModalOpen,
  tokenAddress,
  sortDirection,
  handleSortWallets,
  connection,
  
  // Balance props with defaults
  solBalances: externalSolBalances,
  setSolBalances: setExternalSolBalances,
  tokenBalances: externalTokenBalances,
  setTokenBalances: setExternalTokenBalances,
  totalSol: externalTotalSol,
  setTotalSol: setExternalTotalSol,
  activeSol: externalActiveSol,
  setActiveSol: setExternalActiveSol,
  totalTokens: externalTotalTokens,
  setTotalTokens: setExternalTotalTokens,
  activeTokens: externalActiveTokens,
  setActiveTokens: setExternalActiveTokens,
  quickBuyEnabled = true,
  setQuickBuyEnabled,
  quickBuyAmount = 0.01,
  setQuickBuyAmount,
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
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showingTokenWallets, setShowingTokenWallets] = useState(true);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [buyingWalletId, setBuyingWalletId] = useState<number | null>(null);
  const [sellingWalletId, setSellingWalletId] = useState<number | null>(null);
  const [recentlyUpdatedWallets, setRecentlyUpdatedWallets] = useState<Set<string>>(new Set());
  
  // Use internal state if external state is not provided
  const [internalSolBalances, setInternalSolBalances] = useState<Map<string, number>>(new Map());
  const [internalTokenBalances, setInternalTokenBalances] = useState<Map<string, number>>(new Map());
  
  const solBalances = externalSolBalances || internalSolBalances;
  const tokenBalances = externalTokenBalances || internalTokenBalances;
  
  const { showToast } = useToast();
  // Use refs to track previous balance values
  const prevSolBalancesRef = useRef<Map<string, number>>(new Map());
  const prevTokenBalancesRef = useRef<Map<string, number>>(new Map());



  // Monitor balance changes to show visual feedback for trade updates
  useEffect(() => {
    const prevSolBalances = prevSolBalancesRef.current;
    const prevTokenBalances = prevTokenBalancesRef.current;
    
    // Create a serialized version of current balances to compare
    const currentSolString = JSON.stringify(Array.from(solBalances.entries()).sort());
    const currentTokenString = JSON.stringify(Array.from(tokenBalances.entries()).sort());
    const prevSolString = JSON.stringify(Array.from(prevSolBalances.entries()).sort());
    const prevTokenString = JSON.stringify(Array.from(prevTokenBalances.entries()).sort());
    
    // Only proceed if balances actually changed
    if (currentSolString === prevSolString && currentTokenString === prevTokenString) {
      return;
    }
    
    // Check for balance changes and mark wallets as recently updated
    const updatedWallets = new Set<string>();
    
    wallets.forEach(wallet => {
      const currentSol = solBalances.get(wallet.address) || 0;
      const currentToken = tokenBalances.get(wallet.address) || 0;
      const prevSol = prevSolBalances.get(wallet.address) || 0;
      const prevToken = prevTokenBalances.get(wallet.address) || 0;
      
      // Check if balances changed significantly (to avoid minor rounding differences)
      const solChanged = Math.abs(currentSol - prevSol) > 0.001;
      const tokenChanged = Math.abs(currentToken - prevToken) > 0.001;
      
      if ((solChanged || tokenChanged) && (prevSol > 0 || prevToken > 0)) {
        updatedWallets.add(wallet.address);
      }
    });
    
    if (updatedWallets.size > 0) {
      setRecentlyUpdatedWallets(updatedWallets);
      
      // Clear the visual indicator after 1 seconds
      setTimeout(() => {
        setRecentlyUpdatedWallets(new Set());
      }, 1000);
    }
    
    // Update previous balance references only after processing
    prevSolBalancesRef.current = new Map(solBalances);
    prevTokenBalancesRef.current = new Map(tokenBalances);
  }, [solBalances, tokenBalances]); // Removed wallets from dependency array to prevent triggering on selection changes

  // Calculate balances and update external state
  const calculatedTotalSol = useMemo(() => 
    Array.from(solBalances.values()).reduce((sum, balance) => sum + balance, 0),
    [solBalances]
  );
  
  const calculatedTotalTokens = useMemo(() =>
    Array.from(tokenBalances.values()).reduce((sum, balance) => sum + balance, 0),
    [tokenBalances]
  );
  
  const activeWallets = useMemo(() => 
    wallets.filter(wallet => wallet.isActive),
    [wallets]
  );
  
  const calculatedActiveSol = useMemo(() =>
    activeWallets.reduce((sum, wallet) => sum + (solBalances.get(wallet.address) || 0), 0),
    [activeWallets, solBalances]
  );
  
  const calculatedActiveTokens = useMemo(() =>
    activeWallets.reduce((sum, wallet) => sum + (tokenBalances.get(wallet.address) || 0), 0),
    [activeWallets, tokenBalances]
  );

  useEffect(() => {
    // Update external state if provided
    if (setExternalTotalSol) setExternalTotalSol(calculatedTotalSol);
    if (setExternalActiveSol) setExternalActiveSol(calculatedActiveSol);
    if (setExternalTotalTokens) setExternalTotalTokens(calculatedTotalTokens);
    if (setExternalActiveTokens) setExternalActiveTokens(calculatedActiveTokens);
  }, [calculatedTotalSol, calculatedActiveSol, calculatedTotalTokens, calculatedActiveTokens]);

  // Use either external state or calculated values
  const totalSol = externalTotalSol !== undefined ? externalTotalSol : calculatedTotalSol;
  const totalTokens = externalTotalTokens !== undefined ? externalTotalTokens : calculatedTotalTokens;
  const activeSol = externalActiveSol !== undefined ? externalActiveSol : calculatedActiveSol;
  const activeTokens = externalActiveTokens !== undefined ? externalActiveTokens : calculatedActiveTokens;

  const handleBalanceToggle = () => {
    setShowingTokenWallets(!showingTokenWallets);
    const newWallets = toggleWalletsByBalance(wallets, !showingTokenWallets, solBalances, tokenBalances);
    saveWalletsToCookies(newWallets);
    setWallets(newWallets);
  };

  const handleRefreshAll = async () => {
    if (isRefreshing) return;
    
    // Call the parent's refresh handler which manages all balance fetching
    handleRefresh();
  };

  const handleQuickBuy = async (wallet: WalletType, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!tokenAddress) {
      showToast('No token address specified', 'error');
      return;
    }

    if (buyingWalletId === wallet.id) return; // Prevent double clicks
    
    setBuyingWalletId(wallet.id);
    
    try {
      // Calculate the SOL amount to use
      let solAmountToUse = quickBuyAmount;
      
      if (useQuickBuyRange && quickBuyMinAmount && quickBuyMaxAmount) {
        // Generate random amount between min and max
        solAmountToUse = Math.random() * (quickBuyMaxAmount - quickBuyMinAmount) + quickBuyMinAmount;
        // Round to 3 decimal places
        solAmountToUse = Math.round(solAmountToUse * 1000) / 1000;
      }

      // Create wallet for buy
      const walletForBuy = {
        address: wallet.address,
        privateKey: wallet.privateKey
      };

      // Check wallet balance and adjust amount if necessary
      const walletBalance = solBalances.get(wallet.address) || 0;
      const maxAvailable = walletBalance - 0.01; // Leave 0.01 SOL for transaction fees
      
      if (maxAvailable <= 0) {
        showToast(`Insufficient SOL balance. Need at least 0.01 SOL for transaction fees`, 'error');
        return;
      }
      
      // Cap the amount to what's available in the wallet
      if (solAmountToUse > maxAvailable) {
        solAmountToUse = maxAvailable;
        // Round to 3 decimal places
        solAmountToUse = Math.round(solAmountToUse * 1000) / 1000;
      }
      
      // Create buy configuration using the unified system
      const buyConfig = createBuyConfig({
        tokenAddress,
        protocol: 'auto', // Use Auto for quick buy
        solAmount: solAmountToUse
        // slippageBps will be automatically set from config in the buy.ts file
      });
      
      // Validate inputs
      const validation = validateBuyInputs([walletForBuy], buyConfig, solBalances);
      if (!validation.valid) {
        showToast(validation.error || 'Validation failed', 'error');
        return;
      }
      
      const result = await executeBuy([walletForBuy], buyConfig);
      
      if (result.success) {
        showToast('Quick buy executed successfully!', 'success');
      } else {
        showToast(result.error || 'Quick buy failed', 'error');
      }
    } catch (error) {
      console.error('Quick buy error:', error);
      showToast('Quick buy failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setBuyingWalletId(null);
    }
  };

  const handleQuickSell = async (wallet: WalletType, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!tokenAddress) {
      showToast('No token address specified', 'error');
      return;
    }

    if (sellingWalletId === wallet.id) return; // Prevent double clicks
    
    setSellingWalletId(wallet.id);
    
    try {
      // Create wallet for sell
      const walletForSell = {
        address: wallet.address,
        privateKey: wallet.privateKey
      };

      // Check if wallet has tokens to sell
      const walletTokenBalance = tokenBalances.get(wallet.address) || 0;
      if (walletTokenBalance <= 0) {
        showToast('No tokens to sell in this wallet', 'error');
        return;
      }
      
      // Create sell configuration using the unified system
      const sellConfig = createSellConfig({
        tokenAddress,
        protocol: 'auto', // Use Auto for quick sell
        sellPercent: quickSellPercentage // Use the configured quick sell percentage
        // slippageBps will be automatically set from config in the sell.ts file
      });
      
      // Validate inputs
      const validation = validateSellInputs([walletForSell], sellConfig, tokenBalances);
      if (!validation.valid) {
        showToast(validation.error || 'Validation failed', 'error');
        return;
      }
      
      const result = await executeSell([walletForSell], sellConfig);
      
      if (result.success) {
        showToast('Quick sell executed successfully!', 'success');
      } else {
        showToast(result.error || 'Quick sell failed', 'error');
      }
    } catch (error) {
      console.error('Quick sell error:', error);
      showToast('Quick sell failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setSellingWalletId(null);
    }
  };



  return (
    <div className="flex-1 bg-app-primary relative cyberpunk-bg">
      {/* Cyberpunk scanline effect - pointer-events-none ensures it doesn't block clicks */}
      <div className="absolute top-0 left-0 w-full h-full cyberpunk-scanline pointer-events-none z-1 opacity-30"></div>
      
      {/* Enhanced header */}
      <div className="top-0 sticky bg-app-primary-99 backdrop-blur-sm border-b border-app-primary-40 z-10 shadow-sm">
        {/* Compact buttons row */}
        <div className="px-2 py-1 border-b border-app-primary-20">
          <WalletOperationsButtons
            wallets={wallets}
            solBalances={solBalances}
            setSolBalances={setExternalSolBalances}
            connection={connection}
            tokenBalances={tokenBalances}
            tokenAddress={tokenAddress}
            handleRefresh={handleRefreshAll}
            isRefreshing={isRefreshing}
            showingTokenWallets={showingTokenWallets}
            handleBalanceToggle={handleBalanceToggle}
            setWallets={setWallets}
            sortDirection={sortDirection}
            handleSortWallets={handleSortWallets}
            setIsModalOpen={setIsModalOpen}
            quickBuyAmount={quickBuyAmount}
            setQuickBuyAmount={setQuickBuyAmount}
            quickBuyEnabled={quickBuyEnabled}
            setQuickBuyEnabled={setQuickBuyEnabled}
            quickBuyMinAmount={quickBuyMinAmount}
            setQuickBuyMinAmount={setQuickBuyMinAmount}
            quickBuyMaxAmount={quickBuyMaxAmount}
            setQuickBuyMaxAmount={setQuickBuyMaxAmount}
            useQuickBuyRange={useQuickBuyRange}
            setUseQuickBuyRange={setUseQuickBuyRange}
            quickSellPercentage={quickSellPercentage}
            setQuickSellPercentage={setQuickSellPercentage}
            quickSellMinPercentage={quickSellMinPercentage}
            setQuickSellMinPercentage={setQuickSellMinPercentage}
            quickSellMaxPercentage={quickSellMaxPercentage}
            setQuickSellMaxPercentage={setQuickSellMaxPercentage}
            useQuickSellRange={useQuickSellRange}
            setUseQuickSellRange={setUseQuickSellRange}
          />
        </div>
        
        {/* Improved balance info */}
        <div className="py-2 px-3 bg-app-secondary-80-solid relative">
          <div className="flex justify-between text-sm">
            <div>
              <div className="text-app-secondary font-mono flex items-center gap-2">
                <DollarSign size={14} className="color-primary" />
                <span>
                  <span className="text-app-primary">{totalSol.toFixed(2)}</span> (
                  <span className="color-primary">{activeSol.toFixed(2)}</span>) SOL
                </span>
              </div>
            </div>
            {tokenAddress && (
              <div className="text-right">
                <div className="text-app-secondary font-mono flex items-center justify-end gap-2">
                  <span>
                    <span className="text-app-primary">{formatTokenBalance(totalTokens)}</span> (
                    <span className="color-primary">{formatTokenBalance(activeTokens)}</span>) Tokens
                  </span>
                  <Activity size={14} className="color-primary" />
                </div>
              </div>
            )}
          </div>
          

        </div>
      </div>
      
      {/* Wallets table with enhanced visual selection */}
      <div className="pt-2 relative">
        <div className="min-w-full overflow-auto relative">
          <table className="w-full border-separate border-spacing-0">
            <tbody className="text-sm">
              {wallets.map((wallet) => (
                <tr 
                  key={wallet.id}
                  onClick={() => {
                    const newWallets = toggleWallet(wallets, wallet.id);
                    saveWalletsToCookies(newWallets);
                    setWallets(newWallets);
                  }}
                  onMouseEnter={() => setHoverRow(wallet.id)}
                  onMouseLeave={() => setHoverRow(null)}
                  className={`
                    border-b transition-all duration-300 cursor-pointer group
                    ${wallet.isActive 
                      ? 'border-app-primary-60 bg-gradient-to-r from-app-primary-20 via-primary-15 to-primary-10 border-l-4 border-l-app-primary shadow-lg shadow-app-primary-20' 
                      : 'border-app-primary-15 hover-border-primary-30'
                    }
                    ${hoverRow === wallet.id && !wallet.isActive ? 'bg-primary-08 border-app-primary-30' : ''}
                    ${recentlyUpdatedWallets.has(wallet.address) ? 'animate-pulse border-l-2 border-l-success' : ''}

                  `}
                >
                  {/* Enhanced Selection Indicator */}
                  <td className="py-3 pl-3 pr-1 w-12">
                    <div className="flex items-center gap-2">
                      
                      {/* Quick Buy Button */}
                      {quickBuyEnabled && (
                        <Tooltip content={
                          tokenAddress 
                            ? (useQuickBuyRange 
                                ? `Quick buy random ${quickBuyMinAmount?.toFixed(3)}-${quickBuyMaxAmount?.toFixed(3)} SOL (capped to available balance)` 
                                : `Quick buy ${quickBuyAmount} SOL (capped to available balance)`
                              )
                            : "No token selected"
                        } position="right">
                          <button
                            onClick={(e) => handleQuickBuy(wallet, e)}
                            disabled={!tokenAddress || buyingWalletId === wallet.id || (solBalances.get(wallet.address) || 0) < (useQuickBuyRange ? (quickBuyMinAmount || quickBuyAmount) : quickBuyAmount) + 0.01}
                            className={`
                              w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center
                              ${!tokenAddress || (solBalances.get(wallet.address) || 0) < (useQuickBuyRange ? (quickBuyMinAmount || quickBuyAmount) : quickBuyAmount) + 0.01
                                ? 'bg-app-tertiary border border-app-primary-20 cursor-not-allowed opacity-50'
                                : buyingWalletId === wallet.id
                                ? 'bg-app-primary-color border border-app-primary-color shadow-lg shadow-app-primary-40 animate-pulse'
                                : 'bg-primary-30 border border-app-primary-80 hover:bg-app-primary-color hover-border-primary hover:shadow-lg hover:shadow-app-primary-40 cursor-pointer'
                              }
                            `}
                          >
                            {buyingWalletId === wallet.id ? (
                              <RefreshCw size={10} className="text-app-quaternary animate-spin" />
                            ) : (
                              <Zap size={10} className={`
                                ${!tokenAddress || (solBalances.get(wallet.address) || 0) < (useQuickBuyRange ? (quickBuyMinAmount || quickBuyAmount) : quickBuyAmount) + 0.01
                                  ? 'text-app-primary-40'
                                  : 'text-app-quaternary group-hover:text-app-quaternary'
                                }
                              `} />
                            )}
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                  
                  {/* Enhanced Address Display */}
                  <td className="py-3 px-2 font-mono">
                    <div className="flex items-center justify-between">
                      <Tooltip 
                        content={`Click to copy`}
                        position="bottom"
                      >
                        <span 
                          className={`text-sm font-mono cursor-pointer transition-all duration-300 tracking-wide font-medium
                            ${wallet.isActive 
                              ? 'text-success drop-shadow-sm' 
                              : 'text-app-primary hover:color-primary'
                            }
                          `}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const success = await copyToClipboard(wallet.address, showToast);
                            if (success) {
                              setCopiedAddress(wallet.address);
                              setTimeout(() => setCopiedAddress(null), 2000);
                            }
                          }}
                        >
                          {getWalletDisplayName(wallet)}
                          {copiedAddress === wallet.address && (
                            <span className="ml-2 text-xs color-primary animate-pulse bg-primary-20 px-1 py-0.5 rounded">
                              ✓
                            </span>
                          )}
                        </span>
                      </Tooltip>

                    </div>
                  </td>
                  
                  {/* Enhanced SOL Balance */}
                  <td className="py-3 px-2 text-right font-mono">
                    <div className="flex items-center justify-end gap-1">
                      <span className={`font-medium transition-colors duration-300 ${
                        wallet.isActive
                          ? ((solBalances.get(wallet.address) || 0) > 0 ? 'text-success' : 'text-warning')
                          : ((solBalances.get(wallet.address) || 0) > 0 ? 'text-app-secondary' : 'text-app-secondary-60')
                      }`}>
                        {(solBalances.get(wallet.address) || 0).toFixed(3)}
                      </span>
                    </div>
                  </td>
                  
                  {/* Enhanced Token Balance */}
                  {tokenAddress && (
                    <td className="py-3 px-2 text-right font-mono">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`font-medium transition-colors duration-300 ${
                          wallet.isActive
                            ? ((tokenBalances.get(wallet.address) || 0) > 0 ? 'text-success' : 'text-warning-60')
                            : ((tokenBalances.get(wallet.address) || 0) > 0 ? 'color-primary' : 'text-app-primary-40')
                        }`}>
                          {formatTokenBalance(tokenBalances.get(wallet.address) || 0)}
                        </span>
                      </div>
                    </td>
                  )}
                  
                  {/* Quick Sell Button */}
                  <td className="py-3 pl-2 pr-3 text-right">
                    <Tooltip content={
                      tokenAddress 
                        ? (tokenBalances.get(wallet.address) || 0) > 0
                          ? `Quick sell ${quickSellPercentage}% of tokens`
                          : "No tokens to sell"
                        : "No token selected"
                    } position="left">
                      <button
                        onClick={(e) => handleQuickSell(wallet, e)}
                        disabled={!tokenAddress || sellingWalletId === wallet.id || (tokenBalances.get(wallet.address) || 0) <= 0}
                        className={`
                          w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center
                          ${!tokenAddress || (tokenBalances.get(wallet.address) || 0) <= 0
                            ? 'bg-app-tertiary border border-app-primary-20 cursor-not-allowed opacity-50'
                            : sellingWalletId === wallet.id
                            ? 'bg-red-500 border border-red-500 shadow-lg shadow-red-400 animate-pulse'
                            : 'bg-red-400 border border-red-600 hover:bg-red-500 hover:border-red-500 hover:shadow-lg hover:shadow-red-400 cursor-pointer'
                          }
                        `}
                      >
                        {sellingWalletId === wallet.id ? (
                          <RefreshCw size={10} className="text-white animate-spin" />
                        ) : (
                          <TrendingDown size={10} className={`
                            ${!tokenAddress || (tokenBalances.get(wallet.address) || 0) <= 0
                              ? 'text-app-primary-40'
                              : 'text-white'
                            }
                          `} />
                        )}
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};