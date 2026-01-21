import { type BaseCurrencyConfig, BASE_CURRENCIES } from "./constants";

/**
 * Format wallet address to shortened form
 */
export const formatAddress = (address: string): string => {
  if (address.length < 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

/**
 * Format SOL balance with 4 decimal places
 * @deprecated Use formatBaseCurrencyBalance instead
 */
export const formatSolBalance = (balance: number): string => {
  return balance.toFixed(4);
};

/**
 * Format base currency balance with appropriate decimal places
 * SOL uses 4 decimals, stablecoins use 2 decimals
 */
export const formatBaseCurrencyBalance = (
  balance: number,
  baseCurrency: BaseCurrencyConfig = BASE_CURRENCIES.SOL,
): string => {
  // SOL: 4 decimal places, stablecoins: 2 decimal places
  const decimals = baseCurrency.isNative ? 4 : 2;
  return balance.toFixed(decimals);
};

/**
 * Format base currency amount for display with symbol
 */
export const formatBaseCurrencyAmount = (
  amount: number,
  baseCurrency: BaseCurrencyConfig = BASE_CURRENCIES.SOL,
  includeSymbol: boolean = true,
): string => {
  const formatted = formatBaseCurrencyBalance(amount, baseCurrency);
  return includeSymbol ? `${formatted} ${baseCurrency.symbol}` : formatted;
};

/**
 * Convert amount to smallest unit (lamports for SOL, base units for tokens)
 */
export const toSmallestUnit = (
  amount: number,
  baseCurrency: BaseCurrencyConfig = BASE_CURRENCIES.SOL,
): bigint => {
  return BigInt(Math.floor(amount * Math.pow(10, baseCurrency.decimals)));
};

/**
 * Convert from smallest unit to human readable amount
 */
export const fromSmallestUnit = (
  smallestUnit: bigint | number,
  baseCurrency: BaseCurrencyConfig = BASE_CURRENCIES.SOL,
): number => {
  const value =
    typeof smallestUnit === "bigint" ? Number(smallestUnit) : smallestUnit;
  return value / Math.pow(10, baseCurrency.decimals);
};

/**
 * Format token balance with appropriate suffix (K, M, B)
 */
export const formatTokenBalance = (balance: number | undefined): string => {
  if (balance === undefined) return "0.00";
  if (balance < 1000) return balance.toFixed(2);

  if (balance < 1_000_000) {
    return `${(balance / 1000).toFixed(1)}K`;
  }
  if (balance < 1_000_000_000) {
    return `${(balance / 1_000_000).toFixed(1)}M`;
  }
  return `${(balance / 1_000_000_000).toFixed(1)}B`;
};

/**
 * Format large numbers with k, M, B suffixes
 */
export const formatNumber = (num: number | string): string => {
  const number = parseFloat(num.toString());
  if (isNaN(number) || number === 0) return "0";

  const absNum = Math.abs(number);

  if (absNum >= 1000000000) {
    return (number / 1000000000).toFixed(2).replace(/\.?0+$/, "") + "B";
  } else if (absNum >= 1000000) {
    return (number / 1000000).toFixed(2).replace(/\.?0+$/, "") + "M";
  } else if (absNum >= 1000) {
    return (number / 1000).toFixed(2).replace(/\.?0+$/, "") + "k";
  } else if (absNum >= 1) {
    return number.toFixed(2).replace(/\.?0+$/, "");
  } else {
    // For very small numbers, show more decimal places
    return number.toFixed(6).replace(/\.?0+$/, "");
  }
};

/**
 * Format price for display
 */
export const formatPrice = (price: number | null | undefined): string => {
  if (!price || price === 0 || typeof price !== "number" || isNaN(price))
    return "$--";
  if (price < 0.000001) return `$${price.toExponential(2)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(4)}`;
};

/**
 * Format large numbers with $ prefix and suffix
 */
export const formatLargeNumber = (num: number | null | undefined): string => {
  if (!num || num === 0 || typeof num !== "number" || isNaN(num)) return "--";
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

/**
 * Format count with locale string
 */
export const formatCount = (count: number | null | undefined): string => {
  if (!count && count !== 0) return "--";
  if (typeof count !== "number" || isNaN(count)) return "--";
  return count.toLocaleString();
};
