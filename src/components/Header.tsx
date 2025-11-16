import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Bot, Blocks, Trash2, Wallet } from 'lucide-react';
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

  const handleAutomateClick = (): void => {
    navigate('/automate');
  };

  const handleBurnClick = (): void => {
    navigate('/burn');
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
    return `group flex items-center gap-3 px-4 py-3 rounded transition-all duration-300 w-full ${
      active
        ? 'bg-primary-10 border border-app-primary hover-border-primary-60'
        : 'bg-transparent border border-app-primary-20 hover-border-primary-60'
    }`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Wallets */}
      <button
        onClick={handleWalletsClick}
        className={getButtonClassName('/wallets')}
      >
        <Wallet size={16} className="color-primary" />
        <span className="text-xs font-mono color-primary font-medium tracking-wider">
          WALLETS
        </span>
      </button>

      {/* Automate */}
      <button
        onClick={handleAutomateClick}
        className={getButtonClassName('/automate')}
      >
        <Bot size={16} className="color-primary" />
        <span className="text-xs font-mono color-primary font-medium tracking-wider">
          AUTOMATE
        </span>
      </button>

      {/* Deploy */}
      <button
        onClick={handleDeployClick}
        className={getButtonClassName('/deploy')}
      >
        <Blocks size={16} className="color-primary" />
        <span className="text-xs font-mono color-primary font-medium tracking-wider">
          DEPLOY
        </span>
      </button>

      {/* Burn */}
      <button
        onClick={handleBurnClick}
        className={getButtonClassName('/burn')}
      >
        <Trash2 size={16} className="color-primary" />
        <span className="text-xs font-mono color-primary font-medium tracking-wider">
          BURN
        </span>
      </button>

      {/* Settings */}
      <button
        onClick={handleSettingsClick}
        className={getButtonClassName('/settings')}
      >
        <Settings size={16} className="color-primary" />
        <span className="text-xs font-mono color-primary font-medium tracking-wider">
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
    <aside className="fixed left-0 top-0 h-full w-48 border-r border-app-primary-70 backdrop-blur-sm bg-app-primary-99 z-30 flex flex-col p-4 gap-6">
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
    <aside className="fixed left-0 top-0 h-full w-48 border-r border-app-primary-70 backdrop-blur-sm bg-app-primary-99 z-30 flex flex-col p-4 gap-6">
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

