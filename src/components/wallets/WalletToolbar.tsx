import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  Trash2,
  Plus,
  Key,
  Archive,
  ChevronDown,
  Network,
  Send,
  Share,
  Flame,
  RefreshCw,
  Shuffle,
  CircleDollarSign,
  Wallet,
  Settings,
} from "lucide-react";
import type { WalletToolbarProps, ViewMode } from "./types";

interface ExtendedWalletToolbarProps extends Omit<WalletToolbarProps, 'onFund'> {
  walletsCount: number;
  totalWallets: number;
  totalBalance: string;
  activeCount: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onDistribute: () => void;
  onMixer: () => void;
}

// Dropdown menu component with hover
interface DropdownItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface HoverDropdownProps {
  label: string;
  icon: React.ReactNode;
  items: DropdownItem[];
}

const HoverDropdown: React.FC<HoverDropdownProps> = ({ label, icon, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (): void => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = (): void => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isOpen
            ? 'bg-app-primary-15 text-app-primary border-app-primary-30'
            : 'hover:bg-app-quaternary text-app-secondary-80 hover:text-app-primary'
        } border border-transparent hover:border-app-primary-20`}
      >
        {icon}
        <span>{label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      <div
        className={`absolute top-full left-0 mt-1 min-w-[180px] bg-app-primary border border-app-primary-20 rounded-lg shadow-xl shadow-black/40 overflow-hidden z-50 transition-all duration-200 origin-top ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="py-1">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                item.variant === 'danger'
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-app-primary hover:bg-app-primary-10'
              }`}
            >
              <span className={item.variant === 'danger' ? 'text-red-400' : 'color-primary opacity-70'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const WalletToolbar: React.FC<ExtendedWalletToolbarProps> = ({
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
  onDistribute,
  onMixer,
  onConsolidate,
  onTransfer,
  onBurn,
  onDeposit,
  connection,
  setSelectedWallets,
  walletsCount,
  totalWallets,
  totalBalance,
  activeCount,
  onRefresh,
  isRefreshing,
}) => {
  // Fund operations dropdown items
  const fundItems: DropdownItem[] = [
    { label: 'Distribute', icon: <CircleDollarSign size={16} />, onClick: onDistribute },
    { label: 'Deposit', icon: <Send size={16} />, onClick: onDeposit },
    { label: 'Transfer', icon: <Network size={16} />, onClick: onTransfer },
    { label: 'Consolidate', icon: <Share size={16} />, onClick: onConsolidate },
    { label: 'Mixer', icon: <Shuffle size={16} />, onClick: onMixer },
  ];

  // Manage dropdown items
  const manageItems: DropdownItem[] = [
    { label: 'Export Keys', icon: <Download size={16} />, onClick: onDownloadAll },
    { label: 'Burn Tokens', icon: <Flame size={16} />, onClick: onBurn },
    { label: 'Cleanup', icon: <Trash2 size={16} />, onClick: onCleanup, variant: 'danger' },
  ];

  return (
    <div className="flex-shrink-0 mb-4 space-y-4">
      {/* Header Row: Stats + Primary Actions */}
      <div className="flex items-center justify-between">
        {/* Left: Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-6 px-4 py-3 rounded-lg bg-app-secondary-90/30 border border-app-primary-10">
            {/* Wallets */}
            <div>
              <div className="text-[10px] font-mono text-app-secondary-60 tracking-wider uppercase">Wallets</div>
              <div className="text-xl font-bold color-primary font-mono">
                {walletsCount}<span className="text-app-secondary-60 text-sm font-normal">/{totalWallets}</span>
              </div>
            </div>

            <div className="w-px h-8 bg-app-primary-15" />

            {/* Balance */}
            <div>
              <div className="text-[10px] font-mono text-app-secondary-60 tracking-wider uppercase">Balance</div>
              <div className="text-xl font-bold text-yellow-400 font-mono">{totalBalance}</div>
            </div>

            <div className="w-px h-8 bg-app-primary-15" />

            {/* Active/Archived */}
            <div>
              <div className="text-[10px] font-mono text-app-secondary-60 tracking-wider uppercase">
                {showArchived ? 'Archived' : 'Active'}
              </div>
              <div className={`text-xl font-bold font-mono ${showArchived ? 'text-orange-400' : 'text-green-400'}`}>
                {activeCount}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Primary Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateWallet}
            disabled={!connection}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-app-primary-color hover:brightness-110 text-app-quaternary transition-all ${!connection ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Create Wallet</span>
          </button>

          <button
            onClick={onImportWallet}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary text-app-primary transition-all"
          >
            <Key size={16} />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Toolbar Row: Operations + Filters */}
      <div className="flex items-center gap-3 pb-4 border-b border-app-primary-15">
        {/* Operations */}
        <HoverDropdown
          label="Fund"
          icon={<Wallet size={16} />}
          items={fundItems}
        />

        <HoverDropdown
          label="Manage"
          icon={<Settings size={16} />}
          items={manageItems}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* View Mode */}
          <div className="relative" ref={viewModeDropdownRef}>
            <button
              onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary text-app-primary transition-all"
            >
              <span>View: {viewMode === "all" ? "All" : viewMode === "hd" ? "HD" : "Imported"}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showViewModeDropdown ? "rotate-180" : ""}`} />
            </button>
            <div
              className={`absolute top-full right-0 mt-1 bg-app-primary border border-app-primary-20 rounded-lg shadow-xl shadow-black/40 z-50 min-w-[140px] overflow-hidden transition-all duration-200 origin-top ${
                showViewModeDropdown
                  ? 'opacity-100 scale-100 translate-y-0'
                  : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
              }`}
            >
              <div className="py-1">
                {(["all", "hd", "imported"] as const).map((mode: ViewMode) => (
                  <button
                    key={mode}
                    onClick={() => { setViewMode(mode); setShowViewModeDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      viewMode === mode
                        ? "bg-app-primary-color text-app-quaternary font-semibold"
                        : "text-app-primary hover:bg-app-primary-10"
                    }`}
                  >
                    {mode === "all" ? "All Wallets" : mode === "hd" ? "HD Wallets" : "Imported"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Archive Toggle */}
          <button
            onClick={() => { setShowArchived(!showArchived); setSelectedWallets(new Set()); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
              showArchived
                ? 'bg-orange-500/20 border-orange-500/30 text-orange-400'
                : 'bg-app-quaternary hover:bg-app-tertiary border-app-primary-20 hover:border-app-primary text-app-primary'
            }`}
          >
            <Archive size={16} />
            <span>Archived</span>
          </button>

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-lg bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary transition-colors ${isRefreshing ? 'opacity-50' : ''}`}
            >
              <RefreshCw size={16} className={`text-app-secondary-60 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
