import React, { useRef, useState } from "react";
import { API_URLS } from "../../utils/constants";
import {
  Sparkles,
  Image,
  Globe,
  Twitter,
  Send,
  X,
  Upload,
  RefreshCw,
  Download,
  ChevronDown,
} from "lucide-react";
import { useToast } from "../../utils/hooks";
import type { TokenMetadata } from "./types";
import type { TokenMetadataApiResponse } from "../../utils/types";

interface TokenTabProps {
  tokenData: TokenMetadata;
  setTokenData: React.Dispatch<React.SetStateAction<TokenMetadata>>;
}

export const TokenTab: React.FC<TokenTabProps> = ({ tokenData, setTokenData }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Import metadata state
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importMint, setImportMint] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const importMetadata = async (): Promise<void> => {
    const mint = importMint.trim();
    if (!mint) {
      showToast("Enter a token mint address", "error");
      return;
    }

    // Basic validation for Solana address (32-44 base58 characters)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
      showToast("Invalid mint address format", "error");
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch(`${API_URLS.RAZE_PUBLIC}/metadata/${mint}`);
      if (!response.ok) {
        throw new Error("Failed to fetch metadata");
      }
      const data = await response.json() as TokenMetadataApiResponse;

      if (!data.success || !data.metadata) {
        throw new Error("No metadata found");
      }

      const { onChain, offChain } = data.metadata;

      // Prefer offChain data if available, fall back to onChain
      const name = offChain?.name || onChain?.name || "";
      const symbol = offChain?.symbol || onChain?.symbol || "";
      const description = offChain?.description || "";
      const imageUrl = offChain?.image || onChain?.uri || "";

      setTokenData((prev) => ({
        ...prev,
        name,
        symbol,
        description,
        imageUrl,
      }));

      setImportMint("");
      setShowImportPanel(false);
      showToast(`Cloned metadata from ${symbol || mint.slice(0, 8)}...`, "success");
    } catch {
      showToast("Failed to import metadata", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/gif", "image/svg+xml"].includes(file.type)) {
      showToast("Please select a valid image (JPEG, PNG, GIF, SVG)", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2MB", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("image", file);

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText) as { url: string };
        setTokenData((prev) => ({ ...prev, imageUrl: response.url }));
        showToast("Image uploaded", "success");
      } else {
        showToast("Upload failed", "error");
      }
      setIsUploading(false);
    });
    xhr.addEventListener("error", () => {
      showToast("Upload failed", "error");
      setIsUploading(false);
    });
    xhr.open("POST", `${API_URLS.RAZE_PUBLIC}/upload`);
    xhr.send(formData);
  };

  return (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-app-primary-20">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
          <Sparkles size={18} className="color-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-app-primary font-mono">Token Details</h2>
          <p className="text-[11px] text-app-secondary-60 font-mono">Configure your token metadata</p>
        </div>
        <button
          type="button"
          onClick={() => setShowImportPanel(!showImportPanel)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-mono ${
            showImportPanel
              ? "bg-app-primary-color/10 border-app-primary-color/30 color-primary"
              : "bg-app-tertiary/50 border-app-primary-20 text-app-secondary-60 hover:border-app-primary-40"
          }`}
        >
          <Download size={14} />
          Clone
          <ChevronDown size={12} className={`transition-transform ${showImportPanel ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Import Metadata Panel */}
      {showImportPanel && (
        <div className="p-4 rounded-xl border border-app-primary-color/20 bg-gradient-to-br from-app-primary-color/5 to-transparent space-y-3 animate-fade-in-down">
          <label className="text-[10px] text-app-secondary-60 font-mono uppercase tracking-wider">
            Clone from existing token
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={importMint}
              onChange={(e) => setImportMint(e.target.value)}
              placeholder="Token mint address..."
              className="flex-1 bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary placeholder:text-app-secondary-40 focus:border-app-primary-color focus:outline-none font-mono"
              onKeyDown={(e) => e.key === "Enter" && void importMetadata()}
            />
            <button
              type="button"
              onClick={() => void importMetadata()}
              disabled={isImporting || !importMint.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                !isImporting && importMint.trim()
                  ? "bg-app-primary-color/20 border border-app-primary-color/30 color-primary hover:bg-app-primary-color/30"
                  : "bg-app-tertiary border border-app-primary-20 text-app-secondary-40 cursor-not-allowed"
              }`}
            >
              {isImporting ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {isImporting ? "Cloning..." : "Clone"}
            </button>
          </div>
          <p className="text-[10px] text-app-secondary-40 font-mono">
            Fetches name, symbol, description, and image from an existing token.
          </p>
        </div>
      )}

      {/* Name & Symbol */}
      <div>
        <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
          Basic Info
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
            <label className="flex items-center gap-2 text-[10px] text-app-secondary-40 font-mono mb-2 uppercase">
              Token Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={tokenData.name}
              onChange={(e) => setTokenData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="My Token"
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono transition-all"
            />
          </div>
          <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
            <label className="flex items-center gap-2 text-[10px] text-app-secondary-40 font-mono mb-2 uppercase">
              Symbol <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={tokenData.symbol}
              onChange={(e) => setTokenData((prev) => ({ ...prev, symbol: e.target.value }))}
              placeholder="TOKEN"
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono transition-all"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
        <label className="flex items-center gap-2 text-[10px] text-app-secondary-40 font-mono mb-2 uppercase">
          Description
        </label>
        <textarea
          value={tokenData.description}
          onChange={(e) => setTokenData((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe your token..."
          rows={3}
          className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono transition-all resize-none"
        />
      </div>

      {/* Image Upload */}
      <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
        <label className="flex items-center gap-2 text-[10px] text-app-secondary-40 font-mono mb-3 uppercase">
          <Image size={12} className="color-primary" />
          Logo Image <span className="text-red-400">*</span>
        </label>
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        <div className="flex items-center gap-3">
          {tokenData.imageUrl ? (
            <div className="relative group">
              <img src={tokenData.imageUrl} alt="Token" className="w-16 h-16 rounded-lg object-cover border-2 border-app-primary-color/50" />
              <button
                type="button"
                onClick={() => setTokenData((prev) => ({ ...prev, imageUrl: "" }))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-app-primary-30 hover:border-app-primary-color flex flex-col items-center justify-center gap-1 transition-colors bg-app-quaternary/50"
            >
              {isUploading ? (
                <RefreshCw size={16} className="color-primary animate-spin" />
              ) : (
                <Upload size={16} className="text-app-secondary-40" />
              )}
              <span className="text-[9px] text-app-secondary-40 font-mono">{isUploading ? `${uploadProgress}%` : "Upload"}</span>
            </button>
          )}
          <div className="flex-1">
            <p className="text-[10px] text-app-secondary-60 font-mono mb-0.5">Supported: JPEG, PNG, GIF, SVG</p>
            <p className="text-[10px] text-app-secondary-40 font-mono">Max size: 2MB</p>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div>
        <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
          <Globe size={12} className="color-primary" />
          Social Links
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
            <label className="flex items-center gap-1 text-[10px] text-app-secondary-40 font-mono mb-2 uppercase">
              <Twitter size={10} /> Twitter
            </label>
            <input
              type="text"
              value={tokenData.twitter}
              onChange={(e) => setTokenData((prev) => ({ ...prev, twitter: e.target.value }))}
              placeholder="https://x.com/..."
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono transition-all"
            />
          </div>
          <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
            <label className="flex items-center gap-1 text-[10px] text-app-secondary-40 font-mono mb-2 uppercase">
              <Send size={10} /> Telegram
            </label>
            <input
              type="text"
              value={tokenData.telegram}
              onChange={(e) => setTokenData((prev) => ({ ...prev, telegram: e.target.value }))}
              placeholder="https://t.me/..."
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono transition-all"
            />
          </div>
          <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
            <label className="flex items-center gap-1 text-[10px] text-app-secondary-40 font-mono mb-2 uppercase">
              <Globe size={10} /> Website
            </label>
            <input
              type="text"
              value={tokenData.website}
              onChange={(e) => setTokenData((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono transition-all"
            />
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-app-primary-color/5 to-transparent border border-app-primary-color/20">
        <div className="flex items-start gap-2">
          <Sparkles size={14} className="color-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-app-primary font-mono font-medium">Token Metadata</p>
            <p className="text-[10px] text-app-secondary-60 font-mono mt-0.5">
              Name, symbol, and logo are required for deployment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
