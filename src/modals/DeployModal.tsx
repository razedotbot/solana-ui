import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Zap, X, Utensils } from 'lucide-react';
import { DeployPumpModal } from './DeployPumpModal';
import { DeployBonkModal } from './DeployBonkModal';
import { DeployCookModal } from './DeployCookModal';
import { DeployMoonModal } from './DeployMoonModal';
import { DeployBoopModal } from './DeployBoopModal';
import { DeployBagsModal } from './DeployBagsModal';
import { DeployBagsSharedFeesModal } from './DeployBagsSharedModal';
import { useToast } from "../components/Notifications";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeployModalProps extends BaseModalProps {
  onDeploy: (data: any) => void;
  handleRefresh: () => void;
  solBalances: Map<string, number>;
}

export const DeployModal: React.FC<DeployModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
  handleRefresh,
  solBalances,
}) => {
  const [selectedDeployType, setSelectedDeployType] = useState<'pump' | 'bonk' | 'cook' | 'moon' | 'boop' | 'bags' | 'fury' | null>(null);
  const [sharedFeesEnabled, setSharedFeesEnabled] = useState(false);

  const { showToast } = useToast();

  if (!isOpen) return null;

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-app-overlay flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-app-primary border border-app-primary-30 rounded-xl p-6 
                     w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-app-primary-20">
            <h2 className="text-lg font-mono color-primary font-bold tracking-wider flex items-center gap-2">
              <Rocket size={16} />
              SELECT DEPLOY TYPE
            </h2>
            <button
              onClick={onClose}
              className="color-primary hover-color-primary-light transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Deployment Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Pump Deploy Option */}
            <motion.div 
              onClick={() => setSelectedDeployType('pump')}
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-4 transition-all duration-300 hover:border-app-primary-60 touch-manipulation flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                  <Zap size={20} className="color-primary" />
                </div>
                <h3 className="text-base font-bold color-primary font-mono">PUMP.FUN</h3>
                <p className="text-xs text-app-secondary-80 leading-relaxed">
                  Create a new pump.fun token with customizable parameters. Includes liquidity setup.
                </p>
              </div>
            </motion.div>

            {/* Bonk Deploy Option */}
            <motion.div 
              onClick={() => setSelectedDeployType('bonk')}
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-4 transition-all duration-300 hover:border-app-primary-60 touch-manipulation flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                  <Rocket size={20} className="color-primary" />
                </div>
                <h3 className="text-base font-bold color-primary font-mono">LETSBONK.FUN</h3>
                <p className="text-xs text-app-secondary-80 leading-relaxed">
                  Create a new letsbonk.fun token with customizable parameters. Includes liquidity setup.
                </p>
              </div>
            </motion.div>

            {/* bags.fm Deploy Option */}
            <motion.div 
              onClick={() => setSelectedDeployType('bags')}
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-4 transition-all duration-300 hover:border-app-primary-60 touch-manipulation flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                  <Utensils size={20} className="color-primary" />
                </div>
                <h3 className="text-base font-bold color-primary font-mono">BAGS.FM</h3>
                <p className="text-xs text-app-secondary-80 leading-relaxed">
                  Create a new bags.fm token.
                </p>
                
                {/* Shared Fees Toggle */}
                <div 
                  className="relative z-10 flex items-center justify-between pt-3 border-t border-app-primary-20 mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSharedFeesEnabled(!sharedFeesEnabled);
                  }}
                >
                  <span className="text-xs font-medium text-app-secondary-80 font-mono cursor-pointer">SHARED FEES</span>
                  <button
                    className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none pointer-events-none ${
                      sharedFeesEnabled ? 'bg-app-primary-color' : 'bg-app-primary-30'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        sharedFeesEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Cook.Meme Deploy Option */}
            <motion.div 
              onClick={() => setSelectedDeployType('cook')}
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-4 transition-all duration-300 hover:border-app-primary-60 touch-manipulation flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                  <Utensils size={20} className="color-primary" />
                </div>
                <h3 className="text-base font-bold color-primary font-mono">COOK.MEME</h3>
                <p className="text-xs text-app-secondary-80 leading-relaxed">
                  Create a new cook.meme token with customizable parameters. Includes liquidity setup.
                </p>
              </div>
            </motion.div>
            
            {/* moon.it Deploy Option */}
            <motion.div 
              onClick={() => setSelectedDeployType('moon')}
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-4 transition-all duration-300 hover:border-app-primary-60 touch-manipulation flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                  <Utensils size={20} className="color-primary" />
                </div>
                <h3 className="text-base font-bold color-primary font-mono">MOON.IT</h3>
                <p className="text-xs text-app-secondary-80 leading-relaxed">
                  Create a new moon.it token with customizable parameters. Includes liquidity setup.
                </p>
              </div>
            </motion.div>
            
            {/* boop.fun Deploy Option */}
            <motion.div 
              onClick={() => setSelectedDeployType('boop')}
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="cursor-pointer bg-app-quaternary border border-app-primary-20 rounded-lg p-4 transition-all duration-300 hover:border-app-primary-60 touch-manipulation flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-app-primary border border-app-primary-30 flex items-center justify-center">
                  <Utensils size={20} className="color-primary" />
                </div>
                <h3 className="text-base font-bold color-primary font-mono">BOOP.FUN</h3>
                <p className="text-xs text-app-secondary-80 leading-relaxed">
                  Create a new boop.fun token with customizable parameters. Includes liquidity setup.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Render selected modal */}
          {selectedDeployType === 'pump' && (
          <DeployPumpModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
        )}
        
        {/* Render Bonk Deploy Modal when selected */}
        {selectedDeployType === 'bonk' && (
          <DeployBonkModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
        )}
        
        {/* Render Cook Deploy Modal when selected */}
        {selectedDeployType === 'cook' && (
          <DeployCookModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
        )}
        {/* Render Moon Deploy Modal when selected */}
        {selectedDeployType === 'moon' && (
          <DeployMoonModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
        )}
        {/* Render Boop Deploy Modal when selected */}
        {selectedDeployType === 'boop' && (
          <DeployBoopModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
        )}
        {/* Render Bags Deploy Modal when selected */}
        {selectedDeployType === 'bags' && !sharedFeesEnabled && (
          <DeployBagsModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
        )}
        {/* Render Bags Shared Deploy Modal when selected with shared fees */}
        {selectedDeployType === 'bags' && sharedFeesEnabled && (
          <DeployBagsSharedFeesModal
            isOpen={true}
            onClose={() => setSelectedDeployType(null)}
            onDeploy={onDeploy}
            handleRefresh={handleRefresh}
            solBalances={solBalances}
          />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};