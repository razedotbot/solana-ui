import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2, Move, Edit3, Check, ClipboardList, X, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  createMultipleLimitOrders, 
  getActiveOrders, 
  cancelOrder, 
  processLimitOrderBundle,
  processCancelOrderTransaction,
  cancelOrderWithBundle,
  solToLamports,
  lamportsToSol,
  validateLimitOrderConfig,
  calculatePrice,
  type LimitOrderConfig,
  type ActiveOrdersResponse
} from './utils/limitorders';
import { useToast } from './Notifications';



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
                   bg-app-primary text-app-primary border-app-primary-color
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => onExecute(value)}
      disabled={isLoading}
      className={`relative group px-2 py-1.5 text-xs font-mono rounded border transition-all duration-200
                min-w-[48px] h-8 flex items-center justify-center
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variant === 'buy' 
                  ? 'bg-app-primary-60 border-app-primary-40 color-primary hover-bg-primary-20 hover-border-primary' 
                  : 'bg-app-primary-60 border-error-alt-40 text-error-alt hover-bg-error-30 hover-border-error-alt'
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

  const handleClick = () => {
    if (isEditMode) {
      setIsEditing(true);
      setEditValue(label);
    } else {
      onClick();
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
                   bg-app-primary text-app-primary border border-app-primary-color
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
        />
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`flex-1 px-3 py-1.5 text-xs font-mono rounded transition-all duration-200
                ${isActive 
                  ? 'bg-primary-20 border border-app-primary-80 color-primary' 
                  : 'bg-app-primary-60 border border-app-primary-40 text-app-secondary-60 hover-border-primary-40 hover-text-app-secondary'
                }
                ${isEditMode ? 'cursor-text' : 'cursor-pointer'}`}
    >
      {label}
    </button>
  );
};

// Calendar Widget Component
const CalendarWidget = ({ 
  isOpen, 
  onClose, 
  selectedDate, 
  onDateSelect, 
  selectedTime, 
  onTimeChange 
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  const handleDateClick = (day) => {
    const newDate = new Date(currentYear, currentMonth, day);
    onDateSelect(newDate);
  };
  
  const isToday = (day) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };
  
  const isSelected = (day) => {
    return selectedDate.getDate() === day && 
           selectedDate.getMonth() === currentMonth && 
           selectedDate.getFullYear() === currentYear;
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-app-primary border border-app-primary-40 rounded-lg shadow-lg shadow-black-80 p-2 min-w-[240px]">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handlePrevMonth}
          className="p-0.5 hover:bg-app-primary-20 rounded transition-colors"
        >
          <ChevronLeft size={14} className="text-app-secondary" />
        </button>
        <div className="text-xs font-mono text-app-primary">
          {monthNames[currentMonth]} {currentYear}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-0.5 hover:bg-app-primary-20 rounded transition-colors"
        >
          <ChevronRight size={14} className="text-app-secondary" />
        </button>
      </div>
      
      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-[10px] font-mono text-app-secondary-60 text-center py-0.5">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfMonth }, (_, i) => (
          <div key={`empty-${i}`} className="h-6"></div>
        ))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={`h-6 w-6 text-[10px] font-mono rounded transition-colors flex items-center justify-center
                ${isSelected(day) 
                  ? 'bg-app-primary-color text-black' 
                  : isToday(day)
                    ? 'bg-app-primary-20 text-app-primary border border-app-primary-40'
                    : 'text-app-secondary hover:bg-app-primary-20'
                }`}
            >
              {day}
            </button>
          );
        })}
      </div>
      
      {/* Time Input */}
      <div className="border-t border-app-primary-40 pt-2">
        <label className="text-[10px] font-mono text-app-secondary-60 uppercase block mb-1">
          Time
        </label>
        <input
          type="time"
          value={selectedTime}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-full px-1.5 py-1 bg-app-primary-80-alpha border border-app-primary-40 rounded 
                   text-app-primary placeholder-app-secondary-60 font-mono text-[10px] 
                   focus:outline-none focus-border-primary focus:ring-1 focus:ring-app-primary-40 
                   transition-all duration-300"
        />
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-1 mt-2">
        <button
          onClick={onClose}
          className="flex-1 px-2 py-1 text-[10px] font-mono bg-app-primary-60 border border-app-primary-40 
                   text-app-secondary rounded hover:bg-app-primary-20 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            const dateTime = new Date(selectedDate);
            const [hours, minutes] = selectedTime.split(':');
            dateTime.setHours(parseInt(hours), parseInt(minutes));
            onDateSelect(dateTime);
            onClose();
          }}
          className="flex-1 px-2 py-1 text-[10px] font-mono bg-app-primary-color text-black rounded 
                   hover:bg-app-primary-dark transition-colors"
        >
          Select
        </button>
      </div>
    </div>
  );
};

const TradingCard = ({ 
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
  tokenBalances,
  onOpenFloating,
  isFloatingCardOpen,
  solPrice
}) => {
  const { showToast } = useToast();
  const [activeMainTab, setActiveMainTab] = useState('trading'); // 'orders' or 'trading'
  const [activeTradeType, setActiveTradeType] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [isEditMode, setIsEditMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // Limit order state
  const [limitOrderSolAmount, setLimitOrderSolAmount] = useState('');
  const [limitOrderTokenAmount, setLimitOrderTokenAmount] = useState('');
  const [limitOrderMarketCap, setLimitOrderMarketCap] = useState('');
  const [limitOrderAvgPrice, setLimitOrderAvgPrice] = useState('');
  const [limitOrderPrice, setLimitOrderPrice] = useState('');
  const [limitOrderExpiry, setLimitOrderExpiry] = useState('');
  const [marketCapSlider, setMarketCapSlider] = useState(0); // -100% to +200%
  const [baseMarketCap, setBaseMarketCap] = useState(0);
  const [isCreatingLimitOrder, setIsCreatingLimitOrder] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('12:00');
  const [activeOrders, setActiveOrders] = useState<ActiveOrdersResponse | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderErrors, setOrderErrors] = useState<string[]>([]);
  const [cancellingOrders, setCancellingOrders] = useState<Set<string>>(new Set());
  
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
  
  
  
  // Handle amount change
  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    if (activeTradeType === 'buy') {
      setBuyAmount(value);
    } else {
      setSellAmount(value);
    }
  };

  // Handle preset click
  const handlePresetClick = (preset) => {
    if (activeTradeType === 'buy') {
      setBuyAmount(preset);
      handleTradeSubmit(wallets, true, selectedDex, preset, undefined);
    } else {
      setSellAmount(preset);
      handleTradeSubmit(wallets, false, selectedDex, undefined, preset);
    }
  };

  // Limit Order Handlers
  const loadActiveOrders = async () => {
    if (!wallets || wallets.length === 0) {
      showToast('No wallets available', 'error');
      return;
    }
    
    // Don't load orders if no token is selected
    if (!tokenAddress) {
      setActiveOrders(null);
      showToast('No token selected', 'error');
      return;
    }
    
    // Check if trading server URL is configured
    const tradingServerUrl = (window as any).tradingServerUrl;
    if (!tradingServerUrl) {
      showToast('Trading server URL not configured', 'error');
      setActiveOrders(null);
      return;
    }
    
    setIsLoadingOrders(true);
    try {
      // Get orders for all active wallets
      const activeWallets = wallets.filter(w => w.isActive);
      if (activeWallets.length === 0) {
        setActiveOrders(null);
        showToast('No active wallets found', 'error');
        return;
      }

      // Load all orders for all active wallets with a single call per wallet (no filters)
      const allOrdersPromises = activeWallets.map(wallet => 
        getActiveOrders(wallet.address) // Fetch all orders without filters
      );

      const allOrdersResponses = await Promise.all(allOrdersPromises);
      
      // Combine all successful responses
      const successfulResponses = allOrdersResponses.filter(response => response.success);
      
      if (successfulResponses.length === 0) {
        console.error('Failed to load active orders from any wallet');
        const errorMessages = allOrdersResponses
          .filter(response => !response.success)
          .map(response => response.error)
          .filter(Boolean);
        
        if (errorMessages.length > 0) {
          showToast(`Failed to load orders: ${errorMessages[0]}`, 'error');
        } else {
          showToast('Failed to load active orders', 'error');
        }
        setActiveOrders(null);
        return;
      }

      // Combine all orders from all wallets
      const allOrders = successfulResponses.reduce((acc, response) => {
        if (response.orders?.orders) {
          acc.push(...response.orders.orders);
        }
        return acc;
      }, []);

      // Filter orders to only include those related to the current token
      // Buy orders: inputMint is SOL, outputMint is the token
      // Sell orders: inputMint is the token, outputMint is SOL
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      
      const filteredOrders = allOrders.filter(order => {
        const inputMint = order.inputMint || order.account?.inputMint;
        const outputMint = order.outputMint || order.account?.outputMint;
        
        // Check if this order is related to the current token
        const isBuyOrder = inputMint === SOL_MINT && outputMint === tokenAddress;
        const isSellOrder = inputMint === tokenAddress && outputMint === SOL_MINT;
        
        return isBuyOrder || isSellOrder;
      });

      console.log('All orders fetched:', allOrders.length);
      console.log('Filtered orders for token:', filteredOrders.length);
      console.log('Sample filtered order:', filteredOrders[0]);

      // Create a combined response with filtered orders
      const combinedResponse = {
        success: true,
        orders: {
          orders: filteredOrders
        }
      };

      setActiveOrders(combinedResponse);
      showToast(`Refreshed ${filteredOrders.length} active orders`, 'success');
    } catch (error) {
      console.error('Error loading active orders:', error);
      showToast(`Error loading orders: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setActiveOrders(null);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleCreateLimitOrder = async () => {
    // Ensure calculated amounts exist
    if (!limitOrderSolAmount || !limitOrderTokenAmount) {
      setOrderErrors(['Please ensure both SOL and token amounts are calculated']);
      return;
    }

    // Validate minimum SOL amount (0.1 SOL)
    const solAmount = parseFloat(limitOrderSolAmount);
    if (solAmount < 0.1) {
      showToast('Minimum SOL amount for limit orders is 0.1 SOL', 'error');
      setOrderErrors(['Minimum SOL amount for limit orders is 0.1 SOL']);
      return;
    }

    const activeWallets = wallets.filter(w => w.isActive);
    if (activeWallets.length === 0) {
      setOrderErrors(['No active wallets selected']);
      return;
    }

    setIsCreatingLimitOrder(true);
    setOrderErrors([]);

    try {
      // Convert amounts to proper format based on trade type
      let makingAmount: string;
      let takingAmount: string;

      if (activeTradeType === 'buy') {
        // Buy order: SOL → Token (normal decimal handling)
        makingAmount = solToLamports(parseFloat(limitOrderSolAmount));
        takingAmount = (parseFloat(limitOrderTokenAmount) * Math.pow(10, 6)).toString(); // Token decimals
      } else {
        // Sell order: Token → SOL (inverted inputs - token amount goes to makingAmount, SOL amount goes to takingAmount)
        makingAmount = (parseFloat(limitOrderTokenAmount) * Math.pow(10, 6)).toString(); // Token amount with token decimals
        takingAmount = solToLamports(parseFloat(limitOrderSolAmount)); // SOL amount with SOL decimals
      }

      // Create order configuration based on trade type (buy vs sell)
      const orderConfig: Omit<LimitOrderConfig, 'maker'> = activeTradeType === 'buy' ? {
        // Buy order: SOL → Token
        inputMint: 'So11111111111111111111111111111111111111112', // SOL mint
        outputMint: tokenAddress,
        makingAmount,
        takingAmount,
        slippageBps: 50, // 0.5% slippage
        expiredAt: limitOrderExpiry ? Math.floor(new Date(limitOrderExpiry).getTime() / 1000) : undefined
      } : {
        // Sell order: Token → SOL (mints inverted, decimals inverted)
        inputMint: tokenAddress,
        outputMint: 'So11111111111111111111111111111111111111112', // SOL mint
        makingAmount,
        takingAmount,
        slippageBps: 50, // 0.5% slippage
        expiredAt: limitOrderExpiry ? Math.floor(new Date(limitOrderExpiry).getTime() / 1000) : undefined
      };

      // Validate the configuration
      const validation = validateLimitOrderConfig({
        ...orderConfig,
        maker: activeWallets[0].address // Use first wallet for validation
      });

      if (!validation.valid) {
        setOrderErrors(validation.errors);
        return;
      }

      // Create orders for all active wallets
      const response = await createMultipleLimitOrders(activeWallets, orderConfig);

      if (response.success) {
        console.log('Limit orders created successfully:', response.orders);
        
        // Process and send the bundle with transactions
        if (response.transactions && response.transactions.length > 0) {
          console.log('Processing bundle with transactions...');
          const bundleResult = await processLimitOrderBundle(response, activeWallets);
          
          if (bundleResult.success) {
            console.log('✅ Bundle sent successfully!', bundleResult.bundleId);
            
            // Clear form
            setLimitOrderSolAmount('');
            setLimitOrderTokenAmount('');
            setLimitOrderAvgPrice('');
            setLimitOrderMarketCap('');
            setLimitOrderPrice('');
            setLimitOrderExpiry('');
            setMarketCapSlider(0);
            setShowCalendar(false);
            setCalendarDate(new Date());
            setSelectedTime('12:00');
          } else {
            setOrderErrors([`Bundle failed to send: ${bundleResult.error}`]);
            return;
          }
        } else {
          console.log('No transactions to process in the response');
          
          // Clear form even if no transactions (orders might still be created)
          setLimitOrderSolAmount('');
          setLimitOrderTokenAmount('');
          setLimitOrderAvgPrice('');
          setLimitOrderMarketCap('');
          setLimitOrderPrice('');
          setLimitOrderExpiry('');
          setMarketCapSlider(0);
          setShowCalendar(false);
          setCalendarDate(new Date());
          setSelectedTime('12:00');
        }
      } else {
        setOrderErrors([response.error || 'Failed to create limit orders']);
      }
    } catch (error) {
      setOrderErrors([error instanceof Error ? error.message : 'Unknown error occurred']);
    } finally {
      setIsCreatingLimitOrder(false);
    }
  };

  const handleCancelOrder = async (orderPublicKey: string, makerAddress: string) => {
    // Find the wallet that matches the maker address
    const wallet = wallets.find(w => w.address === makerAddress);
    if (!wallet) {
      console.error('Wallet not found for maker address:', makerAddress);
      return;
    }

    // Add order to cancelling set
    setCancellingOrders(prev => new Set(prev).add(orderPublicKey));

    try {
      console.log('� Starting cancel order process for:', orderPublicKey);
      
      // Use the enhanced cancel order function that handles bundle processing
      const result = await cancelOrderWithBundle({
        maker: makerAddress,
        order: orderPublicKey
      }, wallet);

      if (result.success) {
        console.log('✅ Order canceled successfully:', result.bundleId);
      } else {
        console.error('❌ Failed to cancel order:', result.error);
        // You might want to show this error to the user
        setOrderErrors(prev => [...prev, `Failed to cancel order: ${result.error}`]);
      }
    } catch (error) {
      console.error('Error canceling order:', error);
      setOrderErrors(prev => [...prev, `Error canceling order: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      // Remove order from cancelling set
      setCancellingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderPublicKey);
        return newSet;
      });
    }
  };

  // Calendar handlers
  const handleCalendarDateSelect = (date: Date) => {
    setCalendarDate(date);
    const isoString = date.toISOString().slice(0, 16); // Format for datetime-local
    setLimitOrderExpiry(isoString);
  };

  const handleCalendarTimeChange = (time: string) => {
    setSelectedTime(time);
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format price to avoid scientific notation and limit to 10 decimals
  const formatPrice = (price: number): string => {
    if (price === 0) return '0';
    
    // For very small numbers, use fixed notation with up to 10 decimals
    if (price < 1) {
      return price.toFixed(10).replace(/\.?0+$/, '');
    }
    
    // For larger numbers, use appropriate decimal places
    if (price >= 1000000) {
      return price.toFixed(2);
    } else if (price >= 1000) {
      return price.toFixed(4);
    } else if (price >= 1) {
      return price.toFixed(6);
    }
    
    return price.toFixed(10).replace(/\.?0+$/, '');
  };

  // Calculate missing amount and price when inputs change
  useEffect(() => {
    // Calculate avg price from market cap if market cap is provided
    let avgPrice = limitOrderAvgPrice;
    if (limitOrderMarketCap && solPrice) {
      const marketCap = parseFloat(limitOrderMarketCap);
      const supply = 1000000000; // 1B tokens
      const calculatedPrice = marketCap / (solPrice * supply);
      avgPrice = formatPrice(calculatedPrice);
      setLimitOrderAvgPrice(avgPrice);
    }

    if (activeTradeType === 'buy') {
      // For buy orders: SOL amount + avg price → calculate token amount
      if (limitOrderSolAmount && avgPrice) {
        const solAmount = parseFloat(limitOrderSolAmount);
        const avgPriceNum = parseFloat(avgPrice);
        const tokenAmount = solAmount / avgPriceNum;
        setLimitOrderTokenAmount(tokenAmount.toFixed(6));
        setLimitOrderPrice(formatPrice(avgPriceNum));
      } else if (limitOrderSolAmount && limitOrderTokenAmount) {
        // Fallback: calculate price from amounts
        const solAmountLamports = solToLamports(parseFloat(limitOrderSolAmount));
        const tokenAmountRaw = (parseFloat(limitOrderTokenAmount) * Math.pow(10, 6)).toString();
        const price = calculatePrice(solAmountLamports, tokenAmountRaw);
        setLimitOrderPrice(formatPrice(price));
        setLimitOrderAvgPrice(formatPrice(price));
      } else {
        setLimitOrderPrice('');
      }
    } else {
      // For sell orders: token amount + avg price → calculate SOL amount
      if (limitOrderTokenAmount && avgPrice) {
        const tokenAmount = parseFloat(limitOrderTokenAmount);
        const avgPriceNum = parseFloat(avgPrice);
        const solAmount = tokenAmount * avgPriceNum;
        setLimitOrderSolAmount(solAmount.toFixed(6));
        setLimitOrderPrice(formatPrice(avgPriceNum));
      } else if (limitOrderSolAmount && limitOrderTokenAmount) {
        // Fallback: calculate price from amounts
        const solAmountLamports = solToLamports(parseFloat(limitOrderSolAmount));
        const tokenAmountRaw = (parseFloat(limitOrderTokenAmount) * Math.pow(10, 6)).toString();
        const price = calculatePrice(tokenAmountRaw, solAmountLamports);
        setLimitOrderPrice(formatPrice(price));
        setLimitOrderAvgPrice(formatPrice(price));
      } else {
        setLimitOrderPrice('');
      }
    }
  }, [limitOrderSolAmount, limitOrderTokenAmount, limitOrderAvgPrice, limitOrderMarketCap, solPrice, activeTradeType]);

  // Initialize base market cap from props
  useEffect(() => {
    if (currentMarketCap && currentMarketCap > 0) {
      setBaseMarketCap(currentMarketCap);
    }
  }, [currentMarketCap]);

  // Handle market cap slider changes
  useEffect(() => {
    if (baseMarketCap > 0) {
      const sliderPercentage = marketCapSlider / 100; // Convert to decimal
      const adjustedMarketCap = baseMarketCap * (1 + sliderPercentage);
      setLimitOrderMarketCap(adjustedMarketCap.toFixed(2));
    }
  }, [marketCapSlider, baseMarketCap]);

  // Load active orders when switching to orders tab
  useEffect(() => {
    if (activeMainTab === 'orders') {
      loadActiveOrders();
    }
  }, [activeMainTab, tokenAddress]);

  // Close dropdown and calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate token/SOL amounts for market orders based on current market cap
  const calculateMarketOrderAmounts = () => {
    if (!currentMarketCap || !solPrice || (!buyAmount && !sellAmount)) {
      return { tokenAmount: null, solAmount: null };
    }

    const supply = 1000000000; // 1B tokens
    const avgPrice = currentMarketCap / (solPrice * supply);

    if (activeTradeType === 'buy' && buyAmount) {
      const solAmountNum = parseFloat(buyAmount);
      const tokenAmount = solAmountNum / avgPrice;
      return { tokenAmount, solAmount: solAmountNum };
    } else if (activeTradeType === 'sell' && sellAmount && tokenBalances) {
      // For sell, sellAmount is percentage of tokens
      const sellPercentage = parseFloat(sellAmount) / 100;
      
      // Calculate total token amount across all active wallets
      const activeWallets = wallets.filter(wallet => wallet.isActive);
      const totalTokenAmount = activeWallets.reduce((sum, wallet) => {
        return sum + (tokenBalances.get(wallet.address) || 0);
      }, 0);
      
      const tokenAmountToSell = totalTokenAmount * sellPercentage;
      const solAmount = tokenAmountToSell * avgPrice;
      return { tokenAmount: tokenAmountToSell, solAmount };
    }

    return { tokenAmount: null, solAmount: null };
  };

  const marketOrderAmounts = calculateMarketOrderAmounts();

  // Format number for display
  const formatAmount = (amount: number | null): string => {
    if (!amount) return '';
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(2) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(2) + 'K';
    } else if (amount < 0.01) {
      return amount.toExponential(2);
    } else {
      return amount.toFixed(2);
    }
  };

  // Generate button text based on calculated amounts
  const getButtonText = () => {
    if (isLoading) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          PROCESSING...
        </span>
      );
    }

    if (activeTradeType === 'buy') {
      if (marketOrderAmounts.tokenAmount && buyAmount) {
        return `${formatAmount(marketOrderAmounts.tokenAmount)}`;
      }
      return 'BUY';
    } else {
      if (marketOrderAmounts.solAmount && sellAmount) {
        return `${formatAmount(marketOrderAmounts.solAmount)}`;
      }
      return 'SELL';
    }
  };

  return (
    <div 
      className="relative overflow-hidden rounded-xl shadow-xl"

    >
      {/* Cyberpunk corner accents */}
      <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none">
        <div className="absolute top-0 left-0 w-px h-8 bg-gradient-to-b from-app-primary-color to-transparent"></div>
        <div className="absolute top-0 left-0 w-8 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none">
        <div className="absolute top-0 right-0 w-px h-8 bg-gradient-to-b from-app-primary-color to-transparent"></div>
        <div className="absolute top-0 right-0 w-8 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute bottom-0 left-0 w-24 h-24 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-px h-8 bg-gradient-to-t from-app-primary-color to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-8 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-px h-8 bg-gradient-to-t from-app-primary-color to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-8 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
      </div>

      {/* Main Tabs - Orders and Trading */}
      {!isFloatingCardOpen && (
        <div className="flex bg-app-primary-60 border-b border-app-primary-20">
          {/* Orders Tab - Smaller */}
          <button
            onClick={() => setActiveMainTab('orders')}
            className={`px-3 py-2 text-xs font-mono tracking-wider transition-all duration-200 ${
              activeMainTab === 'orders'
                ? 'bg-app-primary-40 color-primary border-r border-app-primary-60'
                : 'bg-transparent text-app-secondary-40 hover:text-app-secondary-60 border-r border-app-primary-20'
            }`}
          >
            <ClipboardList size={14} />
          </button>
          
          {/* Buy/Sell Toggle - Takes remaining space */}
          <div className="flex flex-1">
            <button
              onClick={() => {
                setActiveMainTab('trading');
                setActiveTradeType('buy');
              }}
              className={`flex-1 py-3 px-4 text-sm font-mono tracking-wider transition-all duration-200 ${
                activeMainTab === 'trading' && activeTradeType === 'buy'
                  ? 'bg-app-primary-color text-black font-medium'
                  : 'bg-transparent text-app-secondary-60 hover-text-app-secondary'
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => {
                setActiveMainTab('trading');
                setActiveTradeType('sell');
              }}
              className={`flex-1 py-3 px-4 text-sm font-mono tracking-wider transition-all duration-200 ${
                activeMainTab === 'trading' && activeTradeType === 'sell'
                  ? 'bg-error-alt text-white font-medium'
                  : 'bg-transparent text-warning-60 hover:text-error-alt'
              }`}
            >
              SELL
            </button>
          </div>
          
          {/* Wallet Counter */}
          <div className="flex items-center px-3 py-2 border-l border-app-primary-20">
            <div className="flex items-center gap-1 text-xs font-mono text-app-secondary-60">
              <span className="color-primary">{countActiveWallets(wallets)}</span>
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                className="color-primary"
              >
                <path 
                  d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2h18zM3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8H3zm13 4h2v2h-2v-2z" 
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Order Type Tabs - Only show for trading tab */}
      {!isFloatingCardOpen && activeMainTab === 'trading' && (
        <div className="flex items-center justify-between px-4 py-2 bg-app-primary-40 border-b border-app-primary-10">
          <div className="flex gap-4">
            <button
              onClick={() => setOrderType('market')}
              className={`text-xs font-mono tracking-wider transition-all duration-200 ${
                orderType === 'market'
                  ? 'color-primary border-b-2 border-app-primary-color pb-1'
                  : 'text-app-secondary-60 hover-text-app-secondary pb-1'
              }`}
            >
              MARKET
            </button>
            <button
              onClick={() => setOrderType('limit')}
              className={`text-xs font-mono tracking-wider transition-all duration-200 ${
                orderType === 'limit'
                  ? 'color-primary border-b-2 border-app-primary-color pb-1'
                  : 'text-app-secondary-60 hover-text-app-secondary pb-1'
              }`}
            >
              LIMIT
            </button>
          </div>
          
          {/* Action Icons - Hidden for limit orders */}
          {orderType !== 'limit' && (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenFloating}
                className="p-1.5 rounded hover-bg-primary-20 text-app-secondary-60 hover:color-primary transition-all duration-200"
                title="Detach"
              >
                <Move size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {!isFloatingCardOpen ? (
        <div className="p-3 space-y-2">
          {activeMainTab === 'orders' ? (
            /* Orders Content */
            <div className="space-y-3">
              {/* Orders Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono tracking-wider text-app-secondary uppercase">
                    ACTIVE ORDERS
                  </span>
                  {isLoadingOrders && (
                    <Loader2 size={12} className="animate-spin color-primary" />
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={loadActiveOrders}
                    disabled={isLoadingOrders}
                    className="p-1 bg-app-primary-60 border border-app-primary-40 color-primary hover-bg-primary-20 rounded transition-all duration-200 disabled:opacity-50"
                    title="Refresh orders"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>

              {/* Orders List */}
              {isLoadingOrders ? (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Loader2 size={16} className="animate-spin color-primary" />
                    <span className="text-app-secondary-60 text-sm font-mono">Loading orders...</span>
                  </div>
                </div>
              ) : !tokenAddress ? (
                <div className="text-center py-8">
                  <div className="text-app-secondary-60 text-sm font-mono mb-2">No token selected</div>
                  <div className="text-app-secondary-40 text-xs font-mono">
                    Select a token to view orders
                  </div>
                </div>
              ) : activeOrders && activeOrders.orders && activeOrders.orders.orders.length > 0 ? (
                 <div className="space-y-2">
                   {activeOrders.orders.orders.map((order: any, index) => {
                     // Properties might be directly on the order object or nested under account
                     const orderKey = order.orderKey || order.account?.orderKey;
                     const userPubkey = order.userPubkey || order.account?.userPubkey;
                     const makingAmount = order.makingAmount || order.account?.makingAmount;
                     const takingAmount = order.takingAmount || order.account?.takingAmount;
                     const expiredAt = order.expiredAt || order.account?.expiredAt;
                     const inputMint = order.inputMint || order.account?.inputMint;
                     const outputMint = order.outputMint || order.account?.outputMint;
                     
                     // Determine if this is a buy or sell order
                     // Buy order: inputMint is SOL (So11111111111111111111111111111111111111112)
                     // Sell order: outputMint is SOL (So11111111111111111111111111111111111111112)
                     const solMint = 'So11111111111111111111111111111111111111112';
                     const isBuyOrder = inputMint === solMint;
                     const isSellOrder = outputMint === solMint;
                     
                     return (
                       <div key={orderKey} className="bg-app-primary-60 border border-app-primary-20 rounded-lg p-3">
                         <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <span className={`text-xs font-mono px-2 py-1 rounded ${
                               isBuyOrder 
                                 ? 'bg-app-primary-color text-black' 
                                 : isSellOrder 
                                 ? 'bg-[#ff3232] text-white' 
                                 : 'bg-primary-20 color-primary'
                             }`}>
                               {isBuyOrder ? 'BUY' : isSellOrder ? 'SELL' : `#${index + 1}`}
                             </span>
                             <span className="text-xs font-mono text-app-secondary-60">
                               {userPubkey.slice(0, 8)}...{userPubkey.slice(-4)}
                             </span>
                           </div>
                           <button
                             onClick={() => handleCancelOrder(orderKey, userPubkey)}
                             disabled={cancellingOrders.has(orderKey)}
                             className="p-1 bg-error-20 border border-error-alt-40 text-error-alt hover-bg-error-30 rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                             title={cancellingOrders.has(orderKey) ? "Cancelling..." : "Cancel order"}
                           >
                             {cancellingOrders.has(orderKey) ? (
                               <Loader2 size={12} className="animate-spin" />
                             ) : (
                               <X size={12} />
                             )}
                           </button>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                           {isBuyOrder ? (
                             <>
                               <div>
                                 <span className="text-app-secondary-60">Spending: </span>
                                 <span className="text-app-primary">
                                   {parseFloat(makingAmount).toFixed(4)} SOL
                                 </span>
                               </div>
                               <div>
                                 <span className="text-app-secondary-60">Receiving: </span>
                                 <span className="text-app-primary">
                                   {parseInt(takingAmount).toFixed(2)} tokens
                                 </span>
                               </div>
                               <div className="col-span-2">
                                 <span className="text-app-secondary-60">Price: </span>
                                 <span className="color-primary">
                                   {calculatePrice(makingAmount, takingAmount).toFixed(8)} tokens/SOL
                                 </span>
                               </div>
                             </>
                           ) : isSellOrder ? (
                             <>
                               <div>
                                 <span className="text-app-secondary-60">Selling: </span>
                                 <span className="text-app-primary">
                                   {parseInt(makingAmount).toFixed(2)} tokens
                                 </span>
                               </div>
                               <div>
                                 <span className="text-app-secondary-60">Receiving: </span>
                                 <span className="text-app-primary">
                                   {parseFloat(takingAmount).toFixed(4)} SOL
                                 </span>
                               </div>
                               <div className="col-span-2">
                                 <span className="text-app-secondary-60">Price: </span>
                                 <span className="color-primary">
                                   {(parseFloat(takingAmount) / parseInt(makingAmount)).toFixed(8)} SOL/token
                                 </span>
                               </div>
                             </>
                           ) : (
                             <>
                               <div>
                                 <span className="text-app-secondary-60">Making: </span>
                                 <span className="text-app-primary">
                                   {parseFloat(makingAmount).toFixed(4)}
                                 </span>
                               </div>
                               <div>
                                 <span className="text-app-secondary-60">Taking: </span>
                                 <span className="text-app-primary">
                                   {parseInt(takingAmount).toFixed(2)}
                                 </span>
                               </div>
                             </>
                           )}
                           {expiredAt && (
                             <div className="col-span-2">
                               <span className="text-app-secondary-60">Expires: </span>
                               <span className="text-app-primary">
                                 {new Date(expiredAt * 1000).toLocaleString()}
                               </span>
                             </div>
                           )}
                         </div>
                       </div>
                     );
                   })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-app-secondary-60 text-sm font-mono mb-2">No active orders for this token</div>
                  <div className="text-app-secondary-40 text-xs font-mono">
                    Create limit orders in the trading tab
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Trading Content */
            <>
              {/* Amount Input and Submit Button Row - Hidden for limit orders */}
          {orderType !== 'limit' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono tracking-wider text-app-secondary uppercase">
                  AMOUNT
                </label>
                <span className="text-xs text-app-secondary-60 font-mono">
                  {activeTradeType === 'buy' ? 'SOL/WALLET' : '% TOKENS'}
                </span>
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={activeTradeType === 'buy' ? buyAmount : sellAmount}
                    onChange={handleAmountChange}
                    placeholder="0.0"
                    disabled={!tokenAddress || isLoading}
                    className="w-full px-2 py-2 bg-app-primary-80-alpha border border-app-primary-40 rounded-lg 
                             text-app-primary placeholder-app-secondary-60 font-mono text-sm 
                             focus:outline-none focus-border-primary focus:ring-1 focus:ring-app-primary-40 
                             transition-all duration-300 shadow-inner-black-80
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin color-primary" />
                    </div>
                  )}
                </div>
                
                {/* Submit Button */}
                <button
                  onClick={() => handleTradeSubmit(wallets, activeTradeType === 'buy', selectedDex, activeTradeType === 'buy' ? buyAmount : undefined, activeTradeType === 'sell' ? sellAmount : undefined)}
                  disabled={!selectedDex || (!buyAmount && !sellAmount) || isLoading || !tokenAddress}
                  className={`px-4 py-2 text-sm font-mono tracking-wider rounded-lg 
                           transition-all duration-300 relative overflow-hidden whitespace-nowrap
                           disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeTradeType === 'buy'
                      ? 'bg-gradient-to-r from-app-primary-color to-app-primary-dark hover-from-app-primary-dark hover-to-app-primary-darker text-black font-medium shadow-md shadow-app-primary-40 hover-shadow-app-primary-60 disabled:from-app-primary-40 disabled:to-app-primary-40 disabled:shadow-none'
                      : 'bg-gradient-to-r from-[#ff3232] to-[#e62929] hover:from-[#e62929] hover:to-[#cc2020] text-white font-medium shadow-md shadow-[#ff323240] hover:shadow-[#ff323260] disabled:from-[#ff323240] disabled:to-[#ff323240] disabled:shadow-none'
                  }`}
                >
                  {getButtonText()}
                </button>
              </div>
            </div>
          )}

          {/* Preset tabs - Hidden for limit orders */}
          {orderType !== 'limit' && (
            <div className="flex gap-1 mb-2">
              {presetTabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  label={tab.label}
                  isActive={tab.id === activeTabId}
                  isEditMode={isEditMode}
                  onClick={() => handleTabSwitch(tab.id)}
                  onEdit={(newLabel) => handleEditTabLabel(tab.id, newLabel)}
                />
              ))}
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  isEditMode 
                    ? 'bg-app-primary-color hover:bg-app-primary-dark text-black' 
                    : 'bg-app-primary-60 border border-app-primary-40 color-primary hover-bg-primary-20'
                }`}
                title={isEditMode ? 'Save changes' : 'Edit presets'}
              >
                {isEditMode ? <Check size={12} /> : <Edit3 size={12} />}
              </button>
            </div>
          )}

          {/* Preset Buttons - Hidden for limit orders */}
          {orderType !== 'limit' && (
            <div className="grid grid-cols-4 gap-1">
              {(activeTradeType === 'buy' ? activeTab.buyPresets : activeTab.sellPresets).map((preset, index) => (
                <PresetButton
                  key={`${activeTradeType}-${index}`}
                  value={preset}
                  onExecute={() => handlePresetClick(preset)}
                  onChange={(newValue) => {
                    if (activeTradeType === 'buy') {
                      handleEditBuyPreset(index, newValue);
                    } else {
                      handleEditSellPreset(index, newValue);
                    }
                  }}
                  isLoading={isLoading}
                  variant={activeTradeType}
                  isEditMode={isEditMode}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Limit Order Inputs - Fully Functional */}
          {orderType === 'limit' && (
            <div className="space-y-3">
              
              {/* Expiry Input (Optional) - Calendar Widget */}
              <div className="space-y-1 relative">
                <label className="text-xs font-mono tracking-wider text-app-secondary-60 uppercase">
                  EXPIRY (OPTIONAL)
                </label>
                <div className="relative" ref={calendarRef}>
                   <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    disabled={!tokenAddress || isCreatingLimitOrder}
                    className="w-full px-2 py-2 bg-app-primary-80-alpha border border-app-primary-40 rounded-lg 
                             text-app-primary placeholder-app-secondary-60 font-mono text-sm 
                             focus:outline-none focus-border-primary focus:ring-1 focus:ring-app-primary-40 
                             transition-all duration-300 shadow-inner-black-80
                             disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center justify-between"
                  >
                    <span className={limitOrderExpiry ? 'text-app-primary' : 'text-app-secondary-60'}>
                      {limitOrderExpiry ? formatDisplayDate(limitOrderExpiry) : 'Select expiry date...'}
                    </span>
                    <Calendar size={16} className="text-app-secondary-60" />
                  </button>
                  
                  {/* Clear button */}
                  {limitOrderExpiry && (
                    <button
                      type="button"
                      onClick={() => {
                        setLimitOrderExpiry('');
                        setLimitOrderMarketCap('');
                        setMarketCapSlider(0);
                        setShowCalendar(false);
                      }}
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 text-app-secondary-60 hover:text-app-primary transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                  
                  {/* Calendar Widget */}
                  <CalendarWidget
                    isOpen={showCalendar}
                    onClose={() => setShowCalendar(false)}
                    selectedDate={calendarDate}
                    onDateSelect={handleCalendarDateSelect}
                    selectedTime={selectedTime}
                    onTimeChange={handleCalendarTimeChange}
                  />
                </div>
              </div>
              {/* First Input - SOL Amount for Buy, Token Amount for Sell */}
              <div className="space-y-1">
                <label className="text-xs font-mono tracking-wider text-app-secondary uppercase">
                  {activeTradeType === 'buy' ? 'SOL AMOUNT' : 'TOKEN AMOUNT'}
                </label>
                <input
                  type="text"
                  value={activeTradeType === 'buy' ? limitOrderSolAmount : limitOrderTokenAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    if (activeTradeType === 'buy') {
                      setLimitOrderSolAmount(value);
                      // Validate SOL amount for buy orders
                      if (value && parseFloat(value) < 0.1) {
                        showToast('Minimum SOL amount for limit orders is 0.1 SOL', 'error');
                      }
                    } else {
                      setLimitOrderTokenAmount(value);
                      // Validate SOL amount for sell orders
                      if (value && limitOrderAvgPrice) {
                        const solAmount = parseFloat(value) * parseFloat(limitOrderAvgPrice);
                        if (solAmount < 0.1) {
                          showToast('Minimum SOL amount for limit orders is 0.1 SOL', 'error');
                        }
                      }
                    }
                  }}
                  placeholder="0.0"
                  disabled={!tokenAddress || isCreatingLimitOrder}
                  className="w-full px-2 py-2 bg-app-primary-80-alpha border border-app-primary-40 rounded-lg 
                           text-app-primary placeholder-app-secondary-60 font-mono text-sm 
                           focus:outline-none focus-border-primary focus:ring-1 focus:ring-app-primary-40 
                           transition-all duration-300 shadow-inner-black-80
                           disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Second Input - Average Price */}
              <div className="space-y-1">
                <label className="text-xs font-mono tracking-wider text-app-secondary uppercase">
                  AVG PRICE (SOL/TOKEN)
                </label>
                <input
                  type="text"
                  value={limitOrderAvgPrice}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setLimitOrderAvgPrice(value);
                    // Validate SOL amount for sell orders
                    if (activeTradeType === 'sell' && limitOrderTokenAmount && value) {
                      const solAmount = parseFloat(limitOrderTokenAmount) * parseFloat(value);
                      if (solAmount < 0.1) {
                        showToast('Minimum SOL amount for limit orders is 0.1 SOL', 'error');
                      }
                    }
                  }}
                  placeholder="0.0"
                  disabled={true}
                  className="w-full px-2 py-2 bg-app-primary-80-alpha border border-app-primary-40 rounded-lg 
                           text-app-primary placeholder-app-secondary-60 font-mono text-sm 
                           focus:outline-none focus-border-primary focus:ring-1 focus:ring-app-primary-40 
                           transition-all duration-300 shadow-inner-black-80
                           disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Market Cap Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono tracking-wider text-app-secondary uppercase">
                    MARKET CAP
                  </label>
                  <input
                    type="text"
                    value={marketCapSlider > 0 ? `+${marketCapSlider}` : marketCapSlider.toString()}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^-0-9.]/g, '');
                      if (value === '' || value === '-') {
                        setMarketCapSlider(0);
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          setMarketCapSlider(Math.round(numValue));
                        }
                      }
                    }}
                    disabled={!tokenAddress || isCreatingLimitOrder || !baseMarketCap}
                    className="text-xs font-mono color-primary bg-app-primary-90-alpha border border-app-primary-30 rounded px-1 py-0.5 text-right w-16
                             disabled:opacity-50 disabled:cursor-not-allowed
                             hover:border-app-primary-40 focus:border-app-primary-50 focus:bg-app-primary-80-alpha focus:outline-none
                             transition-all duration-200"
                  />
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="-100"
                    max="200"
                    step="5"
                    value={marketCapSlider}
                    onChange={(e) => setMarketCapSlider(parseInt(e.target.value))}
                    disabled={!tokenAddress || isCreatingLimitOrder || !baseMarketCap}
                    className="w-full h-2 bg-app-primary-60 rounded-lg appearance-none cursor-pointer
                             disabled:opacity-50 disabled:cursor-not-allowed
                             slider-thumb"
                  />
                </div>
                {baseMarketCap > 0 && (
                  <div className="bg-primary-10 border border-app-primary-20 rounded-lg p-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono text-app-secondary-60 uppercase">Target Market Cap:</span>
                      <span className="text-xs font-mono color-primary">
                        ${limitOrderMarketCap ? parseFloat(limitOrderMarketCap).toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Calculated Amount Display */}
              {((activeTradeType === 'buy' && limitOrderTokenAmount) || (activeTradeType === 'sell' && limitOrderSolAmount)) && (
                <div className="bg-primary-10 border border-app-primary-20 rounded-lg p-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-app-secondary-60 uppercase">
                      {activeTradeType === 'buy' ? 'Calculated Token Amount:' : 'Calculated SOL Amount:'}
                    </span>
                    <span className="text-xs font-mono color-primary">
                      {activeTradeType === 'buy' ? limitOrderTokenAmount : limitOrderSolAmount}
                    </span>
                  </div>
                </div>
              )}

              {/* Price Display */}
              {limitOrderPrice && (
                <div className="bg-primary-10 border border-app-primary-20 rounded-lg p-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-app-secondary-60 uppercase">Price:</span>
                    <span className="text-xs font-mono color-primary">
                      {limitOrderPrice} {activeTradeType === 'buy' ? 'tokens/SOL' : 'SOL/token'}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Create Order Button */}
              <button
                onClick={handleCreateLimitOrder}
                disabled={
                  !tokenAddress || 
                  !limitOrderAvgPrice || 
                  (activeTradeType === 'buy' && !limitOrderSolAmount) ||
                  (activeTradeType === 'sell' && !limitOrderTokenAmount) ||
                  isCreatingLimitOrder || 
                  wallets.filter(w => w.isActive).length === 0
                }
                className="w-full px-4 py-2 text-sm font-mono tracking-wider rounded-lg 
                         bg-gradient-to-r from-app-primary-color to-app-primary-dark hover-from-app-primary-dark hover-to-app-primary-darker 
                         text-black font-medium shadow-md shadow-app-primary-40 hover-shadow-app-primary-60
                         transition-all duration-300 relative overflow-hidden
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:from-app-primary-40 disabled:to-app-primary-40 disabled:shadow-none"
              >
                {isCreatingLimitOrder ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    CREATING ORDER...
                  </span>
                ) : (
                  `CREATE LIMIT ${activeTradeType.toUpperCase()}`
                )}
              </button>
            </div>
          )}
            </>
          )}
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-app-secondary-60 text-sm font-mono tracking-wider">
            TRADING INTERFACE IS OPEN IN FLOATING MODE
          </p>
        </div>
      )}
    </div>
  );
};

export default TradingCard;