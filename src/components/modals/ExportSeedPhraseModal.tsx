import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface ExportSeedPhraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mnemonic: string;
  masterWalletName: string;
}

const ExportSeedPhraseModal: React.FC<ExportSeedPhraseModalProps> = ({
  isOpen,
  onClose,
  mnemonic,
  masterWalletName,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmed(false);
      setShowMnemonic(false);
      setCopied(false);
      setCountdown(null);
    }
  }, [isOpen]);

  // Start countdown when mnemonic is revealed
  useEffect(() => {
    if (showMnemonic && countdown === null) {
      setCountdown(30);
    }
  }, [showMnemonic, countdown]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown === 0) return;

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
      if (countdown === 1) {
        setShowMnemonic(false);
        setCountdown(null);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleCopyMnemonic = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy mnemonic:', error);
    }
  };

  const handleReveal = (): void => {
    if (confirmed) {
      setShowMnemonic(true);
    }
  };

  if (!isOpen) return null;

  const mnemonicWords = mnemonic.split(' ');

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
            <div>
              <h2 className="text-xl font-mono color-primary tracking-wider">
                Export Seed Phrase
              </h2>
              <p className="text-sm font-mono text-app-secondary-80 mt-1">
                {masterWalletName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 color-primary hover-color-primary-light transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Security Warning */}
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
                <div className="text-sm text-app-secondary font-mono">
                  <p className="font-bold mb-3 text-red-400 text-base">Critical Security Warning</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 flex-shrink-0">•</span>
                      <span>Anyone with this seed phrase can access ALL wallets derived from it</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 flex-shrink-0">•</span>
                      <span>This includes stealing all your funds permanently</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 flex-shrink-0">•</span>
                      <span>Never share this with anyone, not even support staff</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 flex-shrink-0">•</span>
                      <span>Make sure nobody is watching your screen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 flex-shrink-0">•</span>
                      <span>The seed phrase will automatically hide after 30 seconds</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-center gap-3 bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
              <input
                type="checkbox"
                id="export-confirmed"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-5 h-5 rounded border-app-primary-40 text-app-primary-color 
                         focus:ring-app-primary-color cursor-pointer"
              />
              <label
                htmlFor="export-confirmed"
                className="text-sm font-mono text-app-primary cursor-pointer select-none"
              >
                I understand the risks and want to view my seed phrase
              </label>
            </div>

            {/* Seed Phrase Display */}
            {!showMnemonic ? (
              <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-8 flex flex-col items-center justify-center">
                <EyeOff size={48} className="text-app-secondary-60 mb-4" />
                <p className="text-sm font-mono text-app-secondary-80 mb-4 text-center">
                  Seed phrase is hidden for security
                </p>
                <button
                  onClick={handleReveal}
                  disabled={!confirmed}
                  className={`px-6 py-2 font-mono rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    confirmed
                      ? 'bg-app-primary-color hover:bg-app-primary-dark text-black'
                      : 'bg-app-tertiary text-app-secondary-60 cursor-not-allowed'
                  }`}
                >
                  <Eye size={16} />
                  Reveal Seed Phrase
                </button>
              </div>
            ) : (
              <div className="bg-app-quaternary border-2 border-app-primary-60 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-mono text-app-secondary-80 font-bold">
                      YOUR SEED PHRASE ({mnemonicWords.length} WORDS)
                    </h3>
                    {countdown !== null && (
                      <span className="text-xs font-mono text-warning-alt bg-warning-alt/10 px-2 py-1 rounded">
                        Auto-hiding in {countdown}s
                      </span>
                    )}
                  </div>
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
                  {mnemonicWords.map((word, index) => (
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

                <div className="mt-4 flex justify-between items-center">
                  <button
                    onClick={() => {
                      setShowMnemonic(false);
                      setCountdown(null);
                    }}
                    className="text-sm font-mono text-app-secondary-80 hover:color-primary flex items-center gap-2"
                  >
                    <EyeOff size={14} />
                    Hide Seed Phrase
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-center items-center mt-6 pt-4 border-t border-app-primary-20">
            <button
              onClick={onClose}
              className="px-8 py-2 bg-app-primary-color hover:bg-app-primary-dark text-black 
                       font-mono rounded-lg transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
    document.body
  );
};

export default ExportSeedPhraseModal;

