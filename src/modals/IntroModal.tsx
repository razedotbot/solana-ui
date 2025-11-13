import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Settings, Rocket, BarChart3, DollarSign } from 'lucide-react';
import { StepVisualization, StylesAppender } from '../components/StepVisualizations';

// Updated Types for our component - removed action props
interface IntroductionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IntroductionModal: React.FC<IntroductionModalProps> = ({
  isOpen,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showModal, setShowModal] = useState(isOpen);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Update modal visibility when isOpen prop changes
  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  // Check if this is the first visit and show modal accordingly
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('hasSeenIntro');
    if (hasSeenIntro === 'true') {
      setShowModal(false);
    }
  }, []);
  
  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showModal) return;
      
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        handlePrevStep();
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, currentStep]);

  const handleClose = () => {
    setShowModal(false);
    if (dontShowAgain) {
      localStorage.setItem('hasSeenIntro', 'true');
    }
    onClose();
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Define the steps for our introduction
  const steps = [
    {
      title: "Configure Your Settings",
      content: "Start by setting up your RPC endpoint and transaction fees. This ensures your transactions process smoothly on the Solana network.",
      icon: <Settings size={40} className="color-primary" />,
      image: "settings.png"
    },
    {
      title: "Set Token Address or Deploy",
      content: "Enter a token address in the main input or deploy your own token to start trading. You'll need this to interact with specific tokens on the network.",
      icon: <Rocket size={40} className="color-primary" />,
      image: "token.png"
    },
    {
      title: "Buy & Sell Tokens",
      content: "Use the trading features to buy or sell tokens. Create multiple wallets for different trading strategies and track balances in real-time.",
      icon: <BarChart3 size={40} className="color-primary" />,
      image: "trade.png"
    },
    {
      title: "Monitor Your Profits",
      content: "Track your portfolio performance over time. Use the built-in charts and PNL calculator to maximize your trading strategy and profits.",
      icon: <DollarSign size={40} className="color-primary" />,
      image: "profit.png"
    }
  ];

  // If modal is not shown, don't render anything
  if (!showModal) return null;

  // Progress percentage
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-app-overlay backdrop-blur-sm flex items-center justify-center z-50 cyberpunk-scanline">
      <div 
        className="relative bg-app-tertiary border border-app-primary-40 cyberpunk-border rounded-lg w-[32rem] max-w-[95%] p-6 mx-4 min-h-[26rem] overflow-hidden"
        style={{
          animation: 'fadeInScale 0.3s ease-out forwards',
          transform: 'scale(0.95)',
          opacity: 0
        }}
      >
        {/* Close button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-error-20 border border-error-alt-40 hover:border-error-alt rounded transition-all duration-300 z-10"
        >
          <X size={20} className="text-error-alt" />
        </button>

        {/* Progress bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-primary-20">
          <div 
            className="h-full bg-app-primary-color" 
            style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
          ></div>
        </div>

        {/* Step indicator */}
        <div className="absolute top-4 left-4 bg-primary-20 px-3 py-1 rounded-full border border-app-primary-40">
          <span className="text-sm font-mono color-primary">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        {/* Main content */}
        <div className="mt-12 flex flex-col items-center">
          {/* Icon with glowing effect */}
          <div className="w-20 h-20 flex items-center justify-center bg-primary-10 rounded-full border border-app-primary-40 mb-6 cyberpunk-border">
            {steps[currentStep].icon}
          </div>

          {/* Title with cyberpunk styling */}
          <h2 className="text-2xl font-bold color-primary mb-4 text-center cyberpunk-glitch heading-brackets">
            {steps[currentStep].title}
          </h2>

          {/* Content */}
          <p className="text-app-tertiary text-center mb-8 max-w-md">
            {steps[currentStep].content}
          </p>

          {/* Interactive visualization */}
          <div className="w-full max-w-md mb-8">
            <StepVisualization step={currentStep} />
          </div>
          
          {/* Add the styles appender component */}
          <StylesAppender />

          {/* Navigation buttons */}
          <div className="flex justify-between w-full mt-4">
            <button
              onClick={handlePrevStep}
              className={`p-2 border border-app-primary-40 hover:border-app-primary rounded transition-all duration-300 ${
                currentStep === 0 ? 'opacity-50 cursor-not-allowed' : 'cyberpunk-btn'
              }`}
              disabled={currentStep === 0}
            >
              <ChevronLeft size={20} className="color-primary" />
            </button>

            <button
              onClick={handleNextStep}
              className="px-6 py-2 bg-app-primary-color hover:bg-app-primary-dark text-app-primary font-medium rounded cyberpunk-btn flex items-center justify-center"
            >
              <span className="font-mono tracking-wider">
                {currentStep < steps.length - 1 ? "Next" : "Finish"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroductionModal;