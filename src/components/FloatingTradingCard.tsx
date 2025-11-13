import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, X, Move, Edit3, Check } from 'lucide-react';
import { WalletType } from '../Utils';
import { ScriptType } from '../utils/wallets';
import { formatNumber } from '../utils/formatting';

// Hook to detect mobile viewport
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

interface PresetButtonProps {
  value: string;
  onExecute: (amount: string) => Promise<void>;
  onChange: (newValue: string) => void;
  isLoading: boolean;
  variant?: 'buy' | 'sell';
  isEditMode: boolean;
  index: number;
}

// Preset Button component
const PresetButton = React.memo<PresetButtonProps>(({ 
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      className={`relative group px-3 py-3 md:px-2 md:py-1.5 text-sm md:text-xs font-mono rounded border transition-all duration-200
                min-w-[48px] min-h-[48px] md:min-h-[32px] h-auto md:h-8 flex items-center justify-center
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
});
PresetButton.displayName = 'PresetButton';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  onEdit: (newLabel: string) => void;
  isEditMode: boolean;
}

// Tab Button component
const TabButton = React.memo<TabButtonProps>(({ label, isActive, onClick, onEdit, isEditMode }) => {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
});
TabButton.displayName = 'TabButton';

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
  const [manualProtocol, setManualProtocol] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  
  interface PresetTab {
    id: string;
    label: string;
    buyPresets: string[];
    sellPresets: string[];
  }
  
  // Default preset tabs
  const defaultPresetTabs: PresetTab[] = [
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
  const savePresetsToCookies = (tabs: PresetTab[], activeTabId: string) => {
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
  const activeTab = presetTabs.find((tab: PresetTab) => tab.id === activeTabId) || presetTabs[0];
  
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
  const handleTabSwitch = (tabId: string) => {
    setActiveTabId(tabId);
  };
  
  // Edit preset handlers
  const handleEditBuyPreset = (index: number, newValue: string) => {
    setPresetTabs((tabs: PresetTab[]) => tabs.map((tab: PresetTab) => 
      tab.id === activeTabId 
        ? {
            ...tab,
            buyPresets: tab.buyPresets.map((preset: string, i: number) => i === index ? newValue : preset)
          }
        : tab
    ));
  };
  
  const handleEditSellPreset = (index: number, newValue: string) => {
    setPresetTabs((tabs: PresetTab[]) => tabs.map((tab: PresetTab) => 
      tab.id === activeTabId 
        ? {
            ...tab,
            sellPresets: tab.sellPresets.map((preset: string, i: number) => i === index ? newValue : preset)
          }
        : tab
    ));
  };
  
  // Edit tab label
  const handleEditTabLabel = (tabId: string, newLabel: string) => {
    setPresetTabs((tabs: PresetTab[]) => tabs.map((tab: PresetTab) => 
      tab.id === tabId ? { ...tab, label: newLabel } : tab
    ));
  };
  
  // Handle trade submission
  const handleTrade = useCallback(async (amount: string, isBuy: boolean) => {
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

  if (isMobile) {
    // Mobile: Bottom sheet style
    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black-70 z-[9998] md:hidden"
          onClick={onClose}
        />
        {/* Bottom Sheet */}
        <div 
          className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden mobile-bottom-sheet"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom), 0px)'
          }}
        >
          <div 
            className="relative overflow-hidden bg-app-primary-99 backdrop-blur-md border-t border-app-primary-30 shadow-lg shadow-black-80 rounded-t-2xl"
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-app-primary-40 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono color-primary font-semibold">QUICK TRADE</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`p-2 rounded transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center
                            ${isEditMode 
                              ? 'bg-primary-20 border border-app-primary color-primary' 
                              : 'hover:bg-primary-20 text-app-secondary-60 hover:color-primary'
                            }`}
                >
                  {isEditMode ? <Check size={16} /> : <Edit3 size={16} />}
                </button>
                
                <button
                  onClick={onClose}
                  className="p-2 rounded hover:bg-primary-20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X size={18} className="text-app-secondary-60 hover:color-primary" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
              {/* Preset Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {presetTabs.map((tab: PresetTab) => (
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
              
              {/* Trading Interface */}
              <div className="space-y-6">
                {/* Buy Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-mono color-primary font-semibold">BUY</span>
                    <span className="text-xs text-app-secondary-60 font-mono">SOL/wallet</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {activeTab.buyPresets.map((preset: string, index: number) => (
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-mono text-error-alt font-semibold">SELL</span>
                    <span className="text-xs text-error-alt-60 font-mono">% tokens</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {activeTab.sellPresets.map((preset: string, index: number) => (
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
        </div>
      </>
    );
  }

  // Desktop: Floating card (original behavior)
  return (
    <div 
      ref={cardRef}
      className="fixed z-[9999] select-none hidden md:block"
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
          {presetTabs.map((tab: PresetTab) => (
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
              {activeTab.buyPresets.map((preset: string, index: number) => (
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
              {activeTab.sellPresets.map((preset: string, index: number) => (
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