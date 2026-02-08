import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  TrendingUp,
  X,
  Copy,
  Trash2,
  ArrowRight,
  Search
} from 'lucide-react';

import { getRecentTokens, clearRecentTokens, formatTimeAgo, removeRecentToken } from '../utils/recentTokens';
import type { RecentToken } from '../utils/types';
import { formatAddress } from '../utils/formatting';
import { HorizontalHeader } from '../components/HorizontalHeader';
import { PageBackground } from '../components/PageBackground';
import { OnboardingTutorial } from '../components/OnboardingTutorial';
import { createConnectionFromConfig } from '../utils/rpcManager';
import { useTokenMetadata, prefetchTokenMetadata } from '../utils/hooks';
import { useMultichart } from '../contexts/useMultichart';

interface NetworkStats {
  solPrice: string;
  solChange: string;
  solUp: boolean;
  tps: string;
  epoch: string;
  epochProgress: string;
  avgFee: string;
}

interface CoinGeckoResponse {
  solana?: {
    usd?: number;
    usd_24h_change?: number;
  };
}

/** Card for a single recent token, uses hook to fetch metadata */
const RecentTokenCard: React.FC<{
  token: RecentToken;
  index: number;
  onNavigate: (address: string) => void;
  onCopy: (e: React.MouseEvent, address: string) => Promise<void>;
  onRemove: (e: React.MouseEvent, address: string) => void;
}> = ({ token, index, onNavigate, onCopy, onRemove }) => {
  const { metadata } = useTokenMetadata(token.address);

  return (
    <div
      key={token.address}
      onClick={() => onNavigate(token.address)}
      className="group cursor-pointer bg-app-secondary-80/50 backdrop-blur-md border border-app-primary-20 hover:border-app-primary hover:shadow-[0_0_20px_rgba(2,179,109,0.15)] rounded-xl p-5 transition-all duration-300 relative overflow-hidden hover:-translate-y-1 animate-scale-in"
      style={{ animationDelay: `${0.1 + index * 0.05}s` }}
    >
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-app-primary-10 border border-app-primary-20 group-hover:bg-app-primary-20 transition-colors overflow-hidden">
          {metadata?.image ? (
            <img
              src={metadata.image}
              alt={metadata.symbol}
              className="w-5 h-5 rounded-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('span'), { className: 'block' })); }}
            />
          ) : (
            <TrendingUp size={20} className="color-primary" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => onCopy(e, token.address)} className="p-1.5 rounded-md text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-10 transition-colors" title="Copy Address">
            <Copy size={14} />
          </button>
          <button onClick={(e) => onRemove(e, token.address)} className="p-1.5 rounded-md text-app-secondary-60 hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Remove">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="relative z-10 space-y-1">
        {metadata?.name ? (
          <>
            <div className="font-bold text-app-primary truncate text-lg tracking-tight group-hover:text-app-primary-light transition-colors">{metadata.name}</div>
            <div className="font-mono text-xs text-app-secondary-60 truncate">{metadata.symbol} &middot; {formatAddress(token.address)}</div>
          </>
        ) : (
          <>
            <div className="font-mono text-xs text-app-secondary-60 uppercase tracking-wider">Token Address</div>
            <div className="font-mono text-app-primary font-bold truncate text-lg tracking-tight group-hover:text-app-primary-light transition-colors">{formatAddress(token.address)}</div>
          </>
        )}
      </div>
      <div className="relative z-10 mt-4 pt-4 border-t border-app-primary-10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-app-secondary-60 font-mono">
          <Clock size={12} />
          <span>{formatTimeAgo(token.lastViewed)}</span>
        </div>
        <div className="text-xs font-mono color-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">VIEW <ArrowRight size={12} /></div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>
  );
};

export const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const { tokens: multichartTokens } = useMultichart();
  const [recentTokens, setRecentTokens] = useState<RecentToken[]>([]);
  const [_isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [_tokensError, setTokensError] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const fullText = 'sol.raze.bot';

  // Typewriter animation effect
  useEffect(() => {
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        // Hide cursor after typing completes
        setTimeout(() => setShowCursor(false), 1500);
      }
    }, 150);

    return () => clearInterval(typeInterval);
  }, []);

  // Cursor blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(blinkInterval);
  }, []);
  
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    solPrice: '--',
    solChange: '--',
    solUp: true,
    tps: '--',
    epoch: '--',
    epochProgress: '--',
    avgFee: '--',
  });

  const fetchNetworkStats = useCallback(async (): Promise<void> => {
    try {
      // Fetch SOL price from CoinGecko
      const priceRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true'
      );
      const priceData = (await priceRes.json()) as CoinGeckoResponse;
      const solPrice: number = priceData.solana?.usd ?? 0;
      const solChange: number = priceData.solana?.usd_24h_change ?? 0;

      // Fetch Solana network stats using RPC connection
      let epoch = 0;
      let epochProgress = '0';
      let tps = 0;
      
      try {
        const connection = await createConnectionFromConfig();
        
        // Get epoch info
        const epochInfo = await connection.getEpochInfo();
        epoch = epochInfo.epoch;
        epochProgress = ((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100).toFixed(0);
        
        // Get TPS from recent performance samples
        const perfSamples = await connection.getRecentPerformanceSamples(1);
        if (perfSamples.length > 0) {
          const sample = perfSamples[0];
          tps = Math.round(sample.numTransactions / sample.samplePeriodSecs);
        }
      } catch (ignore) {
        // RPC error fetching performance, ignore
      }

      const avgFeeInSol = 0.000005; // Standard base fee

      setNetworkStats({
        solPrice: `$${solPrice.toFixed(2)}`,
        solChange: `${solChange >= 0 ? '+' : ''}${solChange.toFixed(1)}%`,
        solUp: solChange >= 0,
        tps: tps.toLocaleString(),
        epoch: epoch.toString(),
        epochProgress: `${epochProgress}%`,
        avgFee: avgFeeInSol.toFixed(6),
      });
    } catch (ignore) {
      // Network stats fetch error, ignore
    }
  }, []);

  useEffect(() => {
    void fetchNetworkStats();
    const interval = setInterval(() => { void fetchNetworkStats(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchNetworkStats]);

  useEffect(() => {
    try {
      setIsLoadingTokens(true);
      setTokensError(null);
      const tokens = getRecentTokens();
      setRecentTokens(tokens);
      // Prefetch metadata for all recent tokens
      prefetchTokenMetadata(tokens.map(t => t.address));
    } catch (ignore) {
      setTokensError('Failed to load recent tokens');
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  const handleClearHistory = (): void => {
    if (recentTokens.length === 0) return;
    const confirmed = window.confirm(
      'Are you sure you want to clear your recently viewed tokens history? This action cannot be undone.'
    );
    if (confirmed) {
      try {
        clearRecentTokens();
        setRecentTokens([]);
      } catch (ignore) {
        // Clear history error, ignore
      }
    }
  };

  const handleNavigateToToken = (tokenAddress: string): void => {
    navigate(`/tokens/${tokenAddress}`);
  };

  const handleExploreChart = (): void => {
    navigate('/monitor');
  };

  const handleRemoveToken = (e: React.MouseEvent, address: string): void => {
    e.stopPropagation();
    removeRecentToken(address);
    setRecentTokens(prev => prev.filter(t => t.address !== address));
  };

  const handleCopyAddress = async (e: React.MouseEvent, address: string): Promise<void> => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
    } catch (ignore) {
      // Clipboard error, ignore
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-app-primary flex flex-col font-sans">
      <OnboardingTutorial autoShowForNewUsers={true} />
      <HorizontalHeader />

      <div className="relative flex-1 overflow-y-auto overflow-x-hidden w-full pt-16 bg-app-primary">
        <PageBackground />

        <div className="relative z-10 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col items-center text-center space-y-6 py-12 animate-fade-in">

            <h1 
              className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight relative" 
              style={{ 
                fontFamily: "'Instrument Serif', serif",
                color: '#ffffff',
                textShadow: '0 0 30px rgba(2, 179, 109, 0.3), 0 0 10px rgba(255, 255, 255, 0.1)'
              }}
            >
              <span className="relative">
                {displayedText}
                <span 
                  className={`inline-block w-[4px] h-[0.9em] ml-1 transition-opacity duration-100 ${showCursor ? 'opacity-100' : 'opacity-0'}`}
                  style={{ 
                    backgroundColor: '#02b36d',
                    boxShadow: '0 0 10px rgba(2, 179, 109, 0.8), 0 0 20px rgba(2, 179, 109, 0.4)' 
                  }}
                />
              </span>
            </h1>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            {[
              { label: 'SOL PRICE', value: networkStats.solPrice, change: networkStats.solChange, up: networkStats.solUp },
              { label: 'NETWORK TPS', value: networkStats.tps },
              { label: 'EPOCH', value: networkStats.epoch, sub: `Progress: ${networkStats.epochProgress}` },
              { label: 'GAS (AVG)', value: networkStats.avgFee, sub: 'SOL' },
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-lg bg-app-secondary-90/30 border border-app-primary-10 flex flex-col justify-center">
                <div className="text-xs font-mono text-app-secondary-60 mb-1 tracking-wider">{stat.label}</div>
                <div className="text-xl md:text-2xl font-bold text-app-primary font-mono flex items-end gap-2">
                  {stat.value}
                  {stat.change && <span className={`text-xs mb-1 ${stat.up ? 'text-green-400' : 'text-red-400'}`}>{stat.change}</span>}
                  {stat.sub && <span className="text-xs mb-1 text-app-secondary-40">{stat.sub}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-app-primary-10 pb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold font-mono tracking-tight text-app-primary flex items-center gap-3">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 color-primary" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-app-primary-light to-app-primary-dark">RECENT ACTIVITY</span>
                </h2>
              </div>
              {recentTokens.length > 0 && (
                <button onClick={handleClearHistory} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-app-tertiary border border-app-primary-20 hover:border-app-primary hover:bg-app-primary-10 text-app-secondary hover:text-app-primary transition-all duration-300 group">
                  <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                  <span className="font-mono text-xs font-medium">CLEAR HISTORY</span>
                </button>
              )}
            </div>

            <div className="min-h-[200px]">
              {recentTokens.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentTokens
                    .filter((token) => !multichartTokens.some((mt) => mt.address === token.address))
                    .map((token, index) => (
                    <RecentTokenCard
                      key={token.address}
                      token={token}
                      index={index}
                      onNavigate={handleNavigateToToken}
                      onCopy={handleCopyAddress}
                      onRemove={handleRemoveToken}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-app-secondary-40/30 border border-app-primary-10 rounded-2xl backdrop-blur-sm border-dashed">
                  <div className="w-16 h-16 rounded-full bg-app-primary-05 flex items-center justify-center mb-4">
                    <Search size={32} className="color-primary opacity-60" />
                  </div>
                  <h3 className="text-lg font-bold text-app-primary font-mono mb-2">NO RECENT ACTIVITY</h3>
                  <p className="text-app-secondary-60 max-w-md mx-auto mb-6 font-mono text-sm">Your recently viewed tokens will appear here. Start by exploring the market.</p>
                  <button onClick={handleExploreChart} className="px-6 py-2 bg-app-primary-10 hover:bg-app-primary-20 text-app-primary font-mono text-sm font-bold rounded border border-app-primary-20 transition-all duration-300">EXPLORE MARKET</button>
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
