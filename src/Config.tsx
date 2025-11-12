import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Server, CreditCard } from 'lucide-react';
import { ConfigType } from './Utils';

interface ConfigProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfigType;
  onConfigChange: (key: keyof ConfigType, value: string) => void;
  onSave: () => void;
}

const Config: React.FC<ConfigProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
  onSave
}) => {
  // Add cyberpunk styles when the modal is opened
  useEffect(() => {
    if (isOpen) {
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        @keyframes config-pulse {
          0% { box-shadow: 0 0 5px rgba(2, 179, 109, 0.5), 0 0 15px rgba(2, 179, 109, 0.2); }
          50% { box-shadow: 0 0 15px rgba(2, 179, 109, 0.8), 0 0 25px rgba(2, 179, 109, 0.4); }
          100% { box-shadow: 0 0 5px rgba(2, 179, 109, 0.5), 0 0 15px rgba(2, 179, 109, 0.2); }
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
        
        .config-cyberpunk-container {
          animation: config-fade-in 0.3s ease;
        }
        
        .config-cyberpunk-content {
          animation: config-slide-up 0.4s ease;
          position: relative;
        }
        
        .config-cyberpunk-content::before {
          content: "";
          position: absolute;
          width: 100%;
          height: 5px;
          background: linear-gradient(to bottom, 
            transparent 0%,
            rgba(2, 179, 109, 0.2) 50%,
            transparent 100%);
          z-index: 10;
          animation: config-scan-line 8s linear infinite;
          pointer-events: none;
        }
        
        .config-glow {
          animation: config-pulse 4s infinite;
        }
        
        .config-input-cyberpunk:focus {
          box-shadow: 0 0 0 1px rgba(2, 179, 109, 0.7), 0 0 15px rgba(2, 179, 109, 0.5);
          transition: all 0.3s ease;
        }
        
        .config-btn-cyberpunk {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .config-btn-cyberpunk::after {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            to bottom right,
            rgba(2, 179, 109, 0) 0%,
            rgba(2, 179, 109, 0.3) 50%,
            rgba(2, 179, 109, 0) 100%
          );
          transform: rotate(45deg);
          transition: all 0.5s ease;
          opacity: 0;
        }
        
        .config-btn-cyberpunk:hover::after {
          opacity: 1;
          transform: rotate(45deg) translate(50%, 50%);
        }
        
        .config-btn-cyberpunk:active {
          transform: scale(0.95);
        }
        
        .glitch-text:hover {
          text-shadow: 0 0 2px #02b36d, 0 0 4px #02b36d;
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
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.head.removeChild(styleElement);
        // Restore scrolling when modal is closed
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center backdrop-blur-sm config-cyberpunk-container" 
      style={{
        backgroundColor: 'rgba(5, 10, 14, 0.85)',
        zIndex: 9999, // Extremely high z-index to ensure it's on top
      }}
    >
      <div 
        className="relative bg-[#050a0e] border border-[#02b36d40] rounded-lg shadow-lg w-full max-w-md overflow-hidden transform config-cyberpunk-content config-glow"
        style={{ zIndex: 10000 }} // Even higher z-index for the modal content
      >
        {/* Ambient grid background */}
        <div 
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(2, 179, 109, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(2, 179, 109, 0.2) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            backgroundPosition: 'center center',
          }}
        >
        </div>

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-[#02b36d40]">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#02b36d20] mr-3">
              <Settings size={16} className="text-[#02b36d]" />
            </div>
            <h2 className="text-lg font-semibold text-[#e4fbf2] font-mono">
              <span className="text-[#02b36d]">/</span> SYSTEM CONFIG <span className="text-[#02b36d]">/</span>
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-[#7ddfbd] hover:text-[#02b36d] transition-colors p-1 hover:bg-[#02b36d20] rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 p-5 space-y-5">
          <div className="group animate-[fadeIn_0.3s_ease]">
            <div className="flex items-center gap-1 mb-2">
              <label className="text-sm font-medium text-[#7ddfbd] group-hover:text-[#02b36d] transition-colors duration-200 font-mono uppercase tracking-wider">
                <span className="text-[#02b36d]">&#62;</span> RPC Endpoint URL <span className="text-[#02b36d]">&#60;</span>
              </label>
              <Server size={14} className="text-[#7ddfbd]" />
            </div>
            <div className="relative">
              <input
                type="text"
                value={config.rpcEndpoint}
                onChange={(e) => onConfigChange('rpcEndpoint', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#091217] border border-[#02b36d30] rounded-lg text-[#e4fbf2] shadow-inner focus:border-[#02b36d] focus:ring-1 focus:ring-[#02b36d50] focus:outline-none transition-all duration-200 config-input-cyberpunk font-mono tracking-wider"
                placeholder="ENTER RPC ENDPOINT URL"
              />
              <div className="absolute inset-0 rounded-lg pointer-events-none border border-transparent group-hover:border-[#02b36d30] transition-all duration-300"></div>
            </div>
          </div>
          
          <div className="group animate-[fadeIn_0.4s_ease]">
            <div className="flex items-center gap-1 mb-2">
              <label className="text-sm font-medium text-[#7ddfbd] group-hover:text-[#02b36d] transition-colors duration-200 font-mono uppercase tracking-wider">
                <span className="text-[#02b36d]">&#62;</span> Transaction Fee (SOL) <span className="text-[#02b36d]">&#60;</span>
              </label>
              <CreditCard size={14} className="text-[#7ddfbd]" />
            </div>
            <div className="relative">
              <input
                type="number"
                value={config.transactionFee}
                onChange={(e) => onConfigChange('transactionFee', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#091217] border border-[#02b36d30] rounded-lg text-[#e4fbf2] shadow-inner focus:border-[#02b36d] focus:ring-1 focus:ring-[#02b36d50] focus:outline-none transition-all duration-200 config-input-cyberpunk font-mono tracking-wider"
                step="0.000001"
                min="0"
                placeholder="ENTER TRANSACTION FEE"
              />
              <div className="absolute inset-0 rounded-lg pointer-events-none border border-transparent group-hover:border-[#02b36d30] transition-all duration-300"></div>
            </div>
          </div>
          
          <div className="pt-4 animate-[fadeIn_0.5s_ease]">
            <button
              onClick={onSave}
              className="w-full px-5 py-3 bg-[#02b36d] text-[#050a0e] rounded-lg shadow-lg transition-all duration-300 font-mono tracking-wider font-medium transform hover:-translate-y-0.5 hover:bg-[#01a35f] config-btn-cyberpunk"
            >
              SAVE CONFIGURATION
            </button>
          </div>
        </div>
        
        {/* Cyberpunk decorative corner elements */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#02b36d] opacity-70"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#02b36d] opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#02b36d] opacity-70"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#02b36d] opacity-70"></div>
      </div>
    </div>,
    document.body
  );
};

export default Config;