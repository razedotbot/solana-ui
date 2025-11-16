import React, { useState, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Zap, Utensils } from 'lucide-react';
import { useAppContext } from '../contexts/useAppContext';
import { UnifiedHeader } from '../components/Header';

// Lazy load deploy modals
const DeployPumpModal = lazy(() => import('../modals/DeployPumpModal').then(m => ({ default: m.DeployPumpModal })));
const DeployBonkModal = lazy(() => import('../modals/DeployBonkModal').then(m => ({ default: m.DeployBonkModal })));
const DeployCookModal = lazy(() => import('../modals/DeployCookModal').then(m => ({ default: m.DeployCookModal })));
const DeployMoonModal = lazy(() => import('../modals/DeployMoonModal').then(m => ({ default: m.DeployMoonModal })));
const DeployBoopModal = lazy(() => import('../modals/DeployBoopModal').then(m => ({ default: m.DeployBoopModal })));
const DeployBagsModal = lazy(() => import('../modals/DeployBagsModal').then(m => ({ default: m.DeployBagsModal })));
const DeployBagsSharedFeesModal = lazy(() => import('../modals/DeployBagsSharedModal').then(m => ({ default: m.DeployBagsSharedFeesModal })));

type DeployType = 'pump' | 'bonk' | 'cook' | 'moon' | 'boop' | 'bags' | 'fury';

export const DeployPage: React.FC = () => {
  const { wallets, solBalances, refreshBalances } = useAppContext();
  const [selectedDeployType, setSelectedDeployType] = useState<DeployType | null>(null);
  const [sharedFeesEnabled, setSharedFeesEnabled] = useState(false);

  const handleCloseModal = (): void => {
    setSelectedDeployType(null);
    setSharedFeesEnabled(false);
  };

  const handleRefresh = (): void => {
    void refreshBalances();
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  return (
    <div className="min-h-screen bg-app-primary text-app-tertiary">
      {/* Unified Header */}
      <UnifiedHeader />

      {/* Main Content - with left margin for sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-8 ml-48">
        <div className="mb-8">
          <h2 className="text-2xl font-mono color-primary font-bold mb-2">
            Choose Your Platform
          </h2>
          <p className="text-sm text-app-secondary-80">
            Select a platform to deploy your token. Each platform has unique features and requirements.
          </p>
        </div>

        {/* Deployment Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pump Deploy Option */}
          <motion.div 
            onClick={() => setSelectedDeployType('pump')}
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-6 transition-all duration-300 hover:border-app-primary-60 touch-manipulation"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                <Zap size={24} className="color-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold color-primary font-mono mb-2">PUMP.FUN</h3>
                <p className="text-sm text-app-secondary-80 leading-relaxed">
                  Create a new pump.fun token with customizable parameters. Includes liquidity setup and bonding curve.
                </p>
              </div>
              <div className="pt-2 border-t border-app-primary-10">
                <div className="text-xs text-app-secondary-60 font-mono">
                  • Fast deployment<br/>
                  • Built-in bonding curve<br/>
                  • Automatic liquidity
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bonk Deploy Option */}
          <motion.div 
            onClick={() => setSelectedDeployType('bonk')}
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-6 transition-all duration-300 hover:border-app-primary-60 touch-manipulation"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                <Rocket size={24} className="color-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold color-primary font-mono mb-2">BONKBOT</h3>
                <p className="text-sm text-app-secondary-80 leading-relaxed">
                  Deploy via Bonkbot with advanced features and automation capabilities.
                </p>
              </div>
              <div className="pt-2 border-t border-app-primary-10">
                <div className="text-xs text-app-secondary-60 font-mono">
                  • Bot integration<br/>
                  • Advanced automation<br/>
                  • Custom parameters
                </div>
              </div>
            </div>
          </motion.div>

          {/* Cook Deploy Option */}
          <motion.div 
            onClick={() => setSelectedDeployType('cook')}
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-6 transition-all duration-300 hover:border-app-primary-60 touch-manipulation"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                <Utensils size={24} className="color-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold color-primary font-mono mb-2">COOKBOT</h3>
                <p className="text-sm text-app-secondary-80 leading-relaxed">
                  Deploy through Cookbot with specialized features for token creation.
                </p>
              </div>
              <div className="pt-2 border-t border-app-primary-10">
                <div className="text-xs text-app-secondary-60 font-mono">
                  • Specialized tools<br/>
                  • Quick deployment<br/>
                  • Feature-rich
                </div>
              </div>
            </div>
          </motion.div>

          {/* Moon Deploy Option */}
          <motion.div 
            onClick={() => setSelectedDeployType('moon')}
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-6 transition-all duration-300 hover:border-app-primary-60 touch-manipulation"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                <span className="text-2xl">🌙</span>
              </div>
              <div>
                <h3 className="text-lg font-bold color-primary font-mono mb-2">MOONSHOT</h3>
                <p className="text-sm text-app-secondary-80 leading-relaxed">
                  Launch with Moonshot platform for maximum visibility and reach.
                </p>
              </div>
              <div className="pt-2 border-t border-app-primary-10">
                <div className="text-xs text-app-secondary-60 font-mono">
                  • High visibility<br/>
                  • Community focused<br/>
                  • Marketing tools
                </div>
              </div>
            </div>
          </motion.div>

          {/* Boop Deploy Option */}
          <motion.div 
            onClick={() => setSelectedDeployType('boop')}
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-6 transition-all duration-300 hover:border-app-primary-60 touch-manipulation"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                <span className="text-2xl">👆</span>
              </div>
              <div>
                <h3 className="text-lg font-bold color-primary font-mono mb-2">BOOP</h3>
                <p className="text-sm text-app-secondary-80 leading-relaxed">
                  Simple and efficient token deployment with Boop platform.
                </p>
              </div>
              <div className="pt-2 border-t border-app-primary-10">
                <div className="text-xs text-app-secondary-60 font-mono">
                  • Simple interface<br/>
                  • Fast processing<br/>
                  • Beginner friendly
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bags Deploy Option */}
          <motion.div 
            onClick={() => {
              setSharedFeesEnabled(false);
              setSelectedDeployType('bags');
            }}
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-6 transition-all duration-300 hover:border-app-primary-60 touch-manipulation"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <h3 className="text-lg font-bold color-primary font-mono mb-2">BAGS</h3>
                <p className="text-sm text-app-secondary-80 leading-relaxed">
                  Deploy with Bags for unique tokenomics and distribution features.
                </p>
              </div>
              <div className="pt-2 border-t border-app-primary-10">
                <div className="text-xs text-app-secondary-60 font-mono">
                  • Unique tokenomics<br/>
                  • Distribution tools<br/>
                  • Advanced features
                </div>
              </div>
            </div>
          </motion.div>

          {/* Fury (Bags Shared) Deploy Option */}
          <motion.div 
            onClick={() => {
              setSharedFeesEnabled(true);
              setSelectedDeployType('bags');
            }}
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-6 transition-all duration-300 hover:border-app-primary-60 touch-manipulation"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                <span className="text-2xl">🔥</span>
              </div>
              <div>
                <h3 className="text-lg font-bold color-primary font-mono mb-2">FURY (BAGS+)</h3>
                <p className="text-sm text-app-secondary-80 leading-relaxed">
                  Deploy with Bags platform featuring shared fee distribution model.
                </p>
              </div>
              <div className="pt-2 border-t border-app-primary-10">
                <div className="text-xs text-app-secondary-60 font-mono">
                  • Shared fees<br/>
                  • Community rewards<br/>
                  • Enhanced distribution
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Deploy Modals */}
      <Suspense fallback={null}>
        {selectedDeployType === 'pump' && (
          <DeployPumpModal
            isOpen={true}
            onClose={handleCloseModal}
            handleRefresh={handleRefresh}
            wallets={wallets}
            solBalances={solBalances}
          />
        )}
        {selectedDeployType === 'bonk' && (
          <DeployBonkModal
            isOpen={true}
            onClose={handleCloseModal}
            handleRefresh={handleRefresh}
            wallets={wallets}
            solBalances={solBalances}
          />
        )}
        {selectedDeployType === 'cook' && (
          <DeployCookModal
            isOpen={true}
            onClose={handleCloseModal}
            handleRefresh={handleRefresh}
            wallets={wallets}
            solBalances={solBalances}
          />
        )}
        {selectedDeployType === 'moon' && (
          <DeployMoonModal
            isOpen={true}
            onClose={handleCloseModal}
            handleRefresh={handleRefresh}
            wallets={wallets}
            solBalances={solBalances}
          />
        )}
        {selectedDeployType === 'boop' && (
          <DeployBoopModal
            isOpen={true}
            onClose={handleCloseModal}
            handleRefresh={handleRefresh}
            wallets={wallets}
            solBalances={solBalances}
          />
        )}
        {selectedDeployType === 'bags' && !sharedFeesEnabled && (
          <DeployBagsModal
            isOpen={true}
            onClose={handleCloseModal}
            handleRefresh={handleRefresh}
            wallets={wallets}
            solBalances={solBalances}
          />
        )}
        {selectedDeployType === 'bags' && sharedFeesEnabled && (
          <DeployBagsSharedFeesModal
            isOpen={true}
            onClose={handleCloseModal}
            handleRefresh={handleRefresh}
            wallets={wallets}
            solBalances={solBalances}
          />
        )}
      </Suspense>
    </div>
  );
};

export default DeployPage;

