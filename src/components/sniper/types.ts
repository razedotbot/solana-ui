/**
 * Sniper Bot Types
 */

export type {
  SniperProfile,
  SniperFilter,
  SniperEventType,
  BuyAmountType,
  SniperEvent,
  DeployEvent,
  MigrationEvent,
  DeployEventData,
  MigrationEventData,
  SniperExecutionLog,
  FilterMatchType,
  PriorityLevel,
  CooldownUnit,
} from "../../utils/types/automation";

export interface SniperWallet {
  address: string;
  privateKey?: string;
  name?: string;
  balance?: number;
}
