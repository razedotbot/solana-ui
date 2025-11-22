import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BarChart2, X } from 'lucide-react';
import { getWallets } from '../Utils';
import PnlCard from '../components/PnlCard';
import type { IframeData } from '../types/api';

interface BasePnlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PnlModalProps extends BasePnlModalProps {
  handleRefresh: () => void;
  tokenAddress: string;
  iframeData: IframeData | null;
  tokenBalances: Map<string, number>;
}

export const PnlModal: React.FC<PnlModalProps> = ({
  isOpen,
  onClose,
  tokenAddress,
  iframeData,
  tokenBalances
}) => {
  const wallets = getWallets();

  // Calculate PNL using the same formula as DataBox
  const pnlData = useMemo(() => {
    if (!iframeData || !iframeData.tradingStats) {
      return {
        totalPnl: 0,
        bought: 0,
        sold: 0,
        holdingsValue: 0,
        totalWallets: wallets.length,
        trades: 0
      };
    }

    const { tradingStats, tokenPrice } = iframeData;
    
    // Calculate holdings value (same as DataBox)
    const totalTokens = Array.from(tokenBalances.values()).reduce((sum, balance) => sum + balance, 0);
    const currentTokenPrice = tokenPrice?.tokenPrice || 0;
    const holdingsValue = totalTokens * currentTokenPrice;
    
    // Calculate total PNL (same as DataBox: tradingStats.net + holdingsValue)
    const totalPnl = tradingStats.net + holdingsValue;

    return {
      totalPnl,
      bought: tradingStats.bought,
      sold: tradingStats.sold,
      holdingsValue,
      totalWallets: wallets.length,
      trades: tradingStats.trades || 0
    };
  }, [iframeData, tokenBalances, wallets.length]);

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // Animation keyframes for  elements
  const modalStyleElement = document.createElement('style');
  modalStyleElement.textContent = `
    @keyframes modal-pulse {
      0% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
      50% { box-shadow: 0 0 15px var(--color-primary-80), 0 0 25px var(--color-primary-40); }
      100% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
    }
    
    @keyframes modal-fade-in {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    
    @keyframes modal-slide-up {
      0% { transform: translateY(20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes modal-scan-line {
      0% { transform: translateY(-100%); opacity: 0.3; }
      100% { transform: translateY(100%); opacity: 0; }
    }
    
    .modal-content {
      position: relative;
    }
    
    .modal-input-:focus {
      box-shadow: 0 0 0 1px var(--color-primary-70), 0 0 15px var(--color-primary-50);
      transition: all 0.3s ease;
    }
    
    .modal-btn- {
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .modal-btn-::after {
      content: "";
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(
        to bottom right,
        var(--color-primary-05) 0%,
        var(--color-primary-30) 50%,
        var(--color-primary-05) 100%
      );
      transform: rotate(45deg);
      transition: all 0.5s ease;
      opacity: 0;
    }
    
    .modal-btn-:hover::after {
      opacity: 1;
      transform: rotate(45deg) translate(50%, 50%);
    }
    
    .modal-btn-:active {
      transform: scale(0.95);
    }
    
    .progress-bar- {
      position: relative;
      overflow: hidden;
    }
    
    .progress-bar-::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        var(--color-primary-70) 50%,
        transparent 100%
      );
      width: 100%;
      height: 100%;
      transform: translateX(-100%);
      animation: progress-shine 3s infinite;
    }
    
    @keyframes progress-shine {
      0% { transform: translateX(-100%); }
      20% { transform: translateX(100%); }
      100% { transform: translateX(100%); }
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

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .grid-cols-responsive {
        grid-template-columns: 1fr;
      }
      
      .flex-responsive {
        flex-direction: column;
      }
      
      .w-responsive {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(modalStyleElement);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-app-primary-85">
      <div className="relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full max-w-2xl mx-4 overflow-hidden transform modal-content">
        {/* Ambient grid background */}
        <div className="absolute inset-0 z-0 opacity-10 bg-grid">
        </div>

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
              <BarChart2 size={16} className="color-primary" />
            </div>
            <h2 className="text-lg font-semibold text-app-primary font-mono">
              <span className="color-primary">/</span> TOKEN PNL CALCULATOR <span className="color-primary">/</span>
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-app-secondary hover-color-primary-light transition-colors p-1 hover:bg-primary-20 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 p-5 space-y-5 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#02b36d40] scrollbar-track-app-tertiary">
          <div className="space-y-5 animate-[fadeIn_0.3s_ease]">
           
            {/* Token Information */}
            <div className="bg-app-tertiary rounded-lg p-4 border border-app-primary-30">
              <div className="flex justify-between items-center">
                <span className="text-sm text-app-secondary font-mono">TOKEN ADDRESS:</span>
                <span className="text-sm font-mono text-app-primary glitch-text">
                  {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                </span>
              </div>
            </div>
            
            {/* PNL Card */}
            <div className="bg-app-tertiary rounded-lg border border-app-primary-30 p-4">
              <PnlCard 
                totalPnl={pnlData.totalPnl}
                bought={pnlData.bought}
                sold={pnlData.sold}
                holdingsValue={pnlData.holdingsValue}
                totalWallets={pnlData.totalWallets}
                trades={pnlData.trades}
                tokenAddress={tokenAddress}
                backgroundImageUrl="https://i.ibb.co/tpzsPFdS/imgPnl.jpg"
              />
            </div>
          </div>
  
        </div>
        
</div>
    </div>,
    document.body
  );
};