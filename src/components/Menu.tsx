import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import logo from '../logo.png';
import { brand } from '../config/brandConfig';
import { Tooltip } from './Tooltip';

interface ServiceButtonProps {
  icon: React.ReactNode;
  label: string;
  url: string;
  description: string;
}

const ServiceButton = ({ 
  icon, 
  label, 
  url,
  description 
}: ServiceButtonProps): JSX.Element => {
  const handleClick = (e: React.MouseEvent): void => {
    // Prevent event bubbling
    e.stopPropagation();
    
    if (url) {
      // Try using location.href as an alternative to window.open
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error("Error opening URL:", error);
        // Fallback to location.href
        window.location.href = url;
      }
    }
  };

  return (
    <Tooltip content={description || label} position="top">
      <div 
        className="flex flex-col items-center w-20 p-2 hover:bg-primary-20 border border-app-primary-30 
                  hover-border-primary-60 rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
        onClick={handleClick}
      >
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center mb-2 
                    bg-app-quaternary border border-app-primary-40 overflow-hidden transition-all duration-300 hover:border-app-primary hover:shadow-[0_0_8px_var(--color-primary-40)]"
        >
          {icon}
        </div>
        <span className="text-app-secondary text-xs font-mono tracking-wider">{label}</span>
      </div>
    </Tooltip>
  );
};

interface DropdownPortalProps {
  isOpen: boolean;
  buttonRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
  children: React.ReactNode;
}

// Dropdown component that uses portal to render outside the normal DOM hierarchy
const DropdownPortal = ({ isOpen, buttonRef, onClose, children }: DropdownPortalProps): JSX.Element | null => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
      
      // Add event listener to close dropdown when clicking outside
      const handleClickOutside = (event: MouseEvent): void => {
        if (
          dropdownRef.current && 
          buttonRef.current && 
          !buttonRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen, buttonRef, onClose]);
  
  if (!isOpen) return null;
  
  return createPortal(
    <div 
      ref={dropdownRef}
      className="fixed z-50" 
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

// Main component
interface ServiceSelectorProps {
  onTokenAddressClear?: () => void;
}

const ServiceSelector = ({ onTokenAddressClear }: ServiceSelectorProps = {}): JSX.Element => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);

  const handleButtonClick = (): void => {
    // Call the clear callback if provided
    onTokenAddressClear?.();
    // Navigate to homepage
    navigate('/');
  };
  
  const closeSelector = (): void => {
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      {/* Main button to open the selector */}
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
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

      {/* Service selector modal using portal */}
      {isOpen && (
        <DropdownPortal 
          isOpen={isOpen} 
          buttonRef={buttonRef}
          onClose={closeSelector}
        >
          <div 
            className="mt-2 bg-app-primary rounded-lg p-4 shadow-lg 
                      w-80 border border-app-primary-40 border
                      backdrop-blur-sm animate-slide-up"
            style={{ animationDuration: '0.2s' }}
          >
              <div className="relative">
                {/*  scanline effect */}
                <div className="absolute top-0 left-0 w-full h-full scanline pointer-events-none z-10 opacity-30"></div>
                
                {/* Glow accents in corners */}
                <div className="absolute top-0 right-0 w-3 h-3 bg-app-primary-color opacity-50 rounded-full blur-md"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 bg-app-primary-color opacity-50 rounded-full blur-md"></div>
                
                <div 
                  className="flex flex-wrap justify-center gap-3 relative z-20"
                >
                  {/* Solana */}
                  <div className="animate-slide-in" style={{ animationDelay: '0.05s' }}>
                    <ServiceButton 
                      icon={<div className="bg-[#9945FF] rounded-full w-8 h-8 flex items-center justify-center overflow-hidden">
                        <svg viewBox="0 0 397 311" width="22" height="22">
                          <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h320.3c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="#FFFFFF"/>
                          <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h320.3c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="#FFFFFF"/>
                          <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H3.6c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h320.3c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="#FFFFFF"/>
                        </svg>
                      </div>} 
                      label="Launchpad" 
                      url={brand.appUrl}
                      description="Launchpad"
                    />
                  </div>
                  
                  {/* Docs */}
                  <div className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
                    <ServiceButton 
                      icon={<div className="bg-[#0066FF] rounded-lg w-8 h-8 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="0.5" />
                          <polyline points="14 2 14 8 20 8" fill="none" stroke="#FFFFFF" strokeWidth="1" />
                          <line x1="16" y1="13" x2="8" y2="13" stroke="#FFFFFF" strokeWidth="1" />
                          <line x1="16" y1="17" x2="8" y2="17" stroke="#FFFFFF" strokeWidth="1" />
                          <polyline points="10 9 9 9 8 9" stroke="#FFFFFF" strokeWidth="1" />
                        </svg>
                      </div>} 
                      label="Docs" 
                      url={brand.docsUrl}
                      description="Documentation"
                    />
                  </div>
                  
                  {/* GitHub */}
                  <div className="animate-slide-in" style={{ animationDelay: '0.15s' }}>
                    <ServiceButton 
                      icon={<div className="bg-[#171515] rounded-full w-8 h-8 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.73-4.03-1.61-4.03-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.84 2.81 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.3.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" fill="#FFFFFF" />
                        </svg>
                      </div>} 
                      label="GitHub" 
                      url={brand.githubOrg}
                      description="GitHub Repository"
                    />
                  </div>
                </div>
              </div>
            </div>
          </DropdownPortal>
        )}
    </div>
  );
};
export default ServiceSelector;