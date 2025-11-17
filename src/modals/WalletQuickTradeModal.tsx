import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Share, X, RotateCcw } from 'lucide-react';
import type { WalletType, CustomQuickTradeSettings, WalletCategory } from '../Utils';
import type { CategoryQuickTradeSettings } from './QuickTradeModal';

interface WalletQuickTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletType;
  categorySettings: Record<WalletCategory, CategoryQuickTradeSettings>;
  onSaveCustomSettings: (walletId: number, settings: CustomQuickTradeSettings | null) => void;
}

const buttonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};

export const WalletQuickTradeModal: React.FC<WalletQuickTradeModalProps> = ({
  isOpen,
  onClose,
  wallet,
  categorySettings,
  onSaveCustomSettings
}) => {
  const [useCustomSettings, setUseCustomSettings] = useState(!!wallet.customQuickTradeSettings);
  const [tempSettings, setTempSettings] = useState<CustomQuickTradeSettings>(() => {
    if (wallet.customQuickTradeSettings) {
      return wallet.customQuickTradeSettings;
    }
    // Initialize with category defaults
    const category = wallet.category || 'Medium';
    const categoryDefaults = categorySettings[category];
    return {
      buyAmount: categoryDefaults.buyAmount,
      buyMinAmount: categoryDefaults.buyMinAmount,
      buyMaxAmount: categoryDefaults.buyMaxAmount,
      useBuyRange: categoryDefaults.useBuyRange,
      sellPercentage: categoryDefaults.sellPercentage,
      sellMinPercentage: categoryDefaults.sellMinPercentage,
      sellMaxPercentage: categoryDefaults.sellMaxPercentage,
      useSellRange: categoryDefaults.useSellRange
    };
  });

  // Reset temp values when modal opens
  useEffect(() => {
    if (isOpen) {
      setUseCustomSettings(!!wallet.customQuickTradeSettings);
      if (wallet.customQuickTradeSettings) {
        setTempSettings(wallet.customQuickTradeSettings);
      } else {
        const category = wallet.category || 'Medium';
        const categoryDefaults = categorySettings[category];
        setTempSettings({
          buyAmount: categoryDefaults.buyAmount,
          buyMinAmount: categoryDefaults.buyMinAmount,
          buyMaxAmount: categoryDefaults.buyMaxAmount,
          useBuyRange: categoryDefaults.useBuyRange,
          sellPercentage: categoryDefaults.sellPercentage,
          sellMinPercentage: categoryDefaults.sellMinPercentage,
          sellMaxPercentage: categoryDefaults.sellMaxPercentage,
          useSellRange: categoryDefaults.useSellRange
        });
      }
    }
  }, [isOpen, wallet, categorySettings]);

  const updateSetting = <K extends keyof CustomQuickTradeSettings>(
    key: K,
    value: CustomQuickTradeSettings[K]
  ): void => {
    setTempSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = (): void => {
    if (useCustomSettings) {
      onSaveCustomSettings(wallet.id, tempSettings);
    } else {
      onSaveCustomSettings(wallet.id, null);
    }
    onClose();
  };

  const resetToCategory = (): void => {
    const category = wallet.category || 'Medium';
    const categoryDefaults = categorySettings[category];
    setTempSettings({
      buyAmount: categoryDefaults.buyAmount,
      buyMinAmount: categoryDefaults.buyMinAmount,
      buyMaxAmount: categoryDefaults.buyMaxAmount,
      useBuyRange: categoryDefaults.useBuyRange,
      sellPercentage: categoryDefaults.sellPercentage,
      sellMinPercentage: categoryDefaults.sellMinPercentage,
      sellMaxPercentage: categoryDefaults.sellMaxPercentage,
      useSellRange: categoryDefaults.useSellRange
    });
  };

  if (!isOpen) return null;

  const category = wallet.category || 'Medium';
  const categoryDefaults = categorySettings[category];

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-app-overlay flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-app-primary border border-app-primary-30 rounded-xl p-6 
                     w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-app-primary-20">
            <div>
              <h2 className="text-lg font-mono color-primary font-bold tracking-wider">
                WALLET QUICK TRADE SETTINGS
              </h2>
              <p className="text-xs text-app-secondary-80 mt-1 font-mono">
                {wallet.label || wallet.address.substring(0, 8)}... • Category: {category}
              </p>
            </div>
            <button
              onClick={onClose}
              className="color-primary hover-color-primary-light transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Use Custom Settings Toggle */}
          <div className="mb-6 p-4 bg-app-quaternary border border-app-primary-20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-mono color-primary text-sm mb-1">Custom Settings</div>
                <p className="text-xs text-app-secondary-80">
                  {useCustomSettings 
                    ? 'Using wallet-specific custom settings' 
                    : `Using ${category} category defaults`
                  }
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={resetToCategory}
                  disabled={!useCustomSettings}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 
                           bg-app-primary border border-app-primary-30 color-primary hover-color-primary-light
                           disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomSettings}
                    onChange={(e) => setUseCustomSettings(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-app-tertiary peer-focus:outline-none rounded-full peer 
                                peer-checked:after:translate-x-full peer-checked:after:border-white 
                                after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                after:bg-white after:border-gray-300 after:border after:rounded-full 
                                after:h-5 after:w-5 after:transition-all peer-checked:bg-app-primary-color">
                  </div>
                </label>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Buy Amount Configuration */}
            <motion.div 
              className={`transition-all duration-300 ${useCustomSettings ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
              animate={{ opacity: useCustomSettings ? 1 : 0.4 }}
            >
              <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-mono color-primary font-medium flex items-center gap-2">
                    <DollarSign size={16} />
                    Quick Buy Configuration
                  </h3>
                  {!useCustomSettings && (
                    <span className="text-xs text-app-secondary-80 font-mono">
                      (Category: {categoryDefaults.buyAmount} SOL)
                    </span>
                  )}
                </div>
                
                {/* Amount Type Toggle */}
                <div className="flex items-center gap-3 mb-4 p-3 bg-app-primary border border-app-primary-30 rounded-lg">
                  <div className="flex-1">
                    <div className="font-mono color-primary text-sm mb-1">Amount Type</div>
                    <p className="text-xs text-app-secondary-80">
                      {tempSettings.useBuyRange ? 'Random amounts for natural variation' : 'Fixed amount for consistency'}
                    </p>
                  </div>
                  
                  <div className="flex bg-app-secondary rounded-lg p-1 border border-app-primary-30">
                    <button
                      onClick={() => updateSetting('useBuyRange', false)}
                      disabled={!useCustomSettings}
                      className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                        !tempSettings.useBuyRange && useCustomSettings
                          ? 'bg-app-primary-color text-app-quaternary shadow-md'
                          : 'color-primary hover-color-primary-light'
                      }`}
                    >
                      Fixed
                    </button>
                    <button
                      onClick={() => updateSetting('useBuyRange', true)}
                      disabled={!useCustomSettings}
                      className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                        tempSettings.useBuyRange && useCustomSettings
                          ? 'bg-app-primary-color text-app-quaternary shadow-md'
                          : 'color-primary hover-color-primary-light'
                      }`}
                    >
                      Range
                    </button>
                  </div>
                </div>

                {/* Amount Inputs */}
                {tempSettings.useBuyRange ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                          <span>Min Amount</span>
                          <span className="text-app-secondary-80 text-xs">(SOL)</span>
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          max="10"
                          value={tempSettings.buyMinAmount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value >= 0.001 && value <= 10) {
                              updateSetting('buyMinAmount', value);
                              if (value >= (tempSettings.buyMaxAmount || 0)) {
                                updateSetting('buyMaxAmount', Math.min(value + 0.01, 10));
                              }
                            }
                          }}
                          disabled={!useCustomSettings}
                          className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                   text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                   transition-colors duration-200 disabled:opacity-50"
                          placeholder="0.01"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                          <span>Max Amount</span>
                          <span className="text-app-secondary-80 text-xs">(SOL)</span>
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min={(tempSettings.buyMinAmount || 0) + 0.001}
                          max="10"
                          value={tempSettings.buyMaxAmount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value > (tempSettings.buyMinAmount || 0) && value <= 10) {
                              updateSetting('buyMaxAmount', value);
                            }
                          }}
                          disabled={!useCustomSettings}
                          className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                   text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                   transition-colors duration-200 disabled:opacity-50"
                          placeholder="0.05"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                        <span>Fixed Amount</span>
                        <span className="text-app-secondary-80 text-xs">(SOL)</span>
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max="10"
                        value={tempSettings.buyAmount}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0.001 && value <= 10) {
                            updateSetting('buyAmount', value);
                          }
                        }}
                        disabled={!useCustomSettings}
                        className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                 text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                 transition-colors duration-200 disabled:opacity-50"
                        placeholder="0.01"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Sell Configuration */}
            <motion.div 
              className={`transition-all duration-300 ${useCustomSettings ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
              animate={{ opacity: useCustomSettings ? 1 : 0.4 }}
            >
              <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-mono color-primary font-medium flex items-center gap-2">
                    <Share size={16} />
                    Quick Sell Configuration
                  </h3>
                  {!useCustomSettings && (
                    <span className="text-xs text-app-secondary-80 font-mono">
                      (Category: {categoryDefaults.sellPercentage}%)
                    </span>
                  )}
                </div>
              
              {/* Percentage Type Toggle */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-app-primary border border-app-primary-30 rounded-lg">
                <div className="flex-1">
                  <div className="font-mono color-primary text-sm mb-1">Percentage Type</div>
                  <p className="text-xs text-app-secondary-80">
                    {tempSettings.useSellRange ? 'Random percentages for natural variation' : 'Fixed percentage for consistency'}
                  </p>
                </div>
                
                <div className="flex bg-app-secondary rounded-lg p-1 border border-app-primary-30">
                  <button
                    onClick={() => updateSetting('useSellRange', false)}
                    disabled={!useCustomSettings}
                    className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                      !tempSettings.useSellRange && useCustomSettings
                        ? 'bg-app-primary-color text-app-quaternary shadow-md'
                        : 'color-primary hover-color-primary-light'
                    }`}
                  >
                    Fixed
                  </button>
                  <button
                    onClick={() => updateSetting('useSellRange', true)}
                    disabled={!useCustomSettings}
                    className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                      tempSettings.useSellRange && useCustomSettings
                        ? 'bg-app-primary-color text-app-quaternary shadow-md'
                        : 'color-primary hover-color-primary-light'
                    }`}
                  >
                    Range
                  </button>
                </div>
              </div>

              {/* Percentage Inputs */}
              {tempSettings.useSellRange ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                        <span>Min Percentage</span>
                        <span className="text-app-secondary-80 text-xs">(%)</span>
                      </label>
                      <input
                        type="number"
                        step="5"
                        min="1"
                        max="100"
                        value={tempSettings.sellMinPercentage}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 1 && value <= 100) {
                            updateSetting('sellMinPercentage', value);
                            if (value >= (tempSettings.sellMaxPercentage || 0)) {
                              updateSetting('sellMaxPercentage', Math.min(value + 5, 100));
                            }
                          }
                        }}
                        disabled={!useCustomSettings}
                        className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                 text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                 transition-colors duration-200 disabled:opacity-50"
                        placeholder="25"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                        <span>Max Percentage</span>
                        <span className="text-app-secondary-80 text-xs">(%)</span>
                      </label>
                      <input
                        type="number"
                        step="5"
                        min={(tempSettings.sellMinPercentage || 0) + 5}
                        max="100"
                        value={tempSettings.sellMaxPercentage}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value > (tempSettings.sellMinPercentage || 0) && value <= 100) {
                            updateSetting('sellMaxPercentage', value);
                          }
                        }}
                        disabled={!useCustomSettings}
                        className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                 text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                 transition-colors duration-200 disabled:opacity-50"
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                      <span>Fixed Percentage</span>
                      <span className="text-app-secondary-80 text-xs">(1-100%)</span>
                    </label>
                    <input
                      type="number"
                      step="5"
                      min="1"
                      max="100"
                      value={tempSettings.sellPercentage}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1 && value <= 100) {
                          updateSetting('sellPercentage', value);
                        }
                      }}
                      disabled={!useCustomSettings}
                      className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                               text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                               transition-colors duration-200 disabled:opacity-50"
                      placeholder="100"
                    />
                  </div>
                </div>
              )}
            </div>
            </motion.div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-app-primary-20">
              <motion.button
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-lg border border-app-primary-30
                         color-primary hover-color-primary-light transition-colors duration-200
                         font-mono text-sm hover:bg-app-quaternary"
              >
                Cancel
              </motion.button>
              <motion.button
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={saveSettings}
                className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-app-primary-color to-app-primary-light
                         text-app-quaternary hover:from-app-primary-light hover:to-app-primary-color 
                         transition-all duration-200 font-mono text-sm shadow-lg"
              >
                Save Settings
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

