import React, { useState, useEffect } from "react";
import { useAppContext } from "../contexts";
import { HorizontalHeader } from "../components/HorizontalHeader";
import { PageBackground } from "../components/PageBackground";
import { Rocket, ChevronRight } from "lucide-react";
import { useToast } from "../utils/hooks";
import {
  executeCreate,
  createDeployConfig,
  type WalletForCreate,
  type CreateConfig,
  type PlatformType,
  METEORA_DBC_CONFIGS,
  METEORA_CPAMM_CONFIGS,
} from "../utils/create";
import { loadConfigFromCookies } from "../utils/storage";
import { addRecentToken } from "../utils/recentTokens";
import {
  type TokenMetadata,
  type AdditionalToken,
  type DeploymentProgressItem,
  type DeployTab,
  MIN_WALLETS,
  MAX_WALLETS_STANDARD,
  MAX_WALLETS_ADVANCED,
  TABS,
  PlatformTab,
  TokenTab,
  WalletsTab,
  DeploysTab,
  DeployPreview,
  SuccessModal,
  MultiDeployModal,
} from "../components/deploy";

export const DeployPage: React.FC = () => {
  const { wallets: propWallets, baseCurrencyBalances, refreshBalances } = useAppContext();
  const { showToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<DeployTab>("platform");

  // Core state
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>("pumpfun");
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Platform options
  const [pumpType, setPumpType] = useState<boolean>(false);
  const [bonkType, setBonkType] = useState<"meme" | "tech">("meme");
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
  const [additionalTokens, setAdditionalTokens] = useState<AdditionalToken[]>([]);
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgressItem[]>([]);
  const [isMultiDeploying, setIsMultiDeploying] = useState(false);

  // Computed values
  const getJitoTipFromSettings = (): number => {
    const appConfig = loadConfigFromCookies();
    return appConfig?.transactionFee ? parseFloat(appConfig.transactionFee) / 1e9 : 0.001;
  };

  // Always allow up to 20 wallets, mode is auto-detected based on count
  const MAX_WALLETS = MAX_WALLETS_ADVANCED;

  // Auto-detect advanced mode based on wallet count
  const isAdvancedMode = selectedWallets.length > MAX_WALLETS_STANDARD;

  const wallets = propWallets.filter((w) => (baseCurrencyBalances.get(w.address) || 0) > 0);

  // Primary token always uses shared wallets
  const primaryWalletsValid = selectedWallets.length >= MIN_WALLETS &&
    selectedWallets.every((pk) => walletAmounts[pk] && parseFloat(walletAmounts[pk]) > 0);

  // Check if all additional tokens have valid wallet configurations
  const additionalTokensWalletsValid = additionalTokens.every((t) => {
    if (t.useCustomWallets) {
      return t.wallets && t.wallets.length >= MIN_WALLETS &&
        t.wallets.every((pk) => t.walletAmounts?.[pk] && parseFloat(t.walletAmounts[pk]) > 0);
    }
    return primaryWalletsValid; // Uses shared wallets
  });

  // Total deploys = 1 (primary) + additional tokens
  const totalDeploys = 1 + additionalTokens.length;

  const canDeploy = !!(tokenData.name && tokenData.symbol && tokenData.imageUrl &&
    isConfirmed && primaryWalletsValid && additionalTokensWalletsValid);

  // Effects
  useEffect(() => {
    if (propWallets.length > 0 && baseCurrencyBalances.size === 0) {
      void refreshBalances();
    }
  }, [propWallets, baseCurrencyBalances.size, refreshBalances]);

  // Handlers
  const handleDeploy = async (): Promise<void> => {
    if (!canDeploy) return;

    setIsSubmitting(true);
    const hasMultiple = totalDeploys > 1;
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
      // Primary token uses the Platform tab settings
      const primarySettings: Partial<AdditionalToken> = {
        pumpType,
        pumpMode: isAdvancedMode ? "advanced" : "simple",
        bonkType,
        bonkMode: isAdvancedMode ? "advanced" : "simple",
        meteoraDBCMode: isAdvancedMode ? "advanced" : "simple",
        meteoraDBCConfigAddress,
        meteoraCPAMMConfigAddress,
        meteoraCPAMMInitialLiquidity,
        meteoraCPAMMInitialTokenPercent,
      };

      // Primary deployment + additional tokens
      const deployments = [
        // Primary token
        {
          wallets: buildWallets(selectedWallets, walletAmounts),
          config: buildConfig(selectedPlatform, primarySettings),
          platform: selectedPlatform,
        },
        // Additional tokens
        ...additionalTokens.map((t) => ({
          wallets: t.useCustomWallets && t.wallets && t.wallets.length > 0
            ? buildWallets(t.wallets, t.walletAmounts || {})
            : buildWallets(selectedWallets, walletAmounts),
          config: buildConfig(t.platform, t),
          platform: t.platform,
        })),
      ];

      if (deployments.length === 1) {
        const result = await executeCreate(deployments[0].wallets, deployments[0].config);
        if (result.success && result.mintAddress) {
          addRecentToken(result.mintAddress);
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
        // Initialize all as deploying (parallel execution)
        setDeploymentProgress(deployments.map((_, i) => ({ tokenIndex: i, status: "deploying" })));

        // Execute all deployments in parallel
        await Promise.all(
          deployments.map(async (deployment, i) => {
            try {
              const result = await executeCreate(deployment.wallets, deployment.config);
              if (result.success && result.mintAddress) {
                addRecentToken(result.mintAddress);
              }
              setDeploymentProgress((prev) => prev.map((p, idx) => idx === i ? {
                ...p,
                status: result.success ? "success" : "failed",
                mintAddress: result.mintAddress,
                error: result.error
              } : p));
            } catch (error) {
              setDeploymentProgress((prev) => prev.map((p, idx) => idx === i ? {
                ...p,
                status: "failed",
                error: error instanceof Error ? error.message : String(error)
              } : p));
            }
          }),
        );

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

  const renderTabContent = (): JSX.Element | null => {
    switch (activeTab) {
      case "platform":
        return (
          <PlatformTab
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            pumpType={pumpType}
            setPumpType={setPumpType}
            bonkType={bonkType}
            setBonkType={setBonkType}
            meteoraDBCConfigAddress={meteoraDBCConfigAddress}
            setMeteoraDBCConfigAddress={setMeteoraDBCConfigAddress}
            meteoraCPAMMConfigAddress={meteoraCPAMMConfigAddress}
            setMeteoraCPAMMConfigAddress={setMeteoraCPAMMConfigAddress}
            meteoraCPAMMInitialLiquidity={meteoraCPAMMInitialLiquidity}
            setMeteoraCPAMMInitialLiquidity={setMeteoraCPAMMInitialLiquidity}
            meteoraCPAMMInitialTokenPercent={meteoraCPAMMInitialTokenPercent}
            setMeteoraCPAMMInitialTokenPercent={setMeteoraCPAMMInitialTokenPercent}
          />
        );
      case "token":
        return <TokenTab tokenData={tokenData} setTokenData={setTokenData} />;
      case "wallets":
        return (
          <WalletsTab
            wallets={wallets}
            selectedWallets={selectedWallets}
            setSelectedWallets={setSelectedWallets}
            walletAmounts={walletAmounts}
            setWalletAmounts={setWalletAmounts}
            baseCurrencyBalances={baseCurrencyBalances}
            maxWallets={MAX_WALLETS}
          />
        );
      case "deploys":
        return (
          <DeploysTab
            additionalTokens={additionalTokens}
            setAdditionalTokens={setAdditionalTokens}
            wallets={wallets}
            baseCurrencyBalances={baseCurrencyBalances}
            sharedWallets={selectedWallets}
            maxWallets={MAX_WALLETS}
          />
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
        <SuccessModal
          mintAddress={deployedMintAddress}
          platform={selectedPlatform}
          onReset={resetForm}
        />
      )}

      {/* Multi-Deploy Modal */}
      {isMultiDeploying && (
        <MultiDeployModal
          isSubmitting={isSubmitting}
          deploymentProgress={deploymentProgress}
          primaryPlatform={selectedPlatform}
          additionalTokens={additionalTokens}
          onReset={resetForm}
        />
      )}

      {/* Main Content */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden w-full pt-16 bg-app-primary">
        {/* Background */}
        <PageBackground />

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
                  <div className="text-xs font-mono color-primary font-bold">{totalDeploys}</div>
                  <div className="text-[10px] text-app-secondary-40 font-mono">DEPLOYS</div>
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
              <DeployPreview
                tokenData={tokenData}
                selectedWallets={selectedWallets}
                walletAmounts={walletAmounts}
                totalDeploys={totalDeploys}
                isConfirmed={isConfirmed}
                setIsConfirmed={setIsConfirmed}
                canDeploy={canDeploy}
                isSubmitting={isSubmitting}
                onDeploy={() => void handleDeploy()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeployPage;
