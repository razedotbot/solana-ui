import React from "react";
import { RefreshCw } from "lucide-react";
import { WalletTooltip } from "../Styles";
import { formatAddress, formatBaseCurrencyBalance } from "../../utils/formatting";
import { copyToClipboard } from "../../utils/wallet";
import type { MasterWalletSectionProps, MasterWalletExpandedDetailsProps } from "./types";

export const MasterWalletSection: React.FC<MasterWalletSectionProps> = ({
  masterWallets,
  wallets,
  expandedMasterWallets,
  onToggleExpansion,
  onCreateMasterWallet,
  onImportMasterWallet,
  onRefreshBalances,
  isRefreshing,
  connection,
  showToast,
}) => {
  return (
    <>
      {/* Master Wallet Cards & Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Master Wallet Cards */}
        {masterWallets.map((masterWallet) => {
          const derivedWallets = wallets.filter(
            (w) => w.masterWalletId === masterWallet.id
          );
          const isExpanded = expandedMasterWallets.has(masterWallet.id);

          return (
            <button
              key={masterWallet.id}
              onClick={() => onToggleExpansion(masterWallet.id)}
              className={`text-center px-3 py-1 border rounded text-xs font-mono transition-colors
                      ${
                        isExpanded
                          ? "border-app-primary-color bg-app-primary-color/10 color-primary"
                          : "border-app-primary-30 hover:border-app-primary-40 color-primary hover-color-primary-light"
                      }`}
            >
              <div className="font-bold">{masterWallet.name}</div>
              <div className="text-app-secondary-80 text-[10px]">
                {derivedWallets.length} wallet
                {derivedWallets.length !== 1 ? "s" : ""}
              </div>
            </button>
          );
        })}

        {/* Action Buttons */}
        <button
          onClick={onCreateMasterWallet}
          className="px-2 sm:px-3 py-1 sm:py-1.5 color-primary hover-color-primary-light
                  border border-app-primary-30 rounded text-xs sm:text-sm font-mono"
        >
          + NEW
        </button>
        <button
          onClick={onImportMasterWallet}
          className="px-2 sm:px-3 py-1 sm:py-1.5 color-primary hover-color-primary-light
                  border border-app-primary-30 rounded text-xs sm:text-sm font-mono"
        >
          IMPORT
        </button>
        <button
          onClick={async () => {
            if (!connection || isRefreshing) return;
            try {
              await onRefreshBalances();
              showToast("Balances refreshed", "success");
            } catch (error) {
              console.error("Error refreshing balances:", error);
              showToast("Failed to refresh balances", "error");
            }
          }}
          disabled={!connection || isRefreshing}
          className={`flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation whitespace-nowrap ${
            !connection || isRefreshing
              ? "bg-primary-20 cursor-not-allowed text-app-secondary-80"
              : "bg-app-primary-color hover:bg-app-primary-dark text-black font-bold btn"
          }`}
        >
          <RefreshCw
            size={12}
            className={`sm:hidden ${isRefreshing ? "animate-spin" : ""}`}
          />
          <RefreshCw
            size={14}
            className={`hidden sm:block ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline ml-0.5">REFRESH</span>
        </button>
      </div>
    </>
  );
};

export const MasterWalletExpandedDetails: React.FC<MasterWalletExpandedDetailsProps> = ({
  masterWallets,
  wallets,
  expandedMasterWallets,
  baseCurrencyBalances,
  baseCurrency,
  onExportSeedPhrase,
  onDeleteMasterWallet,
  showToast,
}) => {
  return (
    <>
      {masterWallets.map((masterWallet) => {
        const derivedWallets = wallets.filter(
          (w) => w.masterWalletId === masterWallet.id
        );
        const isExpanded = expandedMasterWallets.has(masterWallet.id);

        if (!isExpanded) return null;

        return (
          <div
            key={masterWallet.id}
            className="mb-4 pb-4 border-b border-app-primary-20 flex-shrink-0"
          >
            {/* Master Wallet Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="font-mono">
                <div className="text-sm text-app-primary font-bold">
                  {masterWallet.name}
                </div>
                {(() => {
                  const masterWalletAccount = derivedWallets.find(
                    (w) => w.derivationIndex === 0
                  );
                  return masterWalletAccount ? (
                    <div className="text-xs text-app-secondary-80 mt-1 flex items-center gap-2">
                      <span>Master:</span>
                      <WalletTooltip
                        content="Click to copy master wallet address"
                        position="top"
                      >
                        <button
                          onClick={() =>
                            copyToClipboard(masterWalletAccount.address, showToast)
                          }
                          className="color-primary hover-color-primary-light transition-colors"
                        >
                          {formatAddress(masterWalletAccount.address)}
                        </button>
                      </WalletTooltip>
                      <span>
                        (
                        {formatBaseCurrencyBalance(
                          baseCurrencyBalances.get(masterWalletAccount.address) ||
                            0,
                          baseCurrency
                        )}{" "}
                        {baseCurrency.symbol})
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="flex gap-2">
                <WalletTooltip content="Export Seed Phrase" position="top">
                  <button
                    onClick={() => onExportSeedPhrase(masterWallet)}
                    className="px-2 py-1 text-[10px] font-mono color-primary
                            hover-color-primary-light border border-app-primary-20 rounded"
                  >
                    EXPORT
                  </button>
                </WalletTooltip>

                <WalletTooltip content="Delete Master Wallet" position="top">
                  <button
                    onClick={() => onDeleteMasterWallet(masterWallet.id)}
                    className="px-2 py-1 text-[10px] font-mono text-red-500
                            hover:text-red-400 border border-red-500/30 rounded"
                  >
                    DELETE
                  </button>
                </WalletTooltip>
              </div>
            </div>

            {/* Derived Wallets List */}
            {derivedWallets.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {derivedWallets
                  .sort(
                    (a, b) =>
                      (a.derivationIndex || 0) - (b.derivationIndex || 0)
                  )
                  .map((wallet) => {
                    const isMasterWallet = wallet.derivationIndex === 0;
                    return (
                      <div
                        key={wallet.id}
                        className="flex justify-between items-center py-1 text-xs font-mono"
                      >
                        <span
                          className={
                            isMasterWallet
                              ? "text-app-primary-color font-bold"
                              : "text-app-secondary-80"
                          }
                        >
                          {isMasterWallet
                            ? "★ #0 (Master)"
                            : `#${wallet.derivationIndex}`}
                        </span>
                        <span className="text-app-primary">
                          {formatAddress(wallet.address)}
                        </span>
                        <span className="text-app-secondary-80">
                          {formatBaseCurrencyBalance(
                            baseCurrencyBalances.get(wallet.address) || 0,
                            baseCurrency
                          )}{" "}
                          {baseCurrency.symbol}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
