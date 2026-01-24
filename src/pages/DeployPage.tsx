import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts";
import { HorizontalHeader } from "../components/HorizontalHeader";
import {
  PlusCircle,
  X,
  CheckCircle,
  Search,
  ArrowUp,
  ArrowDown,
  Upload,
  RefreshCw,
  Copy,
  ExternalLink,
  Rocket,
  Sparkles,
  Wallet,
  Image,
  Globe,
  Twitter,
  Send,
  Check,
  Zap,
  Shield,
  AlertTriangle,
  Eye,
  Trash2,
  Settings,
  Plus,
  ChevronRight,
  Layers,
} from "lucide-react";
import { getWalletDisplayName } from "../utils/wallet";
import type { WalletType } from "../utils/types";
import { useToast } from "../utils/hooks";
import {
  executeCreate,
  createDeployConfig,
  type WalletForCreate,
  type CreateConfig,
  METEORA_DBC_CONFIGS,
  METEORA_CPAMM_CONFIGS,
  type PlatformType,
} from "../utils/create";
import { loadConfigFromCookies } from "../utils/storage";

const MIN_WALLETS = 1;
const MAX_WALLETS_STANDARD = 5;
const MAX_WALLETS_ADVANCED = 20;
const MAX_TOKENS_PER_DEPLOY = 5;
const DELAY_BETWEEN_DEPLOYS_MS = 2000;

interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitter: string;
  telegram: string;
  website: string;
}

interface AdditionalToken {
  platform: PlatformType;
  pumpType: boolean;
  pumpMode: "simple" | "advanced";
  bonkType: "meme" | "tech";
  bonkMode: "simple" | "advanced";
  meteoraDBCMode: "simple" | "advanced";
  meteoraDBCConfigAddress: string;
  meteoraCPAMMConfigAddress: string;
  meteoraCPAMMInitialLiquidity: string;
  meteoraCPAMMInitialTokenPercent: string;
}

interface DeploymentProgressItem {
  tokenIndex: number;
  status: "pending" | "deploying" | "success" | "failed";
  mintAddress?: string;
  error?: string;
}

type DeployTab = "platform" | "token" | "wallets";

interface TabConfig {
  id: DeployTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  { id: "platform", label: "Platform", icon: <Zap size={18} />, description: "Select Platform" },
  { id: "token", label: "Token", icon: <Sparkles size={18} />, description: "Token Details" },
  { id: "wallets", label: "Wallets", icon: <Wallet size={18} />, description: "Buy Wallets" },
];

// Platform icons
const PlatformIcons: Record<PlatformType, JSX.Element> = {
  pumpfun: (
    <svg width="24" height="24" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(45 256 256)">
        <path d="M156 256V156a100 100 0 0 1 200 0v100Z" fill="#f2f7f8" />
        <path d="M156 256v100a100 100 0 0 0 200 0V256Z" fill="#4dd994" />
        <path d="M356 256V156a100 100 0 0 0-56-90q20 34 20 90v100Z" fill="#c1cdd2" />
        <path d="M356 256v100a100 100 0 0 1-56 90q20-36 20-90V256Z" fill="#2a9d70" />
        <path stroke="#163430" strokeWidth="24" strokeLinecap="round" d="M156 256h200" />
        <rect x="156" y="56" width="200" height="400" rx="100" ry="100" fill="none" stroke="#163430" strokeWidth="24" />
      </g>
    </svg>
  ),
  bonk: (
    <svg width="24" height="24" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#bonk-clip)">
        <path d="M104 162.1s-15.5 19.55-10.35 108c0 0-33.85 86.75-22.35 131.05 11.5 44.2 56.25 42 56.25 42s71.8 63.1 126.9 7.5c55.2-55.85-45.95-271.8-45.95-271.8l-12.65-74.65s-13.8 10.9-12.05 82.75c1.75 71.8-28.15 21.2-28.15 21.2z" fill="#3c2d0c" />
        <path d="m109.75 240.3-19 53.45-6.9 37.35s-23.55 83.4 73.6 82.15c0 0 75.8 67.85 125.25 22.4l13.25-14.4 23-35.65 37.95-113.2s-12.1-77.55-88.5-109.7c0 0-6.3-3.35-17.8 1.2 0 0-31.65-71.25-51.7-62.6 0 0-17.2 9.15-2.35 79.35L169.6 192.7s-29.5-56-56.8-44.75c-25.45 10.2-3.05 92.35-3.05 92.35" fill="#e78c19" />
      </g>
      <defs><clipPath id="bonk-clip"><path fill="#fff" d="M0 0h500v500H0z" /></clipPath></defs>
    </svg>
  ),
  meteoraDBC: (
    <svg width="24" height="24" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M185.89 66.887c3.313-3.314 8.445-3.119 10.567.39 2.296 3.767 4.029 7.839 5.263 12.105.693 2.425-.109 5.261-2.122 7.275l-64.902 64.902c-3.919 3.92-8.792 6.626-13.967 7.731l-5.393 1.147c-5.154 1.126-10.07 3.834-13.968 7.732l-49.829 49.829c-2.122-8.186-3.053-13.708 3.595-20.357zm14.055 27.96c2.166-2.165 5.501-.909 5.285 1.95-1.343 17.497-9.68 35.926-24.535 50.782-11.326 12.409-43.29 31.379-66.136 44.091-4.678 2.598-8.49-2.945-4.656-6.779l90.021-90.021z" fill="url(#meteora-g1)" />
      <defs>
        <linearGradient id="meteora-g1" x1="236" y1="22" x2="68" y2="218" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5bd00" /><stop offset=".4" stopColor="#f54b00" /><stop offset="1" stopColor="#6e45ff" />
        </linearGradient>
      </defs>
    </svg>
  ),
  meteoraCPAMM: (
    <svg width="24" height="24" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M185.89 66.887c3.313-3.314 8.445-3.119 10.567.39 2.296 3.767 4.029 7.839 5.263 12.105.693 2.425-.109 5.261-2.122 7.275l-64.902 64.902c-3.919 3.92-8.792 6.626-13.967 7.731l-5.393 1.147c-5.154 1.126-10.07 3.834-13.968 7.732l-49.829 49.829c-2.122-8.186-3.053-13.708 3.595-20.357zm14.055 27.96c2.166-2.165 5.501-.909 5.285 1.95-1.343 17.497-9.68 35.926-24.535 50.782-11.326 12.409-43.29 31.379-66.136 44.091-4.678 2.598-8.49-2.945-4.656-6.779l90.021-90.021z" fill="url(#meteora-g2)" />
      <defs>
        <linearGradient id="meteora-g2" x1="236" y1="22" x2="68" y2="218" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00d4ff" /><stop offset=".4" stopColor="#0099ff" /><stop offset="1" stopColor="#0055ff" />
        </linearGradient>
      </defs>
    </svg>
  ),
};

const PLATFORMS: Array<{ id: PlatformType; name: string; desc: string; color: string }> = [
  { id: "pumpfun", name: "Pump.fun", desc: "Bonding curve", color: "emerald" },
  { id: "bonk", name: "Bonk.fun", desc: "Bot integration", color: "orange" },
  { id: "meteoraDBC", name: "Meteora DBC", desc: "Dynamic curve", color: "amber" },
  { id: "meteoraCPAMM", name: "Meteora AMM", desc: "Liquidity pool", color: "blue" },
];

export const DeployPage: React.FC = () => {
  const { wallets: propWallets, baseCurrencyBalances, refreshBalances } = useAppContext();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<DeployTab>("platform");

  // Core state
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>("pumpfun");
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Platform options
  const [pumpType, setPumpType] = useState<boolean>(false);
  const [pumpMode, setPumpMode] = useState<"simple" | "advanced">("simple");
  const [bonkType, setBonkType] = useState<"meme" | "tech">("meme");
  const [bonkMode, setBonkMode] = useState<"simple" | "advanced">("simple");
  const [meteoraDBCMode, setMeteoraDBCMode] = useState<"simple" | "advanced">("simple");
  const [meteoraDBCConfigAddress, setMeteoraDBCConfigAddress] = useState(METEORA_DBC_CONFIGS.standard);
  const [meteoraCPAMMConfigAddress, setMeteoraCPAMMConfigAddress] = useState(METEORA_CPAMM_CONFIGS.standard);
  const [meteoraCPAMMInitialLiquidity, setMeteoraCPAMMInitialLiquidity] = useState("1");
  const [meteoraCPAMMInitialTokenPercent, setMeteoraCPAMMInitialTokenPercent] = useState("80");

  // Token metadata
  const [tokenData, setTokenData] = useState<TokenMetadata>({
    name: "",
    symbol: "",
    description: "",
    imageUrl: "",
    twitter: "",
    telegram: "",
    website: "",
  });

  // Success/Multi-deploy state
  const [deployedMintAddress, setDeployedMintAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [additionalTokens, setAdditionalTokens] = useState<AdditionalToken[]>([]);
  const [additionalWalletConfigs, setAdditionalWalletConfigs] = useState<Record<number, { wallets: string[]; amounts: Record<string, string> }>>({});
  const [useSharedWallets, setUseSharedWallets] = useState(true);
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgressItem[]>([]);
  const [isMultiDeploying, setIsMultiDeploying] = useState(false);

  // Wallet filters
  const [walletSearch, setWalletSearch] = useState("");
  const [walletSort, setWalletSort] = useState<"balance" | "name">("balance");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed values
  const getJitoTipFromSettings = (): number => {
    const appConfig = loadConfigFromCookies();
    return appConfig?.transactionFee ? parseFloat(appConfig.transactionFee) / 1e9 : 0.001;
  };

  const MAX_WALLETS = useMemo(() => {
    if (selectedPlatform === "pumpfun" && pumpMode === "advanced") return MAX_WALLETS_ADVANCED;
    if (selectedPlatform === "bonk" && bonkMode === "advanced") return MAX_WALLETS_ADVANCED;
    if (selectedPlatform === "meteoraDBC" && meteoraDBCMode === "advanced") return MAX_WALLETS_ADVANCED;
    if (selectedPlatform === "meteoraCPAMM") return MAX_WALLETS_ADVANCED;
    return MAX_WALLETS_STANDARD;
  }, [selectedPlatform, pumpMode, bonkMode, meteoraDBCMode]);

  const isAdvancedMode = (selectedPlatform === "pumpfun" && pumpMode === "advanced") ||
    (selectedPlatform === "bonk" && bonkMode === "advanced") ||
    (selectedPlatform === "meteoraDBC" && meteoraDBCMode === "advanced") ||
    (selectedPlatform === "meteoraCPAMM" && selectedWallets.length > MAX_WALLETS_STANDARD);

  const wallets = propWallets.filter((w) => (baseCurrencyBalances.get(w.address) || 0) > 0);

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

  const totalAmount = selectedWallets.reduce((sum, pk) => sum + (parseFloat(walletAmounts[pk]) || 0), 0);

  const canDeploy = tokenData.name && tokenData.symbol && tokenData.imageUrl && selectedWallets.length >= MIN_WALLETS &&
    selectedWallets.every((pk) => walletAmounts[pk] && parseFloat(walletAmounts[pk]) > 0) && isConfirmed;

  // Effects
  useEffect(() => {
    if (propWallets.length > 0 && baseCurrencyBalances.size === 0) {
      void refreshBalances();
    }
  }, [propWallets, baseCurrencyBalances.size, refreshBalances]);

  // Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/gif", "image/svg+xml"].includes(file.type)) {
      showToast("Please select a valid image (JPEG, PNG, GIF, SVG)", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2MB", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("image", file);

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText) as { url: string };
        setTokenData((prev) => ({ ...prev, imageUrl: response.url }));
        showToast("Image uploaded", "success");
      } else {
        showToast("Upload failed", "error");
      }
      setIsUploading(false);
    });
    xhr.addEventListener("error", () => {
      showToast("Upload failed", "error");
      setIsUploading(false);
    });
    xhr.open("POST", "https://public.raze.sh/api/upload");
    xhr.send(formData);
  };

  const selectWallet = (privateKey: string): void => {
    if (selectedWallets.includes(privateKey)) return;
    if (selectedWallets.length >= MAX_WALLETS) {
      showToast(`Maximum ${MAX_WALLETS} wallets`, "error");
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

  const addAdditionalToken = (): void => {
    if (additionalTokens.length >= MAX_TOKENS_PER_DEPLOY - 1) return;
    setAdditionalTokens((prev) => [...prev, {
      platform: selectedPlatform,
      pumpType: false,
      pumpMode: "simple",
      bonkType: "meme",
      bonkMode: "simple",
      meteoraDBCMode: "simple",
      meteoraDBCConfigAddress: METEORA_DBC_CONFIGS.standard,
      meteoraCPAMMConfigAddress: METEORA_CPAMM_CONFIGS.standard,
      meteoraCPAMMInitialLiquidity: "1",
      meteoraCPAMMInitialTokenPercent: "80",
    }]);
  };

  const removeAdditionalToken = (index: number): void => {
    setAdditionalTokens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCopy = async (text: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showToast("Copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeploy = async (): Promise<void> => {
    if (!canDeploy) return;

    setIsSubmitting(true);
    const hasMultiple = additionalTokens.length > 0;
    setIsMultiDeploying(hasMultiple);

    const buildWallets = (keys: string[], amounts: Record<string, string>): WalletForCreate[] =>
      keys.map((pk) => {
        const w = wallets.find((x) => x.privateKey === pk);
        if (!w) throw new Error("Wallet not found");
        return { address: w.address, privateKey: pk, amount: parseFloat(amounts[pk]) || 0.1 };
      });

    const buildConfig = (platform: PlatformType, settings: Partial<AdditionalToken>): CreateConfig => {
      const isAdv = (platform === "pumpfun" && settings.pumpMode === "advanced") ||
        (platform === "bonk" && settings.bonkMode === "advanced") ||
        (platform === "meteoraDBC" && settings.meteoraDBCMode === "advanced");

      return createDeployConfig({
        platform,
        token: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          description: tokenData.description || undefined,
          imageUrl: tokenData.imageUrl,
          twitter: tokenData.twitter || undefined,
          telegram: tokenData.telegram || undefined,
          website: tokenData.website || undefined,
        },
        pumpType: platform === "pumpfun" ? settings.pumpType : undefined,
        pumpAdvanced: platform === "pumpfun" ? isAdv : undefined,
        bonkType: platform === "bonk" ? settings.bonkType : undefined,
        bonkAdvanced: platform === "bonk" ? isAdv : undefined,
        bonkConfig: platform === "bonk" ? { jitoTipAmountSOL: getJitoTipFromSettings() } : undefined,
        meteoraDBCConfig: platform === "meteoraDBC" ? {
          configAddress: settings.meteoraDBCConfigAddress || METEORA_DBC_CONFIGS.standard,
          jitoTipAmountSOL: getJitoTipFromSettings(),
        } : undefined,
        meteoraCPAMMConfig: platform === "meteoraCPAMM" ? {
          configAddress: settings.meteoraCPAMMConfigAddress || METEORA_CPAMM_CONFIGS.standard,
          jitoTipAmountSOL: getJitoTipFromSettings(),
          initialLiquiditySOL: parseFloat(settings.meteoraCPAMMInitialLiquidity || "1") || 1,
          initialTokenPercent: parseFloat(settings.meteoraCPAMMInitialTokenPercent || "80") || 80,
        } : undefined,
      });
    };

    try {
      const deployments = [
        { wallets: buildWallets(selectedWallets, walletAmounts), config: buildConfig(selectedPlatform, { pumpType, pumpMode, bonkType, bonkMode, meteoraDBCMode, meteoraDBCConfigAddress, meteoraCPAMMConfigAddress, meteoraCPAMMInitialLiquidity, meteoraCPAMMInitialTokenPercent }) },
        ...additionalTokens.map((t, i) => ({
          wallets: useSharedWallets ? buildWallets(selectedWallets, walletAmounts) : buildWallets(additionalWalletConfigs[i]?.wallets || selectedWallets, additionalWalletConfigs[i]?.amounts || walletAmounts),
          config: buildConfig(t.platform, t),
        })),
      ];

      if (deployments.length === 1) {
        const result = await executeCreate(deployments[0].wallets, deployments[0].config);
        if (result.success && result.mintAddress) {
          setDeployedMintAddress(result.mintAddress);
          setTokenData({ name: "", symbol: "", description: "", imageUrl: "", twitter: "", telegram: "", website: "" });
          setSelectedWallets([]);
          setWalletAmounts({});
          setIsConfirmed(false);
          void refreshBalances();
        } else {
          throw new Error(result.error || "Deployment failed");
        }
      } else {
        setDeploymentProgress(deployments.map((_, i) => ({ tokenIndex: i, status: "pending" })));
        for (let i = 0; i < deployments.length; i++) {
          setDeploymentProgress((prev) => prev.map((p, idx) => idx === i ? { ...p, status: "deploying" } : p));
          try {
            const result = await executeCreate(deployments[i].wallets, deployments[i].config);
            setDeploymentProgress((prev) => prev.map((p, idx) => idx === i ? { ...p, status: result.success ? "success" : "failed", mintAddress: result.mintAddress, error: result.error } : p));
          } catch (err) {
            setDeploymentProgress((prev) => prev.map((p, idx) => idx === i ? { ...p, status: "failed", error: err instanceof Error ? err.message : String(err) } : p));
          }
          if (i < deployments.length - 1) await new Promise((r) => setTimeout(r, DELAY_BETWEEN_DEPLOYS_MS));
        }
        void refreshBalances();
      }
    } catch (err) {
      showToast(`Deploy failed: ${err instanceof Error ? err.message : String(err)}`, "error");
      setIsMultiDeploying(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = (): void => {
    setDeployedMintAddress(null);
    setDeploymentProgress([]);
    setIsMultiDeploying(false);
    setAdditionalTokens([]);
    setTokenData({ name: "", symbol: "", description: "", imageUrl: "", twitter: "", telegram: "", website: "" });
    setSelectedWallets([]);
    setWalletAmounts({});
    setIsConfirmed(false);
  };

  const getWallet = (pk: string): WalletType | undefined => wallets.find((w) => w.privateKey === pk);

  // ========== TAB CONTENT RENDERERS ==========

  const renderPlatformTab = (): JSX.Element => (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-app-primary-20">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
          <Zap size={24} className="color-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-app-primary font-mono">Platform Selection</h2>
          <p className="text-xs text-app-secondary-60 font-mono">Choose where to launch your token</p>
        </div>
      </div>

      {/* Primary Platform */}
      <div>
        <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
          Primary Platform
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlatform(p.id)}
              className={`group relative p-5 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden ${
                selectedPlatform === p.id
                  ? "border-app-primary-color bg-app-primary-color/10 shadow-[0_0_20px_rgba(2,179,109,0.2)]"
                  : "border-app-primary-20 bg-app-tertiary/50 hover:border-app-primary-40 hover:bg-app-tertiary"
              }`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-app-primary-color/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-app-quaternary flex items-center justify-center [&>svg]:w-8 [&>svg]:h-8 group-hover:scale-110 transition-transform">
                  {PlatformIcons[p.id]}
                </div>
                <div className="flex-1">
                  <div className={`text-base font-bold font-mono ${selectedPlatform === p.id ? "color-primary" : "text-app-primary"}`}>
                    {p.name}
                  </div>
                  <div className="text-xs font-mono text-app-secondary-40 mt-0.5">{p.desc}</div>
                </div>
                {selectedPlatform === p.id && (
                  <div className="w-6 h-6 rounded-full bg-app-primary-color flex items-center justify-center">
                    <Check size={14} className="text-black" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Mode Toggle */}
      {(selectedPlatform === "pumpfun" || selectedPlatform === "bonk" || selectedPlatform === "meteoraDBC") && (
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-app-tertiary to-app-quaternary border border-app-primary-20 hover:border-app-primary-40 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-app-primary-color/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-app-primary-color/10 border border-app-primary-color/20 flex items-center justify-center">
                <Shield size={20} className="color-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-app-primary font-mono">Advanced Mode</div>
                <div className="text-xs text-app-secondary-60 font-mono mt-0.5">Up to 20 wallets bundle deployment</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (selectedPlatform === "pumpfun") setPumpMode((m) => m === "simple" ? "advanced" : "simple");
                if (selectedPlatform === "bonk") setBonkMode((m) => m === "simple" ? "advanced" : "simple");
                if (selectedPlatform === "meteoraDBC") setMeteoraDBCMode((m) => m === "simple" ? "advanced" : "simple");
              }}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                (selectedPlatform === "pumpfun" && pumpMode === "advanced") ||
                (selectedPlatform === "bonk" && bonkMode === "advanced") ||
                (selectedPlatform === "meteoraDBC" && meteoraDBCMode === "advanced")
                  ? "bg-app-primary-color shadow-[0_0_15px_rgba(2,179,109,0.4)]"
                  : "bg-app-quaternary border border-app-primary-30"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                  (selectedPlatform === "pumpfun" && pumpMode === "advanced") ||
                  (selectedPlatform === "bonk" && bonkMode === "advanced") ||
                  (selectedPlatform === "meteoraDBC" && meteoraDBCMode === "advanced")
                    ? "left-8"
                    : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Platform-Specific Advanced Settings */}
      {selectedPlatform === "pumpfun" && (
        <div className="p-5 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Settings size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-app-primary font-mono">Platform Settings</p>
              <p className="text-[10px] text-app-secondary-40 font-mono">Pump.fun specific options</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
                {PlatformIcons.pumpfun}
              </div>
              <div>
                <p className="text-sm font-bold text-app-primary font-mono">Mayhem Mode</p>
                <p className="text-xs text-app-secondary-40 font-mono">Enhanced token type with special features</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPumpType(!pumpType)}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                pumpType ? "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "bg-app-quaternary border border-app-primary-30"
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${pumpType ? "left-8" : "left-1"}`} />
            </button>
          </div>
        </div>
      )}

      {selectedPlatform === "bonk" && (
        <div className="p-5 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Settings size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-app-primary font-mono">Platform Settings</p>
              <p className="text-[10px] text-app-secondary-40 font-mono">Bonk.fun specific options</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
            Token Category
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "meme", label: "Meme", icon: "🐕", desc: "Fun & community tokens" },
              { value: "tech", label: "Tech", icon: "⚡", desc: "Utility & infrastructure" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBonkType(opt.value as "meme" | "tech")}
                className={`group relative p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden ${
                  bonkType === opt.value
                    ? "border-orange-500/50 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.15)]"
                    : "border-app-primary-20 bg-app-tertiary/50 hover:border-app-primary-40 hover:bg-app-tertiary"
                }`}
              >
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{opt.icon}</span>
                    {bonkType === opt.value && (
                      <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                        <Check size={12} className="text-black" />
                      </div>
                    )}
                  </div>
                  <div className={`text-sm font-bold font-mono ${bonkType === opt.value ? "text-orange-400" : "text-app-primary"}`}>
                    {opt.label}
                  </div>
                  <div className="text-[10px] font-mono text-app-secondary-40 mt-1">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedPlatform === "meteoraDBC" && (
        <div className="p-5 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Settings size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-app-primary font-mono">Platform Settings</p>
              <p className="text-[10px] text-app-secondary-40 font-mono">Meteora DBC specific options</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
            Pool Config Address
          </label>
          <input
            type="text"
            value={meteoraDBCConfigAddress}
            onChange={(e) => setMeteoraDBCConfigAddress(e.target.value)}
            placeholder={METEORA_DBC_CONFIGS.standard}
            className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none font-mono transition-all"
          />
          <p className="text-[10px] text-app-secondary-40 font-mono mt-2">
            Leave default for standard configuration or enter custom pool config
          </p>
        </div>
      )}

      {selectedPlatform === "meteoraCPAMM" && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Settings size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-app-primary font-mono">Platform Settings</p>
                <p className="text-[10px] text-app-secondary-40 font-mono">Meteora CPAMM specific options</p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
              Pool Config Address
            </label>
            <input
              type="text"
              value={meteoraCPAMMConfigAddress}
              onChange={(e) => setMeteoraCPAMMConfigAddress(e.target.value)}
              placeholder={METEORA_CPAMM_CONFIGS.standard}
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none font-mono transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
              <label className="text-[10px] text-app-secondary-40 font-mono uppercase mb-2 block">Initial Liquidity</label>
              <div className="relative">
                <input
                  type="text"
                  value={meteoraCPAMMInitialLiquidity}
                  onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setMeteoraCPAMMInitialLiquidity(e.target.value)}
                  placeholder="1"
                  className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-blue-500 focus:outline-none font-mono"
                />
                <span className="absolute right-4 top-3 text-xs text-app-secondary-40 font-mono">SOL</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
              <label className="text-[10px] text-app-secondary-40 font-mono uppercase mb-2 block">Token % for Pool</label>
              <div className="relative">
                <input
                  type="text"
                  value={meteoraCPAMMInitialTokenPercent}
                  onChange={(e) => {
                    if (/^\d*\.?\d*$/.test(e.target.value)) {
                      const val = parseFloat(e.target.value);
                      if (isNaN(val) || (val >= 0 && val <= 100)) setMeteoraCPAMMInitialTokenPercent(e.target.value);
                    }
                  }}
                  placeholder="80"
                  className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-blue-500 focus:outline-none font-mono"
                />
                <span className="absolute right-4 top-3 text-xs text-app-secondary-40 font-mono">%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Deploy Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono uppercase tracking-wider">
            <Layers size={14} className="text-cyan-400" />
            Additional Platforms ({additionalTokens.length}/{MAX_TOKENS_PER_DEPLOY - 1})
          </label>
        </div>

        {/* Additional Platforms */}
        {additionalTokens.map((token, i) => (
          <div key={i} className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-app-quaternary flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6">
                  {PlatformIcons[token.platform]}
                </div>
                <div>
                  <p className="text-sm font-bold text-app-primary font-mono">{PLATFORMS.find((p) => p.id === token.platform)?.name}</p>
                  <p className="text-[10px] text-app-secondary-40 font-mono">Same token, different platform</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={token.platform}
                  onChange={(e) => {
                    const updated = [...additionalTokens];
                    updated[i] = { ...updated[i], platform: e.target.value as PlatformType };
                    setAdditionalTokens(updated);
                  }}
                  className="bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-sm text-app-primary focus:outline-none font-mono"
                >
                  {PLATFORMS.filter((p) => p.id !== selectedPlatform && !additionalTokens.some((t, j) => j !== i && t.platform === p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removeAdditionalToken(i)} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors">
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add Platform Button */}
        {additionalTokens.length < MAX_TOKENS_PER_DEPLOY - 1 && (
          <button
            type="button"
            onClick={addAdditionalToken}
            className="w-full p-5 rounded-xl border-2 border-dashed border-app-primary-20 hover:border-cyan-500/50 flex items-center justify-center gap-3 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-app-tertiary flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
              <PlusCircle size={20} className="text-app-secondary-40 group-hover:text-cyan-400" />
            </div>
            <span className="text-sm text-app-secondary-40 group-hover:text-cyan-400 font-mono">Add Another Platform</span>
          </button>
        )}
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-app-primary-color/5 to-transparent border border-app-primary-color/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-app-primary-color/20 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="color-primary" />
          </div>
          <div>
            <p className="text-sm text-app-primary font-mono font-medium">
              {additionalTokens.length > 0 ? `Multi-Platform Deploy (${1 + additionalTokens.length} platforms)` : `${PLATFORMS.find((p) => p.id === selectedPlatform)?.name} Selected`}
            </p>
            <p className="text-xs text-app-secondary-60 font-mono mt-1">
              {additionalTokens.length > 0
                ? "Deploy the same token across multiple platforms sequentially. Each deployment will use the same metadata and wallet configuration."
                : selectedPlatform === "pumpfun" ? "Launch on the most popular bonding curve platform. Automatic liquidity migration at graduation."
                : selectedPlatform === "bonk" ? "Launch with Bonk's integrated trading bot ecosystem. MEV protected trading."
                : selectedPlatform === "meteoraDBC" ? "Dynamic bonding curve with customizable parameters. Professional token launches."
                : "Constant product AMM with concentrated liquidity. Best for stable trading pairs."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTokenTab = (): JSX.Element => (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-app-primary-20">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 flex items-center justify-center">
          <Sparkles size={24} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-app-primary font-mono">Token Details</h2>
          <p className="text-xs text-app-secondary-60 font-mono">Configure your token metadata</p>
        </div>
      </div>

      {/* Name & Symbol */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
          <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
            Token Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={tokenData.name}
            onChange={(e) => setTokenData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="My Token"
            className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 focus:outline-none font-mono transition-all"
          />
        </div>
        <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
          <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
            Symbol <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={tokenData.symbol}
            onChange={(e) => setTokenData((prev) => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
            placeholder="TOKEN"
            className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 focus:outline-none font-mono transition-all"
          />
        </div>
      </div>

      {/* Description */}
      <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
        <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
          Description
        </label>
        <textarea
          value={tokenData.description}
          onChange={(e) => setTokenData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe your token..."
          rows={3}
          className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 focus:outline-none font-mono transition-all resize-none"
        />
      </div>

      {/* Image Upload */}
      <div className="p-5 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
        <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-4 uppercase tracking-wider">
          <Image size={14} className="text-purple-400" />
          Logo Image <span className="text-red-400">*</span>
        </label>
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        <div className="flex items-center gap-4">
          {tokenData.imageUrl ? (
            <div className="relative group">
              <img src={tokenData.imageUrl} alt="Token" className="w-20 h-20 rounded-xl object-cover border-2 border-purple-500/50" />
              <button
                type="button"
                onClick={() => setTokenData((prev) => ({ ...prev, imageUrl: "" }))}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-app-primary-30 hover:border-purple-500 flex flex-col items-center justify-center gap-1 transition-colors bg-app-quaternary/50"
            >
              {isUploading ? (
                <RefreshCw size={20} className="text-purple-400 animate-spin" />
              ) : (
                <Upload size={20} className="text-app-secondary-40" />
              )}
              <span className="text-[10px] text-app-secondary-40 font-mono">{isUploading ? `${uploadProgress}%` : "Upload"}</span>
            </button>
          )}
          <div className="flex-1">
            <p className="text-xs text-app-secondary-60 font-mono mb-1">Supported: JPEG, PNG, GIF, SVG</p>
            <p className="text-[10px] text-app-secondary-40 font-mono">Max size: 2MB</p>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono uppercase tracking-wider">
          <Globe size={14} className="text-blue-400" />
          Social Links
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
            <label className="flex items-center gap-1 text-[10px] text-app-secondary-40 font-mono mb-2 uppercase">
              <Twitter size={10} /> Twitter
            </label>
            <input
              type="text"
              value={tokenData.twitter}
              onChange={(e) => setTokenData((prev) => ({ ...prev, twitter: e.target.value }))}
              placeholder="https://x.com/..."
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-sm text-app-primary focus:border-blue-500 focus:outline-none font-mono transition-all"
            />
          </div>
          <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
            <label className="flex items-center gap-1 text-[10px] text-app-secondary-40 font-mono mb-2 uppercase">
              <Send size={10} /> Telegram
            </label>
            <input
              type="text"
              value={tokenData.telegram}
              onChange={(e) => setTokenData((prev) => ({ ...prev, telegram: e.target.value }))}
              placeholder="https://t.me/..."
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-sm text-app-primary focus:border-blue-500 focus:outline-none font-mono transition-all"
            />
          </div>
          <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
            <label className="flex items-center gap-1 text-[10px] text-app-secondary-40 font-mono mb-2 uppercase">
              <Globe size={10} /> Website
            </label>
            <input
              type="text"
              value={tokenData.website}
              onChange={(e) => setTokenData((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-sm text-app-primary focus:border-blue-500 focus:outline-none font-mono transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderWalletsTab = (): JSX.Element => (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-app-primary-20">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 flex items-center justify-center">
          <Wallet size={24} className="text-orange-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-app-primary font-mono">Wallet Selection</h2>
          <p className="text-xs text-app-secondary-60 font-mono">
            Select wallets for initial buys ({selectedWallets.length}/{MAX_WALLETS})
          </p>
        </div>
      </div>

      {/* Selected Wallets */}
      {selectedWallets.length > 0 && (
        <div className="p-5 rounded-xl bg-gradient-to-br from-app-tertiary to-app-quaternary/50 border border-app-primary-20">
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono uppercase tracking-wider">
              Selected Wallets
            </label>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-app-secondary-40 font-mono">Set all:</span>
              <input
                type="text"
                placeholder="0.1"
                className="w-16 bg-app-quaternary border border-app-primary-30 rounded-lg px-2 py-1 text-xs text-app-primary text-center focus:border-orange-500 focus:outline-none font-mono"
                onChange={(e) => setAllAmounts(e.target.value)}
              />
              <button
                type="button"
                onClick={() => { setSelectedWallets([]); setWalletAmounts({}); }}
                className="text-[10px] text-red-400 font-mono hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {selectedWallets.map((pk, i) => {
              const w = getWallet(pk);
              const balance = w ? baseCurrencyBalances.get(w.address) || 0 : 0;
              return (
                <div key={pk} className="flex items-center gap-3 p-3 rounded-xl bg-app-quaternary/50 border border-orange-500/20">
                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => moveWallet(i, "up")} disabled={i === 0} className={`p-0.5 rounded ${i === 0 ? "opacity-30" : "hover:bg-app-tertiary"}`}>
                      <ArrowUp size={10} className="text-app-secondary-40" />
                    </button>
                    <button type="button" onClick={() => moveWallet(i, "down")} disabled={i === selectedWallets.length - 1} className={`p-0.5 rounded ${i === selectedWallets.length - 1 ? "opacity-30" : "hover:bg-app-tertiary"}`}>
                      <ArrowDown size={10} className="text-app-secondary-40" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${i === 0 ? "bg-yellow-500/20 text-yellow-400" : "bg-app-tertiary text-app-secondary-40"}`}>
                        {i === 0 ? "CREATOR" : `#${i + 1}`}
                      </span>
                      <span className="text-sm font-medium text-app-primary font-mono truncate">{w ? getWalletDisplayName(w) : "Unknown"}</span>
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
                        className="w-20 bg-app-tertiary border border-app-primary-30 rounded-lg pl-6 pr-2 py-2 text-sm text-app-primary text-right focus:border-orange-500 focus:outline-none font-mono"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-app-secondary-40">◎</span>
                    </div>
                    <button type="button" onClick={() => removeWallet(pk)} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors">
                      <X size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Wallets */}
      {selectedWallets.length < MAX_WALLETS && (
        <div className="p-5 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-secondary-40" />
              <input
                type="text"
                value={walletSearch}
                onChange={(e) => setWalletSearch(e.target.value)}
                placeholder="Search wallets..."
                className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg pl-9 pr-4 py-2 text-sm text-app-primary placeholder:text-app-secondary-40 focus:border-orange-500 focus:outline-none font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => setWalletSort((s) => s === "balance" ? "name" : "balance")}
              className="px-3 py-2 rounded-lg bg-app-quaternary border border-app-primary-30 text-xs text-app-secondary-60 hover:border-app-primary-40 transition-colors font-mono"
            >
              {walletSort === "balance" ? "By Balance" : "By Name"}
            </button>
            <button
              type="button"
              onClick={() => {
                const toSelect = filteredWallets.slice(0, MAX_WALLETS - selectedWallets.length);
                setSelectedWallets((prev) => [...prev, ...toSelect.map((w) => w.privateKey)]);
                const amounts: Record<string, string> = { ...walletAmounts };
                toSelect.forEach((w) => { if (!amounts[w.privateKey]) amounts[w.privateKey] = "0.1"; });
                setWalletAmounts(amounts);
              }}
              className="px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-xs text-orange-400 hover:bg-orange-500/20 transition-colors font-mono"
            >
              Add All
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-1">
            {filteredWallets.map((w) => {
              const balance = baseCurrencyBalances.get(w.address) || 0;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => selectWallet(w.privateKey)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-app-quaternary/50 border border-transparent hover:border-orange-500/30 hover:bg-app-quaternary transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-app-tertiary flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                    <Plus size={14} className="text-app-secondary-40 group-hover:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-app-primary font-mono truncate">{getWalletDisplayName(w)}</p>
                    <p className="text-[10px] text-app-secondary-40 font-mono">{w.address.slice(0, 8)}...{w.address.slice(-6)}</p>
                  </div>
                  <span className="text-sm font-medium text-orange-400 font-mono">{balance.toFixed(4)} SOL</span>
                </button>
              );
            })}
            {filteredWallets.length === 0 && (
              <p className="text-center py-8 text-sm text-app-secondary-40 font-mono">No wallets found</p>
            )}
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/5 to-transparent border border-orange-500/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-orange-400" />
          </div>
          <div>
            <p className="text-sm text-app-primary font-mono font-medium">Wallet Order Matters</p>
            <p className="text-xs text-app-secondary-60 font-mono mt-1">
              The first wallet will be the token creator. Reorder wallets using the arrows to change buy sequence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );



  const renderTabContent = (): JSX.Element | null => {
    switch (activeTab) {
      case "platform": return renderPlatformTab();
      case "token": return renderTokenTab();
      case "wallets": return renderWalletsTab();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-app-primary text-app-tertiary flex flex-col">
      <HorizontalHeader />

      {/* Success Modal */}
      {deployedMintAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-app-secondary border border-app-primary-30 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in-down">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 flex items-center justify-center">
                <CheckCircle size={40} className="text-emerald-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-center text-app-primary font-mono mb-2">TOKEN DEPLOYED</h2>
            <p className="text-xs text-center text-app-secondary-60 font-mono mb-6">
              Successfully launched on {PLATFORMS.find((p) => p.id === selectedPlatform)?.name}
            </p>
            <div className="bg-app-tertiary/50 rounded-xl p-4 mb-6 border border-app-primary-20">
              <p className="text-[10px] text-app-secondary-40 font-mono uppercase tracking-wider mb-2">Token Address</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-app-primary font-mono break-all">{deployedMintAddress}</code>
                <button onClick={() => void handleCopy(deployedMintAddress)} className="p-2 rounded-lg bg-app-quaternary hover:bg-app-primary-color/20 transition-colors">
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-app-secondary-60" />}
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-3 rounded-xl bg-app-tertiary text-app-primary font-mono font-medium hover:bg-app-quaternary transition-colors border border-app-primary-20">
                Deploy Another
              </button>
              <button onClick={() => navigate(`/tokens/${deployedMintAddress}`)} className="flex-1 py-3 rounded-xl bg-app-primary-color text-black font-mono font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-app-primary-color/30 transition-all">
                View Token <ExternalLink size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Deploy Modal */}
      {isMultiDeploying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-app-secondary border border-app-primary-30 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              {isSubmitting ? (
                <RefreshCw size={24} className="color-primary animate-spin" />
              ) : (
                <CheckCircle size={24} className="text-emerald-400" />
              )}
              <h2 className="text-lg font-bold text-app-primary font-mono">
                {isSubmitting ? "DEPLOYING..." : `${deploymentProgress.filter((p) => p.status === "success").length}/${deploymentProgress.length} DEPLOYED`}
              </h2>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {deploymentProgress.map((item, i) => {
                const platform = i === 0 ? selectedPlatform : additionalTokens[i - 1]?.platform;
                return (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${
                    item.status === "deploying" ? "border-app-primary-color bg-app-primary-color/10" :
                    item.status === "success" ? "border-emerald-500/30 bg-emerald-500/5" :
                    item.status === "failed" ? "border-red-500/30 bg-red-500/5" :
                    "border-app-primary-20 bg-app-tertiary/50"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-app-quaternary flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
                        {PlatformIcons[platform]}
                      </div>
                      <span className="text-sm font-medium text-app-primary font-mono">{PLATFORMS.find((p) => p.id === platform)?.name}</span>
                    </div>
                    {item.status === "deploying" && <RefreshCw size={16} className="color-primary animate-spin" />}
                    {item.status === "success" && <CheckCircle size={16} className="text-emerald-400" />}
                    {item.status === "failed" && <X size={16} className="text-red-400" />}
                    {item.status === "pending" && <span className="text-xs text-app-secondary-40 font-mono">WAITING</span>}
                  </div>
                );
              })}
            </div>
            {!isSubmitting && (
              <button onClick={resetForm} className="w-full mt-6 py-3 rounded-xl bg-app-primary-color text-black font-mono font-bold hover:shadow-lg transition-all">
                DONE
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden w-full pt-16 bg-app-primary">
        {/* Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-app-primary opacity-90">
            <div className="absolute inset-0 bg-gradient-to-b from-app-primary-05 to-transparent" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(rgba(2, 179, 109, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(2, 179, 109, 0.03) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            />
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="mb-6 flex flex-wrap items-center gap-4 justify-between pb-4 border-b border-app-primary-20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-app-primary-color/30 to-app-primary-color/10 border border-app-primary-color/40 flex items-center justify-center shadow-[0_0_30px_rgba(2,179,109,0.2)]">
                <Rocket size={28} className="color-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-app-primary font-mono tracking-wide">DEPLOY TOKEN</h1>
                <p className="text-xs text-app-secondary-60 font-mono">Launch your token across multiple platforms</p>
              </div>
            </div>

            {/* Quick Status */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-6 px-4 py-2 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
                <div className="text-center">
                  <div className="text-xs font-mono color-primary font-bold">{PLATFORMS.find((p) => p.id === selectedPlatform)?.name.toUpperCase()}</div>
                  <div className="text-[10px] text-app-secondary-40 font-mono">PLATFORM</div>
                </div>
                <div className="w-px h-8 bg-app-primary-20" />
                <div className="text-center">
                  <div className="text-xs font-mono color-primary font-bold">{selectedWallets.length}</div>
                  <div className="text-[10px] text-app-secondary-40 font-mono">WALLETS</div>
                </div>
                <div className="w-px h-8 bg-app-primary-20" />
                <div className="text-center">
                  <div className={`text-xs font-mono font-bold ${isAdvancedMode ? "color-primary" : "text-app-secondary-60"}`}>
                    {isAdvancedMode ? "ADV" : "STD"}
                  </div>
                  <div className="text-[10px] text-app-secondary-40 font-mono">MODE</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout */}
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Sidebar Tabs */}
            <div className="xl:w-56 flex-shrink-0">
              <div className="xl:sticky xl:top-6 space-y-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-sm transition-all duration-200 group ${
                      activeTab === tab.id
                        ? "bg-app-primary-color text-black font-bold shadow-[0_0_20px_rgba(2,179,109,0.3)]"
                        : "bg-app-tertiary/50 hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary-40 text-app-primary"
                    }`}
                  >
                    <span className={`${activeTab === tab.id ? "text-black" : "color-primary group-hover:text-app-primary-light"} transition-colors`}>
                      {tab.icon}
                    </span>
                    <div className="text-left">
                      <div className="font-bold">{tab.label}</div>
                      <div className={`text-[10px] ${activeTab === tab.id ? "text-black/60" : "text-app-secondary-40"}`}>
                        {tab.description}
                      </div>
                    </div>
                    {activeTab === tab.id && (
                      <ChevronRight size={16} className="ml-auto text-black" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              <div className="bg-app-secondary/80 backdrop-blur-sm rounded-2xl border border-app-primary-20 p-6 shadow-xl">
                {renderTabContent()}
              </div>
            </div>

            {/* Preview & Deploy Card - Right Sidebar */}
            <div className="xl:w-96 flex-shrink-0 order-first xl:order-last">
              <div className="xl:sticky xl:top-6 bg-app-secondary/80 backdrop-blur-sm rounded-2xl border border-app-primary-20 overflow-hidden shadow-xl">
                <div className="px-5 py-3 border-b border-app-primary-20 bg-app-tertiary/30 flex items-center gap-2">
                  <Eye size={14} className="text-app-secondary-40" />
                  <span className="text-xs font-medium text-app-secondary-40 font-mono uppercase tracking-wider">Deploy Preview</span>
                </div>

                <div className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    {tokenData.imageUrl ? (
                      <img src={tokenData.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-app-primary-color/30" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-transparent border border-dashed border-app-primary-30 flex items-center justify-center">
                        <Image size={18} className="text-app-secondary-40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-app-primary font-mono truncate">{tokenData.name || "Token Name"}</h3>
                      <p className="text-sm text-app-secondary-60 font-mono">${tokenData.symbol || "SYMBOL"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="[&>svg]:w-5 [&>svg]:h-5">{PlatformIcons[selectedPlatform]}</div>
                      <span className="text-xs font-mono text-app-secondary-60">{PLATFORMS.find((p) => p.id === selectedPlatform)?.name}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
                      <p className="text-[10px] text-app-secondary-40 font-mono uppercase mb-1">Wallets</p>
                      <p className="text-sm font-bold text-app-primary font-mono">{selectedWallets.length}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
                      <p className="text-[10px] text-app-secondary-40 font-mono uppercase mb-1">Total Buy</p>
                      <p className="text-sm font-bold color-primary font-mono">{totalAmount.toFixed(4)} SOL</p>
                    </div>
                    <div className="p-3 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
                      <p className="text-[10px] text-app-secondary-40 font-mono uppercase mb-1">Platforms</p>
                      <p className="text-sm font-bold text-app-primary font-mono">{1 + additionalTokens.length}</p>
                    </div>
                  </div>

                  {/* Validation Messages */}
                  {(!tokenData.name || !tokenData.symbol || !tokenData.imageUrl || selectedWallets.length === 0) && (
                    <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
                      <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-400 font-mono">
                        {!tokenData.name && "Name required. "}
                        {!tokenData.symbol && "Symbol required. "}
                        {!tokenData.imageUrl && "Logo required. "}
                        {selectedWallets.length === 0 && "Select at least one wallet."}
                      </p>
                    </div>
                  )}

                  {/* Confirmation */}
                  <label className="flex items-start gap-3 mb-4 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setIsConfirmed(!isConfirmed)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        isConfirmed ? "bg-app-primary-color border-app-primary-color" : "border-app-primary-30 hover:border-app-primary-color"
                      }`}
                    >
                      {isConfirmed && <Check size={12} className="text-black" />}
                    </button>
                    <span className="text-xs text-app-secondary-60 font-mono leading-relaxed">
                      I confirm deployment of <span className="text-app-primary font-medium">{tokenData.name || "this token"}</span> on <span className="color-primary font-medium">{PLATFORMS.find((p) => p.id === selectedPlatform)?.name}</span>
                      {additionalTokens.length > 0 && <> and {additionalTokens.length} additional platform{additionalTokens.length > 1 ? "s" : ""}</>}.
                      This action cannot be undone.
                    </span>
                  </label>

                  {/* Deploy Button */}
                  <button
                    type="button"
                    onClick={() => void handleDeploy()}
                    disabled={!canDeploy || isSubmitting}
                    className={`group relative w-full py-4 rounded-xl font-mono font-bold flex items-center justify-center gap-3 text-sm transition-all duration-300 overflow-hidden ${
                      canDeploy && !isSubmitting
                        ? "bg-app-primary-color hover:bg-app-primary-dark text-black shadow-[0_0_20px_rgba(2,179,109,0.4)] hover:shadow-[0_0_30px_rgba(2,179,109,0.6)]"
                        : "bg-app-tertiary text-app-secondary-40 cursor-not-allowed border border-app-primary-20"
                    }`}
                  >
                    {canDeploy && !isSubmitting && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    )}
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        DEPLOYING...
                      </>
                    ) : (
                      <>
                        <Rocket size={18} />
                        {additionalTokens.length > 0 ? `DEPLOY ON ${1 + additionalTokens.length} PLATFORMS` : "DEPLOY TOKEN"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeployPage;
