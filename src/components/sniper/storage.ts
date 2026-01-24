/**
 * Sniper Bot Storage - Re-exports from central storage
 */

export {
  loadSniperProfiles,
  saveSniperProfiles,
  addSniperProfile,
  updateSniperProfile,
  deleteSniperProfile,
  getSniperProfileById,
  toggleSniperProfile,
  createDefaultSniperProfile,
  createDefaultSniperFilter,
  loadSniperLogs,
  saveSniperLogs,
  addSniperLog,
  clearSniperLogs,
  getSniperLogsByProfileId,
  getSuccessfulSnipeCount,
  generateProfileId,
  generateFilterId,
  duplicateProfile,
} from "../../utils/storage/automation";
