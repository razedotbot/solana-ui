import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Globe,
  Save,
  Server,
  RefreshCw,
  Settings,
  ChevronRight,
  Check,
  Network,
  Layers,
  Radio,
  Database,
  Download,
  Upload,
  AlertTriangle,
  Shield,
} from "lucide-react";
import Cookies from "js-cookie";
import { useAppContext } from "../contexts/AppContext";
import { useToast } from "../components/Notifications";
import { saveConfigToCookies, STORAGE_KEYS } from "../utils/storage";
import { HorizontalHeader } from "../components/Header";
import { PageBackground } from "../components/Styles";
import type { ServerInfo } from "../utils/types";
import { RPCEndpointManager } from "../components/RPCEndpointManager";
import { createDefaultEndpoints, type RPCEndpoint } from "../utils/rpcManager";
import { OnboardingTutorial } from "../components/OnboardingTutorial";

type SettingsTab =
  | "network"
  | "trading"
  | "configuration";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: "network",
    label: "Network",
    icon: <Globe size={18} />,
    description: "RPC Endpoints",
  },
  {
    id: "trading",
    label: "Trading",
    icon: <Server size={18} />,
    description: "Server & Execution",
  },
  {
    id: "configuration",
    label: "Config",
    icon: <Database size={18} />,
    description: "Import & Export",
  },
];

// Data categories available for export/import
interface DataCategory {
  id: string;
  label: string;
  description: string;
  sensitive: boolean;
  source: "localStorage" | "cookie";
  key: string;
  cookieKey?: string; // for cookie-based items
}

const DATA_CATEGORIES: DataCategory[] = [
  {
    id: "config",
    label: "App Configuration",
    description: "RPC endpoints, bundle mode, delays, slippage",
    sensitive: false,
    source: "cookie",
    key: STORAGE_KEYS.config,
    cookieKey: STORAGE_KEYS.config,
  },
  {
    id: "quickBuy",
    label: "Quick Buy Preferences",
    description: "Quick buy button amounts and settings",
    sensitive: false,
    source: "cookie",
    key: STORAGE_KEYS.quickBuyPreferences,
    cookieKey: STORAGE_KEYS.quickBuyPreferences,
  },
  {
    id: "categoryTradeSettings",
    label: "Quickmode Settings",
    description: "Quickmode buy and sell settings",
    sensitive: false,
    source: "localStorage",
    key: "categoryQuickTradeSettings",
  },
  {
    id: "walletGroups",
    label: "Wallet Groups",
    description: "Custom wallet group names and ordering",
    sensitive: true,
    source: "localStorage",
    key: STORAGE_KEYS.walletGroups,
  },
  {
    id: "deployPresets",
    label: "Deploy Wallet Presets",
    description: "Saved wallet presets for token deployment",
    sensitive: true,
    source: "localStorage",
    key: "deploy_wallet_presets",
  },
  {
    id: "recentTokens",
    label: "Recent Tokens",
    description: "Recently viewed token addresses",
    sensitive: false,
    source: "localStorage",
    key: "raze_recent_tokens",
  },
  {
    id: "tradeHistory",
    label: "Trade History",
    description: "Local trade history log",
    sensitive: false,
    source: "localStorage",
    key: "raze_trade_history",
  },
  {
    id: "splitSizes",
    label: "Panel Sizes",
    description: "Split panel layout dimensions",
    sensitive: false,
    source: "cookie",
    key: STORAGE_KEYS.splitSizes,
    cookieKey: STORAGE_KEYS.splitSizes,
  },
  {
    id: "encryptedWallets",
    label: "Wallets (Encrypted)",
    description: "Encrypted wallet private keys — handle with care",
    sensitive: true,
    source: "localStorage",
    key: STORAGE_KEYS.encryptedWallets,
  },
  {
    id: "encryptedMasterWallets",
    label: "Master Wallets (Encrypted)",
    description: "Encrypted HD master wallet keys — handle with care",
    sensitive: true,
    source: "localStorage",
    key: STORAGE_KEYS.encryptedMasterWallets,
  },
];

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const { config, setConfig } = useAppContext();

  const [activeTab, setActiveTab] = useState<SettingsTab>("network");
  const [currentRegion, setCurrentRegion] = useState<string>("US");
  const [availableServers, setAvailableServers] = useState<ServerInfo[]>([]);
  const [isChangingServer, setIsChangingServer] = useState(false);
  const [isLoadingServers, setIsLoadingServers] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  // Configuration tab state
  const [exportSelection, setExportSelection] = useState<Set<string>>(
    () => new Set(DATA_CATEGORIES.filter((c) => !c.sensitive).map((c) => c.id)),
  );
  const [importData, setImportData] = useState<Record<string, unknown> | null>(null);
  const [importSelection, setImportSelection] = useState<Set<string>>(new Set());
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfigChange = (
    key: keyof typeof config,
    value: string,
  ): void => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
  };

  const handleSaveAndClose = (): void => {
    saveConfigToCookies(config);
    showToast("Settings saved successfully", "success");
  };

  const updateServerData = useCallback((): void => {
    if (window.serverRegion) {
      setCurrentRegion(window.serverRegion);
    }
    if (window.availableServers && window.availableServers.length > 0) {
      setAvailableServers(window.availableServers);
      setIsLoadingServers(false);
    }
  }, []);

  useEffect(() => {
    updateServerData();
    const handleServerUpdate = (): void => updateServerData();
    window.addEventListener("serverChanged", handleServerUpdate);
    return (): void =>
      window.removeEventListener("serverChanged", handleServerUpdate);
  }, [updateServerData]);

  const handleServerSwitch = async (serverId: string): Promise<void> => {
    if (!window.switchServer) return;
    setIsChangingServer(true);
    try {
      const success = await window.switchServer(serverId);
      if (success) {
        const server = availableServers.find((s) => s.id === serverId);
        if (server) {
          setCurrentRegion(server.region);
          showToast(`Switched to ${server.name} (${server.region})`, "success");
        }
      } else {
        showToast("Failed to switch trading server", "error");
      }
    } catch {
      showToast("Error switching trading server", "error");
    } finally {
      setIsChangingServer(false);
    }
  };

  const getPingColor = (ping?: number): string => {
    if (!ping || ping === Infinity) return "text-app-secondary-40";
    if (ping < 50) return "text-ping-good";
    if (ping < 100) return "text-ping-medium";
    return "text-ping-poor";
  };

  const getPingBg = (ping?: number): string => {
    if (!ping || ping === Infinity) return "bg-app-primary-10";
    if (ping < 50) return "bg-ping-good-10";
    if (ping < 100) return "bg-ping-medium-20";
    return "bg-ping-poor-10";
  };

  // ========== CONFIGURATION HELPERS ==========

  const toggleExportItem = (id: string): void => {
    setExportSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleImportItem = (id: string): void => {
    setImportSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const readCategoryValue = (cat: DataCategory): string | null => {
    if (cat.source === "cookie" && cat.cookieKey) {
      return Cookies.get(cat.cookieKey) ?? null;
    }
    return localStorage.getItem(cat.key);
  };

  const writeCategoryValue = (cat: DataCategory, value: string): void => {
    if (cat.source === "cookie" && cat.cookieKey) {
      Cookies.set(cat.cookieKey, value, { expires: 365 });
    } else {
      localStorage.setItem(cat.key, value);
    }
  };

  const handleExport = (): void => {
    if (exportSelection.size === 0) {
      showToast("Select at least one category to export", "error");
      return;
    }

    const exportPayload: Record<string, unknown> = {
      _meta: {
        exportedAt: new Date().toISOString(),
        version: 1,
        categories: Array.from(exportSelection),
      },
    };

    for (const cat of DATA_CATEGORIES) {
      if (!exportSelection.has(cat.id)) continue;
      const raw = readCategoryValue(cat);
      if (raw === null) continue;

      // Try to parse JSON, otherwise store as string
      try {
        exportPayload[cat.id] = JSON.parse(raw);
      } catch {
        exportPayload[cat.id] = raw;
      }
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raze-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Exported ${exportSelection.size} categories`, "success");
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event): void => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as Record<string, unknown>;
        if (!parsed["_meta"]) {
          showToast("Invalid config file — missing metadata", "error");
          return;
        }
        setImportData(parsed);
        // Auto-select all available categories from the file
        const available = DATA_CATEGORIES.filter((cat) => cat.id in parsed).map((cat) => cat.id);
        setImportSelection(new Set(available));
      } catch {
        showToast("Failed to parse config file", "error");
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleImportApply = (): void => {
    if (!importData || importSelection.size === 0) {
      showToast("Select at least one category to import", "error");
      return;
    }

    let imported = 0;
    for (const cat of DATA_CATEGORIES) {
      if (!importSelection.has(cat.id)) continue;
      const value = importData[cat.id];
      if (value === undefined) continue;

      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      writeCategoryValue(cat, serialized);
      imported++;
    }

    // Reload config into app state if config was imported
    if (importSelection.has("config")) {
      const raw = Cookies.get(STORAGE_KEYS.config);
      if (raw) {
        try {
          setConfig(JSON.parse(raw) as typeof config);
        } catch {
          // ignore parse error
        }
      }
    }

    showToast(`Imported ${imported} categories — reload for full effect`, "success");
    setImportData(null);
    setImportFileName("");
    setImportSelection(new Set());
  };

  // ========== TAB CONTENT RENDERERS ==========

  const renderNetworkTab = (): JSX.Element => (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-app-primary-20">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
          <Network size={24} className="color-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-app-primary font-mono">
            RPC Configuration
          </h2>
          <p className="text-xs text-app-secondary-60 font-mono">
            Manage RPC endpoints with weighted load balancing
          </p>
        </div>
      </div>

      {/* RPC Manager */}
      <div className="bg-app-tertiary/50 rounded-xl border border-app-primary-20 p-4">
        <RPCEndpointManager
          endpoints={
            config.rpcEndpoints
              ? (JSON.parse(config.rpcEndpoints) as RPCEndpoint[])
              : createDefaultEndpoints()
          }
          onChange={(endpoints) =>
            handleConfigChange("rpcEndpoints", JSON.stringify(endpoints))
          }
        />
      </div>
    </div>
  );

  const renderTradingTab = (): JSX.Element => (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-app-primary-20">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
          <Server size={24} className="color-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-app-primary font-mono">
            Trading Configuration
          </h2>
          <p className="text-xs text-app-secondary-60 font-mono">
            Server connection & execution settings
          </p>
        </div>
      </div>

      {/* Regional Server Selection */}
      <div className="p-5 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
        <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
          <Radio size={14} className="color-primary" />
          Regional Server Selection
        </label>

        {/* Server List */}
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
          {isLoadingServers ? (
            <div className="p-6 text-center">
              <RefreshCw
                size={24}
                className="animate-spin color-primary mx-auto mb-2"
              />
              <span className="text-xs text-app-secondary-60 font-mono">
                Checking server availability...
              </span>
            </div>
          ) : availableServers.length > 0 ? (
            availableServers.map((server) => (
              <button
                key={server.id}
                type="button"
                onClick={() => void handleServerSwitch(server.id)}
                disabled={isChangingServer}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 group ${
                  server.region === currentRegion
                    ? "bg-app-primary-color/10 border-2 border-app-primary-color/50 shadow-[0_0_15px_rgba(2,179,109,0.15)]"
                    : "bg-app-quaternary/50 border border-app-primary-20 hover:border-app-primary-40 hover:bg-app-quaternary"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{server.flag}</span>
                  <div>
                    <div
                      className={`text-sm font-mono font-bold ${server.region === currentRegion ? "color-primary" : "text-app-primary"}`}
                    >
                      {server.name}
                    </div>
                    <div className="text-[10px] font-mono text-app-secondary-40 truncate max-w-[180px]">
                      {server.url}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {server.ping && server.ping < Infinity && (
                    <div
                      className={`text-xs font-mono px-2 py-1 rounded-full border ${getPingBg(server.ping)} ${getPingColor(server.ping)} border-current/20`}
                    >
                      {Math.round(server.ping)}ms
                    </div>
                  )}
                  {server.region === currentRegion && (
                    <div className="w-6 h-6 rounded-full bg-app-primary-color flex items-center justify-center">
                      <Check size={14} className="text-black" />
                    </div>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-6 text-center text-error font-mono text-sm">
              No servers reachable. Check your connection.
            </div>
          )}
        </div>
      </div>

      {/* Bundle Strategy */}
      <div className="p-5 rounded-xl bg-app-tertiary/50 border border-app-primary-20 space-y-3">
        <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono uppercase tracking-wider">
          <Layers size={14} className="color-primary" />
          Bundle Strategy
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              value: "single",
              label: "Single",
              icon: "🔄",
              desc: "Sequential",
              delayKey: "singleDelay" as const,
              delayLabel: "Delay between transactions",
              delayDefault: "200",
              delayMin: 50,
              delayMax: 5000,
              delayStep: 50,
            },
            {
              value: "batch",
              label: "Batch",
              icon: "📦",
              desc: "5 per block",
              delayKey: "batchDelay" as const,
              delayLabel: "Delay between batches",
              delayDefault: "1000",
              delayMin: 100,
              delayMax: 10000,
              delayStep: 100,
            },
            {
              value: "all-in-one",
              label: "All-In-One",
              icon: "🚀",
              desc: "Max speed",
              delayKey: null,
              delayLabel: null,
              delayDefault: null,
              delayMin: 0,
              delayMax: 0,
              delayStep: 0,
            },
          ].map((opt) => {
            const isActive = config.bundleMode === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => handleConfigChange("bundleMode", opt.value)}
                className={`relative group rounded-xl border-2 transition-all duration-300 text-left overflow-hidden cursor-pointer ${
                  isActive
                    ? "border-app-primary-color bg-app-primary-color/10 shadow-[0_0_20px_rgba(2,179,109,0.15)]"
                    : "border-app-primary-20 bg-app-tertiary/50 hover:border-app-primary-40 hover:bg-app-tertiary"
                }`}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-app-primary-color/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{opt.icon}</span>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-app-primary-color flex items-center justify-center">
                        <Check size={12} className="text-black" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div
                        className={`text-sm font-bold font-mono ${isActive ? "color-primary" : "text-app-primary"}`}
                      >
                        {opt.label}
                      </div>
                      <div className="text-[10px] font-mono text-app-secondary-40 mt-1">
                        {opt.desc}
                      </div>
                    </div>
                    {isActive && opt.delayKey && (
                      <div
                        className="relative flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          min={opt.delayMin}
                          max={opt.delayMax}
                          step={opt.delayStep}
                          value={config[opt.delayKey] || opt.delayDefault}
                          onChange={(e) =>
                            handleConfigChange(opt.delayKey, e.target.value)
                          }
                          className="w-[80px] bg-app-tertiary border border-app-primary-30 rounded-lg px-2 py-1.5 text-xs text-app-primary text-right pr-7 focus:border-app-primary focus:ring-1 focus:ring-primary-50 focus:outline-none font-mono transition-all"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-app-secondary-40 font-mono pointer-events-none">
                          ms
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderConfigurationTab = (): JSX.Element => {
    const nonSensitive = DATA_CATEGORIES.filter((c) => !c.sensitive);
    const sensitive = DATA_CATEGORIES.filter((c) => c.sensitive);
    const allExportSelected = DATA_CATEGORIES.every((c) => exportSelection.has(c.id));
    const noneExportSelected = exportSelection.size === 0;

    const CategoryCard = ({ cat, selected, disabled, accent, onToggle }: {
      cat: DataCategory;
      selected: boolean;
      disabled?: boolean;
      accent: "green" | "yellow";
      onToggle: () => void;
    }): JSX.Element => (
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`group relative flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
          disabled
            ? "opacity-30 cursor-not-allowed"
            : selected
              ? accent === "yellow"
                ? "bg-yellow-500/10 border border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.08)]"
                : "bg-app-primary-color/10 border border-app-primary-color/40 shadow-[0_0_12px_rgba(2,179,109,0.08)]"
              : "bg-app-quaternary/40 border border-app-primary-15 hover:border-app-primary-30 hover:bg-app-quaternary/70"
        }`}
      >
        <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          selected
            ? accent === "yellow"
              ? "bg-yellow-500 border-yellow-500"
              : "bg-app-primary-color border-app-primary-color"
            : "border-app-primary-30 group-hover:border-app-primary-50"
        }`}>
          {selected && <Check size={11} className="text-black" strokeWidth={3} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono font-semibold text-app-primary flex items-center gap-1.5">
            {cat.sensitive && <Shield size={10} className="text-yellow-400 flex-shrink-0" />}
            {cat.label}
            {disabled && <span className="text-[9px] font-normal text-app-secondary-30 ml-1">empty</span>}
          </div>
          <div className={`text-[10px] font-mono mt-0.5 leading-snug ${
            accent === "yellow" && selected ? "text-yellow-400/60" : "text-app-secondary-40"
          }`}>
            {cat.description}
          </div>
        </div>
      </button>
    );

    return (
      <div className="space-y-6 animate-fade-in-down">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 border-b border-app-primary-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
              <Database size={24} className="color-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-app-primary font-mono">
                Import & Export
              </h2>
              <p className="text-xs text-app-secondary-60 font-mono">
                Backup and restore your app data
              </p>
            </div>
          </div>

          {/* Import button in header */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-dashed border-app-primary-20 hover:border-app-primary-40 bg-app-quaternary/20 hover:bg-app-primary-color/5 transition-all duration-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-app-primary-color/10 border border-app-primary-20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Upload size={15} className="color-primary" />
            </div>
            <div className="text-left">
              <div className="text-xs font-mono font-semibold text-app-primary">Import</div>
              <div className="text-[10px] font-mono text-app-secondary-40">Select .json backup</div>
            </div>
          </button>
        </div>

        {/* ===== EXPORT ===== */}
        <div className="rounded-xl bg-app-tertiary/50 border border-app-primary-20 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-app-primary-color/5 border-b border-app-primary-20">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-app-primary-color/15 flex items-center justify-center">
                <Download size={14} className="color-primary" />
              </div>
              <span className="text-sm font-bold font-mono text-app-primary">Export</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (allExportSelected) setExportSelection(new Set());
                else setExportSelection(new Set(DATA_CATEGORIES.map((c) => c.id)));
              }}
              className="text-[10px] font-mono font-medium px-2.5 py-1 rounded-lg color-primary hover:bg-app-primary-color/10 transition-colors"
            >
              {allExportSelected ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {nonSensitive.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  selected={exportSelection.has(cat.id)}
                  disabled={readCategoryValue(cat) === null}
                  accent="green"
                  onToggle={() => toggleExportItem(cat.id)}
                />
              ))}
            </div>

            {sensitive.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-yellow-500/20" />
                  <div className="flex items-center gap-1.5 px-2">
                    <Shield size={11} className="text-yellow-400" />
                    <span className="text-[10px] font-mono font-medium text-yellow-400/80 uppercase tracking-wider">Sensitive</span>
                  </div>
                  <div className="flex-1 h-px bg-yellow-500/20" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sensitive.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      cat={cat}
                      selected={exportSelection.has(cat.id)}
                      disabled={readCategoryValue(cat) === null}
                      accent="yellow"
                      onToggle={() => toggleExportItem(cat.id)}
                    />
                  ))}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={handleExport}
              disabled={noneExportSelected}
              className="group relative w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-app-primary-color hover:bg-app-primary-dark text-black font-bold font-mono text-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Download size={16} />
              <span>Export {exportSelection.size} {exportSelection.size === 1 ? "Category" : "Categories"}</span>
            </button>
          </div>
        </div>

        {/* ===== IMPORT (shown only when file loaded) ===== */}
        {importData && (
          <div className="rounded-xl bg-app-tertiary/50 border border-app-primary-20 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-app-primary-color/5 border-b border-app-primary-20">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-app-primary-color/15 flex items-center justify-center">
                  <Upload size={14} className="color-primary" />
                </div>
                <span className="text-sm font-bold font-mono text-app-primary">Import</span>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-app-primary-color/5 border border-app-primary-20">
                  <Database size={12} className="color-primary" />
                  <span className="text-xs font-mono font-medium text-app-primary truncate max-w-[180px]">{importFileName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setImportData(null); setImportFileName(""); setImportSelection(new Set()); }}
                  className="text-[10px] font-mono font-medium px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DATA_CATEGORIES.filter((cat) => importData !== null && cat.id in importData).map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    cat={cat}
                    selected={importSelection.has(cat.id)}
                    accent={cat.sensitive ? "yellow" : "green"}
                    onToggle={() => toggleImportItem(cat.id)}
                  />
                ))}
              </div>

              {importData !== null && Object.keys(importData).filter((k) => k !== "_meta" && !DATA_CATEGORIES.some((c) => c.id === k)).length > 0 && (
                <div className="text-[10px] font-mono text-app-secondary-40 px-1">
                  + {Object.keys(importData).filter((k) => k !== "_meta" && !DATA_CATEGORIES.some((c) => c.id === k)).length} unrecognized {Object.keys(importData).filter((k) => k !== "_meta" && !DATA_CATEGORIES.some((c) => c.id === k)).length === 1 ? "entry" : "entries"} (skipped)
                </div>
              )}

              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-yellow-500/8 border border-yellow-500/15">
                <AlertTriangle size={13} className="text-yellow-400 flex-shrink-0" />
                <span className="text-[10px] font-mono text-yellow-400/70 leading-snug">
                  Importing overwrites existing data for selected categories.
                </span>
              </div>

              <button
                type="button"
                onClick={handleImportApply}
                disabled={importSelection.size === 0}
                className="group relative w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-app-primary-color hover:bg-app-primary-dark text-black font-bold font-mono text-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Upload size={16} />
                <span>Import {importSelection.size} {importSelection.size === 1 ? "Category" : "Categories"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = (): JSX.Element | null => {
    switch (activeTab) {
      case "network":
        return renderNetworkTab();
      case "trading":
        return renderTradingTab();
      case "configuration":
        return renderConfigurationTab();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-app-primary text-app-tertiary flex flex-col">
      <HorizontalHeader />

      <div className="relative flex-1 overflow-y-auto overflow-x-hidden w-full pt-16 bg-app-primary">
        {/* Background */}
        <PageBackground />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="mb-6 flex flex-wrap items-center gap-4 justify-between pb-4 border-b border-app-primary-20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-app-primary-color/30 to-app-primary-color/10 border border-app-primary-color/40 flex items-center justify-center shadow-[0_0_30px_rgba(2,179,109,0.2)]">
                <Settings size={28} className="color-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-app-primary font-mono tracking-wide">
                  SETTINGS
                </h1>
                <p className="text-xs text-app-secondary-60 font-mono">
                  Configure your trading environment
                </p>
              </div>
            </div>

            {/* Quick Status */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 sm:gap-6 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
                <div className="text-center">
                  <div className="text-xs font-mono color-primary font-bold">
                    {config.bundleMode?.toUpperCase() || "BATCH"}
                  </div>
                  <div className="text-[10px] text-app-secondary-40 font-mono">
                    MODE
                  </div>
                </div>
                <div className="w-px h-8 bg-app-primary-20" />
                <div className="text-center">
                  <div className="text-xs font-mono color-primary font-bold">
                    {currentRegion}
                  </div>
                  <div className="text-[10px] text-app-secondary-40 font-mono">
                    REGION
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Tabs */}
            <div className="lg:w-56 flex-shrink-0">
              <div className="lg:sticky lg:top-6 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl font-mono text-sm transition-all duration-200 group ${
                      activeTab === tab.id
                        ? "bg-app-primary-color text-black font-bold shadow-[0_0_20px_rgba(2,179,109,0.3)]"
                        : "bg-app-tertiary/50 hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary-40 text-app-primary"
                    }`}
                  >
                    <span
                      className={`${activeTab === tab.id ? "text-black" : "color-primary group-hover:text-app-primary-light"} transition-colors`}
                    >
                      {tab.icon}
                    </span>
                    <div className="text-left">
                      <div className="font-bold whitespace-nowrap">{tab.label}</div>
                      <div
                        className={`text-[10px] whitespace-nowrap ${activeTab === tab.id ? "text-black/60" : "text-app-secondary-40"}`}
                      >
                        {tab.description}
                      </div>
                    </div>
                    {activeTab === tab.id && (
                      <ChevronRight size={16} className="ml-auto text-black hidden lg:block" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              <div className="bg-app-secondary/80 backdrop-blur-sm rounded-2xl border border-app-primary-20 p-3 sm:p-6 shadow-xl">
                {renderTabContent()}
              </div>

              {/* Save Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveAndClose}
                  className="group relative px-8 py-3 bg-app-primary-color hover:bg-app-primary-dark text-black font-bold font-mono tracking-wide rounded-xl shadow-[0_0_20px_rgba(2,179,109,0.4)] hover:shadow-[0_0_30px_rgba(2,179,109,0.6)] flex items-center gap-3 text-sm transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <Save size={18} />
                  <span>SAVE CONFIGURATION</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OnboardingTutorial
        forceShow={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
};
