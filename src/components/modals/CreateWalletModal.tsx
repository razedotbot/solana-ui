import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  AlertCircle,
  Wallet,
  Key,
  Sparkles,
  Play,
  Square,
  Copy,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import type { MasterWallet, WalletType } from "../../utils/types";
import { createNewWallet, createHDWalletFromMaster } from "../../utils/wallet";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterWallets: MasterWallet[];
  onCreateWallet: (wallet: WalletType) => Promise<void>;
}

type WalletTypeOption = "im" | "hd" | "vanity";

interface VanityResult {
  address: string;
  privateKey: string;
  attempts: number;
  time: number;
}

interface VanityConfig {
  prefix: string;
  suffix: string;
  caseSensitive: boolean;
  threads: number;
  quantity: number;
}

// Generate unique wallet ID with timestamp and random component
const generateWalletId = (): number => {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
};

const CreateWalletModal: React.FC<CreateWalletModalProps> = ({
  isOpen,
  onClose,
  masterWallets,
  onCreateWallet,
}) => {
  const [walletType, setWalletType] = useState<WalletTypeOption>("im");
  const [selectedMasterWalletId, setSelectedMasterWalletId] =
    useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vanity generator state
  const [vanityConfig, setVanityConfig] = useState<VanityConfig>({
    prefix: "",
    suffix: "",
    caseSensitive: false,
    threads: 4,
    quantity: 1,
  });
  const [vanityResults, setVanityResults] = useState<VanityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStats, setSearchStats] = useState({
    attempts: 0,
    speed: 0,
    elapsed: 0,
  });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const searchAbortRef = useRef<boolean>(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setWalletType("im");
      setSelectedMasterWalletId(
        masterWallets.length > 0 ? masterWallets[0].id : "",
      );
      setQuantity("1");
      setIsCreating(false);
      setError(null);
      setVanityConfig({
        prefix: "",
        suffix: "",
        caseSensitive: false,
        threads: 4,
        quantity: 1,
      });
      setVanityResults([]);
      setIsSearching(false);
      setSearchStats({ attempts: 0, speed: 0, elapsed: 0 });
      searchAbortRef.current = false;
    }
  }, [isOpen, masterWallets]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      searchAbortRef.current = true;
    };
  }, []);

  // Valid base58 characters for Solana addresses
  const validBase58Chars =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  const isValidBase58 = (str: string): boolean => {
    return str.split("").every((char) => validBase58Chars.includes(char));
  };

  const matchesPattern = useCallback(
    (
      address: string,
      prefix: string,
      suffix: string,
      caseSensitive: boolean,
    ): boolean => {
      const addr = caseSensitive ? address : address.toLowerCase();
      const pre = caseSensitive ? prefix : prefix.toLowerCase();
      const suf = caseSensitive ? suffix : suffix.toLowerCase();

      if (pre && !addr.startsWith(pre)) return false;
      if (suf && !addr.endsWith(suf)) return false;
      return true;
    },
    [],
  );

  const stopVanitySearch = useCallback(() => {
    searchAbortRef.current = true;
    setIsSearching(false);
  }, []);

  const startVanitySearch = useCallback(async () => {
    const { prefix, suffix, caseSensitive, threads, quantity } = vanityConfig;

    if (!prefix && !suffix) {
      setError("Please enter a prefix or suffix to search for");
      return;
    }

    if (prefix && !isValidBase58(prefix)) {
      setError(
        "Prefix contains invalid characters. Valid: 1-9, A-H, J-N, P-Z, a-k, m-z",
      );
      return;
    }

    if (suffix && !isValidBase58(suffix)) {
      setError(
        "Suffix contains invalid characters. Valid: 1-9, A-H, J-N, P-Z, a-k, m-z",
      );
      return;
    }

    setError(null);
    setIsSearching(true);
    setVanityResults([]);
    searchAbortRef.current = false;

    const startTime = Date.now();
    let totalAttempts = 0;
    let foundCount = 0;
    const results: VanityResult[] = [];

    // Update stats periodically
    const statsInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setSearchStats({
        attempts: totalAttempts,
        speed: Math.round(totalAttempts / elapsed),
        elapsed: Math.round(elapsed),
      });
    }, 100);

    // Use main thread batch processing for reliability
    const searchBatch = (batchSize: number): VanityResult | null => {
      for (let i = 0; i < batchSize; i++) {
        if (searchAbortRef.current || foundCount >= quantity) {
          return null;
        }

        totalAttempts++;
        const keypair = Keypair.generate();
        const address = keypair.publicKey.toString();

        if (matchesPattern(address, prefix, suffix, caseSensitive)) {
          const privateKey = bs58.encode(keypair.secretKey);
          return {
            address,
            privateKey,
            attempts: totalAttempts,
            time: (Date.now() - startTime) / 1000,
          };
        }
      }
      return null;
    };

    // Run multiple concurrent search threads
    const runSearch = async (_threadId: number): Promise<void> => {
      while (!searchAbortRef.current && foundCount < quantity) {
        const result = searchBatch(1000);
        if (result) {
          foundCount++;
          results.push(result);
          setVanityResults([...results]);

          if (foundCount >= quantity) {
            searchAbortRef.current = true;
          }
        }
        // Yield to prevent UI freezing
        await new Promise((r) => setTimeout(r, 0));
      }
    };

    // Start multiple search threads
    const threadPromises = Array.from({ length: threads }, (_, i) =>
      runSearch(i),
    );

    await Promise.all(threadPromises);

    clearInterval(statsInterval);
    setIsSearching(false);

    // Final stats update
    const elapsed = (Date.now() - startTime) / 1000;
    setSearchStats({
      attempts: totalAttempts,
      speed: Math.round(totalAttempts / elapsed),
      elapsed: Math.round(elapsed),
    });
  }, [vanityConfig, matchesPattern]);

  const copyToClipboard = async (
    text: string,
    index: number,
  ): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const addVanityWallet = async (result: VanityResult): Promise<void> => {
    const wallet: WalletType = {
      id: generateWalletId(),
      address: result.address,
      privateKey: result.privateKey,
      isActive: false,
      category: "Medium",
      source: "imported",
    };

    try {
      await onCreateWallet(wallet);
      // Remove from results after adding
      setVanityResults((prev) =>
        prev.filter((r) => r.address !== result.address),
      );
    } catch (ignore) {
      setError("Failed to add wallet");
    }
  };

  const addAllVanityWallets = async (): Promise<void> => {
    setIsCreating(true);
    let successCount = 0;

    for (const result of vanityResults) {
      const wallet: WalletType = {
        id: generateWalletId(),
        address: result.address,
        privateKey: result.privateKey,
        isActive: false,
        category: "Medium",
        source: "imported",
      };

      try {
        await onCreateWallet(wallet);
        successCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (err) {
        console.error("Error adding vanity wallet:", err);
      }
    }

    if (successCount === vanityResults.length) {
      setVanityResults([]);
      onClose();
    } else {
      setError(`Added ${successCount}/${vanityResults.length} wallets`);
    }
    setIsCreating(false);
  };

  const removeVanityResult = (address: string): void => {
    setVanityResults((prev) => prev.filter((r) => r.address !== address));
  };

  const handleCreateWallets = async (): Promise<void> => {
    setError(null);

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum < 1 || quantityNum > 100) {
      setError("Please enter a valid number between 1 and 100");
      return;
    }

    if (
      walletType === "hd" &&
      (!selectedMasterWalletId || masterWallets.length === 0)
    ) {
      setError("Please select a master wallet");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newWallets: WalletType[] = [];

      if (walletType === "im") {
        // Generate multiple IM wallets
        for (let i = 0; i < quantityNum; i++) {
          const newWallet = createNewWallet();
          newWallets.push(newWallet);
        }
      } else {
        // Generate HD wallets from master
        const masterWallet = masterWallets.find(
          (mw) => mw.id === selectedMasterWalletId,
        );
        if (!masterWallet) {
          setError("Selected master wallet not found");
          setIsCreating(false);
          return;
        }

        // Find the starting derivation index
        const startIndex =
          masterWallet.accountCount === 0 ? 0 : masterWallet.accountCount;

        // Generate multiple HD wallets
        for (let i = 0; i < quantityNum; i++) {
          const accountIndex = startIndex + i;
          const newWallet = createHDWalletFromMaster(
            masterWallet,
            accountIndex,
          );
          newWallets.push(newWallet);
        }
      }

      // Create all wallets sequentially with a small delay to ensure state updates complete
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < newWallets.length; i++) {
        const wallet = newWallets[i];
        try {
          await onCreateWallet(wallet);
          successCount++;
          // Small delay between wallet creations to ensure React state updates complete
          if (i < newWallets.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        } catch (error) {
          console.error("Error creating wallet:", error);
          failCount++;
        }
      }

      if (failCount === 0) {
        onClose();
      } else {
        setError(`Created ${successCount} wallet(s), ${failCount} failed`);
      }
    } catch (error) {
      console.error("Error creating wallets:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create wallets",
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  const selectedMasterWallet = masterWallets.find(
    (mw) => mw.id === selectedMasterWalletId,
  );
  const quantityNum = parseInt(quantity) || 1;

  return createPortal(
    <div
      className="fixed inset-0 bg-app-overlay flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-app-primary border border-app-primary-30 rounded-xl p-6
                   w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-slide-up my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-app-primary-20 flex-shrink-0">
          <h2 className="text-xl font-mono color-primary tracking-wider">
            Create Wallet
          </h2>
          <button
            onClick={onClose}
            className="p-2 color-primary hover-color-primary-light transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-6 min-h-0">
          {/* Wallet Type Selector */}
          <div className="flex gap-2 p-1 bg-app-quaternary rounded-lg">
            <button
              onClick={() => {
                setWalletType("im");
                setError(null);
                stopVanitySearch();
              }}
              className={`flex-1 px-3 py-2 rounded font-mono text-sm transition-all ${
                walletType === "im"
                  ? "bg-app-primary-color text-black"
                  : "text-app-secondary-80 hover:text-app-primary"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Key size={16} />
                IM
              </div>
            </button>
            <button
              onClick={() => {
                setWalletType("hd");
                setError(null);
                stopVanitySearch();
              }}
              disabled={masterWallets.length === 0}
              className={`flex-1 px-3 py-2 rounded font-mono text-sm transition-all ${
                walletType === "hd"
                  ? "bg-app-primary-color text-black"
                  : masterWallets.length === 0
                    ? "text-app-secondary-60 cursor-not-allowed"
                    : "text-app-secondary-80 hover:text-app-primary"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Wallet size={16} />
                HD
              </div>
            </button>
            <button
              onClick={() => {
                setWalletType("vanity");
                setError(null);
              }}
              className={`flex-1 px-3 py-2 rounded font-mono text-sm transition-all ${
                walletType === "vanity"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  : "text-app-secondary-80 hover:text-app-primary"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles size={16} />
                Vanity
              </div>
            </button>
          </div>

          {/* Quantity Input - only for IM and HD */}
          {walletType !== "vanity" && (
            <div>
              <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                Quantity (1-100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    value === "" ||
                    (parseInt(value) >= 1 && parseInt(value) <= 100)
                  ) {
                    setQuantity(value);
                    setError(null);
                  }
                }}
                className="w-full bg-app-quaternary border border-app-primary-20 rounded-lg
                           px-4 py-3 text-app-primary focus:border-app-primary-60 focus:outline-none
                           font-mono"
                placeholder="1"
              />
            </div>
          )}

          {walletType === "im" && (
            <>
              <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={20}
                    className="color-primary flex-shrink-0 mt-0.5"
                  />
                  <div className="text-sm text-app-secondary font-mono">
                    <p className="font-bold mb-2 text-app-primary">
                      IM Wallet (Imported):
                    </p>
                    <ul className="space-y-1">
                      <li>
                        • Generates{" "}
                        {quantityNum === 1
                          ? "a new random private key"
                          : `${quantityNum} new random private keys`}
                      </li>
                      <li>• Not derived from a master wallet</li>
                      <li>• Store your private keys securely</li>
                      <li>• Each wallet is independent</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {walletType === "hd" && (
            <>
              {masterWallets.length === 0 ? (
                <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={20}
                      className="text-warning-alt flex-shrink-0 mt-0.5"
                    />
                    <div className="text-sm text-app-secondary font-mono">
                      <p className="font-bold mb-2 text-app-primary">
                        No Master Wallets Available
                      </p>
                      <p className="text-app-secondary-80">
                        You need to create or import a master wallet first to
                        generate HD wallets.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                      Select Master Wallet
                    </label>
                    <select
                      value={selectedMasterWalletId}
                      onChange={(e) => {
                        setSelectedMasterWalletId(e.target.value);
                        setError(null);
                      }}
                      className="w-full bg-app-quaternary border border-app-primary-20 rounded-lg
                                 px-4 py-3 text-app-primary focus:border-app-primary-60 focus:outline-none
                                 font-mono"
                    >
                      {masterWallets.map((mw) => (
                        <option key={mw.id} value={mw.id}>
                          {mw.name} ({mw.accountCount || 0} wallets)
                        </option>
                      ))}
                    </select>
                    {selectedMasterWallet && (
                      <div className="mt-2 text-xs font-mono text-app-secondary-80">
                        {quantityNum === 1
                          ? `Next wallet will be derived at index ${selectedMasterWallet.accountCount === 0 ? 0 : selectedMasterWallet.accountCount}`
                          : `Wallets will be derived starting at index ${selectedMasterWallet.accountCount === 0 ? 0 : selectedMasterWallet.accountCount}`}
                      </div>
                    )}
                  </div>

                  <div className="bg-app-quaternary border border-app-primary-20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        size={20}
                        className="color-primary flex-shrink-0 mt-0.5"
                      />
                      <div className="text-sm text-app-secondary font-mono">
                        <p className="font-bold mb-2 text-app-primary">
                          HD Wallet (Hierarchical Deterministic):
                        </p>
                        <ul className="space-y-1">
                          <li>• Derived from selected master wallet</li>
                          <li>• Uses deterministic derivation path</li>
                          <li>• Can regenerate from master seed phrase</li>
                          <li>• All HD wallets share the same master</li>
                          <li>
                            • Will generate {quantityNum} wallet
                            {quantityNum > 1 ? "s" : ""} sequentially
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {walletType === "vanity" && (
            <>
              {/* Pattern Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                    Starts With
                  </label>
                  <input
                    type="text"
                    value={vanityConfig.prefix}
                    onChange={(e) => {
                      const value = e.target.value.replace(
                        /[^1-9A-HJ-NP-Za-km-z]/g,
                        "",
                      );
                      setVanityConfig((prev) => ({ ...prev, prefix: value }));
                      setError(null);
                    }}
                    disabled={isSearching}
                    maxLength={6}
                    className="w-full bg-app-quaternary border border-app-primary-20 rounded-lg
                               px-4 py-3 text-app-primary focus:border-purple-500 focus:outline-none
                               font-mono uppercase placeholder:normal-case disabled:opacity-50"
                    placeholder="e.g. PUMP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                    Ends With
                  </label>
                  <input
                    type="text"
                    value={vanityConfig.suffix}
                    onChange={(e) => {
                      const value = e.target.value.replace(
                        /[^1-9A-HJ-NP-Za-km-z]/g,
                        "",
                      );
                      setVanityConfig((prev) => ({ ...prev, suffix: value }));
                      setError(null);
                    }}
                    disabled={isSearching}
                    maxLength={6}
                    className="w-full bg-app-quaternary border border-app-primary-20 rounded-lg
                               px-4 py-3 text-app-primary focus:border-purple-500 focus:outline-none
                               font-mono uppercase placeholder:normal-case disabled:opacity-50"
                    placeholder="e.g. SOL"
                  />
                </div>
              </div>

              {/* Advanced Options */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                    Threads
                  </label>
                  <select
                    value={vanityConfig.threads}
                    onChange={(e) =>
                      setVanityConfig((prev) => ({
                        ...prev,
                        threads: parseInt(e.target.value),
                      }))
                    }
                    disabled={isSearching}
                    className="w-full bg-app-quaternary border border-app-primary-20 rounded-lg
                               px-4 py-3 text-app-primary focus:border-purple-500 focus:outline-none
                               font-mono disabled:opacity-50"
                  >
                    {[1, 2, 4, 8, 12, 16].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                    Quantity
                  </label>
                  <select
                    value={vanityConfig.quantity}
                    onChange={(e) =>
                      setVanityConfig((prev) => ({
                        ...prev,
                        quantity: parseInt(e.target.value),
                      }))
                    }
                    disabled={isSearching}
                    className="w-full bg-app-quaternary border border-app-primary-20 rounded-lg
                               px-4 py-3 text-app-primary focus:border-purple-500 focus:outline-none
                               font-mono disabled:opacity-50"
                  >
                    {[1, 2, 3, 5, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-mono text-app-secondary-80 mb-2">
                    Case
                  </label>
                  <button
                    onClick={() =>
                      setVanityConfig((prev) => ({
                        ...prev,
                        caseSensitive: !prev.caseSensitive,
                      }))
                    }
                    disabled={isSearching}
                    className={`w-full px-4 py-3 rounded-lg font-mono text-sm transition-all border ${
                      vanityConfig.caseSensitive
                        ? "bg-purple-500/20 border-purple-500 text-purple-400"
                        : "bg-app-quaternary border-app-primary-20 text-app-secondary-80"
                    } disabled:opacity-50`}
                  >
                    {vanityConfig.caseSensitive ? "Sensitive" : "Insensitive"}
                  </button>
                </div>
              </div>

              {/* Search Stats */}
              {(isSearching || searchStats.attempts > 0) && (
                <div className="bg-app-quaternary border border-purple-500/30 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-mono text-purple-400">
                        {searchStats.attempts.toLocaleString()}
                      </div>
                      <div className="text-xs font-mono text-app-secondary-60">
                        Attempts
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-mono text-purple-400">
                        {searchStats.speed.toLocaleString()}/s
                      </div>
                      <div className="text-xs font-mono text-app-secondary-60">
                        Speed
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-mono text-purple-400">
                        {searchStats.elapsed}s
                      </div>
                      <div className="text-xs font-mono text-app-secondary-60">
                        Elapsed
                      </div>
                    </div>
                  </div>
                  {isSearching && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                      <span className="text-sm font-mono text-purple-400">
                        Searching... ({vanityResults.length}/
                        {vanityConfig.quantity} found)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Results */}
              {vanityResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-app-secondary-80">
                      Found Addresses ({vanityResults.length})
                    </span>
                    {vanityResults.length > 1 && (
                      <button
                        onClick={addAllVanityWallets}
                        disabled={isCreating}
                        className="text-xs font-mono text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                      >
                        <Plus size={12} />
                        Add All
                      </button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {vanityResults.map((result, index) => {
                      const prefixLen = vanityConfig.prefix.length;
                      const suffixLen = vanityConfig.suffix.length;
                      const middleEnd = suffixLen > 0 ? -suffixLen : undefined;

                      return (
                        <div
                          key={result.address}
                          className="bg-app-quaternary border border-purple-500/20 rounded-lg p-3 group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-sm text-app-primary truncate">
                                {prefixLen > 0 && (
                                  <span className="text-purple-400">
                                    {result.address.slice(0, prefixLen)}
                                  </span>
                                )}
                                <span>
                                  {result.address.slice(prefixLen, middleEnd)}
                                </span>
                                {suffixLen > 0 && (
                                  <span className="text-pink-400">
                                    {result.address.slice(-suffixLen)}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-mono text-app-secondary-60 mt-1">
                                {result.attempts.toLocaleString()} attempts •{" "}
                                {result.time.toFixed(1)}s
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  copyToClipboard(result.privateKey, index)
                                }
                                className="p-1.5 hover:bg-app-tertiary rounded transition-colors"
                                title="Copy private key"
                              >
                                {copiedIndex === index ? (
                                  <Check size={14} className="text-green-400" />
                                ) : (
                                  <Copy
                                    size={14}
                                    className="text-app-secondary-60"
                                  />
                                )}
                              </button>
                              <button
                                onClick={() => addVanityWallet(result)}
                                className="p-1.5 hover:bg-app-tertiary rounded transition-colors"
                                title="Add wallet"
                              >
                                <Plus size={14} className="text-purple-400" />
                              </button>
                              <button
                                onClick={() =>
                                  removeVanityResult(result.address)
                                }
                                className="p-1.5 hover:bg-app-tertiary rounded transition-colors"
                                title="Remove"
                              >
                                <Trash2 size={14} className="text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-app-quaternary border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles
                    size={20}
                    className="text-purple-400 flex-shrink-0 mt-0.5"
                  />
                  <div className="text-sm text-app-secondary font-mono">
                    <p className="font-bold mb-2 text-purple-400">
                      Vanity Address Generator:
                    </p>
                    <ul className="space-y-1 text-app-secondary-80">
                      <li>• Search for addresses matching your pattern</li>
                      <li>
                        • Longer patterns = exponentially longer search time
                      </li>
                      <li>• Valid chars: 1-9, A-H, J-N, P-Z, a-k, m-z</li>
                      <li>• Avoid 0, O, I, l (not in base58)</li>
                      <li>• More threads = faster search (uses more CPU)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="text-sm font-mono text-error-alt flex items-center gap-2 bg-app-quaternary border border-error-alt rounded-lg p-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-app-primary-20 flex-shrink-0">
          <button
            onClick={() => {
              stopVanitySearch();
              onClose();
            }}
            className="px-6 py-2 bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20
                       hover:border-app-primary-40 text-app-primary font-mono rounded-lg transition-all duration-200"
          >
            Cancel
          </button>

          {walletType === "vanity" ? (
            <div className="flex gap-2">
              {isSearching ? (
                <button
                  onClick={stopVanitySearch}
                  className="px-6 py-2 font-mono rounded-lg transition-all duration-200
                             bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30
                             flex items-center gap-2"
                >
                  <Square size={16} />
                  Stop Search
                </button>
              ) : (
                <>
                  {vanityResults.length > 0 && (
                    <button
                      onClick={addAllVanityWallets}
                      disabled={isCreating}
                      className={`px-6 py-2 font-mono rounded-lg transition-all duration-200 ${
                        isCreating
                          ? "bg-app-tertiary text-app-secondary-60 cursor-not-allowed"
                          : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30"
                      }`}
                    >
                      {isCreating
                        ? "Adding..."
                        : `Add ${vanityResults.length} Wallet${vanityResults.length > 1 ? "s" : ""}`}
                    </button>
                  )}
                  <button
                    onClick={startVanitySearch}
                    disabled={!vanityConfig.prefix && !vanityConfig.suffix}
                    className={`px-6 py-2 font-mono rounded-lg transition-all duration-200 flex items-center gap-2 ${
                      !vanityConfig.prefix && !vanityConfig.suffix
                        ? "bg-app-tertiary text-app-secondary-60 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    }`}
                  >
                    <Play size={16} />
                    Start Search
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={handleCreateWallets}
              disabled={
                isCreating ||
                (walletType === "hd" &&
                  (masterWallets.length === 0 || !selectedMasterWalletId)) ||
                !quantity ||
                parseInt(quantity) < 1
              }
              className={`px-6 py-2 font-mono rounded-lg transition-all duration-200 ${
                isCreating ||
                (walletType === "hd" &&
                  (masterWallets.length === 0 || !selectedMasterWalletId)) ||
                !quantity ||
                parseInt(quantity) < 1
                  ? "bg-app-tertiary text-app-secondary-60 cursor-not-allowed"
                  : "bg-app-primary-color hover:bg-app-primary-dark text-black"
              }`}
            >
              {isCreating
                ? `Creating ${quantityNum} wallet${quantityNum > 1 ? "s" : ""}...`
                : `Create ${quantityNum} wallet${quantityNum > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CreateWalletModal;
