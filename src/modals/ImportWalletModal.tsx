import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Download, FileUp } from 'lucide-react';
import { validateMnemonic, getMnemonicWordCount } from '../utils/hdWallet';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

interface ImportWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportMasterWallet: (name: string, mnemonic: string, initialWalletCount: number) => void;
  onImportPrivateKey?: (privateKey: string) => void;
  onImportFromFile?: (file: File) => Promise<void>;
}

type ImportType = 'seed' | 'privateKey' | 'file';

const ImportWalletModal: React.FC<ImportWalletModalProps> = ({
  isOpen,
  onClose,
  onImportMasterWallet,
  onImportPrivateKey,
  onImportFromFile,
}) => {
  const [importType, setImportType] = useState<ImportType>('seed');
  const [walletName, setWalletName] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [initialWalletCount, setInitialWalletCount] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setImportType('seed');
      setWalletName('');
      setMnemonic('');
      setPrivateKey('');
      setInitialWalletCount('1');
      setError(null);
      setValidationStatus('idle');
      setIsProcessingFile(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  // Validate input as user types
  useEffect(() => {
    if (importType === 'seed') {
      if (!mnemonic.trim()) {
        setValidationStatus('idle');
        setError(null);
        return;
      }

      const trimmedMnemonic = mnemonic.trim();
      const wordCount = getMnemonicWordCount(trimmedMnemonic);
      
      if (!wordCount) {
        setValidationStatus('invalid');
        setError('Seed phrase must be 12 or 24 words');
        return;
      }

      if (validateMnemonic(trimmedMnemonic)) {
        setValidationStatus('valid');
        setError(null);
      } else {
        setValidationStatus('invalid');
        setError('Invalid seed phrase. Please check your words.');
      }
    } else {
      // Validate private key
      if (!privateKey.trim()) {
        setValidationStatus('idle');
        setError(null);
        return;
      }

      const trimmedKey = privateKey.trim();
      const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
      
      if (!base58Pattern.test(trimmedKey)) {
        setValidationStatus('invalid');
        setError('Invalid private key format');
        return;
      }

      try {
        const decoded = bs58.decode(trimmedKey);
        if (decoded.length === 64) {
          Keypair.fromSecretKey(decoded);
          setValidationStatus('valid');
          setError(null);
        } else {
          setValidationStatus('invalid');
          setError('Invalid private key length');
        }
      } catch {
        setValidationStatus('invalid');
        setError('Invalid private key');
      }
    }
  }, [mnemonic, privateKey, importType]);

  const handleImport = (): void => {
    if (importType === 'seed') {
      const trimmedMnemonic = mnemonic.trim();
      const count = parseInt(initialWalletCount);

      if (!walletName.trim()) {
        setError('Please enter a wallet name');
        return;
      }

      if (!validateMnemonic(trimmedMnemonic)) {
        setError('Invalid seed phrase');
        return;
      }

      if (isNaN(count) || count < 0 || count > 50) {
        setError('Initial wallet count must be between 0 and 50');
        return;
      }

      onImportMasterWallet(walletName.trim(), trimmedMnemonic, count);
      onClose();
    } else {
      // Import private key
      const trimmedKey = privateKey.trim();

      if (!trimmedKey) {
        setError('Please enter a private key');
        return;
      }

      try {
        const decoded = bs58.decode(trimmedKey);
        if (decoded.length !== 64) {
          setError('Invalid private key length');
          return;
        }
        Keypair.fromSecretKey(decoded);
        
        if (onImportPrivateKey) {
          onImportPrivateKey(trimmedKey);
        }
        onClose();
      } catch {
        setError('Invalid private key');
      }
    }
  };

  const handlePaste = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText();
      if (importType === 'seed') {
        setMnemonic(text);
      } else if (importType === 'privateKey') {
        setPrivateKey(text);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      setError('Failed to paste from clipboard. Please paste manually.');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['txt', 'key', 'json'].includes(fileExtension || '')) {
      setError('Invalid file type. Please select a .txt, .key, or .json file.');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleFileImport = async (): Promise<void> => {
    if (!selectedFile || !onImportFromFile) {
      setError('Please select a file');
      return;
    }

    setIsProcessingFile(true);
    setError(null);

    try {
      await onImportFromFile(selectedFile);
      onClose();
    } catch (error) {
      console.error('Error importing from file:', error);
      setError(error instanceof Error ? error.message : 'Failed to import from file');
    } finally {
      setIsProcessingFile(false);
    }
  };

  if (!isOpen) return null;

  const wordCount = importType === 'seed' ? getMnemonicWordCount(mnemonic.trim()) : null;
  const isValid = importType === 'seed' 
    ? validationStatus === 'valid' && walletName.trim()
    : importType === 'privateKey'
    ? validationStatus === 'valid'
    : selectedFile !== null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-app-overlay flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-app-primary border border-app-primary-30 rounded-xl p-6 
                     w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-app-primary-20">
            <h2 className="text-xl font-mono color-primary tracking-wider">
              Import Wallet
            </h2>
            <button
              onClick={onClose}
              className="p-2 color-primary hover-color-primary-light transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Import Type Selector */}
            <div className="flex gap-2 p-1 bg-app-quaternary rounded-lg">
              <button
                onClick={() => setImportType('seed')}
                className={`flex-1 px-4 py-2 rounded font-mono text-sm transition-all ${
                  importType === 'seed'
                    ? 'bg-app-primary-color text-black'
                    : 'text-app-secondary-80 hover:text-app-primary'
                }`}
              >
                Seed Phrase
              </button>
              <button
                onClick={() => setImportType('privateKey')}
                className={`flex-1 px-4 py-2 rounded font-mono text-sm transition-all ${
                  importType === 'privateKey'
                    ? 'bg-app-primary-color text-black'
                    : 'text-app-secondary-80 hover:text-app-primary'
                }`}
              >
                Private Key
              </button>
              <button
                onClick={() => setImportType('file')}
                className={`flex-1 px-4 py-2 rounded font-mono text-sm transition-all ${
                  importType === 'file'
                    ? 'bg-app-primary-color text-black'
                    : 'text-app-secondary-80 hover:text-app-primary'
                }`}
              >
                File
              </button>
            </div>

            {importType === 'seed' && (
              <>
                <div>
                  <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                    Master Wallet Name
                  </label>
                  <input
                    type="text"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    placeholder="e.g., Trading Wallets, Main Account"
                    className="w-full bg-app-quaternary border border-app-primary-20 rounded-lg 
                             px-4 py-3 text-app-primary focus:border-app-primary-60 focus:outline-none 
                             font-mono"
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-mono text-app-secondary-80">
                      Seed Phrase (12 or 24 words)
                    </label>
                    <button
                      onClick={handlePaste}
                      className="text-xs font-mono color-primary hover-color-primary-light flex items-center gap-1"
                    >
                      <Download size={12} />
                      Paste
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      value={mnemonic}
                      onChange={(e) => setMnemonic(e.target.value)}
                      placeholder="Enter your seed phrase here..."
                      rows={4}
                      className={`w-full bg-app-quaternary border rounded-lg px-4 py-3 
                               text-app-primary focus:outline-none font-mono text-sm resize-none
                               ${
                                 validationStatus === 'valid'
                                   ? 'border-success focus:border-success'
                                   : validationStatus === 'invalid'
                                   ? 'border-error-alt focus:border-error-alt'
                                   : 'border-app-primary-20 focus:border-app-primary-60'
                               }`}
                    />
                    {validationStatus === 'valid' && (
                      <div className="absolute top-3 right-3">
                        <Check size={20} className="text-success" />
                      </div>
                    )}
                    {validationStatus === 'invalid' && (
                      <div className="absolute top-3 right-3">
                        <AlertCircle size={20} className="text-error-alt" />
                      </div>
                    )}
                  </div>
                  
                  {wordCount && (
                    <div className="mt-2 text-xs font-mono text-app-secondary-80">
                      {wordCount} words detected
                    </div>
                  )}

                  {error && (
                    <div className="mt-2 text-sm font-mono text-error-alt flex items-center gap-2">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                    Generate Initial Wallets
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={initialWalletCount}
                    onChange={(e) => setInitialWalletCount(e.target.value)}
                    className="w-full bg-app-quaternary border border-app-primary-20 rounded-lg 
                             px-4 py-3 text-app-primary focus:border-app-primary-60 focus:outline-none 
                             font-mono"
                  />
                  <div className="mt-1 text-xs font-mono text-app-secondary-80">
                    How many wallets to generate immediately (0-50)
                  </div>
                </div>

                <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="color-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-app-secondary font-mono">
                      <p className="font-bold mb-2 text-app-primary">Important:</p>
                      <ul className="space-y-1">
                        <li>• Only import seed phrases you trust and control</li>
                        <li>• Never share your seed phrase with anyone</li>
                        <li>• This will give you access to all wallets derived from this seed</li>
                        <li>• Make sure you have a backup of this seed phrase</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {importType === 'privateKey' && (
              <>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-mono text-app-secondary-80">
                      Private Key (Base58)
                    </label>
                    <button
                      onClick={handlePaste}
                      className="text-xs font-mono color-primary hover-color-primary-light flex items-center gap-1"
                    >
                      <Download size={12} />
                      Paste
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="Enter your private key here..."
                      rows={3}
                      className={`w-full bg-app-quaternary border rounded-lg px-4 py-3 
                               text-app-primary focus:outline-none font-mono text-sm resize-none
                               ${
                                 validationStatus === 'valid'
                                   ? 'border-success focus:border-success'
                                   : validationStatus === 'invalid'
                                   ? 'border-error-alt focus:border-error-alt'
                                   : 'border-app-primary-20 focus:border-app-primary-60'
                               }`}
                    />
                    {validationStatus === 'valid' && (
                      <div className="absolute top-3 right-3">
                        <Check size={20} className="text-success" />
                      </div>
                    )}
                    {validationStatus === 'invalid' && (
                      <div className="absolute top-3 right-3">
                        <AlertCircle size={20} className="text-error-alt" />
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="mt-2 text-sm font-mono text-error-alt flex items-center gap-2">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}
                </div>

                <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="color-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-app-secondary font-mono">
                      <p className="font-bold mb-2 text-app-primary">Important:</p>
                      <ul className="space-y-1">
                        <li>• Only import private keys you trust and control</li>
                        <li>• Never share your private key with anyone</li>
                        <li>• This will import a single wallet</li>
                        <li>• Make sure you have a backup of this private key</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {importType === 'file' && (
              <>
                <div>
                  <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                    Import from File (.txt, .key, .json)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.key,.json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingFile}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-mono text-sm transition-all ${
                        isProcessingFile
                          ? 'bg-app-tertiary text-app-secondary-60 cursor-not-allowed'
                          : 'bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary-40 text-app-primary'
                      }`}
                    >
                      <FileUp size={16} />
                      {selectedFile ? 'Change File' : 'Select File'}
                    </button>
                    {selectedFile && (
                      <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-mono text-app-primary font-bold">
                              {selectedFile.name}
                            </div>
                            <div className="text-xs font-mono text-app-secondary-80 mt-1">
                              {(selectedFile.size / 1024).toFixed(2)} KB
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="p-1 hover:bg-app-tertiary rounded transition-colors"
                          >
                            <X size={16} className="text-app-secondary-80 hover:text-app-primary" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="mt-2 text-sm font-mono text-error-alt flex items-center gap-2">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}
                </div>

                <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="color-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-app-secondary font-mono">
                      <p className="font-bold mb-2 text-app-primary">Supported Formats:</p>
                      <ul className="space-y-1">
                        <li>• <strong>.txt</strong> - One private key or seed phrase per line</li>
                        <li>• <strong>.key</strong> - Single private key file</li>
                        <li>• <strong>.json</strong> - JSON array of private keys or Solana keypair format</li>
                        <li>• Files can contain multiple private keys or seed phrases</li>
                        <li>• Each valid entry will be imported as a separate wallet</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-app-primary-20">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 
                       hover:border-app-primary-40 text-app-primary font-mono rounded-lg transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={importType === 'file' ? handleFileImport : handleImport}
              disabled={!isValid || isProcessingFile}
              className={`px-6 py-2 font-mono rounded-lg transition-all duration-200 ${
                isValid && !isProcessingFile
                  ? 'bg-app-primary-color hover:bg-app-primary-dark text-black'
                  : 'bg-app-tertiary text-app-secondary-60 cursor-not-allowed'
              }`}
            >
              {isProcessingFile 
                ? 'Processing...' 
                : importType === 'seed' 
                ? 'Import Master Wallet' 
                : importType === 'file'
                ? 'Import from File'
                : 'Import Wallet'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default ImportWalletModal;

