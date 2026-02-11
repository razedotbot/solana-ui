import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  TrendingUp,
  X,
  Copy,
  Check,
  Trash2,
  Search
} from 'lucide-react';
const Interactive3DLogo = lazy(() => import('../components/Interactive3DLogo'));

import { getRecentTokens, clearRecentTokens, formatTimeAgo, removeRecentToken } from '../utils/recentTokens';
import type { RecentToken } from '../utils/types';
import { formatAddress } from '../utils/formatting';
import { HorizontalHeader } from '../components/Header';
import { PageBackground } from '../components/Styles';
import { OnboardingTutorial } from '../components/OnboardingTutorial';
import { createConnectionFromConfig } from '../utils/rpcManager';
import { useTokenMetadata, prefetchTokenMetadata } from '../utils/hooks/useTokenMetadata';
import { useMultichart } from '../contexts/MultichartContext';
import { loadViewModeFromCookies } from '../utils/storage';

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
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent): Promise<void> => {
    await onCopy(e, token.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      key={token.address}
      onClick={() => onNavigate(token.address)}
      className="group cursor-pointer bg-app-secondary-80/40 backdrop-blur-sm border border-app-primary-10 hover:border-app-primary hover:shadow-[0_0_15px_rgba(2,179,109,0.1)] rounded-lg p-3.5 transition-all duration-300 relative overflow-hidden animate-scale-in"
      style={{ animationDelay: `${0.05 + index * 0.04}s` }}
    >
      <div className="relative z-10 flex items-center gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-app-primary-10 border border-app-primary-20 group-hover:bg-app-primary-20 transition-colors flex items-center justify-center overflow-hidden">
          {metadata?.image ? (
            <img
              src={metadata.image}
              alt={metadata.symbol}
              className="w-5 h-5 rounded-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('span'), { className: 'block' })); }}
            />
          ) : (
            <TrendingUp size={16} className="color-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {metadata?.name ? (
            <div className="font-bold text-app-primary truncate text-sm tracking-tight group-hover:text-app-primary-light transition-colors">{metadata.name}</div>
          ) : (
            <div className="font-mono text-app-primary font-bold truncate text-sm tracking-tight group-hover:text-app-primary-light transition-colors">{formatAddress(token.address)}</div>
          )}
          <div className="font-mono text-[10px] text-app-secondary-60 truncate mt-0.5">
            {metadata?.symbol ? `${metadata.symbol} · ` : ''}{formatAddress(token.address)}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1">
          <span className="text-[10px] font-mono text-app-secondary-60 group-hover:hidden flex items-center gap-1">
            <Clock size={10} />{formatTimeAgo(token.lastViewed)}
          </span>
          <div className="hidden group-hover:flex items-center gap-1">
            <button onClick={handleCopy} className={`p-1 rounded transition-colors ${copied ? 'text-green-400' : 'text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-10'}`} title={copied ? 'Copied!' : 'Copy'}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
            <button onClick={(e) => onRemove(e, token.address)} className="p-1 rounded text-app-secondary-60 hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Remove">
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-app-primary-05 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </div>
  );
};

export const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const { tokens: multichartTokens, addToken: addMultichartToken } = useMultichart();
  const [recentTokens, setRecentTokens] = useState<RecentToken[]>([]);
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
      } catch {
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
    } catch {
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
      const tokens = getRecentTokens();
      setRecentTokens(tokens);
      // Prefetch metadata for all recent tokens
      prefetchTokenMetadata(tokens.map(t => t.address));
    } catch {
      // Token loading failed silently
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
      } catch {
        // Clear history error, ignore
      }
    }
  };

  const handleNavigateToToken = (tokenAddress: string): void => {
    const viewMode = loadViewModeFromCookies();
    if (viewMode === 'multichart') {
      addMultichartToken(tokenAddress);
      navigate('/monitor');
    } else {
      navigate(`/tokens/${tokenAddress}`);
    }
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
    } catch {
      // Clipboard error, ignore
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-app-primary flex flex-col font-sans">
      <OnboardingTutorial autoShowForNewUsers={true} />
      <HorizontalHeader />

      <div className="relative flex-1 overflow-y-auto overflow-x-hidden w-full pt-16 bg-app-primary">
        <PageBackground />

        <div className="relative z-10 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <div className="hero-section">
            {/* Vertical light beam */}
            <div className="hero-beam" />

            {/* Data streams */}
            {[
              { left: '8%', height: '80px', duration: '3s', delay: '0s' },
              { left: '18%', height: '120px', duration: '4.5s', delay: '1.2s' },
              { left: '32%', height: '60px', duration: '3.8s', delay: '2.5s' },
              { left: '68%', height: '100px', duration: '4s', delay: '0.8s' },
              { left: '82%', height: '70px', duration: '3.5s', delay: '1.8s' },
              { left: '92%', height: '90px', duration: '4.2s', delay: '3s' },
            ].map((s, i) => (
              <div key={`stream-${i}`} className="hero-stream" style={{
                left: s.left, height: s.height,
                animationDuration: s.duration, animationDelay: s.delay,
              }} />
            ))}

            {/* Floating geometric shapes */}
            {[
              { className: 'hero-geo-diamond', left: '12%', top: '25%', delay: '0s', dur: '7s' },
              { className: 'hero-geo-hex', left: '88%', top: '20%', delay: '1s', dur: '9s' },
              { className: 'hero-geo-ring', left: '6%', top: '60%', delay: '2s', dur: '8s' },
              { className: 'hero-geo-diamond', left: '92%', top: '55%', delay: '0.5s', dur: '10s' },
              { className: 'hero-geo-hex', left: '20%', top: '80%', delay: '3s', dur: '7.5s' },
              { className: 'hero-geo-ring', left: '78%', top: '75%', delay: '1.5s', dur: '8.5s' },
              { className: 'hero-geo-diamond', left: '45%', top: '8%', delay: '2.5s', dur: '9s' },
              { className: 'hero-geo-hex', left: '55%', top: '90%', delay: '4s', dur: '6.5s' },
            ].map((g, i) => (
              <div key={`geo-${i}`} className={`hero-geo ${g.className}`} style={{
                left: g.left, top: g.top,
                animationDelay: g.delay, animationDuration: g.dur,
              }} />
            ))}


            {/* 3D Model */}
            <Suspense fallback={null}><Interactive3DLogo /></Suspense>

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
                    .slice(0, 12)
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
