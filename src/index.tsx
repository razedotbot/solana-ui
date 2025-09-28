import React, { useState, useEffect, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
// Separate import for createPortal
import { createPortal } from 'react-dom';
import { Buffer as NodeBuffer } from 'buffer';
import Cookies from 'js-cookie';
import { Buffer } from 'buffer';
window.Buffer = Buffer;
import { brand } from './config/brandConfig';
import './styles/globals.css';
import { ToastProvider } from "./Notifications";
import ServerConfig from './ServerConfig';
import IntroModal from './modals/IntroModal';
const App = lazy(() => import('./App'));

declare global {
  interface Window {
    tradingServerUrl: string;
    Buffer: typeof NodeBuffer;
    serverRegion: string;
    availableServers: ServerInfo[];
    switchServer: (serverId: string) => Promise<boolean>;
  }
}

const SERVER_URL_COOKIE = 'trading_server_url';
const SERVER_REGION_COOKIE = 'trading_server_region';
const INTRO_COMPLETED_COOKIE = 'intro_completed';

interface ServerInfo {
  id: string;
  name: string;
  url: string;
  region: string;
  flag: string;
  ping?: number;
}

const DEFAULT_REGIONAL_SERVERS: ServerInfo[] = [
  { id: 'us', name: 'United States', url: 'https://us.fury.bot/', region: 'US', flag: '🇺🇸' },
  { id: 'de', name: 'Germany', url: 'https://de.fury.bot/', region: 'DE', flag: '🇩🇪' },
];

const ServerCheckLoading = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-app-primary">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 spinner-app-primary"></div>
    </div>
  );
};

/**
 * Custom Modal Container Component
 * This directly creates a backdrop for the IntroModal
 */
interface ModalPortalProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const ModalPortal: React.FC<ModalPortalProps> = ({ isOpen, onComplete, onSkip }) => {
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    // Create or get the modal root element when component mounts
    let rootElement = document.getElementById('modal-root');
    
    if (!rootElement && isOpen) {
      rootElement = document.createElement('div');
      rootElement.id = 'modal-root';
      document.body.appendChild(rootElement);
    }
    
    setModalRoot(rootElement);
    
    // Clean up function
    return () => {
      // Only remove if we created it
      if (rootElement && rootElement.parentNode && !isOpen) {
        document.body.removeChild(rootElement);
      }
    };
  }, [isOpen]);
  
  // Apply styles only when modal is open
  useEffect(() => {
    if (!modalRoot) return;
    
    if (isOpen) {
      modalRoot.style.position = 'fixed';
      modalRoot.style.top = '0';
      modalRoot.style.left = '0';
      modalRoot.style.width = '100vw';
      modalRoot.style.height = '100vh';
      modalRoot.style.zIndex = '99999';
      modalRoot.style.pointerEvents = 'auto';
    } else {
      // When closed, disable pointer events
      if (modalRoot) {
        modalRoot.style.pointerEvents = 'none';
      }
    }
  }, [isOpen, modalRoot]);

  if (!isOpen || !modalRoot) return null;
  
  // Create our portal
  return createPortal(
    <div className="fixed inset-0 bg-app-overlay backdrop-blur-sm flex items-center justify-center"
         style={{ zIndex: 99999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="relative z-[99999]">
        <IntroModal 
          isOpen={true} 
          onClose={onComplete}  
        />
      </div>
    </div>,
    modalRoot
  );
};

const Root = () => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [currentServer, setCurrentServer] = useState<ServerInfo | null>(null);
  const [availableServers, setAvailableServers] = useState<ServerInfo[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIntroModal, setShowIntroModal] = useState(false);

  // Disable right-click and text selection globally
  useEffect(() => {
    // Add global styles to disable text selection
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      /* Allow selection for input fields and textareas */
      input, textarea, [contenteditable="true"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable text selection with mouse
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      // Allow selection in input fields and textareas
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return true;
      }
      e.preventDefault();
      return false;
    };

    // Disable drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    // Cleanup function
    return () => {
      document.head.removeChild(style);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);
  
  const measurePing = async (url: string): Promise<number> => {
    const startTime = Date.now();
    try {
      const baseUrl = url.replace(/\/+$/, '');
      const healthEndpoint = '/health';
      const checkUrl = `${baseUrl}${healthEndpoint}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(checkUrl, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      return Date.now() - startTime;
    } catch (error) {
      return Infinity; // Return infinite ping if unreachable
    }
  };

  const checkServerConnection = async (url: string): Promise<boolean> => {
    try {
      const baseUrl = url.replace(/\/+$/, '');
      const healthEndpoint = '/health';
      const checkUrl = `${baseUrl}${healthEndpoint}`;
      
      console.log('Checking connection to:', checkUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(checkUrl, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log('Server response not OK:', response.status);
        return false;
      }
      
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Connection check error:', error);
      return false;
    }
  };

  const switchToServer = async (serverId: string): Promise<boolean> => {
    const server = availableServers.find(s => s.id === serverId);
    if (!server) {
      console.error('Server not found:', serverId);
      return false;
    }

    console.log('Switching to server:', server.name, server.url);
    const isConnected = await checkServerConnection(server.url);
    if (isConnected) {
      setServerUrl(server.url);
      setCurrentServer(server);
      window.tradingServerUrl = server.url;
      window.serverRegion = server.region;
      Cookies.set(SERVER_URL_COOKIE, server.url, { expires: 30 });
      Cookies.set(SERVER_REGION_COOKIE, server.id, { expires: 30 });
      
      // Emit event to notify components of server change
      const event = new CustomEvent('serverChanged', { 
        detail: { server } 
      });
      window.dispatchEvent(event);
      
      console.log('Successfully switched to server:', server.name);
      return true;
    }
    
    console.error('Failed to connect to server:', server.name);
    return false;
  };

  const handleServerUrlSubmit = async (url: string) => {
    setIsChecking(true);
    setError(null);
    
    try {
      const isConnected = await checkServerConnection(url);
      if (isConnected) {
        // Create a custom server object for manual URLs
        const customServer: ServerInfo = {
          id: 'custom',
          name: 'Custom Server',
          url: url,
          region: 'Custom',
          flag: '🔧'
        };
        
        setCurrentServer(customServer);
        setServerUrl(url);
        window.tradingServerUrl = url;
        window.serverRegion = 'Custom';
        Cookies.set(SERVER_URL_COOKIE, url, { expires: 30 });
        Cookies.set(SERVER_REGION_COOKIE, 'custom', { expires: 30 });
      } else {
        setError('Could not connect to server. Please check the address and try again.');
        setServerUrl(null);
      }
    } catch (err) {
      setError('Connection error. Please verify the server is running and try again.');
      setServerUrl(null);
    } finally {
      setIsChecking(false);
    }
  };

  // Handler for completing the intro
  const handleIntroComplete = () => {
    console.log("Intro completed");
    Cookies.set(INTRO_COMPLETED_COOKIE, 'true', { expires: 365 });
    setShowIntroModal(false);
    
    // Ensure any modal-related elements are properly cleaned up
    cleanupModalElements();
  };

  // Handler for skipping the intro
  const handleIntroSkip = () => {
    console.log("Intro skipped");
    Cookies.set(INTRO_COMPLETED_COOKIE, 'true', { expires: 365 });
    setShowIntroModal(false);
    
    // Ensure any modal-related elements are properly cleaned up
    cleanupModalElements();
  };
  
  // Function to clean up any modal-related elements
  const cleanupModalElements = () => {
    // Force pointer-events to be enabled on the body and html
    document.body.style.pointerEvents = 'auto';
    document.documentElement.style.pointerEvents = 'auto';
    
    // Remove any lingering modal-related elements or styles
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) {
      modalRoot.style.pointerEvents = 'none';
    }
  };

  // Forcefully show the modal after a short delay
  const forceShowIntroModal = () => {
    // Make sure intro hasn't been completed
    const introCompleted = Cookies.get(INTRO_COMPLETED_COOKIE);
    if (!introCompleted) {
      console.log('Forcing intro modal to show...');
      setTimeout(() => {
        setShowIntroModal(true);
      }, 800); // Longer delay to ensure everything has loaded
    }
  };

  // Initialize server connection
  useEffect(() => {
    const initializeServer = async () => {
      console.log('Initializing server connection...');
      
      // Always discover all available servers first
      console.log('Discovering all available servers...');
      const allServersWithPing = await Promise.all(
        DEFAULT_REGIONAL_SERVERS.map(async (server) => {
          const isConnected = await checkServerConnection(server.url);
          if (!isConnected) {
            return { ...server, ping: Infinity };
          }
          
          const ping = await measurePing(server.url);
          console.log(`${server.name} (${server.region}): ${ping}ms`);
          return { ...server, ping };
        })
      );

      // Filter out unreachable servers and sort by ping
      const reachableServers = allServersWithPing.filter(server => server.ping !== Infinity);
      reachableServers.sort((a, b) => a.ping! - b.ping!);
      
      // Always set available servers regardless of saved server
      setAvailableServers(reachableServers);
      window.availableServers = reachableServers;
      
      console.log('Available servers discovered:', reachableServers.map(s => `${s.name} (${s.ping}ms)`));
      
      // Check if there's a saved server preference
      const savedUrl = Cookies.get(SERVER_URL_COOKIE);
      const savedRegion = Cookies.get(SERVER_REGION_COOKIE);
      
      if (savedUrl && savedRegion) {
        console.log('Found saved server:', savedUrl, savedRegion);
        // Check if the saved server is in our reachable servers
        const savedServer = reachableServers.find(s => s.id === savedRegion && s.url === savedUrl);
        
        if (savedServer) {
          console.log('Saved server is reachable, using it:', savedServer.name);
          setServerUrl(savedUrl);
          setCurrentServer(savedServer);
          window.tradingServerUrl = savedUrl;
          window.serverRegion = savedServer.region;
          setIsChecking(false);
          
          // Emit event to notify components
          const event = new CustomEvent('serverChanged', { 
            detail: { server: savedServer } 
          });
          window.dispatchEvent(event);
          
          forceShowIntroModal();
          return;
        } else {
          console.log('Saved server is not reachable or not in our list, finding best server...');
        }
      }

      // No saved server or it failed, use the best available one
      if (reachableServers.length > 0) {
        const bestServer = reachableServers[0];
        console.log('Using best available server:', bestServer.name);
        setServerUrl(bestServer.url);
        setCurrentServer(bestServer);
        window.tradingServerUrl = bestServer.url;
        window.serverRegion = bestServer.region;
        Cookies.set(SERVER_URL_COOKIE, bestServer.url, { expires: 30 });
        Cookies.set(SERVER_REGION_COOKIE, bestServer.id, { expires: 30 });
        setIsChecking(false);
        
        // Emit event to notify components
        const event = new CustomEvent('serverChanged', { 
          detail: { server: bestServer } 
        });
        window.dispatchEvent(event);
        
        forceShowIntroModal();
        console.log('Server initialization completed with:', bestServer.name);
        return;
      }
      
      console.error('No server connection found');
      setError('No server connection found. Please enter your server URL.');
      setIsChecking(false);
    };

    initializeServer();
  }, []);

  // Expose server switching function globally for the App component
  useEffect(() => {
    if (availableServers.length > 0) {
      window.availableServers = availableServers;
      window.switchServer = switchToServer;
    }
  }, [availableServers]);

  // Force modal to appear with keyboard shortcut for debugging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Shift + M to toggle modal for debugging
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        setShowIntroModal(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isChecking) {
    return <ServerCheckLoading />;
  }

  return (
    <ToastProvider>
      {serverUrl ? (
        <>
          {/* The App component without blur effect */}
          <div className={showIntroModal ? 'filter blur-sm' : ''} 
               style={{ pointerEvents: showIntroModal ? 'none' : 'auto' }}>
            <Suspense fallback={<ServerCheckLoading />}>
              <App />
            </Suspense>
          </div>
          
          {/* Our custom modal portal implementation */}
          <ModalPortal
            isOpen={showIntroModal}
            onComplete={handleIntroComplete}
            onSkip={handleIntroSkip}
          />
        </>
      ) : (
        <ServerConfig onSubmit={handleServerUrlSubmit} />
      )}
    </ToastProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);