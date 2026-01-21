import React, { useState, useEffect } from 'react';
import { X, Search, Clock, Plus } from 'lucide-react';
import { useMultichart } from '../../contexts/MultichartContext';
import { getRecentTokens, formatTimeAgo } from '../../utils/recentTokens';
import type { RecentToken } from '../../utils/types';

interface AddTokenModalProps {
  onClose: () => void;
}

export const AddTokenModal: React.FC<AddTokenModalProps> = ({ onClose }) => {
  const { addToken, maxTokens, tokens } = useMultichart();
  const [tokenAddress, setTokenAddress] = useState('');
  const [recentTokens, setRecentTokens] = useState<RecentToken[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setRecentTokens(getRecentTokens());
  }, []);

  const validateSolanaAddress = (address: string): boolean => {
    // Basic Solana address validation - 32-44 characters, base58
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  };

  const handleAddToken = (address: string): void => {
    if (!address) {
      setError('Please enter a token address');
      return;
    }

    if (!validateSolanaAddress(address)) {
      setError('Invalid Solana address format');
      return;
    }

    if (tokens.length >= maxTokens) {
      setError(`Maximum of ${maxTokens} tokens allowed`);
      return;
    }

    const success = addToken(address);
    if (success) {
      onClose();
    } else {
      setError('Token already added - switched to existing token');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    handleAddToken(tokenAddress.trim());
  };

  const handleRecentTokenClick = (address: string): void => {
    handleAddToken(address);
  };

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-app-primary-99 border border-app-primary-40 rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app-primary-40">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-app-primary-color" />
            <h2 className="text-lg font-mono font-medium text-app-primary">Add Token</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-app-primary-color/10 rounded transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-app-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Paste Address Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-app-primary-color" />
              <h3 className="text-sm font-mono font-medium text-app-primary uppercase tracking-wide">
                Paste Token Address
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => {
                  setTokenAddress(e.target.value);
                  setError('');
                }}
                placeholder="Enter Solana token address..."
                className="
                  w-full px-4 py-3 bg-app-primary border border-app-primary-40 rounded
                  text-app-primary font-mono text-sm placeholder-app-secondary-40
                  focus:outline-none focus:border-app-primary-60 transition-colors
                "
                autoFocus
              />
              {error && (
                <div className="text-xs font-mono text-red-500 px-1 py-1 bg-red-500/10 border border-red-500/20 rounded">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="
                  w-full px-4 py-3 bg-app-primary-color hover:bg-app-primary-color-hover
                  text-black font-mono font-medium text-sm rounded
                  transition-all duration-200 border border-app-primary-color
                "
              >
                ADD TOKEN ({tokens.length}/{maxTokens})
              </button>
            </form>
          </div>

          {/* Recent Tokens Section */}
          {recentTokens.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-app-primary-color" />
                <h3 className="text-sm font-mono font-medium text-app-primary uppercase tracking-wide">
                  Recent Tokens
                </h3>
              </div>
              <div className="space-y-2">
                {recentTokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => handleRecentTokenClick(token.address)}
                    className="
                      w-full flex items-center justify-between p-3
                      bg-app-primary hover:bg-app-primary-color/10
                      border border-app-primary-40 hover:border-app-primary-60
                      rounded transition-all duration-200
                    "
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-app-primary-color/20 border border-app-primary-color/40 rounded-full flex items-center justify-center">
                        <Search className="w-4 h-4 text-app-primary-color" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-mono font-medium text-app-primary">
                          {truncateAddress(token.address)}
                        </div>
                        <div className="text-[10px] font-mono text-app-secondary-60">
                          {formatTimeAgo(token.lastViewed)}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-app-secondary-60">
                      Click to add →
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-app-primary-40 bg-app-primary">
          <div className="text-[10px] font-mono text-app-secondary-60 text-center">
            TIP: Switch between tokens using tabs • Max {maxTokens} tokens allowed
          </div>
        </div>
      </div>
    </div>
  );
};
