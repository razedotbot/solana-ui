/**
 * Automate Storage - Re-exports from central storage
 */

export {
  loadStrategies,
  saveStrategies,
  addStrategy,
  updateStrategy,
  deleteStrategy,
  toggleStrategy,
  createDefaultStrategy,
  createDefaultTradingCondition,
  createDefaultTradingAction,
  loadWhitelistLists,
  saveWhitelistLists,
  createWhitelistList,
  addWhitelistList,
  updateWhitelistList,
  deleteWhitelistList,
  generateProfileId,
  generateConditionId,
  generateActionId,
  duplicateProfile,
} from "../../utils/storage/automation";
