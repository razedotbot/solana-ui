import React, { useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Blocks, Wallet, TrendingUp, BookOpen, Menu, X, Home } from 'lucide-react';
import { brand } from '../utils/constants';

interface HeaderProps {
    tokenAddress?: string;
}

export const HorizontalHeader: React.FC<HeaderProps> = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogoClick = useCallback(() => {
        window.open(`https://${brand.domain}`, '_blank', 'noopener,noreferrer');
    }, []);

    const isActive = (path: string): boolean => {
        return location.pathname === path;
    };

    const getLinkClassName = (path: string, isProminent: boolean = false): string => {
        const active = isActive(path);
        
        if (isProminent) {
            return `flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-300 font-mono text-sm font-bold tracking-wider uppercase
                ${active
                    ? 'bg-gradient-to-r from-app-primary-color to-app-primary-dark text-app-primary border border-app-primary shadow-[0_0_20px_rgba(2,179,109,0.5)] scale-105'
                    : 'bg-gradient-to-r from-primary-20 to-primary-30 text-app-primary border border-app-primary-60 shadow-[0_0_15px_rgba(2,179,109,0.3)] hover:shadow-[0_0_25px_rgba(2,179,109,0.5)] hover:scale-105 hover:border-app-primary'
                }`;
        }
        
        return `flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-mono text-sm font-medium tracking-wider uppercase
            ${active
                ? 'bg-primary-20 text-app-primary border border-app-primary-40 shadow-[0_0_10px_rgba(2,179,109,0.2)]'
                : 'text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-80-alpha hover:border-app-primary-30 border border-transparent'
            }`;
    };

    const leftNavItems = [
        { path: '/', label: 'Home', icon: Home },
        { path: '/wallets', label: 'Wallets', icon: Wallet },
    ];

    const rightNavItems = [
        { path: '/deploy', label: 'Deploy', icon: Blocks },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    const allNavItems = [
        { path: '/', label: 'Home', icon: Home, prominent: false },
        { path: '/wallets', label: 'Wallets', icon: Wallet, prominent: false },
        { path: '/monitor', label: 'Trade', icon: TrendingUp, prominent: true },
        { path: '/deploy', label: 'Deploy', icon: Blocks, prominent: false },
    ];

    const socialLinks = [
        { href: 'https://github.com/razedotbot', label: 'GitHub' },
        { href: 'https://t.me/razesolana', label: 'Telegram' },
        { href: 'https://discord.com/invite/RNK5v92XpB', label: 'Discord' },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-app-primary-90 backdrop-blur-md border-b border-app-primary-20 z-50 px-4 md:px-6 flex items-center justify-between shadow-lg">
            {/* Left: Logo */}
            <div className="hidden md:flex items-center z-10">
                <button
                    onClick={handleLogoClick}
                    className="flex items-center gap-3 group"
                >
                    <div className="relative p-1 overflow-hidden rounded-lg border border-app-primary-30 group-hover:border-app-primary-60 transition-all duration-300">
                        <img
                            src="/logo.png"
                            alt={brand.altText}
                            className="h-8 w-auto filter drop-shadow-[0_0_5px_var(--color-primary-40)] group-hover:drop-shadow-[0_0_8px_var(--color-primary-60)] transition-all"
                        />
                    </div>
                </button>
            </div>

            {/* Center: All Nav Items - absolutely centered */}
            <nav className="hidden md:flex items-center gap-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {leftNavItems.map((item) => (
                    <button
                        key={item.path}
                        id={`nav-${item.label.toLowerCase()}`}
                        onClick={() => navigate(item.path)}
                        className={getLinkClassName(item.path, false)}
                    >
                        <item.icon size={16} />
                        <span>{item.label}</span>
                    </button>
                ))}
                
                <button
                    id="nav-trade"
                    onClick={() => navigate('/monitor')}
                    className={getLinkClassName('/monitor', true)}
                >
                    <TrendingUp size={18} />
                    <span>Trade</span>
                </button>

                {rightNavItems.map((item) => (
                    <button
                        key={item.path}
                        id={`nav-${item.label.toLowerCase()}`}
                        onClick={() => navigate(item.path)}
                        className={getLinkClassName(item.path, false)}
                    >
                        <item.icon size={16} />
                        <span>{item.label}</span>
                    </button>
                ))}

            </nav>

            {/* Right: Settings */}
            <div className="hidden md:flex items-center gap-2 z-10">
                {socialLinks.map((item) => (
                    <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.label}
                        title={item.label}
                        className="flex items-center justify-center p-2 rounded-lg bg-app-secondary-80/50 border border-app-primary-20 hover:border-app-primary hover:bg-app-primary-10 text-app-secondary-60 hover:text-app-primary transition-all duration-300"
                    >
                        {item.label === 'GitHub' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                        )}
                        {item.label === 'Telegram' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                            </svg>
                        )}
                        {item.label === 'Discord' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                            </svg>
                        )}
                    </a>
                ))}
                <a
                    href={brand.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Docs"
                    title="Docs"
                    className="flex items-center justify-center p-2 rounded-lg bg-app-secondary-80/50 border border-app-primary-20 hover:border-app-primary hover:bg-app-primary-10 text-app-secondary-60 hover:text-app-primary transition-all duration-300"
                >
                    <BookOpen size={18} />
                </a>
            </div>

            {/* Mobile: Logo */}
            <div className="md:hidden flex items-center">
                <button
                    onClick={handleLogoClick}
                    className="flex items-center gap-3 group"
                >
                    <div className="relative p-1 overflow-hidden rounded-lg border border-app-primary-30 group-hover:border-app-primary-60 transition-all duration-300">
                        <img
                            src="/logo.png"
                            alt={brand.altText}
                            className="h-8 w-auto filter drop-shadow-[0_0_5px_var(--color-primary-40)] group-hover:drop-shadow-[0_0_8px_var(--color-primary-60)] transition-all"
                        />
                    </div>
                </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
                className="md:hidden p-2 text-app-secondary hover:text-app-primary"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="absolute top-16 left-0 right-0 bg-app-primary-99 border-b border-app-primary-20 p-4 flex flex-col gap-2 md:hidden animate-slide-up shadow-2xl">
                    {allNavItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => {
                                navigate(item.path);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`w-full justify-start ${getLinkClassName(item.path, item.prominent)}`}
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                    <button
                        onClick={() => {
                            navigate('/settings');
                            setIsMobileMenuOpen(false);
                        }}
                        className={`w-full justify-start ${getLinkClassName('/settings', false)}`}
                    >
                        <Settings size={18} />
                        <span>Settings</span>
                    </button>
                    <div className="h-px w-full bg-app-primary-20 my-2"></div>
                    <div className="w-full flex items-center justify-center gap-2 px-4 py-2">
                        {socialLinks.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={item.label}
                                title={item.label}
                                className="flex items-center justify-center p-2 rounded-lg bg-app-secondary-80/50 border border-app-primary-20 hover:border-app-primary hover:bg-app-primary-10 text-app-secondary-60 hover:text-app-primary transition-all duration-300"
                            >
                                {item.label === 'GitHub' && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                )}
                                {item.label === 'Telegram' && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                                    </svg>
                                )}
                                {item.label === 'Discord' && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                                    </svg>
                                )}
                            </a>
                        ))}
                        <a
                            href={brand.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Docs"
                            title="Docs"
                            className="flex items-center justify-center p-2 rounded-lg bg-app-secondary-80/50 border border-app-primary-20 hover:border-app-primary hover:bg-app-primary-10 text-app-secondary-60 hover:text-app-primary transition-all duration-300"
                        >
                            <BookOpen size={18} />
                        </a>
                    </div>
                </div>
            )}
        </header>
    );
};

