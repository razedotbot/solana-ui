/**
 * Format wallet address to shortened form
 */
export const formatAddress = (address: string): string => {
  if (address.length < 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

/**
 * Format SOL balance with 4 decimal places
 */
export const formatSolBalance = (balance: number): string => {
  return balance.toFixed(4);
};

/**
 * Format token balance with appropriate suffix (K, M, B)
 */
export const formatTokenBalance = (balance: number | undefined): string => {
  if (balance === undefined) return '0.00';
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
    return (number / 1000000000).toFixed(2).replace(/\.?0+$/, '') + 'B';
  } else if (absNum >= 1000000) {
    return (number / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  } else if (absNum >= 1000) {
    return (number / 1000).toFixed(2).replace(/\.?0+$/, '') + 'k';
  } else if (absNum >= 1) {
    return number.toFixed(2).replace(/\.?0+$/, '');
  } else {
    // For very small numbers, show more decimal places
    return number.toFixed(6).replace(/\.?0+$/, '');
  }
};

/**
 * Format price for display
 */
export const formatPrice = (price: number | null | undefined): string => {
  if (!price || price === 0 || typeof price !== 'number' || isNaN(price)) return '$--';
  if (price < 0.000001) return `$${price.toExponential(2)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(4)}`;
};

/**
 * Format large numbers with $ prefix and suffix
 */
export const formatLargeNumber = (num: number | null | undefined): string => {
  if (!num || num === 0 || typeof num !== 'number' || isNaN(num)) return '--';
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

/**
 * Format count with locale string
 */
export const formatCount = (count: number | null | undefined): string => {
  if (!count && count !== 0) return '--';
  if (typeof count !== 'number' || isNaN(count)) return '--';
  return count.toLocaleString();
};

