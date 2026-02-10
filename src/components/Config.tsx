import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Settings, CreditCard, BookOpen } from "lucide-react";
import type { ConfigType } from "../utils/types";
import { RPCEndpointManager } from "./RPCEndpointManager";
import { createDefaultEndpoints, type RPCEndpoint } from "../utils/rpcManager";

interface ConfigProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfigType;
  onConfigChange: (key: keyof ConfigType, value: string) => void;
  onSave: () => void;
  onShowTutorial?: () => void;
}

const Config: React.FC<ConfigProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
  onSave,
  onShowTutorial,
}) => {
  // Add  styles when the modal is opened
  useEffect(() => {
    if (isOpen) {
      const styleElement = document.createElement("style");
      styleElement.textContent = `
        @keyframes config-pulse {
          0% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
          50% { box-shadow: 0 0 15px var(--color-primary-80), 0 0 25px var(--color-primary-40); }
          100% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
        }

        @keyframes config-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes config-slide-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes config-scan-line {
          0% { transform: translateY(-100%); opacity: 0.3; }
          100% { transform: translateY(100%); opacity: 0; }
        }

        .config-container {
          animation: config-fade-in 0.3s ease;
        }

        .config-content {
          animation: config-slide-up 0.4s ease;
          position: relative;
        }

        .config-content::before {
          content: "";
          position: absolute;
          width: 100%;
          height: 5px;
          background: linear-gradient(to bottom,
            transparent 0%,
            var(--color-primary-20) 50%,
            transparent 100%);
          z-index: 10;
          animation: config-scan-line 8s linear infinite;
          pointer-events: none;
        }

        .config-glow {
          animation: config-pulse 4s infinite;
        }

        .config-input-:focus {
          box-shadow: 0 0 0 1px var(--color-primary-70), 0 0 15px var(--color-primary-50);
          transition: all 0.3s ease;
        }

        .config-btn- {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .config-btn-::after {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            to bottom right,
            transparent 0%,
            var(--color-primary-30) 50%,
            transparent 100%
          );
          transform: rotate(45deg);
          transition: all 0.5s ease;
          opacity: 0;
        }

        .config-btn-:hover::after {
          opacity: 1;
          transform: rotate(45deg) translate(50%, 50%);
        }

        .config-btn-:active {
          transform: scale(0.95);
        }

        .glitch-text:hover {
          text-shadow: 0 0 2px var(--color-primary), 0 0 4px var(--color-primary);
          animation: glitch 2s infinite;
        }

        @keyframes glitch {
          2%, 8% { transform: translate(-2px, 0) skew(0.3deg); }
          4%, 6% { transform: translate(2px, 0) skew(-0.3deg); }
          62%, 68% { transform: translate(0, 0) skew(0.33deg); }
          64%, 66% { transform: translate(0, 0) skew(-0.33deg); }
        }
      `;
      document.head.appendChild(styleElement);

      // Add a class to the body to prevent scrolling when modal is open
      document.body.style.overflow = "hidden";

      return () => {
        // Safely remove style element if it's still a child
        if (styleElement.parentNode === document.head) {
          document.head.removeChild(styleElement);
        }
        // Restore scrolling when modal is closed
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center backdrop-blur-sm config-container"
      style={{
        backgroundColor: "rgba(5, 10, 14, 0.85)",
        zIndex: 9999, // Extremely high z-index to ensure it's on top
      }}
    >
      <div
        className="relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-md overflow-hidden transform config-content config-glow"
        style={{ zIndex: 10000 }} // Even higher z-index for the modal content
      >
        {/* Ambient grid background */}
        <div
          className="absolute inset-0 z-0 opacity-10 bg-cyberpunk-grid"
        ></div>

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
              <Settings size={16} className="color-primary" />
            </div>
            <h2 className="text-lg font-semibold text-app-primary font-mono">
              <span className="color-primary">/</span> SYSTEM CONFIG{" "}
              <span className="color-primary">/</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-app-secondary hover:text-[color:var(--color-primary)] transition-colors p-1 hover:bg-[var(--color-primary-20)] rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="group animate-[fadeIn_0.3s_ease]">
            <RPCEndpointManager
              endpoints={
                config.rpcEndpoints
                  ? (JSON.parse(config.rpcEndpoints) as RPCEndpoint[])
                  : createDefaultEndpoints()
              }
              onChange={(endpoints) => {
                onConfigChange("rpcEndpoints", JSON.stringify(endpoints));
              }}
            />
          </div>

          <div className="group animate-[fadeIn_0.4s_ease]">
            <div className="flex items-center gap-1 mb-2">
              <label className="text-sm font-medium text-app-secondary group-hover:text-[color:var(--color-primary)] transition-colors duration-200 font-mono uppercase tracking-wider">
                <span className="color-primary">&#62;</span> Transaction Fee
                (SOL) <span className="color-primary">&#60;</span>
              </label>
              <CreditCard size={14} className="text-app-secondary" />
            </div>
            <div className="relative">
              <input
                type="number"
                value={config.transactionFee}
                onChange={(e) =>
                  onConfigChange("transactionFee", e.target.value)
                }
                className="w-full px-4 py-2.5 bg-app-tertiary border border-app-primary-30 rounded-lg text-app-primary shadow-inner focus-border-primary focus:ring-1 focus:ring-primary-50 focus:outline-none transition-all duration-200 config-input- font-mono tracking-wider"
                step="0.000001"
                min="0"
                placeholder="ENTER TRANSACTION FEE"
              />
              <div className="absolute inset-0 rounded-lg pointer-events-none border border-transparent group-hover:border-[var(--color-primary-30)] transition-all duration-300"></div>
            </div>
          </div>

          {onShowTutorial && (
            <div className="group animate-[fadeIn_0.45s_ease]">
              <button
                onClick={() => {
                  onClose();
                  onShowTutorial();
                }}
                className="w-full px-5 py-2.5 bg-app-tertiary border border-app-primary-30 text-app-secondary rounded-lg transition-all duration-300 font-mono tracking-wider font-medium hover-border-primary hover:text-[color:var(--color-primary)] flex items-center justify-center gap-2"
              >
                <BookOpen size={16} />
                RESTART TUTORIAL
              </button>
            </div>
          )}

          <div className="pt-4 animate-[fadeIn_0.5s_ease]">
            <button
              onClick={onSave}
              className="w-full px-5 py-3 bg-app-primary-color text-app-primary rounded-lg shadow-lg transition-all duration-300 font-mono tracking-wider font-medium transform hover:-translate-y-0.5 hover:bg-[var(--color-primary-dark)] config-btn-"
            >
              SAVE CONFIGURATION
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default Config;
