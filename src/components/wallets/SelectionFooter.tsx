import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Archive,
  Trash2,
  FolderInput,
  ChevronUp,
} from "lucide-react";
import type { WalletGroup } from "../../utils/types";

export interface SelectionFooterProps {
  selectedCount: number;
  showArchived: boolean;
  groups: WalletGroup[];
  onClearSelection: () => void;
  onExportSelected: () => void;
  onArchiveSelected: () => void;
  onUnarchiveSelected: () => void;
  onDeleteSelected: () => void;
  onMoveToGroup: (groupId: string) => void;
}

export const SelectionFooter: React.FC<SelectionFooterProps> = ({
  selectedCount,
  showArchived,
  groups,
  onClearSelection,
  onExportSelected,
  onArchiveSelected,
  onUnarchiveSelected,
  onDeleteSelected,
  onMoveToGroup,
}) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const moveButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ bottom: number; right: number } | null>(null);

  // Recalculate dropdown position when menu opens
  useEffect(() => {
    if (showMoveMenu && moveButtonRef.current) {
      const rect = moveButtonRef.current.getBoundingClientRect();
      setMenuPos({
        bottom: window.innerHeight - rect.top + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showMoveMenu]);

  if (selectedCount === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 animate-slide-up">
      <div className="bg-app-primary/95 backdrop-blur-md border-t border-app-primary-20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Selection info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-app-primary-color rounded-xl">
                <span className="text-lg font-bold text-app-quaternary">{selectedCount}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-app-primary">
                  wallet{selectedCount !== 1 ? "s" : ""} selected
                </span>
              </div>
              <button
                onClick={onClearSelection}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-app-secondary-60 hover:text-app-primary rounded-lg hover:bg-app-quaternary transition-colors"
              >
                <X size={14} />
                Clear
              </button>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* Move to Group */}
              {groups.length > 1 && (
                <div className="relative">
                  <button
                    ref={moveButtonRef}
                    onClick={() => setShowMoveMenu(!showMoveMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary-30 text-app-primary transition-all"
                  >
                    <FolderInput size={16} />
                    <span className="hidden sm:inline">Move</span>
                    <ChevronUp
                      size={14}
                      className={`transition-transform ${showMoveMenu ? "" : "rotate-180"}`}
                    />
                  </button>

                  {showMoveMenu &&
                    createPortal(
                      <>
                        <div
                          className="fixed inset-0 z-[9998]"
                          onClick={() => setShowMoveMenu(false)}
                        />
                        {menuPos && (
                          <div
                            className="fixed z-[9999] bg-app-primary border border-app-primary-20 rounded-xl shadow-xl py-1.5 min-w-[160px]"
                            style={{
                              bottom: menuPos.bottom,
                              right: menuPos.right,
                            }}
                          >
                            {groups.map((group) => (
                              <button
                                key={group.id}
                                onClick={() => {
                                  onMoveToGroup(group.id);
                                  setShowMoveMenu(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-app-secondary-60 hover:text-app-primary hover:bg-app-quaternary transition-colors"
                              >
                                {group.color && (
                                  <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: group.color }}
                                  />
                                )}
                                <span className="truncate">{group.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>,
                      document.body,
                    )}
                </div>
              )}

              {/* Export */}
              <button
                onClick={onExportSelected}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary-30 text-app-primary transition-all"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>

              {/* Archive/Unarchive */}
              {showArchived ? (
                <button
                  onClick={onUnarchiveSelected}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 transition-all"
                >
                  <Archive size={16} />
                  <span className="hidden sm:inline">Unarchive</span>
                </button>
              ) : (
                <button
                  onClick={onArchiveSelected}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-app-quaternary hover:bg-app-tertiary border border-app-primary-20 hover:border-app-primary-30 text-app-primary transition-all"
                >
                  <Archive size={16} />
                  <span className="hidden sm:inline">Archive</span>
                </button>
              )}

              {/* Delete */}
              <button
                onClick={onDeleteSelected}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-all"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
