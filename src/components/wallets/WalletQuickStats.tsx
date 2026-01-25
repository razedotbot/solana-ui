import React from "react";
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
    <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-6 text-xs sm:text-sm font-mono">
      <div className="text-center">
        <div className="color-primary font-bold">
          {filteredCount} of {totalCount}
        </div>
        <div className="text-app-secondary-80 text-[10px] sm:text-xs">
          SHOWN
        </div>
      </div>
      <div className="text-center">
        <div className="color-primary font-bold text-xs sm:text-sm">
          {formatBaseCurrencyBalance(totalBalance, baseCurrency)}
        </div>
        <div className="text-app-secondary-80 text-[10px] sm:text-xs">
          TOTAL {baseCurrency.symbol}
        </div>
      </div>
      <div className="text-center">
        <div className="color-primary font-bold">{activeOrArchivedCount}</div>
        <div className="text-app-secondary-80 text-[10px] sm:text-xs">
          {showArchived ? "ARCHIVED" : "ACTIVE"}
        </div>
      </div>
    </div>
  );
};
