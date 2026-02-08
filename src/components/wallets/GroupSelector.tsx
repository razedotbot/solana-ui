import React, { useState, useRef, useEffect } from "react";
import { Layers } from "lucide-react";
import type { WalletGroup } from "../../utils/types";

interface GroupSelectorProps {
  groups: WalletGroup[];
  activeGroupId: string;
  onGroupChange: (groupId: string) => void;
  showAllOption?: boolean;
}

export const GroupSelector: React.FC<GroupSelectorProps> = ({
  groups,
  activeGroupId,
  onGroupChange,
  showAllOption = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  const activeGroup = activeGroupId === "all"
    ? null
    : groups.find((g) => g.id === activeGroupId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center px-2 py-1.5 bg-transparent border border-app-primary-20 hover:border-primary-60 rounded transition-all duration-300"
        title={activeGroupId === "all" ? "All Groups" : activeGroup?.name || "All Groups"}
      >
        <Layers size={14} className="color-primary" />
        {/* Color indicator dot for active group */}
        {activeGroup?.color && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-app-primary-99"
            style={{ backgroundColor: activeGroup.color }}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-app-tertiary border border-app-primary-20 rounded-lg shadow-xl py-1 min-w-[150px]">
          {showAllOption && (
            <button
              onClick={() => {
                onGroupChange("all");
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
                activeGroupId === "all"
                  ? "text-app-primary bg-primary-08"
                  : "text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-10"
              }`}
            >
              <Layers size={12} />
              All Groups
            </button>
          )}
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => {
                onGroupChange(group.id);
                setIsOpen(false);
              }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
                activeGroupId === group.id
                  ? "text-app-primary bg-primary-08"
                  : "text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-10"
              }`}
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
    </div>
  );
};
