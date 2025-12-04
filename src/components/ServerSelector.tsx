import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Globe, Activity } from 'lucide-react';
import type { ServerInfo } from '../utils/types';

const ServerSelector: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentServer, setCurrentServer] = useState<ServerInfo | null>(null);
    const [servers, setServers] = useState<ServerInfo[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const measurePing = async (url: string): Promise<number | undefined> => {
        const startTime = Date.now();
        try {
            const baseUrl = url.replace(/\/+$/, '');
            const healthEndpoint = '/v2/health';
            const checkUrl = `${baseUrl}${healthEndpoint}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(checkUrl, {
                signal: controller.signal,
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });

            clearTimeout(timeoutId);
            if (!response.ok) return undefined;
            return Date.now() - startTime;
        } catch {
            return undefined;
        }
    };

    useEffect(() => {
        // Initialize from window object
        let initialServers: ServerInfo[] = [];
        if (window.availableServers) {
            initialServers = window.availableServers;
            setServers(initialServers);
        }

        if (window.tradingServerUrl && window.availableServers) {
            const current = window.availableServers.find(s => s.url === window.tradingServerUrl);
            if (current) setCurrentServer(current);
        }

        // Measure pings if they are missing
        const checkPings = async (): Promise<void> => {
            if (initialServers.length === 0) return;

            const updates = await Promise.all(initialServers.map(async (s) => {
                // Always measure ping to ensure it's fresh, or at least if missing
                const ping = await measurePing(s.url);
                return { ...s, ping: ping ?? s.ping };
            }));

            setServers(updates);

            // Update current server reference
            if (window.tradingServerUrl) {
                const current = updates.find(s => s.url === window.tradingServerUrl);
                if (current) setCurrentServer(current);
            }
        };

        void checkPings();

        // Listen for server changes
        const handleServerChange = (event: CustomEvent<{ server: ServerInfo }>): void => {
            setCurrentServer(event.detail.server);
        };

        window.addEventListener('serverChanged', handleServerChange as EventListener);

        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent): void => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('serverChanged', handleServerChange as EventListener);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleServerSelect = async (server: ServerInfo): Promise<void> => {
        if (server.url === currentServer?.url) {
            setIsOpen(false);
            return;
        }

        if (window.switchServer) {
            await window.switchServer(server.id);
        }
        setIsOpen(false);
    };

    const getPingColor = (ping?: number): string => {
        if (!ping) return 'text-app-secondary-60';
        if (ping < 100) return 'text-success';
        if (ping < 200) return 'text-warning';
        return 'text-error';
    };

    if (!currentServer) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-app-primary-80-alpha transition-all duration-200 border border-transparent hover:border-app-primary-20"
            >
                <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1">
                        <Activity size={8} className={getPingColor(currentServer.ping)} />
                        <span className={`text-[12px] font-mono ${getPingColor(currentServer.ping)}`}>
                            {currentServer.ping ? `${Math.round(currentServer.ping)}ms` : '--'}
                        </span>
                    </div>
                </div>
                <ChevronDown
                    size={12}
                    className={`text-app-secondary-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-app-secondary border border-app-primary-20 rounded shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-app-primary-10 bg-app-primary-10">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-app-secondary uppercase tracking-widest">
                            <Globe size={10} />
                            SELECT SERVER
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {servers.map((server) => (
                            <button
                                key={server.id}
                                onClick={() => handleServerSelect(server)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-all duration-200 hover:bg-app-primary-10 ${currentServer.id === server.id ? 'bg-app-primary-05' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{server.flag}</span>
                                    <span className="text-xs font-mono text-app-secondary">{server.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className={`text-[10px] font-mono ${getPingColor(server.ping)}`}>
                                        {server.ping ? `${Math.round(server.ping)}ms` : '--'}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServerSelector;
