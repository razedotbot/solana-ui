import React, { useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Bot, Blocks, Wallet, TrendingUp, BookOpen, Menu, X } from 'lucide-react';
import { brand } from '../utils/brandConfig';
import logo from '../logo.png';

interface HeaderProps {
    tokenAddress?: string;
    onNavigateHome?: () => void;
}

export const HorizontalHeader: React.FC<HeaderProps> = ({
    onNavigateHome,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogoClick = useCallback(() => {
        onNavigateHome?.();
        navigate('/');
    }, [onNavigateHome, navigate]);

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
        { path: '/wallets', label: 'Wallets', icon: Wallet },
        { path: '/tools', label: 'Tools', icon: Bot },
    ];

    const rightNavItems = [
        { path: '/deploy', label: 'Deploy', icon: Blocks },
    ];

    const allNavItems = [
        { path: '/wallets', label: 'Wallets', icon: Wallet, prominent: false },
        { path: '/monitor', label: 'Trade', icon: TrendingUp, prominent: true },
        { path: '/tools', label: 'Tools', icon: Bot, prominent: false },
        { path: '/deploy', label: 'Deploy', icon: Blocks, prominent: false },
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
                            src={logo}
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

                <button
                    onClick={() => window.open(brand.docsUrl, '_blank', 'noopener,noreferrer')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono font-medium tracking-wider uppercase text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-80-alpha border border-transparent hover:border-app-primary-30 transition-all duration-200"
                >
                    <BookOpen size={16} />
                    <span>Docs</span>
                </button>
            </nav>

            {/* Right: Settings */}
            <div className="hidden md:flex items-center z-10">
                <button
                    id="nav-settings"
                    onClick={() => navigate('/settings')}
                    className={`p-2 rounded-lg transition-all duration-200 ${isActive('/settings') ? 'bg-primary-20 text-app-primary' : 'text-app-secondary-60 hover:text-app-primary hover:bg-app-primary-80-alpha'}`}
                >
                    <Settings size={20} />
                </button>
            </div>

            {/* Mobile: Logo */}
            <div className="md:hidden flex items-center">
                <button
                    onClick={handleLogoClick}
                    className="flex items-center gap-3 group"
                >
                    <div className="relative p-1 overflow-hidden rounded-lg border border-app-primary-30 group-hover:border-app-primary-60 transition-all duration-300">
                        <img
                            src={logo}
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
                    <div className="h-px w-full bg-app-primary-20 my-2"></div>
                    <button
                        onClick={() => {
                            window.open(brand.docsUrl, '_blank', 'noopener,noreferrer');
                            setIsMobileMenuOpen(false);
                        }}
                        className="w-full justify-start flex items-center gap-2 px-4 py-2 text-app-secondary-60 hover:text-app-primary"
                    >
                        <BookOpen size={18} />
                        <span className="font-mono text-sm tracking-wider uppercase">Docs</span>
                    </button>
                    <button
                        onClick={() => {
                            navigate('/settings');
                            setIsMobileMenuOpen(false);
                        }}
                        className="w-full justify-start flex items-center gap-2 px-4 py-2 text-app-secondary-60 hover:text-app-primary"
                    >
                        <Settings size={18} />
                        <span className="font-mono text-sm tracking-wider uppercase">Settings</span>
                    </button>
                </div>
            )}
        </header>
    );
};
