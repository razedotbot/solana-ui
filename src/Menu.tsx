import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logo from './logo.png';
import { brand } from './config/brandConfig';

// Tooltip Component with cyberpunk styling
export const Tooltip = ({ 
  children, 
  content,
  position = 'top'
}: { 
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-app-quaternary cyberpunk-border color-primary text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

const CyberpunkServiceButton = ({ 
  icon, 
  label, 
  url,
  description 
}) => {
  const handleClick = (e) => {
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
      <motion.div 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex flex-col items-center w-20 p-2 hover:bg-primary-20 border border-app-primary-30 
                  hover-border-primary-60 rounded-lg cursor-pointer transition-all duration-300"
        onClick={handleClick}
      >
        <motion.div 
          className="w-10 h-10 rounded-full flex items-center justify-center mb-2 
                    bg-app-quaternary border border-app-primary-40 overflow-hidden"
          whileHover={{ 
            borderColor: "var(--color-primary)", 
            boxShadow: "0 0 8px var(--color-primary-40)" 
          }}
        >
          {icon}
        </motion.div>
        <span className="text-app-secondary text-xs font-mono tracking-wider">{label}</span>
      </motion.div>
    </Tooltip>
  );
};

// Dropdown component that uses portal to render outside the normal DOM hierarchy
const DropdownPortal = ({ isOpen, buttonRef, onClose, children }) => {
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
      const handleClickOutside = (event) => {
        if (
          dropdownRef.current && 
          buttonRef.current && 
          !buttonRef.current.contains(event.target)
        ) {
          onClose();
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
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
const ServiceSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);

  const toggleSelector = () => {
    setIsOpen(!isOpen);
  };
  
  const closeSelector = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      {/* Main button to open the selector */}
        <button
          ref={buttonRef}
          onClick={toggleSelector}
          className="flex items-center justify-center p-2 overflow-hidden
                  border border-app-primary-30 hover-border-primary-60 rounded 
                  transition-all duration-300 cyberpunk-btn"
        >
        <motion.div 
          className="flex items-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <img 
            src={logo} 
            alt={brand.altText} 
            className="h-8 filter drop-shadow-[0_0_8px_var(--color-primary-70)]" 
          />
        </motion.div>
        </button>

      {/* Service selector modal using portal */}
      <AnimatePresence>
        {isOpen && (
          <DropdownPortal 
            isOpen={isOpen} 
            buttonRef={buttonRef}
            onClose={closeSelector}
          >
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 10, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-2 bg-app-primary rounded-lg p-4 shadow-lg 
                        w-80 border border-app-primary-40 cyberpunk-border
                        backdrop-blur-sm"
            >
              <div className="relative">
                {/* Cyberpunk scanline effect */}
                <div className="absolute top-0 left-0 w-full h-full cyberpunk-scanline pointer-events-none z-10 opacity-30"></div>
                
                {/* Glow accents in corners */}
                <div className="absolute top-0 right-0 w-3 h-3 bg-app-primary-color opacity-50 rounded-full blur-md"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 bg-app-primary-color opacity-50 rounded-full blur-md"></div>
                
                <motion.div 
                  className="flex flex-wrap justify-center gap-3 relative z-20"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                  initial="hidden"
                  animate="show"
                >
                  {/* Solana */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0 }
                    }}
                  >
                    <CyberpunkServiceButton 
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
                  </motion.div>
                  
                  {/* Docs */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0 }
                    }}
                  >
                    <CyberpunkServiceButton 
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
                  </motion.div>
                  
                  {/* GitHub */}
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0 }
                    }}
                  >
                    <CyberpunkServiceButton 
                      icon={<div className="bg-[#171515] rounded-full w-8 h-8 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.73-4.03-1.61-4.03-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.84 2.81 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.3.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" fill="#FFFFFF" />
                        </svg>
                      </div>} 
                      label="GitHub" 
                      url={brand.githubOrg}
                      description="GitHub Repository"
                    />
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </DropdownPortal>
        )}
      </AnimatePresence>
    </div>
  );
};
export default ServiceSelector;