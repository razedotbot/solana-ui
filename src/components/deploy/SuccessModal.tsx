import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Copy, Check, ExternalLink } from "lucide-react";
import type { PlatformType } from "../../utils/create";
import { useToast, useTokenMetadata } from "../../utils/hooks";
import { PLATFORMS } from "./constants";

interface SuccessModalProps {
  mintAddress: string;
  platform: PlatformType;
  onReset: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  mintAddress,
  platform,
  onReset,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { metadata: tokenMeta } = useTokenMetadata(mintAddress);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(mintAddress);
    setCopied(true);
    showToast("Copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-app-secondary border border-app-primary-30 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in-down">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 flex items-center justify-center">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-center text-app-primary font-mono mb-2">TOKEN DEPLOYED</h2>
        <p className="text-xs text-center text-app-secondary-60 font-mono mb-6">
          Successfully launched on {PLATFORMS.find((p) => p.id === platform)?.name}
        </p>
        <div className="bg-app-tertiary/50 rounded-xl p-4 mb-6 border border-app-primary-20">
          {tokenMeta?.name && (
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-app-primary-10">
              {tokenMeta.image && (
                <img src={tokenMeta.image} alt={tokenMeta.symbol} className="w-10 h-10 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div className="min-w-0">
                <div className="font-bold text-app-primary truncate">{tokenMeta.name}</div>
                <div className="text-xs text-app-secondary-60 font-mono">{tokenMeta.symbol}</div>
              </div>
            </div>
          )}
          <p className="text-[10px] text-app-secondary-40 font-mono uppercase tracking-wider mb-2">Token Address</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-app-primary font-mono break-all">{mintAddress}</code>
            <button onClick={() => void handleCopy()} className="p-2 rounded-lg bg-app-quaternary hover:bg-app-primary-color/20 transition-colors">
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-app-secondary-60" />}
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onReset} className="flex-1 py-3 rounded-xl bg-app-tertiary text-app-primary font-mono font-medium hover:bg-app-quaternary transition-colors border border-app-primary-20">
            Deploy Another
          </button>
          <button onClick={() => navigate(`/tokens/${mintAddress}`)} className="flex-1 py-3 rounded-xl bg-app-primary-color text-black font-mono font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-app-primary-color/30 transition-all">
            View Token <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
