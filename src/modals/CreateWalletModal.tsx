import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Wallet, Key } from 'lucide-react';
import type { MasterWallet, WalletType } from '../Utils';
import { createNewWallet, createHDWalletFromMaster } from '../Utils';

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterWallets: MasterWallet[];
  onCreateWallet: (wallet: WalletType) => Promise<void>;
}

type WalletTypeOption = 'im' | 'hd';

const CreateWalletModal: React.FC<CreateWalletModalProps> = ({
  isOpen,
  onClose,
  masterWallets,
  onCreateWallet,
}) => {
  const [walletType, setWalletType] = useState<WalletTypeOption>('im');
  const [selectedMasterWalletId, setSelectedMasterWalletId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setWalletType('im');
      setSelectedMasterWalletId(masterWallets.length > 0 ? masterWallets[0].id : '');
      setQuantity('1');
      setIsCreating(false);
      setError(null);
    }
  }, [isOpen, masterWallets]);

  const handleCreateWallets = async (): Promise<void> => {
    setError(null);
    
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum < 1 || quantityNum > 100) {
      setError('Please enter a valid number between 1 and 100');
      return;
    }

    if (walletType === 'hd' && (!selectedMasterWalletId || masterWallets.length === 0)) {
      setError('Please select a master wallet');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newWallets: WalletType[] = [];
      
      if (walletType === 'im') {
        // Generate multiple IM wallets
        for (let i = 0; i < quantityNum; i++) {
          const newWallet = createNewWallet();
          newWallets.push(newWallet);
        }
      } else {
        // Generate HD wallets from master
        const masterWallet = masterWallets.find(mw => mw.id === selectedMasterWalletId);
        if (!masterWallet) {
          setError('Selected master wallet not found');
          setIsCreating(false);
          return;
        }

        // Find the starting derivation index
        const startIndex = masterWallet.accountCount === 0 ? 0 : masterWallet.accountCount;
        
        // Generate multiple HD wallets
        for (let i = 0; i < quantityNum; i++) {
          const accountIndex = startIndex + i;
          const newWallet = createHDWalletFromMaster(masterWallet, accountIndex);
          newWallets.push(newWallet);
        }
      }

      // Create all wallets sequentially with a small delay to ensure state updates complete
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < newWallets.length; i++) {
        const wallet = newWallets[i];
        try {
          await onCreateWallet(wallet);
          successCount++;
          // Small delay between wallet creations to ensure React state updates complete
          if (i < newWallets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (error) {
          console.error('Error creating wallet:', error);
          failCount++;
        }
      }
      
      if (failCount === 0) {
        onClose();
      } else {
        setError(`Created ${successCount} wallet(s), ${failCount} failed`);
      }
    } catch (error) {
      console.error('Error creating wallets:', error);
      setError(error instanceof Error ? error.message : 'Failed to create wallets');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  const selectedMasterWallet = masterWallets.find(mw => mw.id === selectedMasterWalletId);
  const quantityNum = parseInt(quantity) || 1;

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
              Create Wallet
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
            {/* Wallet Type Selector */}
            <div className="flex gap-2 p-1 bg-app-quaternary rounded-lg">
              <button
                onClick={() => {
                  setWalletType('im');
                  setError(null);
                }}
                className={`flex-1 px-4 py-2 rounded font-mono text-sm transition-all ${
                  walletType === 'im'
                    ? 'bg-app-primary-color text-black'
                    : 'text-app-secondary-80 hover:text-app-primary'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Key size={16} />
                  IM Wallet
                </div>
              </button>
              <button
                onClick={() => {
                  setWalletType('hd');
                  setError(null);
                }}
                disabled={masterWallets.length === 0}
                className={`flex-1 px-4 py-2 rounded font-mono text-sm transition-all ${
                  walletType === 'hd'
                    ? 'bg-app-primary-color text-black'
                    : masterWallets.length === 0
                    ? 'text-app-secondary-60 cursor-not-allowed'
                    : 'text-app-secondary-80 hover:text-app-primary'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Wallet size={16} />
                  HD Wallet
                </div>
              </button>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                Quantity (1-100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 100)) {
                    setQuantity(value);
                    setError(null);
                  }
                }}
                className="w-full bg-app-quaternary border border-app-primary-20 rounded-lg 
                         px-4 py-3 text-app-primary focus:border-app-primary-60 focus:outline-none 
                         font-mono"
                placeholder="1"
              />
            </div>

            {walletType === 'im' && (
              <>
                <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="color-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-app-secondary font-mono">
                      <p className="font-bold mb-2 text-app-primary">IM Wallet (Imported):</p>
                      <ul className="space-y-1">
                        <li>• Generates {quantityNum === 1 ? 'a new random private key' : `${quantityNum} new random private keys`}</li>
                        <li>• Not derived from a master wallet</li>
                        <li>• Store your private keys securely</li>
                        <li>• Each wallet is independent</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {walletType === 'hd' && (
              <>
                {masterWallets.length === 0 ? (
                  <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={20} className="text-warning-alt flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-app-secondary font-mono">
                        <p className="font-bold mb-2 text-app-primary">No Master Wallets Available</p>
                        <p className="text-app-secondary-80">
                          You need to create or import a master wallet first to generate HD wallets.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                        Select Master Wallet
                      </label>
                      <select
                        value={selectedMasterWalletId}
                        onChange={(e) => {
                          setSelectedMasterWalletId(e.target.value);
                          setError(null);
                        }}
                        className="w-full bg-app-quaternary border border-app-primary-20 rounded-lg 
                                 px-4 py-3 text-app-primary focus:border-app-primary-60 focus:outline-none 
                                 font-mono"
                      >
                        {masterWallets.map((mw) => (
                          <option key={mw.id} value={mw.id}>
                            {mw.name} ({mw.accountCount || 0} wallets)
                          </option>
                        ))}
                      </select>
                      {selectedMasterWallet && (
                        <div className="mt-2 text-xs font-mono text-app-secondary-80">
                          {quantityNum === 1 
                            ? `Next wallet will be derived at index ${selectedMasterWallet.accountCount === 0 ? 0 : selectedMasterWallet.accountCount}`
                            : `Wallets will be derived starting at index ${selectedMasterWallet.accountCount === 0 ? 0 : selectedMasterWallet.accountCount}`
                          }
                        </div>
                      )}
                    </div>

                    <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={20} className="color-primary flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-app-secondary font-mono">
                          <p className="font-bold mb-2 text-app-primary">HD Wallet (Hierarchical Deterministic):</p>
                          <ul className="space-y-1">
                            <li>• Derived from selected master wallet</li>
                            <li>• Uses deterministic derivation path</li>
                            <li>• Can regenerate from master seed phrase</li>
                            <li>• All HD wallets share the same master</li>
                            <li>• Will generate {quantityNum} wallet{quantityNum > 1 ? 's' : ''} sequentially</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {error && (
              <div className="text-sm font-mono text-error-alt flex items-center gap-2 bg-app-quaternary border border-error-alt rounded-lg p-3">
                <AlertCircle size={16} />
                {error}
              </div>
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
              onClick={handleCreateWallets}
              disabled={isCreating || (walletType === 'hd' && (masterWallets.length === 0 || !selectedMasterWalletId)) || !quantity || parseInt(quantity) < 1}
              className={`px-6 py-2 font-mono rounded-lg transition-all duration-200 ${
                isCreating || (walletType === 'hd' && (masterWallets.length === 0 || !selectedMasterWalletId)) || !quantity || parseInt(quantity) < 1
                  ? 'bg-app-tertiary text-app-secondary-60 cursor-not-allowed'
                  : 'bg-app-primary-color hover:bg-app-primary-dark text-black'
              }`}
            >
              {isCreating 
                ? `Creating ${quantityNum} wallet${quantityNum > 1 ? 's' : ''}...` 
                : `Create ${quantityNum} wallet${quantityNum > 1 ? 's' : ''}`
              }
            </button>
          </div>
        </div>
      </div>,
    document.body
  );
};

export default CreateWalletModal;

