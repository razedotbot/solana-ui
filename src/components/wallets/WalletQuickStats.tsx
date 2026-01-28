import React from "react";
import { Wallet, Coins, Zap, Archive } from "lucide-react";
import { formatBaseCurrencyBalance } from "../../utils/formatting";
import type { WalletQuickStatsProps } from "./types";

export const WalletQuickStats: React.FC<WalletQuickStatsProps> = ({
  filteredCount,
  totalCount,
  totalBalance,
  activeOrArchivedCount,
  showArchived,
  baseCurrency,
}) => {
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4">
      {/* Wallets Count */}
      <div className="flex items-center gap-3 px-4 py-3 bg-app-quaternary/40 border border-app-primary-20 rounded-xl">
        <div className="p-2.5 bg-app-primary-15 rounded-lg">
          <Wallet size={20} className="color-primary" />
        </div>
        <div>
          <div className="text-xl font-bold text-app-primary font-mono leading-tight">
            {filteredCount}
            <span className="text-app-secondary-60 text-sm font-normal ml-1">/ {totalCount}</span>
          </div>
          <div className="text-app-secondary-60 text-[11px] uppercase tracking-wide font-mono">
            Wallets
          </div>
        </div>
      </div>

      {/* Total Balance */}
      <div className="flex items-center gap-3 px-4 py-3 bg-app-quaternary/40 border border-app-primary-20 rounded-xl">
        <div className="p-2.5 bg-yellow-500/15 rounded-lg">
          <Coins size={20} className="text-yellow-400" />
        </div>
        <div>
          <div className="text-xl font-bold text-app-primary font-mono leading-tight">
            {formatBaseCurrencyBalance(totalBalance, baseCurrency)}
          </div>
          <div className="text-app-secondary-60 text-[11px] uppercase tracking-wide font-mono">
            Total {baseCurrency.symbol}
          </div>
        </div>
      </div>

      {/* Active/Archived Count */}
      <div className="flex items-center gap-3 px-4 py-3 bg-app-quaternary/40 border border-app-primary-20 rounded-xl">
        <div className={`p-2.5 rounded-lg ${showArchived ? 'bg-orange-500/15' : 'bg-blue-500/15'}`}>
          {showArchived ? (
            <Archive size={20} className="text-orange-400" />
          ) : (
            <Zap size={20} className="text-blue-400" />
          )}
        </div>
        <div>
          <div className="text-xl font-bold text-app-primary font-mono leading-tight">
            {activeOrArchivedCount}
          </div>
          <div className="text-app-secondary-60 text-[11px] uppercase tracking-wide font-mono">
            {showArchived ? "Archived" : "Active"}
          </div>
        </div>
      </div>
    </div>
  );
};
