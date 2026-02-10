/**
 * Encryption utilities for secure data storage.
 * Uses AES encryption via CryptoJS for wallet data protection.
 */

import CryptoJS from 'crypto-js';

// Encryption key - in a production environment, this should be derived from user input or secure storage
const ENCRYPTION_KEY = 'raze-bot-wallet-encryption-key';

/**
 * Encrypts a string using AES encryption.
 * @param data - The plaintext string to encrypt
 * @returns The encrypted string
 * @throws Error if encryption fails
 */
export function encryptData(data: string): string {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch {
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts an AES-encrypted string.
 * @param encryptedData - The encrypted string to decrypt
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails
 */
export function decryptData(encryptedData: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedData) {
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
    return decryptedData;
  } catch {
    throw new Error('Failed to decrypt data');
  }
}

// Aliases for backward compatibility
export const encryptWalletData = encryptData;
export const decryptWalletData = decryptData;
