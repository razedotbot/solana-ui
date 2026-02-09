import React from "react";
import {
  Share,
  GitMerge,
  Send,
  Download,
  Flame,
  Shuffle,
} from "lucide-react";

interface OperationEmptyStateProps {
  onDistribute: () => void;
  onMixer: () => void;
  onConsolidate: () => void;
  onTransfer: () => void;
  onDeposit: () => void;
  onBurn: () => void;
  isConnected: boolean;
}

const operations = [
  { label: "Distribute", icon: Share, action: "onDistribute" as const, description: "Split SOL across wallets" },
  { label: "Mixer", icon: Shuffle, action: "onMixer" as const, description: "Mix SOL between wallets" },
  { label: "Consolidate", icon: GitMerge, action: "onConsolidate" as const, description: "Merge funds to one wallet" },
  { label: "Transfer", icon: Send, action: "onTransfer" as const, description: "Send between wallets" },
  { label: "Deposit", icon: Download, action: "onDeposit" as const, description: "Add funds from external" },
  { label: "Burn", icon: Flame, action: "onBurn" as const, description: "Burn unwanted tokens" },
];

export const OperationEmptyState: React.FC<OperationEmptyStateProps> = (props) => {
  const { isConnected } = props;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <h3 className="text-lg font-semibold text-app-primary font-mono mb-2">
        <span className="color-primary">/</span> WALLET OPERATIONS <span className="color-primary">/</span>
      </h3>
      <p className="text-sm text-app-secondary mb-8 text-center">
        Select an operation to get started
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {operations.map((op) => (
          <button
            key={op.label}
            onClick={props[op.action]}
            disabled={!isConnected}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-app-primary-20 hover:border-app-primary-40 hover:bg-app-quaternary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <op.icon size={20} className="color-primary" />
            <span className="text-sm font-medium text-app-primary font-mono">{op.label}</span>
            <span className="text-xs text-app-secondary text-center">{op.description}</span>
          </button>
        ))}
      </div>
      {!isConnected && (
        <p className="text-xs text-app-secondary mt-6">
          Connect to an RPC endpoint to enable operations
        </p>
      )}
    </div>
  );
};
