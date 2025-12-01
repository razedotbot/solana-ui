import React, { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Bot, Blocks, Wallet, TrendingUp, BookOpen } from 'lucide-react';
import { brand } from '../utils/brandConfig';
import logo from '../logo.png';

interface HeaderProps {
  tokenAddress?: string;
  onNavigateHome?: () => void;
  showToast?: (message: string, type: 'success' | 'error') => void;
}

const VerticalSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleWalletsClick = (): void => {
    navigate('/wallets');
  };

  const handleMonitorClick = (): void => {
    navigate('/monitor');
  };

  const handleAutomateClick = (): void => {
    navigate('/automate');
  };


  const handleDeployClick = (): void => {
    navigate('/deploy');
  };

  const handleSettingsClick = (): void => {
    navigate('/settings');
  };

  const handleDocsClick = (): void => {
    window.open(brand.docsUrl, '_blank', 'noopener,noreferrer');
  };

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const getButtonClassName = (path: string): string => {
    const active = isActive(path);
    return `group flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-lg transition-all duration-200 w-full
            ${active
              ? 'bg-primary-20 border border-app-primary-80 color-primary shadow-inner-black-80' 
              : 'bg-app-primary-60 border border-app-primary-40 text-app-secondary-60 hover-border-primary-40 hover-text-app-secondary hover-bg-app-primary-80-alpha'
            }`;
  };

  const getIconClassName = (path: string): string => {
    const active = isActive(path);
    return `transition-all duration-200 ${active ? 'color-primary' : 'text-app-secondary-60 group-hover:color-primary'}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Wallets */}
      <button
        onClick={handleWalletsClick}
        className={getButtonClassName('/wallets')}
      >
        <Wallet size={24} className={getIconClassName('/wallets')} />
        <span className="text-xs font-mono font-medium tracking-wider uppercase">
          WALLETS
        </span>
      </button>

      {/* Trade */}
      <button
        onClick={handleMonitorClick}
        className={getButtonClassName('/monitor')}
      >
        <TrendingUp size={24} className={getIconClassName('/monitor')} />
        <span className="text-xs font-mono font-medium tracking-wider uppercase">
          TRADE
        </span>
      </button>

      {/* Automate */}
      <button
        onClick={handleAutomateClick}
        className={getButtonClassName('/automate')}
      >
        <Bot size={24} className={getIconClassName('/automate')} />
        <span className="text-xs font-mono font-medium tracking-wider uppercase">
          AUTOMATE
        </span>
      </button>

      {/* Deploy */}
      <button
        onClick={handleDeployClick}
        className={getButtonClassName('/deploy')}
      >
        <Blocks size={24} className={getIconClassName('/deploy')} />
        <span className="text-xs font-mono font-medium tracking-wider uppercase">
          DEPLOY
        </span>
      </button>

      {/* Documentation */}
      <button
        onClick={handleDocsClick}
        className="group flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-lg transition-all duration-200 w-full
                  bg-app-primary-60 border border-app-primary-40 text-app-secondary-60 hover-border-primary-40 hover-text-app-secondary hover-bg-app-primary-80-alpha"
      >
        <BookOpen size={24} className="transition-all duration-200 text-app-secondary-60 group-hover:color-primary" />
        <span className="text-xs font-mono font-medium tracking-wider uppercase">
          DOCS
        </span>
      </button>

      {/* Settings */}
      <button
        onClick={handleSettingsClick}
        className={getButtonClassName('/settings')}
      >
        <Settings size={24} className={getIconClassName('/settings')} />
        <span className="text-xs font-mono font-medium tracking-wider uppercase">
          SETTINGS
        </span>
      </button>
    </div>
  );
};

export const HomepageHeader: React.FC<HeaderProps> = ({
  onNavigateHome,
}) => {
  const navigate = useNavigate();
  
  const handleLogoClick = useCallback(() => {
    onNavigateHome?.();
    navigate('/');
  }, [onNavigateHome, navigate]);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-48 border-r border-app-primary-40 backdrop-blur-sm bg-app-primary-80-alpha z-30 flex-col p-4 gap-6 overflow-y-auto shadow-inner-black-80">
      {/* Logo button at top */}
      <div className="flex justify-center">
        <div className="relative inline-block">
          <button
            onClick={handleLogoClick}
            className="flex items-center justify-center p-2 overflow-hidden
                    border border-app-primary-30 hover-border-primary-60 rounded 
                    transition-all duration-300 btn"
          >
            <div 
              className="flex items-center hover:scale-105 active:scale-95 transition-transform"
            >
              <img 
                src={logo} 
                alt={brand.altText} 
                className="h-8 filter drop-shadow-[0_0_8px_var(--color-primary-70)]" 
              />
            </div>
          </button>
        </div>
      </div>
      
      {/* Vertical Navigation Menu */}
      <VerticalSidebar />
    </aside>
  );
};

// Unified header component for all pages
export const UnifiedHeader: React.FC<HeaderProps> = () => {
  const navigate = useNavigate();

  const handleLogoClick = useCallback((): void => {
    navigate('/');
  }, [navigate]);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-48 border-r border-app-primary-40 backdrop-blur-sm bg-app-primary-80-alpha z-30 flex-col p-4 gap-6 overflow-y-auto shadow-inner-black-80">
      {/* Logo button at top */}
      <div className="flex justify-center">
        <div className="relative inline-block">
          <button
            onClick={handleLogoClick}
            className="flex items-center justify-center p-2 overflow-hidden
                    border border-app-primary-30 hover-border-primary-60 rounded 
                    transition-all duration-300 btn"
          >
            <div 
              className="flex items-center hover:scale-105 active:scale-95 transition-transform"
            >
              <img 
                src={logo} 
                alt={brand.altText} 
                className="h-8 filter drop-shadow-[0_0_8px_var(--color-primary-70)]" 
              />
            </div>
          </button>
        </div>
      </div>
      
      {/* Vertical Navigation Menu */}
      <VerticalSidebar />
    </aside>
  );
};

export default HomepageHeader;