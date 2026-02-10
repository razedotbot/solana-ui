import type { PresetTab } from "../../utils/types";

// Default preset tabs shared by TradingForm and FloatingTradingCard
export const defaultPresetTabs: PresetTab[] = [
  {
    id: "degen",
    label: "DEGEN",
    buyPresets: ["0.01", "0.05", "0.1", "0.5"],
    sellPresets: ["25", "50", "75", "100"],
  },
  {
    id: "diamond",
    label: "DIAMOND",
    buyPresets: ["0.001", "0.01", "0.05", "0.1"],
    sellPresets: ["10", "25", "50", "75"],
  },
  {
    id: "yolo",
    label: "YOLO",
    buyPresets: ["0.1", "0.5", "1", "5"],
    sellPresets: ["50", "75", "90", "100"],
  },
];

// Load presets from cookies
export const loadPresetsFromCookies = (): {
  tabs: PresetTab[];
  activeTabId: string;
} => {
  try {
    const savedPresets = document.cookie
      .split("; ")
      .find((row) => row.startsWith("tradingPresets="))
      ?.split("=")[1];

    if (savedPresets) {
      const decoded = decodeURIComponent(savedPresets);
      const parsed = JSON.parse(decoded) as {
        tabs?: unknown;
        activeTabId?: string;
      };
      return {
        tabs: Array.isArray(parsed.tabs)
          ? (parsed.tabs as PresetTab[])
          : defaultPresetTabs,
        activeTabId:
          typeof parsed.activeTabId === "string"
            ? parsed.activeTabId
            : "degen",
      };
    }
  } catch {
    // Invalid JSON, use defaults
  }
  return {
    tabs: defaultPresetTabs,
    activeTabId: "degen",
  };
};

// Save presets to cookies
export const savePresetsToCookies = (
  tabs: PresetTab[],
  activeTabId: string,
): void => {
  try {
    const presetsData = {
      tabs,
      activeTabId,
    };
    const encoded = encodeURIComponent(JSON.stringify(presetsData));
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1); // 1 year expiry
    document.cookie = `tradingPresets=${encoded}; expires=${expires.toUTCString()}; path=/`;
  } catch {
    // Cookie save error, ignore
  }
};
