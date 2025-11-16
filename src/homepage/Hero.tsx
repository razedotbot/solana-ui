import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Wifi, WifiOff, Users, Coins, Clock } from 'lucide-react';
import type { Connection } from '@solana/web3.js';
import type { WalletType } from '../Utils';
import { formatSolBalance } from '../utils/formatting';

interface HeroProps {
  wallets?: WalletType[];
  solBalances?: Map<string, number>;
  connection?: Connection | null;
  recentTokensCount?: number;
}

export const Hero: React.FC<HeroProps> = ({ 
  wallets, 
  solBalances, 
  connection,
  recentTokensCount = 0
}) => {
  // Calculate wallet statistics
  const walletStats = useMemo(() => {
    const totalWallets = wallets?.length || 0;
    const activeWallets = wallets?.filter(w => w.isActive).length || 0;
    const totalSol = Array.from(solBalances?.values() || []).reduce((sum, balance) => sum + balance, 0);
    const activeSol = wallets?.filter(w => w.isActive).reduce((sum, wallet) => 
      sum + (solBalances?.get(wallet.address) || 0), 0) || 0;
    
    return {
      totalWallets,
      activeWallets,
      totalSol,
      activeSol,
      isConnected: !!connection
    };
  }, [wallets, solBalances, connection]);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="relative overflow-hidden rounded-xl shadow-xl bg-gradient-to-br from-app-secondary-80 to-app-primary-dark-50 backdrop-blur-sm p-4 md:p-6 lg:p-8 border border-app-primary-20"
    >
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none">
        <div className="absolute top-0 left-0 w-px h-8 bg-gradient-to-b from-app-primary-color to-transparent"></div>
        <div className="absolute top-0 left-0 w-8 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none">
        <div className="absolute top-0 right-0 w-px h-8 bg-gradient-to-b from-app-primary-color to-transparent"></div>
        <div className="absolute top-0 right-0 w-8 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
      </div>

      <div className="text-center space-y-4 md:space-y-6">
        {/* Icon/logo element */}
        <div className="flex justify-center">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary-20 border-2 border-app-primary-40 flex items-center justify-center">
            <Zap size={24} className="color-primary md:w-8 md:h-8" />
          </div>
        </div>

        {/* Welcome heading with app name */}
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-mono tracking-wider uppercase color-primary font-bold">
          Welcome to Raze
        </h1>

        {/* Brief description/tagline */}
        <p className="text-sm md:text-base lg:text-lg text-app-secondary font-mono tracking-wider">
          Your multi-wallet Solana trading terminal
        </p>

        {/* Wallet Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
          {/* Connection Status */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-app-primary border border-app-primary-30 rounded-lg p-3 md:p-4"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              {walletStats.isConnected ? (
                <Wifi size={16} className="color-primary" />
              ) : (
                <WifiOff size={16} className="text-app-secondary-60" />
              )}
              <span className="text-xs font-mono text-app-secondary uppercase">
                {walletStats.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </motion.div>

          {/* Total Wallets */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="bg-app-primary border border-app-primary-30 rounded-lg p-3 md:p-4"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users size={16} className="color-primary" />
              <span className="text-xs font-mono text-app-secondary uppercase">Wallets</span>
            </div>
            <div className="text-lg md:text-xl font-mono color-primary font-bold text-center">
              {walletStats.totalWallets}
            </div>
            {walletStats.activeWallets > 0 && (
              <div className="text-xs text-app-secondary-60 font-mono text-center mt-1">
                {walletStats.activeWallets} active
              </div>
            )}
          </motion.div>

          {/* Total SOL */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-app-primary border border-app-primary-30 rounded-lg p-3 md:p-4"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins size={16} className="color-primary" />
              <span className="text-xs font-mono text-app-secondary uppercase">Total SOL</span>
            </div>
            <div className="text-lg md:text-xl font-mono color-primary font-bold text-center">
              {formatSolBalance(walletStats.totalSol)}
            </div>
            {walletStats.activeSol > 0 && walletStats.activeSol !== walletStats.totalSol && (
              <div className="text-xs text-app-secondary-60 font-mono text-center mt-1">
                {formatSolBalance(walletStats.activeSol)} active
              </div>
            )}
          </motion.div>

          {/* Recent Tokens Count */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="bg-app-primary border border-app-primary-30 rounded-lg p-3 md:p-4"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock size={16} className="color-primary" />
              <span className="text-xs font-mono text-app-secondary uppercase">Recent</span>
            </div>
            <div className="text-lg md:text-xl font-mono color-primary font-bold text-center">
              {recentTokensCount}
            </div>
            <div className="text-xs text-app-secondary-60 font-mono text-center mt-1">
              tokens
            </div>
          </motion.div>
        </div>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent pointer-events-none"></div>
    </motion.div>
  );
};

export default Hero;

