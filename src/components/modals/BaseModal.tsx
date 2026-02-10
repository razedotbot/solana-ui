import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MODAL_STYLES } from '../shared/modalStyles';

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
