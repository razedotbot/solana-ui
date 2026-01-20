import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Buffer } from "buffer";
import Cookies from "js-cookie";
window.Buffer = Buffer;
import { brand } from "./utils/brandConfig";
import logoImage from "./logo.png";
import type { WindowWithToast, ServerInfo } from "./utils/types";
import { AppContextProvider } from "./contexts";
import { IframeStateProvider } from "./contexts/IframeStateContext";

// Dynamic CSS loading based on brand configuration using Vite's import
const loadBrandCSS = async (): Promise<void> => {
  try {
    // Use dynamic import for CSS files in Vite based on theme name
    await import(`../${brand.theme.name}.css`);
  } catch (error) {
    console.error("Failed to load brand CSS:", error);
    // Fallback to globals.css
    await import("../green.css");
  }
};

// Load brand CSS immediately
void loadBrandCSS();
import ToastProvider from "./components/Notifications";
import { useToast } from "./utils/hooks";
import BeRightBack from "./components/BeRightBack";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load page components
const App = lazy(() => import("./App"));
const Homepage = lazy(() => import("./pages/HomePage"));
const AutomatePage = lazy(() => import("./pages/AutomatePage"));
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

declare global {
  interface Window {
    tradingServerUrl: string;
    Buffer: typeof Buffer;
    serverRegion: string;
    availableServers: ServerInfo[];
    switchServer: (serverId: string) => Promise<boolean>;
  }
}

const SERVER_URL_COOKIE = "trading_server_url";
const SERVER_REGION_COOKIE = "trading_server_region";

// TEMPORARY: Set to true to disable server status check
const DISABLE_SERVER_CHECK = false;

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
];

export const ServerCheckLoading = (): JSX.Element => {
  return (
    <div className="launch-animation">
      <div className="logo-container">
        <div className="corner corner-tl"></div>
        <div className="corner corner-tr"></div>
        <div className="corner corner-bl"></div>
        <div className="corner corner-br"></div>
        <div className="logo-orbit">
          <div className="orbit-dot dot-1"></div>
          <div className="orbit-dot dot-2"></div>
          <div className="orbit-dot dot-3"></div>
          <div className="orbit-dot dot-4"></div>
        </div>
        <div className="logo-hexagon">
          <img src={logoImage} alt="Logo" />
        </div>
      </div>
      <div className="loading-text">Initializing</div>
      <div className="progress-container">
        <div className="progress-bar"></div>
      </div>
    </div>
  );
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
      const healthEndpoint = "/v2/health";
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
    } catch (ignore) {
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
      const measurePing = async (url: string): Promise<number> => {
        const startTime = Date.now();
        try {
          const baseUrl = url.replace(/\/+$/, "");
          const healthEndpoint = "/v2/health";
          const checkUrl = `${baseUrl}${healthEndpoint}`;

          const controller = new AbortController();
          const timeoutId = setTimeout((): void => controller.abort(), 5000);

          await fetch(checkUrl, {
            signal: controller.signal,
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });

          clearTimeout(timeoutId);
          return Date.now() - startTime;
        } catch (ignore) {
          return Infinity; // Return infinite ping if unreachable
        }
      };

      const measureAveragePing = async (
        url: string,
        samples: number = 3,
      ): Promise<number> => {
        const pings: number[] = [];

        for (let i = 0; i < samples; i++) {
          const ping = await measurePing(url);
          if (ping === Infinity) {
            return Infinity; // If any ping fails, return Infinity
          }
          pings.push(ping);
        }

        // Calculate average of all ping measurements
        const average =
          pings.reduce((sum, ping) => sum + ping, 0) / pings.length;
        return average;
      };

      // If server check is disabled, use saved server or default
      if (DISABLE_SERVER_CHECK) {
        const savedUrl = Cookies.get(SERVER_URL_COOKIE);
        const savedRegion = Cookies.get(SERVER_REGION_COOKIE);

        if (savedUrl && savedRegion) {
          const savedServer = DEFAULT_REGIONAL_SERVERS.find(
            (s): boolean => s.id === savedRegion && s.url === savedUrl,
          );
          if (savedServer) {
            setServerUrl(savedUrl);
            window.tradingServerUrl = savedUrl;
            window.serverRegion = savedServer.region;
            setAvailableServers([savedServer]);
            window.availableServers = [savedServer];
            setIsChecking(false);

            const event = new CustomEvent("serverChanged", {
              detail: { server: savedServer },
            });
            window.dispatchEvent(event);
            return;
          }
        }

        // Use first default server if no saved preference
        const defaultServer = DEFAULT_REGIONAL_SERVERS[0];
        setServerUrl(defaultServer.url);
        window.tradingServerUrl = defaultServer.url;
        window.serverRegion = defaultServer.region;
        setAvailableServers(DEFAULT_REGIONAL_SERVERS);
        window.availableServers = DEFAULT_REGIONAL_SERVERS;
        setIsChecking(false);

        const event = new CustomEvent("serverChanged", {
          detail: { server: defaultServer },
        });
        window.dispatchEvent(event);
        return;
      }

      // Always discover all available servers first
      const allServersWithPing = await Promise.all(
        DEFAULT_REGIONAL_SERVERS.map(async (server): Promise<ServerInfo> => {
          const isConnected = await checkServerConnection(server.url);
          if (!isConnected) {
            return { ...server, ping: Infinity };
          }

          const ping = await measureAveragePing(server.url, 3);
          return { ...server, ping };
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

  // Expose server switching function globally for the App component
  useEffect((): void => {
    if (availableServers.length > 0) {
      window.availableServers = availableServers;
      window.switchServer = switchToServer;
    }
  }, [availableServers, switchToServer]);

  // Preload App component (/holdings route) after server check completes for faster navigation
  useEffect((): (() => void) | void => {
    if (!isChecking && serverUrl) {
      // Small delay to prioritize initial render, then preload in background
      const timeoutId = setTimeout(preloadApp, 100);
      return (): void => clearTimeout(timeoutId);
    }
  }, [isChecking, serverUrl]);

  // Toast wrapper
  const ToastWrapper: React.FC<{ children: React.ReactNode }> = ({
    children,
  }): JSX.Element => {
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
    <div className="h-screen w-screen">
      <ErrorBoundary>
        <BrowserRouter
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          <ToastProvider>
            <ToastWrapper>
              <AppContextProvider
                showToast={(window as WindowWithToast).showToast || (() => {})}
              >
                <IframeStateProvider>
                  {serverUrl ? (
                    <Suspense fallback={<ServerCheckLoading />}>
                      <Routes>
                        {/* Homepage */}
                        <Route path="/" element={<Homepage />} />

                        {/* Main app routes */}
                        <Route path="/holdings" element={<App />} />
                        <Route path="/monitor" element={<App />} />
                        <Route path="/tokens/:tokenAddress" element={<App />} />

                        {/* Feature pages */}
                        <Route path="/automate" element={<AutomatePage />} />
                        <Route path="/deploy" element={<DeployPage />} />
                        <Route path="/wallets" element={<WalletsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />

                        {/* Fallback - redirect to homepage */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  ) : (
                    <BeRightBack
                      onOpenWallets={() => (window.location.href = "/wallets")}
                      onOpenSettings={() => {
                        window.location.href = "/settings";
                      }}
                    />
                  )}
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
