import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wallet,
  Search,
  X,
  Users,
  User,
  Sparkles,
  Settings,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import type { PlatformType } from "../../utils/create";
import { METEORA_DBC_CONFIGS, METEORA_CPAMM_CONFIGS } from "../../utils/create";
import type { AdditionalToken } from "./constants";
import { MAX_TOKENS_PER_PLATFORM } from "./constants";
import { PlatformIcons, PLATFORMS } from "./constants";
import { getWalletDisplayName } from "../../utils/wallet";
import type { WalletType } from "../../utils/types";
import { useToast } from "../Notifications";
import { useTokenMetadata } from "../../utils/hooks/useTokenMetadata";

interface DeploysTabProps {
  additionalTokens: AdditionalToken[];
  setAdditionalTokens: React.Dispatch<React.SetStateAction<AdditionalToken[]>>;
  wallets: WalletType[];
  baseCurrencyBalances: Map<string, number>;
  sharedWallets: string[];
  maxWallets: number;
}

export const DeploysTab: React.FC<DeploysTabProps> = ({
  additionalTokens,
  setAdditionalTokens,
  wallets,
  baseCurrencyBalances,
  sharedWallets,
  maxWallets,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [walletSearch, setWalletSearch] = useState("");
  const [globalWalletSearch, setGlobalWalletSearch] = useState("");
  const [useGlobalCustomWallets, setUseGlobalCustomWallets] = useState(false);
  const [globalWallets, setGlobalWallets] = useState<string[]>([]);
  const [globalWalletAmounts, setGlobalWalletAmounts] = useState<Record<string, string>>({});

  // Count tokens per platform
  const getTokenCountForPlatform = (platform: PlatformType): number => {
    return additionalTokens.filter((t) => t.platform === platform).length;
  };

  // Add new deploy
  const addDeploy = (platform: PlatformType): void => {
    if (getTokenCountForPlatform(platform) >= MAX_TOKENS_PER_PLATFORM) return;
    setAdditionalTokens((prev) => [...prev, {
      platform,
      pumpType: false,
      pumpMode: "simple",
      bonkType: "meme",
      bonkMode: "simple",
      meteoraDBCMode: "simple",
      meteoraDBCConfigAddress: METEORA_DBC_CONFIGS.standard,
      meteoraCPAMMConfigAddress: METEORA_CPAMM_CONFIGS.standard,
      meteoraCPAMMInitialLiquidity: "1",
      meteoraCPAMMInitialTokenPercent: "80",
      useCustomWallets: false,
    }]);
  };

  // Remove deploy
  const removeDeploy = (index: number): void => {
    setAdditionalTokens((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
  };

  // Toggle custom wallets for a deploy
  const toggleCustomWallets = (index: number): void => {
    setAdditionalTokens((prev) => prev.map((token, i) => {
      if (i !== index) return token;
      return {
        ...token,
        useCustomWallets: !token.useCustomWallets,
        wallets: !token.useCustomWallets ? [] : undefined,
        walletAmounts: !token.useCustomWallets ? {} : undefined,
      };
    }));
  };

  // Select wallet for a deploy
  const selectWallet = (tokenIndex: number, privateKey: string): void => {
    setAdditionalTokens((prev) => prev.map((token, i) => {
      if (i !== tokenIndex) return token;
      const currentWallets = token.wallets || [];
      if (currentWallets.includes(privateKey)) return token;
      if (currentWallets.length >= maxWallets) return token;
      return {
        ...token,
        wallets: [...currentWallets, privateKey],
        walletAmounts: { ...token.walletAmounts, [privateKey]: "0.1" },
      };
    }));
  };

  // Remove wallet from a deploy
  const removeWallet = (tokenIndex: number, privateKey: string): void => {
    setAdditionalTokens((prev) => prev.map((token, i) => {
      if (i !== tokenIndex) return token;
      const newWallets = (token.wallets || []).filter((pk) => pk !== privateKey);
      const newAmounts = { ...token.walletAmounts };
      delete newAmounts[privateKey];
      return { ...token, wallets: newWallets, walletAmounts: newAmounts };
    }));
  };

  // Update wallet amount for a deploy
  const updateWalletAmount = (tokenIndex: number, privateKey: string, value: string): void => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setAdditionalTokens((prev) => prev.map((token, i) => {
      if (i !== tokenIndex) return token;
      return { ...token, walletAmounts: { ...token.walletAmounts, [privateKey]: value } };
    }));
  };

  // Update platform-specific settings for a deploy
  const updateTokenSetting = <K extends keyof AdditionalToken>(
    tokenIndex: number,
    key: K,
    value: AdditionalToken[K]
  ): void => {
    setAdditionalTokens((prev) => prev.map((token, i) => {
      if (i !== tokenIndex) return token;
      return { ...token, [key]: value };
    }));
  };

  // Get filtered wallets for a specific token
  const getFilteredWallets = (tokenIndex: number): WalletType[] => {
    const token = additionalTokens[tokenIndex];
    const selectedPks = token?.wallets || [];
    let result = wallets.filter((w) => !selectedPks.includes(w.privateKey));
    if (walletSearch) {
      const search = walletSearch.toLowerCase();
      result = result.filter((w) =>
        w.address.toLowerCase().includes(search) || w.label?.toLowerCase().includes(search)
      );
    }
    return result.sort((a, b) =>
      (baseCurrencyBalances.get(b.address) || 0) - (baseCurrencyBalances.get(a.address) || 0)
    );
  };

  const getWallet = (pk: string): WalletType | undefined => wallets.find((w) => w.privateKey === pk);

  // Global wallet functions
  const getGlobalFilteredWallets = (): WalletType[] => {
    let result = wallets.filter((w) => !globalWallets.includes(w.privateKey));
    if (globalWalletSearch) {
      const search = globalWalletSearch.toLowerCase();
      result = result.filter((w) =>
        w.address.toLowerCase().includes(search) || w.label?.toLowerCase().includes(search)
      );
    }
    return result.sort((a, b) =>
      (baseCurrencyBalances.get(b.address) || 0) - (baseCurrencyBalances.get(a.address) || 0)
    );
  };

  const selectGlobalWallet = (privateKey: string): void => {
    if (globalWallets.includes(privateKey) || globalWallets.length >= maxWallets) return;
    setGlobalWallets((prev) => [...prev, privateKey]);
    setGlobalWalletAmounts((prev) => ({ ...prev, [privateKey]: "0.1" }));
  };

  const removeGlobalWallet = (privateKey: string): void => {
    setGlobalWallets((prev) => prev.filter((pk) => pk !== privateKey));
    setGlobalWalletAmounts((prev) => {
      const newAmounts = { ...prev };
      delete newAmounts[privateKey];
      return newAmounts;
    });
  };

  const updateGlobalWalletAmount = (privateKey: string, value: string): void => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setGlobalWalletAmounts((prev) => ({ ...prev, [privateKey]: value }));
  };

  const applyGlobalWalletsToAll = (): void => {
    setAdditionalTokens((prev) => prev.map((token) => ({
      ...token,
      useCustomWallets: true,
      wallets: [...globalWallets],
      walletAmounts: { ...globalWalletAmounts },
    })));
  };

  const clearAllCustomWallets = (): void => {
    setAdditionalTokens((prev) => prev.map((token) => ({
      ...token,
      useCustomWallets: false,
      wallets: undefined,
      walletAmounts: undefined,
    })));
  };

  // Get platform name
  const getPlatformName = (platform: PlatformType): string => {
    return PLATFORMS.find((p) => p.id === platform)?.name || platform;
  };

  return (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-app-primary-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
            <Layers size={18} className="color-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-app-primary font-mono">Additional Deploys</h2>
            <p className="text-[11px] text-app-secondary-60 font-mono">Configure per-token wallet settings</p>
          </div>
        </div>
        {additionalTokens.length > 0 && (
          <div className="px-2 py-1 rounded-lg bg-app-primary-color/20 border border-app-primary-color/30">
            <span className="text-xs font-mono font-bold color-primary">{additionalTokens.length}</span>
          </div>
        )}
      </div>

      {/* Add Deploy Buttons */}
      <div>
        <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
          Add Deploy
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map((p) => {
            const count = getTokenCountForPlatform(p.id);
            const canAdd = count < MAX_TOKENS_PER_PLATFORM;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => addDeploy(p.id)}
                disabled={!canAdd}
                className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                  canAdd
                    ? "border-app-primary-20 bg-app-tertiary/50 hover:border-app-primary-color hover:bg-app-primary-color/10"
                    : "border-app-primary-10 bg-app-tertiary/30 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-app-quaternary flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
                  {PlatformIcons[p.id]}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-xs font-bold font-mono text-app-primary truncate">{p.name}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {count > 0 && (
                    <span className="text-[10px] font-mono text-app-secondary-40">{count}/{MAX_TOKENS_PER_PLATFORM}</span>
                  )}
                  <Plus size={14} className={canAdd ? "text-app-primary-color" : "text-app-secondary-40"} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Custom Wallets */}
      {additionalTokens.length > 0 && (
        <div className="p-3 rounded-xl border border-app-primary-20 bg-app-tertiary/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
                <Users size={14} className="color-primary" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-app-primary">Custom Wallets for All</span>
                <p className="text-[10px] font-mono text-app-secondary-40">Override shared wallets for all deploys</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseGlobalCustomWallets(!useGlobalCustomWallets)}
              className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                useGlobalCustomWallets ? "bg-app-primary-color" : "bg-app-quaternary border border-app-primary-30"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                  useGlobalCustomWallets ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {useGlobalCustomWallets && (
            <div className="space-y-3 pt-2 border-t border-app-primary-20">
              {/* Selected Global Wallets */}
              {globalWallets.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-app-secondary-40 uppercase">Selected ({globalWallets.length})</span>
                    <button
                      type="button"
                      onClick={() => { setGlobalWallets([]); setGlobalWalletAmounts({}); }}
                      className="text-[10px] text-red-400 font-mono hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {globalWallets.map((pk, i) => {
                    const w = getWallet(pk);
                    const balance = w ? baseCurrencyBalances.get(w.address) || 0 : 0;
                    return (
                      <div key={pk} className="flex items-center gap-2 p-2 rounded-lg bg-app-quaternary/50 border border-app-primary-20">
                        <span className={`text-[10px] font-bold font-mono px-1 py-0.5 rounded ${
                          i === 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-app-tertiary text-app-secondary-40"
                        }`}>
                          {i === 0 ? "C" : i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-mono text-app-primary truncate block">
                            {w ? getWalletDisplayName(w) : "Unknown"}
                          </span>
                          <span className="text-[10px] text-app-secondary-40 font-mono">{balance.toFixed(3)} SOL</span>
                        </div>
                        <input
                          type="text"
                          value={globalWalletAmounts[pk] || ""}
                          onChange={(e) => updateGlobalWalletAmount(pk, e.target.value)}
                          placeholder="0.1"
                          className="w-16 bg-app-tertiary border border-app-primary-30 rounded px-2 py-1 text-xs text-app-primary text-right focus:border-app-primary-color focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => removeGlobalWallet(pk)}
                          className="p-1 rounded hover:bg-red-500/20 transition-colors"
                        >
                          <X size={12} className="text-red-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Wallets */}
              {globalWallets.length < maxWallets && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-app-secondary-40" />
                    <input
                      type="text"
                      value={globalWalletSearch}
                      onChange={(e) => setGlobalWalletSearch(e.target.value)}
                      placeholder="Search wallets..."
                      className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg pl-7 pr-3 py-1.5 text-xs text-app-primary placeholder:text-app-secondary-40 focus:border-app-primary-color focus:outline-none font-mono"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                    {getGlobalFilteredWallets().slice(0, 5).map((w) => {
                      const balance = baseCurrencyBalances.get(w.address) || 0;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => selectGlobalWallet(w.privateKey)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg bg-app-quaternary/30 border border-transparent hover:border-app-primary-color/30 transition-all text-left"
                        >
                          <Plus size={12} className="color-primary shrink-0" />
                          <span className="text-xs font-mono text-app-primary truncate flex-1">{getWalletDisplayName(w)}</span>
                          <span className="text-[10px] font-mono color-primary">{balance.toFixed(3)} SOL</span>
                        </button>
                      );
                    })}
                    {getGlobalFilteredWallets().length === 0 && (
                      <p className="text-center py-2 text-[10px] text-app-secondary-40 font-mono">No wallets available</p>
                    )}
                  </div>
                </div>
              )}

              {/* Apply/Clear Buttons */}
              {globalWallets.length > 0 && (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={applyGlobalWalletsToAll}
                    className="flex-1 py-2 rounded-lg bg-app-primary-color/20 border border-app-primary-color/30 text-xs font-mono font-bold color-primary hover:bg-app-primary-color/30 transition-colors"
                  >
                    Apply to All ({additionalTokens.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearAllCustomWallets}
                    className="px-3 py-2 rounded-lg bg-app-quaternary border border-app-primary-30 text-xs font-mono text-app-secondary-60 hover:border-app-primary-40 transition-colors"
                  >
                    Reset All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Deploy List */}
      {additionalTokens.length > 0 && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono uppercase tracking-wider">
            Deploy Queue ({additionalTokens.length})
          </label>
          <div className="space-y-2">
            {additionalTokens.map((token, index) => {
              const isExpanded = expandedIndex === index;
              const tokenWallets = token.wallets || [];
              const filteredWallets = getFilteredWallets(index);

              return (
                <div
                  key={index}
                  className={`rounded-xl border transition-all ${
                    isExpanded
                      ? "border-app-primary-color/40 bg-app-primary-color/5"
                      : "border-app-primary-20 bg-app-tertiary/50"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg bg-app-quaternary flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 shrink-0">
                      {PlatformIcons[token.platform]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-app-quaternary text-app-secondary-40">
                          #{index + 1}
                        </span>
                        <span className="text-sm font-bold font-mono text-app-primary truncate">
                          {getPlatformName(token.platform)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {token.useCustomWallets ? (
                          <span className="text-[10px] font-mono color-primary flex items-center gap-1">
                            <User size={10} /> {tokenWallets.length} custom wallet{tokenWallets.length !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-app-secondary-40 flex items-center gap-1">
                            <Users size={10} /> Using {sharedWallets.length} shared wallet{sharedWallets.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                        className="p-2 rounded-lg hover:bg-app-quaternary transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp size={14} className="color-primary" />
                        ) : (
                          <ChevronDown size={14} className="text-app-secondary-40" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDeploy(index)}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-app-primary-20 pt-3 mt-0">
                      {/* Platform-Specific Settings */}
                      {token.platform === "pumpfun" && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-app-quaternary/50">
                          <div className="flex items-center gap-2">
                            <Settings size={14} className="color-primary" />
                            <span className="text-xs font-mono text-app-primary">Mayhem Mode</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateTokenSetting(index, "pumpType", !token.pumpType)}
                            className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                              token.pumpType ? "bg-app-primary-color" : "bg-app-tertiary border border-app-primary-30"
                            }`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${token.pumpType ? "left-5" : "left-0.5"}`} />
                          </button>
                        </div>
                      )}

                      {token.platform === "bonk" && (
                        <div className="p-2.5 rounded-lg bg-app-quaternary/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Settings size={14} className="color-primary" />
                            <span className="text-xs font-mono text-app-primary">Token Category</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: "meme", label: "Meme" },
                              { value: "tech", label: "Tech" },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateTokenSetting(index, "bonkType", opt.value as "meme" | "tech")}
                                className={`p-2 rounded-lg border transition-all text-center ${
                                  token.bonkType === opt.value
                                    ? "border-app-primary-color/50 bg-app-primary-color/10"
                                    : "border-app-primary-20 bg-app-tertiary/50 hover:border-app-primary-40"
                                }`}
                              >
                                <span className={`text-xs font-bold font-mono ${token.bonkType === opt.value ? "color-primary" : "text-app-primary"}`}>
                                  {opt.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {token.platform === "meteoraDBC" && (
                        <div className="p-2.5 rounded-lg bg-app-quaternary/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Settings size={14} className="color-primary" />
                            <span className="text-xs font-mono text-app-primary">Pool Config Address</span>
                          </div>
                          <input
                            type="text"
                            value={token.meteoraDBCConfigAddress}
                            onChange={(e) => updateTokenSetting(index, "meteoraDBCConfigAddress", e.target.value)}
                            placeholder={METEORA_DBC_CONFIGS.standard}
                            className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
                          />
                        </div>
                      )}

                      {token.platform === "meteoraCPAMM" && (
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-lg bg-app-quaternary/50">
                            <div className="flex items-center gap-2 mb-2">
                              <Settings size={14} className="color-primary" />
                              <span className="text-xs font-mono text-app-primary">Pool Config Address</span>
                            </div>
                            <input
                              type="text"
                              value={token.meteoraCPAMMConfigAddress}
                              onChange={(e) => updateTokenSetting(index, "meteoraCPAMMConfigAddress", e.target.value)}
                              placeholder={METEORA_CPAMM_CONFIGS.standard}
                              className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-lg bg-app-quaternary/50">
                              <span className="text-[10px] text-app-secondary-40 font-mono uppercase mb-1 block">Initial Liquidity</span>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={token.meteoraCPAMMInitialLiquidity}
                                  onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && updateTokenSetting(index, "meteoraCPAMMInitialLiquidity", e.target.value)}
                                  placeholder="1"
                                  className="w-full bg-app-tertiary border border-app-primary-30 rounded px-2 py-1.5 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono pr-10"
                                />
                                <span className="absolute right-2 top-1.5 text-[10px] text-app-secondary-40 font-mono">SOL</span>
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-app-quaternary/50">
                              <span className="text-[10px] text-app-secondary-40 font-mono uppercase mb-1 block">Token % for Pool</span>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={token.meteoraCPAMMInitialTokenPercent}
                                  onChange={(e) => {
                                    if (/^\d*\.?\d*$/.test(e.target.value)) {
                                      const val = parseFloat(e.target.value);
                                      if (isNaN(val) || (val >= 0 && val <= 100)) updateTokenSetting(index, "meteoraCPAMMInitialTokenPercent", e.target.value);
                                    }
                                  }}
                                  placeholder="80"
                                  className="w-full bg-app-tertiary border border-app-primary-30 rounded px-2 py-1.5 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono pr-6"
                                />
                                <span className="absolute right-2 top-1.5 text-[10px] text-app-secondary-40 font-mono">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Wallet Mode Toggle */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-app-quaternary/50">
                        <div className="flex items-center gap-2">
                          <Wallet size={14} className="text-app-secondary-40" />
                          <span className="text-xs font-mono text-app-primary">Custom Wallets</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCustomWallets(index)}
                          className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                            token.useCustomWallets ? "bg-app-primary-color" : "bg-app-tertiary border border-app-primary-30"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                              token.useCustomWallets ? "left-5" : "left-0.5"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Custom Wallets Section */}
                      {token.useCustomWallets && (
                        <div className="space-y-2">
                          {/* Selected Wallets */}
                          {tokenWallets.length > 0 && (
                            <div className="space-y-1">
                              {tokenWallets.map((pk, wIndex) => {
                                const w = getWallet(pk);
                                const balance = w ? baseCurrencyBalances.get(w.address) || 0 : 0;
                                return (
                                  <div key={pk} className="flex items-center gap-2 p-2 rounded-lg bg-app-quaternary/50 border border-app-primary-20">
                                    <span className={`text-[10px] font-bold font-mono px-1 py-0.5 rounded ${
                                      wIndex === 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-app-tertiary text-app-secondary-40"
                                    }`}>
                                      {wIndex === 0 ? "C" : wIndex + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-mono text-app-primary truncate block">
                                        {w ? getWalletDisplayName(w) : "Unknown"}
                                      </span>
                                      <span className="text-[10px] text-app-secondary-40 font-mono">{balance.toFixed(3)} SOL</span>
                                    </div>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        value={token.walletAmounts?.[pk] || ""}
                                        onChange={(e) => updateWalletAmount(index, pk, e.target.value)}
                                        placeholder="0.1"
                                        className="w-16 bg-app-tertiary border border-app-primary-30 rounded px-2 py-1 text-xs text-app-primary text-right focus:border-app-primary-color focus:outline-none font-mono"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeWallet(index, pk)}
                                      className="p-1 rounded hover:bg-red-500/20 transition-colors"
                                    >
                                      <X size={12} className="text-red-400" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Add Wallets */}
                          {tokenWallets.length < maxWallets && (
                            <div className="space-y-2">
                              <div className="relative">
                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-app-secondary-40" />
                                <input
                                  type="text"
                                  value={walletSearch}
                                  onChange={(e) => setWalletSearch(e.target.value)}
                                  placeholder="Search wallets..."
                                  className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg pl-7 pr-3 py-1.5 text-xs text-app-primary placeholder:text-app-secondary-40 focus:border-app-primary-color focus:outline-none font-mono"
                                />
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                                {filteredWallets.slice(0, 5).map((w) => {
                                  const balance = baseCurrencyBalances.get(w.address) || 0;
                                  return (
                                    <button
                                      key={w.id}
                                      type="button"
                                      onClick={() => selectWallet(index, w.privateKey)}
                                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-app-quaternary/30 border border-transparent hover:border-app-primary-color/30 transition-all text-left"
                                    >
                                      <Plus size={12} className="color-primary shrink-0" />
                                      <span className="text-xs font-mono text-app-primary truncate flex-1">{getWalletDisplayName(w)}</span>
                                      <span className="text-[10px] font-mono color-primary">{balance.toFixed(3)} SOL</span>
                                    </button>
                                  );
                                })}
                                {filteredWallets.length === 0 && (
                                  <p className="text-center py-2 text-[10px] text-app-secondary-40 font-mono">No wallets available</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Shared Wallets Preview */}
                      {!token.useCustomWallets && sharedWallets.length > 0 && (
                        <div className="p-2 rounded-lg bg-app-quaternary/30 border border-app-primary-20">
                          <div className="flex items-center gap-2 mb-2">
                            <Users size={12} className="text-app-secondary-40" />
                            <span className="text-[10px] font-mono text-app-secondary-40 uppercase">Shared Wallets</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {sharedWallets.slice(0, 3).map((pk, i) => {
                              const w = getWallet(pk);
                              return (
                                <span key={pk} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-app-tertiary text-app-secondary-60">
                                  {i === 0 && "C: "}{w ? getWalletDisplayName(w).slice(0, 8) : pk.slice(0, 6)}...
                                </span>
                              );
                            })}
                            {sharedWallets.length > 3 && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-app-tertiary text-app-secondary-40">
                                +{sharedWallets.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {additionalTokens.length === 0 && (
        <div className="p-6 rounded-xl bg-app-tertiary/30 border border-dashed border-app-primary-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-app-quaternary flex items-center justify-center mx-auto mb-3">
            <Sparkles size={20} className="text-app-secondary-40" />
          </div>
          <p className="text-sm font-mono text-app-primary mb-1">No Deploys Added</p>
          <p className="text-xs font-mono text-app-secondary-40">Click a platform above to add deploys</p>
        </div>
      )}

      {/* Info Card */}
      {additionalTokens.length > 0 && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-app-primary-color/5 to-transparent border border-app-primary-color/20">
          <div className="flex items-start gap-2">
            <Layers size={14} className="color-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-app-primary font-mono font-medium">
                {additionalTokens.length} Deploy{additionalTokens.length !== 1 ? "s" : ""} Queued
              </p>
              <p className="text-[10px] text-app-secondary-60 font-mono mt-0.5">
                {additionalTokens.filter((t) => t.useCustomWallets).length > 0
                  ? `${additionalTokens.filter((t) => t.useCustomWallets).length} with custom wallets`
                  : "All using shared wallets from Wallets tab"
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SuccessModal component (inlined) ---

interface SuccessModalProps {
  mintAddress: string;
  platform: PlatformType;
  onReset: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  mintAddress,
  platform,
  onReset,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { metadata: tokenMeta } = useTokenMetadata(mintAddress);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(mintAddress);
    setCopied(true);
    showToast("Copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-app-secondary border border-app-primary-30 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in-down">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 flex items-center justify-center">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-center text-app-primary font-mono mb-2">TOKEN DEPLOYED</h2>
        <p className="text-xs text-center text-app-secondary-60 font-mono mb-6">
          Successfully launched on {PLATFORMS.find((p) => p.id === platform)?.name}
        </p>
        <div className="bg-app-tertiary/50 rounded-xl p-4 mb-6 border border-app-primary-20">
          {tokenMeta?.name && (
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-app-primary-10">
              {tokenMeta.image && (
                <img src={tokenMeta.image} alt={tokenMeta.symbol} className="w-10 h-10 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div className="min-w-0">
                <div className="font-bold text-app-primary truncate">{tokenMeta.name}</div>
                <div className="text-xs text-app-secondary-60 font-mono">{tokenMeta.symbol}</div>
              </div>
            </div>
          )}
          <p className="text-[10px] text-app-secondary-40 font-mono uppercase tracking-wider mb-2">Token Address</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-app-primary font-mono break-all">{mintAddress}</code>
            <button onClick={() => void handleCopy()} className="p-2 rounded-lg bg-app-quaternary hover:bg-app-primary-color/20 transition-colors">
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-app-secondary-60" />}
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onReset} className="flex-1 py-3 rounded-xl bg-app-tertiary text-app-primary font-mono font-medium hover:bg-app-quaternary transition-colors border border-app-primary-20">
            Deploy Another
          </button>
          <button onClick={() => navigate(`/tokens/${mintAddress}`)} className="flex-1 py-3 rounded-xl bg-app-primary-color text-black font-mono font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-app-primary-color/30 transition-all">
            View Token <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
