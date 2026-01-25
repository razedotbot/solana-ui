import React from "react";
import { Download, Trash2, Archive } from "lucide-react";
import { WalletTooltip } from "../Styles";
import type { BulkActionsPanelProps } from "./types";

export const BulkActionsPanel: React.FC<BulkActionsPanelProps> = ({
  selectedCount,
  showArchived,
  onDownload,
  onArchive,
  onUnarchive,
  onDelete,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3">
      <div className="flex flex-col items-center gap-2 bg-app-primary border border-app-primary-30 rounded-lg p-3 shadow-lg">
        <WalletTooltip content="Download Selected" position="left">
          <button
            onClick={onDownload}
            className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-app-primary-60 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Download size={16} className="color-primary" />
          </button>
        </WalletTooltip>

        {!showArchived && (
          <WalletTooltip content="Archive Selected" position="left">
            <button
              onClick={onArchive}
              className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-app-primary-60 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Archive size={16} className="color-primary" />
            </button>
          </WalletTooltip>
        )}

        {showArchived && (
          <WalletTooltip content="Unarchive Selected" position="left">
            <button
              onClick={onUnarchive}
              className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-app-primary-60 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Archive size={16} className="text-app-primary-color" />
            </button>
          </WalletTooltip>
        )}

        <WalletTooltip content="Delete Selected" position="left">
          <button
            onClick={onDelete}
            className="p-2 bg-app-quaternary border border-app-primary-20 hover:border-red-500 rounded-lg transition-all duration-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Trash2 size={16} className="text-red-500" />
          </button>
        </WalletTooltip>
      </div>

      <span className="px-3 py-2 bg-app-primary border border-app-primary-30 rounded-lg text-xs sm:text-sm font-mono color-primary whitespace-nowrap shadow-lg">
        {selectedCount} selected
      </span>
    </div>
  );
};
