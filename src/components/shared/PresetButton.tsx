import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

export interface PresetButtonProps {
  value: string;
  onExecute: (amount: string) => void;
  onChange: (newValue: string) => void;
  isLoading: boolean;
  variant?: "buy" | "sell";
  isEditMode: boolean;
  index?: number;
  isMobile?: boolean;
}

// Shared Preset Button component used by TradingForm and FloatingTradingCard
const PresetButton = React.memo<PresetButtonProps>(
  ({ value, onExecute, onChange, isLoading, variant = "buy", isEditMode, isMobile = false }) => {
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      setEditValue(value);
    }, [value]);

    useEffect(() => {
      if (isEditMode && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isEditMode]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") {
        const newValue = parseFloat(editValue);
        if (!isNaN(newValue) && newValue > 0) {
          onChange(newValue.toString());
        }
      } else if (e.key === "Escape") {
        setEditValue(value);
      }
    };

    const handleBlur = (): void => {
      const newValue = parseFloat(editValue);
      if (!isNaN(newValue) && newValue > 0) {
        onChange(newValue.toString());
      } else {
        setEditValue(value);
      }
    };

    if (isEditMode) {
      return (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) =>
              setEditValue(e.target.value.replace(/[^0-9.]/g, ""))
            }
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full h-8 px-2 text-xs font-mono rounded border text-center
                   bg-app-primary text-app-primary border-app-primary-color
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
          />
        </div>
      );
    }

    return (
      <button
        onClick={() => onExecute(value)}
        disabled={isLoading}
        className={`relative group ${
          isMobile
            ? "px-3 py-3 md:px-2 md:py-1.5 text-sm md:text-xs"
            : "px-2 py-1.5 text-xs"
        } font-mono rounded border transition-all duration-200
                min-w-[48px] ${
                  isMobile
                    ? "min-h-[48px] md:min-h-[32px] h-auto md:h-8"
                    : "h-8"
                } flex items-center justify-center
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  variant === "buy"
                    ? "bg-app-primary-60 border-app-primary-40 color-primary hover-bg-primary-20 hover-border-primary"
                    : "bg-app-primary-60 border-error-alt-40 text-error-alt hover-bg-error-30 hover-border-error-alt"
                }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" />
            <span>{value}</span>
          </div>
        ) : (
          value
        )}
      </button>
    );
  },
);
PresetButton.displayName = "PresetButton";

export default PresetButton;
