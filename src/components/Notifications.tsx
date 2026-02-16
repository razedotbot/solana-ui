/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useRef } from "react"
import { AlertCircle, X, ZapIcon } from "lucide-react"

export const ToastContext = createContext<{
  showToast: (message: string, type: 'success' | 'error') => void
}>({
  showToast: () => {},
})

export const useToast = (): { showToast: (message: string, type: 'success' | 'error') => void } => {
  return useContext(ToastContext)
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ToastProviderProps {
  children: React.ReactNode
}

// Custom  styled toast animations
const Animations = `
  @keyframes slide-in {
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    10% {
      transform: translateX(-10px);
      opacity: 0.8;
    }
    15% {
      transform: translateX(5px);
    }
    20% {
      transform: translateX(0);
      opacity: 1;
    }
    90% {
      transform: translateX(0);
      opacity: 1;
    }
    100% {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  @keyframes glow {
    0% {
      box-shadow: 0 0 5px var(--color-primary-70);
    }
    50% {
      box-shadow: 0 0 15px var(--color-primary-90), 0 0 30px var(--color-primary-50);
    }
    100% {
      box-shadow: 0 0 5px var(--color-primary-70);
    }
  }

  @keyframes error-glow {
    0% {
      box-shadow: 0 0 5px var(--color-error-70);
    }
    50% {
      box-shadow: 0 0 15px var(--color-error-90), 0 0 30px var(--color-error-50);
    }
    100% {
      box-shadow: 0 0 5px var(--color-error-70);
    }
  }
  
  @keyframes scanline {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 0 100%;
    }
  }

  @keyframes text-glitch {
    0% {
      text-shadow: 0 0 0 var(--color-text-secondary-90);
    }
    5% {
      text-shadow: -2px 0 0 rgba(255, 0, 128, 0.8), 2px 0 0 rgba(0, 255, 255, 0.8);
    }
    10% {
      text-shadow: 0 0 0 var(--color-text-secondary-90);
    }
    15% {
      text-shadow: -2px 0 0 rgba(255, 0, 128, 0.8), 2px 0 0 rgba(0, 255, 255, 0.8);
    }
    20% {
      text-shadow: 0 0 0 var(--color-text-secondary-90);
    }
    100% {
      text-shadow: 0 0 0 var(--color-text-secondary-90);
    }
  }
`

// CSS classes for  styling
const Classes = {
  successToast: "relative bg-app-primary border border-app-primary text-app-primary animate-[glow_2s_infinite]",
  errorToast: "relative bg-app-primary border border-error text-app-primary animate-[error-glow_2s_infinite]",
  scanline: "absolute inset-0 pointer-events-none bg-gradient-scanline-primary bg-[size:100%_4px] animate-[scanline_4s_linear_infinite] opacity-40",
  errorScanline: "absolute inset-0 pointer-events-none bg-gradient-scanline-error bg-[size:100%_4px] animate-[scanline_4s_linear_infinite] opacity-40",
  icon: "h-5 w-5 color-primary",
  errorIcon: "h-5 w-5 text-error",
  message: "font-mono tracking-wider animate-[text-glitch_3s_infinite]",
  closeButton: "ml-2 rounded-full p-1 hover:bg-primary-40 text-app-secondary transition-colors duration-300",
  errorCloseButton: "ml-2 rounded-full p-1 hover:bg-error-40 text-error-light transition-colors duration-300"
}

export const ToastProvider = ({ children }: ToastProviderProps): JSX.Element => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const showToast = (message: string, type: 'success' | 'error'): void => {
    const id = Date.now() + counterRef.current
    counterRef.current += 1
    setToasts(prev => [...prev, { id, message, type }])
  }

  const closeToast = (id: number): void => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1))
      }, 2000) // Increased duration to 5 seconds to enjoy the  effects
      return () => clearTimeout(timer)
    }
    return
  }, [toasts])
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Add the custom animations to the DOM */}
      <style>{Animations}</style>
      
      <div className="fixed bottom-4 right-4 z-[999999999999999999999999999999999] flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{ animationDuration: '5s' }}
            className={`animate-[slide-in_5s_ease-in-out_forwards] flex items-center gap-2 rounded px-4 py-3 shadow-lg backdrop-blur-sm ${
              toast.type === 'success' ? Classes.successToast : Classes.errorToast
            }`}
          >
            {/* Scanline effect */}
            <div className={toast.type === 'success' ? Classes.scanline : Classes.errorScanline}></div>
            
            {/* Corner accents for  border effect */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-app-primary"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-app-primary"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-app-primary"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-app-primary"></div>
            
            {/* Icon and content */}
            {toast.type === 'success' ? (
              <ZapIcon className={Classes.icon} />
            ) : (
              <AlertCircle className={Classes.errorIcon} />
            )}
            <p className={Classes.message}>{toast.message}</p>
            <button
              onClick={() => closeToast(toast.id)}
              className={toast.type === 'success' ? Classes.closeButton : Classes.errorCloseButton}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
