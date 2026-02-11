import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, RefreshCw, X, ExternalLink, LayoutGrid } from "lucide-react";
import type { PlatformType } from "../../utils/create";
import type { DeploymentProgressItem, AdditionalToken } from "./constants";
import { PlatformIcons, PLATFORMS } from "./constants";
import { useMultichart } from "../../contexts/MultichartContext";
import { useToast } from "../Notifications";

interface MultiDeployModalProps {
  isSubmitting: boolean;
  deploymentProgress: DeploymentProgressItem[];
  primaryPlatform: PlatformType;
  additionalTokens: AdditionalToken[];
  onReset: () => void;
}

export const MultiDeployModal: React.FC<MultiDeployModalProps> = ({
  isSubmitting,
  deploymentProgress,
  primaryPlatform,
  additionalTokens,
  onReset,
}) => {
  const navigate = useNavigate();
  const { addToken } = useMultichart();
  const { showToast } = useToast();

  // Get platform for deployment index (0 = primary, 1+ = additional tokens)
  const getPlatformForIndex = (index: number): PlatformType => {
    if (index === 0) return primaryPlatform;
    return additionalTokens[index - 1]?.platform || primaryPlatform;
  };

  const handleViewToken = (mintAddress: string): void => {
    navigate(`/tokens/${mintAddress}`);
  };

  const handleAddToMultichart = (mintAddress: string): void => {
    const added = addToken(mintAddress);
    if (added) {
      showToast("Added to multichart", "success");
    } else {
      showToast("Already in multichart", "success");
    }
  };

  const handleAddAllToMultichart = (): void => {
    const successfulMints = deploymentProgress
      .filter((p) => p.status === "success" && p.mintAddress)
      .map((p) => p.mintAddress as string);

    let addedCount = 0;
    successfulMints.forEach((mint) => {
      if (addToken(mint)) addedCount++;
    });

    if (addedCount > 0) {
      showToast(`Added ${addedCount} token${addedCount > 1 ? "s" : ""} to multichart`, "success");
    } else {
      showToast("All tokens already in multichart", "success");
    }
  };

  const successCount = deploymentProgress.filter((p) => p.status === "success").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-app-secondary border border-app-primary-30 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          {isSubmitting ? (
            <RefreshCw size={24} className="color-primary animate-spin" />
          ) : (
            <CheckCircle size={24} className="text-emerald-400" />
          )}
          <h2 className="text-lg font-bold text-app-primary font-mono">
            {isSubmitting ? "DEPLOYING..." : `${deploymentProgress.filter((p) => p.status === "success").length}/${deploymentProgress.length} DEPLOYED`}
          </h2>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
          {deploymentProgress.map((item, i) => {
            const platform = getPlatformForIndex(i);
            const isPrimary = i === 0;
            return (
              <div key={i} className={`p-3 rounded-xl border ${
                item.status === "deploying" ? "border-app-primary-color bg-app-primary-color/10" :
                item.status === "success" ? "border-emerald-500/30 bg-emerald-500/5" :
                item.status === "failed" ? "border-red-500/30 bg-red-500/5" :
                "border-app-primary-20 bg-app-tertiary/50"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-app-quaternary flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
                      {PlatformIcons[platform]}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-app-primary font-mono">{PLATFORMS.find((p) => p.id === platform)?.name}</span>
                      {isPrimary && <span className="ml-2 text-[10px] font-mono text-app-secondary-40">(Primary)</span>}
                    </div>
                  </div>
                  {item.status === "deploying" && <RefreshCw size={16} className="color-primary animate-spin" />}
                  {item.status === "success" && <CheckCircle size={16} className="text-emerald-400" />}
                  {item.status === "failed" && <X size={16} className="text-red-400" />}
                  {item.status === "pending" && <span className="text-xs text-app-secondary-40 font-mono">WAITING</span>}
                </div>
                {/* Action buttons for successful deployments */}
                {item.status === "success" && item.mintAddress && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-emerald-500/20">
                    <button
                      onClick={() => handleViewToken(item.mintAddress!)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-app-quaternary hover:bg-app-tertiary text-xs font-mono text-app-primary transition-colors"
                    >
                      <ExternalLink size={12} />
                      View
                    </button>
                    <button
                      onClick={() => handleAddToMultichart(item.mintAddress!)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-app-primary-color/20 hover:bg-app-primary-color/30 text-xs font-mono color-primary transition-colors"
                    >
                      <LayoutGrid size={12} />
                      Multichart
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!isSubmitting && (
          <div className="mt-6 space-y-2">
            {successCount > 1 && (
              <button
                onClick={handleAddAllToMultichart}
                className="w-full py-2.5 rounded-xl bg-app-primary-color/20 border border-app-primary-color/30 text-sm font-mono font-bold color-primary hover:bg-app-primary-color/30 transition-all flex items-center justify-center gap-2"
              >
                <LayoutGrid size={16} />
                Add All to Multichart ({successCount})
              </button>
            )}
            <button onClick={onReset} className="w-full py-3 rounded-xl bg-app-primary-color text-black font-mono font-bold hover:shadow-lg transition-all">
              DONE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
