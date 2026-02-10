import React, {
  useEffect,
  lazy,
  useCallback,
  useReducer,
  useMemo,
  useState,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Settings,
  Wrench,
  Bot,
  Blocks,
  Wallet,
  BookOpen,
  Columns2,
} from "lucide-react";
import { brand } from "./utils/brandConfig";
import type { Connection } from "@solana/web3.js";
import { initStyles } from "./components/Styles";
import { fetchWalletBalances } from "./utils/wallet";
import { saveWalletsToCookies } from "./utils/storage";
import {
  loadQuickBuyPreferencesFromCookies,
  saveQuickBuyPreferencesToCookies,
  saveSplitSizesToCookies,
  loadSplitSizesFromCookies,
  saveViewModeToCookies,
  loadViewModeFromCookies,
  type ViewMode,
} from "./utils/storage";
import type {
  WalletType,
  ConfigType,
  IframeData,
  WalletCategory,
  CategoryQuickTradeSettings,
} from "./utils/types";
import { addRecentToken } from "./utils/recentTokens";
import { useAppContext } from "./contexts";
import { useToast } from "./utils/hooks/useToast";
import { OnboardingTutorial } from "./components/OnboardingTutorial";
import { MultichartLayout } from "./components/multichart/MultichartLayout";
import { AdvancedLayout } from "./components/advanced";
import { useMultichart } from "./contexts/useMultichart";

// Lazy loaded components
const Frame = lazy(() =>
  import("./Frame").then((module) => ({ default: module.Frame })),
);
const ActionsPage = lazy(() =>
  import("./Actions").then((module) => ({ default: module.ActionsPage })),
);
const MobileLayout = lazy(() => import("./Mobile"));

// Import modal components
const PnlModal = lazy(() =>
  import("./components/modals/CalculatePNLModal").then((module) => ({
    default: module.PnlModal,
  })),
);

const ToolsDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (action: () => void): void => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative z-40">
      {/* Main Button */}
      <button
        id="nav-tools"
        onClick={(): void => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover-border-primary-60 rounded transition-all duration-300"
      >
        <Wrench size={16} className="color-primary" />
        <span className="text-xs font-mono color-primary font-medium tracking-wider">
          MENU
        </span>
        <ChevronDown
          size={12}
          className={`text-app-primary-40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={(): void => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="absolute top-full right-0 mt-1 w-48 z-50">
            <div className="bg-app-secondary border border-app-primary-20 rounded overflow-hidden shadow-xl max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="px-3 py-2 border-b border-app-primary-10">
                <div className="flex items-center gap-2 text-[10px] font-mono text-app-secondary uppercase tracking-widest">
                  <Wrench size={10} />
                  MENU
                </div>
              </div>

              {/* Tools List */}
              <div className="py-1">
                {/* Wallets */}
                <button
                  onClick={() => handleItemClick(() => navigate("/wallets"))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-primary-05 text-app-tertiary"
                >
                  <div className="p-1.5 bg-gradient-to-br from-app-primary-20 to-app-primary-05 rounded">
                    <Wallet size={14} className="color-primary" />
                  </div>
                  <span className="text-xs font-mono font-medium">Wallets</span>
                </button>

                {/* Tools */}
                <button
                  onClick={() => handleItemClick(() => navigate("/tools"))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-primary-05 text-app-tertiary"
                >
                  <div className="p-1.5 bg-gradient-to-br from-app-primary-20 to-app-primary-05 rounded">
                    <Bot size={14} className="color-primary" />
                  </div>
                  <span className="text-xs font-mono font-medium">
                    Tools
                  </span>
                </button>

                {/* Deploy */}
                <button
                  onClick={() => handleItemClick(() => navigate("/deploy"))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-primary-05 text-app-tertiary"
                >
                  <div className="p-1.5 bg-gradient-to-br from-app-primary-20 to-app-primary-05 rounded">
                    <Blocks size={14} className="color-primary" />
                  </div>
                  <span className="text-xs font-mono font-medium">Deploy</span>
                </button>

                {/* Docs */}
                <button
                  onClick={() =>
                    handleItemClick(() =>
                      window.open(
                        brand.docsUrl,
                        "_blank",
                        "noopener,noreferrer",
                      ),
                    )
                  }
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-primary-05 text-app-tertiary"
                >
                  <div className="p-1.5 bg-gradient-to-br from-app-primary-20 to-app-primary-05 rounded">
                    <BookOpen size={14} className="color-primary" />
                  </div>
                  <span className="text-xs font-mono font-medium">
                    Documentation
                  </span>
                </button>

                {/* Settings */}
                <button
                  onClick={() => handleItemClick(() => navigate("/settings"))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-primary-05 text-app-tertiary"
                >
                  <div className="p-1.5 bg-gradient-to-br from-app-primary-20 to-app-primary-05 rounded">
                    <Settings size={14} className="color-primary" />
                  </div>
                  <span className="text-xs font-mono font-medium">
                    Settings
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const WalletManager: React.FC = () => {
  const { tokenAddress: tokenAddressParam } = useParams<{
    tokenAddress?: string;
  }>();
  const navigate = useNavigate();
  const {
    wallets: contextWallets,
    setWallets: setContextWallets,
    config: contextConfig,
    setConfig: setContextConfig,
    connection: contextConnection,
    rpcManager: contextRpcManager,
    baseCurrencyBalances: contextBaseCurrencyBalances,
    setBaseCurrencyBalances: setContextBaseCurrencyBalances,
    tokenBalances: contextTokenBalances,
    setTokenBalances: setContextTokenBalances,
    baseCurrency: contextBaseCurrency,
  } = useAppContext();

  // Multichart context for adding tokens when in multichart mode
  const { addToken: addMultichartToken, tokens: multichartTokens, setActiveToken: setMultichartActiveToken } = useMultichart();

  // Toast notifications
  const { showToast } = useToast();

  // Detect if we're on mobile or desktop to conditionally render layouts
  const [isMobile, setIsMobile] = useState(false);

  // Tutorial visibility state
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768); // md breakpoint is 768px
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // View mode state - Simple (left column hidden) or Advanced (left column visible)
  // On mobile, always default to simple mode
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (window.innerWidth < 768) {
      return "simple";
    }
    return loadViewModeFromCookies();
  });

  // Store advanced sizes separately so we can restore them when switching back from simple mode
  const [savedAdvancedSizes, setSavedAdvancedSizes] = useState<number[]>(() => {
    const savedSizes = loadSplitSizesFromCookies();
    return savedSizes || [25, 75];
  });

  // Split panel sizes - load from cookies or use defaults
  const [splitSizes, setSplitSizes] = useState<number[]>(() => {
    const savedMode = loadViewModeFromCookies();
    if (savedMode === "simple") {
      return [0, 100]; // Simple mode: left column hidden
    }
    const savedSizes = loadSplitSizesFromCookies();
    return savedSizes || [25, 75]; // Default sizes
  });

  // Category settings for quick trade (loaded from localStorage)
  const [categorySettings, setCategorySettings] = useState<
    Record<WalletCategory, CategoryQuickTradeSettings>
  >(() => {
    const saved = localStorage.getItem("categoryQuickTradeSettings");
    if (saved) {
      try {
        return JSON.parse(saved) as Record<
          WalletCategory,
          CategoryQuickTradeSettings
        >;
      } catch {
        // Invalid JSON, use defaults
      }
    }
    // Default settings
    return {
      Soft: {
        enabled: true,
        buyAmount: 0.01,
        buyMinAmount: 0.01,
        buyMaxAmount: 0.03,
        useBuyRange: false,
        sellPercentage: 100,
        sellMinPercentage: 50,
        sellMaxPercentage: 100,
        useSellRange: false,
      },
      Medium: {
        enabled: true,
        buyAmount: 0.05,
        buyMinAmount: 0.03,
        buyMaxAmount: 0.07,
        useBuyRange: false,
        sellPercentage: 100,
        sellMinPercentage: 50,
        sellMaxPercentage: 100,
        useSellRange: false,
      },
      Hard: {
        enabled: true,
        buyAmount: 0.1,
        buyMinAmount: 0.07,
        buyMaxAmount: 0.15,
        useBuyRange: false,
        sellPercentage: 100,
        sellMinPercentage: 50,
        sellMaxPercentage: 100,
        useSellRange: false,
      },
    };
  });

  // Sync categorySettings with localStorage when window gains focus or storage changes
  useEffect(() => {
    const syncCategorySettings = (): void => {
      const saved = localStorage.getItem("categoryQuickTradeSettings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Record<
            WalletCategory,
            CategoryQuickTradeSettings
          >;
          setCategorySettings(parsed);
        } catch {
          // Invalid JSON, ignore
        }
      }
    };

    // Sync when window gains focus (user might have changed settings on another page)
    window.addEventListener("focus", syncCategorySettings);
    // Also sync on storage events (for cross-tab sync)
    window.addEventListener("storage", syncCategorySettings);

    return () => {
      window.removeEventListener("focus", syncCategorySettings);
      window.removeEventListener("storage", syncCategorySettings);
    };
  }, []);

  // Save split sizes to cookies when they change (debounced) - only in advanced mode
  useEffect(() => {
    if (viewMode === "advanced" && splitSizes[0] > 5) {
      const timeoutId = setTimeout(() => {
        saveSplitSizesToCookies(splitSizes);
        setSavedAdvancedSizes(splitSizes);
      }, 300); // Debounce by 300ms to avoid excessive cookie writes

      return (): void => {
        clearTimeout(timeoutId);
      };
    }
    return undefined;
  }, [splitSizes, viewMode]);

  // Save view mode to cookies when it changes
  useEffect(() => {
    saveViewModeToCookies(viewMode);
  }, [viewMode]);

  // Handle view mode toggle
  const handleViewModeToggle = useCallback(() => {
    if (viewMode === "simple") {
      // Switch to advanced: restore saved sizes
      setViewMode("advanced");
      setSplitSizes(savedAdvancedSizes);
    } else if (viewMode === "advanced") {
      // Switch to multichart
      setViewMode("multichart");
    } else {
      // Switch back to simple: save current sizes and collapse left panel
      setSavedAdvancedSizes(splitSizes);
      saveSplitSizesToCookies(splitSizes);
      setViewMode("simple");
      setSplitSizes([0, 100]);
    }
  }, [viewMode, splitSizes, savedAdvancedSizes]);

  // Handle view mode change from dropdown
  const handleViewModeChange = useCallback(
    (newMode: ViewMode) => {
      if (newMode === viewMode) return;

      if (newMode === "simple") {
        // Save current sizes and collapse left panel
        if (viewMode === "advanced") {
          setSavedAdvancedSizes(splitSizes);
          saveSplitSizesToCookies(splitSizes);
        }
        setViewMode("simple");
        setSplitSizes([0, 100]);
      } else if (newMode === "advanced") {
        // Restore saved sizes
        setViewMode("advanced");
        setSplitSizes(savedAdvancedSizes);
      } else {
        // Switch to multichart
        if (viewMode === "advanced") {
          setSavedAdvancedSizes(splitSizes);
          saveSplitSizesToCookies(splitSizes);
        }
        setViewMode("multichart");
      }
    },
    [viewMode, splitSizes, savedAdvancedSizes],
  );

  // Apply styles
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = initStyles();
    document.head.appendChild(styleElement);

    return (): void => {
      // Safely remove style element if it's still a child
      if (styleElement.parentNode === document.head) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  // Optimized state management with useReducer
  interface AppState {
    copiedAddress: string | null;
    tokenAddress: string;
    config: ConfigType;
    currentPage: "chart" | "actions";
    wallets: WalletType[];
    isRefreshing: boolean;
    connection: Connection | null;
    baseCurrencyBalances: Map<string, number>;
    tokenBalances: Map<string, number>;
    showChartView: boolean;

    isLoadingChart: boolean;
    currentMarketCap: number | null;
    modals: {
      calculatePNLModalOpen: boolean;
    };
    sortDirection: "asc" | "desc";
    tickEffect: boolean;

    automateCard: {
      isOpen: boolean;
      position: { x: number; y: number };
      isDragging: boolean;
    };
    quickBuyEnabled: boolean;
    quickBuyAmount: number;
    quickBuyMinAmount: number;
    quickBuyMaxAmount: number;
    useQuickBuyRange: boolean;
    quickSellPercentage: number;
    quickSellMinPercentage: number;
    quickSellMaxPercentage: number;
    useQuickSellRange: boolean;
    iframeData: IframeData | null;
    nonWhitelistedTrades: {
      type: "buy" | "sell";
      address: string;
      tokensAmount: number;
      avgPrice: number;
      solAmount: number;
      timestamp: number;
      signature: string;
      tokenMint: string;
      marketCap: number;
    }[];
  }

  type AppAction =
    | { type: "SET_COPIED_ADDRESS"; payload: string | null }
    | { type: "SET_TOKEN_ADDRESS"; payload: string }
    | { type: "SET_CONFIG"; payload: ConfigType }
    | { type: "SET_CURRENT_PAGE"; payload: "chart" | "actions" }
    | { type: "SET_WALLETS"; payload: WalletType[] }
    | { type: "SET_REFRESHING"; payload: boolean }
    | { type: "SET_CONNECTION"; payload: Connection | null }
    | { type: "SET_BASE_CURRENCY_BALANCES"; payload: Map<string, number> }
    | { type: "SET_TOKEN_BALANCES"; payload: Map<string, number> }
    | { type: "SET_LOADING_CHART"; payload: boolean }
    | { type: "SET_MARKET_CAP"; payload: number | null }
    | {
        type: "SET_MODAL";
        payload: { modal: keyof AppState["modals"]; open: boolean };
      }
    | { type: "SET_SORT_DIRECTION"; payload: "asc" | "desc" }
    | { type: "SET_TICK_EFFECT"; payload: boolean }
    | {
        type: "UPDATE_BALANCE";
        payload: {
          address: string;
          solBalance?: number;
          tokenBalance?: number;
        };
      }
    | { type: "SET_AUTOMATE_CARD_OPEN"; payload: boolean }
    | { type: "SET_AUTOMATE_CARD_POSITION"; payload: { x: number; y: number } }
    | { type: "SET_AUTOMATE_CARD_DRAGGING"; payload: boolean }
    | { type: "SET_QUICK_BUY_ENABLED"; payload: boolean }
    | { type: "SET_QUICK_BUY_AMOUNT"; payload: number }
    | { type: "SET_QUICK_BUY_MIN_AMOUNT"; payload: number }
    | { type: "SET_QUICK_BUY_MAX_AMOUNT"; payload: number }
    | { type: "SET_USE_QUICK_BUY_RANGE"; payload: boolean }
    | { type: "SET_QUICK_SELL_PERCENTAGE"; payload: number }
    | { type: "SET_QUICK_SELL_MIN_PERCENTAGE"; payload: number }
    | { type: "SET_QUICK_SELL_MAX_PERCENTAGE"; payload: number }
    | { type: "SET_USE_QUICK_SELL_RANGE"; payload: boolean }
    | { type: "SET_IFRAME_DATA"; payload: IframeData | null }
    | {
        type: "SET_NON_WHITELISTED_TRADES";
        payload: {
          type: "buy" | "sell";
          address: string;
          tokensAmount: number;
          avgPrice: number;
          solAmount: number;
          timestamp: number;
          signature: string;
          tokenMint: string;
          marketCap: number;
        }[];
      }
    | { type: "SET_SHOW_CHART_VIEW"; payload: boolean };

  // Determine token address from route
  const routeTokenAddress = tokenAddressParam || "";

  const initialState: AppState = {
    copiedAddress: null,
    tokenAddress: routeTokenAddress,
    config: contextConfig,
    currentPage: "chart",
    wallets: contextWallets,
    isRefreshing: false, // Always start fresh - don't inherit stale refreshing state from context
    connection: contextConnection,
    baseCurrencyBalances: contextBaseCurrencyBalances,
    tokenBalances: contextTokenBalances,
    showChartView: true, // Always show chart view in App

    isLoadingChart: false,
    currentMarketCap: null,
    modals: {
      calculatePNLModalOpen: false,
    },
    sortDirection: "asc",
    tickEffect: false,

    automateCard: {
      isOpen: false,
      position: { x: 200, y: 200 },
      isDragging: false,
    },
    quickBuyEnabled: true,
    quickBuyAmount: 0.01,
    quickBuyMinAmount: 0.01,
    quickBuyMaxAmount: 0.05,
    useQuickBuyRange: false,
    quickSellPercentage: 100,
    quickSellMinPercentage: 25,
    quickSellMaxPercentage: 100,
    useQuickSellRange: false,
    iframeData: null,
    nonWhitelistedTrades: [],
  };

  const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
      case "SET_COPIED_ADDRESS":
        return { ...state, copiedAddress: action.payload };
      case "SET_TOKEN_ADDRESS":
        return { ...state, tokenAddress: action.payload };
      case "SET_CONFIG":
        return { ...state, config: action.payload };
      case "SET_CURRENT_PAGE":
        return { ...state, currentPage: action.payload };
      case "SET_WALLETS":
        return { ...state, wallets: action.payload };
      case "SET_REFRESHING":
        return { ...state, isRefreshing: action.payload };
      case "SET_CONNECTION":
        return { ...state, connection: action.payload };
      case "SET_BASE_CURRENCY_BALANCES":
        return { ...state, baseCurrencyBalances: action.payload };
      case "SET_TOKEN_BALANCES":
        return { ...state, tokenBalances: action.payload };

      case "SET_LOADING_CHART":
        return { ...state, isLoadingChart: action.payload };
      case "SET_MARKET_CAP":
        return { ...state, currentMarketCap: action.payload };
      case "SET_MODAL":
        return {
          ...state,
          modals: {
            ...state.modals,
            [action.payload.modal]: action.payload.open,
          },
        };
      case "SET_SORT_DIRECTION":
        return { ...state, sortDirection: action.payload };
      case "SET_TICK_EFFECT":
        return { ...state, tickEffect: action.payload };

      case "UPDATE_BALANCE": {
        const newState = { ...state };
        if (action.payload.solBalance !== undefined) {
          newState.baseCurrencyBalances = new Map(state.baseCurrencyBalances);
          newState.baseCurrencyBalances.set(
            action.payload.address,
            action.payload.solBalance,
          );
        }
        if (action.payload.tokenBalance !== undefined) {
          newState.tokenBalances = new Map(state.tokenBalances);
          newState.tokenBalances.set(
            action.payload.address,
            action.payload.tokenBalance,
          );
        }
        return newState;
      }
      case "SET_AUTOMATE_CARD_OPEN":
        return {
          ...state,
          automateCard: {
            ...state.automateCard,
            isOpen: action.payload,
          },
        };
      case "SET_AUTOMATE_CARD_POSITION":
        return {
          ...state,
          automateCard: {
            ...state.automateCard,
            position: action.payload,
          },
        };
      case "SET_AUTOMATE_CARD_DRAGGING":
        return {
          ...state,
          automateCard: {
            ...state.automateCard,
            isDragging: action.payload,
          },
        };
      case "SET_QUICK_BUY_ENABLED":
        return { ...state, quickBuyEnabled: action.payload };
      case "SET_QUICK_BUY_AMOUNT":
        return { ...state, quickBuyAmount: action.payload };
      case "SET_QUICK_BUY_MIN_AMOUNT":
        return { ...state, quickBuyMinAmount: action.payload };
      case "SET_QUICK_BUY_MAX_AMOUNT":
        return { ...state, quickBuyMaxAmount: action.payload };
      case "SET_USE_QUICK_BUY_RANGE":
        return { ...state, useQuickBuyRange: action.payload };
      case "SET_QUICK_SELL_PERCENTAGE":
        return { ...state, quickSellPercentage: action.payload };
      case "SET_QUICK_SELL_MIN_PERCENTAGE":
        return { ...state, quickSellMinPercentage: action.payload };
      case "SET_QUICK_SELL_MAX_PERCENTAGE":
        return { ...state, quickSellMaxPercentage: action.payload };
      case "SET_USE_QUICK_SELL_RANGE":
        return { ...state, useQuickSellRange: action.payload };
      case "SET_IFRAME_DATA":
        return { ...state, iframeData: action.payload };
      case "SET_NON_WHITELISTED_TRADES":
        return { ...state, nonWhitelistedTrades: action.payload };
      case "SET_SHOW_CHART_VIEW":
        return { ...state, showChartView: action.payload };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(appReducer, initialState);

  // Ref to latest wallets for resolving functional updates without stale closures
  const walletsRef = useRef(state.wallets);
  walletsRef.current = state.wallets;

  // Memoized callbacks to prevent unnecessary re-renders
  const memoizedCallbacks = useMemo(
    () => ({
      setCopiedAddress: (address: string | null): void =>
        dispatch({ type: "SET_COPIED_ADDRESS", payload: address }),
      setTokenAddress: (address: string): void => {
        if (viewMode === "multichart" && address) {
          const alreadyInList = multichartTokens.some(t => t.address === address);
          if (!alreadyInList) {
            addMultichartToken(address);
          }
          navigate("/monitor", { replace: true });
          return;
        }
        dispatch({ type: "SET_TOKEN_ADDRESS", payload: address });
        // Navigate to the new token route
        if (address) {
          navigate(`/tokens/${address}`);
        } else {
          navigate("/monitor");
        }
      },
      setConfig: (config: ConfigType): void => {
        dispatch({ type: "SET_CONFIG", payload: config });
        setContextConfig(config);
      },
      setCurrentPage: (page: "chart" | "actions"): void =>
        dispatch({ type: "SET_CURRENT_PAGE", payload: page }),
      setWallets: (walletsOrFn: WalletType[] | ((prev: WalletType[]) => WalletType[])): void => {
        const resolved = typeof walletsOrFn === "function"
          ? walletsOrFn(walletsRef.current)
          : walletsOrFn;
        dispatch({ type: "SET_WALLETS", payload: resolved });
        setContextWallets(resolved);
      },
      setIsRefreshing: (refreshing: boolean): void =>
        dispatch({ type: "SET_REFRESHING", payload: refreshing }),
      setConnection: (connection: Connection | null): void =>
        dispatch({ type: "SET_CONNECTION", payload: connection }),
      setBaseCurrencyBalances: (balances: Map<string, number>): void => {
        dispatch({ type: "SET_BASE_CURRENCY_BALANCES", payload: balances });
        setContextBaseCurrencyBalances(balances);
      },
      setTokenBalances: (balances: Map<string, number>): void => {
        dispatch({ type: "SET_TOKEN_BALANCES", payload: balances });
        setContextTokenBalances(balances);
      },

      setIsLoadingChart: (loading: boolean): void =>
        dispatch({ type: "SET_LOADING_CHART", payload: loading }),
      setCurrentMarketCap: (cap: number | null): void =>
        dispatch({ type: "SET_MARKET_CAP", payload: cap }),
      setCalculatePNLModalOpen: (open: boolean): void =>
        dispatch({
          type: "SET_MODAL",
          payload: { modal: "calculatePNLModalOpen", open },
        }),
      setSortDirection: (direction: "asc" | "desc"): void =>
        dispatch({ type: "SET_SORT_DIRECTION", payload: direction }),
      setTickEffect: (effect: boolean): void =>
        dispatch({ type: "SET_TICK_EFFECT", payload: effect }),

      setAutomateCardPosition: (position: { x: number; y: number }): void =>
        dispatch({ type: "SET_AUTOMATE_CARD_POSITION", payload: position }),
      setAutomateCardDragging: (dragging: boolean): void =>
        dispatch({ type: "SET_AUTOMATE_CARD_DRAGGING", payload: dragging }),
      setQuickBuyEnabled: (enabled: boolean): void =>
        dispatch({ type: "SET_QUICK_BUY_ENABLED", payload: enabled }),
      setQuickBuyAmount: (amount: number): void =>
        dispatch({ type: "SET_QUICK_BUY_AMOUNT", payload: amount }),
      setQuickBuyMinAmount: (amount: number): void =>
        dispatch({ type: "SET_QUICK_BUY_MIN_AMOUNT", payload: amount }),
      setQuickBuyMaxAmount: (amount: number): void =>
        dispatch({ type: "SET_QUICK_BUY_MAX_AMOUNT", payload: amount }),
      setUseQuickBuyRange: (useRange: boolean): void =>
        dispatch({ type: "SET_USE_QUICK_BUY_RANGE", payload: useRange }),
      setQuickSellPercentage: (percentage: number): void =>
        dispatch({ type: "SET_QUICK_SELL_PERCENTAGE", payload: percentage }),
      setQuickSellMinPercentage: (percentage: number): void =>
        dispatch({
          type: "SET_QUICK_SELL_MIN_PERCENTAGE",
          payload: percentage,
        }),
      setQuickSellMaxPercentage: (percentage: number): void =>
        dispatch({
          type: "SET_QUICK_SELL_MAX_PERCENTAGE",
          payload: percentage,
        }),
      setUseQuickSellRange: (useRange: boolean): void =>
        dispatch({ type: "SET_USE_QUICK_SELL_RANGE", payload: useRange }),
      setIframeData: (data: IframeData | null): void =>
        dispatch({ type: "SET_IFRAME_DATA", payload: data }),
      setNonWhitelistedTrades: (
        trades: {
          type: "buy" | "sell";
          address: string;
          tokensAmount: number;
          avgPrice: number;
          solAmount: number;
          timestamp: number;
          signature: string;
          tokenMint: string;
          marketCap: number;
        }[],
      ): void =>
        dispatch({ type: "SET_NON_WHITELISTED_TRADES", payload: trades }),
      setShowChartView: (show: boolean): void =>
        dispatch({ type: "SET_SHOW_CHART_VIEW", payload: show }),
    }),
    [
      dispatch,
      navigate,
      setContextConfig,
      setContextWallets,
      setContextBaseCurrencyBalances,
      setContextTokenBalances,
      addMultichartToken,
      multichartTokens,
      viewMode,
    ],
  );

  // Update token address when route changes
  // In multichart mode, add token to list and clear URL instead of setting single token
  useEffect(() => {
    if (viewMode === "multichart" && tokenAddressParam) {
      // Add token to multichart list if not already there
      const alreadyInList = multichartTokens.some(t => t.address === tokenAddressParam);
      if (!alreadyInList) {
        addMultichartToken(tokenAddressParam);
      } else {
        // Token already exists - switch to it
        const tokenIndex = multichartTokens.findIndex(t => t.address === tokenAddressParam);
        if (tokenIndex >= 0) {
          setMultichartActiveToken(tokenIndex);
        }
      }
      // Navigate to monitor to show multichart view
      navigate("/monitor", { replace: true });
      return;
    }

    if (tokenAddressParam !== state.tokenAddress) {
      dispatch({ type: "SET_TOKEN_ADDRESS", payload: tokenAddressParam || "" });
    }
  }, [tokenAddressParam, state.tokenAddress, viewMode, multichartTokens, addMultichartToken, setMultichartActiveToken, navigate]);

  // Track processed trades to avoid infinite loops
  const processedTradesRef = useRef<Set<string>>(new Set());

  // Track previous token address to clear balances when switching tokens
  const previousTokenAddressRef = useRef<string>(state.tokenAddress);

  // Monitor iframe data for whitelist trades and update wallet balances
  useEffect(() => {
    if (
      state.iframeData?.recentTrades &&
      state.iframeData.recentTrades.length > 0
    ) {
      const latestTrade = state.iframeData.recentTrades[0];

      // Create a unique key for this trade (address + signature + timestamp)
      const tradeKey = `${latestTrade.address}-${latestTrade.signature}-${latestTrade.timestamp}`;

      // Skip if we've already processed this trade
      if (processedTradesRef.current.has(tradeKey)) {
        return;
      }

      // Find the wallet that made the trade
      const tradingWallet = state.wallets.find(
        (wallet) => wallet.address === latestTrade.address,
      );

      if (tradingWallet) {
        // Get current balances
        const currentSolBalance =
          state.baseCurrencyBalances.get(latestTrade.address) || 0;
        const currentTokenBalance =
          state.tokenBalances.get(latestTrade.address) || 0;

        // Calculate new balances based on trade type
        let newSolBalance = currentSolBalance;
        let newTokenBalance = currentTokenBalance;

        if (latestTrade.type === "buy") {
          // For buy trades: decrease SOL, increase tokens
          newSolBalance = Math.max(
            0,
            currentSolBalance - latestTrade.solAmount,
          );
          newTokenBalance = currentTokenBalance + latestTrade.tokensAmount;
        } else if (latestTrade.type === "sell") {
          // For sell trades: increase SOL, decrease tokens
          newSolBalance = currentSolBalance + latestTrade.solAmount;
          newTokenBalance = Math.max(
            0,
            currentTokenBalance - latestTrade.tokensAmount,
          );
        }

        // Update balances if they changed
        if (
          newSolBalance !== currentSolBalance ||
          newTokenBalance !== currentTokenBalance
        ) {
          // Mark this trade as processed before dispatching
          processedTradesRef.current.add(tradeKey);

          dispatch({
            type: "UPDATE_BALANCE",
            payload: {
              address: latestTrade.address,
              solBalance: newSolBalance,
              tokenBalance: newTokenBalance,
            },
          });
        } else {
          // Mark as processed even if balances didn't change (to avoid reprocessing)
          processedTradesRef.current.add(tradeKey);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.iframeData?.recentTrades, state.wallets]);

  // Monitor iframe data for market cap updates
  useEffect(() => {
    if (state.iframeData?.marketCap !== undefined) {
      memoizedCallbacks.setCurrentMarketCap(state.iframeData.marketCap);
    }
  }, [state.iframeData?.marketCap, memoizedCallbacks]);

  // Track token views in recent tokens
  useEffect(() => {
    if (state.tokenAddress && state.iframeData) {
      addRecentToken(state.tokenAddress);
    }
  }, [state.tokenAddress, state.iframeData]);

  // Initialize app on mount - load quick buy preferences
  useEffect(() => {
    const initializeApp = (): void => {
      // Load saved quick buy preferences
      const savedQuickBuyPreferences = loadQuickBuyPreferencesFromCookies();
      if (savedQuickBuyPreferences) {
        memoizedCallbacks.setQuickBuyEnabled(
          savedQuickBuyPreferences.quickBuyEnabled,
        );
        memoizedCallbacks.setQuickBuyAmount(
          savedQuickBuyPreferences.quickBuyAmount,
        );
        memoizedCallbacks.setQuickBuyMinAmount(
          savedQuickBuyPreferences.quickBuyMinAmount,
        );
        memoizedCallbacks.setQuickBuyMaxAmount(
          savedQuickBuyPreferences.quickBuyMaxAmount,
        );
        memoizedCallbacks.setUseQuickBuyRange(
          savedQuickBuyPreferences.useQuickBuyRange,
        );
        if (savedQuickBuyPreferences.quickSellPercentage !== undefined) {
          memoizedCallbacks.setQuickSellPercentage(
            savedQuickBuyPreferences.quickSellPercentage,
          );
        }
        if (savedQuickBuyPreferences.quickSellMinPercentage !== undefined) {
          memoizedCallbacks.setQuickSellMinPercentage(
            savedQuickBuyPreferences.quickSellMinPercentage,
          );
        }
        if (savedQuickBuyPreferences.quickSellMaxPercentage !== undefined) {
          memoizedCallbacks.setQuickSellMaxPercentage(
            savedQuickBuyPreferences.quickSellMaxPercentage,
          );
        }
        if (savedQuickBuyPreferences.useQuickSellRange !== undefined) {
          memoizedCallbacks.setUseQuickSellRange(
            savedQuickBuyPreferences.useQuickSellRange,
          );
        }
      }
    };

    initializeApp();
  }, [memoizedCallbacks]);

  // Save wallets when they change
  useEffect(() => {
    if (state.wallets.length > 0) {
      saveWalletsToCookies(state.wallets);
    }
  }, [state.wallets]);

  // Listen for custom event to open settings page
  useEffect(() => {
    const handleOpenSettingsWalletsTab = (): void => {
      navigate("/settings");
    };

    window.addEventListener(
      "openSettingsWalletsTab",
      handleOpenSettingsWalletsTab,
    );

    return (): void => {
      window.removeEventListener(
        "openSettingsWalletsTab",
        handleOpenSettingsWalletsTab,
      );
    };
  }, [navigate]);

  // Save quick buy preferences when they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const preferences = {
        quickBuyEnabled: state.quickBuyEnabled,
        quickBuyAmount: state.quickBuyAmount,
        quickBuyMinAmount: state.quickBuyMinAmount,
        quickBuyMaxAmount: state.quickBuyMaxAmount,
        quickSellPercentage: state.quickSellPercentage,
        useQuickBuyRange: state.useQuickBuyRange,
        quickSellMinPercentage: state.quickSellMinPercentage,
        quickSellMaxPercentage: state.quickSellMaxPercentage,
        useQuickSellRange: state.useQuickSellRange,
      };
      saveQuickBuyPreferencesToCookies(preferences);
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timeoutId);
  }, [
    state.quickBuyEnabled,
    state.quickBuyAmount,
    state.quickBuyMinAmount,
    state.quickBuyMaxAmount,
    state.quickSellPercentage,
    state.useQuickBuyRange,
    state.quickSellMinPercentage,
    state.quickSellMaxPercentage,
    state.useQuickSellRange,
  ]);

  // Sync connection from context when it changes
  useEffect(() => {
    if (contextConnection !== state.connection) {
      memoizedCallbacks.setConnection(contextConnection);
    }
  }, [contextConnection, state.connection, memoizedCallbacks]);

  // Create a stable wallet identifier that only changes when wallet addresses change (not selection)
  const walletAddresses = useMemo(
    () =>
      state.wallets
        .map((w) => w.address)
        .sort()
        .join(","),
    [state.wallets],
  );

  // Clear token balances and iframe data when switching to a different token
  // This prevents showing stale balances and PnL from the previous token
  useEffect(() => {
    if (previousTokenAddressRef.current !== state.tokenAddress) {
      // Token address changed - clear token balances and iframe data immediately
      memoizedCallbacks.setTokenBalances(new Map());
      dispatch({ type: "SET_IFRAME_DATA", payload: null });
      previousTokenAddressRef.current = state.tokenAddress;
    }
  }, [state.tokenAddress, memoizedCallbacks]);

  // Fetch SOL and token balances when wallets are added/removed, connection is established, or token address changes
  // Don't fetch when only wallet selection (isActive) changes
  useEffect(() => {
    // Use rpcManager for rotation if available, otherwise fall back to connection
    const connectionOrRpcManager = contextRpcManager || state.connection;
    if (connectionOrRpcManager && state.wallets.length > 0) {
      void fetchWalletBalances(
        connectionOrRpcManager,
        state.wallets,
        state.tokenAddress || "",
        memoizedCallbacks.setBaseCurrencyBalances,
        memoizedCallbacks.setTokenBalances,
        state.baseCurrencyBalances,
        state.tokenBalances,
        {
          onlyIfZeroOrNull: false,
          onRateLimitError: () => {
            showToast("RPC rate limit reached, falling back to slower mode", "error");
          },
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.connection,
    contextRpcManager,
    walletAddresses,
    state.tokenAddress,
  ]); // Use walletAddresses instead of state.wallets

  // Trigger tick animation when wallet count changes
  useEffect(() => {
    memoizedCallbacks.setTickEffect(true);
    const timer = setTimeout(
      (): void => memoizedCallbacks.setTickEffect(false),
      500,
    );
    return (): void => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.wallets.length]);

  // Helper functions
  const handleRefresh = useCallback(async () => {
    // Use rpcManager for rotation if available, otherwise fall back to connection
    const connectionOrRpcManager = contextRpcManager || state.connection;
    if (!connectionOrRpcManager || state.wallets.length === 0) return;

    memoizedCallbacks.setIsRefreshing(true);

    try {
      // Use the consolidated fetchWalletBalances function with current balances to preserve them on errors
      // Pass rpcManager to enable RPC rotation for each wallet
      await fetchWalletBalances(
        connectionOrRpcManager,
        state.wallets,
        state.tokenAddress,
        memoizedCallbacks.setBaseCurrencyBalances,
        memoizedCallbacks.setTokenBalances,
        state.baseCurrencyBalances,
        state.tokenBalances,
        {
          onRateLimitError: () => {
            showToast("RPC rate limit reached, falling back to slower mode", "error");
          },
        },
      );
    } catch {
      // Balance refresh error, handled in finally block
    } finally {
      // Set refreshing to false
      memoizedCallbacks.setIsRefreshing(false);
    }
  }, [
    state.connection,
    contextRpcManager,
    state.wallets,
    state.tokenAddress,
    state.baseCurrencyBalances,
    state.tokenBalances,
    memoizedCallbacks,
    showToast,
  ]);

  const handleNonWhitelistedTrade = useCallback(
    (trade: {
      type: "buy" | "sell";
      address: string;
      tokensAmount: number;
      avgPrice: number;
      solAmount: number;
      timestamp: number;
      signature: string;
      tokenMint: string;
      marketCap: number;
    }): void => {
      // Add the new trade to the beginning of the array and keep only the last 50 trades
      const updatedTrades = [trade, ...state.nonWhitelistedTrades].slice(0, 50);
      memoizedCallbacks.setNonWhitelistedTrades(updatedTrades);
    },
    [state.nonWhitelistedTrades, memoizedCallbacks],
  );

  return (
    <div className="relative h-screen overflow-hidden bg-app-primary text-app-tertiary bg">
      <OnboardingTutorial
        forceShow={showTutorial}
        onClose={() => setShowTutorial(false)}
        autoShowForNewUsers={true}
      />
      {/*  scanline effect */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-10"></div>

      {/* Main Content - Full Height */}
      <div className="flex flex-col md:flex-row h-screen">
        {/* Desktop Layout - Only render when not mobile */}
        {!isMobile && (
          <div className="w-full h-full relative flex">
            {viewMode === "multichart" ? (
              <MultichartLayout
                wallets={state.wallets}
                setWallets={memoizedCallbacks.setWallets}
                isLoadingChart={state.isLoadingChart}
                handleRefresh={handleRefresh}
                isRefreshing={state.isRefreshing}
                baseCurrencyBalances={state.baseCurrencyBalances}
                tokenBalances={state.tokenBalances}
                onNonWhitelistedTrade={handleNonWhitelistedTrade}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                connection={state.connection}
              />
            ) : (
              <AdvancedLayout
                wallets={state.wallets}
                setWallets={memoizedCallbacks.setWallets}
                tokenAddress={state.tokenAddress}
                setTokenAddress={memoizedCallbacks.setTokenAddress}
                isRefreshing={state.isRefreshing}
                handleRefresh={handleRefresh}
                connection={state.connection}
                baseCurrencyBalances={state.baseCurrencyBalances}
                baseCurrency={contextBaseCurrency}
                tokenBalances={state.tokenBalances}
                transactionFee={state.config.transactionFee}
                currentMarketCap={state.currentMarketCap}
                setCalculatePNLModalOpen={memoizedCallbacks.setCalculatePNLModalOpen}
                automateCardPosition={state.automateCard.position}
                setAutomateCardPosition={memoizedCallbacks.setAutomateCardPosition}
                isAutomateCardOpen={state.automateCard.isOpen}
                isAutomateCardDragging={state.automateCard.isDragging}
                setAutomateCardDragging={memoizedCallbacks.setAutomateCardDragging}
                quickBuyEnabled={state.quickBuyEnabled}
                quickBuyAmount={state.quickBuyAmount}
                quickBuyMinAmount={state.quickBuyMinAmount}
                quickBuyMaxAmount={state.quickBuyMaxAmount}
                useQuickBuyRange={state.useQuickBuyRange}
                quickSellPercentage={state.quickSellPercentage}
                quickSellMinPercentage={state.quickSellMinPercentage}
                quickSellMaxPercentage={state.quickSellMaxPercentage}
                useQuickSellRange={state.useQuickSellRange}
                iframeData={state.iframeData}
                setIframeData={memoizedCallbacks.setIframeData}
                categorySettings={categorySettings}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                onNonWhitelistedTrade={handleNonWhitelistedTrade}
                isLoadingChart={state.isLoadingChart}
                isMobile={isMobile}
              />
            )}
          </div>
        )}

        {/* Mobile Layout - Only render when mobile */}
        {isMobile && (
          <MobileLayout
            currentPage={state.currentPage}
            setCurrentPage={memoizedCallbacks.setCurrentPage}
            children={{
              Frame: (
                <Frame
                  isLoadingChart={state.isLoadingChart}
                  tokenAddress={state.tokenAddress}
                  wallets={state.wallets}
                  onDataUpdate={memoizedCallbacks.setIframeData}
                  onTokenSelect={memoizedCallbacks.setTokenAddress}
                  onNonWhitelistedTrade={handleNonWhitelistedTrade}
                  quickBuyEnabled={state.quickBuyEnabled}
                  quickBuyAmount={state.quickBuyAmount}
                  quickBuyMinAmount={state.quickBuyMinAmount}
                  quickBuyMaxAmount={state.quickBuyMaxAmount}
                  useQuickBuyRange={state.useQuickBuyRange}
                />
              ),
              ActionsPage: (
                <div className="h-full flex flex-col">
                  {/* Top Navigation - Mobile */}
                  <nav className="relative z-20 border-b border-app-primary-70 px-2 py-2 backdrop-blur-sm bg-app-primary-99">
                    <div className="flex items-center justify-between gap-2">
                      {/* Logo button that redirects to home */}
                      <button
                        onClick={() => navigate("/")}
                        className="hover:scale-105 active:scale-95 transition-transform"
                      >
                        <img
                          src="/logo.png"
                          alt={brand.altText}
                          className="h-8 filter drop-shadow-[0_0_8px_var(--color-primary-70)]"
                        />
                      </button>

                      <div className="flex items-center gap-2">
                        {/* View Mode Toggle - Hidden on mobile */}
                        {!isMobile && (
                          <button
                            onClick={handleViewModeToggle}
                            className="group relative flex items-center gap-2 px-3 py-2 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
                            title={
                              viewMode === "simple"
                                ? "Switch to Advanced mode"
                                : "Switch to Simple mode"
                            }
                          >
                            <Columns2
                              size={16}
                              className={`color-primary transition-opacity ${viewMode === "simple" ? "opacity-50" : "opacity-100"}`}
                            />
                            <span className="text-xs font-mono color-primary font-medium tracking-wider">
                              {viewMode === "simple" ? "SIMPLE" : "ADVANCED"}
                            </span>
                          </button>
                        )}

                        {/* Mobile: Inline buttons, Desktop: Dropdown */}
                        {isMobile ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => navigate("/wallets")}
                              className="flex items-center gap-1 px-2 py-1.5 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
                              title="Wallets"
                            >
                              <Wallet size={14} className="color-primary" />
                              <span className="text-xs font-mono color-primary">
                                WALLETS
                              </span>
                            </button>
                            <button
                              onClick={() => navigate("/settings")}
                              className="flex items-center gap-1 px-2 py-1.5 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
                              title="Settings"
                            >
                              <Settings size={14} className="color-primary" />
                              <span className="text-xs font-mono color-primary">
                                SETTINGS
                              </span>
                            </button>
                          </div>
                        ) : (
                          <ToolsDropdown />
                        )}
                      </div>
                    </div>
                  </nav>

                  <div className="flex-1 overflow-y-auto">
                    <ActionsPage
                      tokenAddress={state.tokenAddress}
                      setTokenAddress={memoizedCallbacks.setTokenAddress}
                      transactionFee={state.config.transactionFee}
                      handleRefresh={handleRefresh}
                      wallets={state.wallets}
                      setWallets={memoizedCallbacks.setWallets}
                      baseCurrencyBalances={state.baseCurrencyBalances}
                      baseCurrency={contextBaseCurrency}
                      tokenBalances={state.tokenBalances}
                      currentMarketCap={state.currentMarketCap}
                      setCalculatePNLModalOpen={
                        memoizedCallbacks.setCalculatePNLModalOpen
                      }
                      isAutomateCardOpen={state.automateCard.isOpen}
                      automateCardPosition={state.automateCard.position}
                      setAutomateCardPosition={
                        memoizedCallbacks.setAutomateCardPosition
                      }
                      isAutomateCardDragging={state.automateCard.isDragging}
                      setAutomateCardDragging={
                        memoizedCallbacks.setAutomateCardDragging
                      }
                      iframeData={state.iframeData}
                    />
                  </div>
                </div>
              ),
            }}
          />
        )}
      </div>

      {/* Modals */}
      <PnlModal
        isOpen={state.modals.calculatePNLModalOpen}
        onClose={(): void => memoizedCallbacks.setCalculatePNLModalOpen(false)}
        handleRefresh={handleRefresh}
        tokenAddress={state.tokenAddress}
        iframeData={state.iframeData}
        tokenBalances={state.tokenBalances}
      />

      {/* AutomateFloatingCard is now rendered globally in index.tsx and persists across all views */}
    </div>
  );
};

export default WalletManager;
