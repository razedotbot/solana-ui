import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Rocket,
  Zap,
  Check,
  Image,
  Globe,
  Twitter,
  Send,
  X,
  Upload,
  RefreshCw,
  Download,
  Search,
  Plus,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  ChevronDown,
  Wallet,
} from "lucide-react";
import { useAppContext } from "../../contexts/AppContext";
import { useToast } from "../Notifications";
import {
  executeCreate,
  createDeployConfig,
  type WalletForCreate,
  type CreateConfig,
  type PlatformType,
  METEORA_DBC_CONFIGS,
  METEORA_CPAMM_CONFIGS,
} from "../../utils/create";
import { addRecentToken } from "../../utils/recentTokens";
import { getWalletDisplayName } from "../../utils/wallet";
import type { WalletType, TokenMetadataApiResponse } from "../../utils/types";
import type { TokenMetadata } from "../deploy/constants";
import { PlatformIcons, PLATFORMS, MIN_WALLETS, MAX_WALLETS_ADVANCED } from "../deploy/constants";
import { API_URLS } from "../../utils/constants";
import { PageBackground } from "../Styles";

interface DeployFormProps {
  onTokenDeployed?: (mintAddress: string) => void | Promise<void>;
}

export const DeployForm: React.FC<DeployFormProps> = ({ onTokenDeployed }) => {
  const { wallets: propWallets, baseCurrencyBalances, refreshBalances } = useAppContext();
  const { showToast } = useToast();

  // Core state
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>("pumpfun");
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Platform options
  const [pumpType, setPumpType] = useState<boolean>(false);
  const [cashBack, setCashBack] = useState<boolean>(false);
  const [bonkType, setBonkType] = useState<"meme" | "tech">("meme");
  const [meteoraDBCConfigAddress, setMeteoraDBCConfigAddress] = useState(METEORA_DBC_CONFIGS.standard);
  const [meteoraCPAMMConfigAddress, setMeteoraCPAMMConfigAddress] = useState(METEORA_CPAMM_CONFIGS.standard);
  const [meteoraCPAMMInitialLiquidity, setMeteoraCPAMMInitialLiquidity] = useState("1");
  const [meteoraCPAMMInitialTokenPercent, setMeteoraCPAMMInitialTokenPercent] = useState("80");

  // Token metadata
  const [tokenData, setTokenData] = useState<TokenMetadata>({
    name: "", symbol: "", description: "", imageUrl: "", twitter: "", telegram: "", website: "",
  });

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Import metadata
  const [importMint, setImportMint] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Wallet search
  const [walletSearch, setWalletSearch] = useState("");
  const [showAllWallets, setShowAllWallets] = useState(false);

  // Collapsible sections
  type SectionKey = "platform" | "token" | "wallets";
  const [expandedSections, setExpandedSections] = useState<{ platform: boolean; token: boolean; wallets: boolean }>({
    platform: false,
    token: true,
    wallets: false,
  });

  const toggleSection = (section: SectionKey): void => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const MAX_WALLETS = MAX_WALLETS_ADVANCED;
  const isAdvancedMode = selectedWallets.length > 5;
  const wallets = propWallets.filter((w) => (baseCurrencyBalances.get(w.address) || 0) > 0);

  const primaryWalletsValid = selectedWallets.length >= MIN_WALLETS &&
    selectedWallets.every((pk) => walletAmounts[pk] && parseFloat(walletAmounts[pk]) > 0);

  const canDeploy = !!(tokenData.name && tokenData.symbol && tokenData.imageUrl &&
    isConfirmed && primaryWalletsValid);

  const totalSolAmount = useMemo(() =>
    selectedWallets.reduce((sum, pk) => sum + (parseFloat(walletAmounts[pk]) || 0), 0),
    [selectedWallets, walletAmounts],
  );

  useEffect(() => {
    if (propWallets.length > 0 && baseCurrencyBalances.size === 0) {
      void refreshBalances();
    }
  }, [propWallets, baseCurrencyBalances.size, refreshBalances]);

  // Reset showAllWallets when search changes
  useEffect(() => {
    setShowAllWallets(false);
  }, [walletSearch]);

  // Import metadata
  const importMetadata = async (): Promise<void> => {
    const mint = importMint.trim();
    if (!mint) { showToast("Enter a token mint address", "error"); return; }
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) { showToast("Invalid mint address", "error"); return; }
    setIsImporting(true);
    try {
      const response = await fetch(`${API_URLS.RAZE_PUBLIC}/metadata/${mint}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json() as TokenMetadataApiResponse;
      if (!data.success || !data.metadata) throw new Error("No metadata");
      const { onChain, offChain } = data.metadata;
      setTokenData((prev) => ({
        ...prev,
        name: offChain?.name || onChain?.name || "",
        symbol: offChain?.symbol || onChain?.symbol || "",
        description: offChain?.description || "",
        imageUrl: offChain?.image ? `${API_URLS.RAZE_PUBLIC}/image?url=${encodeURIComponent(offChain.image)}` : "",
      }));
      setImportMint("");
      showToast("Metadata cloned", "success");
    } catch { showToast("Failed to import", "error"); }
    finally { setIsImporting(false); }
  };

  // Image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/gif", "image/svg+xml"].includes(file.type)) {
      showToast("Invalid image format", "error"); return;
    }
    if (file.size > 2 * 1024 * 1024) { showToast("Image must be under 2MB", "error"); return; }
    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("image", file);
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText) as { url: string };
        setTokenData((prev) => ({ ...prev, imageUrl: res.url }));
        showToast("Image uploaded", "success");
      } else { showToast("Upload failed", "error"); }
      setIsUploading(false);
    });
    xhr.addEventListener("error", () => { showToast("Upload failed", "error"); setIsUploading(false); });
    xhr.open("POST", `${API_URLS.RAZE_PUBLIC}/upload`);
    xhr.send(formData);
  };

  // Wallet handlers
  const filteredWallets = wallets
    .filter((w) => !selectedWallets.includes(w.privateKey))
    .filter((w) => {
      if (!walletSearch) return true;
      const search = walletSearch.toLowerCase();
      return w.address.toLowerCase().includes(search) || w.label?.toLowerCase().includes(search);
    })
    .sort((a, b) => (baseCurrencyBalances.get(b.address) || 0) - (baseCurrencyBalances.get(a.address) || 0));

  const selectWallet = (privateKey: string): void => {
    if (selectedWallets.includes(privateKey) || selectedWallets.length >= MAX_WALLETS) return;
    setSelectedWallets((prev) => [...prev, privateKey]);
    if (!walletAmounts[privateKey]) setWalletAmounts((prev) => ({ ...prev, [privateKey]: "0.1" }));
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
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const newAmounts: Record<string, string> = {};
      selectedWallets.forEach((pk) => { newAmounts[pk] = value; });
      setWalletAmounts(newAmounts);
    }
  };

  const getWallet = (pk: string): WalletType | undefined => wallets.find((w) => w.privateKey === pk);

  // Deploy handler
  const handleDeploy = async (): Promise<void> => {
    if (!canDeploy) return;
    setIsSubmitting(true);

    const buildWallets = (keys: string[], amounts: Record<string, string>): WalletForCreate[] =>
      keys.map((pk) => {
        const w = wallets.find((x) => x.privateKey === pk);
        if (!w) throw new Error("Wallet not found");
        return { address: w.address, privateKey: pk, amount: parseFloat(amounts[pk]) || 0.1 };
      });

    const buildConfig = (): CreateConfig => {
      const isAdv = isAdvancedMode;
      return createDeployConfig({
        platform: selectedPlatform,
        token: {
          name: tokenData.name, symbol: tokenData.symbol,
          description: tokenData.description || undefined, imageUrl: tokenData.imageUrl,
          twitter: tokenData.twitter || undefined, telegram: tokenData.telegram || undefined,
          website: tokenData.website || undefined,
        },
        pumpType: selectedPlatform === "pumpfun" ? pumpType : undefined,
        cashBack: selectedPlatform === "pumpfun" ? cashBack : undefined,
        pumpAdvanced: selectedPlatform === "pumpfun" ? isAdv : undefined,
        bonkType: selectedPlatform === "bonk" ? bonkType : undefined,
        bonkAdvanced: selectedPlatform === "bonk" ? isAdv : undefined,
        bonkConfig: selectedPlatform === "bonk" ? {} : undefined,
        meteoraDBCConfig: selectedPlatform === "meteoraDBC" ? {
          configAddress: meteoraDBCConfigAddress || METEORA_DBC_CONFIGS.standard,
        } : undefined,
        meteoraCPAMMConfig: selectedPlatform === "meteoraCPAMM" ? {
          configAddress: meteoraCPAMMConfigAddress || METEORA_CPAMM_CONFIGS.standard,
          initialLiquiditySOL: parseFloat(meteoraCPAMMInitialLiquidity) || 1,
          initialTokenPercent: parseFloat(meteoraCPAMMInitialTokenPercent) || 80,
        } : undefined,
      });
    };

    try {
      const handleMintReady = async (mintAddress: string): Promise<void> => {
        addRecentToken(mintAddress);
        await Promise.resolve(onTokenDeployed?.(mintAddress));
      };

      const result = await executeCreate(buildWallets(selectedWallets, walletAmounts), buildConfig(), handleMintReady);
      if (result.success && result.mintAddress) {
        showToast(`Token deployed: ${result.mintAddress.slice(0, 8)}...`, "success");
        resetForm();
        void refreshBalances();
      } else { throw new Error(result.error || "Deployment failed"); }
    } catch (err) {
      showToast(`Deploy failed: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally { setIsSubmitting(false); }
  };

  const resetForm = (): void => {
    setTokenData({ name: "", symbol: "", description: "", imageUrl: "", twitter: "", telegram: "", website: "" });
    setSelectedWallets([]);
    setWalletAmounts({});
    setIsConfirmed(false);
  };

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-app-primary h-full">
      <PageBackground />

      {/* Sticky Header */}
      <div className="sticky top-0 bg-app-primary-99 backdrop-blur-sm border-b border-app-primary-40 z-10">
        <div className="py-2 px-3 bg-app-secondary-80-solid">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-app-secondary font-mono">
              <Rocket size={14} className="color-primary" />
              <span className="text-app-primary font-medium">{tokenData.symbol || "TOKEN"}</span>
              <span className="text-app-secondary-60">on</span>
              <span className="color-primary">{PLATFORMS.find(p => p.id === selectedPlatform)?.name}</span>
            </div>
            <div className="text-app-secondary font-mono">
              <span className="text-app-primary">{selectedWallets.length}</span>
              <span className="text-app-secondary-60"> wallets / </span>
              <span className="color-primary">{totalSolAmount.toFixed(2)}</span>
              <span className="text-app-secondary-60"> SOL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto relative z-10">
        {/* Platform Selection */}
        <div className="border-b border-app-primary-15">
          <div
            onClick={() => toggleSection("platform")}
            className="px-3 py-1.5 bg-app-secondary-80-solid border-b border-app-primary-20 cursor-pointer hover:bg-app-tertiary/50 transition-colors flex items-center justify-between"
          >
            <span className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={10} className="color-primary" /> Platform
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono color-primary">{PLATFORMS.find(p => p.id === selectedPlatform)?.name}</span>
              <ChevronDown size={12} className={`text-app-secondary-40 transition-transform duration-200 ${expandedSections.platform ? "" : "-rotate-90"}`} />
            </div>
          </div>
          {expandedSections.platform && PLATFORMS.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className={`flex items-center px-3 py-2 border-b border-app-primary-15 cursor-pointer transition-all duration-200 ${
                selectedPlatform === p.id
                  ? "bg-primary-20 border-l-4 border-l-primary"
                  : "hover:bg-primary-08"
              }`}
            >
              <div className="w-7 h-7 rounded bg-app-quaternary flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 mr-3">
                {PlatformIcons[p.id]}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-mono ${selectedPlatform === p.id ? "color-primary font-medium" : "text-app-primary"}`}>
                  {p.name}
                </span>
                <span className="text-xs text-app-secondary-60 ml-2">{p.desc}</span>
              </div>
              {selectedPlatform === p.id && <Check size={14} className="color-primary" />}
            </div>
          ))}
          {/* Platform-specific options */}
          {expandedSections.platform && (
            <>
          {selectedPlatform === "pumpfun" && (
            <>
            <div className="flex items-center justify-between px-3 py-2 bg-app-tertiary/30">
              <span className="text-xs font-mono text-app-secondary">Mayhem Mode</span>
              <button
                onClick={() => setPumpType(!pumpType)}
                className={`w-8 h-4 rounded-full transition-all ${pumpType ? "bg-app-primary-color" : "bg-app-quaternary"}`}
              >
                <span className={`block w-3 h-3 rounded-full bg-white shadow transition-all ${pumpType ? "ml-4" : "ml-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-app-tertiary/30">
              <span className="text-xs font-mono text-app-secondary">Cash Back</span>
              <button
                onClick={() => setCashBack(!cashBack)}
                className={`w-8 h-4 rounded-full transition-all ${cashBack ? "bg-app-primary-color" : "bg-app-quaternary"}`}
              >
                <span className={`block w-3 h-3 rounded-full bg-white shadow transition-all ${cashBack ? "ml-4" : "ml-0.5"}`} />
              </button>
            </div>
            </>
          )}
          {selectedPlatform === "bonk" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-app-tertiary/30">
              <span className="text-xs font-mono text-app-secondary-60 mr-2">Type:</span>
              {["meme", "tech"].map((t) => (
                <button
                  key={t}
                  onClick={() => setBonkType(t as "meme" | "tech")}
                  className={`px-2 py-1 text-xs font-mono rounded transition-all ${
                    bonkType === t ? "bg-primary-30 color-primary" : "bg-app-quaternary text-app-secondary-60 hover:text-app-primary"
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          {selectedPlatform === "meteoraDBC" && (
            <div className="px-3 py-2 bg-app-tertiary/30">
              <input
                type="text"
                value={meteoraDBCConfigAddress}
                onChange={(e) => setMeteoraDBCConfigAddress(e.target.value)}
                placeholder="Config address..."
                className="w-full bg-app-quaternary border border-app-primary-30 rounded px-2 py-1 text-xs text-app-primary font-mono focus:border-app-primary-color focus:outline-none"
              />
            </div>
          )}
          {selectedPlatform === "meteoraCPAMM" && (
            <div className="px-3 py-2 bg-app-tertiary/30 space-y-2">
              <input
                type="text"
                value={meteoraCPAMMConfigAddress}
                onChange={(e) => setMeteoraCPAMMConfigAddress(e.target.value)}
                placeholder="Config address..."
                className="w-full bg-app-quaternary border border-app-primary-30 rounded px-2 py-1 text-xs text-app-primary font-mono focus:border-app-primary-color focus:outline-none"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <span className="text-[9px] text-app-secondary-40 font-mono">Liquidity SOL</span>
                  <input
                    type="text"
                    value={meteoraCPAMMInitialLiquidity}
                    onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setMeteoraCPAMMInitialLiquidity(e.target.value)}
                    className="w-full bg-app-quaternary border border-app-primary-30 rounded px-2 py-1 text-xs text-app-primary font-mono focus:border-app-primary-color focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[9px] text-app-secondary-40 font-mono">Token %</span>
                  <input
                    type="text"
                    value={meteoraCPAMMInitialTokenPercent}
                    onChange={(e) => {
                      if (/^\d*\.?\d*$/.test(e.target.value)) {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || (val >= 0 && val <= 100)) setMeteoraCPAMMInitialTokenPercent(e.target.value);
                      }
                    }}
                    className="w-full bg-app-quaternary border border-app-primary-30 rounded px-2 py-1 text-xs text-app-primary font-mono focus:border-app-primary-color focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {/* Token Info */}
        <div className="border-b border-app-primary-15">
          <div
            onClick={() => toggleSection("token")}
            className="px-3 py-1.5 bg-app-secondary-80-solid border-b border-app-primary-20 cursor-pointer hover:bg-app-tertiary/50 transition-colors flex items-center justify-between"
          >
            <span className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider flex items-center gap-1.5">
              <Image size={10} className="color-primary" /> Token
            </span>
            <div className="flex items-center gap-2">
              {tokenData.name && tokenData.symbol && tokenData.imageUrl ? (
                <span className="text-[10px] font-mono color-primary flex items-center gap-1">
                  <Check size={10} /> Ready
                </span>
              ) : (
                <span className="text-[10px] font-mono text-app-secondary-40">
                  {tokenData.symbol || "Not set"}
                </span>
              )}
              <ChevronDown size={12} className={`text-app-secondary-40 transition-transform duration-200 ${expandedSections.token ? "" : "-rotate-90"}`} />
            </div>
          </div>

          {expandedSections.token && (
            <>
          {/* Clone row */}
          <div className="flex items-center px-3 py-2 border-b border-app-primary-15 gap-2">
            <Download size={12} className="text-app-secondary-40" />
            <input
              type="text"
              value={importMint}
              onChange={(e) => setImportMint(e.target.value)}
              placeholder="Clone from mint address..."
              className="flex-1 bg-transparent text-sm text-app-primary font-mono placeholder:text-app-secondary-40 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && void importMetadata()}
            />
            <button
              onClick={() => void importMetadata()}
              disabled={isImporting || !importMint.trim()}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                importMint.trim() && !isImporting
                  ? "bg-primary-30 border border-app-primary-80 hover:bg-app-primary-color cursor-pointer"
                  : "bg-app-tertiary border border-app-primary-20 opacity-50"
              }`}
            >
              {isImporting ? <RefreshCw size={10} className="animate-spin text-app-quaternary" /> : <Download size={10} className="text-app-quaternary" />}
            </button>
          </div>

          {/* Name row */}
          <div className="flex items-center px-3 py-2 border-b border-app-primary-15">
            <span className="text-xs font-mono text-app-secondary-60 w-16">Name</span>
            <input
              type="text"
              value={tokenData.name}
              onChange={(e) => setTokenData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Token Name"
              className="flex-1 bg-transparent text-sm text-app-primary font-mono placeholder:text-app-secondary-40 focus:outline-none"
            />
            {tokenData.name && <Check size={12} className="color-primary" />}
          </div>

          {/* Symbol row */}
          <div className="flex items-center px-3 py-2 border-b border-app-primary-15">
            <span className="text-xs font-mono text-app-secondary-60 w-16">Symbol</span>
            <input
              type="text"
              value={tokenData.symbol}
              onChange={(e) => setTokenData((prev) => ({ ...prev, symbol: e.target.value }))}
              placeholder="SYMBOL"
              className="flex-1 bg-transparent text-sm text-app-primary font-mono placeholder:text-app-secondary-40 focus:outline-none uppercase"
            />
            {tokenData.symbol && <Check size={12} className="color-primary" />}
          </div>

          {/* Description row */}
          <div className="flex items-start px-3 py-2 border-b border-app-primary-15">
            <span className="text-xs font-mono text-app-secondary-60 w-16 pt-1">Desc</span>
            <textarea
              value={tokenData.description}
              onChange={(e) => setTokenData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description (optional)"
              rows={2}
              className="flex-1 bg-transparent text-sm text-app-primary font-mono placeholder:text-app-secondary-40 focus:outline-none resize-none"
            />
          </div>

          {/* Image row */}
          <div className="flex items-center px-3 py-2 border-b border-app-primary-15">
            <span className="text-xs font-mono text-app-secondary-60 w-16">Image</span>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            {tokenData.imageUrl ? (
              <div className="flex items-center gap-2 flex-1">
                <img src={tokenData.imageUrl} alt="Token" className="w-8 h-8 rounded object-cover border border-app-primary-color/50" />
                <span className="text-xs text-app-secondary-60 font-mono truncate flex-1">{tokenData.imageUrl.slice(0, 30)}...</span>
                <button onClick={() => setTokenData((prev) => ({ ...prev, imageUrl: "" }))} className="p-1 hover:bg-red-500/20 rounded">
                  <X size={12} className="text-red-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 text-sm font-mono text-app-secondary-60 hover:text-app-primary transition-colors"
              >
                {isUploading ? (
                  <><RefreshCw size={12} className="animate-spin color-primary" /> {uploadProgress}%</>
                ) : (
                  <><Upload size={12} /> Upload logo</>
                )}
              </button>
            )}
            {tokenData.imageUrl && <Check size={12} className="color-primary ml-2" />}
          </div>

          {/* Social rows */}
          <div className="flex items-center px-3 py-2 border-b border-app-primary-15">
            <Twitter size={12} className="text-app-secondary-40 w-16 justify-start" />
            <input
              type="text"
              value={tokenData.twitter}
              onChange={(e) => setTokenData((prev) => ({ ...prev, twitter: e.target.value }))}
              placeholder="Twitter URL (optional)"
              className="flex-1 bg-transparent text-sm text-app-primary font-mono placeholder:text-app-secondary-40 focus:outline-none"
            />
          </div>
          <div className="flex items-center px-3 py-2 border-b border-app-primary-15">
            <Send size={12} className="text-app-secondary-40 w-16 justify-start" />
            <input
              type="text"
              value={tokenData.telegram}
              onChange={(e) => setTokenData((prev) => ({ ...prev, telegram: e.target.value }))}
              placeholder="Telegram URL (optional)"
              className="flex-1 bg-transparent text-sm text-app-primary font-mono placeholder:text-app-secondary-40 focus:outline-none"
            />
          </div>
          <div className="flex items-center px-3 py-2 border-b border-app-primary-15">
            <Globe size={12} className="text-app-secondary-40 w-16 justify-start" />
            <input
              type="text"
              value={tokenData.website}
              onChange={(e) => setTokenData((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="Website URL (optional)"
              className="flex-1 bg-transparent text-sm text-app-primary font-mono placeholder:text-app-secondary-40 focus:outline-none"
            />
          </div>
            </>
          )}
        </div>

        {/* Wallets */}
        <div className="border-b border-app-primary-15">
          <div
            onClick={() => toggleSection("wallets")}
            className="px-3 py-1.5 bg-app-secondary-80-solid border-b border-app-primary-20 cursor-pointer hover:bg-app-tertiary/50 transition-colors flex items-center justify-between"
          >
            <span className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet size={10} className="color-primary" /> Wallets
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono ${selectedWallets.length > 0 ? "color-primary" : "text-app-secondary-40"}`}>
                {selectedWallets.length}/{MAX_WALLETS}
              </span>
              {selectedWallets.length > 0 && (
                <span className="text-[10px] font-mono text-app-secondary-40">
                  {totalSolAmount.toFixed(2)} SOL
                </span>
              )}
              <ChevronDown size={12} className={`text-app-secondary-40 transition-transform duration-200 ${expandedSections.wallets ? "" : "-rotate-90"}`} />
            </div>
          </div>

          {expandedSections.wallets && (
            <>
          {/* Set all input when wallets selected */}
          {selectedWallets.length > 0 && (
            <div className="flex items-center justify-end gap-2 px-3 py-1.5 bg-app-tertiary/20 border-b border-app-primary-15">
              <span className="text-[9px] text-app-secondary-40 font-mono">Set all:</span>
              <input
                type="text"
                placeholder="0.1"
                className="w-12 bg-app-quaternary border border-app-primary-30 rounded px-1 py-0.5 text-[10px] text-app-primary text-center font-mono focus:border-app-primary-color focus:outline-none"
                onChange={(e) => setAllAmounts(e.target.value)}
              />
              <span className="text-[9px] text-app-secondary-40 font-mono">SOL</span>
            </div>
          )}

          {/* Selected wallets */}
          {selectedWallets.map((pk, i) => {
            const w = getWallet(pk);
            const balance = w ? baseCurrencyBalances.get(w.address) || 0 : 0;
            return (
              <div key={pk} className={`flex items-center px-3 py-2 border-b border-app-primary-15 ${i === 0 ? "bg-primary-20 border-l-4 border-l-primary" : "hover:bg-primary-08"}`}>
                <div className="flex flex-col mr-2">
                  <button onClick={() => moveWallet(i, "up")} disabled={i === 0} className={`p-0.5 ${i === 0 ? "opacity-30" : "hover:bg-app-quaternary rounded"}`}>
                    <ArrowUp size={8} className="text-app-secondary-40" />
                  </button>
                  <button onClick={() => moveWallet(i, "down")} disabled={i === selectedWallets.length - 1} className={`p-0.5 ${i === selectedWallets.length - 1 ? "opacity-30" : "hover:bg-app-quaternary rounded"}`}>
                    <ArrowDown size={8} className="text-app-secondary-40" />
                  </button>
                </div>
                <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded mr-2 ${i === 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-app-quaternary text-app-secondary-40"}`}>
                  {i === 0 ? "C" : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-mono text-app-primary truncate block">{w ? getWalletDisplayName(w) : "Unknown"}</span>
                  <span className="text-[10px] text-app-secondary-60 font-mono">{balance.toFixed(3)} SOL</span>
                </div>
                <input
                  type="text"
                  value={walletAmounts[pk] || ""}
                  onChange={(e) => updateAmount(pk, e.target.value)}
                  placeholder="0.1"
                  className="w-14 bg-app-quaternary border border-app-primary-30 rounded px-2 py-1 text-xs text-app-primary text-right font-mono focus:border-app-primary-color focus:outline-none mr-2"
                />
                <button onClick={() => removeWallet(pk)} className="p-1 hover:bg-red-500/20 rounded">
                  <X size={12} className="text-red-400" />
                </button>
              </div>
            );
          })}

          {/* Search and add wallets */}
          {selectedWallets.length < MAX_WALLETS && (
            <>
              <div className="flex items-center px-3 py-2 border-b border-app-primary-15 gap-2 bg-app-tertiary/30">
                <Search size={12} className="text-app-secondary-40" />
                <input
                  type="text"
                  value={walletSearch}
                  onChange={(e) => setWalletSearch(e.target.value)}
                  placeholder="Search wallets..."
                  className="flex-1 bg-transparent text-sm text-app-primary font-mono placeholder:text-app-secondary-40 focus:outline-none"
                />
                <button
                  onClick={() => {
                    const toSelect = filteredWallets.slice(0, MAX_WALLETS - selectedWallets.length);
                    setSelectedWallets((prev) => [...prev, ...toSelect.map((w) => w.privateKey)]);
                    const amounts: Record<string, string> = { ...walletAmounts };
                    toSelect.forEach((w) => { if (!amounts[w.privateKey]) amounts[w.privateKey] = "0.1"; });
                    setWalletAmounts(amounts);
                  }}
                  className="text-[10px] font-mono color-primary hover:underline"
                >
                  Add All
                </button>
              </div>
              {filteredWallets.slice(0, showAllWallets ? filteredWallets.length : 5).map((w) => {
                const balance = baseCurrencyBalances.get(w.address) || 0;
                return (
                  <div
                    key={w.id}
                    onClick={() => selectWallet(w.privateKey)}
                    className="flex items-center px-3 py-2 border-b border-app-primary-15 cursor-pointer hover:bg-primary-08 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary-30 border border-app-primary-80 flex items-center justify-center mr-3 hover:bg-app-primary-color">
                      <Plus size={10} className="text-app-quaternary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-mono text-app-primary truncate block">{getWalletDisplayName(w)}</span>
                    </div>
                    <span className="text-xs font-mono color-primary">{balance.toFixed(3)}</span>
                  </div>
                );
              })}
              {filteredWallets.length > 5 && (
                <div
                  onClick={() => setShowAllWallets(!showAllWallets)}
                  className="px-3 py-1.5 text-[10px] font-mono text-center cursor-pointer hover:bg-primary-08 transition-all border-b border-app-primary-15"
                >
                  <span className="color-primary hover:underline">
                    {showAllWallets ? "Show less" : `+${filteredWallets.length - 5} more wallets`}
                  </span>
                </div>
              )}
              {filteredWallets.length === 0 && (
                <div className="px-3 py-3 text-xs text-app-secondary-40 font-mono text-center">No wallets found</div>
              )}
            </>
          )}

          {/* Warning */}
          {selectedWallets.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-app-tertiary/30">
              <AlertTriangle size={12} className="color-primary" />
              <span className="text-[10px] text-app-secondary-60 font-mono">First wallet (C) is token creator</span>
            </div>
          )}
            </>
          )}
        </div>

        {/* Confirmation */}
        <div
          onClick={() => setIsConfirmed(!isConfirmed)}
          className={`flex items-center px-3 py-3 cursor-pointer transition-all ${
            isConfirmed ? "bg-primary-20 border-l-4 border-l-primary" : "hover:bg-primary-08"
          }`}
        >
          <div className={`w-5 h-5 rounded flex items-center justify-center mr-3 transition-all ${
            isConfirmed ? "bg-app-primary-color border-app-primary-color" : "border-2 border-app-primary-30"
          }`}>
            {isConfirmed && <Check size={12} className="text-black" />}
          </div>
          <span className="text-sm font-mono text-app-primary">I confirm deployment settings are correct</span>
        </div>
      </div>

      {/* Deploy Button */}
      <div className="shrink-0 p-3 border-t border-app-primary-40 bg-app-primary-99">
        <button
          onClick={() => void handleDeploy()}
          disabled={!canDeploy || isSubmitting}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded font-mono text-sm font-bold transition-all ${
            canDeploy && !isSubmitting
              ? "bg-app-primary-color text-black hover:brightness-110 shadow-lg shadow-app-primary-40"
              : "bg-app-tertiary border border-app-primary-20 text-app-secondary-40 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <><RefreshCw size={16} className="animate-spin" /> DEPLOYING...</>
          ) : (
            <><Rocket size={16} /> DEPLOY TOKEN</>
          )}
        </button>
      </div>
    </div>
  );
};
