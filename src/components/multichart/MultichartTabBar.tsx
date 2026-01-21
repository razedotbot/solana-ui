import React from 'react';
import { X, Plus } from 'lucide-react';
import { useMultichart } from '../../contexts/MultichartContext';
import { WalletTooltip } from '../Styles';

interface MultichartTabBarProps {
  onAddToken: () => void;
}

export const MultichartTabBar: React.FC<MultichartTabBarProps> = ({ onAddToken }) => {
  const { tokens, activeTokenIndex, setActiveToken, removeToken, maxTokens } = useMultichart();

  const handleCloseToken = (e: React.MouseEvent, address: string): void => {
    e.stopPropagation();
    removeToken(address);
  };

  const truncateAddress = (address: string, length: number = 4): string => {
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-app-primary-70 bg-app-primary-99 backdrop-blur-sm">
      <div className="flex items-center gap-2 flex-1 overflow-x-auto">
        {tokens.map((token, index) => {
          const isActive = index === activeTokenIndex;
          const displayText = token.symbol || truncateAddress(token.address);

          return (
            <WalletTooltip key={token.address} content={token.address} position="bottom">
              <button
                onClick={() => setActiveToken(index)}
                className={`
                  group relative flex items-center gap-2 px-3 py-2 rounded font-mono text-xs
                  transition-all duration-300 border whitespace-nowrap
                  ${
                    isActive
                      ? 'bg-app-primary-color border-app-primary-color text-black font-medium shadow-lg'
                      : 'bg-transparent border-app-primary-20 hover:border-primary-60 color-primary'
                  }
                `}
              >
                {token.imageUrl && (
                  <img
                    src={token.imageUrl}
                    alt={token.symbol || 'Token'}
                    className="w-4 h-4 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <span>{displayText}</span>
                <button
                  onClick={(e) => handleCloseToken(e, token.address)}
                  className={`
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200
                    ${isActive ? 'text-black/70 hover:text-red-600' : 'text-app-secondary hover:text-red-500'}
                  `}
                  aria-label="Close token"
                >
                  <X size={14} />
                </button>
              </button>
            </WalletTooltip>
          );
        })}
      </div>

      {tokens.length < maxTokens ? (
        <WalletTooltip content={`Add token (${tokens.length}/${maxTokens})`} position="bottom">
          <button
            onClick={onAddToken}
            className="
              flex items-center gap-2 px-3 py-2 rounded font-mono text-xs
              bg-transparent border border-dashed border-app-primary-20
              hover:border-primary-60 hover:bg-app-primary-color/5 color-primary
              transition-all duration-300 whitespace-nowrap
            "
            aria-label="Add token"
          >
            <Plus size={14} />
            <span>ADD</span>
          </button>
        </WalletTooltip>
      ) : (
        <div className="text-[10px] font-mono text-app-secondary-60 px-3 py-2">
          MAX {maxTokens}
        </div>
      )}
    </div>
  );
};
