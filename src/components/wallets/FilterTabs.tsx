import React, { useState, useRef, useEffect } from "react";
import {
  Archive,
  Key,
  Wallet,
  Layers,
  ChevronDown,
  Plus,
  Edit3,
  Palette,
  Trash2,
  Check,
  X,
} from "lucide-react";
import type { WalletGroup } from "../../utils/types";
import { DEFAULT_GROUP_ID } from "../../utils/types";

export type FilterTab = "all" | "hd" | "imported" | "archived";

export interface FilterTabsProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  counts: {
    all: number;
    hd: number;
    imported: number;
    archived: number;
  };
  groups: WalletGroup[];
  activeGroupId: string;
  onGroupChange: (groupId: string) => void;
  walletCounts: Map<string, number>;
  onCreateGroup: (name: string, color?: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateGroupColor: (groupId: string, color: string) => void;
}

const groupColors = [
  "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

const tabConfigs: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All", icon: <Layers size={14} /> },
  { id: "hd", label: "HD", icon: <Wallet size={14} /> },
  { id: "imported", label: "Imported", icon: <Key size={14} /> },
  { id: "archived", label: "Archived", icon: <Archive size={14} /> },
];

export const FilterTabs: React.FC<FilterTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
  groups,
  activeGroupId,
  onGroupChange,
  walletCounts,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onUpdateGroupColor,
}) => {
  const [showGroupsDropdown, setShowGroupsDropdown] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [colorPickerGroupId, setColorPickerGroupId] = useState<string | null>(null);
  const allTabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (allTabRef.current && !allTabRef.current.contains(event.target as Node)) {
        setShowGroupsDropdown(false);
        setIsAddingGroup(false);
        setEditingGroupId(null);
        setColorPickerGroupId(null);
      }
    };
    if (showGroupsDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return;
  }, [showGroupsDropdown]);

  const handleAddGroup = (): void => {
    const name = newGroupName.trim();
    if (!name) return;
    onCreateGroup(name);
    setNewGroupName("");
    setIsAddingGroup(false);
  };

  const handleRenameGroup = (groupId: string): void => {
    const name = editGroupName.trim();
    if (!name) return;
    onRenameGroup(groupId, name);
    setEditingGroupId(null);
    setEditGroupName("");
  };

  const activeGroup = activeGroupId !== "all" ? groups.find((g) => g.id === activeGroupId) : null;
  const totalWallets = groups.reduce((sum, g) => sum + (walletCounts.get(g.id) || 0), 0);

  return (
    <div className="relative flex items-center gap-1 p-1 bg-app-quaternary/50 rounded-xl border border-app-primary-15">
      {tabConfigs.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = counts[tab.id];
        const isArchived = tab.id === "archived";
        const isAllTab = tab.id === "all";

        if (isAllTab) {
          return (
            <div key={tab.id} className="relative" ref={allTabRef}>
              <button
                onClick={() => {
                  if (activeTab !== "all") {
                    onTabChange("all");
                  }
                  setShowGroupsDropdown(!showGroupsDropdown);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-app-primary-color text-app-quaternary shadow-sm"
                      : "text-app-secondary-60 hover:text-app-primary hover:bg-app-quaternary"
                  }
                `}
              >
                {activeGroup?.color ? (
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeGroup.color }}
                  />
                ) : (
                  tab.icon
                )}
                <span>{activeGroup ? activeGroup.name : tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-app-primary-15 text-app-secondary-40"
                  }`}
                >
                  {count}
                </span>
                <ChevronDown
                  size={10}
                  className={`transition-transform ${showGroupsDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {/* Groups Dropdown */}
              {showGroupsDropdown && (
                <div className="absolute left-0 top-full mt-2 z-50 bg-app-primary border border-app-primary-40 rounded-xl shadow-2xl shadow-black/80 min-w-[220px] overflow-hidden">
                  {/* All Wallets option */}
                  <button
                    onClick={() => {
                      onGroupChange("all");
                      setShowGroupsDropdown(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors ${
                      activeGroupId === "all"
                        ? "bg-app-primary-color/10 text-app-primary"
                        : "text-app-secondary-60 hover:text-app-primary hover:bg-app-quaternary"
                    }`}
                  >
                    <Layers size={14} />
                    <span className="flex-1 text-left text-sm font-medium">All Wallets</span>
                    <span className="text-xs font-mono text-app-secondary-40">{totalWallets}</span>
                  </button>

                  <div className="h-px bg-app-primary-15 mx-2" />

                  {/* Group list */}
                  <div className="py-1 max-h-[40vh] overflow-y-auto">
                    {groups.map((group) => {
                      const groupCount = walletCounts.get(group.id) || 0;
                      const isGroupActive = activeGroupId === group.id;
                      const isDefault = group.id === DEFAULT_GROUP_ID;

                      if (editingGroupId === group.id) {
                        return (
                          <div key={group.id} className="px-3 py-2">
                            <input
                              type="text"
                              value={editGroupName}
                              onChange={(e) => setEditGroupName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameGroup(group.id);
                                if (e.key === "Escape") {
                                  setEditingGroupId(null);
                                  setEditGroupName("");
                                }
                              }}
                              autoFocus
                              className="w-full bg-app-tertiary border border-app-primary-30 rounded px-2 py-1 text-sm text-app-primary focus:outline-none focus:border-app-primary"
                            />
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={() => handleRenameGroup(group.id)}
                                className="p-1 rounded hover:bg-emerald-500/20"
                              >
                                <Check size={12} className="text-emerald-400" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingGroupId(null);
                                  setEditGroupName("");
                                }}
                                className="p-1 rounded hover:bg-rose-500/20"
                              >
                                <X size={12} className="text-rose-400" />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={group.id} className="relative group/item">
                          <button
                            onClick={() => {
                              onGroupChange(group.id);
                              setShowGroupsDropdown(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${
                              isGroupActive
                                ? "bg-app-primary-color/10 text-app-primary"
                                : "text-app-secondary-60 hover:text-app-primary hover:bg-app-quaternary"
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: group.color || "#666" }}
                            />
                            <span className="flex-1 text-left text-sm font-medium truncate">
                              {group.name}
                            </span>
                            <span className="text-xs font-mono text-app-secondary-40">
                              {groupCount}
                            </span>

                            {/* Actions on hover */}
                            <div className="hidden group-hover/item:flex items-center gap-0.5 ml-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setColorPickerGroupId(
                                    colorPickerGroupId === group.id ? null : group.id
                                  );
                                }}
                                className="p-1 rounded hover:bg-app-quaternary"
                              >
                                <Palette size={11} className="text-app-secondary-40" />
                              </button>
                              {!isDefault && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingGroupId(group.id);
                                      setEditGroupName(group.name);
                                      setColorPickerGroupId(null);
                                    }}
                                    className="p-1 rounded hover:bg-app-quaternary"
                                  >
                                    <Edit3 size={11} className="text-app-secondary-40" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteGroup(group.id);
                                    }}
                                    className="p-1 rounded hover:bg-rose-500/10"
                                  >
                                    <Trash2 size={11} className="text-rose-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          </button>

                          {/* Color picker */}
                          {colorPickerGroupId === group.id && (
                            <div className="px-3 py-2 bg-app-quaternary/50">
                              <div className="grid grid-cols-8 gap-1">
                                {groupColors.map((color) => (
                                  <button
                                    key={color}
                                    onClick={() => {
                                      onUpdateGroupColor(group.id, color);
                                      setColorPickerGroupId(null);
                                    }}
                                    className={`w-5 h-5 rounded-md transition-transform hover:scale-110 ${
                                      group.color === color
                                        ? "ring-2 ring-white ring-offset-1 ring-offset-app-primary"
                                        : ""
                                    }`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="h-px bg-app-primary-15 mx-2" />

                  {/* Add group */}
                  {isAddingGroup ? (
                    <div className="p-3">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddGroup();
                          if (e.key === "Escape") {
                            setIsAddingGroup(false);
                            setNewGroupName("");
                          }
                        }}
                        placeholder="Group name..."
                        autoFocus
                        className="w-full bg-app-tertiary border border-app-primary-30 rounded px-2 py-1.5 text-sm text-app-primary placeholder:text-app-secondary-40 focus:outline-none focus:border-app-primary"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleAddGroup}
                          className="flex-1 px-2 py-1 text-xs font-semibold rounded bg-app-primary-color text-app-quaternary"
                        >
                          Create
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingGroup(false);
                            setNewGroupName("");
                          }}
                          className="px-2 py-1 text-xs rounded bg-app-quaternary text-app-secondary-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingGroup(true)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-app-secondary-60 hover:text-app-primary hover:bg-app-quaternary transition-colors"
                    >
                      <Plus size={14} />
                      <span className="text-sm">Add Group</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => {
              onTabChange(tab.id);
              setShowGroupsDropdown(false);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${
                isActive
                  ? isArchived
                    ? "bg-orange-500/20 text-orange-400 shadow-sm"
                    : "bg-app-primary-color text-app-quaternary shadow-sm"
                  : "text-app-secondary-60 hover:text-app-primary hover:bg-app-quaternary"
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isActive
                  ? isArchived
                    ? "bg-orange-500/30 text-orange-300"
                    : "bg-white/20 text-white"
                  : "bg-app-primary-15 text-app-secondary-40"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
