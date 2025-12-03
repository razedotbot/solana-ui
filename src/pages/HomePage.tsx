import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  TrendingUp,
  X,
  Copy,
  Trash2,
  ArrowRight,
  Search,
  Rocket,
  Activity
} from 'lucide-react';

import { getRecentTokens, clearRecentTokens, formatTimeAgo, removeRecentToken } from '../utils/recentTokens';
import type { RecentToken } from '../utils/types';
import { formatAddress } from '../utils/formatting';
import { HorizontalHeader } from '../components/HorizontalHeader';
import { OnboardingTutorial } from '../components/OnboardingTutorial';
import { createConnectionFromConfig } from '../utils/rpcManager';

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





export const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const [recentTokens, setRecentTokens] = useState<RecentToken[]>([]);
  const [_isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [_tokensError, setTokensError] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const fullText = 'app.raze.bot';

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
      } catch (rpcError) {
        console.error('Failed to fetch Solana network stats from RPC:', rpcError);
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
    } catch (error) {
      console.error('Error fetching network stats:', error);
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
    } catch (error) {
      console.error('Error loading recent tokens:', error);
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
      } catch (error) {
        console.error('Error clearing recent tokens:', error);
      }
    }
  };

  const handleNavigateToToken = (tokenAddress: string): void => {
    navigate(`/tokens/${tokenAddress}`);
  };

  const handleExploreChart = (): void => {
    navigate('/monitor');
  };

  const handleNavigateHome = (): void => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-app-primary flex flex-col font-sans">
      <OnboardingTutorial autoShowForNewUsers={true} />
      <HorizontalHeader onNavigateHome={handleNavigateHome} />

      <div className="relative flex-1 overflow-y-auto overflow-x-hidden w-full pt-16 bg-app-primary">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-app-primary opacity-90">
            <div className="absolute inset-0 bg-gradient-to-b from-app-primary-05 to-transparent"></div>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(rgba(2, 179, 109, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(2, 179, 109, 0.05) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
                backgroundPosition: 'center center',
              }}
            ></div>
          </div>
          <div className="absolute top-0 left-0 w-64 h-64 opacity-20">
            <div className="absolute top-0 left-0 w-px h-32 bg-gradient-to-b from-app-primary-color to-transparent"></div>
            <div className="absolute top-0 left-0 w-32 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 opacity-20">
            <div className="absolute top-0 right-0 w-px h-32 bg-gradient-to-b from-app-primary-color to-transparent"></div>
            <div className="absolute top-0 right-0 w-32 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
          </div>
          <div className="absolute inset-0 scanline pointer-events-none opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent pointer-events-none"></div>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-app-primary-color opacity-[0.03] blur-[120px] rounded-full pointer-events-none"></div>
        </div>

        <div className="relative z-10 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col items-center text-center space-y-6 py-12 animate-fade-in">

            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/60 relative drop-shadow-[0_0_30px_rgba(2,179,109,0.3)]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              <span className="relative">
                {displayedText}
                <span 
                  className={`inline-block w-[4px] h-[0.9em] ml-1 bg-app-primary-color align-middle transition-opacity duration-100 ${showCursor ? 'opacity-100' : 'opacity-0'}`}
                  style={{ boxShadow: '0 0 10px rgba(2, 179, 109, 0.8), 0 0 20px rgba(2, 179, 109, 0.4)' }}
                />
              </span>
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button onClick={handleExploreChart} className="px-8 py-3 bg-app-primary-color hover:bg-app-primary-light text-app-quaternary font-bold rounded-lg transition-all duration-300 flex items-center gap-2 hover:shadow-[0_0_30px_rgba(2,179,109,0.3)] hover:-translate-y-1">
                <Activity size={20} />
                <span>START TRADING</span>
              </button>
              <button onClick={() => navigate('/deploy')} className="px-8 py-3 bg-app-secondary-80/50 hover:bg-app-secondary-60/50 backdrop-blur-md border border-app-primary-20 hover:border-app-primary text-app-primary font-bold rounded-lg transition-all duration-300 flex items-center gap-2 hover:-translate-y-1">
                <Rocket size={20} />
                <span>DEPLOY TOKEN</span>
              </button>
            </div>
            
            {/* Social Icons */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <a href="https://github.com/razedotbot" target="_blank" rel="noopener noreferrer" className="p-3 rounded-lg bg-app-secondary-80/50 border border-app-primary-20 hover:border-app-primary hover:bg-app-primary-10 text-app-secondary-60 hover:text-app-primary transition-all duration-300 hover:-translate-y-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a href="https://t.me/razesolana" target="_blank" rel="noopener noreferrer" className="p-3 rounded-lg bg-app-secondary-80/50 border border-app-primary-20 hover:border-app-primary hover:bg-app-primary-10 text-app-secondary-60 hover:text-app-primary transition-all duration-300 hover:-translate-y-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
              <a href="https://discord.com/invite/RNK5v92XpB" target="_blank" rel="noopener noreferrer" className="p-3 rounded-lg bg-app-secondary-80/50 border border-app-primary-20 hover:border-app-primary hover:bg-app-primary-10 text-app-secondary-60 hover:text-app-primary transition-all duration-300 hover:-translate-y-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                </svg>
              </a>
            </div>
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
                  {recentTokens.map((token, index) => (
                    <div
                      key={token.address}
                      onClick={() => handleNavigateToToken(token.address)}
                      className="group cursor-pointer bg-app-secondary-80/50 backdrop-blur-md border border-app-primary-20 hover:border-app-primary hover:shadow-[0_0_20px_rgba(2,179,109,0.15)] rounded-xl p-5 transition-all duration-300 relative overflow-hidden hover:-translate-y-1 animate-scale-in"
                      style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                    >
                      <div className="relative z-10 flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-app-primary-10 border border-app-primary-20 group-hover:bg-app-primary-20 transition-colors">
                          <TrendingUp size={20} className="color-primary" />
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => handleCopyAddress(e, token.address)} className="p-1.5 rounded-md text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-10 transition-colors" title="Copy Address">
                            <Copy size={14} />
                          </button>
                          <button onClick={(e) => handleRemoveToken(e, token.address)} className="p-1.5 rounded-md text-app-secondary-60 hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Remove">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="relative z-10 space-y-1">
                        <div className="font-mono text-xs text-app-secondary-60 uppercase tracking-wider">Token Address</div>
                        <div className="font-mono text-app-primary font-bold truncate text-lg tracking-tight group-hover:text-app-primary-light transition-colors">{formatAddress(token.address)}</div>
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
