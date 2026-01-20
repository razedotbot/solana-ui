import type { Connection } from "@solana/web3.js";
import type { WalletType, ConfigType } from "../utils/types";
import type { RPCManager } from "../utils/rpcManager";

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
  solBalances: Map<string, number>;
  setSolBalances: (
    balances:
      | Map<string, number>
      | ((prev: Map<string, number>) => Map<string, number>),
  ) => void;
  tokenBalances: Map<string, number>;
  setTokenBalances: (balances: Map<string, number>) => void;

  // Refresh state
  isRefreshing: boolean;
  refreshBalances: (tokenAddress?: string) => Promise<void>;

  // Toast
  showToast: (message: string, type: "success" | "error") => void;
}
