import { WalletType } from '../Utils';
import { executeBuy, createBuyConfig, BuyConfig, BundleMode } from './buy';
import { executeSell, createSellConfig, SellConfig } from './sell';

export interface TradingConfig {
  tokenAddress: string;
  solAmount?: number;
  sellPercent?: number;
  tokensAmount?: number;
  bundleMode?: BundleMode;
  batchDelay?: number;
  singleDelay?: number;
}

export interface FormattedWallet {
  address: string;
  privateKey: string;
}

export interface TradingResult {
  success: boolean;
  error?: string;
}

// Unified buy function using the new buy.ts
const executeUnifiedBuy = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  protocol: BuyConfig['protocol'],
  slippageBps?: number,
  jitoTipLamports?: number
): Promise<TradingResult> => {
  try {
    // Load config once for all settings
    const { loadConfigFromCookies } = await import('../Utils');
    const appConfig = loadConfigFromCookies();

    // Use provided slippage or fall back to config default
    let finalSlippageBps = slippageBps;
    if (finalSlippageBps === undefined && appConfig?.slippageBps) {
      finalSlippageBps = parseInt(appConfig.slippageBps);
    }

    // Use provided jito tip or fall back to config default
    let finalJitoTipLamports = jitoTipLamports;
    if (finalJitoTipLamports === undefined && appConfig?.transactionFee) {
      const feeInSol = appConfig.transactionFee;
      finalJitoTipLamports = Math.floor(parseFloat(feeInSol) * 1_000_000_000);
    }

    // Use provided bundle mode or fall back to config default
    let finalBundleMode = config.bundleMode;
    if (finalBundleMode === undefined && appConfig?.bundleMode) {
      finalBundleMode = appConfig.bundleMode as BundleMode;
    }

    // Use provided delays or fall back to config defaults
    let finalBatchDelay = config.batchDelay;
    if (finalBatchDelay === undefined && appConfig?.batchDelay) {
      finalBatchDelay = parseInt(appConfig.batchDelay);
    }

    let finalSingleDelay = config.singleDelay;
    if (finalSingleDelay === undefined && appConfig?.singleDelay) {
      finalSingleDelay = parseInt(appConfig.singleDelay);
    }

    const buyConfig = createBuyConfig({
      tokenAddress: config.tokenAddress,
      protocol,
      solAmount: config.solAmount!,
      slippageBps: finalSlippageBps,
      jitoTipLamports: finalJitoTipLamports,
      bundleMode: finalBundleMode,
      batchDelay: finalBatchDelay,
      singleDelay: finalSingleDelay
    });

    return await executeBuy(wallets, buyConfig);
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Unified sell function using the new sell.ts
const executeUnifiedSell = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  protocol: SellConfig['protocol'],
  slippageBps?: number,
  outputMint?: string,
  jitoTipLamports?: number
): Promise<TradingResult> => {
  try {
    // Load config once for all settings
    const { loadConfigFromCookies } = await import('../Utils');
    const appConfig = loadConfigFromCookies();

    // Use provided slippage or fall back to config default
    let finalSlippageBps = slippageBps;
    if (finalSlippageBps === undefined && appConfig?.slippageBps) {
      finalSlippageBps = parseInt(appConfig.slippageBps);
    }

    // Use provided jito tip or fall back to config default
    let finalJitoTipLamports = jitoTipLamports;
    if (finalJitoTipLamports === undefined && appConfig?.transactionFee) {
      const feeInSol = appConfig.transactionFee;
      finalJitoTipLamports = Math.floor(parseFloat(feeInSol) * 1_000_000_000);
    }

    // Use provided bundle mode or fall back to config default
    let finalBundleMode = config.bundleMode;
    if (finalBundleMode === undefined && appConfig?.bundleMode) {
      finalBundleMode = appConfig.bundleMode as BundleMode;
    }

    // Use provided delays or fall back to config defaults
    let finalBatchDelay = config.batchDelay;
    if (finalBatchDelay === undefined && appConfig?.batchDelay) {
      finalBatchDelay = parseInt(appConfig.batchDelay);
    }

    let finalSingleDelay = config.singleDelay;
    if (finalSingleDelay === undefined && appConfig?.singleDelay) {
      finalSingleDelay = parseInt(appConfig.singleDelay);
    }

    const sellConfig = createSellConfig({
      tokenAddress: config.tokenAddress,
      protocol,
      sellPercent: config.sellPercent,
      tokensAmount: config.tokensAmount,
      slippageBps: finalSlippageBps,
      outputMint,
      jitoTipLamports: finalJitoTipLamports,
      bundleMode: finalBundleMode,
      batchDelay: finalBatchDelay,
      singleDelay: finalSingleDelay
    });

    return await executeSell(wallets, sellConfig);
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Main trading executor
export const executeTrade = async (
  dex: string,
  wallets: WalletType[],
  config: TradingConfig,
  isBuyMode: boolean,
  solBalances: Map<string, number>
): Promise<TradingResult> => {
  const activeWallets = wallets.filter(wallet => wallet.isActive);
  
  if (activeWallets.length === 0) {
    return { success: false, error: 'Please activate at least one wallet' };
  }
  
  const formattedWallets = activeWallets.map(wallet => ({
    address: wallet.address,
    privateKey: wallet.privateKey
  }));
  
  const walletBalances = new Map<string, number>();
  activeWallets.forEach(wallet => {
    const balance = solBalances.get(wallet.address) || 0;
    walletBalances.set(wallet.address, balance);
  });
  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(formattedWallets, config, 'auto');
    } else {
      return await executeUnifiedSell(formattedWallets, config, 'auto');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }

};