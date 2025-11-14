import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Globe, Zap, Save } from 'lucide-react';
import type { Connection } from '@solana/web3.js';
import type { ConfigType } from '../Utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfigType;
  onConfigChange: (key: keyof ConfigType, value: string) => void;
  onSave: () => void;
  connection: Connection | null;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
  onSave,
  connection,
  showToast
}) => {
  if (!isOpen) return null;

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  const handleSaveAndClose = (): void => {
    onSave();
    showToast('Settings saved successfully', 'success');
    onClose();
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
                     w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-app-primary-20">
            <h2 className="text-lg font-mono color-primary font-bold tracking-wider flex items-center gap-2">
              <Settings size={16} />
              ADVANCED SETTINGS
            </h2>
            <button
              onClick={onClose}
              className="color-primary hover-color-primary-light transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
            <div className="space-y-4 sm:space-y-6">
              {/* Network Configuration Section */}
              <div className="bg-app-secondary border border-app-primary-30 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-app-primary font-mono mb-3 sm:mb-4 flex items-center gap-2">
                  <Globe size={18} className="sm:w-5 sm:h-5 color-primary" />
                  NETWORK CONFIGURATION
                </h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm text-app-secondary font-mono mb-2 uppercase tracking-wider">
                      RPC Endpoint
                    </label>
                    <input
                      type="text"
                      value={config.rpcEndpoint}
                      onChange={(e) => onConfigChange('rpcEndpoint', e.target.value)}
                      className="w-full bg-app-tertiary border border-app-primary-40 rounded p-2.5 sm:p-3 text-sm text-app-primary focus-border-primary focus:outline-none input font-mono touch-manipulation"
                      placeholder="Enter RPC endpoint URL"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm text-app-secondary font-mono mb-2 uppercase tracking-wider">
                      Transaction Fee (SOL)
                    </label>
                    <input
                      type="text"
                      value={config.transactionFee}
                      onChange={(e) => onConfigChange('transactionFee', e.target.value)}
                      className="w-full bg-app-tertiary border border-app-primary-40 rounded p-2.5 sm:p-3 text-sm text-app-primary focus-border-primary focus:outline-none input font-mono touch-manipulation"
                      placeholder="0.000005"
                    />
                  </div>
                </div>
              </div>

              {/* Trading Server Configuration Section */}
              <div className="bg-app-secondary border border-app-primary-30 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-app-primary font-mono mb-3 sm:mb-4 flex items-center gap-2">
                  <Globe size={18} className="sm:w-5 sm:h-5 color-primary" />
                  TRADING SERVER
                </h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between p-2.5 sm:p-3 bg-app-tertiary border border-app-primary-30 rounded-lg gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-app-primary font-mono">Enable Self-Hosted Trading API</div>
                      <div className="text-[10px] sm:text-xs text-app-secondary font-mono">Use your own trading server instead of default service</div>
                    </div>
                    <button
                      onClick={() => onConfigChange('tradingServerEnabled', config.tradingServerEnabled === 'true' ? 'false' : 'true')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-manipulation flex-shrink-0 ${
                        config.tradingServerEnabled === 'true' ? 'bg-app-primary-color' : 'bg-app-primary-30'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          config.tradingServerEnabled === 'true' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {config.tradingServerEnabled === 'true' && (
                    <div>
                      <label className="block text-xs sm:text-sm text-app-secondary font-mono mb-2 uppercase tracking-wider">
                        Trading Server URL
                      </label>
                      <input
                        type="text"
                        value={config.tradingServerUrl || 'http://localhost:4444'}
                        onChange={(e) => onConfigChange('tradingServerUrl', e.target.value)}
                        className="w-full bg-app-tertiary border border-app-primary-40 rounded p-2.5 sm:p-3 text-sm text-app-primary focus-border-primary focus:outline-none input font-mono touch-manipulation"
                        placeholder="http://localhost:4444"
                      />
                      <div className="text-[10px] sm:text-xs text-app-secondary-80 font-mono mt-1">
                        Enter the URL of your self-hosted trading API server
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Trading Configuration Section */}
              <div className="bg-app-secondary border border-app-primary-30 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-app-primary font-mono mb-3 sm:mb-4 flex items-center gap-2">
                  <Zap size={18} className="sm:w-5 sm:h-5 color-primary" />
                  TRADING CONFIGURATION
                </h3>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm text-app-secondary font-mono mb-2 uppercase tracking-wider">
                      Default Bundle Mode
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { value: 'single', label: '🔄 Single', description: 'Each wallet sent separately' },
                        { value: 'batch', label: '📦 Batch', description: '5 wallets per bundle' },
                        { value: 'all-in-one', label: '🚀 All-in-one', description: 'All wallets prepared first, then sent concurrently' }
                      ].map(option => (
                        <div 
                          key={option.value}
                          className={`p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all touch-manipulation ${
                            config.bundleMode === option.value 
                              ? 'border-app-primary bg-primary-10' 
                              : 'border-app-primary-30 hover:border-primary-50'
                          }`}
                          onClick={() => onConfigChange('bundleMode', option.value)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-medium text-app-primary font-mono">
                                  {option.label}
                                </div>
                                <div className="text-[10px] sm:text-xs text-app-secondary font-mono">
                                  {option.description}
                                </div>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                              config.bundleMode === option.value 
                                ? 'border-app-primary bg-app-primary-color' 
                                : 'border-app-primary-30'
                            }`}>
                              {config.bundleMode === option.value && (
                                <div className="w-full h-full rounded-full bg-app-primary-color flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-app-primary"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] sm:text-xs text-app-secondary-80 font-mono mt-2">
                      This will be the default bundle mode for new trading operations
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm text-app-secondary font-mono mb-2 uppercase tracking-wider">
                        Single Mode Delay (ms)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="5000"
                        step="50"
                        value={config.singleDelay || '200'}
                        onChange={(e) => onConfigChange('singleDelay', e.target.value)}
                        className="w-full bg-app-tertiary border border-app-primary-40 rounded p-2.5 sm:p-3 text-sm text-app-primary focus-border-primary focus:outline-none input font-mono touch-manipulation"
                        placeholder="200"
                      />
                      <div className="text-[10px] sm:text-xs text-app-secondary-80 font-mono mt-1">
                        Delay between wallets in single mode
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm text-app-secondary font-mono mb-2 uppercase tracking-wider">
                        Batch Mode Delay (ms)
                      </label>
                      <input
                        type="number"
                        min="100"
                        max="10000"
                        step="100"
                        value={config.batchDelay || '1000'}
                        onChange={(e) => onConfigChange('batchDelay', e.target.value)}
                        className="w-full bg-app-tertiary border border-app-primary-40 rounded p-2.5 sm:p-3 text-sm text-app-primary focus-border-primary focus:outline-none input font-mono touch-manipulation"
                        placeholder="1000"
                      />
                      <div className="text-[10px] sm:text-xs text-app-secondary-80 font-mono mt-1">
                        Delay between batches in batch mode
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm text-app-secondary font-mono mb-2 uppercase tracking-wider">
                      Default Slippage (%)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={config.slippageBps ? (parseFloat(config.slippageBps) / 100).toString() : '99'}
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value) || 99;
                        const bps = Math.round(percentage * 100).toString();
                        onConfigChange('slippageBps', bps);
                      }}
                      className="w-full bg-app-tertiary border border-app-primary-40 rounded p-2.5 sm:p-3 text-sm text-app-primary focus-border-primary focus:outline-none input font-mono touch-manipulation"
                      placeholder="99.0"
                    />
                    <div className="text-[10px] sm:text-xs text-app-secondary-80 font-mono mt-1">
                      High slippage tolerance for volatile tokens (recommended: 99%)
                    </div>
                  </div>  
                  <div className="bg-app-tertiary border border-app-primary-20 rounded p-3 sm:p-4">
                    <h4 className="text-xs sm:text-sm font-bold text-app-primary font-mono mb-2">SYSTEM INFORMATION</h4>
                    <div className="space-y-2 text-xs sm:text-sm font-mono">
                      <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0">
                        <span className="text-app-secondary">Connection Status:</span>
                        <span className={connection ? 'color-primary' : 'text-error-alt'}>
                          {connection ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0">
                        <span className="text-app-secondary">RPC Endpoint:</span>
                        <span className="text-app-primary truncate sm:ml-2" title={config.rpcEndpoint}>
                          {config.rpcEndpoint.length > 30 ? config.rpcEndpoint.substring(0, 30) + '...' : config.rpcEndpoint}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 pt-4 border-t border-app-primary-20">
            <motion.button
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              onClick={onClose}
              className="px-6 py-3 border border-app-primary-30 rounded-lg font-mono text-sm transition-all duration-200 color-primary hover-color-primary-light hover:bg-app-quaternary order-2 sm:order-1"
          >
            CANCEL
          </motion.button>
            <motion.button
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              onClick={handleSaveAndClose}
              className="px-6 py-3 bg-gradient-to-r from-app-primary-color to-app-primary-light
                       text-app-quaternary hover:from-app-primary-light hover:to-app-primary-color 
                       transition-all duration-200 font-mono tracking-wider rounded-lg shadow-lg flex items-center justify-center gap-2 text-sm order-1 sm:order-2"
            >
              <Save size={14} />
              SAVE SETTINGS
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default SettingsModal;