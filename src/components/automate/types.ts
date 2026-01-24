/**
 * Automate (Strategy) Types
 */

export type {
  TradingStrategy,
  TradingCondition,
  TradingAction,
  TradingConditionType,
  ActionAmountType,
  VolumeType,
  WalletList,
  OperatorType,
  ActionPriority,
  CooldownUnit,
  ConditionLogic,
} from "../../utils/types/automation";

export interface AutomateWallet {
  address: string;
  privateKey?: string;
  name?: string;
  balance?: number;
}
