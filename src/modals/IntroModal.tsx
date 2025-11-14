import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { X, ChevronLeft, Settings, Rocket, BarChart3, DollarSign } from 'lucide-react';
import { StepVisualization, StylesAppender } from '../components/StepVisualizations';

interface IntroductionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IntroductionModal = ({ isOpen, onClose }: IntroductionModalProps): JSX.Element | null => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showModal, setShowModal] = useState(isOpen);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('hasSeenIntro');
    if (hasSeenIntro === 'true') {
      setShowModal(false);
    }
  }, []);

  const steps = useMemo(
    () => [
      {
        title: 'Configure Your Settings',
        content:
          'Start by setting up your RPC endpoint and transaction fees. This ensures your transactions process smoothly on the Solana network.',
        icon: <Settings size={40} className="color-primary" />,
        image: 'settings.png',
      },
      {
        title: 'Set Token Address or Deploy',
        content:
          "Enter a token address in the main input or deploy your own token to start trading. You'll need this to interact with specific tokens on the network.",
        icon: <Rocket size={40} className="color-primary" />,
        image: 'token.png',
      },
      {
        title: 'Buy & Sell Tokens',
        content:
          'Use the trading features to buy or sell tokens. Create multiple wallets for different trading strategies and track balances in real-time.',
        icon: <BarChart3 size={40} className="color-primary" />,
        image: 'trade.png',
      },
      {
        title: 'Monitor Your Profits',
        content:
          'Track your portfolio performance over time. Use the built-in charts and PNL calculator to maximize your trading strategy and profits.',
        icon: <DollarSign size={40} className="color-primary" />,
        image: 'profit.png',
      },
    ],
    []
  );

  const handleClose = useCallback((): void => {
    setShowModal(false);
    if (dontShowAgain) {
      localStorage.setItem('hasSeenIntro', 'true');
    }
    onClose();
  }, [dontShowAgain, onClose]);

  const handleNextStep = useCallback((): void => {
    setCurrentStep((prevStep) => {
      if (prevStep < steps.length - 1) {
        return prevStep + 1;
      }
      handleClose();
      return prevStep;
    });
  }, [handleClose, steps.length]);

  const handlePrevStep = useCallback((): void => {
    setCurrentStep((prevStep) => (prevStep > 0 ? prevStep - 1 : prevStep));
  }, []);

  const handleDontShowAgainChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setDontShowAgain(event.target.checked);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!showModal) return;

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        handleNextStep();
      } else if (event.key === 'ArrowLeft') {
        handlePrevStep();
      } else if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, handleNextStep, handlePrevStep, showModal]);

  if (!showModal) {
    return null;
  }

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-app-overlay backdrop-blur-sm flex items-center justify-center z-50 scanline">
      <div
        className="relative bg-app-tertiary border border-app-primary-40 border rounded-lg w-[32rem] max-w-[95%] p-6 mx-4 min-h-[26rem] overflow-hidden"
        style={{
          animation: 'fadeInScale 0.3s ease-out forwards',
          transform: 'scale(0.95)',
          opacity: 0,
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-error-20 border border-error-alt-40 hover:border-error-alt rounded transition-all duration-300 z-10"
          type="button"
        >
          <X size={20} className="text-error-alt" />
        </button>

        <div className="absolute top-0 left-0 w-full h-1 bg-primary-20">
          <div
            className="h-full bg-app-primary-color"
            style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
          ></div>
        </div>

        <div className="absolute top-4 left-4 bg-primary-20 px-3 py-1 rounded-full border border-app-primary-40">
          <span className="text-sm font-mono color-primary">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        <div className="mt-12 flex flex-col items-center">
          <div className="w-20 h-20 flex items-center justify-center bg-primary-10 rounded-full border border-app-primary-40 mb-6 border">
            {steps[currentStep].icon}
          </div>

          <h2 className="text-2xl font-bold color-primary mb-4 text-center glitch heading-brackets">
            {steps[currentStep].title}
          </h2>

          <p className="text-app-tertiary text-center mb-8 max-w-md">{steps[currentStep].content}</p>

          <div className="w-full max-w-md mb-8">
            <StepVisualization step={currentStep} />
          </div>

          <StylesAppender />

          <label className="mt-2 mb-6 flex items-center gap-2 text-sm text-app-tertiary">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={handleDontShowAgainChange}
              className="form-checkbox h-4 w-4 text-app-primary-color border-app-primary-40 rounded focus:ring-app-primary-color"
            />
            Do not show this introduction again
          </label>

          <div className="flex justify-between w-full mt-4">
            <button
              onClick={handlePrevStep}
              className={`p-2 border border-app-primary-40 hover:border-app-primary rounded transition-all duration-300 ${
                currentStep === 0 ? 'opacity-50 cursor-not-allowed' : 'btn'
              }`}
              disabled={currentStep === 0}
              type="button"
            >
              <ChevronLeft size={20} className="color-primary" />
            </button>

            <button
              onClick={handleNextStep}
              className="px-6 py-2 bg-app-primary-color hover:bg-app-primary-dark text-app-primary font-medium rounded btn flex items-center justify-center"
              type="button"
            >
              <span className="font-mono tracking-wider">
                {currentStep < steps.length - 1 ? 'Next' : 'Finish'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroductionModal;