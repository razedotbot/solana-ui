// Trading Strategy Configuration Types
export interface TradingCondition {
  id: string;
  type: 'marketCap' | 'buyVolume' | 'sellVolume' | 'netVolume' | 'lastTradeType' | 'lastTradeAmount' | 'priceChange' | 'whitelistActivity';
  operator: 'greater' | 'less' | 'equal' | 'greaterEqual' | 'lessEqual';
  value: number;
  timeframe?: number; // in minutes, for volume-based conditions
  whitelistAddress?: string; // specific address to monitor for whitelist conditions
  whitelistActivityType?: 'buyVolume' | 'sellVolume' | 'netVolume' | 'lastTradeAmount' | 'lastTradeType'; // type of activity to monitor for whitelist address
}

export interface TradingAction {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  amountType: 'sol' | 'percentage' | 'lastTrade' | 'volume' | 'whitelistVolume'; // percentage of wallet balance, last trade amount, or volume-based
  volumeType?: 'buyVolume' | 'sellVolume' | 'netVolume'; // which volume to use when amountType is 'volume'
  volumeMultiplier?: number; // multiplier for volume-based amounts (e.g., 0.1 = 10% of volume)
  slippage: number; // percentage
  priority: 'low' | 'medium' | 'high';
  whitelistAddress?: string; // specific address whose activity triggered this action
  whitelistActivityType?: 'buyVolume' | 'sellVolume' | 'netVolume';
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  conditions: TradingCondition[];
  conditionLogic: 'and' | 'or'; // how to combine multiple conditions
  actions: TradingAction[];
  cooldown: number; // minutes between executions
  maxExecutions?: number; // max times this strategy can execute
  executionCount: number;
  lastExecuted?: number; // timestamp
  createdAt: number;
  updatedAt: number;
  whitelistedAddresses?: string[]; // addresses to monitor for whitelist-based strategies
}