import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Share, X } from 'lucide-react';
import type { WalletCategory } from '../Utils';

export interface CategoryQuickTradeSettings {
  enabled: boolean;
  buyAmount: number;
  buyMinAmount: number;
  buyMaxAmount: number;
  useBuyRange: boolean;
  sellPercentage: number;
  sellMinPercentage: number;
  sellMaxPercentage: number;
  useSellRange: boolean;
}

interface QuickTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  categorySettings: Record<WalletCategory, CategoryQuickTradeSettings>;
  setCategorySettings: (settings: Record<WalletCategory, CategoryQuickTradeSettings>) => void;
}

const buttonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};

const categories: WalletCategory[] = ['Soft', 'Medium', 'Hard'];
const categoryColors = {
  Soft: 'bg-green-500/20 text-green-400 border-green-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Hard: 'bg-red-500/20 text-red-400 border-red-500/30'
};

export const QuickTradeModal: React.FC<QuickTradeModalProps> = ({
  isOpen,
  onClose,
  categorySettings,
  setCategorySettings
}) => {
  const [selectedCategory, setSelectedCategory] = useState<WalletCategory>('Medium');
  const [tempSettings, setTempSettings] = useState<Record<WalletCategory, CategoryQuickTradeSettings>>(categorySettings);

  // Reset temp values and selected category when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSettings(categorySettings);
      setSelectedCategory('Medium');
    }
  }, [isOpen, categorySettings]);

  const currentSettings = tempSettings[selectedCategory];

  const updateCategorySetting = <K extends keyof CategoryQuickTradeSettings>(
    category: WalletCategory,
    key: K,
    value: CategoryQuickTradeSettings[K]
  ): void => {
    setTempSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const saveSettings = (): void => {
    setCategorySettings(tempSettings);
    onClose();
  };

  if (!isOpen) return null;

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
                     w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-app-primary-20">
            <h2 className="text-lg font-mono color-primary font-bold tracking-wider">QUICK TRADE SETTINGS</h2>
            <button
              onClick={onClose}
              className="color-primary hover-color-primary-light transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 mb-6">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-1 py-2 px-4 rounded-lg font-mono text-sm transition-all duration-200 border ${
                  selectedCategory === category
                    ? `${categoryColors[category]} border-current shadow-md`
                    : 'bg-app-quaternary border-app-primary-30 color-primary hover-color-primary-light'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          
          <div className="space-y-6">
            {/* Buy Amount Configuration */}
            <motion.div 
              className={`transition-all duration-300 ${currentSettings.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
              animate={{ opacity: currentSettings.enabled ? 1 : 0.4 }}
            >
              <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-mono color-primary font-medium flex items-center gap-2">
                    <DollarSign size={16} />
                    Quick Buy Configuration
                  </h3>
                </div>
                
                {/* Amount Type Toggle */}
                <div className="flex items-center gap-3 mb-4 p-3 bg-app-primary border border-app-primary-30 rounded-lg">
                  <div className="flex-1">
                    <div className="font-mono color-primary text-sm mb-1">Amount Type</div>
                    <p className="text-xs text-app-secondary-80">
                      {currentSettings.useBuyRange ? 'Random amounts for natural variation' : 'Fixed amount for consistency'}
                    </p>
                  </div>
                  
                  <div className="flex bg-app-secondary rounded-lg p-1 border border-app-primary-30">
                    <button
                      onClick={() => updateCategorySetting(selectedCategory, 'useBuyRange', false)}
                      disabled={!currentSettings.enabled}
                      className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                        !currentSettings.useBuyRange && currentSettings.enabled
                          ? 'bg-app-primary-color text-app-quaternary shadow-md'
                          : 'color-primary hover-color-primary-light'
                      }`}
                    >
                      Fixed
                    </button>
                    <button
                      onClick={() => updateCategorySetting(selectedCategory, 'useBuyRange', true)}
                      disabled={!currentSettings.enabled}
                      className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                        currentSettings.useBuyRange && currentSettings.enabled
                          ? 'bg-app-primary-color text-app-quaternary shadow-md'
                          : 'color-primary hover-color-primary-light'
                      }`}
                    >
                      Range
                    </button>
                  </div>
                </div>

                {/* Amount Inputs */}
                {currentSettings.useBuyRange ? (
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
                          value={currentSettings.buyMinAmount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value >= 0.001 && value <= 10) {
                              updateCategorySetting(selectedCategory, 'buyMinAmount', value);
                              if (value >= currentSettings.buyMaxAmount) {
                                updateCategorySetting(selectedCategory, 'buyMaxAmount', Math.min(value + 0.01, 10));
                              }
                            }
                          }}
                          disabled={!currentSettings.enabled}
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
                          min={currentSettings.buyMinAmount + 0.001}
                          max="10"
                          value={currentSettings.buyMaxAmount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value > currentSettings.buyMinAmount && value <= 10) {
                              updateCategorySetting(selectedCategory, 'buyMaxAmount', value);
                            }
                          }}
                          disabled={!currentSettings.enabled}
                          className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                   text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                   transition-colors duration-200 disabled:opacity-50"
                          placeholder="0.05"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-app-primary border border-app-primary-20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-app-primary-color rounded-full animate-pulse"></div>
                        <span className="text-xs font-mono color-primary">Preview</span>
                      </div>
                      <p className="text-xs text-app-secondary-80">
                        Each quick buy will randomly spend between <span className="color-primary font-mono">{currentSettings.buyMinAmount.toFixed(3)}</span> and <span className="color-primary font-mono">{currentSettings.buyMaxAmount.toFixed(3)}</span> SOL
                      </p>
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
                        value={currentSettings.buyAmount}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0.001 && value <= 10) {
                            updateCategorySetting(selectedCategory, 'buyAmount', value);
                          }
                        }}
                        disabled={!currentSettings.enabled}
                        className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                 text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                 transition-colors duration-200 disabled:opacity-50"
                        placeholder="0.01"
                      />
                      <p className="text-xs text-app-secondary-80 mt-2">
                        Fixed amount of SOL to spend on each quick buy
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Sell Configuration */}
            <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
              <h3 className="font-mono color-primary font-medium mb-4 flex items-center gap-2">
                <Share size={16} />
                Quick Sell Configuration
              </h3>
              
              {/* Percentage Type Toggle */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-app-primary border border-app-primary-30 rounded-lg">
                <div className="flex-1">
                  <div className="font-mono color-primary text-sm mb-1">Percentage Type</div>
                  <p className="text-xs text-app-secondary-80">
                    {currentSettings.useSellRange ? 'Random percentages for natural variation' : 'Fixed percentage for consistency'}
                  </p>
                </div>
                
                <div className="flex bg-app-secondary rounded-lg p-1 border border-app-primary-30">
                  <button
                    onClick={() => updateCategorySetting(selectedCategory, 'useSellRange', false)}
                    className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                      !currentSettings.useSellRange
                        ? 'bg-app-primary-color text-app-quaternary shadow-md'
                        : 'color-primary hover-color-primary-light'
                    }`}
                  >
                    Fixed
                  </button>
                  <button
                    onClick={() => updateCategorySetting(selectedCategory, 'useSellRange', true)}
                    className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                      currentSettings.useSellRange
                        ? 'bg-app-primary-color text-app-quaternary shadow-md'
                        : 'color-primary hover-color-primary-light'
                    }`}
                  >
                    Range
                  </button>
                </div>
              </div>

              {/* Percentage Inputs */}
              {currentSettings.useSellRange ? (
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
                        value={currentSettings.sellMinPercentage}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 1 && value <= 100) {
                            updateCategorySetting(selectedCategory, 'sellMinPercentage', value);
                            if (value >= currentSettings.sellMaxPercentage) {
                              updateCategorySetting(selectedCategory, 'sellMaxPercentage', Math.min(value + 5, 100));
                            }
                          }
                        }}
                        className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                 text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                 transition-colors duration-200"
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
                        min={currentSettings.sellMinPercentage + 5}
                        max="100"
                        value={currentSettings.sellMaxPercentage}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value > currentSettings.sellMinPercentage && value <= 100) {
                            updateCategorySetting(selectedCategory, 'sellMaxPercentage', value);
                          }
                        }}
                        className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                                 text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                                 transition-colors duration-200"
                        placeholder="100"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-app-primary border border-app-primary-30 rounded-lg p-3">
                    <p className="text-xs text-app-secondary-80">
                      Each quick sell will randomly sell between <span className="color-primary font-mono">{currentSettings.sellMinPercentage}%</span> and <span className="color-primary font-mono">{currentSettings.sellMaxPercentage}%</span> of token balance
                    </p>
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
                      value={currentSettings.sellPercentage}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1 && value <= 100) {
                          updateCategorySetting(selectedCategory, 'sellPercentage', value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-app-primary border border-app-primary-30 rounded-md
                               text-app-primary font-mono text-sm focus-border-primary focus:outline-none
                               transition-colors duration-200"
                      placeholder="100"
                    />
                    <p className="text-xs text-app-secondary-80 mt-2">
                      Fixed percentage of token balance to sell on each quick sell
                    </p>
                  </div>
                </div>
              )}
            </div>
            
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
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
