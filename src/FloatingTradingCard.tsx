import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, X, Move, Edit3, Plus, Check, ChevronDown, Sparkles } from 'lucide-react';
import { loadConfigFromCookies, WalletType } from './Utils';
import { ScriptType } from './utils/wallets';

// Helper function to format numbers with k, M, B suffixes
const formatNumber = (num) => {
  const number = parseFloat(num);
  if (isNaN(number) || number === 0) return "0";
  
  const absNum = Math.abs(number);
  
  if (absNum >= 1000000000) {
    return (number / 1000000000).toFixed(2).replace(/\.?0+$/, '') + 'B';
  } else if (absNum >= 1000000) {
    return (number / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  } else if (absNum >= 1000) {
    return (number / 1000).toFixed(2).replace(/\.?0+$/, '') + 'k';
  } else if (absNum >= 1) {
    return number.toFixed(2).replace(/\.?0+$/, '');
  } else {
    // For very small numbers, show more decimal places
    return number.toFixed(6).replace(/\.?0+$/, '');
  }
};

// Cyberpunk Tooltip component
const Tooltip = ({ children, content, position = 'top' }) => {
  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2'
  };

  return (
    <div className="relative group">
      {children}
      <div className={`absolute hidden group-hover:block px-3 py-1.5 text-xs font-mono tracking-wide
                    bg-app-primary color-primary rounded-lg backdrop-blur-md
                    border border-app-primary-40 shadow-lg shadow-black-80
                    ${positionClasses[position]} z-50 whitespace-nowrap`}>
        <div className="relative z-10">{content}</div>
      </div>
    </div>
  );
};

// Preset Button component
const PresetButton = ({ 
  value, 
  onExecute, 
  onChange,
  isLoading, 
  variant = 'buy',
  isEditMode,
  index 
}) => {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditMode && inputRef.current) {
      (inputRef.current as HTMLInputElement)?.focus();
    }
  }, [isEditMode]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const newValue = parseFloat(editValue);
      if (!isNaN(newValue) && newValue > 0) {
        onChange(newValue.toString());
      }
    } else if (e.key === 'Escape') {
      setEditValue(value);
    }
  };

  const handleBlur = () => {
    const newValue = parseFloat(editValue);
    if (!isNaN(newValue) && newValue > 0) {
      onChange(newValue.toString());
    } else {
      setEditValue(value);
    }
  };

  if (isEditMode) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full h-8 px-2 text-xs font-mono rounded border text-center
                   bg-app-primary text-app-primary border-app-primary
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => onExecute(value)}
      className={`relative group px-2 py-1.5 text-xs font-mono rounded border transition-all duration-200
                min-w-[48px] h-8 flex items-center justify-center
                ${variant === 'buy' 
                  ? 'bg-app-primary-60 border-app-primary-40 color-primary hover:bg-primary-20 hover-border-primary' 
                  : 'bg-app-primary-60 border-error-alt-40 text-error-alt hover:bg-error-20 hover:border-error-alt'
                }`}
    >
      {isLoading ? (
        <div className="flex items-center gap-1">
          <Loader2 size={10} className="animate-spin" />
          <span>{value}</span>
        </div>
      ) : (
        value
      )}
    </button>
  );
};

// Tab Button component
const TabButton = ({ label, isActive, onClick, onEdit, isEditMode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      (inputRef.current as HTMLInputElement).focus();
      (inputRef.current as HTMLInputElement).select();
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (isEditMode) {
      setIsEditing(true);
      setEditValue(label);
    }
  };

  const handleSave = () => {
    if (editValue.trim()) {
      onEdit(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(label);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex-1">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="w-full px-2 py-1 text-xs font-mono rounded
                   bg-app-primary text-app-primary border border-app-primary
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
        />
      </div>
    );
  }

  return (
    <button
      onClick={isEditMode ? handleEdit : onClick}
      className={`flex-1 px-3 py-1.5 text-xs font-mono rounded transition-all duration-200
                ${isActive 
                  ? 'bg-primary-20 border border-app-primary color-primary' 
                  : 'bg-app-primary-60 border border-app-primary-20 text-app-secondary-60 hover-border-primary-40 hover:text-app-secondary'
                }
                ${isEditMode ? 'cursor-text' : 'cursor-pointer'}`}
    >
      {label}
    </button>
  );
};

interface FloatingTradingCardProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  isDragging: boolean;
  onDraggingChange: (dragging: boolean) => void;
  tokenAddress: string;
  wallets: any[];
  selectedDex: string;
  setSelectedDex: (dex: string) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  buyAmount: string;
  setBuyAmount: (amount: string) => void;
  sellAmount: string;
  setSellAmount: (amount: string) => void;
  handleTradeSubmit: (wallets: any[], isBuy: boolean, dex?: string, buyAmount?: string, sellAmount?: string) => void;
  isLoading: boolean;
  getScriptName: (dex: string, isBuy: boolean) => ScriptType;
  countActiveWallets: (wallets: WalletType[]) => number;
  currentMarketCap: number | null;
  tokenBalances: Map<string, number>;
}

const FloatingTradingCard: React.FC<FloatingTradingCardProps> = ({
  isOpen,
  onClose,
  position,
  onPositionChange,
  isDragging,
  onDraggingChange,
  tokenAddress,
  wallets,
  selectedDex,
  setSelectedDex,
  isDropdownOpen,
  setIsDropdownOpen,
  buyAmount,
  setBuyAmount,
  sellAmount,
  setSellAmount,
  handleTradeSubmit,
  isLoading,
  getScriptName,
  countActiveWallets,
  currentMarketCap,
  tokenBalances
}) => {

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [manualProtocol, setManualProtocol] = useState(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  
  // Default preset tabs
  const defaultPresetTabs = [
    {
      id: 'degen',
      label: 'DEGEN',
      buyPresets: ['0.01', '0.05', '0.1', '0.5'],
      sellPresets: ['25', '50', '75', '100']
    },
    {
      id: 'diamond',
      label: 'DIAMOND',
      buyPresets: ['0.001', '0.01', '0.05', '0.1'],
      sellPresets: ['10', '25', '50', '75']
    },
    {
      id: 'yolo',
      label: 'YOLO',
      buyPresets: ['0.1', '0.5', '1', '5'],
      sellPresets: ['50', '75', '90', '100']
    }
  ];

  // Load presets from cookies
  const loadPresetsFromCookies = () => {
    try {
      const savedPresets = document.cookie
        .split('; ')
        .find(row => row.startsWith('tradingPresets='))
        ?.split('=')[1];
      
      if (savedPresets) {
        const decoded = decodeURIComponent(savedPresets);
        const parsed = JSON.parse(decoded);
        return {
          tabs: Array.isArray(parsed.tabs) ? parsed.tabs : defaultPresetTabs,
          activeTabId: parsed.activeTabId || 'degen'
        };
      }
    } catch (error) {
      console.error('Error loading presets from cookies:', error);
    }
    return {
      tabs: defaultPresetTabs,
      activeTabId: 'degen'
    };
  };

  // Save presets to cookies
  const savePresetsToCookies = (tabs, activeTabId) => {
    try {
      const presetsData = {
        tabs,
        activeTabId
      };
      const encoded = encodeURIComponent(JSON.stringify(presetsData));
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1); // 1 year expiry
      document.cookie = `tradingPresets=${encoded}; expires=${expires.toUTCString()}; path=/`;
    } catch (error) {
      console.error('Error saving presets to cookies:', error);
    }
  };

  // Initialize presets from cookies
  const initialPresets = loadPresetsFromCookies();
  const [presetTabs, setPresetTabs] = useState(initialPresets.tabs);
  const [activeTabId, setActiveTabId] = useState(initialPresets.activeTabId);
  const activeTab = presetTabs.find(tab => tab.id === activeTabId) || presetTabs[0];
  
  // Save presets to cookies whenever they change
  useEffect(() => {
    savePresetsToCookies(presetTabs, activeTabId);
  }, [presetTabs, activeTabId]);
  
  const [initialProtocol, setInitialProtocol] = useState(null);
  
  // Fetch route when component opens
  useEffect(() => {
  
  }, [isOpen, tokenAddress, selectedDex]);
  
  // Reset protocol when token address changes
  useEffect(() => {
    setInitialProtocol(null);
  }, [tokenAddress]);
  
  // Handle tab switching with cookie save
  const handleTabSwitch = (tabId) => {
    setActiveTabId(tabId);
  };
  
  // Edit preset handlers
  const handleEditBuyPreset = (index, newValue) => {
    setPresetTabs(tabs => tabs.map(tab => 
      tab.id === activeTabId 
        ? {
            ...tab,
            buyPresets: tab.buyPresets.map((preset, i) => i === index ? newValue : preset)
          }
        : tab
    ));
  };
  
  const handleEditSellPreset = (index, newValue) => {
    setPresetTabs(tabs => tabs.map(tab => 
      tab.id === activeTabId 
        ? {
            ...tab,
            sellPresets: tab.sellPresets.map((preset, i) => i === index ? newValue : preset)
          }
        : tab
    ));
  };
  
  // Edit tab label
  const handleEditTabLabel = (tabId, newLabel) => {
    setPresetTabs(tabs => tabs.map(tab => 
      tab.id === tabId ? { ...tab, label: newLabel } : tab
    ));
  };
  
  // Handle trade submission
  const handleTrade = useCallback(async (amount, isBuy) => {
    const dexToUse = manualProtocol || selectedDex;
    
    // Set the amount in parent state and call handleTradeSubmit with the specific amount
    if (isBuy) {
      setBuyAmount(amount);
      // Pass the amount directly to avoid using stale state values
      handleTradeSubmit(wallets, isBuy, dexToUse, amount, undefined);
    } else {
      setSellAmount(amount);
      // Pass the amount directly to avoid using stale state values
      handleTradeSubmit(wallets, isBuy, dexToUse, undefined, amount);
    }
  }, [manualProtocol, selectedDex, wallets, setBuyAmount, setSellAmount, handleTradeSubmit]);
  
  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dragHandleRef.current?.contains(e.target as Node)) return;
    
    onDraggingChange(true);
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };
  
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 0);
    
    onPositionChange({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragOffset.x, dragOffset.y, onPositionChange]);
  
  const handleMouseUp = React.useCallback(() => {
    onDraggingChange(false);
  }, [onDraggingChange]);
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  return (
    <div 
      ref={cardRef}
      className="fixed z-[9999] select-none"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <div 
        className="relative overflow-hidden p-4 rounded-lg w-80 max-w-[90vw] bg-app-primary-99 backdrop-blur-md border border-app-primary-30 shadow-lg shadow-black-80"
      >
        {/* Header with Edit Button */}
        <div className="flex items-center justify-between mb-3">
          <div 
            ref={dragHandleRef}
            className="flex items-center gap-1 cursor-grab active:cursor-grabbing"
            title="Drag to move"
          >
            <Move size={12} className="text-app-secondary-60" />
            
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-1.5 rounded transition-all duration-200
                        ${isEditMode 
                          ? 'bg-primary-20 border border-app-primary color-primary' 
                          : 'hover:bg-primary-20 text-app-secondary-60 hover:color-primary'
                        }`}
            >
              {isEditMode ? <Check size={12} /> : <Edit3 size={12} />}
            </button>
            
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-primary-20 transition-colors"
            >
              <X size={14} className="text-app-secondary-60 hover:color-primary" />
            </button>
          </div>
        </div>
        
        {/* Preset Tabs */}
        <div className="flex gap-1 mb-4">
          {presetTabs.map((tab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              isActive={activeTabId === tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              onEdit={(newLabel) => handleEditTabLabel(tab.id, newLabel)}
              isEditMode={isEditMode}
            />
          ))}
        </div>
        
        {/* Trading Interface - Preset Only */}
        <div className="space-y-4 relative z-10">
          {/* Buy Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono color-primary">BUY</span>
              <span className="text-xs text-app-secondary-60 font-mono">SOL/wallet</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {activeTab.buyPresets.map((preset, index) => (
                <PresetButton
                  key={index}
                  value={preset}
                  onExecute={(amount) => handleTrade(amount, true)}
                  onChange={(newValue) => handleEditBuyPreset(index, newValue)}
                  isLoading={isLoading}
                  variant="buy"
                  isEditMode={isEditMode}
                  index={index}
                />
              ))}
            </div>
          </div>
          
          {/* Sell Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-error-alt">SELL</span>
              <span className="text-xs text-error-alt-60 font-mono">% tokens</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {activeTab.sellPresets.map((preset, index) => (
                <PresetButton
                  key={index}
                  value={preset}
                  onExecute={(amount) => handleTrade(amount, false)}
                  onChange={(newValue) => handleEditSellPreset(index, newValue)}
                  isLoading={isLoading}
                  variant="sell"
                  isEditMode={isEditMode}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingTradingCard;