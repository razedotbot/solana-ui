/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
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
  DEFAULT_SEND_ENDPOINT,
  SENDING_SERVERS,
  BASE_CURRENCIES,
  getBaseCurrencyByMint,
  type BaseCurrencyConfig,
} from "../utils/constants";
import {
  discoverHealthyServers,
  isSameServerUrl,
  normalizeServerUrl,
} from "../utils/serverHealth";
import type { ServerInfo } from "../utils/types";

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
  availableSendServers: ServerInfo[];
  isRefreshingSendServers: boolean;
  refreshSendServers: () => Promise<void>;

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
  sendEndpoint: DEFAULT_SEND_ENDPOINT,
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
  const [availableSendServers, setAvailableSendServers] = useState<ServerInfo[]>(
    [],
  );
  const [isRefreshingSendServers, setIsRefreshingSendServers] = useState(false);
  const [hasLoadedConfig, setHasLoadedConfig] = useState(false);
  const isRefreshingSendServersRef = useRef(false);

  // Stable ref for showToast so effects don't re-fire on reference changes
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // Refs for current balance maps — lets refreshBalances read latest values
  // without listing them as deps (which would recreate the callback on every fetch)
  const baseCurrencyBalancesRef = useRef(baseCurrencyBalances);
  baseCurrencyBalancesRef.current = baseCurrencyBalances;
  const tokenBalancesRef = useRef(tokenBalances);
  tokenBalancesRef.current = tokenBalances;

  // Compute current base currency config
  const baseCurrency = useMemo<BaseCurrencyConfig>(() => {
    return (
      getBaseCurrencyByMint(config.baseCurrencyMint) || BASE_CURRENCIES.SOL
    );
  }, [config.baseCurrencyMint]);

  // Load initial data from cookies — runs once on mount
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
            .catch(() => {
              showToastRef.current("Failed to connect to RPC endpoints", "error");
            });
        } catch {
          // RPC connection error, already handled
        }
      }
    } catch {
      // RPC endpoints parse error, ignore
    } finally {
      setHasLoadedConfig(true);
    }
  }, []);

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
          .catch(() => {
            showToastRef.current("Failed to connect to RPC endpoints", "error");
          });
      } catch {
        // RPC endpoints parse error, ignore
      }
    }
  }, [config.rpcEndpoints]);

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

  // Refresh balances.
  // Balance maps are read via refs so they don't appear in deps — otherwise every
  // completed fetch (which updates the maps) would recreate this callback, invalidate
  // the context value useMemo, and force every AppContext consumer to re-render.
  const refreshBalances = useCallback(
    async (tokenAddress?: string) => {
      if (!rpcManager || wallets.length === 0) return;

      setIsRefreshing(true);
      try {
        await fetchWalletBalances(
          rpcManager,
          wallets,
          tokenAddress || "",
          setBaseCurrencyBalancesWrapper,
          setTokenBalances,
          baseCurrencyBalancesRef.current,
          tokenBalancesRef.current,
          false,
          baseCurrency,
        );
      } catch {
        showToastRef.current("Failed to refresh balances", "error");
      } finally {
        setIsRefreshing(false);
      }
    },
    [rpcManager, wallets, setBaseCurrencyBalancesWrapper, baseCurrency],
  );

  const refreshSendServers = useCallback(async (): Promise<void> => {
    if (!hasLoadedConfig || isRefreshingSendServersRef.current) {
      return;
    }

    isRefreshingSendServersRef.current = true;
    setIsRefreshingSendServers(true);

    try {
      const healthySendServers = await discoverHealthyServers(SENDING_SERVERS);
      setAvailableSendServers(healthySendServers);

      if (healthySendServers.length === 0) {
        return;
      }

      const currentSendEndpoint = normalizeServerUrl(
        config.sendEndpoint || DEFAULT_SEND_ENDPOINT,
      );
      const isCurrentServerHealthy = healthySendServers.some((server) =>
        isSameServerUrl(server.url, currentSendEndpoint),
      );

      if (!isCurrentServerHealthy) {
        const nextServerUrl = normalizeServerUrl(healthySendServers[0].url);
        setConfigState((prev) => {
          if (isSameServerUrl(prev.sendEndpoint, nextServerUrl)) {
            return prev;
          }

          const updated = {
            ...prev,
            sendEndpoint: nextServerUrl,
          };
          saveConfigToCookies(updated);
          return updated;
        });
      }
    } finally {
      isRefreshingSendServersRef.current = false;
      setIsRefreshingSendServers(false);
    }
  }, [config.sendEndpoint, hasLoadedConfig]);

  useEffect(() => {
    if (!hasLoadedConfig) {
      return;
    }

    void refreshSendServers();
    const intervalId = window.setInterval(() => {
      void refreshSendServers();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [hasLoadedConfig, refreshSendServers]);

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
      availableSendServers,
      isRefreshingSendServers,
      refreshSendServers,
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
      availableSendServers,
      isRefreshingSendServers,
      refreshSendServers,
      showToast,
      setBaseCurrencyBalancesWrapper,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
