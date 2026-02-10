import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Solana derivation path standard: m/44'/501'/account'/0'
 * 44' = BIP44
 * 501' = Solana coin type
 * account' = Account index (0, 1, 2, ...)
 * 0' = Change index (always 0 for Solana)
 */
export const SOLANA_DERIVATION_PATH = "m/44'/501'";

/**
 * Generate a new mnemonic phrase
 * @param wordCount Number of words (12 or 24)
 * @returns Mnemonic phrase as a string
 */
export const generateMnemonic = (wordCount: 12 | 24 = 12): string => {
  const strength = wordCount === 12 ? 128 : 256;
  return bip39.generateMnemonic(strength);
};

/**
 * Validate a mnemonic phrase
 * @param mnemonic Mnemonic phrase to validate
 * @returns True if valid, false otherwise
 */
export const validateMnemonic = (mnemonic: string): boolean => {
  return bip39.validateMnemonic(mnemonic);
};

/**
 * Get the word count from a mnemonic phrase
 * @param mnemonic Mnemonic phrase
 * @returns Number of words (12 or 24) or null if invalid
 */
export const getMnemonicWordCount = (mnemonic: string): 12 | 24 | null => {
  const words = mnemonic.trim().split(/\s+/);
  if (words.length === 12) {
    return 12;
  }
  if (words.length === 24) {
    return 24;
  }
  return null;
};

/**
 * Derive a seed from a mnemonic phrase
 * @param mnemonic Mnemonic phrase
 * @param passphrase Optional passphrase for additional security
 * @returns Seed as Buffer
 */
export const deriveSeedFromMnemonic = (
  mnemonic: string,
  passphrase: string = ''
): Buffer => {
  return bip39.mnemonicToSeedSync(mnemonic, passphrase);
};

/**
 * Build full derivation path for a specific account index
 * @param accountIndex Account index (0, 1, 2, ...)
 * @returns Full derivation path string
 */
export const buildDerivationPath = (accountIndex: number): string => {
  return `${SOLANA_DERIVATION_PATH}/${accountIndex}'/0'`;
};

/**
 * Derive a wallet from mnemonic at a specific account index
 * @param mnemonic Mnemonic phrase
 * @param accountIndex Account index to derive (default: 0)
 * @param passphrase Optional passphrase
 * @returns Object containing address and private key
 */
export const deriveWalletFromMnemonic = (
  mnemonic: string,
  accountIndex: number = 0,
  passphrase: string = ''
): { address: string; privateKey: string; derivationPath: string } => {
  // Validate mnemonic
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  // Derive seed from mnemonic
  const seed = deriveSeedFromMnemonic(mnemonic, passphrase);

  // Build derivation path
  const path = buildDerivationPath(accountIndex);

  // Derive key pair from seed using the path
  const derivedSeed = derivePath(path, seed.toString('hex')).key;

  // Create Solana keypair from derived seed
  const keypair = Keypair.fromSeed(derivedSeed);

  // Get address and private key
  const address = keypair.publicKey.toString();
  const privateKey = bs58.encode(keypair.secretKey);

  return {
    address,
    privateKey,
    derivationPath: path,
  };
};

/**
 * Derive multiple wallets from a single mnemonic
 * @param mnemonic Mnemonic phrase
 * @param count Number of wallets to derive
 * @param startIndex Starting account index (default: 0)
 * @param passphrase Optional passphrase
 * @returns Array of derived wallets
 */
export const deriveMultipleWallets = (
  mnemonic: string,
  count: number,
  startIndex: number = 0,
  passphrase: string = ''
): Array<{ address: string; privateKey: string; derivationPath: string; accountIndex: number }> => {
  const wallets = [];

  for (let i = 0; i < count; i++) {
    const accountIndex = startIndex + i;
    const wallet = deriveWalletFromMnemonic(mnemonic, accountIndex, passphrase);
    wallets.push({
      ...wallet,
      accountIndex,
    });
  }

  return wallets;
};

/**
 * Format derivation path for display
 * @param accountIndex Account index
 * @returns Formatted derivation path
 */
export const formatDerivationPath = (accountIndex: number): string => {
  return buildDerivationPath(accountIndex);
};

