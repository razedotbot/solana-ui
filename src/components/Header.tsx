import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Bot, Blocks, Wallet, TrendingUp } from 'lucide-react';
import ServiceSelector from './Menu';

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
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-48 border-r border-app-primary-40 backdrop-blur-sm bg-app-primary-80-alpha z-30 flex-col p-4 gap-6 overflow-y-auto shadow-inner-black-80">
      {/* Service Selector at top */}
      <div className="flex justify-center">
        <ServiceSelector onTokenAddressClear={onNavigateHome} />
      </div>
      
      {/* Vertical Navigation Menu */}
      <VerticalSidebar />
    </aside>
  );
};

// Unified header component for all pages
export const UnifiedHeader: React.FC<HeaderProps> = () => {
  const navigate = useNavigate();

  const handleNavigateHome = (): void => {
    navigate('/');
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-48 border-r border-app-primary-40 backdrop-blur-sm bg-app-primary-80-alpha z-30 flex-col p-4 gap-6 overflow-y-auto shadow-inner-black-80">
      {/* Service Selector at top */}
      <div className="flex justify-center">
        <ServiceSelector onTokenAddressClear={handleNavigateHome} />
      </div>
      
      {/* Vertical Navigation Menu */}
      <VerticalSidebar />
    </aside>
  );
};

export default HomepageHeader;