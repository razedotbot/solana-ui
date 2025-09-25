import React, { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import logoImage from './logo.png';
import { brand } from './config/brandConfig';

// Define proper types
interface PnlDataItem {
  profit: number;
  timestamp: string;
}

interface PnlCardProps {
  pnlData: Record<string, PnlDataItem | undefined>;
  tokenAddress: string;
  backgroundImageUrl?: string;
}

const PnlCard: React.FC<PnlCardProps> = ({ 
  pnlData,
}) => {
  const cardRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Calculate summary statistics from PNL data
  const calculateSummary = () => {
    if (!pnlData || Object.keys(pnlData).length === 0) {
      return {
        totalProfit: 0,
        profitableWallets: 0,
        unprofitableWallets: 0,
        totalWallets: 0,
        bestProfit: 0,
        worstProfit: 0
      };
    }

    let totalProfit = 0;
    let bestProfit = -Infinity;
    let worstProfit = Infinity;

    Object.values(pnlData).forEach(data => {
      if (data && typeof data.profit === 'number') {
        totalProfit += data.profit;
        
        if (data.profit > bestProfit) {
          bestProfit = data.profit;
        }
        
        if (data.profit < worstProfit) {
          worstProfit = data.profit;
        }
      }
    });

    return {
      totalProfit,
      profitableWallets: Object.values(pnlData).filter(data => data && typeof data.profit === 'number' && data.profit > 0).length,
      unprofitableWallets: Object.values(pnlData).filter(data => data && typeof data.profit === 'number' && data.profit < 0).length,
      totalWallets: Object.keys(pnlData).length,
      bestProfit: bestProfit !== -Infinity ? bestProfit : 0,
      worstProfit: worstProfit !== Infinity ? worstProfit : 0
    };
  };

  const summary = calculateSummary();

  // Format currency
  const formatAmount = (amount) => {
    if (amount > 0) return `+${amount.toFixed(5)}`;
    return amount.toFixed(5);
  };

  // Download the card as image
  const downloadAsImage = async () => {
    setIsDownloading(true);
    
    try {
      // Dynamically import html2canvas - not included by default but shows the concept
      const html2canvas = (await import('html2canvas')).default;
      
      if (cardRef.current) {
        const canvas = await html2canvas(cardRef.current, {
          scale: 2,
          backgroundColor: null,
          logging: false,
          useCORS: true,
          allowTaint: true,
          imageTimeout: 15000
        });
        
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `pnl.png`;
        link.click();
      }
    } catch (error) {
      console.error("Failed to download image:", error);
      alert("To download this card as an image, html2canvas library would need to be installed.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Determine if card should be red (negative PNL)
  const isNegative = summary.totalProfit < 0;
  
  return (
    <div className="flex flex-col items-center max-w-md mx-auto">
      {/* Modern Card with Glassmorphism */}
      <div 
        ref={cardRef}
        className={`w-full relative overflow-hidden rounded-3xl ${
          isNegative 
            ? 'bg-gradient-to-br from-error-05 to-error-20 border-error-20 shadow-error-40'
            : 'bg-gradient-to-br from-primary-05 to-primary-20 border-app-primary-20 shadow-app-primary-40'
        } bg-app-primary border backdrop-blur-3xl`}
        style={{
          fontFamily: 'Consolas, monospace',
          fontWeight: 400
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className={`absolute inset-0 ${
            isNegative 
              ? 'bg-gradient-radial from-error-alt-30 via-transparent to-error-alt-20'
              : 'bg-gradient-radial from-app-primary-30 via-transparent to-app-primary-20'
          }`} style={{
            backgroundSize: '100px 100px'
          }}></div>
        </div>
        
        {/* Card Content */}
        <div className="p-8 relative z-10">
          {/* Header Section */}
          <div className="flex items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden">
                  <img 
                    src={logoImage} 
                    alt="Logo" 
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      // Fallback to lightning icon if logo fails to load
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'block';
                      }
                    }}
                  />
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display: 'none'}}>
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="currentColor" strokeWidth="0" className="text-app-primary"/>
                  </svg>
                </div>
               <div>
                 <h2 className="text-app-primary font-bold text-2xl tracking-tight">{brand.name}</h2>
                 <p className={`text-sm font-medium ${
                   isNegative ? 'text-error-alt' : 'color-primary'
                 }`}>{brand.appUrl}</p>
               </div>
            </div>
          </div>
          
          {/* Main Profit Display */}
          <div className="text-center mb-8">
            <div className="text-app-muted text-sm font-medium mb-2">Total P&L</div>
            <div className={`text-4xl font-bold mb-1 ${
              summary.totalProfit >= 0 ? 'color-primary' : 'text-error-alt'
            }`}>
              {formatAmount(summary.totalProfit)} SOL
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className={`grid gap-4 mb-6 ${
            (summary.profitableWallets > 0 && summary.unprofitableWallets > 0) ? 'grid-cols-2' :
            (summary.profitableWallets > 0 || summary.unprofitableWallets > 0) ? 'grid-cols-3' : 'grid-cols-2'
          }`}>
            <div className="bg-app-primary-05 backdrop-blur-sm rounded-xl p-4 border border-app-primary-10">
              <div className="text-app-muted text-xs font-medium mb-1">Total Wallets</div>
              <div className="text-app-primary text-xl font-bold">{summary.totalWallets}</div>
            </div>
            <div className="bg-app-primary-05 backdrop-blur-sm rounded-xl p-4 border border-app-primary-10">
              <div className="text-app-muted text-xs font-medium mb-1">Win Rate</div>
              <div className={`text-xl font-bold ${
                isNegative ? 'text-error-alt' : 'color-primary'
              }`}>
                {summary.totalWallets > 0 ? Math.round((summary.profitableWallets / summary.totalWallets) * 100) : 0}%
              </div>
            </div>
            {summary.profitableWallets > 0 && (
              <div className="bg-app-primary-05 backdrop-blur-sm rounded-xl p-4 border border-app-primary-10">
                <div className="text-app-muted text-xs font-medium mb-1">Best Trade</div>
                <div className={`text-lg font-bold ${
                  summary.bestProfit >= 0 ? 'color-primary' : 'text-error-alt'
                }`}>
                  {formatAmount(summary.bestProfit)}
                </div>
              </div>
            )}
            {summary.unprofitableWallets > 0 && (
              <div className="bg-app-primary-05 backdrop-blur-sm rounded-xl p-4 border border-app-primary-10">
                <div className="text-app-muted text-xs font-medium mb-1">Worst Trade</div>
                <div className={`text-lg font-bold ${
                  summary.worstProfit >= 0 ? 'color-primary' : 'text-error-alt'
                }`}>
                  {formatAmount(summary.worstProfit)}
                </div>
              </div>
            )}
          </div>
          

          
          {/* Footer */}
           <div className="flex items-center justify-between pt-4 border-t border-app-primary-10">
             <div className="flex items-center space-x-1">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-app-muted">
                 <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
               </svg>
               <span className="text-app-muted text-xs">{brand.social.twitter}</span>
             </div>
             <div className="flex items-center space-x-1">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-app-muted">
                 <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
               </svg>
               <span className="text-app-muted text-xs">{brand.social.github}</span>
             </div>
           </div>
        </div>
      </div>
      
      {/* Modern Download Button */}
      <button
        onClick={downloadAsImage}
        disabled={isDownloading}
        className={`mt-6 w-full group relative overflow-hidden rounded-2xl p-0.5 transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100 ${
          isNegative 
            ? 'bg-gradient-to-r from-error-alt to-error hover-shadow-error-alt'
            : 'bg-gradient-to-r from-app-primary-color to-app-primary-dark hover-shadow-app-primary-60'
        }`}
      >
        <div className="relative rounded-2xl bg-app-primary-60 backdrop-blur-sm px-6 py-3 transition-all duration-300 group-hover:bg-app-primary-40">
          <div className="flex items-center justify-center text-app-primary font-medium">
            {isDownloading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-app-primary border-t-transparent rounded-full mr-3"></div>
                <span>Generating Image...</span>
              </>
            ) : (
              <>
                <Download size={20} className="mr-3 transition-transform duration-300 group-hover:scale-110" />
                <span>Download PNL Card</span>
                <div className="ml-3 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </>
            )}
          </div>
        </div>
      </button>
    </div>
  );
};

export default PnlCard;