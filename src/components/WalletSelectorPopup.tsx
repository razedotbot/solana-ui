import React, { useState, useRef, useEffect } from "react";
import { Check, Zap, RefreshCw } from "lucide-react";
import { getWalletDisplayName } from "../utils/wallet";
import { formatTokenBalance, formatBaseCurrencyBalance } from "../utils/formatting";
import type { WalletType } from "../utils/types";
import { BASE_CURRENCIES, type BaseCurrencyConfig } from "../utils/constants";
import { useAppContext } from "../contexts";

interface WalletSelectorPopupProps {
  wallets: WalletType[];
  baseCurrencyBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  baseCurrency?: BaseCurrencyConfig;
  tokenAddress?: string;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  onToggleWallet: (id: number) => void;
  onSelectAll: () => void;
  onSelectAllWithBalance: () => void;
}

const WalletSelectorPopup: React.FC<WalletSelectorPopupProps> = ({
  wallets,
  baseCurrencyBalances,
  tokenBalances,
  baseCurrency = BASE_CURRENCIES.SOL,
  tokenAddress,
  anchorRef,
  onClose,
  onToggleWallet,
  onSelectAll,
  onSelectAllWithBalance,
}) => {
  const { refreshBalances, isRefreshing } = useAppContext();
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Calculate position based on anchor element location
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
  }, [anchorRef]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, anchorRef]);

  if (!position) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-[10000] transition-opacity duration-150"
      style={{
        top: position.top,
        right: position.right,
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div className="bg-app-primary border border-app-primary-40 rounded-lg shadow-xl shadow-black-80 min-w-[320px] max-h-[400px] overflow-hidden">
        {/* Header with Select All buttons */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-app-primary-40 bg-app-primary-60">
          <button
            onClick={onSelectAll}
            className="px-2 py-1 text-[10px] font-mono bg-app-primary-80 border border-app-primary-40 text-app-secondary rounded hover:bg-app-primary-20 hover:color-primary transition-colors"
          >
            Select All
          </button>
          <button
            onClick={onSelectAllWithBalance}
            className="px-2 py-1 text-[10px] font-mono bg-app-primary-80 border border-app-primary-40 text-app-secondary rounded hover:bg-app-primary-20 hover:color-primary transition-colors"
          >
            Select All with Balance
          </button>
          {refreshBalances && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void refreshBalances(tokenAddress);
              }}
              disabled={isRefreshing}
              className="ml-auto p-1 text-app-secondary border border-app-primary-40 rounded hover:bg-app-primary-20 hover:color-primary transition-colors disabled:opacity-50"
              title="Refresh balances"
            >
              <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        {/* Wallet List */}
        <div className="overflow-y-auto max-h-[340px]">
          {wallets
            .filter((w) => !w.isArchived)
            .map((wallet) => {
              const baseCurrencyBal =
                baseCurrencyBalances.get(wallet.address) || 0;
              const tokenBal = tokenBalances.get(wallet.address) || 0;

              return (
                <div
                  key={wallet.id}
                  onClick={() => onToggleWallet(wallet.id)}
                  className={`
                  flex items-center justify-between px-3 py-2 cursor-pointer transition-all duration-200
                  border-b border-app-primary-20 last:border-b-0
                  ${
                    wallet.isActive
                      ? "bg-primary-20 border-l-2 border-l-primary"
                      : "hover:bg-app-primary-60"
                  }
                  `}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Checkbox */}
                    <div
                      className={`
                    w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                    ${
                      wallet.isActive
                        ? "bg-app-primary-color border-app-primary-color"
                        : "bg-transparent border-app-primary-40"
                    }
                  `}
                    >
                      {wallet.isActive && (
                        <Check size={10} className="text-black" />
                      )}
                    </div>

                    {/* Wallet name and address */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className={`text-xs font-mono truncate ${wallet.isActive ? "text-app-primary" : "text-app-secondary"}`}
                      >
                        {getWalletDisplayName(wallet)}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-app-secondary-60">
                        <Zap size={8} className="text-app-secondary-40" />
                        <span>Off</span>
                        <span className="text-app-primary-40">
                          {wallet.address.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Balances */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Base Currency Balance */}
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-1.5 h-3 rounded-sm ${baseCurrency.isNative ? "bg-gradient-to-b from-[#9945FF] to-[#14F195]" : "bg-green-500"}`}
                      ></div>
                      <span
                        className={`text-xs font-mono ${baseCurrencyBal > 0 ? "text-app-primary" : "text-app-secondary-60"}`}
                      >
                        {formatBaseCurrencyBalance(
                          baseCurrencyBal,
                          baseCurrency,
                        )}
                      </span>
                    </div>

                    {/* Token Balance - only show when token is selected */}
                    {tokenAddress && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-3 bg-app-primary-color rounded-sm"></div>
                        <span
                          className={`text-xs font-mono ${tokenBal > 0 ? "color-primary" : "text-app-secondary-60"}`}
                        >
                          {formatTokenBalance(tokenBal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default WalletSelectorPopup;
