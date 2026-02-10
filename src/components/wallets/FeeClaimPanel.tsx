import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Coins,
  X,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import type { Connection } from "@solana/web3.js";
import {
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import bs58 from "bs58";
import { Buffer } from "buffer";
import { useToast } from "../../utils/hooks";
import type { WalletType } from "../../utils/types";
import type { WindowWithConfig } from "../../utils/trading";
import { sendTransactions } from "../../utils/transactionService";
import { SourceWalletSummary } from "./SourceWalletSummary";

// ─── Platform registry (add new platforms here) ───────────────────────────

type PlatformId = "pumpfun" | "meteora";

interface PlatformOption {
  id: PlatformId;
  label: string;
  description: string;
}

const PLATFORMS: PlatformOption[] = [
  { id: "pumpfun", label: "PUMPFUN", description: "Claim creator fees from Pumpfun" },
  { id: "meteora", label: "METEORA", description: "Claim creator or partner fees from Meteora" },
];

const PRIORITY_FEE_MICROLAMPORTS = 200_000;
const COMPUTE_UNIT_LIMIT = 200_000;

interface FeeClaimIxKey {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

interface FeeClaimIx {
  programId: string;
  keys: FeeClaimIxKey[];
  data: string;
}

interface FeeClaimResponse {
  success: boolean;
  error?: string;
  platform?: string;
  data?: {
    instructions?: FeeClaimIx[];
    transaction?: string;
    feeType?: string;
  };
}

// ─── Props ────────────────────────────────────────────────────────────────

interface FeeClaimPanelProps {
  isOpen: boolean;
  inline?: boolean;
  onClose: () => void;
  wallets: WalletType[];
  baseCurrencyBalances: Map<string, number>;
  connection: Connection;
  selectedWalletIds?: Set<number>;
}

// ─── Component ────────────────────────────────────────────────────────────

export const FeeClaimPanel: React.FC<FeeClaimPanelProps> = ({
  isOpen,
  inline = false,
  onClose,
  wallets,
  baseCurrencyBalances,
  connection,
  selectedWalletIds,
}) => {
  const { showToast } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  // Platform selection
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("pumpfun");

  // Meteora fields
  const [meteoraPool, setMeteoraPool] = useState("");
  const [meteoraMaxBaseAmount, setMeteoraMaxBaseAmount] = useState("1000000000");
  const [meteoraMaxQuoteAmount, setMeteoraMaxQuoteAmount] = useState("1000000000");

  const useExternalSource = inline && selectedWalletIds !== undefined;

  // Resolve all selected wallets
  const selectedWallets = useMemo(() => {
    if (!selectedWalletIds || selectedWalletIds.size === 0) return [];
    return wallets.filter((w) => selectedWalletIds.has(w.id));
  }, [selectedWalletIds, wallets]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsConfirmed(false);
      setProcessedCount(0);
      setSelectedPlatform("pumpfun");
      setMeteoraPool("");
      setMeteoraMaxBaseAmount("1000000000");
      setMeteoraMaxQuoteAmount("1000000000");
    }
  }, [isOpen]);

  // Inject CSS animations
  useEffect(() => {
    if (!isOpen) return;
    const id = "fee-claim-modal-styles";
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
      background: linear-gradient(to bottom right, transparent 0%, var(--color-primary-30) 50%, transparent 100%);
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
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(90deg, transparent 0%, var(--color-primary-70) 50%, transparent 100%);
      width: 100%; height: 100%;
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
    `;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [isOpen]);

  // ─── Helpers ──────────────────────────────────────────────────────────

  const formatAddress = (address: string): string =>
    `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

  const buildRequestBody = (walletAddress: string): { platform: string; params: Record<string, string> } => {
    if (selectedPlatform === "pumpfun") {
      return { platform: "pumpfun", params: { coinCreator: walletAddress } };
    }

    return {
      platform: "meteora",
      params: {
        feeType: "creator",
        creator: walletAddress,
        payer: walletAddress,
        pool: meteoraPool,
        maxBaseAmount: meteoraMaxBaseAmount,
        maxQuoteAmount: meteoraMaxQuoteAmount,
      },
    };
  };

  const canProceedToReview = (): boolean => {
    if (selectedWallets.length === 0) return false;

    if (selectedPlatform === "pumpfun") {
      return true; // coinCreator is auto-derived from wallet address
    }

    if (selectedPlatform === "meteora") {
      return meteoraPool.trim().length > 0;
    }

    return false;
  };

  // ─── Transaction handler ──────────────────────────────────────────────

  const sendFeeClaimForWallet = async (
    wallet: WalletType,
    baseUrl: string,
  ): Promise<void> => {
    const keypair = Keypair.fromSecretKey(bs58.decode(wallet.privateKey));

    const response = await fetch(`${baseUrl}/v2/sol/fee-claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestBody(wallet.address)),
    });

    const json = (await response.json()) as FeeClaimResponse;

    if (!json.success) {
      throw new Error(json.error ?? "Fee claim API request failed");
    }

    let tx: Transaction;

    if (json.data?.instructions) {
      const instructions: TransactionInstruction[] = json.data.instructions.map(
        (ix) =>
          new TransactionInstruction({
            programId: new PublicKey(ix.programId),
            keys: ix.keys.map((k) => ({
              pubkey: new PublicKey(k.pubkey),
              isSigner: k.isSigner,
              isWritable: k.isWritable,
            })),
            data: Buffer.from(ix.data, "base64"),
          }),
      );

      tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNIT_LIMIT }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICROLAMPORTS }));
      tx.add(...instructions);
    } else if (json.data?.transaction) {
      const txBuf = Buffer.from(json.data.transaction, "base64");
      const originalTx = Transaction.from(txBuf);

      tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNIT_LIMIT }));
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICROLAMPORTS }));
      tx.add(...originalTx.instructions);
    } else {
      throw new Error("Unexpected API response format");
    }

    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.feePayer = keypair.publicKey;
    tx.recentBlockhash = blockhash;
    tx.sign(keypair);

    const serialized = bs58.encode(tx.serialize());
    await sendTransactions([serialized]);
  };

  const handleFeeClaim = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!isConfirmed || selectedWallets.length === 0) return;

    setIsSubmitting(true);
    setProcessedCount(0);

    const baseUrl =
      (window as unknown as WindowWithConfig).tradingServerUrl?.replace(/\/+$/, "") || "";

    let successCount = 0;
    let failCount = 0;

    for (const wallet of selectedWallets) {
      try {
        await sendFeeClaimForWallet(wallet, baseUrl);
        successCount++;
      } catch (error) {
        failCount++;
        const msg = error instanceof Error ? error.message : "Unknown error";
        showToast(`Failed for ${formatAddress(wallet.address)}: ${msg}`, "error");
      }
      setProcessedCount((prev) => prev + 1);
    }

    if (successCount > 0) {
      showToast(`Fee claim sent for ${successCount}/${selectedWallets.length} wallet(s)`, "success");
    }
    if (failCount === selectedWallets.length) {
      showToast("All fee claims failed", "error");
    }

    setIsSubmitting(false);
    onClose();
  };

  // ─── Render ───────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const inputClasses =
    "w-full px-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary shadow-inner focus-border-primary focus:ring-1 focus:ring-primary-50 focus:outline-none transition-all duration-200 modal-input- font-mono tracking-wider";

  const renderPlatformFields = (): React.ReactNode => {
    if (selectedPlatform === "pumpfun") {
      return (
        <div className="mt-4 p-3 bg-app-tertiary rounded-lg border border-app-primary-30">
          <span className="text-xs text-app-secondary font-mono uppercase">
            Coin creator = each wallet's address (automatic)
          </span>
        </div>
      );
    }

    if (selectedPlatform === "meteora") {
      return (
        <>
          {/* Creator = wallet address (automatic) */}
          <div className="mt-4 p-3 bg-app-tertiary rounded-lg border border-app-primary-30">
            <span className="text-xs text-app-secondary font-mono uppercase">
              Creator = each wallet's address (automatic)
            </span>
          </div>

          {/* Pool */}
          <div className="group mt-4">
            <label className="text-sm font-medium text-app-secondary group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider mb-2 block">
              <span className="color-primary">&#62;</span> Pool Address{" "}
              <span className="color-primary">&#60;</span>
            </label>
            <input
              type="text"
              value={meteoraPool}
              onChange={(e) => setMeteoraPool(e.target.value)}
              className={inputClasses}
              placeholder="POOL PUBKEY"
            />
          </div>

          {/* Max amounts */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="group">
              <label className="text-xs font-medium text-app-secondary group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider mb-1 block">
                Max Base Amount
              </label>
              <input
                type="text"
                value={meteoraMaxBaseAmount}
                onChange={(e) => {
                  if (e.target.value === "" || /^\d+$/.test(e.target.value)) {
                    setMeteoraMaxBaseAmount(e.target.value);
                  }
                }}
                className={inputClasses}
              />
            </div>
            <div className="group">
              <label className="text-xs font-medium text-app-secondary group-hover:color-primary transition-colors duration-200 font-mono uppercase tracking-wider mb-1 block">
                Max Quote Amount
              </label>
              <input
                type="text"
                value={meteoraMaxQuoteAmount}
                onChange={(e) => {
                  if (e.target.value === "" || /^\d+$/.test(e.target.value)) {
                    setMeteoraMaxQuoteAmount(e.target.value);
                  }
                }}
                className={inputClasses}
              />
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  const renderReviewSummary = (): { label: string; value: string }[] => {
    const rows: { label: string; value: string }[] = [
      { label: "PLATFORM", value: selectedPlatform.toUpperCase() },
      { label: "WALLETS", value: `${selectedWallets.length} wallet(s)` },
    ];

    if (selectedPlatform === "pumpfun") {
      rows.push({ label: "COIN CREATOR", value: "Each wallet's address" });
    } else if (selectedPlatform === "meteora") {
      rows.push({ label: "CREATOR", value: "Each wallet's address" });
      rows.push({ label: "POOL", value: formatAddress(meteoraPool) });
      rows.push({ label: "MAX BASE", value: meteoraMaxBaseAmount });
      rows.push({ label: "MAX QUOTE", value: meteoraMaxQuoteAmount });
    }

    return rows;
  };

  const modalContent = (
    <div
      className={
        inline
          ? "relative flex flex-col h-full overflow-hidden"
          : "relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-md overflow-hidden transform modal-content"
      }
    >
      {!inline && <div className="absolute inset-0 z-0 opacity-10 bg-grid"></div>}

      {/* Header */}
      <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
            <Coins size={16} className="color-primary" />
          </div>
          <h2 className="text-lg font-semibold text-app-primary font-mono">
            <span className="color-primary">/</span> FEE CLAIM{" "}
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

      {/* Progress bar */}
      <div className="relative w-full h-1 bg-app-tertiary progress-bar-">
        <div
          className="h-full bg-app-primary-color transition-all duration-300"
          style={{ width: currentStep === 0 ? "50%" : "100%" }}
        ></div>
      </div>

      {/* Content */}
      <div className={`relative z-10 p-5 space-y-5 ${inline ? "flex-1 overflow-y-auto" : ""}`}>
        {/* ── Step 0: Configure ── */}
        {currentStep === 0 && (
          <div className="animate-[fadeIn_0.3s_ease]">
            {/* Selected wallet summary */}
            {useExternalSource && selectedWalletIds && (
              <SourceWalletSummary
                wallets={wallets}
                selectedWalletIds={selectedWalletIds}
                baseCurrencyBalances={baseCurrencyBalances}
                label="SIGNING WALLETS"
                mode={selectedWallets.length > 1 ? "multi" : "single"}
              />
            )}

            {/* Platform selector */}
            <div className="mt-4">
              <label className="text-sm font-medium text-app-secondary font-mono uppercase tracking-wider mb-2 block">
                <span className="color-primary">&#62;</span> Platform{" "}
                <span className="color-primary">&#60;</span>
              </label>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlatform(p.id)}
                    className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-sm font-mono transition-all ${
                      selectedPlatform === p.id
                        ? "bg-app-primary-color border-app-primary-color text-app-primary"
                        : "bg-app-tertiary border-app-primary-30 text-app-secondary hover:border-app-primary-40"
                    }`}
                  >
                    <span className="font-semibold tracking-wider">{p.label}</span>
                    <span className="text-xs opacity-70">{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform-specific fields */}
            {renderPlatformFields()}

            {/* Footer buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-app-primary bg-app-tertiary border border-app-primary-30 hover:bg-app-secondary hover-border-primary rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-"
              >
                CANCEL
              </button>
              <button
                onClick={() => setCurrentStep(1)}
                disabled={!canProceedToReview()}
                className={`px-5 py-2.5 text-app-primary rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider ${
                  !canProceedToReview()
                    ? "bg-primary-50 cursor-not-allowed opacity-50"
                    : "bg-app-primary-color hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-"
                }`}
              >
                <span>REVIEW</span>
                <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Review & Confirm ── */}
        {currentStep === 1 && (
          <div className="animate-[fadeIn_0.3s_ease]">
            {/* Summary */}
            <div className="bg-app-tertiary border border-app-primary-30 rounded-lg p-4 mb-5">
              <h3 className="text-base font-semibold text-app-primary mb-3 font-mono tracking-wider">
                TRANSACTION SUMMARY
              </h3>
              <div className="space-y-3">
                {renderReviewSummary().map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-app-secondary font-mono">{row.label}:</span>
                    <div className="flex items-center bg-app-secondary px-2 py-1 rounded border border-app-primary-20">
                      <span className="text-sm font-mono text-app-primary glitch-text">
                        {row.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmation checkbox */}
            <div
              className="flex items-center px-3 py-3 bg-app-tertiary rounded-lg border border-app-primary-30 mb-5 cursor-pointer"
              onClick={() => setIsConfirmed(!isConfirmed)}
            >
              <div className="relative mx-1">
                <div
                  className={`w-5 h-5 border border-app-primary-40 rounded transition-all ${
                    isConfirmed ? "bg-app-primary-color border-0" : ""
                  }`}
                ></div>
                <CheckCircle
                  size={14}
                  className={`absolute top-0.5 left-0.5 text-app-primary transition-all ${
                    isConfirmed ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
              <span className="text-app-primary text-sm ml-2 select-none font-mono">
                I CONFIRM THIS FEE CLAIM TRANSACTION
              </span>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setCurrentStep(0);
                  setIsConfirmed(false);
                }}
                className="px-5 py-2.5 text-app-primary bg-app-tertiary border border-app-primary-30 hover:bg-app-secondary hover-border-primary rounded-lg transition-all duration-200 shadow-md font-mono tracking-wider modal-btn-"
              >
                BACK
              </button>
              <button
                onClick={handleFeeClaim}
                disabled={!isConfirmed || isSubmitting}
                className={`px-5 py-2.5 rounded-lg shadow-lg flex items-center transition-all duration-300 font-mono tracking-wider ${
                  !isConfirmed || isSubmitting
                    ? "bg-primary-50 text-app-primary-80 cursor-not-allowed opacity-50"
                    : "bg-app-primary-color text-app-primary hover:bg-app-primary-dark transform hover:-translate-y-0.5 modal-btn-"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-app-primary-80 border-t-transparent animate-spin mr-2"></div>
                    {processedCount}/{selectedWallets.length} PROCESSING...
                  </>
                ) : (
                  "CLAIM FEES"
                )}
              </button>
            </div>
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
