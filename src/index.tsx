import React, { Component, type ErrorInfo, useState, useEffect, useCallback, Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Buffer } from "buffer";
import Cookies from "js-cookie";
window.Buffer = Buffer;
import { brand } from "./utils/constants";
import type { WindowWithToast, ServerInfo } from "./utils/types";
import { AppContextProvider } from "./contexts/AppContext";
import { IframeStateProvider } from "./contexts/IframeStateContext";

// Dynamic CSS loading based on brand configuration using Vite's import
const loadBrandCSS = async (): Promise<void> => {
  try {
    // Use dynamic import for CSS files in Vite based on theme name
    await import(`../${brand.theme.name}.css`);
  } catch {
    // Fallback to globals.css
    await import("../green.css");
  }
};

// Load brand CSS immediately
void loadBrandCSS();
import ToastProvider from "./components/Notifications";
import { useToast } from "./components/Notifications";
import { Wallet, Settings, AlertTriangle, Home, RefreshCw } from 'lucide-react';

// Lazy load page components
const App = lazy(() => import("./App"));
const Homepage = lazy(() => import("./pages/HomePage"));
const DeployPage = lazy(() => import("./pages/DeployPage"));
const WalletsPage = lazy(() =>
  import("./pages/WalletsPage").then((module) => ({
    default: module.WalletsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);

// Preload function for App component (used by /holdings route)
const preloadApp = (): void => {
  void import("./App");
};

// --- BeRightBack component (inlined) ---

interface BeRightBackProps {
  onOpenWallets: () => void;
  onOpenSettings: () => void;
}

const BeRightBack: React.FC<BeRightBackProps> = ({ onOpenWallets, onOpenSettings }) => {
  return (
    <div className="fixed inset-0 bg-app-primary flex items-center justify-center p-4 overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-grid opacity-10"></div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-2xl w-full">
        {/* Glowing title */}
        <h1
          className="text-6xl md:text-8xl font-bold mb-6 text-app-primary"
          style={{
            textShadow: '0 0 10px rgba(2, 179, 109, 0.5), 0 0 20px rgba(2, 179, 109, 0.3), 0 0 30px rgba(2, 179, 109, 0.2)'
          }}
        >
          BE RIGHT BACK
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-app-secondary mb-8">
          We're currently performing maintenance
        </p>

        {/* Animated loading indicator */}
        <div className="flex justify-center items-center mb-8">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-t-2 spinner-app-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-app-primary-color rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="flex justify-center gap-4 text-app-primary-40 text-2xl mb-8">
          <span className="animate-pulse" style={{ animationDelay: '0s' }}>▮</span>
          <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>▮</span>
          <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>▮</span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button
            onClick={onOpenWallets}
            className="px-6 py-3 bg-app-primary-color hover:bg-app-primary-dark text-black font-bold rounded btn font-mono tracking-wider transition-all duration-300 flex items-center gap-2"
          >
            <Wallet size={18} />
            WALLETS
          </button>
          <button
            onClick={onOpenSettings}
            className="px-6 py-3 bg-app-tertiary border border-app-primary-40 hover-border-primary text-app-primary font-bold rounded btn font-mono tracking-wider transition-all duration-300 flex items-center gap-2"
          >
            <Settings size={18} />
            SETTINGS
          </button>
        </div>

        {/* Bottom message */}
        <p className="text-app-muted text-sm md:text-base">
          Please check back soon
        </p>
      </div>

      {/* Scanline effect overlay */}
      <div className="scanline absolute inset-0 pointer-events-none"></div>
    </div>
  );
};

// --- ErrorBoundary component (inlined) ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.resetError);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-app-primary flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-secondary border border-app-primary-40 rounded-lg p-6 shadow-xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <h1 className="text-xl font-bold text-app-primary text-center mb-2 font-mono">
              Something went wrong
            </h1>

            <p className="text-sm text-app-tertiary text-center mb-6 font-mono">
              An unexpected error occurred. Please try refreshing the page or return to the homepage.
            </p>

            {this.state.error && import.meta.env.DEV && (
              <div className="mb-6 p-4 bg-app-primary rounded border border-app-primary-40 overflow-auto max-h-48">
                <p className="text-xs font-mono text-red-400 mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs font-mono text-app-secondary whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-app-primary-10 hover:bg-app-primary-20 border border-app-primary-40 rounded-lg transition-colors font-mono text-sm"
              >
                <Home size={16} />
                <span>Go Home</span>
              </button>

              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-app-primary-color hover:bg-app-primary-dark text-app-primary border border-app-primary rounded-lg transition-colors font-mono text-sm"
              >
                <RefreshCw size={16} />
                <span>Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

declare global {
  interface Window {
    tradingServerUrl: string;
    Buffer: typeof Buffer;
    serverRegion: string;
    availableServers: ServerInfo[];
    switchServer: (serverId: string) => Promise<boolean>;
    refreshServerPings?: () => Promise<void>;
  }
}

const SERVER_URL_COOKIE = "trading_server_url";
const SERVER_REGION_COOKIE = "trading_server_region";

const DEFAULT_REGIONAL_SERVERS: ServerInfo[] = [
  {
    id: "de",
    name: "Germany",
    url: "https://de.raze.sh/",
    region: "DE",
    flag: "🇩🇪",
  },
  {
    id: "us",
    name: "United States",
    url: "https://us.raze.sh/",
    region: "US",
    flag: "🇺🇸",
  },
  {
    id: "jp",
    name: "Japan",
    url: "https://jp.raze.sh/",
    region: "JP",
    flag: "🇯🇵",
  },
];

export const ServerCheckLoading = (): JSX.Element => {
  const fullText = 'sol.raze.bot';
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 100);
    return () => clearInterval(typeInterval);
  }, []);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div className="launch-animation">
      <h1
        style={{
          fontFamily: "'Instrument Serif', serif",
          color: '#ffffff',
          textShadow: '0 0 30px rgba(2, 179, 109, 0.3), 0 0 10px rgba(255, 255, 255, 0.1)',
          fontSize: 'clamp(3rem, 8vw, 7rem)',
          fontWeight: 'bold',
          letterSpacing: '-0.02em',
        }}
      >
        <span style={{ position: 'relative' }}>
          {displayedText}
          <span
            style={{
              display: 'inline-block',
              width: '4px',
              height: '0.9em',
              marginLeft: '4px',
              backgroundColor: '#02b36d',
              boxShadow: '0 0 10px rgba(2, 179, 109, 0.8), 0 0 20px rgba(2, 179, 109, 0.4)',
              opacity: showCursor ? 1 : 0,
              transition: 'opacity 100ms',
              verticalAlign: 'text-bottom',
            }}
          />
        </span>
      </h1>
      <div className="progress-container">
        <div className="progress-bar"></div>
      </div>
    </div>
  );
};

// Defined OUTSIDE Root to prevent full child-tree remounts on Root re-renders
const ToastWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}): JSX.Element => {
  const { showToast } = useToast();

  useEffect((): (() => void) => {
    (window as WindowWithToast).showToast = showToast;
    return (): void => {
      delete (window as WindowWithToast).showToast;
    };
  }, [showToast]);

  return <>{children}</>;
};

export const Root = (): JSX.Element => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [availableServers, setAvailableServers] = useState<ServerInfo[]>([]);
  const [isChecking, setIsChecking] = useState(true);

  // Apply custom scrollbar styles and disable right-click/text selection globally
  useEffect((): (() => void) => {
    // Wait for CSS to load before injecting scrollbar styles
    const applyStyles = (): void => {
      // Check if CSS variables are available, if not use fallback values
      const testEl = document.createElement("div");
      document.body.appendChild(testEl);
      const computedStyle = getComputedStyle(testEl);
      const scrollbarThumb =
        computedStyle.getPropertyValue("--color-scrollbar-thumb").trim() ||
        "rgba(11, 82, 46, 0.5)";
      const scrollbarTrack =
        computedStyle.getPropertyValue("--color-scrollbar-track").trim() ||
        "transparent";
      document.body.removeChild(testEl);

      // Add global styles to disable text selection and apply custom scrollbar
      const style = document.createElement("style");
      style.id = "custom-scrollbar-styles";
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

        /* Ensure custom scrollbar is applied globally - same as Wallets.tsx and green.css */
        * {
          scrollbar-width: thin !important;
          scrollbar-color: ${scrollbarThumb} ${scrollbarTrack} !important;
        }

        *::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
          background-color: ${scrollbarTrack} !important;
        }

        *::-webkit-scrollbar-track {
          background-color: ${scrollbarTrack} !important;
          border-radius: 8px !important;
        }

        *::-webkit-scrollbar-thumb {
          background-color: ${scrollbarThumb} !important;
          border-radius: 8px !important;
          transition: background-color 0.2s !important;
        }

        *::-webkit-scrollbar-thumb:hover {
          background-color: ${scrollbarThumb} !important;
        }

        /* Ensure html and body also have custom scrollbar - highest priority */
        html {
          scrollbar-width: thin !important;
          scrollbar-color: ${scrollbarThumb} ${scrollbarTrack} !important;
          overflow-x: hidden !important;
        }

        body {
          scrollbar-width: thin !important;
          scrollbar-color: ${scrollbarThumb} ${scrollbarTrack} !important;
          overflow-x: hidden !important;
        }

        html::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
          background-color: ${scrollbarTrack} !important;
        }

        html::-webkit-scrollbar-track {
          background-color: ${scrollbarTrack} !important;
          border-radius: 8px !important;
        }

        html::-webkit-scrollbar-thumb {
          background-color: ${scrollbarThumb} !important;
          border-radius: 8px !important;
          transition: background-color 0.2s !important;
        }

        html::-webkit-scrollbar-thumb:hover {
          background-color: ${scrollbarThumb} !important;
        }

        body::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
          background-color: ${scrollbarTrack} !important;
        }

        body::-webkit-scrollbar-track {
          background-color: ${scrollbarTrack} !important;
          border-radius: 8px !important;
        }

        body::-webkit-scrollbar-thumb {
          background-color: ${scrollbarThumb} !important;
          border-radius: 8px !important;
          transition: background-color 0.2s !important;
        }

        body::-webkit-scrollbar-thumb:hover {
          background-color: ${scrollbarThumb} !important;
        }

        /* Ensure #root also has custom scrollbar */
        #root {
          scrollbar-width: thin !important;
          scrollbar-color: ${scrollbarThumb} ${scrollbarTrack} !important;
        }

        #root::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
          background-color: ${scrollbarTrack} !important;
        }

        #root::-webkit-scrollbar-track {
          background-color: ${scrollbarTrack} !important;
          border-radius: 8px !important;
        }

        #root::-webkit-scrollbar-thumb {
          background-color: ${scrollbarThumb} !important;
          border-radius: 8px !important;
          transition: background-color 0.2s !important;
        }

        #root::-webkit-scrollbar-thumb:hover {
          background-color: ${scrollbarThumb} !important;
        }
      `;

      // Remove existing style if present
      const existingStyle = document.getElementById("custom-scrollbar-styles");
      if (existingStyle) {
        existingStyle.remove();
      }

      document.head.appendChild(style);
    };

    // Apply styles immediately and also after a short delay to ensure CSS is loaded
    applyStyles();
    const timeoutId = setTimeout(applyStyles, 100);

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent): boolean => {
      e.preventDefault();
      return false;
    };

    // Disable text selection with mouse
    const handleSelectStart = (e: Event): boolean => {
      const target = e.target as HTMLElement;
      // Allow selection in input fields and textareas
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
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
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("dragstart", handleDragStart);

    // Cleanup function
    return (): void => {
      clearTimeout(timeoutId);
      // Safely remove style element if it's still a child
      const styleElement = document.getElementById("custom-scrollbar-styles");
      if (styleElement && styleElement.parentNode === document.head) {
        document.head.removeChild(styleElement);
      }
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, []);

  const checkServerConnection = async (url: string): Promise<boolean> => {
    try {
      const baseUrl = url.replace(/\/+$/, "");
      const healthEndpoint = "/health";
      const checkUrl = `${baseUrl}${healthEndpoint}`;

      const controller = new AbortController();
      const timeoutId = setTimeout((): void => controller.abort(), 3000);

      const response = await fetch(checkUrl, {
        signal: controller.signal,
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as { status?: string };
      return data.status === "healthy";
    } catch {
      return false;
    }
  };

  const switchToServer = useCallback(
    async (serverId: string): Promise<boolean> => {
      const server = availableServers.find((s): boolean => s.id === serverId);
      if (!server) {
        return false;
      }

      const isConnected = await checkServerConnection(server.url);
      if (isConnected) {
        setServerUrl(server.url);
        window.tradingServerUrl = server.url;
        window.serverRegion = server.region;
        Cookies.set(SERVER_URL_COOKIE, server.url, { expires: 30 });
        Cookies.set(SERVER_REGION_COOKIE, server.id, { expires: 30 });

        // Emit event to notify components of server change
        const event = new CustomEvent("serverChanged", {
          detail: { server },
        });
        window.dispatchEvent(event);

        return true;
      }

      return false;
    },
    [availableServers],
  );

  // Initialize server connection
  useEffect((): void => {
    const initializeServer = async (): Promise<void> => {
      // Discover all available servers — reuse the health check response time as ping
      const allServersWithPing = await Promise.all(
        DEFAULT_REGIONAL_SERVERS.map(async (server): Promise<ServerInfo> => {
          const startTime = Date.now();
          const isConnected = await checkServerConnection(server.url);
          if (!isConnected) {
            return { ...server, ping: Infinity };
          }
          return { ...server, ping: Date.now() - startTime };
        }),
      );

      // Filter out unreachable servers and sort by ping
      const reachableServers = allServersWithPing.filter(
        (server): boolean => server.ping !== Infinity,
      );
      reachableServers.sort((a, b): number => a.ping! - b.ping!);

      // Always set available servers regardless of saved server
      setAvailableServers(reachableServers);
      window.availableServers = reachableServers;

      // Check if there's a saved server preference
      const savedUrl = Cookies.get(SERVER_URL_COOKIE);
      const savedRegion = Cookies.get(SERVER_REGION_COOKIE);

      if (savedUrl && savedRegion) {
        // Check if the saved server is in our reachable servers
        const savedServer = reachableServers.find(
          (s): boolean => s.id === savedRegion && s.url === savedUrl,
        );

        if (savedServer) {
          setServerUrl(savedUrl);
          window.tradingServerUrl = savedUrl;
          window.serverRegion = savedServer.region;
          setIsChecking(false);

          // Emit event to notify components
          const event = new CustomEvent("serverChanged", {
            detail: { server: savedServer },
          });
          window.dispatchEvent(event);

          return;
        }
      }

      // No saved server or it failed, use the best available one
      if (reachableServers.length > 0) {
        const bestServer = reachableServers[0];
        setServerUrl(bestServer.url);
        window.tradingServerUrl = bestServer.url;
        window.serverRegion = bestServer.region;
        Cookies.set(SERVER_URL_COOKIE, bestServer.url, { expires: 30 });
        Cookies.set(SERVER_REGION_COOKIE, bestServer.id, { expires: 30 });
        setIsChecking(false);

        // Emit event to notify components
        const event = new CustomEvent("serverChanged", {
          detail: { server: bestServer },
        });
        window.dispatchEvent(event);

        return;
      }

      setIsChecking(false);
    };

    void initializeServer();
  }, []);

  // Expose server switching and ping refresh functions globally
  useEffect((): void => {
    if (availableServers.length > 0) {
      window.availableServers = availableServers;
      window.switchServer = switchToServer;
    }
  }, [availableServers, switchToServer]);

  useEffect((): (() => void) => {
    const refreshPings = async (): Promise<void> => {
      const allServersWithPing = await Promise.all(
        DEFAULT_REGIONAL_SERVERS.map(async (server): Promise<ServerInfo> => {
          const startTime = Date.now();
          const isConnected = await checkServerConnection(server.url);
          if (!isConnected) return { ...server, ping: Infinity };
          return { ...server, ping: Date.now() - startTime };
        }),
      );
      const sorted = allServersWithPing.sort((a, b) => a.ping! - b.ping!);
      setAvailableServers(sorted);
      window.availableServers = sorted;
      window.dispatchEvent(new CustomEvent("serverChanged", { detail: {} }));
    };
    window.refreshServerPings = refreshPings;
    return (): void => { delete window.refreshServerPings; };
  }, []);

  // Preload App component (/holdings route) after server check completes for faster navigation
  useEffect((): (() => void) | void => {
    if (!isChecking && serverUrl) {
      // Small delay to prioritize initial render, then preload in background
      const timeoutId = setTimeout(preloadApp, 100);
      return (): void => clearTimeout(timeoutId);
    }
  }, [isChecking, serverUrl]);

  if (isChecking) {
    return <ServerCheckLoading />;
  }

  return (
    <div className="h-screen w-screen">
      <ErrorBoundary>
        <BrowserRouter
          future={{ v7_relativeSplatPath: true, v7_startTransition: false }}
        >
          <ToastProvider>
            <ToastWrapper>
              <AppContextProvider
                showToast={(window as WindowWithToast).showToast || (() => { })}
              >
                <IframeStateProvider>
                    <Suspense fallback={<ServerCheckLoading />}>
                      <Routes>
                        {/* Always accessible, even in BRB mode */}
                        <Route path="/wallets" element={<WalletsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />

                        {serverUrl ? (
                          <>
                            {/* Homepage */}
                            <Route path="/" element={<Homepage />} />

                            {/* Main app routes */}
                            <Route path="/holdings" element={<App />} />
                            <Route path="/monitor" element={<App />} />
                            <Route path="/tokens/:tokenAddress" element={<App />} />

                            {/* Feature pages */}
                            <Route path="/deploy" element={<DeployPage />} />

                            {/* Fallback - redirect to homepage */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </>
                        ) : (
                          <Route
                            path="*"
                            element={
                              <BeRightBack
                                onOpenWallets={() => (window.location.href = "/wallets")}
                                onOpenSettings={() => {
                                  window.location.href = "/settings";
                                }}
                              />
                            }
                          />
                        )}
                      </Routes>
                    </Suspense>
                </IframeStateProvider>
              </AppContextProvider>
            </ToastWrapper>
          </ToastProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  );
};

// Remove the initial HTML loader once React mounts
const removeInitialLoader = (): void => {
  const initialLoader = document.getElementById("initial-loader");
  const initialStyles = document.getElementById("initial-loader-styles");
  if (initialLoader) {
    initialLoader.remove();
  }
  if (initialStyles) {
    initialStyles.remove();
  }
};

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);

// Remove the static HTML loader after React has mounted
removeInitialLoader();
