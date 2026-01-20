import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts";
import { HorizontalHeader } from "../components/HorizontalHeader";
import {
  PlusCircle,
  X,
  CheckCircle,
  Info,
  Search,
  ChevronRight,
  ChevronLeft,
  Settings,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Upload,
  RefreshCw,
  Copy,
  ExternalLink,
} from "lucide-react";
import { getWalletDisplayName } from "../utils/wallet";
import type { WalletType } from "../utils/types";
import { useToast } from "../utils/hooks";
import {
  executeCreate,
  createDeployConfig,
  type WalletForCreate,
  type MeteoraDBCConfig,
  METEORA_DBC_CONFIGS,
  type MeteoraCPAMMConfig,
  METEORA_CPAMM_CONFIGS,
  type BonkConfig,
  type PlatformType,
} from "../utils/create";
import { loadConfigFromCookies } from "../utils/storage";

const STEPS_DEPLOY = ["Platform & Token", "Select Wallets", "Review"];
const MIN_WALLETS = 1;
const MAX_WALLETS_STANDARD = 5;
const MAX_WALLETS_ADVANCED = 20;

interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  twitter: string;
  telegram: string;
  website: string;
}

export const DeployPage: React.FC = () => {
  const {
    wallets: propWallets,
    solBalances,
    refreshBalances,
  } = useAppContext();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPlatform, setSelectedPlatform] =
    useState<PlatformType>("pumpfun");
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Platform-specific options
  const [pumpType, setPumpType] = useState<boolean>(false); // Mayhem mode
  const [pumpMode, setPumpMode] = useState<"simple" | "advanced">("simple"); // Simple (5) or Advanced (20)
  const [bonkType, setBonkType] = useState<"meme" | "tech">("meme");
  const [bonkMode, setBonkMode] = useState<"simple" | "advanced">("simple"); // Simple (5) or Advanced (20)
  const [meteoraDBCMode, setMeteoraDBCMode] = useState<"simple" | "advanced">(
    "simple",
  ); // Simple (5) or Advanced (20)

  // MeteoraDBC-specific options
  const [meteoraDBCConfigAddress, setMeteoraDBCConfigAddress] =
    useState<string>(METEORA_DBC_CONFIGS.standard);

  // MeteoraCPAMM-specific options
  const [meteoraCPAMMConfigAddress, setMeteoraCPAMMConfigAddress] =
    useState<string>(METEORA_CPAMM_CONFIGS.standard);
  const [meteoraCPAMMInitialLiquidity, setMeteoraCPAMMInitialLiquidity] =
    useState<string>("1");
  const [meteoraCPAMMInitialTokenPercent, setMeteoraCPAMMInitialTokenPercent] =
    useState<string>("80");

  // Get Jito tip from cookies settings (transactionFee is in lamports)
  const getJitoTipFromSettings = (): number => {
    const appConfig = loadConfigFromCookies();
    if (appConfig?.transactionFee) {
      // Convert from lamports to SOL
      return parseFloat(appConfig.transactionFee) / 1e9;
    }
    return 0.001; // Default tip
  };

  // MAX_WALLETS depends on platform and mode:
  // - Pump.fun Simple: 5 wallets max, Pump.fun Advanced: 20 wallets max
  // - Bonk.fun Simple: 5 wallets max, Bonk.fun Advanced: 20 wallets max
  // - MeteoraDBC Simple: 5 wallets max (single bundle)
  // - MeteoraDBC Advanced: 20 wallets max (multi-stage with LUT)
  // - MeteoraCPAMM: 20 wallets max (can use multi-stage with LUT)
  const MAX_WALLETS = (() => {
    if (selectedPlatform === "pumpfun") {
      return pumpMode === "advanced"
        ? MAX_WALLETS_ADVANCED
        : MAX_WALLETS_STANDARD;
    }
    if (selectedPlatform === "bonk") {
      return bonkMode === "advanced"
        ? MAX_WALLETS_ADVANCED
        : MAX_WALLETS_STANDARD;
    }
    if (selectedPlatform === "meteoraDBC") {
      return meteoraDBCMode === "advanced"
        ? MAX_WALLETS_ADVANCED
        : MAX_WALLETS_STANDARD;
    }
    if (selectedPlatform === "meteoraCPAMM") {
      return MAX_WALLETS_ADVANCED;
    }
    return MAX_WALLETS_STANDARD;
  })();
  const isPumpAdvancedMode =
    selectedPlatform === "pumpfun" && pumpMode === "advanced";
  const isBonkAdvancedMode =
    selectedPlatform === "bonk" && bonkMode === "advanced";
  const isMeteoraDBCAdvancedMode =
    selectedPlatform === "meteoraDBC" && meteoraDBCMode === "advanced";
  const isMeteoraCPAMMMode = selectedPlatform === "meteoraCPAMM";
  const isAdvancedMode =
    isPumpAdvancedMode ||
    isBonkAdvancedMode ||
    isMeteoraDBCAdvancedMode ||
    (isMeteoraCPAMMMode && selectedWallets.length > MAX_WALLETS_STANDARD);

  // Success state
  const [deployedMintAddress, setDeployedMintAddress] = useState<string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

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

  // Wallet amounts
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>(
    {},
  );

  // Filter/sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("balance");
  const [sortDirection, setSortDirection] = useState("desc");
  const [balanceFilter, setBalanceFilter] = useState("nonZero");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter wallets with SOL balance > 0
  const wallets = propWallets.filter(
    (wallet) => (solBalances.get(wallet.address) || 0) > 0,
  );

  // Reset form when component mounts
  useEffect(() => {
    setCurrentStep(0);
    setSelectedWallets([]);
    setWalletAmounts({});
    setIsConfirmed(false);
  }, []);

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      showToast(
        "Please select a valid image file (JPEG, PNG, GIF, SVG)",
        "error",
      );
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image file size should be less than 2MB", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const baseUrl = "https://public.raze.sh";
      const uploadUrl = `${baseUrl}/api/upload`;

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText) as { url: string };
          setTokenData((prev) => ({ ...prev, imageUrl: response.url }));
          showToast("Image uploaded successfully", "success");
        } else {
          showToast("Failed to upload image", "error");
        }
        setIsUploading(false);
      });

      xhr.addEventListener("error", () => {
        showToast("Failed to upload image", "error");
        setIsUploading(false);
      });

      xhr.open("POST", uploadUrl);
      xhr.send(formData);
    } catch (error) {
      console.error("Error uploading image:", error);
      showToast("Failed to upload image", "error");
      setIsUploading(false);
    }
  };

  const triggerFileInput = (): void => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Filter and sort wallets
  const filterWallets = (
    walletList: WalletType[],
    search: string,
  ): WalletType[] => {
    let filtered = walletList;
    if (search) {
      filtered = filtered.filter(
        (wallet: WalletType) =>
          wallet.address.toLowerCase().includes(search.toLowerCase()) ||
          (wallet.label &&
            wallet.label.toLowerCase().includes(search.toLowerCase())),
      );
    }

    if (balanceFilter !== "all") {
      if (balanceFilter === "nonZero") {
        filtered = filtered.filter(
          (wallet: WalletType) => (solBalances.get(wallet.address) || 0) > 0,
        );
      } else if (balanceFilter === "highBalance") {
        filtered = filtered.filter(
          (wallet: WalletType) => (solBalances.get(wallet.address) || 0) >= 0.1,
        );
      } else if (balanceFilter === "lowBalance") {
        filtered = filtered.filter(
          (wallet: WalletType) =>
            (solBalances.get(wallet.address) || 0) < 0.1 &&
            (solBalances.get(wallet.address) || 0) > 0,
        );
      }
    }

    return filtered.sort((a: WalletType, b: WalletType) => {
      if (sortOption === "address") {
        return sortDirection === "asc"
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (sortOption === "balance") {
        const balanceA = solBalances.get(a.address) || 0;
        const balanceB = solBalances.get(b.address) || 0;
        return sortDirection === "asc"
          ? balanceA - balanceB
          : balanceB - balanceA;
      }
      return 0;
    });
  };

  const handleWalletSelection = (privateKey: string): void => {
    setSelectedWallets((prev) => {
      if (prev.includes(privateKey)) {
        return prev.filter((key) => key !== privateKey);
      }
      if (prev.length >= MAX_WALLETS) {
        showToast(`Maximum ${MAX_WALLETS} wallets can be selected`, "error");
        return prev;
      }
      return [...prev, privateKey];
    });
  };

  const handleAmountChange = (privateKey: string, amount: string): void => {
    if (amount === "" || /^\d*\.?\d*$/.test(amount)) {
      setWalletAmounts((prev) => ({
        ...prev,
        [privateKey]: amount,
      }));
    }
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 0: {
        if (!tokenData.name || !tokenData.symbol || !tokenData.imageUrl) {
          showToast("Name, symbol, and logo image are required", "error");
          return false;
        }
        break;
      }
      case 1: {
        if (selectedWallets.length < MIN_WALLETS) {
          showToast(`Please select at least ${MIN_WALLETS} wallet`, "error");
          return false;
        }
        if (selectedWallets.length > MAX_WALLETS) {
          showToast(`Maximum ${MAX_WALLETS} wallets can be selected`, "error");
          return false;
        }
        const hasAllAmounts = selectedWallets.every(
          (wallet) =>
            walletAmounts[wallet] && Number(walletAmounts[wallet]) > 0,
        );
        if (!hasAllAmounts) {
          showToast(
            "Please enter valid amounts for all selected wallets",
            "error",
          );
          return false;
        }
        break;
      }
    }
    return true;
  };

  const handleNext = (): void => {
    if (!validateStep()) return;
    setCurrentStep((prev) => Math.min(prev + 1, STEPS_DEPLOY.length - 1));
  };

  const handleBack = (): void => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleDeploy = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsSubmitting(true);

    try {
      // Build wallet array for create operation
      const walletsForCreate: WalletForCreate[] = selectedWallets.map(
        (privateKey) => {
          const wallet = wallets.find((w) => w.privateKey === privateKey);
          if (!wallet) {
            throw new Error(`Wallet not found`);
          }
          return {
            address: wallet.address,
            privateKey: wallet.privateKey,
            amount: parseFloat(walletAmounts[privateKey]) || 0.1,
          };
        },
      );

      // Build create config
      const meteoraDBCConfigObj: MeteoraDBCConfig | undefined =
        selectedPlatform === "meteoraDBC"
          ? {
              configAddress:
                meteoraDBCConfigAddress || METEORA_DBC_CONFIGS.standard,
              jitoTipAmountSOL: getJitoTipFromSettings(),
            }
          : undefined;

      const meteoraCPAMMConfigObj: MeteoraCPAMMConfig | undefined =
        selectedPlatform === "meteoraCPAMM"
          ? {
              configAddress:
                meteoraCPAMMConfigAddress || METEORA_CPAMM_CONFIGS.standard,
              jitoTipAmountSOL: getJitoTipFromSettings(),
              initialLiquiditySOL:
                parseFloat(meteoraCPAMMInitialLiquidity) || 1,
              initialTokenPercent:
                parseFloat(meteoraCPAMMInitialTokenPercent) || 80,
            }
          : undefined;

      const bonkConfigObj: BonkConfig | undefined =
        selectedPlatform === "bonk"
          ? {
              jitoTipAmountSOL: getJitoTipFromSettings(),
            }
          : undefined;

      const config = createDeployConfig({
        platform: selectedPlatform,
        token: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          description: tokenData.description || undefined,
          imageUrl: tokenData.imageUrl,
          twitter: tokenData.twitter || undefined,
          telegram: tokenData.telegram || undefined,
          website: tokenData.website || undefined,
        },
        pumpType: selectedPlatform === "pumpfun" ? pumpType : undefined,
        pumpAdvanced:
          selectedPlatform === "pumpfun" ? isPumpAdvancedMode : undefined,
        bonkType: selectedPlatform === "bonk" ? bonkType : undefined,
        bonkAdvanced:
          selectedPlatform === "bonk" ? isBonkAdvancedMode : undefined,
        bonkConfig: bonkConfigObj,
        meteoraDBCConfig: meteoraDBCConfigObj,
        meteoraCPAMMConfig: meteoraCPAMMConfigObj,
      });

      console.info("Executing create with config:", config);

      // Execute create operation (handles signing and sending)
      const result = await executeCreate(walletsForCreate, config);

      if (result.success) {
        // Reset form
        setSelectedWallets([]);
        setWalletAmounts({});
        setTokenData({
          name: "",
          symbol: "",
          description: "",
          imageUrl: "",
          twitter: "",
          telegram: "",
          website: "",
        });
        setIsConfirmed(false);
        setCurrentStep(0);

        // Refresh balances
        void refreshBalances();

        // Show success modal with mint address
        if (result.mintAddress) {
          setDeployedMintAddress(result.mintAddress);
        }
      } else {
        throw new Error(result.error ?? "Token deployment failed");
      }
    } catch (error) {
      console.error("Error during token deployment:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showToast(`Token deployment failed: ${errorMessage}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSolBalance = (balance: number): string => {
    return balance.toFixed(4);
  };

  const calculateTotalAmount = (): number => {
    return selectedWallets.reduce((total, wallet) => {
      return total + (parseFloat(walletAmounts[wallet]) || 0);
    }, 0);
  };

  const getWalletByPrivateKey = (
    privateKey: string,
  ): WalletType | undefined => {
    return wallets.find((wallet) => wallet.privateKey === privateKey);
  };

  const handleCopyAddress = async (): Promise<void> => {
    if (deployedMintAddress) {
      await navigator.clipboard.writeText(deployedMintAddress);
      setCopied(true);
      showToast("Token address copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToToken = (): void => {
    if (deployedMintAddress) {
      navigate(`/tokens/${deployedMintAddress}`);
    }
  };

  const handleCloseSuccess = (): void => {
    setDeployedMintAddress(null);
    setCopied(false);
  };

  const renderStepContent = (): JSX.Element | null => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            {/* Token Details */}
            <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider flex items-center gap-2">
                <PlusCircle size={14} className="color-primary" />
                <span className="color-primary">&#62;</span> Token Details{" "}
                <span className="color-primary">&#60;</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Name{" "}
                    <span className="color-primary">*</span>{" "}
                    <span className="color-primary">&#60;</span>
                  </label>
                  <input
                    type="text"
                    value={tokenData.name}
                    onChange={(e) =>
                      setTokenData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
                    placeholder="TOKEN NAME"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Symbol{" "}
                    <span className="color-primary">*</span>{" "}
                    <span className="color-primary">&#60;</span>
                  </label>
                  <input
                    type="text"
                    value={tokenData.symbol}
                    onChange={(e) =>
                      setTokenData((prev) => ({
                        ...prev,
                        symbol: e.target.value,
                      }))
                    }
                    className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
                    placeholder="SYMBOL"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Logo{" "}
                    <span className="color-primary">*</span>{" "}
                    <span className="color-primary">&#60;</span>
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/jpeg, image/png, image/gif, image/svg+xml"
                    className="hidden"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      disabled={isUploading}
                      className={`px-3 py-2.5 rounded-lg flex items-center gap-2 transition-all text-sm ${
                        isUploading
                          ? "bg-app-tertiary text-app-secondary cursor-not-allowed border border-app-primary-20"
                          : "bg-app-tertiary hover:bg-app-secondary border border-app-primary-40 hover:border-app-primary text-app-primary"
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw
                            size={14}
                            className="animate-spin color-primary"
                          />
                          <span className="font-mono">{uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} className="color-primary" />
                          <span className="font-mono">UPLOAD</span>
                        </>
                      )}
                    </button>

                    {tokenData.imageUrl && (
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded overflow-hidden border border-app-primary-40 bg-app-tertiary flex items-center justify-center">
                          <img
                            src={tokenData.imageUrl}
                            alt="Logo"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setTokenData((prev) => ({ ...prev, imageUrl: "" }))
                          }
                          className="p-1 rounded-full hover:bg-app-tertiary text-app-secondary hover:text-app-primary transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                  <span className="color-primary">&#62;</span> Description{" "}
                  <span className="color-primary">&#60;</span>
                </label>
                <textarea
                  value={tokenData.description}
                  onChange={(e) =>
                    setTokenData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono min-h-20"
                  placeholder="DESCRIBE YOUR TOKEN"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Twitter{" "}
                    <span className="color-primary">&#60;</span>
                  </label>
                  <input
                    type="text"
                    value={tokenData.twitter}
                    onChange={(e) =>
                      setTokenData((prev) => ({
                        ...prev,
                        twitter: e.target.value,
                      }))
                    }
                    className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
                    placeholder="https://x.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Telegram{" "}
                    <span className="color-primary">&#60;</span>
                  </label>
                  <input
                    type="text"
                    value={tokenData.telegram}
                    onChange={(e) =>
                      setTokenData((prev) => ({
                        ...prev,
                        telegram: e.target.value,
                      }))
                    }
                    className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
                    placeholder="https://t.me/..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Website{" "}
                    <span className="color-primary">&#60;</span>
                  </label>
                  <input
                    type="text"
                    value={tokenData.website}
                    onChange={(e) =>
                      setTokenData((prev) => ({
                        ...prev,
                        website: e.target.value,
                      }))
                    }
                    className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Platform Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-app-secondary flex items-center gap-1 font-mono uppercase tracking-wider">
                <span className="color-primary">&#62;</span> Platform{" "}
                <span className="color-primary">*</span>{" "}
                <span className="color-primary">&#60;</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlatform("pumpfun");
                    // Reset wallets if more than allowed in current mode
                    const maxAllowed =
                      pumpMode === "advanced"
                        ? MAX_WALLETS_ADVANCED
                        : MAX_WALLETS_STANDARD;
                    if (selectedWallets.length > maxAllowed) {
                      setSelectedWallets(selectedWallets.slice(0, maxAllowed));
                    }
                  }}
                  className={`p-4 rounded-lg border transition-all text-left ${
                    selectedPlatform === "pumpfun"
                      ? "border-app-primary-color bg-primary-10 shadow-lg"
                      : "border-app-primary-30 hover:border-app-primary-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 flex-shrink-0">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 512 512"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full"
                      >
                        <g transform="rotate(45 256 256)">
                          <path
                            d="M156 256V156a100 100 0 0 1 200 0v100Z"
                            fill="#f2f7f8"
                          />
                          <path
                            d="M156 256v100a100 100 0 0 0 200 0V256Z"
                            fill="#4dd994"
                          />
                          <path
                            d="M356 256V156a100 100 0 0 0-56-90q20 34 20 90v100Z"
                            fill="#c1cdd2"
                          />
                          <path
                            d="M356 256v100a100 100 0 0 1-56 90q20-36 20-90V256Z"
                            fill="#2a9d70"
                          />
                          <path
                            stroke="#163430"
                            strokeWidth="24"
                            strokeLinecap="round"
                            d="M156 256h200"
                          />
                          <rect
                            x="156"
                            y="56"
                            width="200"
                            height="400"
                            rx="100"
                            ry="100"
                            fill="none"
                            stroke="#163430"
                            strokeWidth="24"
                          />
                          <path
                            d="M190 300a65 65 0 0 0 20 100"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray="60 20"
                          />
                        </g>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-sm font-bold color-primary">
                        PUMP.FUN
                      </div>
                      <div className="text-xs text-app-secondary mt-1">
                        Fast deployment with bonding curve
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlatform("bonk");
                    // Reset wallets if more than 5 selected
                    if (selectedWallets.length > MAX_WALLETS_STANDARD) {
                      setSelectedWallets(
                        selectedWallets.slice(0, MAX_WALLETS_STANDARD),
                      );
                    }
                  }}
                  className={`p-4 rounded-lg border transition-all text-left ${
                    selectedPlatform === "bonk"
                      ? "border-app-primary-color bg-primary-10 shadow-lg"
                      : "border-app-primary-30 hover:border-app-primary-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 flex-shrink-0">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 500 500"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full"
                      >
                        <g clipPath="url(#a)">
                          <g clipPath="url(#b)">
                            <path
                              d="M104 162.1s-15.5 19.55-10.35 108c0 0-33.85 86.75-22.35 131.05 11.5 44.2 56.25 42 56.25 42s71.8 63.1 126.9 7.5c55.2-55.85-45.95-271.8-45.95-271.8l-12.65-74.65s-13.8 10.9-12.05 82.75c1.75 71.8-28.15 21.2-28.15 21.2z"
                              fill="#3c2d0c"
                            />
                            <path
                              d="m109.75 240.3-19 53.45-6.9 37.35s-23.55 83.4 73.6 82.15c0 0 75.8 67.85 125.25 22.4l13.25-14.4 23-35.65 37.95-113.2s-12.1-77.55-88.5-109.7c0 0-6.3-3.35-17.8 1.2 0 0-31.65-71.25-51.7-62.6 0 0-17.2 9.15-2.35 79.35L169.6 192.7s-29.5-56-56.8-44.75c-25.45 10.2-3.05 92.35-3.05 92.35"
                              fill="#e78c19"
                            />
                            <path
                              d="m207.9 136.35 2.35 31.05s1.75 17.8 20.65 11.5c5.4-1.75 10.05-5.5 9.6-11.6-.35-4.6-3.5-8.8-5.65-12.65-3.85-7.4-7-15.25-11.6-22.4-2.3-3.65-7.15-11.75-12.4-10.8 0 0-4-1.15-2.95 14.9M125 171c.3-.2 8-9.95 24.1 13.75 16.05 23.65 14.4 20.6 14.4 20.6s8.7 9.5-9 21.7a65 65 0 0 1-12.55 7 25 25 0 0 1-8.65 1.65c-3.4-.1-4.95-1.85-5.75-5-2.7-10.35-5.75-20.65-7.3-31.2-1.15-8.2-3.5-23.2 4.7-28.5"
                              fill="#efb99d"
                            />
                            <path
                              d="M311.5 218.85c0 5.6-8.2 10.15-18.4 10.15s-18.4-4.5-18.4-10.15 8.5-14 18.5-14c10.1 0 18.3 8.35 18.3 14m-106.1 44c5.5-9.65 4.85-20.3-1.35-23.8s-15.6 1.5-21.05 11.1c-5.5 9.6-4.85 20.25 1.35 23.8 6.15 3.5 15.6-1.5 21.05-11.1m26.1 46.45 50.25-26.15s62.6-32.7 77.8-7.5 0 63.75 0 63.75-6.55 45.1-52.6 49.1l-24.75 3.4-31.65.8s-50.85 2.95-88.2-24.7l-11.85-14.4s-23.8-32.7-7.15-56.25 73.6 12.85 73.6 12.85 8 4.35 14.5-.9"
                              fill="#fbfbfb"
                            />
                            <path
                              d="M345.5 179.1a12.05 12.05 0 1 0 0-24.1 12.05 12.05 0 0 0 0 24.1m-26.7-29.65a12.05 12.05 0 1 0 0-24.15 12.05 12.05 0 0 0 0 24.15M276 140a12.05 12.05 0 1 0 0-24.2 12.05 12.05 0 0 0 0 24.15m9.5-97.65c2.6 35.6-2.55 67.85-11.25 67.85-8.65 0-20.15-34.8-20.15-67.85 0-13.6 7.15-15.85 15.8-15.85 8.8 0 14.65 2.25 15.6 15.85m79.95 22.2c-13.15 33.1-31.75 60-39.5 56.2s-3-40.05 11.35-69.85c6-12.3 13.4-11.1 21.1-7.35 7.75 3.85 12.1 8.3 7 21m57.2 64.7c-28.95 21-58.95 33.65-63.5 26.25-4.55-7.35 19-35.4 47-52.85 11.6-7.15 17.2-2.2 21.8 5.05 4.45 7.4 5.75 13.5-5.3 21.55"
                              fill="#e72d36"
                            />
                            <path
                              d="m229.15 274.4-3.15.35q.15.5.2 1.2c0 3.6-5.75 6.65-12.9 6.9q-.1.5 0 .95c.35 4.45 8.1 7.5 17.15 6.8s16.25-4.95 15.9-9.4c-.45-4.45-8.05-7.5-17.2-6.8m63.5-15.6-3.15.35q.15.5.2 1.15c0 3.65-5.75 6.7-12.9 6.95v.9c.35 4.5 8.1 7.5 17.15 6.8s16.25-4.9 15.9-9.35c-.35-4.5-8.05-7.5-17.2-6.8m20.85 18.5s-25.2 7.4-23.65 21.55c1.5 14.2 31.85 21.55 31.85 21.55s8.2 3.3 12.9-4.55c4.7-7.75 11.6-18.3 9.75-33.4 0 0-.6-11.25-30.85-5.15"
                              fill="#000"
                            />
                          </g>
                        </g>
                        <defs>
                          <clipPath id="a">
                            <path fill="#fff" d="M0 0h500v500H0z" />
                          </clipPath>
                          <clipPath id="b">
                            <path fill="#fff" d="M-50-50h600v600H-50z" />
                          </clipPath>
                        </defs>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-sm font-bold color-primary">
                        BONK.FUN
                      </div>
                      <div className="text-xs text-app-secondary mt-1">
                        Advanced bot integration
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlatform("meteoraDBC")}
                  className={`p-4 rounded-lg border transition-all text-left ${
                    selectedPlatform === "meteoraDBC"
                      ? "border-app-primary-color bg-primary-10 shadow-lg"
                      : "border-app-primary-30 hover:border-app-primary-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 flex-shrink-0">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 240 240"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full"
                      >
                        <path
                          d="M185.89 66.887c3.313-3.314 8.445-3.119 10.567.39 2.296 3.767 4.029 7.839 5.263 12.105.693 2.425-.109 5.261-2.122 7.275l-64.902 64.902c-3.919 3.92-8.792 6.626-13.967 7.731l-5.393 1.147c-5.154 1.126-10.07 3.834-13.968 7.732l-49.829 49.829c-2.122-8.186-3.053-13.708 3.595-20.357zm14.055 27.96c2.166-2.165 5.501-.909 5.285 1.95-1.343 17.497-9.68 35.926-24.535 50.782-11.326 12.409-43.29 31.379-66.136 44.091-4.678 2.598-8.49-2.945-4.656-6.779l90.021-90.021zm-29.864-54.204c2.057-2.058 5.089-2.49 7.168-1.061 4.331 2.945 8.381 7.211 10.46 12.365.78 1.992.108 4.44-1.602 6.15l-69.905 69.904c-3.919 3.919-8.792 6.627-13.967 7.731l-5.392 1.148c-5.154 1.126-10.07 3.833-13.968 7.73L39.76 187.726c-2.122-8.185-1.104-15.656 5.544-22.304l25.163-25.164zm-29.626-12.427c3.898-3.898 9.485-5.414 14.076-3.682a52 52 0 0 1 8.273 4.028c3.465 2.08 3.638 7.147.39 10.395l-63.927 63.927c-3.66 3.659-8.641 5.609-13.405 5.262-5.003-.368-10.265 1.69-14.141 5.566l-35.017 35.016c-2.122-8.185.628-17.389 7.277-24.038zm-10.24-6.217c3.075-.043 4.266 3.617 1.927 5.956L98.945 61.152l-27.72 27.72-7.037 7.037-10.785 10.785c-2.253 2.252-5.587.216-4.331-2.642l10.48-23.82a77 77 0 0 1 1.95-4.419l.065-.151c6.041-12.798 15.765-26.377 24.904-35.516 14.661-14.66 27.827-17.995 43.744-18.147"
                          fill="url(#meteoraDBC-gradient)"
                        />
                        <defs>
                          <linearGradient
                            id="meteoraDBC-gradient"
                            x1="236.796"
                            y1="22.232"
                            x2="67.909"
                            y2="217.509"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop stopColor="#f5bd00" />
                            <stop offset=".365" stopColor="#f54b00" />
                            <stop offset="1" stopColor="#6e45ff" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-sm font-bold color-primary">
                        METEORA DBC
                      </div>
                      <div className="text-xs text-app-secondary mt-1">
                        Dynamic bonding curve
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlatform("meteoraCPAMM")}
                  className={`p-4 rounded-lg border transition-all text-left ${
                    selectedPlatform === "meteoraCPAMM"
                      ? "border-app-primary-color bg-primary-10 shadow-lg"
                      : "border-app-primary-30 hover:border-app-primary-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 flex-shrink-0">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 240 240"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full"
                      >
                        <path
                          d="M185.89 66.887c3.313-3.314 8.445-3.119 10.567.39 2.296 3.767 4.029 7.839 5.263 12.105.693 2.425-.109 5.261-2.122 7.275l-64.902 64.902c-3.919 3.92-8.792 6.626-13.967 7.731l-5.393 1.147c-5.154 1.126-10.07 3.834-13.968 7.732l-49.829 49.829c-2.122-8.186-3.053-13.708 3.595-20.357zm14.055 27.96c2.166-2.165 5.501-.909 5.285 1.95-1.343 17.497-9.68 35.926-24.535 50.782-11.326 12.409-43.29 31.379-66.136 44.091-4.678 2.598-8.49-2.945-4.656-6.779l90.021-90.021zm-29.864-54.204c2.057-2.058 5.089-2.49 7.168-1.061 4.331 2.945 8.381 7.211 10.46 12.365.78 1.992.108 4.44-1.602 6.15l-69.905 69.904c-3.919 3.919-8.792 6.627-13.967 7.731l-5.392 1.148c-5.154 1.126-10.07 3.833-13.968 7.73L39.76 187.726c-2.122-8.185-1.104-15.656 5.544-22.304l25.163-25.164zm-29.626-12.427c3.898-3.898 9.485-5.414 14.076-3.682a52 52 0 0 1 8.273 4.028c3.465 2.08 3.638 7.147.39 10.395l-63.927 63.927c-3.66 3.659-8.641 5.609-13.405 5.262-5.003-.368-10.265 1.69-14.141 5.566l-35.017 35.016c-2.122-8.185.628-17.389 7.277-24.038zm-10.24-6.217c3.075-.043 4.266 3.617 1.927 5.956L98.945 61.152l-27.72 27.72-7.037 7.037-10.785 10.785c-2.253 2.252-5.587.216-4.331-2.642l10.48-23.82a77 77 0 0 1 1.95-4.419l.065-.151c6.041-12.798 15.765-26.377 24.904-35.516 14.661-14.66 27.827-17.995 43.744-18.147"
                          fill="url(#meteoraCPAMM-gradient)"
                        />
                        <defs>
                          <linearGradient
                            id="meteoraCPAMM-gradient"
                            x1="236.796"
                            y1="22.232"
                            x2="67.909"
                            y2="217.509"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop stopColor="#00d4ff" />
                            <stop offset=".365" stopColor="#0099ff" />
                            <stop offset="1" stopColor="#0055ff" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-sm font-bold color-primary">
                        METEORA CP-AMM
                      </div>
                      <div className="text-xs text-app-secondary mt-1">
                        Constant product AMM
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Platform-specific options */}
            {selectedPlatform === "pumpfun" && (
              <div className="space-y-4">
                {/* Mode Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Deployment Mode{" "}
                    <span className="color-primary">&#60;</span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPumpMode("simple");
                        // Clear wallets if more than 5 selected
                        if (selectedWallets.length > MAX_WALLETS_STANDARD) {
                          setSelectedWallets(
                            selectedWallets.slice(0, MAX_WALLETS_STANDARD),
                          );
                        }
                      }}
                      className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${
                        pumpMode === "simple"
                          ? "bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg"
                          : "bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary"
                      }`}
                    >
                      <div className="text-sm font-bold">SIMPLE</div>
                      <div className="text-xs opacity-70 mt-1">
                        Up to 5 wallets
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPumpMode("advanced")}
                      className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${
                        pumpMode === "advanced"
                          ? "bg-emerald-500 text-black border border-emerald-400 shadow-lg"
                          : "bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-emerald-500/50"
                      }`}
                    >
                      <div className="text-sm font-bold">ADVANCED</div>
                      <div className="text-xs opacity-70 mt-1">
                        Up to 20 wallets
                      </div>
                    </button>
                  </div>
                </div>

                {/* Info Banner */}
                <div
                  className={`border rounded-lg p-3 ${
                    pumpMode === "advanced"
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-app-tertiary border-app-primary-30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Info
                      size={14}
                      className={
                        pumpMode === "advanced"
                          ? "text-emerald-500"
                          : "color-primary"
                      }
                    />
                    <span
                      className={`text-xs font-mono font-bold ${pumpMode === "advanced" ? "text-emerald-400" : "text-app-primary"}`}
                    >
                      {pumpMode === "advanced"
                        ? "ADVANCED MODE"
                        : "SIMPLE MODE"}
                    </span>
                  </div>
                  <div className="text-xs text-app-secondary font-mono">
                    {pumpMode === "advanced" ? (
                      <>
                        Multi-bundle deployment. Supports up to 20 wallets.
                        Sends multiple bundles in sequence for larger
                        deployments.
                      </>
                    ) : (
                      <>
                        Single bundle deployment. Fast and simple for up to 5
                        wallets.
                      </>
                    )}
                  </div>
                </div>

                {/* Mayhem Mode */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Token Type{" "}
                    <span className="color-primary">&#60;</span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPumpType(false)}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-mono tracking-wider transition-all ${
                        !pumpType
                          ? "bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg"
                          : "bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary"
                      }`}
                    >
                      NORMAL
                    </button>
                    <button
                      type="button"
                      onClick={() => setPumpType(true)}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-mono tracking-wider transition-all ${
                        pumpType
                          ? "bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg"
                          : "bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary"
                      }`}
                    >
                      MAYHEM
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedPlatform === "bonk" && (
              <div className="space-y-4">
                {/* Mode Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Deployment Mode{" "}
                    <span className="color-primary">&#60;</span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setBonkMode("simple");
                        // Clear wallets if more than 5 selected
                        if (selectedWallets.length > MAX_WALLETS_STANDARD) {
                          setSelectedWallets(
                            selectedWallets.slice(0, MAX_WALLETS_STANDARD),
                          );
                        }
                      }}
                      className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${
                        bonkMode === "simple"
                          ? "bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg"
                          : "bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary"
                      }`}
                    >
                      <div className="text-sm font-bold">SIMPLE</div>
                      <div className="text-xs opacity-70 mt-1">
                        Up to 5 wallets
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBonkMode("advanced")}
                      className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${
                        bonkMode === "advanced"
                          ? "bg-orange-500 text-black border border-orange-400 shadow-lg"
                          : "bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-orange-500/50"
                      }`}
                    >
                      <div className="text-sm font-bold">ADVANCED</div>
                      <div className="text-xs opacity-70 mt-1">
                        Up to 20 wallets
                      </div>
                    </button>
                  </div>
                </div>

                {/* Info Banner */}
                <div
                  className={`border rounded-lg p-3 ${
                    bonkMode === "advanced"
                      ? "bg-orange-500/10 border-orange-500/30"
                      : "bg-app-tertiary border-app-primary-30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Info
                      size={14}
                      className={
                        bonkMode === "advanced"
                          ? "text-orange-500"
                          : "color-primary"
                      }
                    />
                    <span
                      className={`text-xs font-mono font-bold ${bonkMode === "advanced" ? "text-orange-400" : "text-app-primary"}`}
                    >
                      {bonkMode === "advanced"
                        ? "ADVANCED MODE"
                        : "SIMPLE MODE"}
                    </span>
                  </div>
                  <div className="text-xs text-app-secondary font-mono">
                    {bonkMode === "advanced" ? (
                      <>
                        Multi-bundle deployment with Lookup Tables. Supports up
                        to 20 wallets. Sends multiple bundles in sequence (LUT
                        setup → WSOL ATAs → Buy Transactions).
                      </>
                    ) : (
                      <>
                        Single bundle deployment. Fast and simple for up to 5
                        wallets.
                      </>
                    )}
                  </div>
                </div>

                {/* Token Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Token Type{" "}
                    <span className="color-primary">&#60;</span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setBonkType("meme")}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-mono tracking-wider transition-all ${
                        bonkType === "meme"
                          ? "bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg"
                          : "bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary"
                      }`}
                    >
                      MEME
                    </button>
                    <button
                      type="button"
                      onClick={() => setBonkType("tech")}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-mono tracking-wider transition-all ${
                        bonkType === "tech"
                          ? "bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg"
                          : "bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary"
                      }`}
                    >
                      TECH
                    </button>
                  </div>
                </div>

                {/* Info about Jito Tip */}
                <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-3 flex items-center gap-2">
                  <Info size={14} className="color-primary" />
                  <span className="text-xs text-app-secondary font-mono">
                    JITO TIP: {getJitoTipFromSettings().toFixed(4)} SOL (from
                    Settings → Transaction Fee)
                  </span>
                </div>
              </div>
            )}

            {selectedPlatform === "meteoraDBC" && (
              <div className="space-y-4">
                {/* Mode Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Deployment Mode{" "}
                    <span className="color-primary">&#60;</span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMeteoraDBCMode("simple");
                        // Clear wallets if more than 5 selected
                        if (selectedWallets.length > MAX_WALLETS_STANDARD) {
                          setSelectedWallets(
                            selectedWallets.slice(0, MAX_WALLETS_STANDARD),
                          );
                        }
                      }}
                      className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${
                        meteoraDBCMode === "simple"
                          ? "bg-app-primary-color text-app-quaternary border border-app-primary shadow-lg"
                          : "bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-app-primary"
                      }`}
                    >
                      <div className="text-sm font-bold">SIMPLE</div>
                      <div className="text-xs opacity-70 mt-1">
                        Up to 5 wallets
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeteoraDBCMode("advanced")}
                      className={`flex-1 px-4 py-3 rounded-lg font-mono tracking-wider transition-all ${
                        meteoraDBCMode === "advanced"
                          ? "bg-amber-500 text-black border border-amber-400 shadow-lg"
                          : "bg-app-tertiary text-app-primary border border-app-primary-40 hover:border-amber-500/50"
                      }`}
                    >
                      <div className="text-sm font-bold">ADVANCED</div>
                      <div className="text-xs opacity-70 mt-1">
                        Up to 20 wallets
                      </div>
                    </button>
                  </div>
                </div>

                {/* Info Banner */}
                <div
                  className={`border rounded-lg p-3 ${
                    meteoraDBCMode === "advanced"
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-app-tertiary border-app-primary-30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Info
                      size={14}
                      className={
                        meteoraDBCMode === "advanced"
                          ? "text-amber-500"
                          : "color-primary"
                      }
                    />
                    <span
                      className={`text-xs font-mono font-bold ${meteoraDBCMode === "advanced" ? "text-amber-400" : "text-app-primary"}`}
                    >
                      {meteoraDBCMode === "advanced"
                        ? "ADVANCED MODE"
                        : "SIMPLE MODE"}
                    </span>
                  </div>
                  <div className="text-xs text-app-secondary font-mono">
                    {meteoraDBCMode === "advanced" ? (
                      <>
                        Multi-stage deployment with Lookup Tables. Supports up
                        to 20 wallets. Sends multiple bundles in sequence (LUT
                        setup → WSOL ATAs → Deployment → Cleanup).
                      </>
                    ) : (
                      <>
                        Single bundle deployment. Fast and simple for up to 5
                        wallets.
                      </>
                    )}
                  </div>
                </div>

                {/* Config Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Pool Config
                    Address <span className="color-primary">&#60;</span>
                  </label>
                  <input
                    type="text"
                    value={meteoraDBCConfigAddress}
                    onChange={(e) => setMeteoraDBCConfigAddress(e.target.value)}
                    className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono text-xs"
                    placeholder={METEORA_DBC_CONFIGS.standard}
                  />
                  <div className="text-xs text-app-secondary font-mono">
                    Leave default unless you have a custom pool config
                  </div>
                </div>

                {/* Info about Jito Tip */}
                <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-3 flex items-center gap-2">
                  <Info size={14} className="color-primary" />
                  <span className="text-xs text-app-secondary font-mono">
                    JITO TIP: {getJitoTipFromSettings().toFixed(4)} SOL (from
                    Settings → Transaction Fee)
                  </span>
                </div>
              </div>
            )}

            {selectedPlatform === "meteoraCPAMM" && (
              <div className="space-y-4">
                {/* Config Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span> Pool Config
                    Address <span className="color-primary">&#60;</span>
                  </label>
                  <input
                    type="text"
                    value={meteoraCPAMMConfigAddress}
                    onChange={(e) =>
                      setMeteoraCPAMMConfigAddress(e.target.value)
                    }
                    className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono text-xs"
                    placeholder={METEORA_CPAMM_CONFIGS.standard}
                  />
                  <div className="text-xs text-app-secondary font-mono">
                    Leave default unless you have a custom pool config
                  </div>
                </div>

                {/* Initial Liquidity Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Initial
                      Liquidity (SOL){" "}
                      <span className="color-primary">&#60;</span>
                    </label>
                    <input
                      type="text"
                      value={meteoraCPAMMInitialLiquidity}
                      onChange={(e) => {
                        if (
                          e.target.value === "" ||
                          /^\d*\.?\d*$/.test(e.target.value)
                        ) {
                          setMeteoraCPAMMInitialLiquidity(e.target.value);
                        }
                      }}
                      className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
                      placeholder="1"
                    />
                    <div className="text-xs text-app-secondary font-mono">
                      Amount of SOL for initial pool liquidity
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Initial Token
                      % <span className="color-primary">&#60;</span>
                    </label>
                    <input
                      type="text"
                      value={meteoraCPAMMInitialTokenPercent}
                      onChange={(e) => {
                        if (
                          e.target.value === "" ||
                          /^\d*\.?\d*$/.test(e.target.value)
                        ) {
                          const val = parseFloat(e.target.value);
                          if (isNaN(val) || (val >= 0 && val <= 100)) {
                            setMeteoraCPAMMInitialTokenPercent(e.target.value);
                          }
                        }
                      }}
                      className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2.5 text-app-primary placeholder-app-secondary-60 focus:outline-none focus:ring-1 focus:ring-primary-50 focus:border-app-primary transition-all font-mono"
                      placeholder="80"
                    />
                    <div className="text-xs text-app-secondary font-mono">
                      % of token supply for pool (1-100)
                    </div>
                  </div>
                </div>

                {/* Info about Jito Tip */}
                <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-3 flex items-center gap-2">
                  <Info size={14} className="color-primary" />
                  <span className="text-xs text-app-secondary font-mono">
                    JITO TIP: {getJitoTipFromSettings().toFixed(4)} SOL (from
                    Settings → Transaction Fee)
                  </span>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={14} className="text-blue-500" />
                    <span className="text-xs font-mono font-bold text-blue-400">
                      METEORA CP-AMM (DAMM v2)
                    </span>
                  </div>
                  <div className="text-xs text-app-secondary font-mono">
                    Constant Product AMM with dynamic fees. Supports up to 20
                    wallets. Creates liquidity pool with configurable initial
                    liquidity and token allocation.
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={16} className="color-primary" />
                <h3 className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                  <span className="color-primary">&#62;</span> Select Wallets &
                  Amounts <span className="color-primary">&#60;</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedWallets.length > 0) {
                    setSelectedWallets([]);
                  } else {
                    const walletsToSelect = wallets.slice(0, MAX_WALLETS);
                    setSelectedWallets(
                      walletsToSelect.map((w) => w.privateKey),
                    );
                  }
                }}
                className="text-xs color-primary hover:text-app-secondary font-mono"
              >
                {selectedWallets.length > 0 ? "DESELECT ALL" : "SELECT ALL"}
              </button>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-grow min-w-48">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus:border-app-primary transition-all font-mono"
                  placeholder="SEARCH..."
                />
              </div>

              <select
                className="bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-2 text-sm text-app-primary focus:outline-none focus:border-app-primary font-mono"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="address">ADDRESS</option>
                <option value="balance">BALANCE</option>
              </select>

              <button
                type="button"
                className="p-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-secondary hover:border-app-primary hover:color-primary transition-all"
                onClick={() =>
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                }
              >
                {sortDirection === "asc" ? (
                  <ArrowUp size={16} />
                ) : (
                  <ArrowDown size={16} />
                )}
              </button>

              <select
                className="bg-app-tertiary border border-app-primary-30 rounded-lg px-3 py-2 text-sm text-app-primary focus:outline-none focus:border-app-primary font-mono"
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value)}
              >
                <option value="all">ALL</option>
                <option value="nonZero">NON-ZERO</option>
                <option value="highBalance">HIGH</option>
                <option value="lowBalance">LOW</option>
              </select>
            </div>

            {/* Info */}
            <div
              className={`border rounded-lg p-3 flex items-center gap-2 ${
                isAdvancedMode
                  ? isPumpAdvancedMode
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : isBonkAdvancedMode
                      ? "bg-orange-500/10 border-orange-500/30"
                      : "bg-amber-500/10 border-amber-500/30"
                  : "bg-app-tertiary border-app-primary-30"
              }`}
            >
              <Info
                size={14}
                className={
                  isAdvancedMode
                    ? isPumpAdvancedMode
                      ? "text-emerald-500"
                      : isBonkAdvancedMode
                        ? "text-orange-500"
                        : "text-amber-500"
                    : "color-primary"
                }
              />
              <span
                className={`text-xs font-mono ${isAdvancedMode ? (isPumpAdvancedMode ? "text-emerald-400" : isBonkAdvancedMode ? "text-orange-400" : "text-amber-400") : "text-app-secondary"}`}
              >
                {isAdvancedMode
                  ? `ADVANCED MODE: SELECT UP TO ${MAX_WALLETS} WALLETS. MULTI-BUNDLE DEPLOYMENT.`
                  : `SELECT UP TO ${MAX_WALLETS} WALLETS. FIRST WALLET IS THE CREATOR.`}
              </span>
            </div>

            {/* Summary */}
            {selectedWallets.length > 0 && (
              <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-app-secondary font-mono">
                    SELECTED:
                  </span>
                  <span className="text-xs font-medium color-primary font-mono">
                    {selectedWallets.length} / {MAX_WALLETS}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-app-secondary font-mono">
                    TOTAL:
                  </span>
                  <span className="text-xs font-medium color-primary font-mono">
                    {calculateTotalAmount().toFixed(4)} SOL
                  </span>
                </div>
              </div>
            )}

            {/* Wallet List */}
            <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-3 max-h-80 overflow-y-auto">
              {/* Selected Wallets */}
              {selectedWallets.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-app-secondary mb-2 font-mono">
                    <span className="color-primary">&#62;</span> SELECTED{" "}
                    <span className="color-primary">&#60;</span>
                  </div>
                  {selectedWallets.map((privateKey, index) => {
                    const wallet = getWalletByPrivateKey(privateKey);
                    const solBalance = wallet
                      ? solBalances.get(wallet.address) || 0
                      : 0;

                    return (
                      <div
                        key={wallet?.id}
                        className="p-3 rounded-lg bg-primary-10 border border-app-primary-40 mb-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (index > 0) {
                                    const newOrder = [...selectedWallets];
                                    [newOrder[index], newOrder[index - 1]] = [
                                      newOrder[index - 1],
                                      newOrder[index],
                                    ];
                                    setSelectedWallets(newOrder);
                                  }
                                }}
                                disabled={index === 0}
                                className={`p-0.5 rounded ${index === 0 ? "opacity-30" : "hover:bg-app-tertiary"}`}
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (index < selectedWallets.length - 1) {
                                    const newOrder = [...selectedWallets];
                                    [newOrder[index], newOrder[index + 1]] = [
                                      newOrder[index + 1],
                                      newOrder[index],
                                    ];
                                    setSelectedWallets(newOrder);
                                  }
                                }}
                                disabled={index === selectedWallets.length - 1}
                                className={`p-0.5 rounded ${index === selectedWallets.length - 1 ? "opacity-30" : "hover:bg-app-tertiary"}`}
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium color-primary font-mono">
                                  {index === 0 ? "CREATOR" : `#${index + 1}`}
                                </span>
                                <span className="text-xs font-medium text-app-primary font-mono">
                                  {wallet
                                    ? getWalletDisplayName(wallet)
                                    : "UNKNOWN"}
                                </span>
                              </div>
                              <div className="text-xs text-app-secondary font-mono">
                                {formatSolBalance(solBalance)} SOL
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <DollarSign
                                size={12}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-app-secondary"
                              />
                              <input
                                type="text"
                                value={walletAmounts[privateKey] || ""}
                                onChange={(e) =>
                                  handleAmountChange(privateKey, e.target.value)
                                }
                                placeholder="0.1"
                                className="w-24 pl-7 pr-2 py-1.5 bg-app-tertiary border border-app-primary-30 rounded text-xs text-app-primary font-mono focus:outline-none focus:border-app-primary"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleWalletSelection(privateKey)}
                              className="p-1 rounded hover:bg-app-tertiary transition-all"
                            >
                              <X
                                size={14}
                                className="text-app-secondary hover:text-app-primary"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Available Wallets */}
              {selectedWallets.length < MAX_WALLETS && (
                <div>
                  <div className="text-xs font-medium text-app-secondary mb-2 font-mono">
                    <span className="color-primary">&#62;</span> AVAILABLE{" "}
                    <span className="color-primary">&#60;</span>
                  </div>
                  {filterWallets(
                    wallets.filter(
                      (w) => !selectedWallets.includes(w.privateKey),
                    ),
                    searchTerm,
                  ).map((wallet: WalletType) => {
                    const solBalance = solBalances.get(wallet.address) || 0;

                    return (
                      <div
                        key={wallet.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-app-primary-30 hover:border-app-primary-60 hover:bg-app-tertiary transition-all mb-2 cursor-pointer"
                        onClick={() => handleWalletSelection(wallet.privateKey)}
                      >
                        <div className="flex items-center gap-3">
                          <PlusCircle
                            size={14}
                            className="text-app-secondary"
                          />
                          <div>
                            <span className="text-xs font-medium text-app-primary font-mono">
                              {getWalletDisplayName(wallet)}
                            </span>
                            <div className="text-xs text-app-secondary font-mono">
                              {formatSolBalance(solBalance)} SOL
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filterWallets(
                    wallets.filter(
                      (w) => !selectedWallets.includes(w.privateKey),
                    ),
                    searchTerm,
                  ).length === 0 && (
                    <div className="text-center py-4 text-app-secondary font-mono text-xs">
                      {searchTerm ? "NO WALLETS FOUND" : "NO WALLETS AVAILABLE"}
                    </div>
                  )}
                </div>
              )}

              {selectedWallets.length >= MAX_WALLETS && (
                <div className="text-center py-3 bg-app-tertiary border border-app-primary-30 rounded-lg">
                  <div className="color-primary font-mono text-xs">
                    MAX WALLETS REACHED
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="color-primary" />
              <h3 className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                <span className="color-primary">&#62;</span> Review Deployment{" "}
                <span className="color-primary">&#60;</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Token Details */}
              <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-medium text-app-secondary font-mono uppercase">
                  TOKEN DETAILS
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-app-secondary font-mono">
                      PLATFORM:
                    </span>
                    <span className="color-primary font-mono font-bold">
                      {selectedPlatform.toUpperCase()}
                    </span>
                  </div>
                  {selectedPlatform === "pumpfun" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-app-secondary font-mono">
                          MODE:
                        </span>
                        <span
                          className={`font-mono font-bold ${isPumpAdvancedMode ? "text-emerald-400" : "text-app-primary"}`}
                        >
                          {isPumpAdvancedMode ? "ADVANCED" : "SIMPLE"}
                        </span>
                      </div>
                      {isPumpAdvancedMode && (
                        <div className="flex justify-between">
                          <span className="text-app-secondary font-mono">
                            BUNDLES:
                          </span>
                          <span className="text-emerald-400 font-mono">
                            MULTI-BUNDLE
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-app-secondary font-mono">
                          TYPE:
                        </span>
                        <span className="text-app-primary font-mono">
                          {pumpType ? "MAYHEM" : "NORMAL"}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedPlatform === "bonk" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-app-secondary font-mono">
                          MODE:
                        </span>
                        <span
                          className={`font-mono font-bold ${isBonkAdvancedMode ? "text-orange-400" : "text-app-primary"}`}
                        >
                          {isBonkAdvancedMode ? "ADVANCED" : "SIMPLE"}
                        </span>
                      </div>
                      {isBonkAdvancedMode && (
                        <div className="flex justify-between">
                          <span className="text-app-secondary font-mono">
                            STAGES:
                          </span>
                          <span className="text-orange-400 font-mono">
                            MULTI-BUNDLE
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-app-secondary font-mono">
                          TYPE:
                        </span>
                        <span className="text-app-primary font-mono">
                          {bonkType.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-app-secondary font-mono">
                          JITO TIP:
                        </span>
                        <span className="text-app-primary font-mono">
                          {getJitoTipFromSettings().toFixed(4)} SOL
                        </span>
                      </div>
                    </>
                  )}
                  {selectedPlatform === "meteoraDBC" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-app-secondary font-mono">
                          MODE:
                        </span>
                        <span
                          className={`font-mono font-bold ${isMeteoraDBCAdvancedMode ? "text-amber-400" : "text-app-primary"}`}
                        >
                          {isMeteoraDBCAdvancedMode ? "ADVANCED" : "SIMPLE"}
                        </span>
                      </div>
                      {isMeteoraDBCAdvancedMode && (
                        <div className="flex justify-between">
                          <span className="text-app-secondary font-mono">
                            STAGES:
                          </span>
                          <span className="text-amber-400 font-mono">
                            MULTI-BUNDLE
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-app-secondary font-mono">
                          JITO TIP:
                        </span>
                        <span className="text-app-primary font-mono">
                          {getJitoTipFromSettings().toFixed(4)} SOL
                        </span>
                      </div>
                    </>
                  )}
                  {selectedPlatform === "meteoraCPAMM" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-app-secondary font-mono">
                          INIT LIQUIDITY:
                        </span>
                        <span className="text-app-primary font-mono">
                          {meteoraCPAMMInitialLiquidity} SOL
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-app-secondary font-mono">
                          TOKEN %:
                        </span>
                        <span className="text-app-primary font-mono">
                          {meteoraCPAMMInitialTokenPercent}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-app-secondary font-mono">
                          JITO TIP:
                        </span>
                        <span className="text-app-primary font-mono">
                          {getJitoTipFromSettings().toFixed(4)} SOL
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-app-secondary font-mono">NAME:</span>
                    <span className="text-app-primary font-mono">
                      {tokenData.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-app-secondary font-mono">
                      SYMBOL:
                    </span>
                    <span className="text-app-primary font-mono">
                      {tokenData.symbol}
                    </span>
                  </div>
                  {tokenData.imageUrl && (
                    <div className="flex justify-between items-center">
                      <span className="text-app-secondary font-mono">
                        LOGO:
                      </span>
                      <div className="h-8 w-8 rounded overflow-hidden border border-app-primary-40">
                        <img
                          src={tokenData.imageUrl}
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {(tokenData.twitter ||
                  tokenData.telegram ||
                  tokenData.website) && (
                  <>
                    <div className="h-px bg-app-primary-20 my-2"></div>
                    <h4 className="text-xs font-medium text-app-secondary font-mono uppercase">
                      SOCIALS
                    </h4>
                    <div className="space-y-1 text-xs">
                      {tokenData.twitter && (
                        <div className="flex justify-between">
                          <span className="text-app-secondary font-mono">
                            TWITTER:
                          </span>
                          <span className="color-primary font-mono truncate max-w-32">
                            {tokenData.twitter}
                          </span>
                        </div>
                      )}
                      {tokenData.telegram && (
                        <div className="flex justify-between">
                          <span className="text-app-secondary font-mono">
                            TELEGRAM:
                          </span>
                          <span className="color-primary font-mono truncate max-w-32">
                            {tokenData.telegram}
                          </span>
                        </div>
                      )}
                      {tokenData.website && (
                        <div className="flex justify-between">
                          <span className="text-app-secondary font-mono">
                            WEBSITE:
                          </span>
                          <span className="color-primary font-mono truncate max-w-32">
                            {tokenData.website}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="h-px bg-app-primary-20 my-2"></div>
                <div className="flex justify-between text-xs">
                  <span className="text-app-secondary font-mono">
                    TOTAL SOL:
                  </span>
                  <span className="color-primary font-mono font-bold">
                    {calculateTotalAmount().toFixed(4)} SOL
                  </span>
                </div>
              </div>

              {/* Selected Wallets */}
              <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-medium text-app-secondary font-mono uppercase">
                  WALLETS ({selectedWallets.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {selectedWallets.map((key, index) => {
                    const wallet = getWalletByPrivateKey(key);
                    const solBalance = wallet
                      ? solBalances.get(wallet.address) || 0
                      : 0;

                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-app-tertiary rounded border border-app-primary-30 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="color-primary font-mono font-bold w-10">
                            {index === 0 ? "CRET" : `#${index + 1}`}
                          </span>
                          <span className="font-mono text-app-primary truncate max-w-20">
                            {wallet ? getWalletDisplayName(wallet) : "UNKNOWN"}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-app-secondary font-mono">
                            {formatSolBalance(solBalance)} SOL
                          </div>
                          <div className="color-primary font-mono font-bold">
                            {walletAmounts[key]} SOL
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Confirmation */}
            <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div
                  onClick={() => setIsConfirmed(!isConfirmed)}
                  className="relative w-5 h-5 cursor-pointer flex-shrink-0"
                >
                  <div
                    className={`w-5 h-5 border rounded transition-all ${isConfirmed ? "bg-app-primary-color border-app-primary" : "border-app-primary-40"}`}
                  ></div>
                  {isConfirmed && (
                    <CheckCircle
                      size={14}
                      className="absolute top-0.5 left-0.5 text-app-quaternary"
                    />
                  )}
                </div>
                <label
                  onClick={() => setIsConfirmed(!isConfirmed)}
                  className="text-xs text-app-primary cursor-pointer select-none font-mono"
                >
                  I CONFIRM DEPLOYMENT OF THIS TOKEN ON{" "}
                  {selectedPlatform.toUpperCase()}
                  {isAdvancedMode && " (ADVANCED MODE)"} USING{" "}
                  {selectedWallets.length} WALLET
                  {selectedWallets.length !== 1 ? "S" : ""}.
                  {isAdvancedMode &&
                    " THIS WILL SEND MULTIPLE BUNDLES IN SEQUENCE."}{" "}
                  THIS ACTION CANNOT BE UNDONE.
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-app-primary text-app-tertiary flex flex-col">
      <HorizontalHeader />

      {/* Success Modal */}
      {deployedMintAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-app-quaternary border border-app-primary-40 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            {/* Success Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-app-primary-color/20 flex items-center justify-center">
                <CheckCircle size={32} className="color-primary" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-app-primary font-mono text-center mb-2">
              TOKEN DEPLOYED!
            </h2>
            <p className="text-sm text-app-secondary font-mono text-center mb-6">
              Your token has been successfully deployed on{" "}
              {selectedPlatform.toUpperCase()}.
            </p>

            {/* Token Address */}
            <div className="mb-6">
              <label className="text-xs font-medium text-app-secondary font-mono uppercase tracking-wider mb-2 block">
                <span className="color-primary">&#62;</span> Token Address{" "}
                <span className="color-primary">&#60;</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-app-tertiary border border-app-primary-30 rounded-lg p-3">
                  <code className="text-xs text-app-primary font-mono break-all">
                    {deployedMintAddress}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyAddress()}
                  className={`p-3 rounded-lg border transition-all ${
                    copied
                      ? "bg-app-primary-color border-app-primary text-app-quaternary"
                      : "bg-app-tertiary border-app-primary-30 text-app-primary hover:border-app-primary"
                  }`}
                  title="Copy address"
                >
                  {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCloseSuccess}
                className="flex-1 px-4 py-3 rounded-lg font-mono text-sm transition-all bg-app-tertiary text-app-primary border border-app-primary-30 hover:border-app-primary"
              >
                CLOSE
              </button>
              <button
                type="button"
                onClick={handleGoToToken}
                className="flex-1 px-4 py-3 rounded-lg font-mono text-sm transition-all bg-app-primary-color text-app-quaternary hover:bg-app-primary-light flex items-center justify-center gap-2"
              >
                <span>VIEW TOKEN</span>
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-y-auto overflow-x-hidden w-full pt-16 bg-app-primary">
        {/* Background effects */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-app-primary opacity-90">
            <div className="absolute inset-0 bg-gradient-to-b from-app-primary-05 to-transparent"></div>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(2, 179, 109, 0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(2, 179, 109, 0.05) 1px, transparent 1px)
                `,
                backgroundSize: "20px 20px",
              }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between border-b border-app-primary-20 pb-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-app-primary font-mono tracking-wide">
                  TOKEN DEPLOYMENT
                </h1>
                <p className="text-xs text-app-secondary-80 font-mono">
                  Deploy your token on Pump.fun, Bonk.fun, MeteoraDBC, or
                  MeteoraCPAMM
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {STEPS_DEPLOY.map((step, index) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm ${
                      index <= currentStep
                        ? "bg-app-primary-color text-app-quaternary"
                        : "bg-app-tertiary text-app-secondary"
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < STEPS_DEPLOY.length - 1 && (
                    <div
                      className={`w-16 sm:w-24 h-0.5 mx-2 ${
                        index < currentStep
                          ? "bg-app-primary-color"
                          : "bg-app-tertiary"
                      }`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              {STEPS_DEPLOY.map((step, index) => (
                <div
                  key={step}
                  className={`text-xs font-mono ${
                    index <= currentStep
                      ? "color-primary"
                      : "text-app-secondary"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={
              currentStep === 2 ? handleDeploy : (e) => e.preventDefault()
            }
          >
            <div className="min-h-[400px]">{renderStepContent()}</div>

            {/* Navigation */}
            <div className="flex justify-between mt-6 pt-4 border-t border-app-primary-20">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0 || isSubmitting}
                className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-mono text-sm transition-all ${
                  currentStep === 0
                    ? "bg-app-tertiary text-app-secondary cursor-not-allowed opacity-50"
                    : "bg-app-tertiary text-app-primary border border-app-primary-30 hover:border-app-primary"
                }`}
              >
                <ChevronLeft size={16} />
                BACK
              </button>

              <button
                type={currentStep === 2 ? "submit" : "button"}
                onClick={currentStep === 2 ? undefined : handleNext}
                disabled={
                  currentStep === 2
                    ? isSubmitting || !isConfirmed
                    : isSubmitting
                }
                className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-mono text-sm transition-all ${
                  currentStep === 2 && (isSubmitting || !isConfirmed)
                    ? "bg-app-primary-color/50 text-app-quaternary cursor-not-allowed opacity-50"
                    : "bg-app-primary-color text-app-quaternary hover:bg-app-primary-light"
                }`}
              >
                {currentStep === 2 ? (
                  isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      {isAdvancedMode
                        ? "DEPLOYING (MULTI-BUNDLE)..."
                        : "DEPLOYING..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      {isAdvancedMode ? "DEPLOY (ADVANCED)" : "DEPLOY"}
                    </>
                  )
                ) : (
                  <>
                    NEXT
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeployPage;
