import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, Check, Sparkles } from 'lucide-react';

interface Step {
    target: string; // ID of the target element
    title: string;
    content: string;
    position: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

const TUTORIAL_STEPS: Step[] = [
    {
        target: 'center',
        title: 'Welcome to Raze.BOT',
        content: 'Welcome to Raze.bot, the first fully open-source multi-wallet tool backed by Raze APIs.',
        position: 'center',
    },
    {
        target: 'nav-wallets',
        title: 'Manage Wallets',
        content: 'Create, import, and manage your Solana wallets here. View balances and organize your portfolio.',
        position: 'bottom',
    },
    {
        target: 'nav-trade',
        title: 'Trade',
        content: 'Execute trades, view charts, and monitor your positions in real-time with advanced trading tools.',
        position: 'bottom',
    },
    {
        target: 'nav-deploy',
        title: 'Token Deployment',
        content: 'Launch your own tokens on various platforms like Pump.fun and Meteora with just a few clicks.',
        position: 'bottom',
    },
    {
        target: 'nav-settings',
        title: 'Settings',
        content: 'Configure your RPC endpoints, trading servers, and other application preferences.',
        position: 'bottom',
    },
];

interface OnboardingTutorialProps {
    forceShow?: boolean;
    onClose?: () => void;
    autoShowForNewUsers?: boolean; // Only check localStorage when true
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ 
    forceShow = false, 
    onClose,
    autoShowForNewUsers = false 
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    // Check if tutorial has been seen or if forceShow is true
    useEffect(() => {
        if (forceShow) {
            setCurrentStepIndex(0);
            setIsVisible(true);
            return;
        }
        // Only auto-show for new users if explicitly enabled
        if (autoShowForNewUsers) {
            const hasSeenTutorial = localStorage.getItem('raze_has_seen_tutorial');
            if (!hasSeenTutorial) {
                // Small delay to ensure UI is loaded
                const timer = setTimeout(() => {
                    setIsVisible(true);
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
        return;
    }, [forceShow, autoShowForNewUsers]);

    // Update target position when step changes or window resizes
    const updateTargetPosition = useCallback(() => {
        const step = TUTORIAL_STEPS[currentStepIndex];
        if (step.position === 'center') {
            setTargetRect(null);
            return;
        }

        const element = document.getElementById(step.target);
        if (element) {
            const rect = element.getBoundingClientRect();
            setTargetRect(rect);

            // Scroll element into view if needed
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            // If element not found, skip to next step or just center?
            // For now, let's just center it as fallback
            setTargetRect(null);
        }
    }, [currentStepIndex]);

    useEffect(() => {
        if (isVisible) {
            updateTargetPosition();
            window.addEventListener('resize', updateTargetPosition);
            return () => window.removeEventListener('resize', updateTargetPosition);
        }
        return;
    }, [isVisible, currentStepIndex, updateTargetPosition]);

    const handleNext = (): void => {
        if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrev = (): void => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    const handleFinish = (): void => {
        setIsVisible(false);
        localStorage.setItem('raze_has_seen_tutorial', 'true');
        onClose?.();
    };

    const handleSkip = (): void => {
        handleFinish();
    };

    if (!isVisible) return null;

    const currentStep = TUTORIAL_STEPS[currentStepIndex];
    const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

    // Calculate tooltip position with boundary checks
    const getTooltipStyle = (): React.CSSProperties => {
        if (!targetRect || currentStep.position === 'center') {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        }

        const gap = 16;
        const tooltipWidth = 340;
        const tooltipHeight = 280; // Increased to account for full content
        const padding = 20; // Padding from viewport edges
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top = 0;
        let left = 0;

        // Calculate initial position based on preferred direction
        switch (currentStep.position) {
            case 'bottom':
                top = targetRect.bottom + gap;
                left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
                break;
            case 'top':
                top = targetRect.top - gap - tooltipHeight;
                left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
                break;
            case 'left':
                top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
                left = targetRect.left - gap - tooltipWidth;
                break;
            case 'right':
                top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
                left = targetRect.right + gap;
                break;
        }

        // Boundary checks - keep tooltip within viewport
        // Horizontal bounds
        if (left < padding) {
            left = padding;
        } else if (left + tooltipWidth > viewportWidth - padding) {
            left = viewportWidth - tooltipWidth - padding;
        }

        // Vertical bounds
        if (top < padding) {
            top = padding;
        } else if (top + tooltipHeight > viewportHeight - padding) {
            top = viewportHeight - tooltipHeight - padding;
        }

        return { top, left, width: tooltipWidth };
    };

    return (
        <div className="fixed inset-0 z-[100] pointer-events-auto">
            {/* Backdrop - no blur so header tabs are visible */}
            {!targetRect && (
                <div className="absolute inset-0 bg-black/70 transition-opacity duration-300" />
            )}

            {/* Spotlight effect - creates cutout around target element */}
            {targetRect && (
                <div
                    className="absolute border-2 border-app-primary box-content rounded-lg transition-all duration-300 ease-in-out"
                    style={{
                        top: targetRect.top - 4,
                        left: targetRect.left - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                        zIndex: 10,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
                    }}
                />
            )}

            {/* Tooltip Card */}
            <div
                className="absolute bg-gradient-to-br from-app-secondary via-app-secondary to-app-primary-80-alpha border border-app-primary rounded-2xl shadow-[0_0_40px_rgba(2,179,109,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] p-6 transition-all duration-300 ease-in-out flex flex-col gap-5 overflow-visible backdrop-blur-sm"
                style={{
                    ...getTooltipStyle(),
                    zIndex: 20,
                    maxWidth: '90vw',
                }}
            >

                {/* Header with Logo */}
                <div className="flex items-start justify-between relative">
                    <div className="flex items-center gap-3">
                        {/* Logo */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-app-primary-20 to-app-primary-40 flex items-center justify-center border border-app-primary-40 shadow-[0_0_15px_rgba(2,179,109,0.2)]">
                            <img 
                                src="/logo.png" 
                                alt="Raze" 
                                className="h-6 w-6 object-contain filter drop-shadow-[0_0_4px_var(--color-primary-70)]" 
                            />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-app-primary font-mono tracking-tight">
                                    {currentStep.title}
                                </h3>
                                {currentStepIndex === 0 && (
                                    <Sparkles size={14} className="color-primary animate-pulse" />
                                )}
                            </div>
                            <span className="text-[10px] font-mono text-app-secondary-60 uppercase tracking-widest">
                                Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleSkip}
                        className="w-7 h-7 rounded-lg border border-app-primary-30 flex items-center justify-center text-gray-400 hover:text-white hover:border-app-primary transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Content */}
                <div className="bg-app-primary-80-alpha rounded-xl p-4 border border-app-primary-20">
                    <p className="text-sm text-app-secondary-80 font-mono leading-relaxed">
                        {currentStep.content}
                    </p>
                </div>

                {/* Footer / Controls */}
                <div className="flex items-center justify-between pt-2">
                    {/* Progress dots */}
                    <div className="flex gap-1.5">
                        {TUTORIAL_STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    idx === currentStepIndex 
                                        ? 'w-6 bg-gradient-to-r from-app-primary to-app-primary-light' 
                                        : idx < currentStepIndex 
                                            ? 'w-1.5 bg-app-primary-60' 
                                            : 'w-1.5 bg-app-primary-20'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex items-center gap-2">
                        {currentStepIndex > 0 && (
                            <button
                                onClick={handlePrev}
                                className="px-4 py-2 rounded-lg border border-app-primary-20 hover:border-app-primary bg-app-primary-80-alpha text-xs font-mono font-medium text-app-secondary hover:text-app-primary transition-all duration-200"
                            >
                                BACK
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="px-5 py-2 rounded-lg bg-app-primary hover:bg-app-primary-light text-white text-xs font-bold font-mono flex items-center gap-1.5 transition-all duration-200 shadow-[0_0_20px_rgba(2,179,109,0.3)] hover:shadow-[0_0_25px_rgba(2,179,109,0.5)]"
                        >
                            {isLastStep ? 'GET STARTED' : 'NEXT'}
                            {isLastStep ? <Check size={14} /> : <ChevronRight size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
