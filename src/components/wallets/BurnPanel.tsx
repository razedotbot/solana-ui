import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
  X,
  ArrowDown,
} from "lucide-react";
import { getWallets, getWalletDisplayName } from "../../utils/wallet";
import { useToast, useTokenMetadata } from "../../utils/hooks";
import { loadConfigFromCookies } from "../../utils/storage";
import * as web3 from "@solana/web3.js";
import bs58 from "bs58";
import { sendTransactions } from "../../utils/transactionService";
import type { ApiResponse } from "../../utils/types";
import { createConnectionFromConfig } from "../../utils/rpcManager";
import type { BaseCurrencyConfig } from "../../utils/constants";
import { BASE_CURRENCIES } from "../../utils/constants";
import type { WindowWithConfig } from "../../utils/trading";
import { MODAL_STYLES } from "../shared/modalStyles";
import { SourceWalletSummary } from "./SourceWalletSummary";
import { filterAndSortWallets } from "./walletFilterUtils";
import type { BalanceFilter, SortOption, SortDirection } from "./walletFilterUtils";

const STEPS_BURN_FULL = ["Token Address", "Select Source", "Burn Details", "Review"];
const STEPS_BURN_SHORT = ["Token Address", "Burn Details", "Review"];

interface BasePanelProps {
  isOpen: boolean;
  inline?: boolean;
  onClose: () => void;
}

interface BurnPanelProps extends BasePanelProps {
  tokenAddress?: string;
  baseCurrencyBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  baseCurrency?: BaseCurrencyConfig;
  selectedWalletIds?: Set<number>;
}

export const BurnPanel: React.FC<BurnPanelProps> = ({
  isOpen,
  inline = false,
  onClose,
  tokenAddress: initialTokenAddress,
  baseCurrencyBalances,
  tokenBalances,
  baseCurrency = BASE_CURRENCIES.SOL,
  selectedWalletIds,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tokenAddress, setTokenAddress] = useState<string>(
    initialTokenAddress || "",
  );
  const [sourceWallet, setSourceWallet] = useState<string>("");
  const [tokenAccounts, setTokenAccounts] = useState<
    Array<{
      mint: string;
      balance: number;
      symbol: string;
    }>
  >([]);
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("address");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [modalClass, setModalClass] = useState("");
  const [showInfoTip, setShowInfoTip] = useState(false);
  const [tokenBalancesForWallets, setTokenBalancesForWallets] = useState<
    Map<string, number>
  >(new Map());

  const wallets = getWallets();
  const { showToast } = useToast();
  const { metadata: tokenMeta } = useTokenMetadata(tokenAddress || undefined);

  const useExternalSource = inline && selectedWalletIds !== undefined;
  const STEPS = useExternalSource ? STEPS_BURN_SHORT : STEPS_BURN_FULL;
  const currentStepName = STEPS[currentStep];

  useEffect(() => {
    if (useExternalSource && currentStep === 0) {
      const firstId = Array.from(selectedWalletIds)[0];
      const firstWallet = wallets.find((w) => w.id === firstId);
      if (firstWallet) {
        setSourceWallet(firstWallet.privateKey);
      }
    }
  }, [useExternalSource, selectedWalletIds, wallets, currentStep]);

  const resetForm = useCallback((): void => {
    setCurrentStep(0);
    setTokenAddress(initialTokenAddress || "");
    setSourceWallet("");
    setAmount("");
    setIsConfirmed(false);
    setSearchTerm("");
    setSortOption("address");
    setSortDirection("asc");
    setBalanceFilter("all");
    setTokenBalancesForWallets(new Map());
  }, [initialTokenAddress]);

  useEffect((): (() => void) | undefined => {
    if (isOpen) {
      resetForm();
      setModalClass("animate-modal-in");

      // Simulate a typing/loading effect for a  feel
      const timer = setTimeout(() => {
        setModalClass("");
      }, 500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (initialTokenAddress) {
      setTokenAddress(initialTokenAddress);
    }
  }, [initialTokenAddress]);

  // Fetch token balances for all wallets when token address is provided
  const fetchTokenBalancesForAllWallets = async (): Promise<void> => {
    if (!tokenAddress) return;

    setIsLoadingBalances(true);
    try {
      const savedConfig = loadConfigFromCookies();
      const connection = await createConnectionFromConfig(
        savedConfig?.rpcEndpoints,
      );

      const balancesMap = new Map<string, number>();

      try {
        new web3.PublicKey(tokenAddress);
      } catch {
        showToast("Invalid token address", "error");
        setIsLoadingBalances(false);
        return;
      }

      await Promise.all(
        wallets.map(async (wallet) => {
          try {
            const keypair = web3.Keypair.fromSecretKey(
              bs58.decode(wallet.privateKey),
            );
            const publicKey = keypair.publicKey;

            const tokenAccounts =
              await connection.getParsedTokenAccountsByOwner(publicKey, {
                mint: new web3.PublicKey(tokenAddress),
              });

            if (tokenAccounts.value.length > 0) {
              const accountData = tokenAccounts.value[0].account.data as {
                parsed: { info: { tokenAmount: { uiAmount: number } } };
              };
              const balance = accountData.parsed.info.tokenAmount.uiAmount;
              balancesMap.set(wallet.address, balance);
            } else {
              balancesMap.set(wallet.address, 0);
            }
          } catch {
            balancesMap.set(wallet.address, 0);
          }
        }),
      );

      setTokenBalancesForWallets(balancesMap);
    } catch {
      showToast("Failed to fetch token balances", "error");
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Fetch token accounts when source wallet is selected
  useEffect((): void => {
    const fetchTokenAccounts = async (): Promise<void> => {
      if (!sourceWallet || !tokenAddress) return;

      setIsLoadingTokens(true);
      try {
        const savedConfig = loadConfigFromCookies();
        const connection = await createConnectionFromConfig(
          savedConfig?.rpcEndpoints,
        );

        const keypair = web3.Keypair.fromSecretKey(bs58.decode(sourceWallet));
        const publicKey = keypair.publicKey;

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          {
            mint: new web3.PublicKey(tokenAddress),
          },
        );

        if (tokenAccounts.value.length > 0) {
          const accountData = tokenAccounts.value[0].account.data as {
            parsed: { info: { tokenAmount: { uiAmount: number } } };
          };
          const balance = accountData.parsed.info.tokenAmount.uiAmount;

          setTokenAccounts([
            {
              mint: tokenAddress,
              balance: balance,
              symbol: tokenMeta?.symbol || tokenAddress.slice(0, 4),
            },
          ]);
        } else {
          setTokenAccounts([]);
        }
      } catch {
        showToast("Failed to fetch token accounts", "error");
        setTokenAccounts([]);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    void fetchTokenAccounts();
  }, [sourceWallet, tokenAddress, showToast, tokenMeta?.symbol]);

  const handleNext = async (): Promise<void> => {
    if (currentStepName === "Token Address") {
      if (!tokenAddress) {
        showToast("Please enter token address", "error");
        return;
      }
      try {
        new web3.PublicKey(tokenAddress);
      } catch {
        showToast("Invalid token address format", "error");
        return;
      }
      // Fetch balances before moving to next step
      await fetchTokenBalancesForAllWallets();
    }

    if (currentStepName === "Select Source" && !sourceWallet) {
      showToast("Please select source wallet", "error");
      return;
    }

    if (currentStepName === "Burn Details") {
      if (!amount || parseFloat(amount) <= 0) {
        showToast("Please enter a valid amount", "error");
        return;
      }
    }

    setModalClass("animate-step-out");
    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      setModalClass("animate-step-in");

      setTimeout(() => setModalClass(""), 500);
    }, 300);
  };

  const handleBack = (): void => {
    setModalClass("animate-step-back-out");
    setTimeout(() => {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
      setModalClass("animate-step-back-in");

      setTimeout(() => setModalClass(""), 500);
    }, 300);
  };

  const handleBurn = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      const walletKeypair = web3.Keypair.fromSecretKey(
        bs58.decode(sourceWallet),
      );

      // 1. Request unsigned transaction from backend
      const baseUrl =
        (window as WindowWithConfig).tradingServerUrl?.replace(/\/+$/, "") ||
        "";

      const prepareResponse = await fetch(`${baseUrl}/v2/sol/burn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletPublicKey: walletKeypair.publicKey.toString(),
          tokenAddress: tokenAddress,
          amount: amount,
        }),
      });

      if (!prepareResponse.ok) {
        const errorData = (await prepareResponse.json()) as ApiResponse;
        throw new Error(
          errorData.error || "Failed to prepare burn transaction"
        );
      }

      const prepareResult = (await prepareResponse.json()) as ApiResponse<{
        transaction: string;
      }>;

      if (!prepareResult.success || !prepareResult.data) {
        throw new Error(prepareResult.error || "Failed to prepare transaction");
      }

      // 2. Deserialize and sign the transaction (now expecting base58)
      const transactionData = prepareResult.data;
      if (!transactionData) {
        throw new Error("No transaction data received");
      }
      const transactionBuffer = bs58.decode(transactionData.transaction); // Changed from base64 to base58

      const transaction =
        web3.VersionedTransaction.deserialize(transactionBuffer);

      // Sign the transaction with the wallet's private key
      transaction.sign([walletKeypair]);

      const signedTransactionBuffer = transaction.serialize();

      const signedTransactionBs58 = bs58.encode(signedTransactionBuffer);
      // 3. Submit the signed transaction to Jito via the bundle service
      try {
        await sendTransactions([signedTransactionBs58]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to submit transaction: ${errorMessage}`);
      }

      showToast("Token burn completed successfully", "success");
      resetForm();
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      showToast(`Error burning tokens: ${errorMessage}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get the token balance for the selected token
  const getSelectedTokenBalance = (): number => {
    if (!sourceWallet) return 0;
    const wallet = wallets.find((w) => w.privateKey === sourceWallet);
    if (!wallet) return 0;
    return tokenBalancesForWallets.get(wallet.address) || 0;
  };

  // Get the token symbol for the selected token
  const getSelectedTokenSymbol = (): string => {
    return tokenMeta?.symbol || tokenAddress.slice(0, 4) || "TKN";
  };

  // Filter wallets based on search and other filters
  const filterWallets = (
    walletList: typeof wallets,
    search: string,
  ): typeof wallets => {
    // First filter out wallets with zero token balance (only if token address is set AND balances have been fetched)
    let preFiltered = walletList;
    if (tokenAddress && tokenBalancesForWallets.size > 0) {
      preFiltered = walletList.filter(
        (wallet): boolean =>
          (tokenBalancesForWallets.get(wallet.address) || 0) > 0,
      );
    }

    return filterAndSortWallets(
      preFiltered,
      search,
      balanceFilter,
      sortOption,
      sortDirection,
      (address) => baseCurrencyBalances.get(address) || 0,
      (address) => tokenBalancesForWallets.get(address) || 0,
    );
  };

  useEffect(() => {
    const styleId = "burn-modal-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = MODAL_STYLES;
    document.head.appendChild(style);
    return () => { const el = document.getElementById(styleId); if (el) el.remove(); };
  }, []);

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  const modalContent = (
      <div className={inline ? "relative flex flex-col h-full overflow-hidden" : "relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-2xl overflow-hidden transform modal-content"}>
        {/* Ambient grid background - only in modal mode */}
        {!inline && <div className="absolute inset-0 z-0 opacity-10 bg-grid"></div>}

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
              <ArrowDown size={16} className="color-primary" />
            </div>
            <h2 className="text-lg font-semibold text-app-primary font-mono">
              <span className="color-primary">/</span> BURN PROTOCOL{" "}
              <span className="color-primary">/</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-app-secondary hover:color-primary transition-colors p-1 hover:bg-primary-20 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="relative w-full h-1 bg-app-tertiary progress-bar-">
          <div
            className="h-full bg-app-primary-color transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / STEPS.length) * 100}%`,
            }}
          ></div>
        </div>

        {/* Content */}
        <div className={`relative z-10 p-5 space-y-5 scrollbar ${inline ? "flex-1 overflow-y-auto" : "max-h-[70vh] overflow-y-auto"}`}>
          {/* Step Indicator */}
          <div className="flex w-full mb-6 relative">
            {STEPS.map((step, index) => (
              <React.Fragment key={step}>
                {/* Step circle */}
                <div className="flex-1 flex flex-col items-center relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full font-mono flex items-center justify-center border-2 transition-all duration-300 ${
                      index < currentStep
                        ? "border-app-primary bg-app-primary-color text-app-primary"
                        : index === currentStep
                          ? "border-app-primary color-primary bg-app-primary"
                          : "border-app-primary-20 text-app-muted bg-app-primary"
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle size={16} />
                    ) : (
                      <span className="text-sm">{index + 1}</span>
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className={`mt-2 text-xs transition-all duration-300 font-mono tracking-wide ${
                      index <= currentStep
                        ? "text-app-primary"
                        : "text-app-muted"
                    }`}
                  >
                    {step}
                  </span>
                </div>

                {/* Connector line between steps */}
                {index < STEPS.length - 1 && (
                  <div className="flex-1 flex items-center justify-center relative -mx-1 pb-8 z-0">
                    <div className="h-px w-full bg-app-primary-20 relative">
                      <div
                        className="absolute top-0 left-0 h-full bg-app-primary-color transition-all duration-500"
                        style={{ width: index < currentStep ? "100%" : "0%" }}
                      ></div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step Content */}
          <form
            onSubmit={
              currentStep === STEPS.length - 1
                ? handleBurn
                : (e) => e.preventDefault()
            }
          >
            {/* Step 0: Token Address */}
            {currentStepName === "Token Address" && (
              <div
                className={`space-y-4 ${modalClass || "animate-content-fade"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-app-primary font-mono">
                    <span className="color-primary">/</span> TOKEN ADDRESS{" "}
                    <span className="color-primary">/</span>
                  </h3>
                </div>

                {/* Token Address Input */}
                <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30">
                  <label className="text-sm font-medium text-app-primary font-mono mb-2 block">
                    ENTER_TOKEN_MINT_ADDRESS
                  </label>
                  <input
                    type="text"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value.trim())}
                    placeholder="PASTE_TOKEN_ADDRESS_HERE"
                    className="w-full bg-app-primary border border-app-primary-30 rounded-lg p-3 text-sm text-app-primary focus:outline-none focus-border-primary font-mono tracking-wider"
                  />
                  <p className="text-xs text-app-secondary font-mono mt-2">
                    Enter the Solana token mint address you want to burn
                  </p>
                </div>

                {tokenAddress && (
                  <div className="mt-4 p-4 rounded-lg border border-app-primary-30 bg-primary-05">
                    <div className="flex justify-between items-center">
                      <span className="text-sm color-primary font-mono tracking-wide">
                        TOKEN_SET
                      </span>
                      <div className="flex items-center gap-2 bg-app-tertiary px-2 py-1 rounded-lg border border-app-primary-20">
                        {tokenMeta?.image && (
                          <img src={tokenMeta.image} alt={tokenMeta.symbol} className="w-4 h-4 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        )}
                        <span className="text-sm font-mono text-app-primary">
                          {tokenMeta?.symbol ? `${tokenMeta.symbol} (${formatAddress(tokenAddress)})` : formatAddress(tokenAddress)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {useExternalSource && (
                  <SourceWalletSummary
                    wallets={wallets}
                    selectedWalletIds={selectedWalletIds}
                    baseCurrencyBalances={baseCurrencyBalances}
                    baseCurrency={baseCurrency}
                    label="SOURCE WALLET"
                    mode="single"
                  />
                )}

                {isLoadingBalances && (
                  <div className="flex justify-center items-center h-32">
                    <div className="relative h-12 w-12">
                      <div className="absolute inset-0 rounded-full border-2 border-t-app-primary border-r-app-primary-30 border-b-app-primary-10 border-l-app-primary-30 animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-app-primary-70 border-b-app-primary-50 border-l-transparent animate-spin-slow"></div>
                      <div className="absolute inset-0 rounded-full border border-app-primary-20"></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Select Source Wallet (only when not using external source) */}
            {currentStepName === "Select Source" && (
              <div
                className={`space-y-4 ${modalClass || "animate-content-fade"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="color-primary border border-app-primary-30 p-1 rounded">
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <path d="M16 10h2M6 14h12" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-app-primary font-mono">
                      <span className="color-primary">/</span> SELECT SOURCE{" "}
                      <span className="color-primary">/</span>
                    </h3>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="mb-3 flex space-x-2">
                  <div className="relative flex-grow">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary"
                    />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input- font-mono tracking-wider"
                      placeholder="SEARCH WALLETS_"
                    />
                  </div>

                  <select
                    className="bg-app-tertiary border border-app-primary-30 rounded-lg px-3 text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input- font-mono"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                  >
                    <option value="address">ADDRESS</option>
                    <option value="balance">{baseCurrency.symbol} BAL</option>
                    <option value="tokenBalance">TOKEN BAL</option>
                  </select>

                  <button
                    type="button"
                    className="p-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-secondary hover:text-app-primary hover-border-primary transition-all modal-btn-"
                    onClick={() =>
                      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                    }
                  >
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </button>
                </div>

                <div className="mb-3">
                  <select
                    className="w-full bg-app-tertiary border border-app-primary-30 rounded-lg p-2 text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input- font-mono"
                    value={balanceFilter}
                    onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)}
                  >
                    <option value="all">ALL WALLETS</option>
                    <option value="nonZero">NON-ZERO BALANCE</option>
                    <option value="highBalance">HIGH BALANCE</option>
                    <option value="lowBalance">LOW BALANCE</option>
                  </select>
                </div>

                {/* Wallet Selection */}
                <div className="bg-app-tertiary rounded-lg overflow-hidden border border-app-primary-30">
                  <div className="max-h-64 overflow-y-auto scrollbar">
                    {filterWallets(wallets, searchTerm).length > 0 ? (
                      filterWallets(wallets, searchTerm).map((wallet) => (
                        <div
                          key={wallet.id}
                          className={`flex items-center p-3 cursor-pointer border-b border-app-primary-20 last:border-b-0 transition-all duration-150 hover:bg-app-secondary
                                    ${
                                      sourceWallet === wallet.privateKey
                                        ? "bg-primary-10 border-l-2 border-l-app-primary"
                                        : "border-l-2 border-l-transparent hover:border-l-app-primary-50"
                                    }`}
                          onClick={() => setSourceWallet(wallet.privateKey)}
                        >
                          <div
                            className={`w-4 h-4 mr-3 rounded-full flex items-center justify-center transition-all duration-200
                                          ${
                                            sourceWallet === wallet.privateKey
                                              ? "bg-app-primary-color"
                                              : "border border-app-secondary"
                                          }`}
                          >
                            {sourceWallet === wallet.privateKey && (
                              <CheckCircle
                                size={10}
                                className="text-app-primary"
                              />
                            )}
                          </div>
                          <div className="flex-1 flex justify-between items-center">
                            <span className="font-mono text-sm text-app-primary glitch-text">
                              {getWalletDisplayName(wallet)}
                            </span>
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-app-secondary font-mono">
                                {(
                                  baseCurrencyBalances.get(wallet.address) || 0
                                ).toFixed(baseCurrency.isNative ? 4 : 2)}{" "}
                                {baseCurrency.symbol}
                              </span>
                              {(tokenBalancesForWallets.get(wallet.address) ||
                                0) > 0 && (
                                <span className="text-xs color-primary font-mono">
                                  {(
                                    tokenBalancesForWallets.get(
                                      wallet.address,
                                    ) || 0
                                  ).toFixed(4)}{" "}
                                  {tokenMeta?.symbol || tokenAddress.slice(0, 4)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-app-secondary text-center font-mono">
                        {searchTerm
                          ? "[ NO MATCHING WALLETS FOUND ]"
                          : "[ NO WALLETS AVAILABLE ]"}
                      </div>
                    )}
                  </div>
                </div>

                {sourceWallet && (
                  <div className="mt-4 p-4 rounded-lg border border-app-primary-30 bg-primary-05">
                    <div className="flex justify-between items-center">
                      <span className="text-sm color-primary font-mono tracking-wide">
                        SELECTED_WALLET
                      </span>
                      <div className="flex items-center bg-app-tertiary px-2 py-1 rounded-lg border border-app-primary-20">
                        <span className="text-sm font-mono text-app-primary glitch-text">
                          {getWalletDisplayName(
                            wallets.find((w) => w.privateKey === sourceWallet)!,
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-app-secondary font-mono">
                        BALANCES
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-app-primary font-mono">
                          {(
                            baseCurrencyBalances.get(
                              wallets.find((w) => w.privateKey === sourceWallet)
                                ?.address || "",
                            ) || 0
                          ).toFixed(baseCurrency.isNative ? 4 : 2)}{" "}
                          {baseCurrency.symbol}
                        </span>
                        <span className="text-sm color-primary font-mono">
                          {(
                            tokenBalancesForWallets.get(
                              wallets.find((w) => w.privateKey === sourceWallet)
                                ?.address || "",
                            ) || 0
                          ).toFixed(4)}{" "}
                          {tokenMeta?.symbol || tokenAddress.slice(0, 4)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Enter Burn Amount */}
            {currentStepName === "Burn Details" && (
              <div
                className={`space-y-6 ${modalClass || "animate-content-fade"}`}
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="color-primary border border-app-primary-30 p-1 rounded">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 19l-7-7 7-7M5 12h14" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-app-primary font-mono">
                    <span className="color-primary">/</span> BURN AMOUNT{" "}
                    <span className="color-primary">/</span>
                  </h3>
                </div>

                {isLoadingTokens ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="relative h-12 w-12">
                      <div className="absolute inset-0 rounded-full border-2 border-t-app-primary border-r-app-primary-30 border-b-app-primary-10 border-l-app-primary-30 animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-app-primary-70 border-b-app-primary-50 border-l-transparent animate-spin-slow"></div>
                      <div className="absolute inset-0 rounded-full border border-app-primary-20"></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected Token Info */}
                    <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-app-primary font-mono">
                          SELECTED_TOKEN
                        </span>
                        {tokenAccounts.find((t) => t.mint === tokenAddress) ? (
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-primary-20 border border-app-primary-30 flex items-center justify-center mr-2">
                              <span className="text-xs color-primary font-mono">
                                {getSelectedTokenSymbol()[0] || "T"}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm text-app-primary font-mono">
                                {getSelectedTokenSymbol()}
                              </span>
                              <span className="text-xs text-app-secondary font-mono">
                                BAL: {getSelectedTokenBalance()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-app-secondary font-mono">
                            {tokenMeta?.symbol || `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Source Wallet Info */}
                    <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-app-primary font-mono">
                          SOURCE_WALLET
                        </span>
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-app-tertiary border border-app-primary-30 flex items-center justify-center mr-2">
                            <svg
                              className="w-3 h-3 text-app-secondary"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect x="2" y="5" width="20" height="14" rx="2" />
                              <path d="M16 10h2M6 14h12" />
                            </svg>
                          </div>
                          <span className="text-sm text-app-primary font-mono glitch-text">
                            {getWalletDisplayName(
                              wallets.find(
                                (w) => w.privateKey === sourceWallet,
                              )!,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-app-secondary font-mono">
                          BALANCES
                        </span>
                        <div className="flex flex-col items-end">
                          <span className="text-sm text-app-primary font-mono">
                            {(
                              baseCurrencyBalances.get(
                                wallets.find(
                                  (w) => w.privateKey === sourceWallet,
                                )?.address || "",
                              ) || 0
                            ).toFixed(baseCurrency.isNative ? 4 : 2)}{" "}
                            {baseCurrency.symbol}
                          </span>
                          <span className="text-sm color-primary font-mono">
                            {(
                              tokenBalances.get(
                                wallets.find(
                                  (w) => w.privateKey === sourceWallet,
                                )?.address || "",
                              ) || 0
                            ).toFixed(4)}{" "}
                            {tokenMeta?.symbol || tokenAddress.slice(0, 4)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Amount Input with  design */}
                    <div className="space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <label className="text-sm font-medium text-app-primary font-mono">
                            BURN_AMOUNT
                          </label>
                          <div
                            className="relative"
                            onMouseEnter={() => setShowInfoTip(true)}
                            onMouseLeave={() => setShowInfoTip(false)}
                          >
                            <Info
                              size={14}
                              className="text-app-secondary cursor-help"
                            />
                            {showInfoTip && (
                              <div className="absolute left-0 bottom-full mb-2 p-2 bg-app-tertiary border border-app-primary-30 rounded-lg shadow-lg text-xs text-app-primary w-48 z-10 font-mono">
                                <span className="color-primary">!</span> This
                                amount will be permanently destroyed
                              </div>
                            )}
                          </div>
                        </div>
                        {tokenAccounts.find((t) => t.mint === tokenAddress) && (
                          <button
                            type="button"
                            onClick={() =>
                              setAmount(getSelectedTokenBalance().toString())
                            }
                            className="text-xs px-2 py-0.5 bg-primary-10 hover:bg-primary-20 border border-app-primary-30 color-primary rounded-lg transition-all modal-btn- font-mono"
                          >
                            MAX
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        {/* Decorative elements for  input */}
                        <div className="absolute -top-px left-4 right-4 h-px bg-app-primary-50"></div>
                        <div className="absolute -bottom-px left-4 right-4 h-px bg-app-primary-50"></div>
                        <div className="absolute top-3 -left-px bottom-3 w-px bg-app-primary-50"></div>
                        <div className="absolute top-3 -right-px bottom-3 w-px bg-app-primary-50"></div>

                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setAmount(value);
                            }
                          }}
                          placeholder="ENTER_AMOUNT_TO_BURN"
                          className="w-full pl-4 pr-16 py-3 bg-app-primary border border-app-primary-30 rounded-lg text-app-primary focus:outline-none focus-border-primary transition-all modal-input- font-mono tracking-wider"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm color-primary font-mono">
                          {getSelectedTokenSymbol()}
                        </div>
                      </div>
                    </div>

                    {/* Summary Box with burn visualization */}
                    {amount && parseFloat(amount) > 0 && (
                      <div className="relative mt-6 rounded-lg overflow-hidden">
                        {/*  burn effect background */}
                        <div className="absolute inset-0 bg-gradient-to-b from-primary-05 to-transparent"></div>
                        <div className="absolute inset-0 modal-content::before pointer-events-none opacity-30"></div>

                        <div className="relative p-4 border border-app-primary-30 rounded-lg">
                          <div className="absolute top-0 right-0 p-1 bg-app-primary border-l border-b border-app-primary-30 color-primary text-xs font-mono">
                            BURN_PREVIEW
                          </div>

                          <div className="flex justify-between items-center mt-4">
                            <span className="text-sm text-app-secondary font-mono">
                              BURN_AMOUNT
                            </span>
                            <span className="text-sm font-semibold color-primary font-mono glitch-text">
                              {amount} {getSelectedTokenSymbol()}
                            </span>
                          </div>

                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-app-secondary font-mono">
                              CURRENT_BALANCE
                            </span>
                            <span className="text-sm text-app-primary font-mono">
                              {getSelectedTokenBalance()}{" "}
                              {getSelectedTokenSymbol()}
                            </span>
                          </div>

                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-app-secondary font-mono">
                              BALANCE_AFTER_BURN
                            </span>
                            <span className="text-sm text-app-primary font-mono">
                              {Math.max(
                                0,
                                getSelectedTokenBalance() - parseFloat(amount),
                              ).toFixed(4)}{" "}
                              {getSelectedTokenSymbol()}
                            </span>
                          </div>

                          {/* Visual representation of burning */}
                          <div className="mt-4 h-2 bg-app-tertiary rounded-lg overflow-hidden">
                            <div
                              className="h-full bg-app-primary-color transition-all duration-500"
                              style={{
                                width: `${Math.min(100, (parseFloat(amount) / getSelectedTokenBalance()) * 100)}%`,
                              }}
                            ></div>
                          </div>
                          <div className="mt-1 flex justify-between text-xs text-app-secondary font-mono">
                            <span>0</span>
                            <span>{getSelectedTokenBalance()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review and Confirm */}
            {currentStepName === "Review" && (
              <div
                className={`space-y-6 ${modalClass || "animate-content-fade"}`}
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div className="color-primary border border-app-primary-30 p-1 rounded">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-app-primary font-mono">
                    <span className="color-primary">/</span> REVIEW BURN{" "}
                    <span className="color-primary">/</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column - Summary */}
                  <div className="space-y-4">
                    <div className="bg-app-tertiary rounded-lg border border-app-primary-30 p-4">
                      <h4 className="text-base font-semibold text-app-primary font-mono mb-3">
                        <span className="color-primary">&gt;</span> BURN_SUMMARY
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-app-secondary font-mono">
                            TOKEN
                          </span>
                          <div className="flex items-center">
                            {tokenMeta?.image ? (
                              <img src={tokenMeta.image} alt={tokenMeta.symbol} className="w-5 h-5 rounded-full object-cover mr-2" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary-20 border border-app-primary-30 flex items-center justify-center mr-2">
                                <span className="text-xs color-primary font-mono">
                                  {getSelectedTokenSymbol()[0] || "T"}
                                </span>
                              </div>
                            )}
                            <span className="text-sm text-app-primary font-mono">
                              {getSelectedTokenSymbol()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-app-secondary font-mono">
                            TOKEN_ADDR
                          </span>
                          <span className="text-sm font-mono text-app-primary glitch-text">
                            {tokenMeta?.symbol || `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-app-secondary font-mono">
                            SOURCE
                          </span>
                          <span className="text-sm font-mono text-app-primary glitch-text">
                            {formatAddress(
                              wallets.find((w) => w.privateKey === sourceWallet)
                                ?.address || "",
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-app-secondary font-mono">
                            BALANCE
                          </span>
                          <span className="text-sm text-app-primary font-mono">
                            {getSelectedTokenBalance()}{" "}
                            {getSelectedTokenSymbol()}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-app-primary-30 flex items-center justify-between">
                          <span className="text-sm font-medium text-app-primary font-mono">
                            BURN_AMOUNT
                          </span>
                          <span className="text-sm font-semibold color-primary font-mono glitch-text">
                            {amount} {getSelectedTokenSymbol()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-app-secondary font-mono">
                            NEW_BALANCE
                          </span>
                          <span className="text-sm text-app-primary font-mono">
                            {Math.max(
                              0,
                              getSelectedTokenBalance() - parseFloat(amount),
                            ).toFixed(4)}{" "}
                            {getSelectedTokenSymbol()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Warning Box */}
                    <div className="relative bg-primary-05 border border-app-primary-20 rounded-lg p-3 overflow-hidden">
                      {/* Scanline effect */}
                      <div className="absolute inset-0 modal-content::before pointer-events-none opacity-20"></div>

                      <div className="flex items-start color-primary text-sm">
                        <svg
                          className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-mono leading-relaxed">
                          <span className="font-bold">WARNING:</span> This burn
                          operation is permanent and irreversible. The tokens
                          will be destroyed from the blockchain.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Burn Effect Visualization */}
                  <div className="bg-app-tertiary rounded-lg border border-app-primary-30 p-4 relative overflow-hidden">
                    {/* Futuristic decorations */}
                    <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-app-primary-20"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-app-primary-20"></div>

                    <h4 className="text-base font-semibold text-app-primary font-mono mb-6 relative z-10">
                      <span className="color-primary">&gt;</span> BURN_EFFECT
                    </h4>

                    <div className="flex flex-col items-center justify-center h-44 space-y-6 relative z-10">
                      <div className="flex items-center justify-center w-full">
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-app-secondary mb-1 font-mono">
                            CURRENT
                          </span>
                          <div className="text-lg font-semibold text-app-primary font-mono">
                            {getSelectedTokenBalance()}{" "}
                            {getSelectedTokenSymbol()}
                          </div>
                        </div>
                      </div>

                      {/* Animated burn arrow */}
                      <div className="relative">
                        <ArrowDown size={24} className="color-primary" />
                        <div className="absolute inset-0 animate-pulse-slow color-primary">
                          <ArrowDown size={24} className="opacity-50" />
                        </div>
                      </div>

                      <div className="flex items-center justify-center w-full">
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-app-secondary mb-1 font-mono">
                            AFTER_BURN
                          </span>
                          <div className="text-lg font-semibold color-primary font-mono glitch-text">
                            {Math.max(
                              0,
                              getSelectedTokenBalance() - parseFloat(amount),
                            ).toFixed(4)}{" "}
                            {getSelectedTokenSymbol()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Destructive animation effect */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/4 from-primary-10 bg-gradient-to-t to-transparent"></div>
                  </div>
                </div>

                {/* Confirmation Checkbox with  style */}
                <div className="bg-app-tertiary rounded-lg border border-app-primary-30 p-4 mt-4">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setIsConfirmed(!isConfirmed)}
                  >
                    <div className="relative mt-1">
                      <div
                        className={`w-5 h-5 border border-app-primary-40 rounded transition-all ${isConfirmed ? "bg-app-primary-color border-0" : ""}`}
                      ></div>
                      <CheckCircle
                        size={14}
                        className={`absolute top-0.5 left-0.5 text-app-primary transition-all ${isConfirmed ? "opacity-100" : "opacity-0"}`}
                      />
                    </div>
                    <span className="text-sm text-app-primary leading-relaxed font-mono select-none">
                      I confirm that I want to burn{" "}
                      <span className="color-primary font-medium">
                        {amount} {getSelectedTokenSymbol()}
                      </span>
                      . I understand this action cannot be undone and the tokens
                      will be permanently removed from circulation.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Futuristic Navigation Button Bar */}
            <div className="flex justify-between mt-8 relative">
              {/* Back Button */}
              <button
                type="button"
                onClick={currentStep === 0 ? onClose : handleBack}
                disabled={isSubmitting}
                className={`px-4 py-2 bg-app-tertiary border border-app-primary-30 hover-border-primary rounded-lg transition-all modal-btn- flex items-center ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {currentStep === 0 ? (
                  <span className="font-mono text-app-primary">CANCEL</span>
                ) : (
                  <div className="flex items-center font-mono text-app-primary">
                    <ChevronLeft size={16} className="mr-1" />
                    BACK
                  </div>
                )}
              </button>

              {/* Next/Submit Button */}
              <button
                type={
                  currentStep === STEPS.length - 1 ? "submit" : "button"
                }
                onClick={
                  currentStep === STEPS.length - 1 ? undefined : handleNext
                }
                disabled={
                  isSubmitting ||
                  isLoadingBalances ||
                  (currentStepName === "Token Address" && !tokenAddress) ||
                  (currentStepName === "Select Source" && !sourceWallet) ||
                  (currentStepName === "Burn Details" && (!amount || parseFloat(amount) <= 0)) ||
                  (currentStepName === "Review" && !isConfirmed)
                }
                className={`px-5 py-2.5 rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider
                          ${
                            isSubmitting ||
                            isLoadingBalances ||
                            (currentStepName === "Token Address" && !tokenAddress) ||
                            (currentStepName === "Select Source" && !sourceWallet) ||
                            (currentStepName === "Burn Details" &&
                              (!amount || parseFloat(amount) <= 0)) ||
                            (currentStepName === "Review" &&
                              !isConfirmed)
                              ? "bg-app-primary-50 text-app-primary-80 cursor-not-allowed opacity-50"
                              : "bg-app-primary-color text-app-primary hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-"
                          }`}
              >
                {/* Button Content */}
                {currentStep === STEPS.length - 1 ? (
                  isSubmitting ? (
                    <div className="flex items-center justify-center font-mono">
                      <div className="h-4 w-4 rounded-full border-2 border-app-primary-80 border-t-transparent animate-spin mr-2"></div>
                      <span>PROCESSING...</span>
                    </div>
                  ) : (
                    <span>CONFIRM_BURN</span>
                  )
                ) : isLoadingBalances ? (
                  <div className="flex items-center justify-center font-mono">
                    <div className="h-4 w-4 rounded-full border-2 border-app-primary-80 border-t-transparent animate-spin mr-2"></div>
                    <span>LOADING...</span>
                  </div>
                ) : (
                  <div className="flex items-center font-mono">
                    <span>NEXT</span>
                    <ChevronRight size={16} className="ml-1" />
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
  );

  if (inline) return modalContent;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-app-primary-85">
      {modalContent}
    </div>,
    document.body,
  );
};
