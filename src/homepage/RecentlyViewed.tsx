import React from 'react';
import { Activity, Clock, TrendingUp } from 'lucide-react';
import type { RecentToken } from '../types/recentTokens';
import { formatTimeAgo } from '../utils/recentTokens';
import { formatAddress } from '../utils/formatting';

interface RecentlyViewedProps {
  recentTokens: RecentToken[];
  onNavigateToToken?: (tokenAddress: string) => void;
  onClearHistory?: () => void;
  onExploreChart?: () => void;
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  recentTokens,
  onNavigateToToken,
  onClearHistory,
  onExploreChart
}) => {
  return (
    <div
      className="space-y-3 md:space-y-4 animate-slide-up"
      style={{ animationDelay: '0.4s' }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity size={20} className="color-primary" />
          <h2 className="text-lg md:text-xl lg:text-2xl font-mono tracking-wider uppercase color-primary font-bold">
            Recently Viewed
          </h2>
        </div>
        {recentTokens.length > 0 && (
          <button
            onClick={onClearHistory}
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
              onClick={() => onNavigateToToken?.(token.address)}
              className="group cursor-pointer bg-app-secondary-80 border border-app-primary-20 hover:border-app-primary-40 rounded-lg p-4 transition-all duration-300 relative overflow-hidden hover:scale-[1.02] hover:-translate-y-0.5 animate-slide-in"
              style={{ animationDelay: `${0.45 + index * 0.05}s` }}
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-mono color-primary text-base font-bold mb-1 truncate">
                    {token.symbol || 'Unknown Token'}
                  </div>
                  <div className="text-xs text-app-secondary-60 font-mono truncate">
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
            onClick={onExploreChart}
            className="mt-4 px-6 py-2 text-sm font-mono tracking-wider text-app-primary-color border border-app-primary-40 hover:border-app-primary-60 rounded-lg transition-all duration-300 inline-flex items-center gap-2 hover:scale-105 active:scale-95"
          >
            <TrendingUp size={16} />
            Explore Tokens
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentlyViewed;

