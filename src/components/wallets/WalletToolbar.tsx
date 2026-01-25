import React from "react";
import {
  Download,
  Trash2,
  Plus,
  Key,
  Archive,
  ChevronDown,
  Network,
  Send,
  HandCoins,
  Share,
  Flame,
} from "lucide-react";
import { WalletTooltip } from "../Styles";
import type { WalletToolbarProps, ViewMode } from "./types";

export const WalletToolbar: React.FC<WalletToolbarProps> = ({
  viewMode,
  setViewMode,
  showViewModeDropdown,
  setShowViewModeDropdown,
  viewModeDropdownRef,
  showArchived,
  setShowArchived,
  onCreateWallet,
  onImportWallet,
  onDownloadAll,
  onCleanup,
  onFund,
  onConsolidate,
  onTransfer,
  onBurn,
  onDeposit,
  connection,
  baseCurrency,
  setSelectedWallets,
}) => {
  return (
    <div className="mb-4 flex-shrink-0">
      <div className="flex flex-row flex-wrap items-center gap-0.5 sm:gap-1">
        {/* View Mode Dropdown */}
        <div className="relative" ref={viewModeDropdownRef}>
          <button
            onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
            className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300
                    bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60
                    text-app-primary whitespace-nowrap"
          >
            <span className="hidden sm:inline text-xs sm:text-sm text-app-secondary-80">
              VIEW:
            </span>
            <span className="font-bold">
              {viewMode === "all"
                ? "ALL"
                : viewMode === "hd"
                  ? "HD"
                  : "IMP"}
            </span>
            <ChevronDown
              size={12}
              className={`sm:hidden transition-transform duration-200 ${showViewModeDropdown ? "rotate-180" : ""}`}
            />
            <ChevronDown
              size={14}
              className={`hidden sm:block transition-transform duration-200 ${showViewModeDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {showViewModeDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-app-primary border border-app-primary-30 rounded-lg shadow-lg z-20 min-w-full">
              {(["all", "hd", "imported"] as const).map((mode: ViewMode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode);
                    setShowViewModeDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-mono transition-colors ${
                    viewMode === mode
                      ? "bg-app-primary-color text-black font-bold"
                      : "text-app-primary hover:bg-app-quaternary"
                  } ${mode === "all" ? "rounded-t-lg" : mode === "imported" ? "rounded-b-lg" : ""}`}
                >
                  {mode === "all"
                    ? "ALL"
                    : mode === "hd"
                      ? "HD WALLETS"
                      : "IMPORTED"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create Single Wallet */}
        <button
          onClick={onCreateWallet}
          disabled={!connection}
          className={`flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation whitespace-nowrap ${
            !connection
              ? "bg-primary-20 cursor-not-allowed text-app-secondary-80"
              : "bg-app-primary-color hover:bg-app-primary-dark text-black font-bold btn"
          }`}
        >
          <Plus size={12} className="sm:hidden" />
          <Plus size={14} className="hidden sm:block" />
          <span className="hidden sm:inline ml-0.5">CREATE</span>
        </button>

        {/* Import Wallet */}
        <button
          onClick={onImportWallet}
          className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation whitespace-nowrap bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary"
        >
          <Key size={12} className="sm:hidden" />
          <Key size={14} className="hidden sm:block" />
          <span className="hidden sm:inline ml-0.5">IMPORT</span>
        </button>

        {/* Quick Actions */}
        <WalletTooltip content="Export all wallets" position="bottom">
          <button
            onClick={onDownloadAll}
            className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary text-app-primary border border-app-primary-40 hover:border-app-primary-60 hover:bg-app-tertiary whitespace-nowrap"
          >
            <Download size={12} className="sm:hidden" />
            <Download size={14} className="hidden sm:block" />
            <span className="hidden sm:inline ml-0.5">DOWNLOAD</span>
          </button>
        </WalletTooltip>

        <WalletTooltip content="Remove empty wallets" position="bottom">
          <button
            onClick={onCleanup}
            className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary border border-error-alt-40 hover:border-error-alt text-error-alt hover:bg-app-tertiary whitespace-nowrap"
          >
            <Trash2 size={12} className="sm:hidden" />
            <Trash2 size={14} className="hidden sm:block" />
            <span className="hidden sm:inline ml-0.5">CLEANUP</span>
          </button>
        </WalletTooltip>

        {/* Archive View Toggle */}
        <WalletTooltip
          content={showArchived ? "Show active wallets" : "Show archived wallets"}
          position="bottom"
        >
          <button
            onClick={() => {
              setShowArchived(!showArchived);
              setSelectedWallets(new Set());
            }}
            className={`flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation whitespace-nowrap ${
              showArchived
                ? "bg-app-primary-color text-black border border-app-primary-60 font-bold"
                : "bg-app-quaternary text-app-primary border border-app-primary-40 hover:border-app-primary-60 hover:bg-app-tertiary"
            }`}
          >
            <Archive size={12} className="sm:hidden" />
            <Archive size={14} className="hidden sm:block" />
            <span className="hidden sm:inline ml-0.5">
              {showArchived ? "ARCHIVED" : "ARCHIVE"}
            </span>
          </button>
        </WalletTooltip>

        {/* End Row Buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 ml-auto">
          <WalletTooltip content="Fund Wallets" position="bottom">
            <button
              onClick={onFund}
              className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary whitespace-nowrap"
            >
              <HandCoins size={12} className="sm:hidden" />
              <HandCoins size={14} className="hidden sm:block" />
              <span className="hidden sm:inline ml-0.5">FUND</span>
            </button>
          </WalletTooltip>

          <WalletTooltip
            content={`Consolidate ${baseCurrency.symbol}`}
            position="bottom"
          >
            <button
              onClick={onConsolidate}
              className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary whitespace-nowrap"
            >
              <Share size={12} className="sm:hidden" />
              <Share size={14} className="hidden sm:block" />
              <span className="hidden sm:inline ml-0.5">CONSOLIDATE</span>
            </button>
          </WalletTooltip>

          <WalletTooltip content="Transfer Assets" position="bottom">
            <button
              onClick={onTransfer}
              className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary whitespace-nowrap"
            >
              <Network size={12} className="sm:hidden" />
              <Network size={14} className="hidden sm:block" />
              <span className="hidden sm:inline ml-0.5">TRANSFER</span>
            </button>
          </WalletTooltip>

          <WalletTooltip content="Burn Tokens" position="bottom">
            <button
              onClick={onBurn}
              className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary whitespace-nowrap"
            >
              <Flame size={12} className="sm:hidden" />
              <Flame size={14} className="hidden sm:block" />
              <span className="hidden sm:inline ml-0.5">BURN</span>
            </button>
          </WalletTooltip>

          <WalletTooltip
            content={`Deposit ${baseCurrency.symbol}`}
            position="bottom"
          >
            <button
              onClick={onDeposit}
              className="flex items-center justify-center px-2 sm:px-3 py-1 sm:py-1.5 rounded font-mono text-xs sm:text-sm transition-all duration-300 touch-manipulation bg-app-quaternary hover:bg-app-tertiary border border-app-primary-40 hover:border-app-primary-60 text-app-primary whitespace-nowrap"
            >
              <Send size={12} className="sm:hidden" />
              <Send size={14} className="hidden sm:block" />
              <span className="hidden sm:inline ml-0.5">DEPOSIT</span>
            </button>
          </WalletTooltip>
        </div>
      </div>
    </div>
  );
};
