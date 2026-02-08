import React from "react";
import { Archive, Key, Wallet, Layers } from "lucide-react";

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
}

interface TabConfig {
  id: FilterTab;
  label: string;
  icon: React.ReactNode;
  color?: string;
}

const tabs: TabConfig[] = [
  { id: "all", label: "All", icon: <Layers size={14} /> },
  { id: "hd", label: "HD", icon: <Wallet size={14} /> },
  { id: "imported", label: "Imported", icon: <Key size={14} /> },
  { id: "archived", label: "Archived", icon: <Archive size={14} />, color: "orange" },
];

export const FilterTabs: React.FC<FilterTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
}) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-app-quaternary/50 rounded-xl border border-app-primary-15">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = counts[tab.id];
        const isArchived = tab.id === "archived";

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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
