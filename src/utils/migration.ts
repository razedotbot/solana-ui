import type { WalletType } from '../Utils';
import { loadWalletsFromCookies, saveWalletsToCookies } from '../Utils';

/**
 * Migration version key in localStorage
 */
const MIGRATION_VERSION_KEY = 'wallet_migration_version';
const CURRENT_MIGRATION_VERSION = 1;

/**
 * Check if migration has been run
 */
export const hasMigrationRun = (): boolean => {
  try {
    const version = localStorage.getItem(MIGRATION_VERSION_KEY);
    return version !== null && parseInt(version) >= CURRENT_MIGRATION_VERSION;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

/**
 * Mark migration as complete
 */
const markMigrationComplete = (): void => {
  try {
    localStorage.setItem(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION.toString());
  } catch (error) {
    console.error('Error marking migration complete:', error);
  }
};

/**
 * Migrate existing wallets to add source field
 * This ensures backward compatibility by marking all existing wallets as 'imported'
 */
export const migrateExistingWallets = (): void => {
  try {
    // Check if migration has already been run
    if (hasMigrationRun()) {
      console.info('Wallet migration already completed');
      return;
    }

    console.info('Starting wallet migration...');

    // Load existing wallets
    const wallets = loadWalletsFromCookies();

    if (wallets.length === 0) {
      console.info('No wallets to migrate');
      markMigrationComplete();
      return;
    }

    // Migrate wallets by adding source field if not present
    let migrationCount = 0;
    const migratedWallets = wallets.map((wallet): WalletType => {
      // Only migrate if wallet doesn't have a source field
      if (!wallet.source) {
        migrationCount++;
        return {
          ...wallet,
          source: 'imported', // Mark as imported (not HD-derived)
          masterWalletId: undefined,
          derivationIndex: undefined,
        };
      }
      return wallet;
    });

    // Save migrated wallets
    if (migrationCount > 0) {
      saveWalletsToCookies(migratedWallets);
      console.info(`Successfully migrated ${migrationCount} wallet(s) to imported status`);
    }

    // Mark migration as complete
    markMigrationComplete();
  } catch (error) {
    console.error('Error during wallet migration:', error);
    // Still mark as complete to avoid repeated failures
    markMigrationComplete();
  }
};

/**
 * Reset migration status (for development/testing purposes only)
 * DO NOT call this in production code
 */
export const resetMigrationStatus = (): void => {
  try {
    localStorage.removeItem(MIGRATION_VERSION_KEY);
    console.info('Migration status reset');
  } catch (error) {
    console.error('Error resetting migration status:', error);
  }
};

