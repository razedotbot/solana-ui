import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Zap, Save, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '../contexts/useAppContext';
import { useToast } from '../components/useToast';
import { saveConfigToCookies } from '../Utils';
import { UnifiedHeader } from '../components/Header';
import type { ServerInfo } from '../types/api';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { config, setConfig } = useAppContext();

  const [currentRegion, setCurrentRegion] = useState<string>('US');
  const [availableServers, setAvailableServers] = useState<ServerInfo[]>([]);
  const [isChangingServer, setIsChangingServer] = useState(false);
  const [isLoadingServers, setIsLoadingServers] = useState(true);

  const handleConfigChange = (key: keyof typeof config, value: string): void => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
  };

  const handleSaveAndClose = (): void => {
    saveConfigToCookies(config);
    showToast('Settings saved successfully', 'success');
    navigate(-1);
  };

  const updateServerData = useCallback((): void => {
    if (window.serverRegion) {
      setCurrentRegion(window.serverRegion);
    }

    if (window.availableServers && window.availableServers.length > 0) {
      setAvailableServers(window.availableServers);
      setIsLoadingServers(false);
    }
  }, []);

  useEffect(() => {
    updateServerData();

    const handleServerUpdate = (): void => {
      updateServerData();
    };

    window.addEventListener('serverChanged', handleServerUpdate);

    return (): void => {
      window.removeEventListener('serverChanged', handleServerUpdate);
    };
  }, [updateServerData]);

  const handleServerSwitch = async (serverId: string): Promise<void> => {
    if (!window.switchServer) {
      console.error('Server switching not available');
      return;
    }

    setIsChangingServer(true);

    try {
      const success = await window.switchServer(serverId);
      if (success) {
        const server = availableServers.find((s): boolean => s.id === serverId);
        if (server) {
          setCurrentRegion(server.region);
          showToast(`Switched to ${server.name} (${server.region})`, 'success');
        }
      } else {
        console.error('Failed to switch server');
        showToast('Failed to switch trading server', 'error');
      }
    } catch (error) {
      console.error('Error switching server:', error);
      showToast('Error switching trading server', 'error');
    } finally {
      setIsChangingServer(false);
    }
  };

  const getPingColor = (ping?: number): string => {
    if (!ping || ping === Infinity) return 'text-app-secondary-40';
    if (ping < 50) return 'text-ping-good';
    if (ping < 100) return 'text-ping-medium';
    return 'text-ping-poor';
  };

  const getPingBg = (ping?: number): string => {
    if (!ping || ping === Infinity) return 'bg-app-primary-10';
    if (ping < 50) return 'bg-ping-good-10';
    if (ping < 100) return 'bg-ping-medium-20';
    return 'bg-ping-poor-10';
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
      <div className="max-w-4xl mx-auto px-4 py-8 ml-48">
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
                  onChange={(e) => handleConfigChange('rpcEndpoint', e.target.value)}
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
                  onChange={(e) => handleConfigChange('transactionFee', e.target.value)}
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
                  onClick={() => handleConfigChange('tradingServerEnabled', config.tradingServerEnabled === 'true' ? 'false' : 'true')}
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
                    onChange={(e) => handleConfigChange('tradingServerUrl', e.target.value)}
                    className="w-full bg-app-tertiary border border-app-primary-40 rounded p-2.5 sm:p-3 text-sm text-app-primary focus-border-primary focus:outline-none input font-mono touch-manipulation"
                    placeholder="http://localhost:4444"
                  />
                  <div className="text-[10px] sm:text-xs text-app-secondary-80 font-mono mt-1">
                    Enter the URL of your self-hosted trading API server
                  </div>
                </div>
              )}

              {config.tradingServerEnabled !== 'true' && (
                <div className="mt-2 sm:mt-3">
                  <label className="block text-xs sm:text-sm text-app-secondary font-mono mb-2 uppercase tracking-wider">
                    Trading Server Region
                  </label>
                  <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-3 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Wifi size={14} className="color-primary" />
                        <span className="text-xs sm:text-sm font-mono text-app-primary">
                          {isLoadingServers ? 'Detecting servers...' : `Current Region: ${currentRegion}`}
                        </span>
                      </div>
                      {isChangingServer && (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border border-app-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] font-mono text-app-secondary">SWITCHING</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {isLoadingServers ? (
                        <div className="text-[11px] sm:text-xs text-app-secondary font-mono">
                          Checking available trading servers...
                        </div>
                      ) : availableServers.length > 0 ? (
                        availableServers.map((server) => (
                          <button
                            key={server.id}
                            type="button"
                            onClick={(): void => void handleServerSwitch(server.id)}
                            disabled={isChangingServer}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded border text-left transition-all duration-200 touch-manipulation ${
                              server.region === currentRegion
                                ? 'bg-primary-10 border-app-primary color-primary'
                                : 'bg-app-quaternary border-app-primary-30 hover:border-primary-50 text-app-tertiary'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{server.flag}</span>
                              <div>
                                <div className="text-xs font-mono font-medium truncate">
                                  {server.name}
                                </div>
                                <div className="text-[10px] font-mono text-app-secondary truncate">
                                  {server.url}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {server.ping && server.ping < Infinity && (
                                <div
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${getPingBg(
                                    server.ping
                                  )} ${getPingColor(server.ping)}`}
                                >
                                  {server.ping}ms
                                </div>
                              )}
                              {server.region === currentRegion && (
                                <div className="w-1.5 h-1.5 bg-app-primary-color rounded-full" />
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-[11px] sm:text-xs text-app-secondary font-mono">
                          No trading servers are currently reachable. Please check your network or try again later.
                        </div>
                      )}
                    </div>
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
                      onClick={() => handleConfigChange('bundleMode', option.value)}
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
                    onChange={(e) => handleConfigChange('singleDelay', e.target.value)}
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
                    onChange={(e) => handleConfigChange('batchDelay', e.target.value)}
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
                    handleConfigChange('slippageBps', bps);
                  }}
                  className="w-full bg-app-tertiary border border-app-primary-40 rounded p-2.5 sm:p-3 text-sm text-app-primary focus-border-primary focus:outline-none input font-mono touch-manipulation"
                  placeholder="99.0"
                />
                <div className="text-[10px] sm:text-xs text-app-secondary-80 font-mono mt-1">
                  High slippage tolerance for volatile tokens (recommended: 99%)
                </div>
              </div>  
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-app-primary-20">
          <motion.button
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            onClick={() => navigate(-1)}
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
      </div>
    </div>
  );
};

