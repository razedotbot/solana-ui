import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ArrowsUpFromLine,
  DollarSign,
  X,
  CheckCircle,
  Info,
  Search,
  ChevronRight,
  Settings,
} from "lucide-react";
import type { Connection } from "@solana/web3.js";
import { useToast } from "../../utils/hooks";
import { getWalletDisplayName } from "../../utils/wallet";
import type { WalletType, ComponentWalletAmount } from "../../utils/types";
import {
  batchDistributeBaseCurrency,
  validateDistributionInputs,
} from "../../utils/distribute";
import { batchMixBaseCurrency, validateMixingInputs } from "../../utils/mixer";
import type { BaseCurrencyConfig } from "../../utils/constants";
import { SourceWalletSummary } from "./SourceWalletSummary";
import { BASE_CURRENCIES } from "../../utils/constants";
import { filterAndSortWallets } from "./walletFilterUtils";
import type { BalanceFilter, SortOption, SortDirection } from "./walletFilterUtils";

type FundingMode = "distribute" | "mixer";

interface FundPanelProps {
  isOpen: boolean;
  inline?: boolean;
  onClose: () => void;
  wallets: WalletType[];
  baseCurrencyBalances: Map<string, number>;
  connection: Connection;
  initialMode?: FundingMode;
  baseCurrency?: BaseCurrencyConfig;
  selectedWalletIds?: Set<number>;
}

// Using ComponentWalletAmount from types (alias for modal form handling)

export const FundPanel: React.FC<FundPanelProps> = ({
  isOpen,
  inline = false,
  onClose,
  wallets,
  baseCurrencyBalances,
  initialMode = "distribute",
  baseCurrency = BASE_CURRENCIES.SOL,
  selectedWalletIds,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [fundingMode, setFundingMode] = useState<FundingMode>(initialMode);
  const { showToast } = useToast();

  const [selectedRecipientWallets, setSelectedRecipientWallets] = useState<
    string[]
  >([]);
  const [selectedSenderWallet, setSelectedSenderWallet] = useState("");
  const [commonAmount, setCommonAmount] = useState("");
  const [useCustomAmounts, setUseCustomAmounts] = useState(false);
  const [walletAmounts, setWalletAmounts] = useState<ComponentWalletAmount[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [senderSearchTerm, setSenderSearchTerm] = useState("");
  const [showInfoTip, setShowInfoTip] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("address");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");

  const useExternalRecipients = inline && selectedWalletIds !== undefined;

  useEffect(() => {
    if (useExternalRecipients && currentStep === 0) {
      const recipientAddresses = Array.from(selectedWalletIds)
        .map((id) => wallets.find((w) => w.id === id))
        .filter((w): w is WalletType => !!w)
        .map((w) => w.address);
      setSelectedRecipientWallets(recipientAddresses);
    }
  }, [useExternalRecipients, selectedWalletIds, wallets, currentStep]);

  // Get wallet base currency balance by address
  const getWalletBalance = useCallback(
    (address: string): number => {
      return baseCurrencyBalances.has(address)
        ? baseCurrencyBalances.get(address) || 0
        : 0;
    },
    [baseCurrencyBalances],
  );

  const calculateTotalAmount = (): number => {
    if (useCustomAmounts) {
      return walletAmounts.reduce((total, item) => {
        return total + (parseFloat(item.amount) || 0);
      }, 0);
    } else {
      return parseFloat(commonAmount || "0") * selectedRecipientWallets.length;
    }
  };

  // Function to highlight recipients with missing amounts
  const hasEmptyAmounts = (): boolean => {
    if (!useCustomAmounts) return false;

    return walletAmounts.some(
      (wallet) =>
        selectedRecipientWallets.includes(wallet.address) &&
        (!wallet.amount || parseFloat(wallet.amount) === 0),
    );
  };

  const totalAmount = calculateTotalAmount();
  const senderBalance = getWalletBalance(selectedSenderWallet) || 0;
  const hasEnoughBalance = totalAmount <= senderBalance;

  const resetForm = useCallback((): void => {
    setCurrentStep(0);
    setIsConfirmed(false);
    setSelectedRecipientWallets([]);
    setSelectedSenderWallet("");
    setCommonAmount("");
    setUseCustomAmounts(false);
    setWalletAmounts([]);
    setSearchTerm("");
    setSenderSearchTerm("");
    setSortOption("address");
    setSortDirection("asc");
    setBalanceFilter("all");
  }, []);

  // Update wallet amounts based on selected wallets
  const updateWalletAmounts = useCallback((): void => {
    setWalletAmounts((prevWalletAmounts) => {
      if (useCustomAmounts) {
        // Maintain existing amounts for wallets that remain selected
        const existingAmounts = new Map(
          prevWalletAmounts.map((w) => [w.address, w.amount]),
        );

        // Create a new walletAmounts array with currently selected wallets
        const newWalletAmounts = selectedRecipientWallets.map((address) => ({
          address,
          amount: existingAmounts.get(address) || commonAmount || "",
        }));

        return newWalletAmounts;
      } else {
        // When using common amount, just create entries with the common amount
        const newWalletAmounts = selectedRecipientWallets.map((address) => ({
          address,
          amount: commonAmount,
        }));

        return newWalletAmounts;
      }
    });
  }, [useCustomAmounts, selectedRecipientWallets, commonAmount]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setFundingMode(initialMode);
    }
  }, [isOpen, resetForm, initialMode]);

  // Update walletAmounts when selectedRecipientWallets change
  useEffect(() => {
    updateWalletAmounts();
  }, [selectedRecipientWallets, updateWalletAmounts]);

  // Update wallet amounts when toggling between common/custom amounts
  useEffect(() => {
    updateWalletAmounts();
  }, [useCustomAmounts, commonAmount, updateWalletAmounts]);

  const formatBalance = (balance: number): string => {
    return baseCurrency.isNative ? balance.toFixed(4) : balance.toFixed(2);
  };

  const getWalletByAddress = (address: string): WalletType | undefined => {
    return wallets.find((wallet) => wallet.address === address);
  };

  const getPrivateKeyByAddress = (address: string): string => {
    const wallet = getWalletByAddress(address);
    return wallet ? wallet.privateKey : "";
  };

  const handleWalletAmountChange = (address: string, value: string): void => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setWalletAmounts((prev) =>
        prev.map((wallet) =>
          wallet.address === address ? { ...wallet, amount: value } : wallet,
        ),
      );
    }
  };

  // Handle fund operation (distribute or mixer)
  const handleFund = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsSubmitting(true);

    try {
      const senderPrivateKey = getPrivateKeyByAddress(selectedSenderWallet);
      if (!senderPrivateKey) {
        showToast("Sender wallet private key not found", "error");
        setIsSubmitting(false);
        return;
      }

      const senderWallet = {
        address: selectedSenderWallet,
        privateKey: senderPrivateKey,
        amount: "0", // Not used for sender
      };

      // Prepare recipient wallets with their private keys and amounts
      const recipientWallets = walletAmounts
        .filter((wallet) => selectedRecipientWallets.includes(wallet.address))
        .map((wallet) => ({
          address: wallet.address,
          privateKey: getPrivateKeyByAddress(wallet.address),
          amount: wallet.amount,
        }))
        .filter((wallet) => wallet.privateKey && wallet.amount);

      let validation;
      if (fundingMode === "distribute") {
        validation = validateDistributionInputs(
          senderWallet,
          recipientWallets,
          senderBalance,
          baseCurrency.symbol,
        );
      } else {
        validation = validateMixingInputs(
          senderWallet,
          recipientWallets,
          senderBalance,
          baseCurrency.symbol,
        );
      }

      if (!validation.valid) {
        showToast(validation.error || `Invalid ${fundingMode} data`, "error");
        setIsSubmitting(false);
        return;
      }

      let result;
      if (fundingMode === "distribute") {
        result = await batchDistributeBaseCurrency(
          senderWallet,
          recipientWallets,
          baseCurrency,
        );
      } else {
        result = await batchMixBaseCurrency(
          senderWallet,
          recipientWallets,
          baseCurrency,
        );
      }

      if (result.success) {
        const modeText = fundingMode === "distribute" ? "distributed" : "mixed";
        showToast(`${baseCurrency.symbol} ${modeText} successfully`, "success");
        resetForm();
        onClose();
      } else {
        const modeText =
          fundingMode === "distribute" ? "Distribution" : "Mixing";
        showToast(result.error || `${modeText} failed`, "error");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const modeText = fundingMode === "distribute" ? "Distribution" : "Mixing";
      showToast(
        `${modeText} failed: ` + (errorMessage || "Unknown error"),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle recipient wallet selection toggles
  const toggleRecipientWalletSelection = (address: string): void => {
    setSelectedRecipientWallets((prev) => {
      if (prev.includes(address)) {
        return prev.filter((a) => a !== address);
      } else {
        return [...prev, address];
      }
    });
  };

  // Get available wallets for recipient selection (exclude sender)
  const getAvailableRecipientWallets = (): WalletType[] => {
    return wallets.filter((wallet) => wallet.address !== selectedSenderWallet);
  };

  // Get available wallets for sender selection (exclude recipients and zero balance wallets)
  const getAvailableSenderWallets = (): WalletType[] => {
    return wallets.filter(
      (wallet) =>
        !selectedRecipientWallets.includes(wallet.address) &&
        (getWalletBalance(wallet.address) || 0) > 0,
    );
  };

  // Handle select/deselect all for recipient wallets
  const handleSelectAllRecipients = (): void => {
    if (
      selectedRecipientWallets.length === getAvailableRecipientWallets().length
    ) {
      setSelectedRecipientWallets([]);
    } else {
      setSelectedRecipientWallets(
        getAvailableRecipientWallets().map((wallet) => wallet.address),
      );
    }
  };

  // Apply common amount to all selected wallets
  const applyCommonAmountToAll = (): void => {
    setWalletAmounts((prev) =>
      prev.map((wallet) => ({ ...wallet, amount: commonAmount })),
    );
  };

  // Filter and sort wallets based on search term and other criteria
  const filterWallets = (
    walletList: WalletType[],
    search: string,
  ): WalletType[] => {
    return filterAndSortWallets(
      walletList,
      search,
      balanceFilter,
      sortOption,
      sortDirection,
      (address) => getWalletBalance(address),
    );
  };

  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getWalletAmount = (address: string): string => {
    const wallet = walletAmounts.find((w) => w.address === address);
    return wallet ? wallet.amount : "";
  };

  const getModeText = (): {
    title: string;
    action: string;
    summaryTitle: string;
    totalLabel: string;
    confirmText: string;
    infoTip: string;
  } => {
    return {
      title:
        fundingMode === "distribute"
          ? `DISTRIBUTE ${baseCurrency.symbol}`
          : `${baseCurrency.symbol} MIXER`,
      action:
        fundingMode === "distribute"
          ? `DISTRIBUTE ${baseCurrency.symbol}`
          : `MIX ${baseCurrency.symbol}`,
      summaryTitle:
        fundingMode === "distribute"
          ? "DISTRIBUTION SUMMARY"
          : "MIXING SUMMARY",
      totalLabel:
        fundingMode === "distribute" ? "TOTAL TO SEND:" : "TOTAL TO MIX:",
      confirmText:
        fundingMode === "distribute"
          ? "I CONFIRM THIS DISTRIBUTION OPERATION"
          : "I CONFIRM THIS MIXING OPERATION",
      infoTip:
        fundingMode === "distribute"
          ? "This amount will be sent to each selected recipient wallet"
          : "This amount will be mixed to each selected recipient wallet",
    };
  };

  const modeText = getModeText();

  // Inject modal styles via useEffect
  useEffect(() => {
    if (!isOpen) return;
    const id = "fund-modal-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
    @keyframes modal-pulse {
      0% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
      50% { box-shadow: 0 0 15px var(--color-primary-80), 0 0 25px var(--color-primary-40); }
      100% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
    }

    @keyframes modal-fade-in {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }

    @keyframes modal-slide-up {
      0% { transform: translateY(20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }

    @keyframes modal-scan-line {
      0% { transform: translateY(-100%); opacity: 0.3; }
      100% { transform: translateY(100%); opacity: 0; }
    }

    .modal-content {
      position: relative;
    }

    .modal-input-:focus {
      box-shadow: 0 0 0 1px var(--color-primary-70), 0 0 15px var(--color-primary-50);
      transition: all 0.3s ease;
    }

    .modal-btn- {
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .modal-btn-::after {
      content: "";
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        to bottom right,
        var(--color-primary-05) 0%,
        var(--color-primary-30) 50%,
        var(--color-primary-05) 100%
      );
      transform: rotate(45deg);
      transition: all 0.5s ease;
      opacity: 0;
    }

    .modal-btn-:hover::after {
      opacity: 1;
      transform: rotate(45deg) translate(50%, 50%);
    }

    .modal-btn-:active {
      transform: scale(0.95);
    }

    .progress-bar- {
      position: relative;
      overflow: hidden;
    }

    .progress-bar-::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        var(--color-primary-70) 50%,
        transparent 100%
      );
      width: 100%;
      height: 100%;
      transform: translateX(-100%);
      animation: progress-shine 3s infinite;
    }

    @keyframes progress-shine {
      0% { transform: translateX(-100%); }
      20% { transform: translateX(100%); }
      100% { transform: translateX(100%); }
    }

    .glitch-text:hover {
      text-shadow: 0 0 2px var(--color-primary), 0 0 4px var(--color-primary);
      animation: glitch 2s infinite;
    }

    @keyframes glitch {
      2%, 8% { transform: translate(-2px, 0) skew(0.3deg); }
      4%, 6% { transform: translate(2px, 0) skew(-0.3deg); }
      62%, 68% { transform: translate(0, 0) skew(0.33deg); }
      64%, 66% { transform: translate(0, 0) skew(-0.33deg); }
    }

    /* Responsive styles */
    @media (max-width: 1024px) {
      .modal-flex-col-lg {
        flex-direction: column;
      }
      .modal-w-full-lg {
        width: 100%;
      }
      .modal-mt-4-lg {
        margin-top: 1rem;
      }
    }

    @media (max-width: 768px) {
      .modal-flex-col-md {
        flex-direction: column;
      }
      .modal-w-full-md {
        width: 100%;
      }
      .modal-mt-4-md {
        margin-top: 1rem;
      }
    }

    @media (max-width: 640px) {
      .modal-text-xs-sm {
        font-size: 0.75rem;
      }
      .modal-p-3-sm {
        padding: 0.75rem;
      }
      .modal-mx-1-sm {
        margin-left: 0.25rem;
        margin-right: 0.25rem;
      }
    }
  `;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [isOpen]);

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  const modalContent = (
    <div className={inline ? "relative flex flex-col h-full overflow-hidden" : "relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-6xl overflow-hidden transform modal-content"}>
        {/* Ambient grid background - only in modal mode, inline uses PageBackground */}
        {!inline && <div className="absolute inset-0 z-0 opacity-10 bg-grid"></div>}

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
              <ArrowsUpFromLine size={16} className="color-primary" />
            </div>
            <h2 className="text-lg font-semibold text-app-primary font-mono">
              <span className="color-primary">/</span> {modeText.title}{" "}
              <span className="color-primary">/</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-app-secondary hover:color-primary-light transition-colors p-1 hover:bg-primary-20 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="relative w-full h-1 bg-app-tertiary progress-bar-">
          <div
            className="h-full bg-app-primary-color transition-all duration-300"
            style={{ width: currentStep === 0 ? "50%" : "100%" }}
          ></div>
        </div>

        {/* Content */}
        <div className={`relative z-10 p-4 space-y-4 ${inline ? "flex-1 overflow-y-auto" : ""}`}>
          {currentStep === 0 && (
            <div className="animate-[fadeIn_0.3s_ease]">
              {/* Horizontal Layout of Wallets */}
              <div className="flex flex-col space-y-4">
                {/* Sender Wallet */}
                <div className="w-full">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> From Wallet{" "}
                      <span className="color-primary">&#60;</span>
                    </label>
                    {selectedSenderWallet && (
                      <div className="flex items-center gap-1 text-xs">
                        <DollarSign size={10} className="text-app-secondary" />
                        <span className="color-primary font-medium font-mono">
                          {formatBalance(senderBalance)} {baseCurrency.symbol}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sender Search and Filters */}
                  <div className="mb-2 flex space-x-2">
                    <div className="relative flex-grow">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary"
                      />
                      <input
                        type="text"
                        value={senderSearchTerm}
                        onChange={(e) => setSenderSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input- font-mono"
                        placeholder="SEARCH SENDER WALLETS..."
                      />
                    </div>

                    <select
                      className="bg-app-tertiary border border-app-primary-30 rounded-lg px-2 text-sm text-app-primary focus:outline-none focus-border-primary modal-input- font-mono"
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as SortOption)}
                    >
                      <option value="address">ADDRESS</option>
                      <option value="balance">BALANCE</option>
                    </select>

                    <button
                      className="p-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-secondary hover:color-primary-light hover-border-primary transition-all modal-btn-"
                      onClick={() =>
                        setSortDirection(
                          sortDirection === "asc" ? "desc" : "asc",
                        )
                      }
                    >
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-app-primary-20 rounded-lg shadow-inner bg-app-tertiary transition-all duration-200 hover-border-primary-40 scrollbar-thin">
                    {filterWallets(
                      getAvailableSenderWallets(),
                      senderSearchTerm,
                    ).length > 0 ? (
                      filterWallets(
                        getAvailableSenderWallets(),
                        senderSearchTerm,
                      ).map((wallet) => (
                        <div
                          key={wallet.id}
                          className={`flex items-center p-2.5 hover-bg-secondary cursor-pointer transition-all duration-200 border-b border-app-primary-20 last:border-b-0
                                    ${selectedSenderWallet === wallet.address ? "bg-primary-10 border-app-primary-30" : ""}`}
                          onClick={() =>
                            setSelectedSenderWallet(wallet.address)
                          }
                        >
                          <div
                            className={`w-5 h-5 mr-3 rounded flex items-center justify-center transition-all duration-300
                                          ${
                                            selectedSenderWallet ===
                                            wallet.address
                                              ? "bg-app-primary-color shadow-md shadow-app-primary-40"
                                              : "border border-app-primary-30 bg-app-tertiary"
                                          }`}
                          >
                            {selectedSenderWallet === wallet.address && (
                              <CheckCircle
                                size={14}
                                className="text-app-primary animate-[fadeIn_0.2s_ease]"
                              />
                            )}
                          </div>
                          <div className="flex-1 flex justify-between items-center">
                            <span className="font-mono text-sm text-app-primary glitch-text">
                              {getWalletDisplayName(wallet)}
                            </span>
                            <span className="text-xs text-app-secondary font-mono">
                              {formatBalance(
                                getWalletBalance(wallet.address) || 0,
                              )}{" "}
                              {baseCurrency.symbol}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-app-secondary text-center font-mono">
                        {senderSearchTerm
                          ? "NO WALLETS FOUND"
                          : "NO WALLETS AVAILABLE"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recipient Wallets */}
                {useExternalRecipients ? (
                  <SourceWalletSummary
                    wallets={wallets}
                    selectedWalletIds={selectedWalletIds}
                    baseCurrencyBalances={baseCurrencyBalances}
                    baseCurrency={baseCurrency}
                    label="TO WALLETS"
                    mode="multi"
                  />
                ) : (
                <div className="w-full">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> To Wallets{" "}
                      <span className="color-primary">&#60;</span>
                    </label>
                    <button
                      onClick={handleSelectAllRecipients}
                      className="text-xs px-2 py-0.5 bg-app-tertiary hover-bg-secondary text-app-secondary hover:color-primary-light rounded border border-app-primary-30 hover-border-primary transition-all duration-200 font-mono"
                    >
                      {selectedRecipientWallets.length ===
                      getAvailableRecipientWallets().length
                        ? "DESELECT ALL"
                        : "SELECT ALL"}
                    </button>
                  </div>

                  {/* Recipient Search and Filters */}
                  <div className="mb-2 flex space-x-2">
                    <div className="relative flex-grow">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary"
                      />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input- font-mono"
                        placeholder="SEARCH RECIPIENT WALLETS..."
                      />
                    </div>

                    <select
                      className="bg-app-tertiary border border-app-primary-30 rounded-lg px-2 text-sm text-app-primary focus:outline-none focus-border-primary modal-input- font-mono"
                      value={balanceFilter}
                      onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)}
                    >
                      <option value="all">ALL</option>
                      <option value="nonZero">NON-ZERO</option>
                      <option value="highBalance">HIGH BAL</option>
                      <option value="lowBalance">LOW BAL</option>
                    </select>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-app-primary-20 rounded-lg shadow-inner bg-app-tertiary transition-all duration-200 hover-border-primary-40 scrollbar-thin">
                    {filterWallets(getAvailableRecipientWallets(), searchTerm)
                      .length > 0 ? (
                      filterWallets(
                        getAvailableRecipientWallets(),
                        searchTerm,
                      ).map((wallet) => (
                        <div
                          key={wallet.id}
                          className={`flex items-center p-2.5 hover-bg-secondary transition-all duration-200 border-b border-app-primary-20 last:border-b-0
                                    ${selectedRecipientWallets.includes(wallet.address) ? "bg-primary-10 border-app-primary-30" : ""}`}
                        >
                          <div
                            className={`w-5 h-5 mr-3 rounded flex items-center justify-center transition-all duration-300 cursor-pointer
                                        ${
                                          selectedRecipientWallets.includes(
                                            wallet.address,
                                          )
                                            ? "bg-app-primary-color shadow-md shadow-app-primary-40"
                                            : "border border-app-primary-30 bg-app-tertiary"
                                        }`}
                            onClick={() =>
                              toggleRecipientWalletSelection(wallet.address)
                            }
                          >
                            {selectedRecipientWallets.includes(
                              wallet.address,
                            ) && (
                              <CheckCircle
                                size={14}
                                className="text-app-primary animate-[fadeIn_0.2s_ease]"
                              />
                            )}
                          </div>
                          <div className="flex-1 flex justify-between items-center">
                            <span
                              className="font-mono text-sm text-app-primary cursor-pointer glitch-text"
                              onClick={() =>
                                toggleRecipientWalletSelection(wallet.address)
                              }
                            >
                              {getWalletDisplayName(wallet)}
                            </span>

                            {useCustomAmounts &&
                            selectedRecipientWallets.includes(
                              wallet.address,
                            ) ? (
                              <div className="relative w-24 ml-2">
                                <DollarSign
                                  size={12}
                                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-app-secondary"
                                />
                                <input
                                  type="text"
                                  value={getWalletAmount(wallet.address)}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const value = e.target.value;
                                    if (
                                      value === "" ||
                                      /^\d*\.?\d*$/.test(value)
                                    ) {
                                      handleWalletAmountChange(
                                        wallet.address,
                                        value,
                                      );
                                    }
                                  }}
                                  className="w-full pl-6 pr-2 py-1 bg-app-secondary border border-app-primary-30 rounded text-xs text-app-primary focus:outline-none focus-border-primary modal-input- font-mono"
                                  placeholder="0.00"
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-app-secondary font-mono">
                                {formatBalance(
                                  getWalletBalance(wallet.address) || 0,
                                )}{" "}
                                {baseCurrency.symbol}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-app-secondary text-center font-mono">
                        {searchTerm
                          ? "NO WALLETS FOUND"
                          : "NO WALLETS AVAILABLE"}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-app-secondary font-mono">
                      SELECTED:{" "}
                      <span className="color-primary font-medium">
                        {selectedRecipientWallets.length}
                      </span>{" "}
                      WALLETS
                    </span>
                    {selectedRecipientWallets.length > 0 &&
                      commonAmount &&
                      !useCustomAmounts && (
                        <span className="text-app-secondary font-mono">
                          EACH RECEIVES:{" "}
                          <span className="color-primary font-medium">
                            {commonAmount} {baseCurrency.symbol}
                          </span>
                        </span>
                      )}
                  </div>
                </div>
                )}
              </div>

              {/* Amount Input and Preview Section */}
              <div className="w-full mx-auto mt-6">
                {/* Toggle between common and custom amounts */}
                <div className="flex items-center justify-between mb-2 max-w-md mx-auto">
                  <div className="flex items-center gap-1">
                    <Settings size={14} className="text-app-secondary" />
                    <span className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                      Amount Settings
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-app-secondary mr-2 font-mono">
                      CUSTOM AMOUNT PER WALLET
                    </span>
                    <div
                      onClick={() => setUseCustomAmounts(!useCustomAmounts)}
                      className={`w-10 h-5 rounded-full cursor-pointer transition-all duration-200 flex items-center ${useCustomAmounts ? "bg-app-primary-color" : "bg-app-tertiary border border-app-primary-30"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-app-primary transform transition-all duration-200 ${useCustomAmounts ? "translate-x-5" : "translate-x-1"}`}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Common amount input and summary - shown when not using custom amounts */}
                {!useCustomAmounts && (
                  <div className="flex flex-col space-y-4">
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider">
                            <span className="color-primary">&#62;</span> Amount
                            per Wallet{" "}
                            <span className="color-primary">&#60;</span>
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
                              <div className="absolute left-0 bottom-full mb-2 p-2 bg-app-tertiary border border-app-primary-30 rounded shadow-lg text-xs text-app-primary w-48 z-10 font-mono">
                                {modeText.infoTip}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="relative">
                        <DollarSign
                          size={16}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary"
                        />
                        <input
                          type="text"
                          value={commonAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setCommonAmount(value);
                            }
                          }}
                          className={`w-full pl-9 pr-4 py-2.5 bg-app-tertiary border rounded-lg text-app-primary focus:outline-none transition-all duration-200 modal-input- font-mono
                                    ${hasEnoughBalance ? "border-app-primary-30 focus-border-primary" : "border-error-alt"}`}
                          placeholder="0.001"
                        />
                      </div>
                    </div>

                    {/* Real-time preview - in the same row */}
                    {selectedSenderWallet &&
                      commonAmount &&
                      selectedRecipientWallets.length > 0 && (
                        <div className="w-full bg-app-tertiary rounded-lg p-3 border border-app-primary-30">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-app-secondary font-mono">
                              {modeText.totalLabel}
                            </span>
                            <span
                              className={`text-sm font-semibold font-mono ${hasEnoughBalance ? "color-primary" : "text-error-alt"}`}
                            >
                              {formatBalance(totalAmount)} {baseCurrency.symbol}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-sm text-app-secondary font-mono">
                              REMAINING BALANCE:
                            </span>
                            <span className="text-sm text-app-primary font-mono">
                              {formatBalance(senderBalance - totalAmount)}{" "}
                              {baseCurrency.symbol}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-sm text-app-secondary font-mono">
                              EACH WALLET RECEIVES:
                            </span>
                            <span className="text-sm color-primary font-mono">
                              {commonAmount} {baseCurrency.symbol}
                            </span>
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Custom amounts "Apply to All" control */}
                {useCustomAmounts && selectedRecipientWallets.length > 0 && (
                  <div className="flex flex-col space-y-4 mt-2">
                    <div className="w-full">
                      {/* Quick set common amount control */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="relative flex-grow">
                          <DollarSign
                            size={16}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary"
                          />
                          <input
                            type="text"
                            value={commonAmount}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                setCommonAmount(value);
                              }
                            }}
                            className="w-full pl-9 pr-4 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input- font-mono"
                            placeholder="SET COMMON AMOUNT"
                          />
                        </div>
                        <button
                          onClick={applyCommonAmountToAll}
                          disabled={!commonAmount}
                          className={`whitespace-nowrap px-3 py-2 text-sm rounded-lg transition-all font-mono border
                                    ${
                                      !commonAmount
                                        ? "bg-app-tertiary text-app-secondary-60 border-app-primary-20 cursor-not-allowed"
                                        : "bg-app-tertiary hover-bg-secondary text-app-primary border-app-primary-30 hover-border-primary modal-btn-"
                                    }`}
                        >
                          APPLY TO ALL
                        </button>
                      </div>
                    </div>

                    {/* Real-time preview for custom amounts */}
                    {selectedSenderWallet && totalAmount > 0 && (
                      <div className="w-full bg-app-tertiary rounded-lg p-3 border border-app-primary-30">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-app-secondary font-mono">
                            {modeText.totalLabel}
                          </span>
                          <span
                            className={`text-sm font-semibold font-mono ${hasEnoughBalance ? "color-primary" : "text-error-alt"}`}
                          >
                            {formatBalance(totalAmount)} {baseCurrency.symbol}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-app-secondary font-mono">
                            REMAINING BALANCE:
                          </span>
                          <span className="text-sm text-app-primary font-mono">
                            {formatBalance(senderBalance - totalAmount)}{" "}
                            {baseCurrency.symbol}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm text-app-secondary font-mono">
                            RECIPIENTS:
                          </span>
                          <span className="text-sm text-app-primary font-mono">
                            {selectedRecipientWallets.length} WALLETS
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Next/Cancel Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-app-primary bg-app-tertiary border border-app-primary-30 hover-bg-secondary hover-border-primary rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => setCurrentStep(1)}
                  disabled={
                    !selectedSenderWallet ||
                    selectedRecipientWallets.length === 0 ||
                    !hasEnoughBalance ||
                    (useCustomAmounts &&
                      (totalAmount === 0 || hasEmptyAmounts())) ||
                    (!useCustomAmounts && !commonAmount)
                  }
                  className={`px-5 py-2.5 rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider text-app-primary
                            ${
                              !selectedSenderWallet ||
                              selectedRecipientWallets.length === 0 ||
                              !hasEnoughBalance ||
                              (useCustomAmounts &&
                                (totalAmount === 0 || hasEmptyAmounts())) ||
                              (!useCustomAmounts && !commonAmount)
                                ? "bg-primary-50 cursor-not-allowed opacity-50"
                                : "bg-app-primary-color hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-"
                            }`}
                >
                  {hasEmptyAmounts() && (
                    <span className="text-xs mr-2 bg-error-alt-20 text-error-alt px-2 py-0.5 rounded font-mono">
                      MISSING AMOUNTS
                    </span>
                  )}
                  <span>REVIEW</span>
                  <ChevronRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="flex flex-col space-y-4 animate-[fadeIn_0.3s_ease]">
              {/* Summary */}
              <div className="w-full space-y-4">
                <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30">
                  <h3 className="text-base font-semibold text-app-primary mb-3 font-mono tracking-wider">
                    {modeText.summaryTitle}
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">
                        FROM WALLET:
                      </span>
                      <div className="flex items-center bg-app-secondary px-2 py-1 rounded border border-app-primary-20">
                        <span className="text-sm font-mono text-app-primary glitch-text">
                          {getWalletByAddress(selectedSenderWallet)
                            ? getWalletDisplayName(
                                getWalletByAddress(selectedSenderWallet)!,
                              )
                            : formatAddress(selectedSenderWallet)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">
                        WALLET BALANCE:
                      </span>
                      <span className="text-sm text-app-primary font-mono">
                        {formatBalance(senderBalance)} {baseCurrency.symbol}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">
                        RECIPIENTS:
                      </span>
                      <span className="text-sm text-app-primary font-mono">
                        {selectedRecipientWallets.length} WALLETS
                      </span>
                    </div>

                    {!useCustomAmounts && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-app-secondary font-mono">
                          AMOUNT PER WALLET:
                        </span>
                        <span className="text-sm color-primary font-medium font-mono">
                          {commonAmount} {baseCurrency.symbol}
                        </span>
                      </div>
                    )}

                    {useCustomAmounts && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-app-secondary font-mono">
                          CUSTOM AMOUNTS:
                        </span>
                        <span className="text-sm color-primary font-medium font-mono">
                          YES
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-app-primary-20 flex items-center justify-between">
                      <span className="text-sm font-medium text-app-secondary font-mono">
                        {modeText.totalLabel}
                      </span>
                      <span className="text-sm font-semibold color-primary font-mono">
                        {formatBalance(totalAmount)} {baseCurrency.symbol}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-secondary font-mono">
                        REMAINING BALANCE:
                      </span>
                      <span className="text-sm text-app-primary font-mono">
                        {formatBalance(senderBalance - totalAmount)}{" "}
                        {baseCurrency.symbol}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confirmation Checkbox */}
                <div className="flex items-center px-3 py-3 bg-app-tertiary rounded-lg border border-app-primary-30">
                  <div
                    className="flex items-center cursor-pointer"
                    onClick={() => setIsConfirmed(!isConfirmed)}
                  >
                    <div className="relative mx-1">
                      <div
                        className="w-5 h-5 border border-app-primary-40 rounded peer-checked:bg-app-primary-color peer-checked:border-0 transition-all cursor-pointer"
                        style={{
                          backgroundColor: isConfirmed
                            ? "var(--color-primary)"
                            : "transparent",
                          borderColor: isConfirmed
                            ? "var(--color-primary)"
                            : "var(--color-primary-40)",
                        }}
                      ></div>
                      <CheckCircle
                        size={14}
                        className={`absolute top-0.5 left-0.5 text-app-primary transition-all ${isConfirmed ? "opacity-100" : "opacity-0"}`}
                      />
                    </div>
                    <span className="text-app-primary text-sm ml-2 cursor-pointer select-none font-mono">
                      {modeText.confirmText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recipients List */}
              <div className="w-full">
                <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30 h-full">
                  <h3 className="text-base font-semibold text-app-primary mb-3 font-mono tracking-wider">
                    SELECTED RECIPIENTS
                  </h3>

                  <div className="max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                    {selectedRecipientWallets.length > 0 ? (
                      selectedRecipientWallets.map((address, index) => {
                        const wallet = getWalletByAddress(address);
                        const amount = useCustomAmounts
                          ? getWalletAmount(address)
                          : commonAmount;

                        return wallet ? (
                          <div
                            key={wallet.id}
                            className="flex items-center justify-between py-1.5 border-b border-app-primary-20 last:border-b-0"
                          >
                            <div className="flex items-center">
                              <span className="text-app-secondary text-xs mr-2 w-6 font-mono">
                                {index + 1}.
                              </span>
                              <span className="font-mono text-sm text-app-primary glitch-text">
                                {getWalletDisplayName(wallet)}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs text-app-secondary mr-2 font-mono">
                                CURRENT:{" "}
                                {formatBalance(
                                  getWalletBalance(wallet.address) || 0,
                                )}{" "}
                                {baseCurrency.symbol}
                              </span>
                              <span className="text-xs color-primary font-mono">
                                +{amount} {baseCurrency.symbol}
                              </span>
                            </div>
                          </div>
                        ) : null;
                      })
                    ) : (
                      <div className="p-3 text-sm text-app-secondary text-center font-mono">
                        NO RECIPIENTS SELECTED
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Back/Fund Buttons */}
          {currentStep === 1 && (
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setCurrentStep(0)}
                className="px-5 py-2.5 text-app-primary bg-app-tertiary border border-app-primary-30 hover-bg-secondary hover-border-primary rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-"
              >
                BACK
              </button>
              <button
                onClick={handleFund}
                disabled={!isConfirmed || isSubmitting}
                className={`px-5 py-2.5 text-app-primary rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider
                          ${
                            !isConfirmed || isSubmitting
                              ? "bg-primary-50 cursor-not-allowed opacity-50"
                              : "bg-app-primary-color hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-"
                          }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-app-primary-80 border-t-transparent animate-spin mr-2"></div>
                    PROCESSING...
                  </>
                ) : (
                  modeText.action
                )}
              </button>
            </div>
          )}
        </div>
    </div>
  );

  if (inline) {
    return modalContent;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-app-primary-85">
      {modalContent}
    </div>,
    document.body,
  );
};
