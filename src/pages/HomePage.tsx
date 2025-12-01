import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, TrendingUp } from 'lucide-react';

import { getRecentTokens, clearRecentTokens, formatTimeAgo } from '../utils/recentTokens';
import type { RecentToken } from '../utils/types';
import { formatAddress } from '../utils/formatting';
import { HomepageHeader } from '../components/Header';

export const Homepage: React.FC = () => {
  const navigate = useNavigate();
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
      }
    }
  };

  // Navigate to token page with iframe
  const handleNavigateToToken = (tokenAddress: string): void => {
    navigate(`/tokens/${tokenAddress}`);
  };

  // Navigate to monitor/explore page
  const handleExploreChart = (): void => {
    navigate('/monitor');
  };

  const handleNavigateHome = (): void => {
    // Already on homepage, do nothing or scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-app-primary flex">
      {/* Vertical Sidebar Header */}
      <HomepageHeader
        onNavigateHome={handleNavigateHome}
      />

      {/* Main Content with Background Effects - with left margin for sidebar */}
      <div
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
            
            {/* Recently Viewed Tokens section */}
            <div
              className="space-y-3 md:space-y-4 animate-slide-up"
              style={{ animationDelay: '0.4s' }}
            >
              {/* Section header */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-mono tracking-wider uppercase color-primary font-bold">
                    Recently Viewed
                  </h2>
                </div>
                {recentTokens.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="px-4 py-2 text-sm font-mono tracking-wider text-app-secondary-60 hover:text-app-primary-color border border-app-primary-20 hover:border-app-primary-40 rounded-lg transition-all duration-300"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {/* Token list grid - responsive: 1 column on mobile, 2 on tablet/desktop */}
              {recentTokens.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recentTokens.map((token, index) => (
                    <div
                      key={token.address}
                      onClick={() => handleNavigateToToken(token.address)}
                      className="group cursor-pointer bg-app-secondary-80 border border-app-primary-20 hover:border-app-primary-40 rounded-lg p-4 transition-all duration-300 relative overflow-hidden hover:scale-[1.02] hover:-translate-y-0.5 animate-slide-in"
                      style={{ animationDelay: `${0.45 + index * 0.05}s` }}
                    >
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono color-primary text-base font-bold truncate">
                            {formatAddress(token.address)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono ml-3 flex-shrink-0">
                          <Clock size={14} />
                          <span>{formatTimeAgo(token.lastViewed)}</span>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-app-primary-05 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="bg-app-secondary-80 border border-app-primary-20 rounded-lg p-8 md:p-12 text-center animate-fade-in"
                  style={{ animationDelay: '0.45s' }}
                >
                  <Clock size={40} className="color-primary mx-auto mb-4 opacity-50" />
                  <p className="text-sm md:text-base text-app-secondary font-mono">
                    No tokens viewed yet. Start exploring tokens to see them here.
                  </p>
                  <button
                    onClick={handleExploreChart}
                    className="mt-4 px-6 py-2 text-sm font-mono tracking-wider text-app-primary-color border border-app-primary-40 hover:border-app-primary-60 rounded-lg transition-all duration-300 inline-flex items-center gap-2 hover:scale-105 active:scale-95"
                  >
                    <TrendingUp size={16} />
                    Explore Tokens
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;

