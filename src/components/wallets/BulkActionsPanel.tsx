import React from "react";
import { Download, Trash2, Archive, X } from "lucide-react";
import type { BulkActionsPanelProps } from "./types";

interface ExtendedBulkActionsPanelProps extends BulkActionsPanelProps {
  onClearSelection?: () => void;
}

export const BulkActionsPanel: React.FC<ExtendedBulkActionsPanelProps> = ({
  selectedCount,
  showArchived,
  onDownload,
  onArchive,
  onUnarchive,
  onDelete,
  onClearSelection,
}) => {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transform transition-all duration-300 ease-out ${
        selectedCount > 0
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-app-primary/95 backdrop-blur-md border-t border-app-primary-20 shadow-2xl shadow-black/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Selection info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-app-primary-color rounded-xl flex items-center justify-center">
                  <span className="text-app-quaternary font-bold text-lg">{selectedCount}</span>
                </div>
                <div>
                  <span className="text-app-primary font-medium">wallet{selectedCount !== 1 ? 's' : ''} selected</span>
                </div>
              </div>

              {onClearSelection && (
                <button
                  onClick={onClearSelection}
                  className="flex items-center gap-1.5 text-sm text-app-secondary-60 hover:text-app-primary px-3 py-1.5 hover:bg-app-quaternary rounded-lg transition-colors"
                >
                  <X size={14} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-2">
              {/* Download */}
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2.5 bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary-30 rounded-xl transition-all"
              >
                <Download size={18} className="color-primary" />
                <span className="text-sm font-medium text-app-primary">Export Keys</span>
              </button>

              {/* Archive/Unarchive */}
              {!showArchived ? (
                <button
                  onClick={onArchive}
                  className="flex items-center gap-2 px-4 py-2.5 bg-app-quaternary hover:bg-orange-500/20 border border-app-primary-20 hover:border-orange-500/30 rounded-xl transition-all"
                >
                  <Archive size={18} className="text-orange-400" />
                  <span className="text-sm font-medium text-app-primary">Archive</span>
                </button>
              ) : (
                <button
                  onClick={onUnarchive}
                  className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/30 rounded-xl transition-all"
                >
                  <Archive size={18} className="text-orange-400" />
                  <span className="text-sm font-medium text-orange-400">Unarchive</span>
                </button>
              )}

              {/* Delete */}
              <button
                onClick={onDelete}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-xl transition-all"
              >
                <Trash2 size={18} className="text-red-400" />
                <span className="text-sm font-medium text-red-400">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
