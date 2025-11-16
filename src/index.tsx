// Apply passive touch event patch before any other imports
import './utils/passiveTouchPatch';

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Buffer } from 'buffer';
import Cookies from 'js-cookie';
window.Buffer = Buffer;
import { brand } from './config/brandConfig';
import type { WindowWithToast, ServerInfo } from './types/api';
import { AppContextProvider } from './contexts/AppContext';

// Dynamic CSS loading based on brand configuration using Vite's import
const loadBrandCSS = async (): Promise<void> => {
  try {
    // Use dynamic import for CSS files in Vite based on theme name
    await import(`./styles/${brand.theme.name}.css`);
  } catch (error) {
    console.error('Failed to load brand CSS:', error);
    // Fallback to globals.css
    await import('./styles/green.css');
  }
};

// Load brand CSS immediately
void loadBrandCSS();
import ToastProvider from "./components/Notifications";
import { useToast } from "./components/useToast";
import BeRightBack from './components/BeRightBack';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load page components
const App = lazy(() => import('./App'));
const Homepage = lazy(() => import('./homepage'));
const AutomatePage = lazy(() => import('./automate/AutomatePage'));
const DeployPage = lazy(() => import('./pages/DeployPage'));
const BurnPage = lazy(() => import('./pages/BurnPage'));
const WalletsPage = lazy(() => import('./pages/WalletsPage').then(module => ({ default: module.WalletsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));

declare global {
  interface Window {
    tradingServerUrl: string;
    Buffer: typeof Buffer;
    serverRegion: string;
    availableServers: ServerInfo[];
    switchServer: (serverId: string) => Promise<boolean>;
  }
}

const SERVER_URL_COOKIE = 'trading_server_url';
const SERVER_REGION_COOKIE = 'trading_server_region';

const DEFAULT_REGIONAL_SERVERS: ServerInfo[] = [
  { id: 'us', name: 'United States', url: 'https://us.fury.bot/', region: 'US', flag: '🇺🇸' },
  { id: 'de', name: 'Germany', url: 'https://de.fury.bot/', region: 'DE', flag: '🇩🇪' },
];

export const ServerCheckLoading = (): JSX.Element => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-app-primary">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 spinner-app-primary"></div>
    </div>
  );
};

export const Root = (): JSX.Element => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [availableServers, setAvailableServers] = useState<ServerInfo[]>([]);
  const [isChecking, setIsChecking] = useState(true);

  // Disable right-click and text selection globally
  useEffect((): (() => void) => {
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
    const handleContextMenu = (e: MouseEvent): boolean => {
      e.preventDefault();
      return false;
    };

    // Disable text selection with mouse
    const handleSelectStart = (e: Event): boolean => {
      const target = e.target as HTMLElement;
      // Allow selection in input fields and textareas
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return true;
      }
      e.preventDefault();
      return false;
    };

    // Disable drag and drop
    const handleDragStart = (e: DragEvent): boolean => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    // Cleanup function
    return (): void => {
      // Safely remove style element if it's still a child
      if (style.parentNode === document.head) {
        document.head.removeChild(style);
      }
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
      const timeoutId = setTimeout((): void => controller.abort(), 5000);

      await fetch(checkUrl, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      return Date.now() - startTime;
    } catch (ignore) {
      return Infinity; // Return infinite ping if unreachable
    }
  };

  const checkServerConnection = async (url: string): Promise<boolean> => {
    try {
      const baseUrl = url.replace(/\/+$/, '');
      const healthEndpoint = '/health';
      const checkUrl = `${baseUrl}${healthEndpoint}`;
      
      console.info('Checking connection to:', checkUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout((): void => controller.abort(), 3000);

      const response = await fetch(checkUrl, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.info('Server response not OK:', response.status);
        return false;
      }
      
      const data = await response.json() as { status?: string };
      return data.status === 'healthy';
    } catch (error) {
      console.error('Connection check error:', error);
      return false;
    }
  };

  const switchToServer = useCallback(async (serverId: string): Promise<boolean> => {
    const server = availableServers.find((s): boolean => s.id === serverId);
    if (!server) {
      console.error('Server not found:', serverId);
      return false;
    }

    console.info('Switching to server:', server.name, server.url);
    const isConnected = await checkServerConnection(server.url);
    if (isConnected) {
      setServerUrl(server.url);
      window.tradingServerUrl = server.url;
      window.serverRegion = server.region;
      Cookies.set(SERVER_URL_COOKIE, server.url, { expires: 30 });
      Cookies.set(SERVER_REGION_COOKIE, server.id, { expires: 30 });
      
      // Emit event to notify components of server change
      const event = new CustomEvent('serverChanged', { 
        detail: { server } 
      });
      window.dispatchEvent(event);
      
      console.info('Successfully switched to server:', server.name);
      return true;
    }
    
    console.error('Failed to connect to server:', server.name);
    return false;
  }, [availableServers]);


  // Initialize server connection
  useEffect((): void => {
    const initializeServer = async (): Promise<void> => {
      console.info('Initializing server connection...');
      
      // Always discover all available servers first
      console.info('Discovering all available servers...');
      const allServersWithPing = await Promise.all(
        DEFAULT_REGIONAL_SERVERS.map(async (server): Promise<ServerInfo> => {
          const isConnected = await checkServerConnection(server.url);
          if (!isConnected) {
            return { ...server, ping: Infinity };
          }
          
          const ping = await measurePing(server.url);
          console.info(`${server.name} (${server.region}): ${ping}ms`);
          return { ...server, ping };
        })
      );

      // Filter out unreachable servers and sort by ping
      const reachableServers = allServersWithPing.filter((server): boolean => server.ping !== Infinity);
      reachableServers.sort((a, b): number => a.ping! - b.ping!);
      
      // Always set available servers regardless of saved server
      setAvailableServers(reachableServers);
      window.availableServers = reachableServers;
      
      console.info('Available servers discovered:', reachableServers.map(s => `${s.name} (${s.ping}ms)`));
      
      // Check if there's a saved server preference
      const savedUrl = Cookies.get(SERVER_URL_COOKIE);
      const savedRegion = Cookies.get(SERVER_REGION_COOKIE);
      
      if (savedUrl && savedRegion) {
        console.info('Found saved server:', savedUrl, savedRegion);
        // Check if the saved server is in our reachable servers
        const savedServer = reachableServers.find((s): boolean => s.id === savedRegion && s.url === savedUrl);
        
        if (savedServer) {
          console.info('Saved server is reachable, using it:', savedServer.name);
          setServerUrl(savedUrl);
          window.tradingServerUrl = savedUrl;
          window.serverRegion = savedServer.region;
          setIsChecking(false);
          
          // Emit event to notify components
          const event = new CustomEvent('serverChanged', { 
            detail: { server: savedServer } 
          });
          window.dispatchEvent(event);
          
          return;
        } else {
          console.info('Saved server is not reachable or not in our list, finding best server...');
        }
      }

      // No saved server or it failed, use the best available one
      if (reachableServers.length > 0) {
        const bestServer = reachableServers[0];
        console.info('Using best available server:', bestServer.name);
        setServerUrl(bestServer.url);
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
        
        console.info('Server initialization completed with:', bestServer.name);
        return;
      }
      
      console.error('No server connection found');
      setIsChecking(false);
    };

    void initializeServer();
  }, []);

  // Expose server switching function globally for the App component
  useEffect((): void => {
    if (availableServers.length > 0) {
      window.availableServers = availableServers;
      window.switchServer = switchToServer;
    }
  }, [availableServers, switchToServer]);

  // Toast wrapper
  const ToastWrapper: React.FC<{ children: React.ReactNode }> = ({ children }): JSX.Element => {
    const { showToast } = useToast();
    
    // Expose showToast globally for modals
    useEffect((): (() => void) => {
      (window as WindowWithToast).showToast = showToast;
      return (): void => {
        delete (window as WindowWithToast).showToast;
      };
    }, [showToast]);
    
    return <>{children}</>;
  };



  if (isChecking) {
    return <ServerCheckLoading />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <ToastProvider>
          <ToastWrapper>
            <AppContextProvider showToast={(window as WindowWithToast).showToast || (() => {})}>
              {serverUrl ? (
                <Suspense fallback={<ServerCheckLoading />}>
                  <Routes>
                    {/* Homepage */}
                    <Route path="/" element={<Homepage />} />
                    
                    {/* Main app routes */}
                    <Route path="/holdings" element={<App />} />
                    <Route path="/monitor" element={<App />} />
                    <Route path="/token/:tokenAddress" element={<App />} />
                    
                    {/* Feature pages */}
                    <Route path="/automate" element={<AutomatePage />} />
                    <Route path="/deploy" element={<DeployPage />} />
                    <Route path="/burn" element={<BurnPage />} />
                    <Route path="/wallets" element={<WalletsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    
                    {/* Fallback - redirect to homepage */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              ) : (
                <BeRightBack 
                  onOpenWallets={() => window.location.href = '/wallets'}
                  onOpenSettings={() => {
                    window.location.href = '/settings';
                  }}
                />
              )}
            </AppContextProvider>
          </ToastWrapper>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);