import { Connection } from "@solana/web3.js";
import { WalletType } from "./Utils";

/**
 * Handle market cap updates
 */
export const handleMarketCapUpdate = (
  marketcap: number | null,
  setCurrentMarketCap: Function
) => {
  setCurrentMarketCap(marketcap);
  console.log("Main component received marketcap update:", marketcap);
};