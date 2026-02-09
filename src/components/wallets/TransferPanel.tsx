import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpDown,
  X,
  CheckCircle,
  DollarSign,
  Info,
  Search,
  Coins,
  RefreshCw,
} from "lucide-react";
import type { Connection } from "@solana/web3.js";
import {
  Keypair,
  VersionedTransaction,
  MessageV0,
  PublicKey,
} from "@solana/web3.js";
import bs58 from "bs58";
import { useToast, useTokenMetadata } from "../../utils/hooks";
import type { WalletType } from "../../utils/types";
import { getWalletDisplayName, fetchTokenBalance } from "../../utils/wallet";
import { loadConfigFromCookies } from "../../utils/storage";
import { formatAddress, formatTokenBalance } from "../../utils/formatting";
import { Buffer } from "buffer";
import { sendTransactions } from "../../utils/transactionService";
import { createConnectionFromConfig } from "../../utils/rpcManager";
import type { BaseCurrencyConfig } from "../../utils/constants";
import { BASE_CURRENCIES } from "../../utils/constants";
import type { WindowWithConfig } from "../../utils/trading";
import { SourceWalletSummary } from "./SourceWalletSummary";

interface TransferPanelProps {
  isOpen: boolean;
  inline?: boolean;
  onClose: () => void;
  wallets: WalletType[];
  baseCurrencyBalances: Map<string, number>;
  connection: Connection;
  tokenAddress?: string;
  tokenBalances?: Map<string, number>;
  baseCurrency?: BaseCurrencyConfig;
  selectedWalletIds?: Set<number>;
}

export const TransferPanel: React.FC<TransferPanelProps> = ({
  isOpen,
  inline = false,
  onClose,
  wallets,
  baseCurrencyBalances,
  connection: _connection,
  tokenAddress = "",
  tokenBalances = new Map(),
  baseCurrency = BASE_CURRENCIES.SOL,
  selectedWalletIds,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { showToast } = useToast();

  const [sourceWallets, setSourceWallets] = useState<string[]>([]); // Multiple source wallets
  const [receiverAddresses, setReceiverAddresses] = useState<string[]>([]); // Multiple recipients
  const [newRecipientAddress, setNewRecipientAddress] = useState(""); // Input for new recipient
  const [selectedToken, setSelectedToken] = useState("");
  const [tokenAddressInput, setTokenAddressInput] = useState(""); // Local token address input
  const [amount, setAmount] = useState("");
  const [transferType, setTransferType] = useState<"BASE" | "TOKEN">("BASE");
  const [distributionMode, setDistributionMode] = useState<
    "percentage" | "amount"
  >("amount"); // How to distribute amounts
  const { metadata: tokenMeta } = useTokenMetadata(tokenAddressInput || undefined);

  const [transferQueue, setTransferQueue] = useState<
    Array<{
      sourceWallet: string;
      recipient: string;
      amount: string;
      status: "pending" | "processing" | "completed" | "failed";
      error?: string;
      signature?: string;
    }>
  >([]);
  const [currentTransferIndex, setCurrentTransferIndex] = useState(0);
  const [batchProcessing, setBatchProcessing] = useState(false);

  const [sourceSearchTerm, setSourceSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("address");
  const [sortDirection, setSortDirection] = useState("asc");
  const [balanceFilter, setBalanceFilter] = useState("all");

  const [customTokenBalances, setCustomTokenBalances] = useState<
    Map<string, number>
  >(new Map());
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balancesFetched, setBalancesFetched] = useState(false);

  const useExternalSource = inline && selectedWalletIds !== undefined;

  useEffect(() => {
    if (isOpen) {
      resetForm();
      // Initialize token address input with prop value if available
      if (tokenAddress) {
        setTokenAddressInput(tokenAddress);
      }
    }
  }, [isOpen, tokenAddress]);

  useEffect(() => {
    if (useExternalSource && currentStep === 0) {
      const sourcePrivateKeys = wallets
        .filter((w) => selectedWalletIds.has(w.id))
        .map((w) => w.privateKey);
      setSourceWallets(sourcePrivateKeys);
    }
  }, [useExternalSource, selectedWalletIds, wallets, currentStep]);

  // Update selectedToken when transferType changes to TOKEN
  useEffect(() => {
    if (transferType === "TOKEN" && tokenAddressInput) {
      setSelectedToken(tokenAddressInput);
    } else if (transferType === "BASE") {
      setSelectedToken("");
    }
  }, [transferType, tokenAddressInput]);

  const formatBalance = (balance: number): string => {
    return baseCurrency.isNative ? balance.toFixed(4) : balance.toFixed(2);
  };

  // Get wallet base currency balance by address
  const getWalletBalance = (address: string): number => {
    return baseCurrencyBalances.has(address)
      ? (baseCurrencyBalances.get(address) ?? 0)
      : 0;
  };

  // Use custom token balances if we're using a custom token address, otherwise use prop balances
  const getWalletTokenBalance = (address: string): number => {
    const isCustomToken =
      tokenAddressInput && tokenAddressInput !== tokenAddress;
    if (isCustomToken && customTokenBalances.size > 0) {
      return customTokenBalances.get(address) ?? 0;
    }
    const balance: number | undefined = tokenBalances.get(address) as
      | number
      | undefined;
    return balance ?? 0;
  };

  const getWalletByPrivateKey = (
    privateKey: string,
  ): WalletType | undefined => {
    return wallets.find((wallet) => wallet.privateKey === privateKey);
  };

  // Fetch token balances for custom token address
  const fetchTokenBalancesForCustomToken =
    useCallback(async (): Promise<void> => {
      if (!tokenAddressInput) {
        showToast("Please enter a token address", "error");
        return;
      }

      try {
        new PublicKey(tokenAddressInput);
      } catch (ignore) {
        showToast("Invalid token address", "error");
        return;
      }

      setIsLoadingBalances(true);
      setBalancesFetched(false);

      try {
        const savedConfig = loadConfigFromCookies();
        const connection = await createConnectionFromConfig(
          savedConfig?.rpcEndpoints,
        );

        const newBalances = new Map<string, number>();

        for (const wallet of wallets) {
          try {
            const balance = await fetchTokenBalance(
              connection,
              wallet.address,
              tokenAddressInput,
            );
            newBalances.set(wallet.address, balance);
          } catch (ignore) {
            newBalances.set(wallet.address, 0);
          }
        }

        setCustomTokenBalances(newBalances);
        setBalancesFetched(true);

        const walletsWithBalance = Array.from(newBalances.values()).filter(
          (b) => b > 0,
        ).length;
        showToast(`Loaded balances for ${walletsWithBalance} wallets`, "success");
      } catch (ignore) {
        showToast("Failed to fetch token balances", "error");
      } finally {
        setIsLoadingBalances(false);
      }
    },
    [tokenAddressInput, wallets, showToast],
  );

  // Auto-fetch token balances when token address is set
  useEffect(() => {
    if (
      transferType !== "TOKEN" ||
      !tokenAddressInput ||
      isLoadingBalances ||
      balancesFetched
    ) {
      return;
    }

    try {
      new PublicKey(tokenAddressInput);
    } catch {
      return; // Invalid address, don't fetch
    }

    // Debounce the fetch to avoid fetching on every keystroke
    const timeoutId = setTimeout(() => {
      void fetchTokenBalancesForCustomToken();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    tokenAddressInput,
    transferType,
    isLoadingBalances,
    balancesFetched,
    fetchTokenBalancesForCustomToken,
  ]);

  const toggleSourceWallet = (privateKey: string): void => {
    setSourceWallets((prev) =>
      prev.includes(privateKey)
        ? prev.filter((pk) => pk !== privateKey)
        : [...prev, privateKey],
    );
  };

  const addRecipientAddress = (address: string): void => {
    if (address.trim() && !receiverAddresses.includes(address.trim())) {
      setReceiverAddresses((prev) => [...prev, address.trim()]);
      setNewRecipientAddress(""); // Clear the input field
    }
  };

  const removeRecipientAddress = (address: string): void => {
    setReceiverAddresses((prev) => prev.filter((addr) => addr !== address));
  };

  // Calculate transfer amounts based on distribution mode
  const calculateTransferAmounts = (): string[] => {
    const inputAmount = parseFloat(amount || "0");

    if (distributionMode === "percentage") {
      // In percentage mode, the input amount is a percentage (0-100)
      // Calculate the percentage of each wallet's balance to transfer
      const percentage = inputAmount / 100;

      return sourceWallets.map((privateKey) => {
        const wallet = getWalletByPrivateKey(privateKey);
        if (!wallet) return "0";

        const balance =
          transferType === "BASE"
            ? getWalletBalance(wallet.address)
            : getWalletTokenBalance(wallet.address);

        const transferAmount = balance * percentage;
        return transferAmount.toString();
      });
    } else {
      // In amount mode, the input amount is the exact amount to transfer from each wallet
      return sourceWallets.map(() => inputAmount.toString());
    }
  };

  // Create transfer queue from selected wallets and recipients
  const createTransferQueue = (): typeof transferQueue => {
    const amounts = calculateTransferAmounts();
    const queue: typeof transferQueue = [];

    sourceWallets.forEach((sourceWallet, walletIndex) => {
      receiverAddresses.forEach((recipient) => {
        // In percentage mode, each wallet has its own calculated amount
        // In amount mode, all wallets use the same amount
        const transferAmount =
          distributionMode === "percentage" ? amounts[walletIndex] : amounts[0]; // All wallets use the same amount in 'amount' mode

        queue.push({
          sourceWallet,
          recipient,
          amount: transferAmount,
          status: "pending",
        });
      });
    });

    setTransferQueue(queue);
    return queue;
  };

  const resetForm = (): void => {
    setCurrentStep(0);
    setIsConfirmed(false);
    setSourceWallets([]);
    setReceiverAddresses([]);
    setNewRecipientAddress("");
    setSelectedToken("");
    setTokenAddressInput("");
    setAmount("");
    setTransferType("BASE");
    setDistributionMode("amount");
    setTransferQueue([]);
    setCurrentTransferIndex(0);
    setBatchProcessing(false);
    setSourceSearchTerm("");
    setSortOption("address");
    setSortDirection("asc");
    setBalanceFilter("all");
    setCustomTokenBalances(new Map());
    setIsLoadingBalances(false);
    setBalancesFetched(false);
  };

  // Handle batch transfer operation with local signing and direct RPC submission
  const handleBatchTransfer = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isConfirmed) return;

    setBatchProcessing(true);
    setIsSubmitting(true);

    const queue = createTransferQueue();
    let completedCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < queue.length; i++) {
        setCurrentTransferIndex(i);
        const transfer = queue[i];

        setTransferQueue((prev) =>
          prev.map((t, idx) =>
            idx === i ? { ...t, status: "processing" } : t,
          ),
        );

        try {
          const selectedWalletObj = getWalletByPrivateKey(
            transfer.sourceWallet,
          );
          if (!selectedWalletObj) {
            throw new Error("Source wallet not found");
          }

          // Step 1: Request the transaction from the backend
          const baseUrl =
            (window as WindowWithConfig).tradingServerUrl?.replace(
              /\/+$/,
              "",
            ) || "";
          const buildResponse = await fetch(`${baseUrl}/v2/sol/transfer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              senderPublicKey: selectedWalletObj.address,
              receiver: transfer.recipient,
              tokenAddress: transferType === "TOKEN" ? selectedToken : null,
              amount: transfer.amount,
            }),
          });

          if (!buildResponse.ok) {
            throw new Error(`HTTP error! status: ${buildResponse.status}`);
          }

          const buildResult = (await buildResponse.json()) as {
            success: boolean;
            error?: string;
            data: { transaction: string };
          };
          if (!buildResult.success) {
            throw new Error(buildResult.error);
          }

          // Step 2: Deserialize the transaction message from Base58
          const transactionBuffer = Buffer.from(
            bs58.decode(buildResult.data.transaction),
          );
          const messageV0 = MessageV0.deserialize(transactionBuffer);

          // Step 3: Create and sign the versioned transaction
          const transaction = new VersionedTransaction(messageV0);

          const keypair = Keypair.fromSecretKey(
            bs58.decode(transfer.sourceWallet),
          );

          transaction.sign([keypair]);

          // Step 4: Send the signed transaction via Jito Bundle Service
          const serializedTransaction = bs58.encode(transaction.serialize());
          const jitoResult = (await sendTransactions([
            serializedTransaction,
          ])) as {
            signature?: string;
            txid?: string;
          };

          const signature =
            jitoResult.signature || jitoResult.txid || "Unknown";

          setTransferQueue((prev) =>
            prev.map((t, idx) =>
              idx === i ? { ...t, status: "completed", signature } : t,
            ),
          );

          completedCount++;
        } catch (error) {

          let errorMessage = "Transfer failed";
          if (error instanceof Error) {
            errorMessage = error.message;
          }

          setTransferQueue((prev) =>
            prev.map((t, idx) =>
              idx === i ? { ...t, status: "failed", error: errorMessage } : t,
            ),
          );

          failedCount++;
        }

        // Small delay between transfers to avoid rate limiting
        if (i < queue.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      showToast(
        `Transfers completed: ${completedCount} successful, ${failedCount} failed`,
        completedCount > 0 ? "success" : "error",
      );

      if (completedCount === queue.length) {
        // All transfers successful, close modal after delay
        setTimeout(() => {
          resetForm();
          onClose();
        }, 3000);
      }
    } catch (ignore) {
      showToast("Batch transfer failed", "error");
    } finally {
      setBatchProcessing(false);
      setIsSubmitting(false);
    }
  };

  // Filter and sort wallets based on search term and other criteria
  const filterWallets = (
    walletList: WalletType[],
    search: string,
  ): WalletType[] => {
    // Check if using a custom token that needs balance fetching
    const isCustomToken =
      transferType === "TOKEN" &&
      tokenAddressInput &&
      tokenAddressInput !== tokenAddress;
    const hasBalanceData = isCustomToken ? balancesFetched : true;

    // Filter based on transfer type and balance
    let filtered = walletList.filter((wallet) => {
      if (transferType === "BASE") {
        return (getWalletBalance(wallet.address) || 0) > 0;
      } else {
        // For custom tokens without fetched balances, show all wallets
        if (isCustomToken && !hasBalanceData) {
          return true;
        }
        return (getWalletTokenBalance(wallet.address) || 0) > 0;
      }
    });

    if (search) {
      filtered = filtered.filter((wallet) =>
        wallet.address.toLowerCase().includes(search.toLowerCase()),
      );
    }

    if (balanceFilter !== "all") {
      if (balanceFilter === "highBalance") {
        if (transferType === "BASE") {
          filtered = filtered.filter(
            (wallet) => (getWalletBalance(wallet.address) || 0) >= 0.1,
          );
        } else {
          filtered = filtered.filter(
            (wallet) => (getWalletTokenBalance(wallet.address) || 0) >= 1000,
          );
        }
      } else if (balanceFilter === "lowBalance") {
        if (transferType === "BASE") {
          filtered = filtered.filter(
            (wallet) => (getWalletBalance(wallet.address) || 0) < 0.1,
          );
        } else {
          filtered = filtered.filter(
            (wallet) => (getWalletTokenBalance(wallet.address) || 0) < 1000,
          );
        }
      }
    }

    // Finally, sort the wallets
    return filtered.sort((a, b) => {
      if (sortOption === "address") {
        return sortDirection === "asc"
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (sortOption === "balance") {
        const balanceA =
          transferType === "BASE"
            ? getWalletBalance(a.address) || 0
            : getWalletTokenBalance(a.address) || 0;
        const balanceB =
          transferType === "BASE"
            ? getWalletBalance(b.address) || 0
            : getWalletTokenBalance(b.address) || 0;
        return sortDirection === "asc"
          ? balanceA - balanceB
          : balanceB - balanceA;
      }
      return 0;
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const id = "transfer-modal-styles";
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

    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }

    @keyframes scale-in {
      0% { transform: scale(0); }
      100% { transform: scale(1); }
    }

    .scrollbar-thin::-webkit-scrollbar {
      width: 4px;
    }

    .scrollbar-thin::-webkit-scrollbar-track {
      background: var(--color-bg-tertiary);
    }

    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: var(--color-primary);
      border-radius: 2px;
    }

    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
      background: var(--color-primary-dark);
    }
    `;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className={inline ? "relative flex flex-col h-full overflow-hidden" : "relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-7xl max-h-[90vh] overflow-hidden transform modal-content"}>
        {/* Ambient grid background - only in modal mode */}
        {!inline && <div className="absolute inset-0 z-0 opacity-10 bg-grid"></div>}

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
              <ArrowUpDown size={16} className="color-primary" />
            </div>
            <h2 className="text-lg font-semibold text-app-primary font-mono">
              <span className="color-primary">/</span> TRANSFER CONSOLE{" "}
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
            style={{ width: currentStep === 0 ? "50%" : "100%" }}
          ></div>
        </div>

        {/* Main Content - Horizontal Layout */}
        <div className={`relative z-10 overflow-hidden ${inline ? "flex-1" : "h-[calc(90vh-120px)]"}`}>
          <div className="h-full flex">
            {/* Left Panel - Configuration */}
            <div className="flex-1 border-r border-app-primary-20 overflow-y-auto">
              <div className="p-5 space-y-4">
                <div className="animate-[fadeIn_0.3s_ease]">
                  {/* Transfer Type Selection */}
                  <div className="group mb-4">
                    <label className="block text-sm font-medium text-app-secondary mb-2 group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Transfer Type{" "}
                      <span className="color-primary">&#60;</span>
                    </label>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setTransferType("BASE")}
                        className={`flex-1 flex items-center justify-center p-3 rounded-lg border transition-all duration-200 font-mono modal-btn- ${
                          transferType === "BASE"
                            ? "bg-primary-20 border-app-primary color-primary shadow-md shadow-app-primary-40"
                            : "bg-app-tertiary border-app-primary-30 text-app-secondary hover-border-primary hover:color-primary"
                        }`}
                      >
                        <DollarSign size={16} className="mr-2" />
                        {baseCurrency.symbol}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransferType("TOKEN")}
                        className={`flex-1 flex items-center justify-center p-3 rounded-lg border transition-all duration-200 font-mono modal-btn- ${
                          transferType === "TOKEN"
                            ? "bg-primary-20 border-app-primary color-primary shadow-md shadow-app-primary-40"
                            : "bg-app-tertiary border-app-primary-30 text-app-secondary hover-border-primary hover:color-primary"
                        }`}
                      >
                        <Coins size={16} className="mr-2" />
                        TOKEN
                      </button>
                    </div>

                    {/* Token Address Input - shown when TOKEN is selected */}
                    {transferType === "TOKEN" && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-app-secondary mb-1.5 font-mono uppercase tracking-wider">
                          <span className="color-primary">&#62;</span> Token
                          Address <span className="color-primary">&#60;</span>
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={tokenAddressInput}
                            onChange={(e) => {
                              setTokenAddressInput(e.target.value);
                              setCustomTokenBalances(new Map());
                              setBalancesFetched(false);
                            }}
                            className="flex-1 px-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary shadow-inner focus-border-primary focus:ring-1 ring-primary-50 focus:outline-none transition-all duration-200 modal-input- font-mono"
                            placeholder="ENTER TOKEN ADDRESS"
                          />
                          <button
                            type="button"
                            onClick={fetchTokenBalancesForCustomToken}
                            disabled={!tokenAddressInput || isLoadingBalances}
                            className={`px-3 py-2 rounded-lg border transition-all duration-200 font-mono text-xs flex items-center ${
                              !tokenAddressInput || isLoadingBalances
                                ? "bg-app-tertiary border-app-primary-20 text-app-secondary-40 cursor-not-allowed"
                                : "bg-app-tertiary border-app-primary-30 text-app-secondary hover-border-primary hover:color-primary"
                            }`}
                            title="Fetch token balances for all wallets"
                          >
                            <RefreshCw
                              size={14}
                              className={`${isLoadingBalances ? "animate-spin" : ""}`}
                            />
                          </button>
                        </div>
                        {tokenAddressInput && (
                          <div className="mt-1.5 flex items-center justify-between">
                            <div className="text-xs color-primary font-mono flex items-center gap-1.5">
                              <span className="text-app-secondary">TOKEN:</span>{" "}
                              {tokenMeta?.image && (
                                <img src={tokenMeta.image} alt={tokenMeta.symbol} className="w-3.5 h-3.5 rounded-full object-cover inline-block" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              )}
                              {tokenMeta?.symbol ? `${tokenMeta.symbol} (${formatAddress(tokenAddressInput)})` : formatAddress(tokenAddressInput)}
                            </div>
                            {isLoadingBalances && (
                              <div className="text-xs text-app-secondary font-mono flex items-center">
                                <RefreshCw
                                  size={10}
                                  className="animate-spin mr-1"
                                />
                                FETCHING BALANCES...
                              </div>
                            )}
                            {balancesFetched && !isLoadingBalances && (
                              <div className="text-xs color-primary font-mono flex items-center">
                                <CheckCircle size={10} className="mr-1" />
                                BALANCES LOADED
                              </div>
                            )}
                          </div>
                        )}
                        {tokenAddressInput &&
                          !balancesFetched &&
                          !isLoadingBalances && (
                            <div className="mt-2 text-xs text-warning font-mono flex items-center">
                              <Info size={12} className="mr-1" />
                              Click refresh to fetch token balances for wallets
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Source Wallets */}
                  {useExternalSource ? (
                    <div className="mb-4">
                      <SourceWalletSummary
                        wallets={wallets}
                        selectedWalletIds={selectedWalletIds}
                        baseCurrencyBalances={baseCurrencyBalances}
                        baseCurrency={baseCurrency}
                        label="SOURCE WALLETS"
                        mode="multi"
                      />
                    </div>
                  ) : (
                  <div className="group mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-app-secondary group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                        <span className="color-primary">&#62;</span> Source
                        Wallets ({sourceWallets.length} selected){" "}
                        <span className="color-primary">&#60;</span>
                      </label>
                    </div>

                    {/* Source Search and Filters */}
                    <div className="mb-2 flex space-x-2">
                      <div className="relative flex-grow">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-app-secondary"
                        />
                        <input
                          type="text"
                          value={sourceSearchTerm}
                          onChange={(e) => setSourceSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-sm text-app-primary focus:outline-none focus-border-primary transition-all modal-input- font-mono"
                          placeholder="SEARCH WALLETS..."
                        />
                      </div>

                      <select
                        className="bg-app-tertiary border border-app-primary-30 rounded-lg px-2 text-sm text-app-primary focus:outline-none focus-border-primary modal-input- font-mono"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                      >
                        <option value="address">ADDRESS</option>
                        <option value="balance">BALANCE</option>
                      </select>

                      <button
                        className="p-2 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-secondary hover:color-primary hover-border-primary transition-all modal-btn-"
                        onClick={() =>
                          setSortDirection(
                            sortDirection === "asc" ? "desc" : "asc",
                          )
                        }
                      >
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </button>
                    </div>

                    <div className="h-48 overflow-y-auto border border-app-primary-20 rounded-lg shadow-inner bg-app-tertiary transition-all duration-200 group-hover:border-app-primary-40 scrollbar-thin">
                      {filterWallets(wallets, sourceSearchTerm).length > 0 ? (
                        filterWallets(wallets, sourceSearchTerm).map(
                          (wallet) => (
                            <div
                              key={wallet.id}
                              className={`flex items-center p-2.5 hover-bg-secondary cursor-pointer transition-all duration-200 border-b border-app-primary-20 last:border-b-0
                                      ${sourceWallets.includes(wallet.privateKey) ? "bg-primary-10 border-app-primary-30" : ""}`}
                              onClick={() =>
                                toggleSourceWallet(wallet.privateKey)
                              }
                            >
                              <div
                                className={`w-5 h-5 mr-3 rounded flex items-center justify-center transition-all duration-300
                                            ${
                                              sourceWallets.includes(
                                                wallet.privateKey,
                                              )
                                                ? "bg-app-primary-color shadow-md shadow-app-primary-40"
                                                : "border border-app-primary-30 bg-app-tertiary"
                                            }`}
                              >
                                {sourceWallets.includes(wallet.privateKey) && (
                                  <CheckCircle
                                    size={14}
                                    className="text-app-primary animate-[fadeIn_0.2s_ease]"
                                  />
                                )}
                              </div>
                              <div className="flex-1 flex flex-col">
                                <span className="font-mono text-sm text-app-primary glitch-text">
                                  {getWalletDisplayName(wallet)}
                                </span>
                                <div className="flex items-center mt-0.5">
                                  {transferType === "BASE" ? (
                                    <>
                                      <DollarSign
                                        size={12}
                                        className="text-app-secondary mr-1"
                                      />
                                      <span className="text-xs text-app-secondary font-mono">
                                        {formatBalance(
                                          getWalletBalance(wallet.address) || 0,
                                        )}{" "}
                                        {baseCurrency.symbol}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Coins
                                        size={12}
                                        className="text-app-secondary mr-1"
                                      />
                                      <span className="text-xs text-app-secondary font-mono">
                                        {formatTokenBalance(
                                          getWalletTokenBalance(
                                            wallet.address,
                                          ) || 0,
                                        )}{" "}
                                        TKN
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ),
                        )
                      ) : (
                        <div className="p-3 text-sm text-app-secondary text-center font-mono">
                          {transferType === "TOKEN" &&
                          tokenAddressInput &&
                          !balancesFetched ? (
                            <>
                              <div>
                                CLICK THE REFRESH BUTTON TO FETCH BALANCES
                              </div>
                              <div className="text-xs mt-1 text-app-secondary-60">
                                Wallet balances will be shown after fetching
                              </div>
                            </>
                          ) : sourceSearchTerm ? (
                            <div>No matching wallets found</div>
                          ) : (
                            <div>No wallets available</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Recipient Addresses */}
                  <div className="group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-app-secondary group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                        <span className="color-primary">&#62;</span> Recipients
                        ({receiverAddresses.length}){" "}
                        <span className="color-primary">&#60;</span>
                      </label>
                    </div>

                    {/* Add new recipient */}
                    <div className="relative mb-3">
                      <input
                        type="text"
                        value={newRecipientAddress}
                        onChange={(e) => setNewRecipientAddress(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && newRecipientAddress.trim()) {
                            addRecipientAddress(newRecipientAddress.trim());
                          }
                        }}
                        className="w-full px-4 py-2.5 pr-16 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary shadow-inner focus-border-primary focus:ring-1 ring-primary-50 focus:outline-none transition-all duration-200 modal-input- font-mono tracking-wider"
                        placeholder="ENTER RECIPIENT ADDRESS"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newRecipientAddress.trim()) {
                            addRecipientAddress(newRecipientAddress.trim());
                          }
                        }}
                        disabled={!newRecipientAddress.trim()}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-app-primary-color text-app-primary text-xs font-bold rounded hover:bg-app-primary-dark disabled:bg-primary-30 disabled:text-app-secondary disabled:cursor-not-allowed transition-all duration-200 font-mono tracking-wider"
                      >
                        ADD
                      </button>
                    </div>

                    {/* Recipients list */}
                    <div className="h-32 overflow-y-auto border border-app-primary-20 rounded-lg bg-app-tertiary scrollbar-thin">
                      {receiverAddresses.length > 0 ? (
                        receiverAddresses.map((address, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2.5 border-b border-app-primary-20 last:border-b-0 hover-bg-secondary transition-all duration-200"
                          >
                            <div className="flex-1">
                              <span className="font-mono text-sm text-app-primary">
                                {formatAddress(address)}
                              </span>
                              {transferType === "BASE" &&
                                baseCurrencyBalances.has(address) && (
                                  <div className="flex items-center mt-0.5">
                                    <DollarSign
                                      size={12}
                                      className="text-app-secondary mr-1"
                                    />
                                    <span className="text-xs text-app-secondary font-mono">
                                      {formatBalance(
                                        getWalletBalance(address) || 0,
                                      )}{" "}
                                      {baseCurrency.symbol}
                                    </span>
                                  </div>
                                )}
                              {transferType === "TOKEN" &&
                                tokenBalances.has(address) && (
                                  <div className="flex items-center mt-0.5">
                                    <Coins
                                      size={12}
                                      className="text-app-secondary mr-1"
                                    />
                                    <span className="text-xs text-app-secondary font-mono">
                                      {formatTokenBalance(
                                        getWalletTokenBalance(address) || 0,
                                      )}{" "}
                                      TKN
                                    </span>
                                  </div>
                                )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRecipientAddress(address)}
                              className="ml-2 p-1 text-warning hover:text-error-alt hover:bg-error-alt-20 rounded transition-all duration-200"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-app-secondary text-center font-mono">
                          NO RECIPIENTS ADDED YET
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Configuration & Summary */}
            <div className="w-96 overflow-y-auto">
              <div className="p-5 space-y-4">
                {/* Distribution Mode */}
                {sourceWallets.length > 0 && receiverAddresses.length > 0 && (
                  <div className="group">
                    <label className="block text-sm font-medium text-app-secondary mb-2 group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                      <span className="color-primary">&#62;</span> Distribution
                      Mode <span className="color-primary">&#60;</span>
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setDistributionMode("amount")}
                        className={`w-full p-3 rounded-lg border transition-all duration-200 font-mono text-sm ${
                          distributionMode === "amount"
                            ? "bg-primary-10 border-app-primary color-primary"
                            : "bg-app-tertiary border-app-primary-30 text-app-secondary hover-border-primary hover:color-primary"
                        }`}
                      >
                        <div className="font-semibold mb-1">FIXED AMOUNT</div>
                        <div className="text-xs opacity-80">
                          Transfer exact amount from each wallet
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDistributionMode("percentage")}
                        className={`w-full p-3 rounded-lg border transition-all duration-200 font-mono text-sm ${
                          distributionMode === "percentage"
                            ? "bg-primary-10 border-app-primary color-primary"
                            : "bg-app-tertiary border-app-primary-30 text-app-secondary hover-border-primary hover:color-primary"
                        }`}
                      >
                        <div className="font-semibold mb-1">PERCENTAGE</div>
                        <div className="text-xs opacity-80">
                          Transfer % of each wallet's balance
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Amount Input */}
                <div className="group">
                  <label className="block text-sm font-medium text-app-secondary mb-1.5 group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider">
                    <span className="color-primary">&#62;</span>
                    {distributionMode === "percentage"
                      ? "Percentage (%)"
                      : `Amount (${transferType})`}
                    <span className="color-primary">&#60;</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2.5 pr-16 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary shadow-inner focus-border-primary focus:ring-1 ring-primary-50 focus:outline-none transition-all duration-200 modal-input- font-mono tracking-wider"
                      placeholder={
                        distributionMode === "percentage"
                          ? "ENTER %"
                          : `ENTER ${transferType === "BASE" ? baseCurrency.symbol : "TOKEN"}`
                      }
                      step={
                        distributionMode === "percentage"
                          ? "0.1"
                          : transferType === "BASE"
                            ? "0.0001"
                            : "1"
                      }
                      min="0"
                      max={
                        distributionMode === "percentage" ? "100" : undefined
                      }
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (sourceWallets.length > 0) {
                          if (distributionMode === "percentage") {
                            setAmount("100");
                          } else {
                            const maxBalance = Math.min(
                              ...sourceWallets.map((privateKey) => {
                                const wallet =
                                  getWalletByPrivateKey(privateKey);
                                if (!wallet) return 0;
                                return transferType === "BASE"
                                  ? getWalletBalance(wallet.address) || 0
                                  : getWalletTokenBalance(wallet.address) || 0;
                              }),
                            );
                            setAmount(maxBalance.toString());
                          }
                        }
                      }}
                      disabled={sourceWallets.length === 0}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-app-primary-color text-app-primary text-xs font-bold rounded hover:bg-app-primary-dark disabled:bg-primary-30 disabled:text-app-secondary disabled:cursor-not-allowed transition-all duration-200 font-mono tracking-wider"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Transfer Summary */}
                {sourceWallets.length > 0 &&
                  receiverAddresses.length > 0 &&
                  amount && (
                    <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-4">
                      <h3 className="text-base font-semibold text-app-primary mb-3 font-mono tracking-wider">
                        TRANSFER SUMMARY
                      </h3>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-4 text-xs font-mono">
                          <div>
                            <span className="text-app-secondary">SOURCES:</span>
                            <span className="color-primary ml-1 font-semibold">
                              {sourceWallets.length}
                            </span>
                          </div>
                          <div>
                            <span className="text-app-secondary">
                              RECIPIENTS:
                            </span>
                            <span className="color-primary ml-1 font-semibold">
                              {receiverAddresses.length}
                            </span>
                          </div>
                          <div>
                            <span className="text-app-secondary">AMOUNT:</span>
                            <span className="color-primary ml-1 font-semibold">
                              {distributionMode === "percentage"
                                ? `${amount}%`
                                : `${amount} ${transferType}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-app-secondary">
                              TOTAL TXN:
                            </span>
                            <span className="color-primary ml-1 font-semibold">
                              {sourceWallets.length * receiverAddresses.length}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs font-mono text-app-secondary">
                          {distributionMode === "percentage"
                            ? `${amount}% of each wallet's balance to each of ${receiverAddresses.length} recipient(s)`
                            : `${amount} ${transferType} from each wallet to each of ${receiverAddresses.length} recipient(s)`}
                        </div>

                        {transferType === "TOKEN" && selectedToken && (
                          <div className="p-2 bg-app-primary rounded border border-app-primary-20">
                            <p className="text-xs text-app-secondary font-mono mb-1">
                              TOKEN:
                            </p>
                            <p className="text-xs text-app-primary font-mono break-all">
                              {selectedToken}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Confirmation Checkbox */}
                      <div
                        className="flex items-center px-3 py-3 bg-app-primary rounded-lg border border-app-primary-40 mt-4 cursor-pointer"
                        onClick={() => setIsConfirmed(!isConfirmed)}
                      >
                        <div className="relative mx-1">
                          <div
                            className={`w-5 h-5 border border-app-primary-40 rounded transition-all ${isConfirmed ? "bg-app-primary-color border-0" : ""}`}
                          ></div>
                          <CheckCircle
                            size={14}
                            className={`absolute top-0.5 left-0.5 text-app-primary transition-all ${isConfirmed ? "opacity-100" : "opacity-0"}`}
                          />
                        </div>
                        <span className="text-app-primary text-sm ml-2 select-none font-mono">
                          CONFIRM BATCH TRANSFER
                        </span>
                      </div>

                      {/* Execute Button */}
                      <button
                        onClick={handleBatchTransfer}
                        disabled={
                          !isConfirmed || isSubmitting || batchProcessing
                        }
                        className={`w-full mt-4 px-5 py-3 rounded-lg shadow-lg flex items-center justify-center transition-all duration-300 font-mono tracking-wider
                                ${
                                  !isConfirmed ||
                                  isSubmitting ||
                                  batchProcessing
                                    ? "bg-primary-50 text-app-secondary-80 cursor-not-allowed opacity-50"
                                    : "bg-app-primary-color text-app-primary hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-"
                                }`}
                      >
                        {isSubmitting || batchProcessing ? (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-app-secondary-80 border-t-transparent animate-spin mr-2"></div>
                            {batchProcessing
                              ? "PROCESSING..."
                              : "INITIALIZING..."}
                          </>
                        ) : (
                          "TRANSFER"
                        )}
                      </button>
                    </div>
                  )}

                {/* Processing Progress */}
                {batchProcessing && transferQueue.length > 0 && (
                  <div className="bg-app-quaternary border border-app-primary-40 rounded-lg p-4">
                    <p className="text-sm color-primary font-medium mb-3 font-mono">
                      PROCESSING PROGRESS
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-app-secondary">CURRENT:</span>
                        <span className="color-primary">
                          {currentTransferIndex + 1} / {transferQueue.length}
                        </span>
                      </div>
                      <div className="w-full bg-app-tertiary rounded-full h-2">
                        <div
                          className="bg-app-primary-color h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${((currentTransferIndex + 1) / transferQueue.length) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono mt-2">
                        <div className="text-center">
                          <span className="text-app-secondary">DONE:</span>
                          <span className="color-primary ml-1">
                            {
                              transferQueue.filter(
                                (t) => t.status === "completed",
                              ).length
                            }
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-app-secondary">ACTIVE:</span>
                          <span className="text-warning ml-1">
                            {
                              transferQueue.filter(
                                (t) => t.status === "processing",
                              ).length
                            }
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-app-secondary">FAILED:</span>
                          <span className="text-warning ml-1">
                            {
                              transferQueue.filter((t) => t.status === "failed")
                                .length
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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
