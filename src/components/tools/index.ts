/**
 * Unified Trading Tools Module
 * 
 * Combines Sniper Bot, Copy Trade, and Automate into a single, cohesive interface.
 * 
 * @example
 * ```tsx
 * import { TradingTools } from './unified-tools';
 * 
 * function App() {
 *   return (
 *     <TradingTools 
 *       availableWallets={wallets}
 *       onExecute={(type, profileId, action) => {
 *         console.log('Execute:', type, profileId, action);
 *       }}
 *     />
 *   );
 * }
 * ```
 */

// Export all types
export * from './automate/types';

// Export storage utilities
export * from './automate/storage';

// Export components
export * from './automate';
