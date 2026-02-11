/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Connection } from "@solana/web3.js";
import { fetchWalletBalances } from "../utils/wallet";
import {
  loadWalletsFromCookies,
  loadConfigFromCookies,
  saveConfigToCookies,
  saveWalletsToCookies,
} from "../utils/storage";
import type { WalletType, ConfigType } from "../utils/types";
import {
  RPCManager,
  createDefaultEndpoints,
  type RPCEndpoint,
} from "../utils/rpcManager";
import {
  BASE_CURRENCIES,
  getBaseCurrencyByMint,
  type BaseCurrencyConfig,
} from "../utils/constants";

export interface AppContextType {
  // Wallet state
  wallets: WalletType[];
  setWallets: (
    wallets: WalletType[] | ((prev: WalletType[]) => WalletType[]),
  ) => void;

  // Config state
  config: ConfigType;
  setConfig: (config: ConfigType) => void;
  updateConfig: (key: keyof ConfigType, value: string) => void;

  // Connection state
  connection: Connection | null;
  setConnection: (connection: Connection | null) => void;
  rpcManager: RPCManager | null;

  // Balance state
  baseCurrencyBalances: Map<string, number>;
  setBaseCurrencyBalances: (
    balances:
      | Map<string, number>
      | ((prev: Map<string, number>) => Map<string, number>),
  ) => void;
  tokenBalances: Map<string, number>;
  setTokenBalances: (balances: Map<string, number>) => void;

  // Base currency
  baseCurrency: BaseCurrencyConfig;

  // Refresh state
  isRefreshing: boolean;
  refreshBalances: (tokenAddress?: string) => Promise<void>;

  // Toast
  showToast: (message: string, type: "success" | "error") => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppContextProvider");
  }
  return context;
};

const defaultConfig: ConfigType = {
  rpcEndpoints: JSON.stringify(createDefaultEndpoints()),
  transactionFee: "0.005",
  selectedDex: "auto",
  isDropdownOpen: false,
  buyAmount: "",
  sellAmount: "",
  baseCurrencyMint: BASE_CURRENCIES.SOL.mint,
  slippageBps: "9900",
  bundleMode: "batch",
  singleDelay: "200",
  batchDelay: "1000",
};

interface AppContextProviderProps {
  children: ReactNode;
  showToast: (message: string, type: "success" | "error") => void;
}

export const AppContextProvider: React.FC<AppContextProviderProps> = ({
  children,
  showToast,
}) => {
  // State
  const [wallets, setWalletsState] = useState<WalletType[]>([]);
  const [config, setConfigState] = useState<ConfigType>(defaultConfig);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [baseCurrencyBalances, setBaseCurrencyBalances] = useState<
    Map<string, number>
  >(new Map());
  const [tokenBalances, setTokenBalances] = useState<Map<string, number>>(
    new Map(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rpcManager, setRpcManager] = useState<RPCManager | null>(null);

  // Compute current base currency config
  const baseCurrency = useMemo<BaseCurrencyConfig>(() => {
    return (
      getBaseCurrencyByMint(config.baseCurrencyMint) || BASE_CURRENCIES.SOL
    );
  }, [config.baseCurrencyMint]);

  // Load initial data from cookies
  useEffect(() => {
    try {
      const savedWallets = loadWalletsFromCookies();
      if (savedWallets && savedWallets.length > 0) {
        setWalletsState(savedWallets);
      }

      const savedConfig = loadConfigFromCookies();
      if (savedConfig) {
        setConfigState(savedConfig);

        // Create RPC manager and connection from saved config
        try {
          const endpoints = savedConfig.rpcEndpoints
            ? (JSON.parse(savedConfig.rpcEndpoints) as RPCEndpoint[])
            : createDefaultEndpoints();

          const manager = new RPCManager(endpoints);
          setRpcManager(manager);

          // Create initial connection
          manager
            .createConnection()
            .then((conn) => {
              setConnection(conn);
            })
            .catch((_error) => {
              showToast("Failed to connect to RPC endpoints", "error");
            });
        } catch {
          // RPC connection error, already handled
        }
      }
    } catch {
      // RPC endpoints parse error, ignore
    }
  }, [showToast]);

  // Update RPC manager and connection when endpoints change
  useEffect(() => {
    if (config.rpcEndpoints) {
      try {
        const endpoints = JSON.parse(config.rpcEndpoints) as RPCEndpoint[];
        const manager = new RPCManager(endpoints);
        setRpcManager(manager);

        // Create new connection with updated endpoints
        manager
          .createConnection()
          .then((conn) => {
            setConnection(conn);
          })
          .catch((_error) => {
            showToast("Failed to connect to RPC endpoints", "error");
          });
      } catch {
        // RPC endpoints parse error, ignore
      }
    }
  }, [config.rpcEndpoints, showToast]);

  // Wallet setters with cookie persistence
  const setWallets = useCallback(
    (newWallets: WalletType[] | ((prev: WalletType[]) => WalletType[])) => {
      setWalletsState((prev) => {
        const updated =
          typeof newWallets === "function" ? newWallets(prev) : newWallets;
        saveWalletsToCookies(updated);
        return updated;
      });
    },
    [],
  );

  // Balance setters with functional update support
  const setBaseCurrencyBalancesWrapper = useCallback(
    (
      newBalances:
        | Map<string, number>
        | ((prev: Map<string, number>) => Map<string, number>),
    ) => {
      setBaseCurrencyBalances((prev) => {
        return typeof newBalances === "function"
          ? newBalances(prev)
          : newBalances;
      });
    },
    [],
  );

  // Config setters with cookie persistence
  const setConfig = useCallback((newConfig: ConfigType) => {
    setConfigState(newConfig);
    saveConfigToCookies(newConfig);
  }, []);

  const updateConfig = useCallback((key: keyof ConfigType, value: string) => {
    setConfigState((prev) => {
      const updated = { ...prev, [key]: value };
      saveConfigToCookies(updated);
      return updated;
    });
  }, []);

  // Refresh balances
  const refreshBalances = useCallback(
    async (tokenAddress?: string) => {
      if (!rpcManager || wallets.length === 0) return;

      setIsRefreshing(true);
      try {
        // Pass rpcManager directly to fetchWalletBalances so it can rotate endpoints for each wallet
        await fetchWalletBalances(
          rpcManager,
          wallets,
          tokenAddress || "",
          setBaseCurrencyBalancesWrapper,
          setTokenBalances,
          baseCurrencyBalances,
          tokenBalances,
          {
            onRateLimitError: () => {
              showToast("RPC rate limit reached, falling back to slower mode", "error");
            },
          },
          baseCurrency,
        );
      } catch {
        showToast("Failed to refresh balances", "error");
      } finally {
        setIsRefreshing(false);
      }
    },
    [
      rpcManager,
      wallets,
      baseCurrencyBalances,
      tokenBalances,
      showToast,
      setBaseCurrencyBalancesWrapper,
      baseCurrency,
    ],
  );

  // Memoize context value
  const value = useMemo<AppContextType>(
    () => ({
      wallets,
      setWallets,
      config,
      setConfig,
      updateConfig,
      connection,
      setConnection,
      rpcManager,
      baseCurrencyBalances,
      setBaseCurrencyBalances: setBaseCurrencyBalancesWrapper,
      tokenBalances,
      setTokenBalances,
      baseCurrency,
      isRefreshing,
      refreshBalances,
      showToast,
    }),
    [
      wallets,
      setWallets,
      config,
      setConfig,
      updateConfig,
      connection,
      rpcManager,
      baseCurrencyBalances,
      tokenBalances,
      baseCurrency,
      isRefreshing,
      refreshBalances,
      showToast,
      setBaseCurrencyBalancesWrapper,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
