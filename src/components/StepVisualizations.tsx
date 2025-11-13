import React from 'react';
import { Settings, Rocket, BarChart3, DollarSign, ArrowRight } from 'lucide-react';

interface StepVisualizationProps {
  step: number;
}

const StepVisualization: React.FC<StepVisualizationProps> = ({ step }) => {
  switch (step) {
    case 0:
      return <ConfigurationVisual />;
    case 1:
      return <TokenSetupVisual />;
    case 2:
      return <TradingVisual />;
    case 3:
      return <ProfitVisual />;
    default:
      return null;
  }
};

// Step 1: Configuration Visual
const ConfigurationVisual: React.FC = () => {
  return (
    <div className="relative w-full h-48 bg-app-secondary rounded border border-app-primary-40 p-4 overflow-hidden">
      {/* Animated settings gear */}
      <div className="absolute right-6 top-6 animate-[spin_10s_linear_infinite]">
        <Settings size={24} className="color-primary" />
      </div>

      {/* RPC endpoint input mockup */}
      <div className="mt-4 mb-6">
        <div className="text-xs text-app-secondary font-mono uppercase mb-2">RPC ENDPOINT</div>
        <div className="w-full h-10 rounded bg-app-tertiary border border-app-primary-80 flex items-center px-3">
          <div className="animate-pulse w-3/4 h-4 bg-primary-30 rounded"></div>
        </div>
      </div>

      {/* Transaction fee input mockup */}
      <div className="mb-4">
        <div className="text-xs text-app-secondary font-mono uppercase mb-2">TRANSACTION FEE</div>
        <div className="w-full h-10 rounded bg-app-tertiary border border-app-primary-80 flex items-center px-3">
          <div className="w-16 h-4 bg-primary-30 rounded"></div>
          <div className="ml-auto text-xs text-app-primary-40">SOL</div>
        </div>
      </div>

      {/* Pulsing highlight effect */}
      <div className="absolute inset-0 border-2 border-app-primary rounded opacity-0 animate-[pulse_2s_ease-in-out_infinite]"></div>
    </div>
  );
};

// Step 2: Token Setup Visual
const TokenSetupVisual: React.FC = () => {
  return (
    <div className="relative w-full h-48 bg-app-secondary rounded border border-app-primary-40 p-4 overflow-hidden">
      {/* Token address input mockup */}
      <div className="text-xs text-app-secondary font-mono uppercase mb-2">TOKEN ADDRESS</div>
      <div className="w-full h-10 rounded bg-app-tertiary border border-app-primary-80 flex items-center px-3 relative overflow-hidden">
        <div className="w-3/4 h-4 bg-primary-30 rounded"></div>
        
        {/* Animated typing effect */}
        <div className="absolute inset-0 flex items-center px-3">
          <div className="h-4 w-1 bg-app-primary-color animate-[blink_1s_step-end_infinite]"></div>
        </div>
      </div>

      {/* Deploy token option */}
      <div className="mt-6 flex items-center">
        <div className="w-10 h-10 rounded-full bg-app-tertiary border border-app-primary-60 flex items-center justify-center mr-4">
          <Rocket size={20} className="color-primary" />
        </div>
        <div>
          <div className="text-app-primary text-sm">Deploy New Token</div>
          <div className="text-app-secondary text-xs">Create your custom token</div>
        </div>
        <ArrowRight size={16} className="color-primary ml-auto animate-[bounceX_1s_ease-in-out_infinite]" />
      </div>

      {/* Pulsing rocket animation */}
      <div className="absolute bottom-4 right-4">
        <div className="relative">
          <Rocket size={28} className="color-primary transform rotate-45" />
          <div className="absolute -bottom-2 -left-1 w-4 h-4 bg-primary-30 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>
  );
};

// Step 3: Trading Visual
const TradingVisual: React.FC = () => {
  return (
    <div className="relative w-full h-48 bg-app-secondary rounded border border-app-primary-40 p-4 overflow-hidden">
      {/* Price chart mockup */}
      <div className="w-full h-16 flex items-end space-x-1 mb-4">
        {[3, 5, 4, 7, 6, 8, 9, 8, 10, 12, 10, 14, 13, 15].map((height, i) => (
          <div 
            key={i} 
            className="flex-1 bg-primary-60 rounded-t"
            style={{ 
              height: `${height * 6}%`,
              transition: 'height 0.5s ease',
              animation: `chartBars 3s ease-in-out infinite ${i * 0.1}s`
            }}
          ></div>
        ))}
      </div>

      {/* Buy/Sell buttons */}
      <div className="flex space-x-4 mb-3">
        <button className="flex-1 bg-app-primary-color text-black font-medium py-2 rounded text-sm font-mono">
          BUY
        </button>
        <button className="flex-1 bg-app-tertiary border border-app-primary-40 color-primary py-2 rounded text-sm font-mono">
          SELL
        </button>
      </div>

      {/* Wallet balance mockup */}
      <div className="flex justify-between text-xs font-mono">
        <div className="text-app-secondary">BALANCE:</div>
        <div className="text-app-primary"><span className="color-primary">1.45</span> SOL</div>
        <div className="text-app-primary"><span className="color-primary">25,000</span> TOKENS</div>
      </div>

      {/* Trading activity indicator */}
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-app-primary-color animate-[pulse_1s_ease-in-out_infinite]"></div>
    </div>
  );
};

// Step 4: Profit Visual
const ProfitVisual: React.FC = () => {
  return (
    <div className="relative w-full h-48 bg-app-secondary rounded border border-app-primary-40 p-4 overflow-hidden">
      {/* Profit stats mockup */}
      <div className="flex justify-between mb-4">
        <div className="w-1/2 pr-2">
          <div className="text-xs text-app-secondary font-mono uppercase mb-1">DAILY PROFIT</div>
          <div className="text-lg color-primary font-mono font-bold">+23.5%</div>
        </div>
        <div className="w-1/2 pl-2">
          <div className="text-xs text-app-secondary font-mono uppercase mb-1">TOTAL PNL</div>
          <div className="text-lg color-primary font-mono font-bold">+1.25 SOL</div>
        </div>
      </div>

      {/* Portfolio value chart */}
      <div className="relative w-full h-16 mb-4 bg-app-tertiary rounded border border-app-primary-20 overflow-hidden">
        <div 
          className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-r from-primary-20 to-primary-40"
          style={{
            clipPath: 'polygon(0% 100%, 10% 70%, 20% 85%, 30% 60%, 40% 50%, 50% 60%, 60% 40%, 70% 30%, 80% 45%, 90% 25%, 100% 10%, 100% 100%)'
          }}
        ></div>
        
        {/* Moving highlight dot */}
        <div 
          className="absolute w-2 h-2 bg-app-primary-color rounded-full shadow-glow-primary"
          style={{
            top: '10%', 
            right: '0%',
            animation: 'moveHighlight 4s linear infinite'
          }}
        ></div>
      </div>

      {/* Dollar signs animation */}
      <div className="absolute bottom-2 right-2">
        <DollarSign 
          size={16} 
          className="color-primary absolute animate-[floatUp_3s_ease-out_infinite]" 
          style={{right: '0px'}}
        />
        <DollarSign 
          size={16} 
          className="color-primary absolute animate-[floatUp_3s_ease-out_infinite_0.5s]" 
          style={{right: '10px'}}
        />
        <DollarSign 
          size={16} 
          className="color-primary absolute animate-[floatUp_3s_ease-out_infinite_1s]" 
          style={{right: '20px'}}
        />
      </div>

      {/* Flash effect */}
      <div className="absolute inset-0 bg-app-primary-color opacity-0 animate-[flash_5s_ease-in-out_infinite]"></div>
    </div>
  );
};

// Add these keyframes to your existing styles
const additionalStyles = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  
  @keyframes bounceX {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(5px); }
  }
  
  @keyframes chartBars {
    0%, 100% { height: var(--default-height); }
    50% { height: calc(var(--default-height) * 1.2); }
  }
  
  @keyframes floatUp {
    0% { transform: translateY(0); opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { transform: translateY(-30px); opacity: 0; }
  }
  
  @keyframes flash {
    0%, 100% { opacity: 0; }
    2% { opacity: 0.1; }
    3% { opacity: 0; }
    5% { opacity: 0.1; }
    6% { opacity: 0; }
  }
  
  @keyframes moveHighlight {
    0% { top: 10%; right: 0%; }
    10% { top: 25%; right: 10%; }
    20% { top: 45%; right: 20%; }
    30% { top: 30%; right: 30%; }
    40% { top: 50%; right: 40%; }
    50% { top: 60%; right: 50%; }
    60% { top: 40%; right: 60%; }
    70% { top: 60%; right: 70%; }
    80% { top: 85%; right: 80%; }
    90% { top: 70%; right: 90%; }
    100% { top: 100%; right: 100%; }
  }
  
  @keyframes fadeInScale {
    0% { transform: scale(0.95); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  /* Center animation keyframes - ensures content stays centered */
  @keyframes fadeInCentered {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  
  @keyframes slideIn {
    0% { transform: translateX(20px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    0% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(-20px); opacity: 0; }
  }
  
  .step-transition-enter {
    animation: slideIn 0.3s forwards;
  }
  
  .step-transition-exit {
    animation: slideOut 0.3s forwards;
  }
`;

// Need to append these styles to your existing styles
const StylesAppender: React.FC = () => {
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = additionalStyles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  return null;
};

export { StepVisualization, StylesAppender };