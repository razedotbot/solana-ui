/**
 * CopyTrade Types
 */

export type {
  CopyTradeProfile,
  CopyTradeCondition,
  CopyTradeAction,
  CopyTradeMode,
  CopyTradeConditionType,
  CopyTradeAmountType,
  SimpleModeCopyConfig,
  CopyTradeData,
  CopyTradeExecutionLog,
  WalletList,
  OperatorType,
  ActionPriority,
  CooldownUnit,
  ConditionLogic,
} from "../../utils/types/automation";

export interface CopyTradeWallet {
  address: string;
  privateKey?: string;
  name?: string;
  balance?: number;
}
