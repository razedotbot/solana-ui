/* eslint-disable react-refresh/only-export-components */
// Shared utilities, components, and styles used across wallet panels
// and trading components. Consolidation of PanelShared + shared.

import React, { useState, useRef, useEffect } from "react";
import { CheckCircle, ChevronDown, ChevronUp, Loader2, Wallet } from "lucide-react";
import type { WalletType, PresetTab } from "../../utils/types";
import type { WalletAmount } from "../../utils/types/components";
import { getWalletDisplayName } from "../../utils/wallet";
import { formatAddress } from "../../utils/formatting";
import type { BaseCurrencyConfig } from "../../utils/constants";
import { BASE_CURRENCIES } from "../../utils/constants";

// ═══════════════════════════════════════════════════════════════════════
// MODAL STYLES — shared CSS injected by useModalStyles
// ═══════════════════════════════════════════════════════════════════════

export const MODAL_STYLES = `
  /* ── Core keyframe animations ─────────────────────────────────────── */

  @keyframes modal-pulse {
    0% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
    50% { box-shadow: 0 0 15px var(--color-primary-80), 0 0 25px var(--color-primary-40); }
    100% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
  }

  @keyframes modal-fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes modal-slide-up {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  @keyframes modal-scan-line {
    0% { transform: translateY(-100%); opacity: 0.3; }
    100% { transform: translateY(100%); opacity: 0; }
  }

  /* ── Layout ───────────────────────────────────────────────────────── */

  .modal-content {
    position: relative;
  }

  /* ── Input / button / progress-bar cyber styles ───────────────────── */

  .modal-input-:focus {
    box-shadow: 0 0 0 1px var(--color-primary-70), 0 0 15px var(--color-primary-50);
    transition: all 0.3s ease;
  }

  .modal-input-cyber:focus {
    box-shadow: 0 0 0 1px var(--color-primary-70), 0 0 15px var(--color-primary-50);
    transition: all 0.3s ease;
  }

  .modal-btn- {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .modal-btn-::after {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      to bottom right,
      transparent 0%,
      var(--color-primary-30) 50%,
      transparent 100%
    );
    transform: rotate(45deg);
    transition: all 0.5s ease;
    opacity: 0;
  }

  .modal-btn-:hover::after {
    opacity: 1;
    transform: rotate(45deg) translate(50%, 50%);
  }

  .modal-btn-:active {
    transform: scale(0.95);
  }

  .modal-btn-cyber {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .modal-btn-cyber::after {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      to bottom right,
      transparent 0%,
      var(--color-primary-30) 50%,
      transparent 100%
    );
    transform: rotate(45deg);
    transition: all 0.5s ease;
    opacity: 0;
  }

  .modal-btn-cyber:hover::after {
    opacity: 1;
    transform: rotate(45deg) translate(50%, 50%);
  }

  .modal-btn-cyber:active {
    transform: scale(0.95);
  }

  .progress-bar- {
    position: relative;
    overflow: hidden;
  }

  .progress-bar-::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--color-primary-70) 50%,
      transparent 100%
    );
    width: 100%;
    height: 100%;
    transform: translateX(-100%);
    animation: progress-shine 3s infinite;
  }

  .progress-bar-cyber {
    position: relative;
    overflow: hidden;
  }

  .progress-bar-cyber::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--color-primary-70) 50%,
      transparent 100%
    );
    width: 100%;
    height: 100%;
    transform: translateX(-100%);
    animation: progress-shine 3s infinite;
  }

  @keyframes progress-shine {
    0% { transform: translateX(-100%); }
    20% { transform: translateX(100%); }
    100% { transform: translateX(100%); }
  }

  /* ── Glitch text effect ───────────────────────────────────────────── */

  .glitch-text:hover {
    text-shadow: 0 0 2px var(--color-primary), 0 0 4px var(--color-primary);
    animation: glitch 2s infinite;
  }

  @keyframes glitch {
    2%, 8% { transform: translate(-2px, 0) skew(0.3deg); }
    4%, 6% { transform: translate(2px, 0) skew(-0.3deg); }
    62%, 68% { transform: translate(0, 0) skew(0.33deg); }
    64%, 66% { transform: translate(0, 0) skew(-0.33deg); }
  }

  /* ── Step transition animations ───────────────────────────────────── */

  @keyframes modal-in {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  @keyframes step-out {
    0% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(-20px); opacity: 0; }
  }

  @keyframes step-in {
    0% { transform: translateX(20px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes step-back-out {
    0% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(20px); opacity: 0; }
  }

  @keyframes step-back-in {
    0% { transform: translateX(-20px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes content-fade {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes scale-in {
    0% { transform: scale(0); }
    100% { transform: scale(1); }
  }

  .animate-modal-in {
    animation: modal-in 0.5s ease-out forwards;
  }

  .animate-step-out {
    animation: step-out 0.3s ease-out forwards;
  }

  .animate-step-in {
    animation: step-in 0.3s ease-out forwards;
  }

  .animate-step-back-out {
    animation: step-back-out 0.3s ease-out forwards;
  }

  .animate-step-back-in {
    animation: step-back-in 0.3s ease-out forwards;
  }

  .animate-content-fade {
    animation: content-fade 0.5s ease forwards;
  }

  .animate-pulse-slow {
    animation: pulse-slow 2s infinite;
  }

  @keyframes pulse-slow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
  }

  /* ── Data-transfer animation (ConsolidatePanel) ───────────────────── */

  @keyframes data-transfer {
    0% { transform: translateY(0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(20px); opacity: 0; }
  }

  .data-flow {
    position: relative;
    overflow: hidden;
  }

  .data-flow::before {
    content: "";
    position: absolute;
    height: 6px;
    width: 6px;
    background-color: var(--color-primary-70);
    border-radius: 50%;
    top: 30%;
    left: 50%;
    animation: data-transfer 2s infinite;
    opacity: 0;
  }

  /* ── Scrollbar styling ────────────────────────────────────────────── */

  .modal-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .modal-scrollbar::-webkit-scrollbar-track {
    background: var(--color-bg-tertiary);
    border-radius: 3px;
  }

  .modal-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-scrollbar-thumb);
    border-radius: 3px;
  }

  .modal-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary);
  }

  .scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .scrollbar::-webkit-scrollbar-track {
    background: var(--color-bg-tertiary);
    border-radius: 3px;
  }

  .scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-scrollbar-thumb);
    border-radius: 3px;
  }

  .scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary);
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: var(--color-bg-tertiary);
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: var(--color-primary);
    border-radius: 2px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary-dark);
  }

  /* ── Responsive styles ────────────────────────────────────────────── */

  @media (max-width: 768px) {
    .modal-content {
      width: 95% !important;
      max-height: 90vh;
      overflow-y: auto;
    }
  }
`;

// ═══════════════════════════════════════════════════════════════════════
// useModalStyles — CSS injection hook
// ═══════════════════════════════════════════════════════════════════════

export const useModalStyles = (
  isOpen: boolean,
  id: string,
  additionalCSS?: string,
): void => {
  useEffect(() => {
    if (!isOpen) return;
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = additionalCSS ? MODAL_STYLES + additionalCSS : MODAL_STYLES;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [isOpen, id, additionalCSS]);
};

// ═══════════════════════════════════════════════════════════════════════
// Panel utility functions — pure helpers for wallet panels
// ═══════════════════════════════════════════════════════════════════════

export const formatBalance = (balance: number, baseCurrency: BaseCurrencyConfig): string =>
  baseCurrency.isNative ? balance.toFixed(4) : balance.toFixed(2);

export const getWalletBalance = (address: string, balances: Map<string, number>): number =>
  balances.has(address) ? (balances.get(address) ?? 0) : 0;

export const getWalletByAddress = (wallets: WalletType[], address: string): WalletType | undefined =>
  wallets.find((wallet) => wallet.address === address);

export const getPrivateKeyByAddress = (wallets: WalletType[], address: string): string => {
  const wallet = getWalletByAddress(wallets, address);
  return wallet ? wallet.privateKey : "";
};

export const toggleSelection = (prev: string[], item: string): string[] =>
  prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item];

export const calculateTotalAmount = (
  useCustomAmounts: boolean,
  walletAmounts: WalletAmount[],
  commonAmount: string,
  selectedCount: number,
): number => {
  if (useCustomAmounts) {
    return walletAmounts.reduce((total, item) => total + (parseFloat(item.amount) || 0), 0);
  }
  return parseFloat(commonAmount || "0") * selectedCount;
};

export const hasEmptyAmounts = (
  useCustomAmounts: boolean,
  walletAmounts: WalletAmount[],
  selectedAddresses: string[],
): boolean => {
  if (!useCustomAmounts) return false;
  return walletAmounts.some(
    (wallet) =>
      selectedAddresses.includes(wallet.address) &&
      (!wallet.amount || parseFloat(wallet.amount) === 0),
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Filter / Sort utilities
// ═══════════════════════════════════════════════════════════════════════

export type BalanceFilter = 'all' | 'nonZero' | 'highBalance' | 'lowBalance';
export type SortOption = 'address' | 'balance' | 'tokenBalance';
export type SortDirection = 'asc' | 'desc';

/**
 * Shared pure function for filtering and sorting wallet lists.
 *
 * Covers the common logic used across BurnPanel, DistributePanel, MixerPanel,
 * ConsolidatePanel, and TransferPanel.
 *
 * @param wallets        - The wallet array to filter/sort (generic, must have `address`)
 * @param searchTerm     - Text to match against address (and label if present)
 * @param balanceFilter  - Which balance bucket to keep
 * @param sortOption     - Field to sort by
 * @param sortDirection  - Ascending or descending
 * @param getBalance     - Callback that returns the primary balance for a wallet address
 * @param getTokenBalance - Optional callback for token balance (used by tokenBalance sort/filter)
 */
export const filterAndSortWallets = <T extends { address: string; label?: string }>(
  wallets: T[],
  searchTerm: string,
  balanceFilter: BalanceFilter,
  sortOption: SortOption,
  sortDirection: SortDirection,
  getBalance: (address: string) => number,
  getTokenBalance?: (address: string) => number,
): T[] => {
  let filtered = wallets;

  // Search filter: match against address and optional label (case-insensitive)
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((wallet) =>
      wallet.address.toLowerCase().includes(term) ||
      (wallet.label?.toLowerCase().includes(term) ?? false),
    );
  }

  // Balance filter
  if (balanceFilter !== 'all') {
    if (balanceFilter === 'nonZero') {
      filtered = filtered.filter(
        (wallet) =>
          (getBalance(wallet.address) || 0) > 0 ||
          (getTokenBalance ? (getTokenBalance(wallet.address) || 0) > 0 : false),
      );
    } else if (balanceFilter === 'highBalance') {
      filtered = filtered.filter(
        (wallet) => (getBalance(wallet.address) || 0) >= 0.1,
      );
    } else if (balanceFilter === 'lowBalance') {
      filtered = filtered.filter(
        (wallet) =>
          (getBalance(wallet.address) || 0) < 0.1 &&
          (getBalance(wallet.address) || 0) > 0,
      );
    }
  }

  // Sort
  return filtered.sort((a, b) => {
    if (sortOption === 'address') {
      return sortDirection === 'asc'
        ? a.address.localeCompare(b.address)
        : b.address.localeCompare(a.address);
    } else if (sortOption === 'balance') {
      const balanceA = getBalance(a.address) || 0;
      const balanceB = getBalance(b.address) || 0;
      return sortDirection === 'asc'
        ? balanceA - balanceB
        : balanceB - balanceA;
    } else if (sortOption === 'tokenBalance' && getTokenBalance) {
      const tokenBalanceA = getTokenBalance(a.address) || 0;
      const tokenBalanceB = getTokenBalance(b.address) || 0;
      return sortDirection === 'asc'
        ? tokenBalanceA - tokenBalanceB
        : tokenBalanceB - tokenBalanceA;
    }
    return 0;
  });
};

// ═══════════════════════════════════════════════════════════════════════
// SourceWalletSummary component
// ═══════════════════════════════════════════════════════════════════════

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
            {formatBalance(balance, baseCurrency)} {baseCurrency.symbol}
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
          {formatBalance(totalBalance, baseCurrency)} {baseCurrency.symbol}
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
                {formatBalance(balance, baseCurrency)}
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

// ═══════════════════════════════════════════════════════════════════════
// ConfirmCheckbox — styled confirmation checkbox
// ═══════════════════════════════════════════════════════════════════════

interface ConfirmCheckboxProps {
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
}

export const ConfirmCheckbox: React.FC<ConfirmCheckboxProps> = ({
  checked,
  onChange,
  label,
}) => (
  <div
    className="flex items-center px-3 py-3 bg-app-tertiary rounded-lg border border-app-primary-30 cursor-pointer"
    onClick={onChange}
  >
    <div className="relative mx-1">
      <div
        className="w-5 h-5 border border-app-primary-40 rounded transition-all"
        style={{
          backgroundColor: checked ? "var(--color-primary)" : "transparent",
          borderColor: checked ? "var(--color-primary)" : "var(--color-primary-40)",
        }}
      ></div>
      <CheckCircle
        size={14}
        className={`absolute top-0.5 left-0.5 text-app-primary transition-all ${checked ? "opacity-100" : "opacity-0"}`}
      />
    </div>
    <span className="text-app-primary text-sm ml-2 cursor-pointer select-none font-mono">
      {label}
    </span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// Spinner — loading spinner (sm = inline button, lg = centered)
// ═══════════════════════════════════════════════════════════════════════

interface SpinnerProps {
  size?: "sm" | "lg";
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = "sm", className = "" }) => {
  if (size === "lg") {
    return (
      <div className={`relative h-12 w-12 ${className}`}>
        <div className="absolute inset-0 rounded-full border-2 border-t-app-primary border-r-app-primary-30 border-b-app-primary-10 border-l-app-primary-30 animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-app-primary-70 border-b-app-primary-50 border-l-transparent animate-spin-slow"></div>
        <div className="absolute inset-0 rounded-full border border-app-primary-20"></div>
      </div>
    );
  }
  return (
    <div className={`h-4 w-4 rounded-full border-2 border-app-primary-80 border-t-transparent animate-spin ${className}`}></div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Preset tabs utilities — default presets + cookie persistence
// ═══════════════════════════════════════════════════════════════════════

export const defaultPresetTabs: PresetTab[] = [
  {
    id: "degen",
    label: "DEGEN",
    buyPresets: ["0.01", "0.05", "0.1", "0.5"],
    sellPresets: ["25", "50", "75", "100"],
  },
  {
    id: "diamond",
    label: "DIAMOND",
    buyPresets: ["0.001", "0.01", "0.05", "0.1"],
    sellPresets: ["10", "25", "50", "75"],
  },
  {
    id: "yolo",
    label: "YOLO",
    buyPresets: ["0.1", "0.5", "1", "5"],
    sellPresets: ["50", "75", "90", "100"],
  },
];

export const loadPresetsFromCookies = (): {
  tabs: PresetTab[];
  activeTabId: string;
} => {
  try {
    const savedPresets = document.cookie
      .split("; ")
      .find((row) => row.startsWith("tradingPresets="))
      ?.split("=")[1];

    if (savedPresets) {
      const decoded = decodeURIComponent(savedPresets);
      const parsed = JSON.parse(decoded) as {
        tabs?: unknown;
        activeTabId?: string;
      };
      return {
        tabs: Array.isArray(parsed.tabs)
          ? (parsed.tabs as PresetTab[])
          : defaultPresetTabs,
        activeTabId:
          typeof parsed.activeTabId === "string"
            ? parsed.activeTabId
            : "degen",
      };
    }
  } catch {
    // Invalid JSON, use defaults
  }
  return {
    tabs: defaultPresetTabs,
    activeTabId: "degen",
  };
};

export const savePresetsToCookies = (
  tabs: PresetTab[],
  activeTabId: string,
): void => {
  try {
    const presetsData = {
      tabs,
      activeTabId,
    };
    const encoded = encodeURIComponent(JSON.stringify(presetsData));
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1); // 1 year expiry
    document.cookie = `tradingPresets=${encoded}; expires=${expires.toUTCString()}; path=/`;
  } catch {
    // Cookie save error, ignore
  }
};

// ═══════════════════════════════════════════════════════════════════════
// PresetButton — editable preset amount button
// ═══════════════════════════════════════════════════════════════════════

export interface PresetButtonProps {
  value: string;
  onExecute: (amount: string) => void;
  onChange: (newValue: string) => void;
  isLoading: boolean;
  variant?: "buy" | "sell";
  isEditMode: boolean;
  index?: number;
  isMobile?: boolean;
}

// Resolve a preset value — if it's a range like "0.01-0.05", pick a random value in that range
const resolvePresetValue = (value: string): string => {
  const parts = value.split("-");
  if (parts.length === 2) {
    const min = parseFloat(parts[0]);
    const max = parseFloat(parts[1]);
    if (!isNaN(min) && !isNaN(max) && min < max) {
      const random = min + Math.random() * (max - min);
      // Match decimal precision of the more precise side
      const decimals = Math.max(
        (parts[0].split(".")[1] || "").length,
        (parts[1].split(".")[1] || "").length,
      );
      return random.toFixed(decimals);
    }
  }
  return value;
};

// Validate a preset value — accepts single numbers ("0.1") or ranges ("0.01-0.05")
const isValidPresetValue = (val: string): boolean => {
  const parts = val.split("-");
  if (parts.length === 1) {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }
  if (parts.length === 2) {
    const min = parseFloat(parts[0]);
    const max = parseFloat(parts[1]);
    return !isNaN(min) && !isNaN(max) && min > 0 && max > min;
  }
  return false;
};

const PresetButtonInner = React.memo<PresetButtonProps>(
  ({ value, onExecute, onChange, isLoading, variant = "buy", isEditMode, isMobile = false }) => {
    const parsedRange = value.match(/^(\d+\.?\d*)-(\d+\.?\d*)$/);
    const [minVal, setMinVal] = useState(() => parsedRange ? parsedRange[1] : value);
    const [maxVal, setMaxVal] = useState(() => parsedRange ? parsedRange[2] : "");
    const minRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const m = value.match(/^(\d+\.?\d*)-(\d+\.?\d*)$/);
      if (m) {
        setMinVal(m[1]);
        setMaxVal(m[2]);
      } else {
        setMinVal(value);
        setMaxVal("");
      }
    }, [value]);

    useEffect(() => {
      if (isEditMode && minRef.current) {
        minRef.current.focus();
      }
    }, [isEditMode]);

    const commitEdit = (): void => {
      const newValue = maxVal && parseFloat(maxVal) > 0
        ? `${minVal}-${maxVal}`
        : minVal;
      if (isValidPresetValue(newValue)) {
        onChange(newValue);
      } else {
        // Revert
        const m = value.match(/^(\d+\.?\d*)-(\d+\.?\d*)$/);
        if (m) { setMinVal(m[1]); setMaxVal(m[2]); }
        else { setMinVal(value); setMaxVal(""); }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") commitEdit();
      else if (e.key === "Escape") {
        const m = value.match(/^(\d+\.?\d*)-(\d+\.?\d*)$/);
        if (m) { setMinVal(m[1]); setMaxVal(m[2]); }
        else { setMinVal(value); setMaxVal(""); }
      }
    };

    const filterNum = (v: string): string => v.replace(/[^0-9.]/g, "");

    // Check if this preset is a range value (for display)
    const rangeMatch = value.match(/^(\d+\.?\d*)-(\d+\.?\d*)$/);

    if (isEditMode) {
      return (
        <div className="flex flex-col gap-0.5">
          <input
            ref={minRef}
            type="text"
            value={minVal}
            onChange={(e) => setMinVal(filterNum(e.target.value))}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            placeholder="min"
            className="w-full h-[18px] px-1 text-[10px] font-mono rounded-t border border-b-0 text-center
                   bg-app-primary text-app-primary border-app-primary-color
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
          />
          <input
            type="text"
            value={maxVal}
            onChange={(e) => setMaxVal(filterNum(e.target.value))}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            placeholder="max"
            className="w-full h-[18px] px-1 text-[10px] font-mono rounded-b border border-t-0 text-center
                   bg-app-primary text-app-primary border-app-primary-color
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
          />
        </div>
      );
    }

    return (
      <button
        onClick={() => onExecute(resolvePresetValue(value))}
        className={`relative group ${
          isMobile
            ? "px-3 py-3 md:px-2 md:py-1.5 text-sm md:text-xs"
            : "px-2 py-1.5 text-xs"
        } font-mono rounded border transition-all duration-200
                min-w-[48px] ${
                  isMobile
                    ? "min-h-[48px] md:min-h-[32px] h-auto md:h-8"
                    : "h-8"
                } flex items-center justify-center
                ${
                  variant === "buy"
                    ? "bg-app-primary-60 border-app-primary-40 color-primary hover-bg-primary-20 hover-border-primary"
                    : "bg-app-primary-60 border-error-alt-40 text-error-alt hover-bg-error-30 hover-border-error-alt"
                }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" />
            <span>{value}</span>
          </div>
        ) : rangeMatch ? (
          <span className="text-[10px]">{rangeMatch[1]}-{rangeMatch[2]}</span>
        ) : (
          value
        )}
      </button>
    );
  },
);
PresetButtonInner.displayName = "PresetButton";
export const PresetButton = PresetButtonInner;

// ═══════════════════════════════════════════════════════════════════════
// TabButton — editable preset tab selector
// ═══════════════════════════════════════════════════════════════════════

export interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  onEdit: (newLabel: string) => void;
  isEditMode: boolean;
}

const TabButtonInner = React.memo<TabButtonProps>(
  ({ label, isActive, onClick, onEdit, isEditMode }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(label);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    const handleClick = (): void => {
      if (isEditMode) {
        setIsEditing(true);
        setEditValue(label);
      } else {
        onClick();
      }
    };

    const handleSave = (): void => {
      if (editValue.trim()) {
        onEdit(editValue.trim());
      }
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        setEditValue(label);
        setIsEditing(false);
      }
    };

    if (isEditing) {
      return (
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full px-2 py-1 text-xs font-mono rounded
                   bg-app-primary text-app-primary border border-app-primary-color
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
          />
        </div>
      );
    }

    return (
      <button
        onClick={handleClick}
        className={`flex-1 px-3 py-1.5 text-xs font-mono rounded transition-all duration-200
                ${
                  isActive
                    ? "bg-primary-20 border border-app-primary-80 color-primary"
                    : "bg-app-primary-60 border border-app-primary-40 text-app-secondary-60 hover-border-primary-40 hover-text-app-secondary"
                }
                ${isEditMode ? "cursor-text" : "cursor-pointer"}`}
      >
        {label}
      </button>
    );
  },
);
TabButtonInner.displayName = "TabButton";
export const TabButton = TabButtonInner;
