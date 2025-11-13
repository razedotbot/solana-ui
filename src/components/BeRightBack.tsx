import React from 'react';
import { Wallet, Settings } from 'lucide-react';

interface BeRightBackProps {
  onOpenWallets: () => void;
  onOpenSettings: () => void;
}

const BeRightBack: React.FC<BeRightBackProps> = ({ onOpenWallets, onOpenSettings }) => {
  return (
    <div className="fixed inset-0 bg-app-primary flex items-center justify-center p-4 overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-cyberpunk-grid opacity-10"></div>
      
      {/* Main content */}
      <div className="relative z-10 text-center max-w-2xl w-full">
        {/* Glowing title */}
        <h1 
          className="text-6xl md:text-8xl font-bold mb-6 text-app-primary"
          style={{
            textShadow: '0 0 10px rgba(2, 179, 109, 0.5), 0 0 20px rgba(2, 179, 109, 0.3), 0 0 30px rgba(2, 179, 109, 0.2)'
          }}
        >
          BE RIGHT BACK
        </h1>
        
        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-app-secondary mb-8">
          We're currently performing maintenance
        </p>
        
        {/* Animated loading indicator */}
        <div className="flex justify-center items-center mb-8">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-t-2 spinner-app-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-app-primary-color rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="flex justify-center gap-4 text-app-primary-40 text-2xl mb-8">
          <span className="animate-pulse" style={{ animationDelay: '0s' }}>▮</span>
          <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>▮</span>
          <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>▮</span>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button
            onClick={onOpenWallets}
            className="px-6 py-3 bg-app-primary-color hover:bg-app-primary-dark text-black font-bold rounded cyberpunk-btn font-mono tracking-wider transition-all duration-300 flex items-center gap-2"
          >
            <Wallet size={18} />
            WALLETS
          </button>
          <button
            onClick={onOpenSettings}
            className="px-6 py-3 bg-app-tertiary border border-app-primary-40 hover-border-primary text-app-primary font-bold rounded cyberpunk-btn font-mono tracking-wider transition-all duration-300 flex items-center gap-2"
          >
            <Settings size={18} />
            SETTINGS
          </button>
        </div>
        
        {/* Bottom message */}
        <p className="text-app-muted text-sm md:text-base">
          Please check back soon
        </p>
      </div>
      
      {/* Scanline effect overlay */}
      <div className="cyberpunk-scanline absolute inset-0 pointer-events-none"></div>
    </div>
  );
};

export default BeRightBack;

