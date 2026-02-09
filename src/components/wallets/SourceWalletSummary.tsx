import React, { useState } from "react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import type { WalletType } from "../../utils/types";
import { getWalletDisplayName } from "../../utils/wallet";
import { formatAddress } from "../../utils/formatting";
import type { BaseCurrencyConfig } from "../../utils/constants";
import { BASE_CURRENCIES } from "../../utils/constants";

interface SourceWalletSummaryProps {
  wallets: WalletType[];
  selectedWalletIds: Set<number>;
  baseCurrencyBalances: Map<string, number>;
  baseCurrency?: BaseCurrencyConfig;
  label?: string;
  mode?: "single" | "multi";
}

export const SourceWalletSummary: React.FC<SourceWalletSummaryProps> = ({
  wallets,
  selectedWalletIds,
  baseCurrencyBalances,
  baseCurrency = BASE_CURRENCIES.SOL,
  label = "SOURCE WALLET",
  mode = "single",
}) => {
  const [expanded, setExpanded] = useState(false);

  const selectedWallets = wallets.filter((w) => selectedWalletIds.has(w.id));

  if (selectedWallets.length === 0) {
    return (
      <div className="border border-dashed border-app-primary-30 rounded-lg p-4 text-center">
        <Wallet size={20} className="mx-auto mb-2 text-app-secondary-40" />
        <p className="text-sm text-app-secondary-60 font-mono">
          Select wallets from the list on the left
        </p>
      </div>
    );
  }

  const totalBalance = selectedWallets.reduce(
    (sum, w) => sum + (baseCurrencyBalances.get(w.address) || 0),
    0,
  );

  const formatBalance = (balance: number): string => {
    return baseCurrency.isNative ? balance.toFixed(4) : balance.toFixed(2);
  };

  if (mode === "single") {
    const wallet = selectedWallets[0];
    const balance = baseCurrencyBalances.get(wallet.address) || 0;
    const displayName = getWalletDisplayName(wallet);

    return (
      <div className="border border-app-primary-30 rounded-lg p-3">
        <div className="text-xs font-mono uppercase tracking-wider text-app-secondary-60 mb-2">
          <span className="color-primary">&gt;</span> {label}{" "}
          <span className="color-primary">&lt;</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary-20 flex items-center justify-center flex-shrink-0">
              <Wallet size={14} className="color-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-app-primary truncate">
                {displayName}
              </div>
              <code className="text-xs text-app-secondary-40 font-mono">
                {formatAddress(wallet.address)}
              </code>
            </div>
          </div>
          <div className="text-sm font-bold font-mono color-primary flex-shrink-0 ml-2">
            {formatBalance(balance)} {baseCurrency.symbol}
          </div>
        </div>
      </div>
    );
  }

  // Multi mode
  const visibleWallets = expanded ? selectedWallets : selectedWallets.slice(0, 3);
  const hasMore = selectedWallets.length > 3;

  return (
    <div className="border border-app-primary-30 rounded-lg p-3">
      <div className="text-xs font-mono uppercase tracking-wider text-app-secondary-60 mb-2">
        <span className="color-primary">&gt;</span> {label}{" "}
        <span className="color-primary">&lt;</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-app-secondary">
          {selectedWallets.length} wallet{selectedWallets.length !== 1 ? "s" : ""} selected
        </span>
        <span className="text-sm font-bold font-mono color-primary">
          {formatBalance(totalBalance)} {baseCurrency.symbol}
        </span>
      </div>
      <div className="space-y-1">
        {visibleWallets.map((wallet) => {
          const balance = baseCurrencyBalances.get(wallet.address) || 0;
          return (
            <div
              key={wallet.id}
              className="flex items-center justify-between py-1 px-2 rounded bg-app-secondary/20"
            >
              <div className="flex items-center gap-2 min-w-0">
                <code className="text-xs text-app-secondary-60 font-mono truncate">
                  {getWalletDisplayName(wallet)} ({formatAddress(wallet.address)})
                </code>
              </div>
              <span className="text-xs font-mono text-app-secondary-60 flex-shrink-0 ml-2">
                {formatBalance(balance)}
              </span>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-2 text-xs color-primary hover:underline font-mono"
        >
          {expanded ? (
            <>
              <ChevronUp size={12} /> Show less
            </>
          ) : (
            <>
              <ChevronDown size={12} /> Show all {selectedWallets.length} wallets
            </>
          )}
        </button>
      )}
    </div>
  );
};
