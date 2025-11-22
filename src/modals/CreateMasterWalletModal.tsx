import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { generateMnemonic } from '../utils/hdWallet';

interface CreateMasterWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMasterWallet: (name: string, mnemonic: string) => Promise<void>;
}

const CreateMasterWalletModal: React.FC<CreateMasterWalletModalProps> = ({
  isOpen,
  onClose,
  onCreateMasterWallet,
}) => {
  const [step, setStep] = useState<'name' | 'generate' | 'confirm'>('name');
  const [walletName, setWalletName] = useState('');
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [mnemonic, setMnemonic] = useState('');
  const [confirmedSaved, setConfirmedSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('name');
      setWalletName('');
      setWordCount(12);
      setMnemonic('');
      setConfirmedSaved(false);
      setCopied(false);
    }
  }, [isOpen]);

  const handleGenerateMnemonic = (): void => {
    const newMnemonic = generateMnemonic(wordCount);
    setMnemonic(newMnemonic);
    setStep('generate');
  };

  const handleCopyMnemonic = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy mnemonic:', error);
    }
  };

  const handleCreateWallet = async (): Promise<void> => {
    if (!confirmedSaved || !walletName.trim() || !mnemonic) {
      return;
    }
    
    try {
      await onCreateMasterWallet(walletName.trim(), mnemonic);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Error creating master wallet:', error);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-app-overlay flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-app-primary border border-app-primary-30 rounded-xl p-6 
                   w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-app-primary-20">
            <h2 className="text-xl font-mono color-primary tracking-wider">
              Create Master Wallet
            </h2>
            <button
              onClick={onClose}
              className="p-2 color-primary hover-color-primary-light transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {step === 'name' && (
              <div className="space-y-6">
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
                  <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                    Seed Phrase Length
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setWordCount(12)}
                      className={`py-3 px-4 rounded-lg font-mono transition-all duration-200 ${
                        wordCount === 12
                          ? 'bg-app-primary-color text-black border-2 border-app-primary-color'
                          : 'bg-app-quaternary text-app-primary border border-app-primary-20 hover:border-app-primary-60'
                      }`}
                    >
                      12 Words (Standard)
                    </button>
                    <button
                      onClick={() => setWordCount(24)}
                      className={`py-3 px-4 rounded-lg font-mono transition-all duration-200 ${
                        wordCount === 24
                          ? 'bg-app-primary-color text-black border-2 border-app-primary-color'
                          : 'bg-app-quaternary text-app-primary border border-app-primary-20 hover:border-app-primary-60'
                      }`}
                    >
                      24 Words (Extra Security)
                    </button>
                  </div>
                </div>

                <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-warning-alt flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-app-secondary font-mono">
                      <p className="font-bold mb-2 text-app-primary">Important:</p>
                      <ul className="space-y-1">
                        <li>• Your seed phrase is the master key to all derived wallets</li>
                        <li>• Anyone with your seed phrase can access all your funds</li>
                        <li>• Store it securely offline (paper, hardware wallet, etc.)</li>
                        <li>• Never share it or enter it on untrusted websites</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'generate' && (
              <div className="space-y-6">
                <div className="bg-app-quaternary border-2 border-app-primary-60 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-mono text-app-secondary-80 font-bold">
                      YOUR SEED PHRASE ({wordCount} WORDS)
                    </h3>
                    <button
                      onClick={handleCopyMnemonic}
                      className="flex items-center gap-2 px-3 py-1.5 bg-app-primary-color hover:bg-app-primary-dark 
                               text-black font-mono text-sm rounded transition-all duration-200"
                    >
                      {copied ? (
                        <>
                          <Check size={16} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {mnemonic.split(' ').map((word, index) => (
                      <div
                        key={index}
                        className="bg-app-primary border border-app-primary-40 rounded px-3 py-2 
                                 font-mono text-sm text-app-primary flex items-center gap-2"
                      >
                        <span className="text-app-secondary-60 text-xs">{index + 1}.</span>
                        <span className="font-bold">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-app-secondary font-mono">
                      <p className="font-bold mb-2 text-red-400">Critical Security Warning:</p>
                      <ul className="space-y-1 text-app-secondary-80">
                        <li>• Write down these words in order on paper</li>
                        <li>• Store the paper in a secure location</li>
                        <li>• Never store digitally (screenshots, cloud, email)</li>
                        <li>• If you lose this, you lose access to all wallets forever</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                  <input
                    type="checkbox"
                    id="confirmed-saved"
                    checked={confirmedSaved}
                    onChange={(e) => setConfirmedSaved(e.target.checked)}
                    className="w-5 h-5 rounded border-app-primary-40 text-app-primary-color 
                             focus:ring-app-primary-color cursor-pointer"
                  />
                  <label
                    htmlFor="confirmed-saved"
                    className="text-sm font-mono text-app-primary cursor-pointer select-none"
                  >
                    I have securely saved my seed phrase and understand that I cannot recover it if lost
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-app-primary-20">
            {step === 'name' ? (
              <>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 
                           hover:border-app-primary-40 text-app-primary font-mono rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateMnemonic}
                  disabled={!walletName.trim()}
                  className={`px-6 py-2 font-mono rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    walletName.trim()
                      ? 'bg-app-primary-color hover:bg-app-primary-dark text-black'
                      : 'bg-app-tertiary text-app-secondary-60 cursor-not-allowed'
                  }`}
                >
                  <RefreshCw size={16} />
                  Generate Seed Phrase
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep('name')}
                  className="px-6 py-2 bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 
                           hover:border-app-primary-40 text-app-primary font-mono rounded-lg transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateWallet}
                  disabled={!confirmedSaved}
                  className={`px-6 py-2 font-mono rounded-lg transition-all duration-200 ${
                    confirmedSaved
                      ? 'bg-app-primary-color hover:bg-app-primary-dark text-black'
                      : 'bg-app-tertiary text-app-secondary-60 cursor-not-allowed'
                  }`}
                >
                  Create Master Wallet
                </button>
              </>
            )}
          </div>
        </div>
      </div>,
    document.body
  );
};

export default CreateMasterWalletModal;

