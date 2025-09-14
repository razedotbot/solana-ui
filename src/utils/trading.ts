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

// Moonshot trading functions
export const executeMoonshotTrade = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  isBuyMode: boolean,
  walletBalances?: Map<string, number>
): Promise<TradingResult> => {
  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(wallets, config, 'moonshot');
    } else {
      return await executeUnifiedSell(wallets, config, 'moonshot');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Meteora trading functions

export const executeMeteoraTrade = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  isBuyMode: boolean,
  walletBalances?: Map<string, number>
): Promise<TradingResult> => {
  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(wallets, config, 'meteora');
    } else {
      return await executeUnifiedSell(wallets, config, 'meteora');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// BoopFun trading functions
export const executeFuryTrade = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  isBuyMode: boolean,
  walletBalances?: Map<string, number>
): Promise<TradingResult> => {
  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(wallets, config, 'fury');
    } else {
      return await executeUnifiedSell(wallets, config, 'fury');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};
// BoopFun trading functions
export const executeBoopFunTrade = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  isBuyMode: boolean,
  walletBalances?: Map<string, number>
): Promise<TradingResult> => {
  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(wallets, config, 'boopfun');
    } else {
      return await executeUnifiedSell(wallets, config, 'boopfun');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// PumpFun trading functions
export const executePumpFunTrade = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  isBuyMode: boolean,
  walletBalances?: Map<string, number>
): Promise<TradingResult> => {
  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(wallets, config, 'pumpfun');
    } else {
      return await executeUnifiedSell(wallets, config, 'pumpfun');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};


// Raydium trading functions
export const executeRaydiumTrade = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  isBuyMode: boolean,
  walletBalances?: Map<string, number>
): Promise<TradingResult> => {
  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(wallets, config, 'raydium');
    } else {
      return await executeUnifiedSell(wallets, config, 'raydium');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Auto trading functions
export const executeAutoTrade = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  isBuyMode: boolean,
  walletBalances?: Map<string, number>
): Promise<TradingResult> => {
  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(wallets, config, 'auto');
    } else {
      return await executeUnifiedSell(
        wallets, 
        config, 
        'auto', 
        undefined, // Use default slippage from config
        'So11111111111111111111111111111111111111112', // SOL
        undefined // Use default jito tip from config
      );
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Launchpad trading functions
export const executeLaunchpadTrade = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  isBuyMode: boolean,
  walletBalances?: Map<string, number>
): Promise<TradingResult> => {
  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(wallets, config, 'launchpad');
    } else {
      return await executeUnifiedSell(wallets, config, 'launchpad');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// PumpSwap trading functions
export const executePumpSwapTrade = async (
  wallets: FormattedWallet[],
  config: TradingConfig,
  isBuyMode: boolean,
  walletBalances?: Map<string, number>
): Promise<TradingResult> => {
  try {
    if (isBuyMode) {
      return await executeUnifiedBuy(wallets, config, 'pumpswap');
    } else {
      return await executeUnifiedSell(wallets, config, 'pumpswap');
    }
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
  
  switch (dex) {
    case 'moonshot':
      return await executeMoonshotTrade(formattedWallets, config, isBuyMode, walletBalances);
    case 'fury':
      return await executeFuryTrade(formattedWallets, config, isBuyMode, walletBalances);
    case 'boopfun':
      return await executeBoopFunTrade(formattedWallets, config, isBuyMode, walletBalances);
    case 'pumpfun':
      return await executePumpFunTrade(formattedWallets, config, isBuyMode, walletBalances);
    case 'raydium':
      return await executeRaydiumTrade(formattedWallets, config, isBuyMode, walletBalances);
    case 'auto':
      return await executeAutoTrade(formattedWallets, config, isBuyMode, walletBalances);
    case 'launchpad':
      return await executeLaunchpadTrade(formattedWallets, config, isBuyMode, walletBalances);
    case 'meteora':
      return await executeMeteoraTrade(formattedWallets, config, isBuyMode, walletBalances);
    case 'pumpswap':
      return await executePumpSwapTrade(formattedWallets, config, isBuyMode, walletBalances);
    default:
      return await executeAutoTrade(formattedWallets, config, isBuyMode, walletBalances);
  }
};