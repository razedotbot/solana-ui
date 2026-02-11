import React from "react";
import {
  Eye,
  Image,
  AlertTriangle,
  Check,
  Rocket,
  RefreshCw,
} from "lucide-react";
import type { TokenMetadata } from "./constants";

interface DeployPreviewProps {
  tokenData: TokenMetadata;
  selectedWallets: string[];
  walletAmounts: Record<string, string>;
  totalDeploys: number;
  isConfirmed: boolean;
  setIsConfirmed: (value: boolean) => void;
  canDeploy: boolean;
  isSubmitting: boolean;
  onDeploy: () => void;
}

export const DeployPreview: React.FC<DeployPreviewProps> = ({
  tokenData,
  selectedWallets,
  walletAmounts,
  totalDeploys,
  isConfirmed,
  setIsConfirmed,
  canDeploy,
  isSubmitting,
  onDeploy,
}) => {
  const totalAmount = selectedWallets.reduce((sum, pk) => sum + (parseFloat(walletAmounts[pk]) || 0), 0);

  return (
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
          <div className="px-2 py-1 rounded-lg bg-app-primary-color/20 border border-app-primary-color/30">
            <span className="text-xs font-mono font-bold color-primary">{totalDeploys} deploy{totalDeploys > 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
            <p className="text-[10px] text-app-secondary-40 font-mono uppercase mb-1">Deploys</p>
            <p className="text-sm font-bold text-app-primary font-mono">{totalDeploys}</p>
          </div>
          <div className="p-3 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
            <p className="text-[10px] text-app-secondary-40 font-mono uppercase mb-1">Wallets</p>
            <p className="text-sm font-bold text-app-primary font-mono">{selectedWallets.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-app-tertiary/50 border border-app-primary-20">
            <p className="text-[10px] text-app-secondary-40 font-mono uppercase mb-1">Total Buy</p>
            <p className="text-sm font-bold color-primary font-mono">{totalAmount.toFixed(4)} SOL</p>
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
            I confirm <span className="color-primary font-medium">{totalDeploys} deploy{totalDeploys !== 1 ? "s" : ""}</span> with metadata <span className="text-app-primary font-medium">{tokenData.name || "unnamed"}</span>.
            This action cannot be undone.
          </span>
        </label>

        {/* Deploy Button */}
        <button
          type="button"
          onClick={onDeploy}
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
              {totalDeploys > 1 ? `DEPLOY ${totalDeploys} TOKENS` : "DEPLOY TOKEN"}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
