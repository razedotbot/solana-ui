/**
 * CopyTrade Storage - Re-exports from central storage
 */

export {
  loadCopyTradeProfiles,
  saveCopyTradeProfiles,
  addCopyTradeProfile,
  updateCopyTradeProfile,
  deleteCopyTradeProfile,
  getCopyTradeProfileById,
  toggleCopyTradeProfile,
  createDefaultCopyTradeProfile,
  createDefaultCopyTradeCondition,
  createDefaultCopyTradeAction,
  loadCopyTradeWalletLists,
  saveCopyTradeWalletLists,
  createWalletList,
  addWalletList,
  updateWalletList,
  deleteWalletList,
  getWalletListById,
  loadCopyTradeLogs,
  saveCopyTradeLogs,
  addCopyTradeLog,
  clearCopyTradeLogs,
  getCopyTradeLogsByProfileId,
  generateProfileId,
  generateConditionId,
  generateActionId,
  duplicateProfile,
} from "../../utils/storage/automation";
