import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts";
import { HorizontalHeader } from "../components/HorizontalHeader";
import {
  PlusCircle,
  X,
  CheckCircle,
  Search,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Upload,
  RefreshCw,
  Copy,
  ExternalLink,
  Rocket,
  Sparkles,
  Wallet,
  FileText,
  Image,
  Globe,
  Twitter,
  Send,
  Link,
  Check,
  Zap,
  Shield,
  Layers,
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

const STEPS_DEPLOY = ["Token Setup", "Wallets", "Review"];
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
  const [pumpType, setPumpType] = useState<boolean>(false);
  const [pumpMode, setPumpMode] = useState<"simple" | "advanced">("simple");
  const [bonkType, setBonkType] = useState<"meme" | "tech">("meme");
  const [bonkMode, setBonkMode] = useState<"simple" | "advanced">("simple");
  const [meteoraDBCMode, setMeteoraDBCMode] = useState<"simple" | "advanced">(
    "simple",
  );

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

  const getJitoTipFromSettings = (): number => {
    const appConfig = loadConfigFromCookies();
    if (appConfig?.transactionFee) {
      return parseFloat(appConfig.transactionFee) / 1e9;
    }
    return 0.001;
  };

  const MAX_WALLETS = ((): number => {
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

  const wallets = propWallets.filter(
    (wallet) => (solBalances.get(wallet.address) || 0) > 0,
  );

  // Refresh balances when page loads directly
  useEffect(() => {
    if (propWallets.length > 0 && solBalances.size === 0) {
      void refreshBalances();
    }
  }, [propWallets, solBalances.size, refreshBalances]);

  useEffect(() => {
    setCurrentStep(0);
    setSelectedWallets([]);
    setWalletAmounts({});
    setIsConfirmed(false);
  }, []);

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

      const result = await executeCreate(walletsForCreate, config);

      if (result.success) {
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

        void refreshBalances();

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

  // Platform configs for rendering
  const platforms = [
    {
      id: "pumpfun" as PlatformType,
      name: "Pump.fun",
      description: "Fast bonding curve",
      color: "emerald",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="rotate(45 256 256)">
            <path d="M156 256V156a100 100 0 0 1 200 0v100Z" fill="#f2f7f8" />
            <path d="M156 256v100a100 100 0 0 0 200 0V256Z" fill="#4dd994" />
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
      ),
    },
    {
      id: "bonk" as PlatformType,
      name: "Bonk.fun",
      description: "Advanced bot integration",
      color: "orange",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#bonk-a)">
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
          </g>
          <defs>
            <clipPath id="bonk-a">
              <path fill="#fff" d="M0 0h500v500H0z" />
            </clipPath>
          </defs>
        </svg>
      ),
    },
    {
      id: "meteoraDBC" as PlatformType,
      name: "Meteora DBC",
      description: "Dynamic bonding curve",
      color: "amber",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M185.89 66.887c3.313-3.314 8.445-3.119 10.567.39 2.296 3.767 4.029 7.839 5.263 12.105.693 2.425-.109 5.261-2.122 7.275l-64.902 64.902c-3.919 3.92-8.792 6.626-13.967 7.731l-5.393 1.147c-5.154 1.126-10.07 3.834-13.968 7.732l-49.829 49.829c-2.122-8.186-3.053-13.708 3.595-20.357zm14.055 27.96c2.166-2.165 5.501-.909 5.285 1.95-1.343 17.497-9.68 35.926-24.535 50.782-11.326 12.409-43.29 31.379-66.136 44.091-4.678 2.598-8.49-2.945-4.656-6.779l90.021-90.021zm-29.864-54.204c2.057-2.058 5.089-2.49 7.168-1.061 4.331 2.945 8.381 7.211 10.46 12.365.78 1.992.108 4.44-1.602 6.15l-69.905 69.904c-3.919 3.919-8.792 6.627-13.967 7.731l-5.392 1.148c-5.154 1.126-10.07 3.833-13.968 7.73L39.76 187.726c-2.122-8.185-1.104-15.656 5.544-22.304l25.163-25.164zm-29.626-12.427c3.898-3.898 9.485-5.414 14.076-3.682a52 52 0 0 1 8.273 4.028c3.465 2.08 3.638 7.147.39 10.395l-63.927 63.927c-3.66 3.659-8.641 5.609-13.405 5.262-5.003-.368-10.265 1.69-14.141 5.566l-35.017 35.016c-2.122-8.185.628-17.389 7.277-24.038zm-10.24-6.217c3.075-.043 4.266 3.617 1.927 5.956L98.945 61.152l-27.72 27.72-7.037 7.037-10.785 10.785c-2.253 2.252-5.587.216-4.331-2.642l10.48-23.82a77 77 0 0 1 1.95-4.419l.065-.151c6.041-12.798 15.765-26.377 24.904-35.516 14.661-14.66 27.827-17.995 43.744-18.147"
            fill="url(#meteora-dbc-g)"
          />
          <defs>
            <linearGradient
              id="meteora-dbc-g"
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
      ),
    },
    {
      id: "meteoraCPAMM" as PlatformType,
      name: "Meteora CP-AMM",
      description: "Constant product AMM",
      color: "blue",
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M185.89 66.887c3.313-3.314 8.445-3.119 10.567.39 2.296 3.767 4.029 7.839 5.263 12.105.693 2.425-.109 5.261-2.122 7.275l-64.902 64.902c-3.919 3.92-8.792 6.626-13.967 7.731l-5.393 1.147c-5.154 1.126-10.07 3.834-13.968 7.732l-49.829 49.829c-2.122-8.186-3.053-13.708 3.595-20.357zm14.055 27.96c2.166-2.165 5.501-.909 5.285 1.95-1.343 17.497-9.68 35.926-24.535 50.782-11.326 12.409-43.29 31.379-66.136 44.091-4.678 2.598-8.49-2.945-4.656-6.779l90.021-90.021zm-29.864-54.204c2.057-2.058 5.089-2.49 7.168-1.061 4.331 2.945 8.381 7.211 10.46 12.365.78 1.992.108 4.44-1.602 6.15l-69.905 69.904c-3.919 3.919-8.792 6.627-13.967 7.731l-5.392 1.148c-5.154 1.126-10.07 3.833-13.968 7.73L39.76 187.726c-2.122-8.185-1.104-15.656 5.544-22.304l25.163-25.164zm-29.626-12.427c3.898-3.898 9.485-5.414 14.076-3.682a52 52 0 0 1 8.273 4.028c3.465 2.08 3.638 7.147.39 10.395l-63.927 63.927c-3.66 3.659-8.641 5.609-13.405 5.262-5.003-.368-10.265 1.69-14.141 5.566l-35.017 35.016c-2.122-8.185.628-17.389 7.277-24.038zm-10.24-6.217c3.075-.043 4.266 3.617 1.927 5.956L98.945 61.152l-27.72 27.72-7.037 7.037-10.785 10.785c-2.253 2.252-5.587.216-4.331-2.642l10.48-23.82a77 77 0 0 1 1.95-4.419l.065-.151c6.041-12.798 15.765-26.377 24.904-35.516 14.661-14.66 27.827-17.995 43.744-18.147"
            fill="url(#meteora-cpamm-g)"
          />
          <defs>
            <linearGradient
              id="meteora-cpamm-g"
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
      ),
    },
  ];

  const renderStepContent = (): JSX.Element | null => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 animate-fade-in-down">
            {/* Token Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-app-primary-20">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
                  <FileText size={20} className="color-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-app-primary font-mono">
                    Token Details
                  </h3>
                  <p className="text-xs text-app-secondary-60 font-mono">
                    Configure your token metadata
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-2 uppercase">
                    <Sparkles size={12} className="color-primary" />
                    Name <span className="text-red-400">*</span>
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
                    className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
                    placeholder="Token Name"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-2 uppercase">
                    <Sparkles size={12} className="color-primary" />
                    Symbol <span className="text-red-400">*</span>
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
                    className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
                    placeholder="SYMBOL"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-2 uppercase">
                    <Image size={12} className="color-primary" />
                    Logo <span className="text-red-400">*</span>
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
                      className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-mono ${
                        isUploading
                          ? "bg-app-quaternary text-app-secondary cursor-not-allowed border border-app-primary-20"
                          : "bg-app-quaternary hover:bg-app-tertiary border border-app-primary-30 hover:border-app-primary-color text-app-primary"
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw
                            size={14}
                            className="animate-spin color-primary"
                          />
                          <span>{uploadProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} className="color-primary" />
                          <span>Upload</span>
                        </>
                      )}
                    </button>
                    {tokenData.imageUrl && (
                      <div className="relative">
                        <div className="h-12 w-12 rounded-lg overflow-hidden border-2 border-app-primary-color bg-app-tertiary">
                          <img
                            src={tokenData.imageUrl}
                            alt="Logo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setTokenData((prev) => ({ ...prev, imageUrl: "" }))
                          }
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                        >
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-2 uppercase">
                  <FileText size={12} className="color-primary" />
                  Description
                </label>
                <textarea
                  value={tokenData.description}
                  onChange={(e) =>
                    setTokenData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:outline-none font-mono min-h-20 resize-none"
                  placeholder="Describe your token..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-2 uppercase">
                    <Twitter size={12} className="text-blue-400" />
                    Twitter
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
                    className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
                    placeholder="https://x.com/..."
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-2 uppercase">
                    <Send size={12} className="text-blue-400" />
                    Telegram
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
                    className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
                    placeholder="https://t.me/..."
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-2 uppercase">
                    <Globe size={12} className="color-primary" />
                    Website
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
                    className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Platform Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-app-primary-20">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
                  <Layers size={20} className="color-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-app-primary font-mono">
                    Select Platform
                  </h3>
                  <p className="text-xs text-app-secondary-60 font-mono">
                    Choose where to deploy your token
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlatform(platform.id);
                      if (selectedWallets.length > MAX_WALLETS_STANDARD) {
                        setSelectedWallets(
                          selectedWallets.slice(0, MAX_WALLETS_STANDARD),
                        );
                      }
                    }}
                    className={`group relative p-4 rounded-xl border transition-all duration-200 text-left ${
                      selectedPlatform === platform.id
                        ? "border-app-primary-color/50"
                        : "border-app-primary-20 hover:border-app-primary-40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border border-app-primary-30 flex items-center justify-center shrink-0 [&>svg]:w-6 [&>svg]:h-6 [&>img]:w-6 [&>img]:h-6">
                        {platform.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-bold font-mono truncate ${selectedPlatform === platform.id ? "color-primary" : "text-app-primary"}`}
                        >
                          {platform.name}
                        </div>
                        <div className="text-[10px] font-mono text-app-secondary-40 truncate">
                          {platform.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Options */}
            {(selectedPlatform === "pumpfun" ||
              selectedPlatform === "bonk" ||
              selectedPlatform === "meteoraDBC") && (
              <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="color-primary" />
                  <span className="text-xs font-mono font-bold text-app-primary">
                    DEPLOYMENT MODE
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPlatform === "pumpfun") setPumpMode("simple");
                      else if (selectedPlatform === "bonk")
                        setBonkMode("simple");
                      else setMeteoraDBCMode("simple");
                      if (selectedWallets.length > MAX_WALLETS_STANDARD) {
                        setSelectedWallets(
                          selectedWallets.slice(0, MAX_WALLETS_STANDARD),
                        );
                      }
                    }}
                    className={`col-span-6 px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                      (selectedPlatform === "pumpfun" &&
                        pumpMode === "simple") ||
                      (selectedPlatform === "bonk" && bonkMode === "simple") ||
                      (selectedPlatform === "meteoraDBC" &&
                        meteoraDBCMode === "simple")
                        ? "border-app-primary-color bg-app-primary-color/10"
                        : "border-app-primary-20 hover:border-app-primary-40"
                    }`}
                  >
                    <Shield size={14} className="color-primary" />
                    <span className="text-xs font-bold font-mono text-app-primary">
                      Simple
                    </span>
                    <span className="text-[10px] text-app-secondary-60 font-mono ml-auto">
                      5 wallets
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPlatform === "pumpfun")
                        setPumpMode("advanced");
                      else if (selectedPlatform === "bonk")
                        setBonkMode("advanced");
                      else setMeteoraDBCMode("advanced");
                    }}
                    className={`col-span-6 px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                      (selectedPlatform === "pumpfun" &&
                        pumpMode === "advanced") ||
                      (selectedPlatform === "bonk" &&
                        bonkMode === "advanced") ||
                      (selectedPlatform === "meteoraDBC" &&
                        meteoraDBCMode === "advanced")
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-app-primary-20 hover:border-emerald-500/50"
                    }`}
                  >
                    <Sparkles size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold font-mono text-app-primary">
                      Advanced
                    </span>
                    <span className="text-[10px] text-app-secondary-60 font-mono ml-auto">
                      20 wallets
                    </span>
                  </button>
                </div>

                {selectedPlatform === "pumpfun" && (
                  <div className="pt-4 border-t border-app-primary-20">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={14} className="color-primary" />
                      <span className="text-xs font-mono font-bold text-app-primary">
                        TOKEN TYPE
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPumpType(false)}
                        className={`p-3 rounded-lg border transition-all text-center ${
                          !pumpType
                            ? "border-app-primary-color bg-app-primary-color/10"
                            : "border-app-primary-20 hover:border-app-primary-40"
                        }`}
                      >
                        <span className="text-sm font-bold font-mono text-app-primary">
                          Normal
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPumpType(true)}
                        className={`p-3 rounded-lg border transition-all text-center ${
                          pumpType
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-app-primary-20 hover:border-orange-500/50"
                        }`}
                      >
                        <span className="text-sm font-bold font-mono text-app-primary">
                          Mayhem
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedPlatform === "bonk" && (
                  <div className="pt-4 border-t border-app-primary-20">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={14} className="color-primary" />
                      <span className="text-xs font-mono font-bold text-app-primary">
                        TOKEN TYPE
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBonkType("meme")}
                        className={`p-3 rounded-lg border transition-all text-center ${
                          bonkType === "meme"
                            ? "border-app-primary-color bg-app-primary-color/10"
                            : "border-app-primary-20 hover:border-app-primary-40"
                        }`}
                      >
                        <span className="text-sm font-bold font-mono text-app-primary">
                          Meme
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBonkType("tech")}
                        className={`p-3 rounded-lg border transition-all text-center ${
                          bonkType === "tech"
                            ? "border-app-primary-color bg-app-primary-color/10"
                            : "border-app-primary-20 hover:border-app-primary-40"
                        }`}
                      >
                        <span className="text-sm font-bold font-mono text-app-primary">
                          Tech
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MeteoraDBC Config */}
            {selectedPlatform === "meteoraDBC" && (
              <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
                <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-2 uppercase">
                  <Link size={14} className="color-primary" />
                  Pool Config Address
                </label>
                <input
                  type="text"
                  value={meteoraDBCConfigAddress}
                  onChange={(e) => setMeteoraDBCConfigAddress(e.target.value)}
                  className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
                  placeholder={METEORA_DBC_CONFIGS.standard}
                />
              </div>
            )}

            {/* MeteoraCPAMM Config */}
            {selectedPlatform === "meteoraCPAMM" && (
              <div className="p-4 rounded-xl bg-app-tertiary/50 border border-app-primary-20 space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-2 uppercase">
                    <Link size={14} className="color-primary" />
                    Pool Config Address
                  </label>
                  <input
                    type="text"
                    value={meteoraCPAMMConfigAddress}
                    onChange={(e) =>
                      setMeteoraCPAMMConfigAddress(e.target.value)
                    }
                    className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
                    placeholder={METEORA_CPAMM_CONFIGS.standard}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-app-secondary-60 font-mono mb-2 block uppercase">
                      Initial Liquidity (SOL)
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
                      className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-app-secondary-60 font-mono mb-2 block uppercase">
                      Token % for Pool
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
                      className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-4 py-3 text-sm text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
                      placeholder="80"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4 animate-fade-in-down">
            {/* Header */}
            <div className="pb-3 border-b border-app-primary-20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl border border-app-primary-30 flex items-center justify-center">
                    <Wallet size={20} className="text-app-secondary-60" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-app-primary font-mono">
                      Select Wallets
                    </h3>
                    <p
                      className={`text-xs font-mono ${isAdvancedMode ? "text-emerald-400" : "text-app-secondary-60"}`}
                    >
                      {isAdvancedMode
                        ? `Advanced Mode: Up to ${MAX_WALLETS} wallets with multi-bundle deployment`
                        : `Select up to ${MAX_WALLETS} wallets. First wallet is the creator.`}
                    </p>
                  </div>
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
                  className="px-4 py-2 rounded-lg text-xs font-mono color-primary hover:bg-app-primary-color/10 border border-app-primary-20 hover:border-app-primary-color transition-all"
                >
                  {selectedWallets.length > 0 ? "Clear All" : "Select All"}
                </button>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-grow min-w-48">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary-40"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-app-quaternary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus:border-app-primary-color transition-all font-mono"
                    placeholder="Search wallets..."
                  />
                </div>
                <select
                  className="bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2.5 text-sm text-app-primary focus:outline-none focus:border-app-primary-color font-mono"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="address">Address</option>
                  <option value="balance">Balance</option>
                </select>
                <button
                  type="button"
                  className="p-2.5 bg-app-quaternary border border-app-primary-30 rounded-lg text-app-secondary hover:border-app-primary-color hover:color-primary transition-all"
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
                  className="bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2.5 text-sm text-app-primary focus:outline-none focus:border-app-primary-color font-mono"
                  value={balanceFilter}
                  onChange={(e) => setBalanceFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="nonZero">Non-Zero</option>
                  <option value="highBalance">High</option>
                  <option value="lowBalance">Low</option>
                </select>
              </div>
            </div>

            {/* Wallet List */}
            <div className="bg-app-tertiary/50 border border-app-primary-20 rounded-xl p-4 max-h-96 overflow-y-auto custom-scrollbar">
              {/* Selected Wallets */}
              {selectedWallets.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-app-secondary-40 mb-3 font-mono uppercase">
                    Selected Wallets
                  </div>
                  <div className="space-y-2">
                    {selectedWallets.map((privateKey, index) => {
                      const wallet = getWalletByPrivateKey(privateKey);
                      const solBalance = wallet
                        ? solBalances.get(wallet.address) || 0
                        : 0;

                      return (
                        <div
                          key={wallet?.id}
                          className="p-3 rounded-xl border border-app-primary-color/30"
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
                                  className={`p-1 rounded ${index === 0 ? "opacity-30" : "hover:bg-app-quaternary"}`}
                                >
                                  <ArrowUp size={12} />
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
                                  disabled={
                                    index === selectedWallets.length - 1
                                  }
                                  className={`p-1 rounded ${index === selectedWallets.length - 1 ? "opacity-30" : "hover:bg-app-quaternary"}`}
                                >
                                  <ArrowDown size={12} />
                                </button>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs font-bold font-mono ${index === 0 ? "text-yellow-400" : "color-primary"}`}
                                  >
                                    {index === 0 ? "CREATOR" : `#${index + 1}`}
                                  </span>
                                  <span className="text-xs font-medium text-app-primary font-mono">
                                    {wallet
                                      ? getWalletDisplayName(wallet)
                                      : "UNKNOWN"}
                                  </span>
                                </div>
                                <div className="text-[10px] text-app-secondary-40 font-mono">
                                  {formatSolBalance(solBalance)} SOL available
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <DollarSign
                                  size={12}
                                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-app-secondary-40"
                                />
                                <input
                                  type="text"
                                  value={walletAmounts[privateKey] || ""}
                                  onChange={(e) =>
                                    handleAmountChange(
                                      privateKey,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0.1"
                                  className="w-24 pl-6 pr-2 py-2 bg-app-quaternary border border-app-primary-30 rounded-lg text-xs text-app-primary font-mono focus:outline-none focus:border-app-primary-color"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleWalletSelection(privateKey)
                                }
                                className="p-2 rounded-lg hover:bg-red-500/20 transition-all"
                              >
                                <X size={14} className="text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Wallets */}
              {selectedWallets.length < MAX_WALLETS && (
                <div>
                  <div className="text-xs font-medium text-app-secondary-40 mb-3 font-mono uppercase">
                    Available Wallets
                  </div>
                  <div className="space-y-2">
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
                          className="flex items-center justify-between p-3 rounded-xl border border-app-primary-20 hover:border-app-primary-color hover:bg-app-quaternary/50 transition-all cursor-pointer group"
                          onClick={() =>
                            handleWalletSelection(wallet.privateKey)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-app-quaternary flex items-center justify-center group-hover:bg-app-primary-color/20 transition-colors">
                              <PlusCircle
                                size={14}
                                className="text-app-secondary-40 group-hover:color-primary"
                              />
                            </div>
                            <div>
                              <span className="text-xs font-medium text-app-primary font-mono">
                                {getWalletDisplayName(wallet)}
                              </span>
                              <div className="text-[10px] text-app-secondary-40 font-mono">
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
                      <div className="text-center py-8 text-app-secondary-40 font-mono text-xs">
                        {searchTerm
                          ? "No wallets found"
                          : "No wallets available"}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedWallets.length >= MAX_WALLETS && (
                <div className="text-center py-4 bg-app-quaternary rounded-xl border border-app-primary-20">
                  <span className="color-primary font-mono text-xs font-bold">
                    Maximum wallets selected
                  </span>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-fade-in-down">
            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-app-primary-20">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
                <CheckCircle size={20} className="color-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-app-primary font-mono">
                  Review Deployment
                </h3>
                <p className="text-xs text-app-secondary-60 font-mono">
                  Confirm your token deployment settings
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Token Details Card */}
              <div className="p-5 rounded-xl bg-app-tertiary/50 border border-app-primary-20 space-y-4">
                <div className="flex items-center gap-3">
                  {tokenData.imageUrl && (
                    <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-app-primary-color">
                      <img
                        src={tokenData.imageUrl}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <div className="text-lg font-bold text-app-primary font-mono">
                      {tokenData.name}
                    </div>
                    <div className="text-sm text-app-secondary-60 font-mono">
                      ${tokenData.symbol}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-app-primary-20">
                  <div className="flex justify-between text-xs">
                    <span className="text-app-secondary-40 font-mono">
                      Platform
                    </span>
                    <span className="color-primary font-mono font-bold">
                      {selectedPlatform.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-app-secondary-40 font-mono">
                      Mode
                    </span>
                    <span
                      className={`font-mono font-bold ${isAdvancedMode ? "text-emerald-400" : "text-app-primary"}`}
                    >
                      {isAdvancedMode ? "Advanced" : "Simple"}
                    </span>
                  </div>
                  {selectedPlatform === "pumpfun" && (
                    <div className="flex justify-between text-xs">
                      <span className="text-app-secondary-40 font-mono">
                        Type
                      </span>
                      <span className="text-app-primary font-mono">
                        {pumpType ? "Mayhem" : "Normal"}
                      </span>
                    </div>
                  )}
                  {selectedPlatform === "bonk" && (
                    <div className="flex justify-between text-xs">
                      <span className="text-app-secondary-40 font-mono">
                        Type
                      </span>
                      <span className="text-app-primary font-mono">
                        {bonkType.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {(selectedPlatform === "bonk" ||
                    selectedPlatform === "meteoraDBC" ||
                    selectedPlatform === "meteoraCPAMM") && (
                    <div className="flex justify-between text-xs">
                      <span className="text-app-secondary-40 font-mono">
                        Jito Tip
                      </span>
                      <span className="text-yellow-400 font-mono">
                        {getJitoTipFromSettings().toFixed(4)} SOL
                      </span>
                    </div>
                  )}
                  {selectedPlatform === "meteoraCPAMM" && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-app-secondary-40 font-mono">
                          Init Liquidity
                        </span>
                        <span className="text-app-primary font-mono">
                          {meteoraCPAMMInitialLiquidity} SOL
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-app-secondary-40 font-mono">
                          Token %
                        </span>
                        <span className="text-app-primary font-mono">
                          {meteoraCPAMMInitialTokenPercent}%
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {(tokenData.twitter ||
                  tokenData.telegram ||
                  tokenData.website) && (
                  <div className="space-y-2 pt-3 border-t border-app-primary-20">
                    <div className="text-xs font-mono text-app-secondary-40 uppercase">
                      Socials
                    </div>
                    {tokenData.twitter && (
                      <div className="flex items-center gap-2 text-xs">
                        <Twitter size={12} className="text-blue-400" />
                        <span className="text-app-primary font-mono truncate">
                          {tokenData.twitter}
                        </span>
                      </div>
                    )}
                    {tokenData.telegram && (
                      <div className="flex items-center gap-2 text-xs">
                        <Send size={12} className="text-blue-400" />
                        <span className="text-app-primary font-mono truncate">
                          {tokenData.telegram}
                        </span>
                      </div>
                    )}
                    {tokenData.website && (
                      <div className="flex items-center gap-2 text-xs">
                        <Globe size={12} className="color-primary" />
                        <span className="text-app-primary font-mono truncate">
                          {tokenData.website}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-app-primary-20">
                  <div className="flex justify-between">
                    <span className="text-sm text-app-secondary-40 font-mono">
                      Total SOL
                    </span>
                    <span className="text-lg font-bold color-primary font-mono">
                      {calculateTotalAmount().toFixed(4)} SOL
                    </span>
                  </div>
                </div>
              </div>

              {/* Wallets Card */}
              <div className="p-5 rounded-xl bg-app-tertiary/50 border border-app-primary-20 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-app-secondary-40 uppercase">
                    Wallets ({selectedWallets.length})
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                  {selectedWallets.map((key, index) => {
                    const wallet = getWalletByPrivateKey(key);
                    const solBalance = wallet
                      ? solBalances.get(wallet.address) || 0
                      : 0;

                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-app-quaternary rounded-xl border border-app-primary-20"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold font-mono w-14 ${index === 0 ? "text-yellow-400" : "color-primary"}`}
                          >
                            {index === 0 ? "CREATOR" : `#${index + 1}`}
                          </span>
                          <span className="font-mono text-xs text-app-primary truncate max-w-24">
                            {wallet ? getWalletDisplayName(wallet) : "UNKNOWN"}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-app-secondary-40 font-mono">
                            {formatSolBalance(solBalance)} SOL
                          </div>
                          <div className="text-xs font-bold color-primary font-mono">
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
            <div className="p-5 rounded-xl bg-gradient-to-r from-app-primary-color/10 to-transparent border border-app-primary-color/30">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setIsConfirmed(!isConfirmed)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isConfirmed
                      ? "bg-app-primary-color border-app-primary-color"
                      : "border-app-primary-40 hover:border-app-primary-color"
                  }`}
                >
                  {isConfirmed && <Check size={14} className="text-black" />}
                </button>
                <label
                  onClick={() => setIsConfirmed(!isConfirmed)}
                  className="text-xs text-app-primary cursor-pointer select-none font-mono leading-relaxed"
                >
                  I confirm deployment of{" "}
                  <span className="font-bold color-primary">
                    {tokenData.name}
                  </span>{" "}
                  on{" "}
                  <span className="font-bold color-primary">
                    {selectedPlatform.toUpperCase()}
                  </span>
                  {isAdvancedMode && " (Advanced Mode)"} using{" "}
                  <span className="font-bold color-primary">
                    {selectedWallets.length}
                  </span>{" "}
                  wallet
                  {selectedWallets.length !== 1 ? "s" : ""}.
                  {isAdvancedMode &&
                    " This will send multiple bundles in sequence."}{" "}
                  This action cannot be undone.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-app-secondary border border-app-primary-40 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-app-primary-color/30 to-app-primary-color/10 flex items-center justify-center shadow-[0_0_30px_rgba(2,179,109,0.3)]">
                <CheckCircle size={40} className="color-primary" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-app-primary font-mono text-center mb-2">
              Token Deployed!
            </h2>
            <p className="text-sm text-app-secondary-60 font-mono text-center mb-6">
              Successfully deployed on {selectedPlatform.toUpperCase()}
            </p>

            <div className="mb-6">
              <label className="text-xs font-medium text-app-secondary-40 font-mono uppercase mb-2 block">
                Token Address
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-app-quaternary border border-app-primary-30 rounded-xl p-4">
                  <code className="text-xs text-app-primary font-mono break-all">
                    {deployedMintAddress}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyAddress()}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    copied
                      ? "bg-app-primary-color border-app-primary-color text-black"
                      : "bg-app-quaternary border-app-primary-30 text-app-primary hover:border-app-primary-color"
                  }`}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCloseSuccess}
                className="flex-1 px-4 py-3 rounded-xl font-mono text-sm transition-all bg-app-quaternary text-app-primary border border-app-primary-30 hover:border-app-primary-color"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleGoToToken}
                className="flex-1 px-4 py-3 rounded-xl font-mono text-sm transition-all bg-app-primary-color text-black font-bold hover:shadow-[0_0_20px_rgba(2,179,109,0.4)] flex items-center justify-center gap-2"
              >
                <span>View Token</span>
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

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

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center gap-4 justify-between pb-4 border-b border-app-primary-20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-app-primary-color/30 to-app-primary-color/10 border border-app-primary-color/40 flex items-center justify-center shadow-[0_0_30px_rgba(2,179,109,0.2)]">
                <Rocket size={28} className="color-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-app-primary font-mono tracking-wide">
                  DEPLOY TOKEN
                </h1>
                <p className="text-xs text-app-secondary-60 font-mono">
                  Launch on Pump.fun, Bonk.fun, or Meteora
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
              <div className="text-center">
                <div className="text-xs font-mono color-primary font-bold">
                  {selectedPlatform.toUpperCase()}
                </div>
                <div className="text-[10px] text-app-secondary-40 font-mono">
                  PLATFORM
                </div>
              </div>
              <div className="w-px h-8 bg-app-primary-20" />
              <div className="text-center">
                <div className="text-xs font-mono color-primary font-bold">
                  {selectedWallets.length}
                </div>
                <div className="text-[10px] text-app-secondary-40 font-mono">
                  WALLETS
                </div>
              </div>
              <div className="w-px h-8 bg-app-primary-20" />
              <div className="text-center">
                <div className="text-xs font-mono color-primary font-bold">
                  {calculateTotalAmount().toFixed(2)}
                </div>
                <div className="text-[10px] text-app-secondary-40 font-mono">
                  SOL
                </div>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center">
              {STEPS_DEPLOY.map((step, index) => (
                <React.Fragment key={step}>
                  <div
                    className={`flex flex-col items-center ${index === 0 ? "" : index === STEPS_DEPLOY.length - 1 ? "" : ""}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono text-sm font-bold transition-all ${
                        index < currentStep
                          ? "bg-app-primary-color text-black shadow-[0_0_15px_rgba(2,179,109,0.4)]"
                          : index === currentStep
                            ? "bg-app-primary-color/20 border-2 border-app-primary-color color-primary"
                            : "bg-app-tertiary text-app-secondary-40 border border-app-primary-20"
                      }`}
                    >
                      {index < currentStep ? <Check size={20} /> : index + 1}
                    </div>
                    <span
                      className={`mt-2 text-xs font-mono ${index <= currentStep ? "color-primary font-bold" : "text-app-secondary-40"}`}
                    >
                      {step}
                    </span>
                  </div>
                  {index < STEPS_DEPLOY.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-4 rounded-full transition-all ${index < currentStep ? "bg-app-primary-color" : "bg-app-primary-20"}`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={
              currentStep === 2 ? handleDeploy : (e) => e.preventDefault()
            }
          >
            <div className="bg-app-secondary/80 backdrop-blur-sm rounded-2xl border border-app-primary-20 p-6 shadow-xl min-h-[400px]">
              {renderStepContent()}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0 || isSubmitting}
                className={`px-6 py-3 rounded-xl flex items-center gap-2 font-mono text-sm transition-all ${
                  currentStep === 0
                    ? "bg-app-tertiary/50 text-app-secondary-40 cursor-not-allowed"
                    : "bg-app-tertiary text-app-primary border border-app-primary-30 hover:border-app-primary-color"
                }`}
              >
                <ChevronLeft size={18} />
                Back
              </button>

              <button
                type={currentStep === 2 ? "submit" : "button"}
                onClick={currentStep === 2 ? undefined : handleNext}
                disabled={
                  currentStep === 2
                    ? isSubmitting || !isConfirmed
                    : isSubmitting
                }
                className={`group relative px-8 py-3 rounded-xl flex items-center gap-2 font-mono text-sm font-bold transition-all overflow-hidden ${
                  currentStep === 2 && (isSubmitting || !isConfirmed)
                    ? "bg-app-primary-color/30 text-app-secondary cursor-not-allowed"
                    : "bg-app-primary-color text-black hover:shadow-[0_0_25px_rgba(2,179,109,0.5)]"
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                {currentStep === 2 ? (
                  isSubmitting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      {isAdvancedMode ? "Deploying..." : "Deploying..."}
                    </>
                  ) : (
                    <>
                      <Rocket size={18} />
                      {isAdvancedMode ? "Deploy (Advanced)" : "Deploy Token"}
                    </>
                  )
                ) : (
                  <>
                    Continue
                    <ChevronRight size={18} />
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
