import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../contexts/useAppContext";
import { HorizontalHeader } from "../components/HorizontalHeader";
import { DeployForm } from "../components/DeployForm";
import { DeploySelector } from "../components/DeploySelector";
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Copy,
  ExternalLink,
} from "lucide-react";
import { getWalletDisplayName } from "../Utils";
import type { WalletType } from "../utils/types";
import { useToast } from "../utils/useToast";
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
import { loadConfigFromCookies } from "../Utils";

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

  // Get Jito tip from cookies settings
  const getJitoTipFromSettings = (): number => {
    const appConfig = loadConfigFromCookies();
    if (appConfig?.transactionFee) {
      return parseFloat(appConfig.transactionFee) / 1e9;
    }
    return 0.001;
  };

  // MAX_WALLETS depends on platform and mode
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

  const renderStepContent = (): JSX.Element | null => {
    switch (currentStep) {
      case 0:
        return (
          <DeployForm
            tokenData={tokenData}
            setTokenData={setTokenData}
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            pumpType={pumpType}
            setPumpType={setPumpType}
            pumpMode={pumpMode}
            setPumpMode={setPumpMode}
            bonkType={bonkType}
            setBonkType={setBonkType}
            bonkMode={bonkMode}
            setBonkMode={setBonkMode}
            meteoraDBCMode={meteoraDBCMode}
            setMeteoraDBCMode={setMeteoraDBCMode}
            meteoraDBCConfigAddress={meteoraDBCConfigAddress}
            setMeteoraDBCConfigAddress={setMeteoraDBCConfigAddress}
            meteoraCPAMMConfigAddress={meteoraCPAMMConfigAddress}
            setMeteoraCPAMMConfigAddress={setMeteoraCPAMMConfigAddress}
            meteoraCPAMMInitialLiquidity={meteoraCPAMMInitialLiquidity}
            setMeteoraCPAMMInitialLiquidity={setMeteoraCPAMMInitialLiquidity}
            meteoraCPAMMInitialTokenPercent={meteoraCPAMMInitialTokenPercent}
            setMeteoraCPAMMInitialTokenPercent={
              setMeteoraCPAMMInitialTokenPercent
            }
            selectedWallets={selectedWallets}
            setSelectedWallets={setSelectedWallets}
            getJitoTipFromSettings={getJitoTipFromSettings}
            MAX_WALLETS_STANDARD={MAX_WALLETS_STANDARD}
            MAX_WALLETS_ADVANCED={MAX_WALLETS_ADVANCED}
          />
        );

      case 1:
        return (
          <DeploySelector
            wallets={wallets}
            solBalances={solBalances}
            selectedWallets={selectedWallets}
            setSelectedWallets={setSelectedWallets}
            walletAmounts={walletAmounts}
            setWalletAmounts={setWalletAmounts}
            MAX_WALLETS={MAX_WALLETS}
            isAdvancedMode={isAdvancedMode}
            isPumpAdvancedMode={isPumpAdvancedMode}
            isBonkAdvancedMode={isBonkAdvancedMode}
          />
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
