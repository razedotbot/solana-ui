import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface BaseModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title displayed in the header */
  title: string;
  /** Icon component to display in the header */
  icon?: React.ReactNode;
  /** Width class for the modal (e.g., 'max-w-md', 'max-w-2xl', 'max-w-7xl') */
  maxWidth?: string;
  /** Progress value from 0 to 100, or undefined to hide progress bar */
  progress?: number;
  /** Whether to show the progress bar */
  showProgress?: boolean;
  /** Children to render inside the modal content area */
  children: React.ReactNode;
  /** Additional class names for the content area */
  contentClassName?: string;
  /** Whether to allow closing by clicking the backdrop */
  closeOnBackdropClick?: boolean;
  /** Maximum height class for the modal */
  maxHeight?: string;
}

// CSS animations for modal - injected once
const MODAL_STYLES = `
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

  .modal-input-cyber:focus {
    box-shadow: 0 0 0 1px var(--color-primary-70), 0 0 15px var(--color-primary-50);
    transition: all 0.3s ease;
  }

  .modal-btn-cyber {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .modal-btn-cyber::after {
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
    transition: all 0.5s ease;
    opacity: 0;
  }

  .modal-btn-cyber:hover::after {
    opacity: 1;
    transform: rotate(45deg) translate(50%, 50%);
  }

  .modal-btn-cyber:active {
    transform: scale(0.95);
  }

  .progress-bar-cyber {
    position: relative;
    overflow: hidden;
  }

  .progress-bar-cyber::after {
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

  /* Animation classes for step transitions */
  @keyframes modal-in {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  @keyframes step-out {
    0% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(-20px); opacity: 0; }
  }

  @keyframes step-in {
    0% { transform: translateX(20px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes step-back-out {
    0% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(20px); opacity: 0; }
  }

  @keyframes step-back-in {
    0% { transform: translateX(-20px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes content-fade {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes scale-in {
    0% { transform: scale(0); }
    100% { transform: scale(1); }
  }

  .animate-modal-in {
    animation: modal-in 0.5s ease-out forwards;
  }

  .animate-step-out {
    animation: step-out 0.3s ease-out forwards;
  }

  .animate-step-in {
    animation: step-in 0.3s ease-out forwards;
  }

  .animate-step-back-out {
    animation: step-back-out 0.3s ease-out forwards;
  }

  .animate-step-back-in {
    animation: step-back-in 0.3s ease-out forwards;
  }

  .animate-content-fade {
    animation: content-fade 0.5s ease forwards;
  }

  .animate-pulse-slow {
    animation: pulse-slow 2s infinite;
  }

  @keyframes pulse-slow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
  }

  /* Scrollbar styling */
  .modal-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .modal-scrollbar::-webkit-scrollbar-track {
    background: var(--color-bg-tertiary);
    border-radius: 3px;
  }

  .modal-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-scrollbar-thumb);
    border-radius: 3px;
  }

  .modal-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary);
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: var(--color-bg-tertiary);
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: var(--color-primary);
    border-radius: 2px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary-dark);
  }

  /* Responsive styles */
  @media (max-width: 768px) {
    .modal-content {
      width: 95% !important;
      max-height: 90vh;
      overflow-y: auto;
    }
  }
`;

// Track if styles have been injected
let stylesInjected = false;

/**
 * Injects modal styles into the document head.
 * Only injects once per page load.
 */
function injectModalStyles(): void {
  if (stylesInjected) return;

  const styleElement = document.createElement('style');
  styleElement.id = 'base-modal-styles';
  styleElement.textContent = MODAL_STYLES;
  document.head.appendChild(styleElement);
  stylesInjected = true;
}

/**
 * BaseModal - A reusable modal component with consistent styling.
 *
 * Features:
 * - Portal-based rendering for proper z-index stacking
 * - Customizable header with icon and title
 * - Optional progress bar
 * - Keyboard (Escape) and backdrop click handling
 * - Responsive design
 * - Consistent animations and styling
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  maxWidth = 'max-w-md',
  progress,
  showProgress = false,
  children,
  contentClassName = '',
  closeOnBackdropClick = true,
  maxHeight = 'max-h-[90vh]',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Inject styles on first render
  useEffect(() => {
    injectModalStyles();
  }, []);

  // Handle escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Don't render if not open
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent): void => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-app-primary-85"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`relative bg-app-primary border border-app-primary-40 rounded-lg shadow-lg w-full ${maxWidth} ${maxHeight} overflow-hidden transform modal-content`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient grid background */}
        <div className="absolute inset-0 z-0 opacity-10 bg-grid" />

        {/* Header */}
        <div className="relative z-10 p-4 flex justify-between items-center border-b border-app-primary-40">
          <div className="flex items-center">
            {icon && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary-20 mr-3">
                {icon}
              </div>
            )}
            <h2 className="text-lg font-semibold text-app-primary font-mono">
              <span className="color-primary">/</span> {title} <span className="color-primary">/</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-app-secondary hover:color-primary transition-colors p-1 hover:bg-primary-20 rounded"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Indicator */}
        {showProgress && (
          <div className="relative w-full h-1 bg-app-tertiary progress-bar-cyber">
            <div
              className="h-full bg-app-primary-color transition-all duration-300"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        )}

        {/* Content */}
        <div className={`relative z-10 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BaseModal;
