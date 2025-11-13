import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Share, X } from 'lucide-react';

interface QuickTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickBuyEnabled: boolean;
  setQuickBuyEnabled: (enabled: boolean) => void;
  quickBuyAmount: number;
  setQuickBuyAmount: (amount: number) => void;
  quickBuyMinAmount: number;
  setQuickBuyMinAmount: (amount: number) => void;
  quickBuyMaxAmount: number;
  setQuickBuyMaxAmount: (amount: number) => void;
  useQuickBuyRange: boolean;
  setUseQuickBuyRange: (useRange: boolean) => void;
  quickSellPercentage: number;
  setQuickSellPercentage: (percentage: number) => void;
  quickSellMinPercentage: number;
  setQuickSellMinPercentage: (percentage: number) => void;
  quickSellMaxPercentage: number;
  setQuickSellMaxPercentage: (percentage: number) => void;
  useQuickSellRange: boolean;
  setUseQuickSellRange: (useRange: boolean) => void;
}

const buttonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};

export const QuickTradeModal: React.FC<QuickTradeModalProps> = ({
  isOpen,
  onClose,
  quickBuyEnabled,
  setQuickBuyEnabled,
  quickBuyAmount,
  setQuickBuyAmount,
  quickBuyMinAmount,
  setQuickBuyMinAmount,
  quickBuyMaxAmount,
  setQuickBuyMaxAmount,
  useQuickBuyRange,
  setUseQuickBuyRange,
  quickSellPercentage,
  setQuickSellPercentage,
  quickSellMinPercentage,
  setQuickSellMinPercentage,
  quickSellMaxPercentage,
  setQuickSellMaxPercentage,
  useQuickSellRange,
  setUseQuickSellRange
}) => {
  // Temporary state for editing
  const [tempQuickBuyAmount, setTempQuickBuyAmount] = useState(quickBuyAmount);
  const [tempQuickBuyEnabled, setTempQuickBuyEnabled] = useState(quickBuyEnabled);
  const [tempQuickBuyMinAmount, setTempQuickBuyMinAmount] = useState(quickBuyMinAmount);
  const [tempQuickBuyMaxAmount, setTempQuickBuyMaxAmount] = useState(quickBuyMaxAmount);
  const [tempUseQuickBuyRange, setTempUseQuickBuyRange] = useState(useQuickBuyRange);
  const [tempQuickSellPercentage, setTempQuickSellPercentage] = useState(quickSellPercentage);
  const [tempQuickSellMinPercentage, setTempQuickSellMinPercentage] = useState(quickSellMinPercentage);
  const [tempQuickSellMaxPercentage, setTempQuickSellMaxPercentage] = useState(quickSellMaxPercentage);
  const [tempUseQuickSellRange, setTempUseQuickSellRange] = useState(useQuickSellRange);

  // Reset temp values when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempQuickBuyAmount(quickBuyAmount);
      setTempQuickBuyEnabled(quickBuyEnabled);
      setTempQuickBuyMinAmount(quickBuyMinAmount);
      setTempQuickBuyMaxAmount(quickBuyMaxAmount);
      setTempUseQuickBuyRange(useQuickBuyRange);
      setTempQuickSellPercentage(quickSellPercentage);
      setTempQuickSellMinPercentage(quickSellMinPercentage);
      setTempQuickSellMaxPercentage(quickSellMaxPercentage);
      setTempUseQuickSellRange(useQuickSellRange);
    }
  }, [isOpen, quickBuyAmount, quickBuyEnabled, quickBuyMinAmount, quickBuyMaxAmount, useQuickBuyRange, quickSellPercentage, quickSellMinPercentage, quickSellMaxPercentage, useQuickSellRange]);

  // Function to save quick buy settings
  const saveQuickBuySettings = () => {
    if (tempQuickBuyAmount > 0) {
      setQuickBuyAmount(tempQuickBuyAmount);
    }
    setQuickBuyEnabled(tempQuickBuyEnabled);
    if (tempQuickBuyMinAmount > 0) {
      setQuickBuyMinAmount(tempQuickBuyMinAmount);
    }
    if (tempQuickBuyMaxAmount > 0) {
      setQuickBuyMaxAmount(tempQuickBuyMaxAmount);
    }
    setUseQuickBuyRange(tempUseQuickBuyRange);
    if (tempQuickSellPercentage >= 1 && tempQuickSellPercentage <= 100) {
      setQuickSellPercentage(tempQuickSellPercentage);
    }
    if (tempQuickSellMinPercentage >= 1 && tempQuickSellMinPercentage <= 100) {
      setQuickSellMinPercentage(tempQuickSellMinPercentage);
    }
    if (tempQuickSellMaxPercentage >= 1 && tempQuickSellMaxPercentage <= 100) {
      setQuickSellMaxPercentage(tempQuickSellMaxPercentage);
    }
    setUseQuickSellRange(tempUseQuickSellRange);
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
                     w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
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
          
          <div className="space-y-6">                
            {/* Buy Amount Configuration */}
            <motion.div 
              className={`transition-all duration-300 ${tempQuickBuyEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
              animate={{ opacity: tempQuickBuyEnabled ? 1 : 0.4 }}
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
                      {tempUseQuickBuyRange ? 'Random amounts for natural variation' : 'Fixed amount for consistency'}
                    </p>
                  </div>
                  
                  <div className="flex bg-app-secondary rounded-lg p-1 border border-app-primary-30">
                    <button
                      onClick={() => setTempUseQuickBuyRange(false)}
                      disabled={!tempQuickBuyEnabled}
                      className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                        !tempUseQuickBuyRange && tempQuickBuyEnabled
                          ? 'bg-app-primary-color text-app-quaternary shadow-md'
                          : 'color-primary hover-color-primary-light'
                      }`}
                    >
                      Fixed
                    </button>
                    <button
                      onClick={() => setTempUseQuickBuyRange(true)}
                      disabled={!tempQuickBuyEnabled}
                      className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                        tempUseQuickBuyRange && tempQuickBuyEnabled
                          ? 'bg-app-primary-color text-app-quaternary shadow-md'
                          : 'color-primary hover-color-primary-light'
                      }`}
                    >
                      Range
                    </button>
                  </div>
                </div>

                {/* Amount Inputs */}
                {tempUseQuickBuyRange ? (
                  <div className="space-y-4">
                    {/* Preset buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { min: 0.1, max: 0.5, label: 'Conservative' },
                        { min: 0.7, max: 1.5, label: 'Moderate' },
                        { min: 2, max: 4, label: 'Aggressive' }
                      ].map((preset, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setTempQuickBuyMinAmount(preset.min);
                            setTempQuickBuyMaxAmount(preset.max);
                          }}
                          disabled={!tempQuickBuyEnabled}
                          className="py-2 px-3 text-xs font-mono bg-app-primary border border-app-primary-30 
                                   hover-border-primary-60 rounded-md color-primary hover-color-primary-light 
                                   transition-colors duration-200 disabled:opacity-50"
                        >
                          <div className="font-medium">{preset.label}</div>
                          <div className="text-app-secondary-80">{preset.min}-{preset.max}</div>
                        </button>
                      ))}
                    </div>
                    
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
                          value={tempQuickBuyMinAmount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value >= 0.001 && value <= 10) {
                              setTempQuickBuyMinAmount(value);
                              if (value >= tempQuickBuyMaxAmount) {
                                setTempQuickBuyMaxAmount(Math.min(value + 0.01, 10));
                              }
                            }
                          }}
                          disabled={!tempQuickBuyEnabled}
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
                          min={tempQuickBuyMinAmount + 0.001}
                          max="10"
                          value={tempQuickBuyMaxAmount}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value > tempQuickBuyMinAmount && value <= 10) {
                              setTempQuickBuyMaxAmount(value);
                            }
                          }}
                          disabled={!tempQuickBuyEnabled}
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
                        Each quick buy will randomly spend between <span className="color-primary font-mono">{tempQuickBuyMinAmount.toFixed(3)}</span> and <span className="color-primary font-mono">{tempQuickBuyMaxAmount.toFixed(3)}</span> SOL
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Preset buttons for fixed amounts */}
                    <div className="grid grid-cols-4 gap-2">
                      {[0.01, 0.05, 0.1, 0.25].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setTempQuickBuyAmount(amount)}
                          disabled={!tempQuickBuyEnabled}
                          className={`py-2 px-2 text-xs font-mono rounded-md transition-colors duration-200 
                                   border disabled:opacity-50 ${
                            tempQuickBuyAmount === amount
                              ? 'bg-app-primary-color text-app-quaternary border-app-primary-color'
                              : 'bg-app-primary border-app-primary-30 hover-border-primary-60 color-primary hover-color-primary-light'
                          }`}
                        >
                          {amount} SOL
                        </button>
                      ))}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                        <span>Custom Amount</span>
                        <span className="text-app-secondary-80 text-xs">(SOL)</span>
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max="10"
                        value={tempQuickBuyAmount}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0.001 && value <= 10) {
                            setTempQuickBuyAmount(value);
                          }
                        }}
                        disabled={!tempQuickBuyEnabled}
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
                    {tempUseQuickSellRange ? 'Random percentages for natural variation' : 'Fixed percentage for consistency'}
                  </p>
                </div>
                
                <div className="flex bg-app-secondary rounded-lg p-1 border border-app-primary-30">
                  <button
                    onClick={() => setTempUseQuickSellRange(false)}
                    className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                      !tempUseQuickSellRange
                        ? 'bg-app-primary-color text-app-quaternary shadow-md'
                        : 'color-primary hover-color-primary-light'
                    }`}
                  >
                    Fixed
                  </button>
                  <button
                    onClick={() => setTempUseQuickSellRange(true)}
                    className={`px-3 py-1.5 text-xs font-mono rounded transition-all duration-200 ${
                      tempUseQuickSellRange
                        ? 'bg-app-primary-color text-app-quaternary shadow-md'
                        : 'color-primary hover-color-primary-light'
                    }`}
                  >
                    Range
                  </button>
                </div>
              </div>

              {/* Percentage Inputs */}
              {tempUseQuickSellRange ? (
                <div className="space-y-4">
                  {/* Preset buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { min: 25, max: 50, label: 'Conservative' },
                      { min: 50, max: 75, label: 'Moderate' },
                      { min: 75, max: 100, label: 'Aggressive' }
                    ].map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setTempQuickSellMinPercentage(preset.min);
                          setTempQuickSellMaxPercentage(preset.max);
                        }}
                        className="py-2 px-3 text-xs font-mono bg-app-primary border border-app-primary-30 
                                 hover-border-primary-60 rounded-md color-primary hover-color-primary-light 
                                 transition-colors duration-200"
                      >
                        <div className="font-medium">{preset.label}</div>
                        <div className="text-app-secondary-80">{preset.min}-{preset.max}%</div>
                      </button>
                    ))}
                  </div>
                  
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
                        value={tempQuickSellMinPercentage}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 1 && value <= 100) {
                            setTempQuickSellMinPercentage(value);
                            if (value >= tempQuickSellMaxPercentage) {
                              setTempQuickSellMaxPercentage(Math.min(value + 5, 100));
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
                        min={tempQuickSellMinPercentage + 5}
                        max="100"
                        value={tempQuickSellMaxPercentage}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value > tempQuickSellMinPercentage && value <= 100) {
                            setTempQuickSellMaxPercentage(value);
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
                      Each quick sell will randomly sell between <span className="color-primary font-mono">{tempQuickSellMinPercentage}%</span> and <span className="color-primary font-mono">{tempQuickSellMaxPercentage}%</span> of token balance
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Preset buttons for fixed percentages */}
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 75, 100].map((percentage) => (
                      <button
                        key={percentage}
                        onClick={() => setTempQuickSellPercentage(percentage)}
                        className={`py-2 px-2 text-xs font-mono rounded-md transition-colors duration-200 
                                 border ${
                          tempQuickSellPercentage === percentage
                            ? 'bg-app-primary-color text-app-quaternary border-app-primary-color'
                            : 'bg-app-primary border-app-primary-30 hover-border-primary-60 color-primary hover-color-primary-light'
                        }`}
                      >
                        {percentage}%
                      </button>
                    ))}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-mono color-primary mb-2 flex items-center gap-1">
                      <span>Custom Percentage</span>
                      <span className="text-app-secondary-80 text-xs">(1-100%)</span>
                    </label>
                    <input
                      type="number"
                      step="5"
                      min="1"
                      max="100"
                      value={tempQuickSellPercentage}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1 && value <= 100) {
                          setTempQuickSellPercentage(value);
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
                onClick={saveQuickBuySettings}
                disabled={tempQuickBuyEnabled && (
                  tempUseQuickBuyRange 
                    ? (tempQuickBuyMinAmount <= 0 || tempQuickBuyMaxAmount <= 0 || tempQuickBuyMinAmount >= tempQuickBuyMaxAmount)
                    : tempQuickBuyAmount <= 0
                ) || (
                  tempUseQuickSellRange
                    ? (tempQuickSellMinPercentage <= 0 || tempQuickSellMaxPercentage <= 0 || tempQuickSellMinPercentage >= tempQuickSellMaxPercentage)
                    : tempQuickSellPercentage <= 0
                )}
                className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-app-primary-color to-app-primary-light
                         text-app-quaternary hover:from-app-primary-light hover:to-app-primary-color 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 
                         font-mono text-sm shadow-lg disabled:shadow-none"
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

