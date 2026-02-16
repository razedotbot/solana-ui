import React, { useState } from 'react';

// Tooltip Component with custom styling
export const WalletTooltip: React.FC<{ 
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}> = ({ 
  children, 
  content,
  position = 'top'
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
          <div className="bg-app-quaternary border color-primary text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

// Define the application styles that will be injected
// eslint-disable-next-line react-refresh/only-export-components
export const initStyles = (): string => {
  return `
  /* Background grid animation */
  @keyframes grid-pulse {
    0% { opacity: 0.1; }
    50% { opacity: 0.15; }
    100% { opacity: 0.1; }
  }

  .bg {
    background-color: var(--color-bg-primary);
    background-image: 
      linear-gradient(var(--color-primary-05) 1px, transparent 1px),
      linear-gradient(90deg, var(--color-primary-05) 1px, transparent 1px);
    background-size: var(--grid-size) var(--grid-size);
    background-position: center center;
    position: relative;
    overflow: hidden;
  }

  .bg::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      linear-gradient(var(--color-primary-05) 1px, transparent 1px),
      linear-gradient(90deg, var(--color-primary-05) 1px, transparent 1px);
    background-size: var(--grid-size) var(--grid-size);
    background-position: center center;
    animation: grid-pulse var(--grid-pulse-speed) infinite;
    z-index: 0;
  }

  /* Button hover animations */
  @keyframes btn-glow {
    0% { box-shadow: 0 0 5px var(--color-primary); }
    50% { box-shadow: 0 0 15px var(--color-primary); }
    100% { box-shadow: 0 0 5px var(--color-primary); }
  }

  .btn {
    transition: all var(--transition-speed) ease;
    position: relative;
    overflow: hidden;
  }

  .btn:hover {
    animation: btn-glow var(--glow-speed) infinite;
  }

  .btn::after {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      to bottom right,
      transparent 0%,
      var(--color-primary-30) 50%,
      transparent 100%
    );
    transform: rotate(45deg);
    transition: all var(--hover-speed) ease;
    opacity: 0;
  }

  .btn:hover::after {
    opacity: 1;
    transform: rotate(45deg) translate(50%, 50%);
  }

  /* Glitch effect for text */
  @keyframes glitch {
    2%, 8% { transform: translate(-2px, 0) skew(0.3deg); }
    4%, 6% { transform: translate(2px, 0) skew(-0.3deg); }
    62%, 68% { transform: translate(0, 0) skew(0.33deg); }
    64%, 66% { transform: translate(0, 0) skew(-0.33deg); }
  }

  .glitch {
    position: relative;
  }

  .glitch:hover {
    animation: glitch 2s infinite;
  }

  /* Input focus effect */
  .input:focus {
    box-shadow: 0 0 0 1px var(--color-primary-70), 0 0 15px var(--color-primary-50);
    transition: all var(--transition-speed) ease;
  }

  /* Card hover effect */
  .card {
    transition: all var(--transition-speed) ease;
  }

  .card:hover {
    transform: translateY(-3px);
    box-shadow: 0 7px 20px rgba(0, 0, 0, 0.3), 0 0 15px var(--color-primary-30);
  }

  /* Scan line effect */
  @keyframes scanline {
    0% { 
      transform: translateY(-100%);
      opacity: 0.7;
    }
    100% { 
      transform: translateY(100%);
      opacity: 0;
    }
  }

  .scanline {
    position: relative;
    overflow: hidden;
  }

  .scanline::before {
    content: "";
    position: absolute;
    width: 100%;
    height: 10px;
    background: linear-gradient(to bottom, 
      transparent 0%,
      var(--color-primary-20) 50%,
      transparent 100%);
    z-index: 10;
    animation: scanline var(--scanline-speed) linear infinite;
  }

  /* Split gutter styling */
  .split-custom .gutter {
    background: linear-gradient(90deg, 
      transparent 0%, 
      var(--color-primary-10) 50%, 
      transparent 100%
    );
    position: relative;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .split-custom .gutter-horizontal {
    cursor: col-resize;
  }

  .split-custom .gutter-horizontal:hover {
    background: linear-gradient(90deg, 
      transparent 0%, 
      var(--color-primary-20) 50%, 
      transparent 100%
    );
  }

  .split-custom .gutter-horizontal:active {
    background: linear-gradient(90deg, 
      transparent 0%, 
      var(--color-primary-30) 50%, 
      transparent 100%
    );
  }

  /* Animated dots pattern */
  .gutter-dot {
    width: 3px;
    height: 3px;
    background-color: var(--color-primary-60);
    border-radius: 50%;
    opacity: 0.4;
    transition: all 0.3s ease;
  }

  .split-custom .gutter-horizontal:hover .gutter-dot {
    background-color: var(--color-primary-70);
    opacity: 0.7;
  }

  .split-custom .gutter-horizontal:active .gutter-dot {
    background-color: var(--color-primary);
    opacity: 1;
    box-shadow: 0 0 12px var(--color-primary);
    animation: gutterPulseActive 0.4s ease-in-out infinite;
  }

  @keyframes gutterPulseActive {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.8);
      opacity: 0.8;
    }
  }

  /* Non-resizable divider styling (visual only) */
  .gutter-divider {
    width: 12px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      var(--color-primary-10) 50%, 
      transparent 100%
    );
    position: relative;
    flex-shrink: 0;
  }

  .gutter-divider-non-resizable {
    cursor: default;
  }

  /* Neo-futuristic table styling */
  .table {
    border-collapse: separate;
    border-spacing: 0;
  }

  .table thead th {
    background-color: var(--color-primary-10);
    border-bottom: 2px solid var(--color-primary-50);
  }

  .table tbody tr {
    transition: all var(--hover-speed) ease;
  }

  .table tbody tr:hover {
    background-color: var(--color-primary-05);
  }

  /* Neon text effect */
  .neon-text {
    color: var(--color-primary);
    text-shadow: 0 0 5px var(--color-primary-70);
  }

  /* Notification animation */
  @keyframes notification-slide {
    0% { transform: translateX(50px); opacity: 0; }
    10% { transform: translateX(0); opacity: 1; }
    90% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(50px); opacity: 0; }
  }

  .notification-anim {
    animation: notification-slide 4s forwards;
  }

  /* Loading animation */
  @keyframes loading-pulse {
    0% { transform: scale(0.85); opacity: 0.7; }
    50% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0.85); opacity: 0.7; }
  }

  .loading-anim {
    animation: loading-pulse 1.5s infinite;
  }

  /* Button click effect */
  .btn:active {
    transform: scale(0.95);
    box-shadow: 0 0 15px var(--color-primary-70);
  }

  /* Menu active state */
  .menu-item-active {
    border-left: 3px solid var(--color-primary);
    background-color: var(--color-primary-10);
  }

  /* Angle brackets for headings */
  .heading-brackets {
    position: relative;
    display: inline-block;
  }

  .heading-brackets::before,
  .heading-brackets::after {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-primary);
    font-weight: bold;
  }

  .heading-brackets::before {
    content: ">";
    left: -15px;
  }

  .heading-brackets::after {
    content: "<";
    right: -15px;
  }

  /* Fade-in animation */
  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  `;
};

interface PageBackgroundProps {
  className?: string;
}

export const PageBackground: React.FC<PageBackgroundProps> = ({
  className = "",
}) => {
  return (
    <div
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-app-primary opacity-90">
        <div className="absolute inset-0 bg-gradient-to-b from-app-primary-05 to-transparent"></div>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(2, 179, 109, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(2, 179, 109, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
            backgroundPosition: "center center",
          }}
        ></div>
      </div>

      <div className="absolute top-0 left-0 w-32 h-32 opacity-20">
        <div className="absolute top-0 left-0 w-px h-16 bg-gradient-to-b from-app-primary-color to-transparent"></div>
        <div className="absolute top-0 left-0 w-16 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
        <div className="absolute top-0 right-0 w-px h-16 bg-gradient-to-b from-app-primary-color to-transparent"></div>
        <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute bottom-0 left-0 w-32 h-32 opacity-20">
        <div className="absolute bottom-0 left-0 w-px h-16 bg-gradient-to-t from-app-primary-color to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-16 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20">
        <div className="absolute bottom-0 right-0 w-px h-16 bg-gradient-to-t from-app-primary-color to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-16 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
      </div>
    </div>
  );
};
