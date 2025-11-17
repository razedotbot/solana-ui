import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Connection } from '@solana/web3.js';
import type { WalletType } from '../Utils';
import { getRecentTokens, clearRecentTokens } from '../utils/recentTokens';
import type { RecentToken } from '../types/recentTokens';
import { HomepageHeader } from '../components/Header';
import { QuickActions } from './QuickActions';
import { RecentlyViewed } from './RecentlyViewed';

interface HomepageProps {
  // Navigation
  onExploreChart?: () => void;
  onNavigateToToken?: (tokenAddress: string) => void;
  onNavigateToMonitor?: () => void;
  onNavigateToHoldings?: () => void;
  
  // Data props
  wallets?: WalletType[];
  solBalances?: Map<string, number>;
  connection?: Connection | null;
  currentTokenAddress?: string;
  
  // Toast for error messages
  showToast?: (message: string, type: 'success' | 'error') => void;
}

export const Homepage: React.FC<HomepageProps> = ({ 
  onExploreChart,
  onNavigateToToken,
  onNavigateToMonitor,
  onNavigateToHoldings,
  currentTokenAddress,
  showToast
}) => {
  // State for recent tokens
  const [recentTokens, setRecentTokens] = useState<RecentToken[]>([]);
  const [_isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [_tokensError, setTokensError] = useState<string | null>(null);

  // Load recent tokens on component mount
  useEffect(() => {
    try {
      setIsLoadingTokens(true);
      setTokensError(null);
      const tokens = getRecentTokens();
      setRecentTokens(tokens);
    } catch (error) {
      console.error('Error loading recent tokens:', error);
      setTokensError('Failed to load recent tokens');
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  // Handle clear history with confirmation
  const handleClearHistory = (): void => {
    if (recentTokens.length === 0) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to clear your recently viewed tokens history? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        clearRecentTokens();
        setRecentTokens([]);
      } catch (error) {
        console.error('Error clearing recent tokens:', error);
        showToast?.('Failed to clear history', 'error');
      }
    }
  };

  const handleNavigateHome = (): void => {
    // Already on homepage, do nothing or scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-app-primary flex">
      {/* Vertical Sidebar Header */}
      <HomepageHeader
        tokenAddress={currentTokenAddress}
        onNavigateHome={handleNavigateHome}
      />

      {/* Main Content with Background Effects - with left margin for sidebar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex-1 overflow-y-auto overflow-x-hidden w-full md:w-auto md:ml-48 bg-app-primary"
      >
        {/* Background effects layer */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Grid pattern background */}
          <div className="absolute inset-0 bg-app-primary opacity-90">
            <div className="absolute inset-0 bg-gradient-to-b from-app-primary-05 to-transparent"></div>
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(2, 179, 109, 0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(2, 179, 109, 0.05) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
                backgroundPosition: 'center center',
              }}
            ></div>
          </div>
          
          {/* Corner accent lines - 4 corners with gradient lines */}
          <div className="absolute top-0 left-0 w-32 h-32 opacity-20">
            <div className="absolute top-0 left-0 w-px h-16 bg-gradient-to-b from-app-primary-color to-transparent"></div>
            <div className="absolute top-0 left-0 w-16 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
            <div className="absolute top-0 right-0 w-px h-16 bg-gradient-to-b from-app-primary-color to-transparent"></div>
            <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-32 h-32 opacity-20">
            <div className="absolute bottom-0 left-0 w-px h-16 bg-gradient-to-t from-app-primary-color to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-16 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
          </div>
          <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20">
            <div className="absolute bottom-0 right-0 w-px h-16 bg-gradient-to-t from-app-primary-color to-transparent"></div>
            <div className="absolute bottom-0 right-0 w-16 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
          </div>

          {/* Scanline overlay effect */}
          <div className="absolute inset-0 scanline pointer-events-none opacity-30"></div>

          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent pointer-events-none"></div>
        </div>

        {/* Content container */}
        <div className="relative z-10 p-4 md:p-6 lg:p-8">
          <div className="max-w-3xl w-full mx-auto space-y-6 md:space-y-8">
            
            {/* Quick Actions section */}
            <QuickActions
              onNavigateToMonitor={onNavigateToMonitor}
              onNavigateToHoldings={onNavigateToHoldings}
              onExploreChart={onExploreChart}
            />

            {/* Recently Viewed Tokens section */}
            <RecentlyViewed
              recentTokens={recentTokens}
              onNavigateToToken={onNavigateToToken}
              onClearHistory={handleClearHistory}
              onExploreChart={onExploreChart}
            />

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Homepage;
