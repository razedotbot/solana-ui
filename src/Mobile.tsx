import React from 'react';
import { Wallet, TrendingUp, Zap } from 'lucide-react';

interface MobileLayoutProps {
  currentPage: 'wallets' | 'chart' | 'actions';
  setCurrentPage: (page: 'wallets' | 'chart' | 'actions') => void;
  children: {
    WalletsPage: React.ReactNode;
    Frame: React.ReactNode;
    ActionsPage: React.ReactNode;
  };
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  currentPage,
  setCurrentPage,
  children
}) => {
  const tabs = [
    { id: 'wallets' as const, label: 'Wallets', icon: Wallet },
    { id: 'chart' as const, label: 'Chart', icon: TrendingUp },
    { id: 'actions' as const, label: 'Actions', icon: Zap },
  ];

  return (
    <div className="md:hidden flex flex-col h-[100dvh] max-h-[100dvh] bg-app-primary text-app-tertiary overflow-hidden">
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(var(--color-primary-20) 1px, transparent 1px),
              linear-gradient(90deg, var(--color-primary-20) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />
        
        {/* All Pages - Keep mounted, control visibility */}
        <div className="relative z-10 h-full w-full">
          {/* Wallets Page */}
          <div 
            className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-opacity duration-200 ${
              currentPage === 'wallets' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {children.WalletsPage}
          </div>
          
          {/* Chart Page */}
          <div 
            className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-opacity duration-200 ${
              currentPage === 'chart' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {children.Frame}
          </div>
          
          {/* Actions Page */}
          <div 
            className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-opacity duration-200 ${
              currentPage === 'actions' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {children.ActionsPage}
          </div>
        </div>
      </div>

      {/* Bottom Tab Navigation */}
      <div 
        className="border-t border-app-primary-20 bg-app-primary-99 backdrop-blur-sm pb-safe"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentPage === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentPage(tab.id)}
                className={`
                  flex flex-col items-center justify-center gap-1 flex-1 h-full
                  transition-all duration-200 min-h-[44px]
                  ${isActive 
                    ? 'color-primary' 
                    : 'text-app-secondary-60'
                  }
                `}
                aria-label={tab.label}
              >
                <div className={`
                  relative p-2 rounded transition-all duration-200
                  ${isActive 
                    ? 'bg-primary-10' 
                    : ''
                  }
                `}>
                  <Icon 
                    size={22} 
                    className={`
                      transition-all duration-200
                      ${isActive ? 'scale-110' : ''}
                    `}
                  />
                  {isActive && (
                    <div className="absolute inset-0 rounded bg-primary-20 opacity-50 animate-pulse" />
                  )}
                </div>
                <span className={`
                  text-[10px] font-mono tracking-wider transition-all duration-200
                  ${isActive ? 'font-semibold' : 'font-normal'}
                `}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MobileLayout;
