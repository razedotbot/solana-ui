import React, { useMemo, useState, useEffect } from "react";
import {
  Wallet,
  Search,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  AlertTriangle,
  Save,
  FolderOpen,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { getWalletDisplayName } from "../../utils/wallet";
import type { WalletType } from "../../utils/types";
import { useToast } from "../Notifications";

interface WalletPreset {
  id: string;
  name: string;
  wallets: string[]; // private keys
  amounts: Record<string, string>;
  createdAt: number;
}

const PRESETS_STORAGE_KEY = "deploy_wallet_presets";

interface WalletsTabProps {
  wallets: WalletType[];
  selectedWallets: string[];
  setSelectedWallets: React.Dispatch<React.SetStateAction<string[]>>;
  walletAmounts: Record<string, string>;
  setWalletAmounts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  baseCurrencyBalances: Map<string, number>;
  maxWallets: number;
}

export const WalletsTab: React.FC<WalletsTabProps> = ({
  wallets,
  selectedWallets,
  setSelectedWallets,
  walletAmounts,
  setWalletAmounts,
  baseCurrencyBalances,
  maxWallets,
}) => {
  const { showToast } = useToast();
  const [walletSearch, setWalletSearch] = useState("");
  const [walletSort, setWalletSort] = useState<"balance" | "name">("balance");

  // Presets state
  const [presets, setPresets] = useState<WalletPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [showPresetPanel, setShowPresetPanel] = useState(false);

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WalletPreset[];
        if (Array.isArray(parsed)) {
          setPresets(parsed);
        }
      }
    } catch {
      // Invalid JSON, ignore
    }
  }, []);

  // Save presets to localStorage
  const savePresetsToStorage = (newPresets: WalletPreset[]): void => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
      setPresets(newPresets);
    } catch {
      showToast("Failed to save presets", "error");
    }
  };

  // Save current selection as preset
  const savePreset = (): void => {
    if (!presetName.trim()) {
      showToast("Enter a preset name", "error");
      return;
    }
    if (selectedWallets.length === 0) {
      showToast("Select at least one wallet", "error");
      return;
    }
    const newPreset: WalletPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      wallets: [...selectedWallets],
      amounts: { ...walletAmounts },
      createdAt: Date.now(),
    };
    savePresetsToStorage([newPreset, ...presets]);
    setPresetName("");
    showToast(`Saved preset "${newPreset.name}"`, "success");
  };

  // Load a preset
  const loadPreset = (preset: WalletPreset): void => {
    // Filter wallets that still exist
    const validWallets = preset.wallets.filter((pk) =>
      wallets.some((w) => w.privateKey === pk)
    );
    if (validWallets.length === 0) {
      showToast("No valid wallets in preset", "error");
      return;
    }
    setSelectedWallets(validWallets);
    const amounts: Record<string, string> = {};
    validWallets.forEach((pk) => {
      amounts[pk] = preset.amounts[pk] || "0.1";
    });
    setWalletAmounts(amounts);
    setShowPresetPanel(false);
    showToast(`Loaded "${preset.name}"`, "success");
  };

  // Delete a preset
  const deletePreset = (id: string): void => {
    const newPresets = presets.filter((p) => p.id !== id);
    savePresetsToStorage(newPresets);
    showToast("Preset deleted", "success");
  };

  // Export presets to JSON file
  const exportPresets = (): void => {
    if (presets.length === 0) {
      showToast("No presets to export", "error");
      return;
    }
    const data = JSON.stringify(presets, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Presets exported", "success");
  };

  // Import presets from JSON file
  const importPresets = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as WalletPreset[];
        if (!Array.isArray(imported)) throw new Error("Invalid format");
        // Validate and merge with existing presets
        const validPresets = imported.filter(
          (p) => p.id && p.name && Array.isArray(p.wallets) && p.amounts
        );
        const merged = [...validPresets, ...presets];
        // Remove duplicates by id
        const unique = merged.filter(
          (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
        );
        savePresetsToStorage(unique);
        showToast(`Imported ${validPresets.length} presets`, "success");
      } catch {
        showToast("Invalid preset file", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filteredWallets = useMemo(() => {
    let result = wallets.filter((w) => !selectedWallets.includes(w.privateKey));
    if (walletSearch) {
      const search = walletSearch.toLowerCase();
      result = result.filter((w) =>
        w.address.toLowerCase().includes(search) || w.label?.toLowerCase().includes(search)
      );
    }
    return result.sort((a, b) => {
      if (walletSort === "balance") {
        return (baseCurrencyBalances.get(b.address) || 0) - (baseCurrencyBalances.get(a.address) || 0);
      }
      return (a.label || a.address).localeCompare(b.label || b.address);
    });
  }, [wallets, selectedWallets, walletSearch, walletSort, baseCurrencyBalances]);

  const selectWallet = (privateKey: string): void => {
    if (selectedWallets.includes(privateKey)) return;
    if (selectedWallets.length >= maxWallets) {
      showToast(`Maximum ${maxWallets} wallets`, "error");
      return;
    }
    setSelectedWallets((prev) => [...prev, privateKey]);
    if (!walletAmounts[privateKey]) {
      setWalletAmounts((prev) => ({ ...prev, [privateKey]: "0.1" }));
    }
  };

  const removeWallet = (privateKey: string): void => {
    setSelectedWallets((prev) => prev.filter((pk) => pk !== privateKey));
  };

  const moveWallet = (index: number, direction: "up" | "down"): void => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedWallets.length) return;
    const newOrder = [...selectedWallets];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setSelectedWallets(newOrder);
  };

  const updateAmount = (privateKey: string, value: string): void => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setWalletAmounts((prev) => ({ ...prev, [privateKey]: value }));
    }
  };

  const setAllAmounts = (value: string): void => {
    const newAmounts: Record<string, string> = {};
    selectedWallets.forEach((pk) => { newAmounts[pk] = value; });
    setWalletAmounts(newAmounts);
  };

  const getWallet = (pk: string): WalletType | undefined => wallets.find((w) => w.privateKey === pk);

  return (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-app-primary-20">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
          <Wallet size={18} className="color-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-app-primary font-mono">Wallet Selection</h2>
          <p className="text-[11px] text-app-secondary-60 font-mono">
            Select wallets for initial buys ({selectedWallets.length}/{maxWallets})
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPresetPanel(!showPresetPanel)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-mono ${
            showPresetPanel
              ? "bg-app-primary-color/10 border-app-primary-color/30 color-primary"
              : "bg-app-tertiary/50 border-app-primary-20 text-app-secondary-60 hover:border-app-primary-40"
          }`}
        >
          <FolderOpen size={14} />
          Presets
          <ChevronDown size={12} className={`transition-transform ${showPresetPanel ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Presets Panel */}
      {showPresetPanel && (
        <div className="p-4 rounded-xl border border-app-primary-color/20 bg-gradient-to-br from-app-primary-color/5 to-transparent space-y-4 animate-fade-in-down">
          {/* Save Preset */}
          <div className="space-y-2">
            <label className="text-[10px] text-app-secondary-60 font-mono uppercase tracking-wider">
              Save Current Selection
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name..."
                className="flex-1 bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary placeholder:text-app-secondary-40 focus:border-app-primary-color focus:outline-none font-mono"
                onKeyDown={(e) => e.key === "Enter" && savePreset()}
              />
              <button
                type="button"
                onClick={savePreset}
                disabled={selectedWallets.length === 0}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                  selectedWallets.length > 0
                    ? "bg-app-primary-color/20 border border-app-primary-color/30 color-primary hover:bg-app-primary-color/30"
                    : "bg-app-tertiary border border-app-primary-20 text-app-secondary-40 cursor-not-allowed"
                }`}
              >
                <Save size={14} />
                Save
              </button>
            </div>
          </div>

          {/* Saved Presets List */}
          {presets.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] text-app-secondary-60 font-mono uppercase tracking-wider">
                Saved Presets ({presets.length})
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                {presets.map((preset) => {
                  const validCount = preset.wallets.filter((pk) =>
                    wallets.some((w) => w.privateKey === pk)
                  ).length;
                  return (
                    <div
                      key={preset.id}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-app-quaternary/50 border border-app-primary-20 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-app-primary font-mono truncate">
                          {preset.name}
                        </p>
                        <p className="text-[10px] text-app-secondary-40 font-mono">
                          {validCount}/{preset.wallets.length} wallets
                          {validCount < preset.wallets.length && (
                            <span className="text-yellow-400 ml-1">(some missing)</span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadPreset(preset)}
                        className="px-2.5 py-1.5 rounded-lg bg-app-primary-color/10 border border-app-primary-color/30 text-[10px] color-primary font-mono font-bold hover:bg-app-primary-color/20 transition-colors"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePreset(preset.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 transition-colors opacity-50 group-hover:opacity-100"
                      >
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Import/Export */}
          <div className="flex gap-2 pt-2 border-t border-app-primary-20">
            <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-app-tertiary/50 border border-app-primary-20 text-xs font-mono text-app-secondary-60 hover:border-app-primary-40 transition-colors cursor-pointer">
              <FolderOpen size={14} />
              Import
              <input
                type="file"
                accept=".json"
                onChange={importPresets}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={exportPresets}
              disabled={presets.length === 0}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                presets.length > 0
                  ? "bg-app-tertiary/50 border border-app-primary-20 text-app-secondary-60 hover:border-app-primary-40"
                  : "bg-app-tertiary/30 border border-app-primary-10 text-app-secondary-40 cursor-not-allowed"
              }`}
            >
              <Save size={14} />
              Export
            </button>
          </div>
        </div>
      )}

      {/* Selected Wallets */}
      {selectedWallets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono uppercase tracking-wider">
              Selected Wallets
            </label>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-app-secondary-40 font-mono">Set all:</span>
              <input
                type="text"
                placeholder="0.1"
                className="w-14 bg-app-quaternary border border-app-primary-30 rounded px-2 py-1 text-xs text-app-primary text-center focus:border-app-primary-color focus:outline-none font-mono"
                onChange={(e) => setAllAmounts(e.target.value)}
              />
              <button
                type="button"
                onClick={() => { setSelectedWallets([]); setWalletAmounts({}); }}
                className="text-[10px] text-red-400 font-mono hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {selectedWallets.map((pk, i) => {
              const w = getWallet(pk);
              const balance = w ? baseCurrencyBalances.get(w.address) || 0 : 0;
              return (
                <div key={pk} className="flex items-center gap-2 p-2.5 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => moveWallet(i, "up")} disabled={i === 0} className={`p-0.5 rounded ${i === 0 ? "opacity-30" : "hover:bg-app-quaternary"}`}>
                      <ArrowUp size={10} className="text-app-secondary-40" />
                    </button>
                    <button type="button" onClick={() => moveWallet(i, "down")} disabled={i === selectedWallets.length - 1} className={`p-0.5 rounded ${i === selectedWallets.length - 1 ? "opacity-30" : "hover:bg-app-quaternary"}`}>
                      <ArrowDown size={10} className="text-app-secondary-40" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${i === 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-app-quaternary text-app-secondary-40"}`}>
                        {i === 0 ? "C" : i + 1}
                      </span>
                      <span className="text-xs font-medium text-app-primary font-mono truncate">{w ? getWalletDisplayName(w) : "Unknown"}</span>
                    </div>
                    <span className="text-[10px] text-app-secondary-40 font-mono">{balance.toFixed(4)} SOL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={walletAmounts[pk] || ""}
                        onChange={(e) => updateAmount(pk, e.target.value)}
                        placeholder="0.1"
                        className="w-16 bg-app-quaternary border border-app-primary-30 rounded px-2 py-1.5 text-xs text-app-primary text-right focus:border-app-primary-color focus:outline-none font-mono"
                      />
                    </div>
                    <button type="button" onClick={() => removeWallet(pk)} className="p-1.5 rounded hover:bg-red-500/20 transition-colors">
                      <X size={12} className="text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Wallets */}
      {selectedWallets.length < maxWallets && (
        <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-app-secondary-40" />
              <input
                type="text"
                value={walletSearch}
                onChange={(e) => setWalletSearch(e.target.value)}
                placeholder="Search wallets..."
                className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg pl-8 pr-3 py-2 text-xs text-app-primary placeholder:text-app-secondary-40 focus:border-app-primary-color focus:outline-none font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => setWalletSort((s) => s === "balance" ? "name" : "balance")}
              className="px-2.5 py-2 rounded-lg bg-app-quaternary border border-app-primary-30 text-[10px] text-app-secondary-60 hover:border-app-primary-40 transition-colors font-mono"
            >
              {walletSort === "balance" ? "Balance" : "Name"}
            </button>
            <button
              type="button"
              onClick={() => {
                const toSelect = filteredWallets.slice(0, maxWallets - selectedWallets.length);
                setSelectedWallets((prev) => [...prev, ...toSelect.map((w) => w.privateKey)]);
                const amounts: Record<string, string> = { ...walletAmounts };
                toSelect.forEach((w) => { if (!amounts[w.privateKey]) amounts[w.privateKey] = "0.1"; });
                setWalletAmounts(amounts);
              }}
              className="px-2.5 py-2 rounded-lg bg-app-primary-color/10 border border-app-primary-color/30 text-[10px] color-primary hover:bg-app-primary-color/20 transition-colors font-mono"
            >
              Add All
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1 custom-scrollbar">
            {filteredWallets.map((w) => {
              const balance = baseCurrencyBalances.get(w.address) || 0;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => selectWallet(w.privateKey)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-app-quaternary/30 border border-transparent hover:border-app-primary-color/30 hover:bg-app-quaternary transition-all text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-app-tertiary flex items-center justify-center group-hover:bg-app-primary-color/20 transition-colors">
                    <Plus size={12} className="text-app-secondary-40 group-hover:color-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-app-primary font-mono truncate">{getWalletDisplayName(w)}</p>
                    <p className="text-[10px] text-app-secondary-40 font-mono">{w.address.slice(0, 6)}...{w.address.slice(-4)}</p>
                  </div>
                  <span className="text-xs font-medium color-primary font-mono">{balance.toFixed(4)} SOL</span>
                </button>
              );
            })}
            {filteredWallets.length === 0 && (
              <p className="text-center py-6 text-xs text-app-secondary-40 font-mono">No wallets found</p>
            )}
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-app-primary-color/5 to-transparent border border-app-primary-color/20">
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} className="color-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-app-primary font-mono font-medium">Wallet Order Matters</p>
            <p className="text-[10px] text-app-secondary-60 font-mono mt-0.5">
              First wallet is the token creator. Reorder using arrows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
