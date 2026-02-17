import React from "react";
import {
  Zap,
  Sparkles,
  Check,
} from "lucide-react";
import type { PlatformType } from "../../utils/create";
import { METEORA_DBC_CONFIGS, METEORA_CPAMM_CONFIGS } from "../../utils/create";
import { PlatformIcons, PLATFORMS } from "./constants";

interface PlatformTabProps {
  selectedPlatform: PlatformType;
  setSelectedPlatform: (platform: PlatformType) => void;
  pumpType: boolean;
  setPumpType: (value: boolean) => void;
  cashBack: boolean;
  setCashBack: (value: boolean) => void;
  bonkType: "meme" | "tech";
  setBonkType: (type: "meme" | "tech") => void;
  meteoraDBCConfigAddress: string;
  setMeteoraDBCConfigAddress: (address: string) => void;
  meteoraCPAMMConfigAddress: string;
  setMeteoraCPAMMConfigAddress: (address: string) => void;
  meteoraCPAMMInitialLiquidity: string;
  setMeteoraCPAMMInitialLiquidity: (value: string) => void;
  meteoraCPAMMInitialTokenPercent: string;
  setMeteoraCPAMMInitialTokenPercent: (value: string) => void;
}

export const PlatformTab: React.FC<PlatformTabProps> = ({
  selectedPlatform,
  setSelectedPlatform,
  pumpType,
  setPumpType,
  cashBack,
  setCashBack,
  bonkType,
  setBonkType,
  meteoraDBCConfigAddress,
  setMeteoraDBCConfigAddress,
  meteoraCPAMMConfigAddress,
  setMeteoraCPAMMConfigAddress,
  meteoraCPAMMInitialLiquidity,
  setMeteoraCPAMMInitialLiquidity,
  meteoraCPAMMInitialTokenPercent,
  setMeteoraCPAMMInitialTokenPercent,
}) => {
  return (
    <div className="space-y-6 animate-fade-in-down">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-app-primary-20">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-app-primary-color/20 to-app-primary-color/5 border border-app-primary-color/30 flex items-center justify-center">
          <Zap size={18} className="color-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-app-primary font-mono">Primary Platform</h2>
          <p className="text-[11px] text-app-secondary-60 font-mono">Select your deployment platform</p>
        </div>
      </div>

      {/* Platform Grid */}
      <div>
        <label className="flex items-center gap-2 text-xs text-app-secondary-60 font-mono mb-3 uppercase tracking-wider">
          Select Platform
        </label>
        <div className="grid grid-cols-2 gap-3">
          {PLATFORMS.map((p) => {
            const isSelected = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlatform(p.id)}
                className={`group relative p-4 rounded-xl border transition-all duration-300 overflow-hidden text-left ${
                  isSelected
                    ? "border-app-primary-color bg-app-primary-color/10"
                    : "border-app-primary-20 bg-app-tertiary/50 hover:border-app-primary-40"
                }`}
              >
                <div className="relative flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-app-quaternary flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 shrink-0">
                    {PlatformIcons[p.id]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold font-mono truncate ${isSelected ? "color-primary" : "text-app-primary"}`}>
                      {p.name}
                    </div>
                    <div className="text-[10px] text-app-secondary-40 font-mono">{p.desc}</div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-app-primary-color flex items-center justify-center shrink-0">
                      <Check size={14} className="text-black" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform Settings */}
      <div className="space-y-4">
        {/* Platform-Specific Settings */}
        {selectedPlatform === "pumpfun" && (
          <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
                  {PlatformIcons.pumpfun}
                </div>
                <div>
                  <p className="text-xs font-bold text-app-primary font-mono">Mayhem Mode</p>
                  <p className="text-[10px] text-app-secondary-40 font-mono">Enhanced token type</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPumpType(!pumpType)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                  pumpType ? "bg-app-primary-color" : "bg-app-quaternary border border-app-primary-30"
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${pumpType ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-app-primary-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Sparkles size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-app-primary font-mono">Cash Back</p>
                  <p className="text-[10px] text-app-secondary-40 font-mono">Reward traders</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCashBack(!cashBack)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                  cashBack ? "bg-app-primary-color" : "bg-app-quaternary border border-app-primary-30"
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${cashBack ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        )}

        {selectedPlatform === "bonk" && (
          <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
            <label className="flex items-center gap-2 text-[10px] text-app-secondary-60 font-mono mb-2 uppercase tracking-wider">
              Token Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "meme", label: "Meme", desc: "Fun & community" },
                { value: "tech", label: "Tech", desc: "Utility tokens" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBonkType(opt.value as "meme" | "tech")}
                  className={`p-2.5 rounded-lg border transition-all text-left ${
                    bonkType === opt.value
                      ? "border-app-primary-color/50 bg-app-primary-color/10"
                      : "border-app-primary-20 bg-app-tertiary/50 hover:border-app-primary-40"
                  }`}
                >
                  <div className={`text-xs font-bold font-mono ${bonkType === opt.value ? "color-primary" : "text-app-primary"}`}>
                    {opt.label}
                  </div>
                  <div className="text-[10px] font-mono text-app-secondary-40">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedPlatform === "meteoraDBC" && (
          <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
            <label className="flex items-center gap-2 text-[10px] text-app-secondary-60 font-mono mb-2 uppercase tracking-wider">
              Pool Config Address
            </label>
            <input
              type="text"
              value={meteoraDBCConfigAddress}
              onChange={(e) => setMeteoraDBCConfigAddress(e.target.value)}
              placeholder={METEORA_DBC_CONFIGS.standard}
              className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
            />
          </div>
        )}

        {selectedPlatform === "meteoraCPAMM" && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
              <label className="flex items-center gap-2 text-[10px] text-app-secondary-60 font-mono mb-2 uppercase tracking-wider">
                Pool Config Address
              </label>
              <input
                type="text"
                value={meteoraCPAMMConfigAddress}
                onChange={(e) => setMeteoraCPAMMConfigAddress(e.target.value)}
                placeholder={METEORA_CPAMM_CONFIGS.standard}
                className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
                <label className="text-[10px] text-app-secondary-40 font-mono uppercase mb-1.5 block">Initial Liquidity</label>
                <div className="relative">
                  <input
                    type="text"
                    value={meteoraCPAMMInitialLiquidity}
                    onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setMeteoraCPAMMInitialLiquidity(e.target.value)}
                    placeholder="1"
                    className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono pr-10"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-app-secondary-40 font-mono">SOL</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-app-tertiary/50 border border-app-primary-20">
                <label className="text-[10px] text-app-secondary-40 font-mono uppercase mb-1.5 block">Token % for Pool</label>
                <div className="relative">
                  <input
                    type="text"
                    value={meteoraCPAMMInitialTokenPercent}
                    onChange={(e) => {
                      if (/^\d*\.?\d*$/.test(e.target.value)) {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val) || (val >= 0 && val <= 100)) setMeteoraCPAMMInitialTokenPercent(e.target.value);
                      }
                    }}
                    placeholder="80"
                    className="w-full bg-app-quaternary border border-app-primary-30 rounded-lg px-3 py-2 text-xs text-app-primary focus:border-app-primary-color focus:outline-none font-mono pr-8"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-app-secondary-40 font-mono">%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-app-primary-color/5 to-transparent border border-app-primary-color/20">
        <div className="flex items-start gap-2">
          <Sparkles size={14} className="color-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-app-primary font-mono font-medium">
              {PLATFORMS.find((p) => p.id === selectedPlatform)?.name} Selected
            </p>
            <p className="text-[10px] text-app-secondary-60 font-mono mt-0.5">
              Configure settings above. Add deploys in the Deploys tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
