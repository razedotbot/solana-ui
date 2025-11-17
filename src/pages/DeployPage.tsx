import React, { useState, Suspense, lazy } from 'react';
import { useAppContext } from '../contexts/useAppContext';
import { UnifiedHeader } from '../components/Header';

// Lazy load deploy modals
const DeployPumpModal = lazy(() =>
  import('../modals/DeployPumpModal').then((m) => ({
    default: m.DeployPumpModal,
  }))
);
const DeployBonkModal = lazy(() =>
  import('../modals/DeployBonkModal').then((m) => ({
    default: m.DeployBonkModal,
  }))
);
const DeployCookModal = lazy(() =>
  import('../modals/DeployCookModal').then((m) => ({
    default: m.DeployCookModal,
  }))
);
const DeployMoonModal = lazy(() =>
  import('../modals/DeployMoonModal').then((m) => ({
    default: m.DeployMoonModal,
  }))
);
const DeployBoopModal = lazy(() =>
  import('../modals/DeployBoopModal').then((m) => ({
    default: m.DeployBoopModal,
  }))
);
const DeployBagsModal = lazy(() =>
  import('../modals/DeployBagsModal').then((m) => ({
    default: m.DeployBagsModal,
  }))
);
const DeployBagsSharedFeesModal = lazy(() =>
  import('../modals/DeployBagsSharedModal').then((m) => ({
    default: m.DeployBagsSharedFeesModal,
  }))
);

type DeployType = 'pump' | 'bonk' | 'cook' | 'moon' | 'boop' | 'bags';

interface DeployOption {
  id: DeployType;
  name: string;
  icon: string;
  description: string;
  features: string[];
  sharedFees?: boolean;
}

const deployOptions: DeployOption[] = [
  {
    id: 'pump',
    name: 'PUMP.FUN',
    icon: '⚡',
    description: 'Fast deployment with built-in bonding curve',
    features: ['Bonding curve', 'Auto liquidity', 'Quick deploy'],
  },
  {
    id: 'bonk',
    name: 'BONKBOT',
    icon: '🚀',
    description: 'Advanced automation and bot integration',
    features: ['Bot integration', 'Automation', 'Custom params'],
  },
  {
    id: 'cook',
    name: 'COOKBOT',
    icon: '🍳',
    description: 'Specialized token creation tools',
    features: ['Quick deploy', 'Rich features', 'Easy setup'],
  },
  {
    id: 'moon',
    name: 'MOONSHOT',
    icon: '🌙',
    description: 'Maximum visibility and community reach',
    features: ['High visibility', 'Community', 'Marketing'],
  },
  {
    id: 'boop',
    name: 'BOOP',
    icon: '👆',
    description: 'Simple and efficient deployment',
    features: ['Simple UI', 'Fast process', 'Beginner friendly'],
  },
  {
    id: 'bags',
    name: 'BAGS',
    icon: '💰',
    description: 'Unique tokenomics and distribution',
    features: ['Tokenomics', 'Distribution', 'Advanced'],
  },
  {
    id: 'bags',
    name: 'FURY',
    icon: '🔥',
    description: 'Bags with shared fee distribution',
    features: ['Shared fees', 'Rewards', 'Enhanced'],
    sharedFees: true,
  },
];

export const DeployPage: React.FC = () => {
  const { wallets, solBalances, refreshBalances } = useAppContext();
  const [selectedDeployType, setSelectedDeployType] = useState<
    DeployType | null
  >(null);
  const [sharedFeesEnabled, setSharedFeesEnabled] = useState(false);

  const handleCloseModal = (): void => {
    setSelectedDeployType(null);
    setSharedFeesEnabled(false);
  };

  const handleRefresh = (): void => {
    void refreshBalances();
  };

  const handleSelectPlatform = (option: DeployOption): void => {
    setSharedFeesEnabled(option.sharedFees || false);
    setSelectedDeployType(option.id);
  };

  return (
    <div className="min-h-screen bg-app-primary text-app-tertiary flex">
      {/* Unified Header */}
      <UnifiedHeader />

      {/* Main Content - with left margin for sidebar */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden w-full md:w-auto md:ml-48 bg-app-primary">
        {/* Background effects layer */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Grid pattern background */}
          <div className="absolute inset-0 bg-app-primary opacity-90">
            <div className="absolute inset-0 bg-gradient-to-b from-app-primary-05 to-transparent"></div>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(2, 179, 109, 0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(2, 179, 109, 0.05) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
                backgroundPosition: 'center center',
              }}
            ></div>
          </div>

          {/* Corner accent lines */}
          <div className="absolute top-0 left-0 w-32 h-32 opacity-20">
            <div className="absolute top-0 left-0 w-px h-16 bg-gradient-to-b from-app-primary-color to-transparent"></div>
            <div className="absolute top-0 left-0 w-16 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
            <div className="absolute top-0 right-0 w-px h-16 bg-gradient-to-b from-app-primary-color to-transparent"></div>
            <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-32 h-32 opacity-20">
            <div className="absolute bottom-0 left-0 w-px h-16 bg-gradient-to-t from-app-primary-color to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-16 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
          </div>
          <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20">
            <div className="absolute bottom-0 right-0 w-px h-16 bg-gradient-to-t from-app-primary-color to-transparent"></div>
            <div className="absolute bottom-0 right-0 w-16 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
          </div>

          {/* Scanline overlay effect */}
          <div className="absolute inset-0 scanline pointer-events-none opacity-30"></div>

          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent pointer-events-none"></div>
        </div>

        {/* Content container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
          {/* Header Section */}
          <div className="mb-6 pb-4 border-b border-app-primary-20">
            <h1 className="text-xl sm:text-2xl font-mono color-primary font-bold mb-1">
              TOKEN DEPLOYMENT
            </h1>
            <p className="text-xs sm:text-sm text-app-secondary-80 font-mono">
              Select a platform to deploy your token
            </p>
          </div>

          {/* Deployment Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {deployOptions.map((option) => (
              <button
                key={`${option.id}-${option.sharedFees ? 'shared' : 'normal'}`}
                onClick={() => handleSelectPlatform(option)}
                className="group relative bg-app-quaternary border border-app-primary-20 
                         hover:border-app-primary-60 rounded-lg p-4 transition-all 
                         duration-300 text-left touch-manipulation
                         hover:shadow-md hover:shadow-app-primary-15 active:scale-95"
              >
                {/* Icon */}
                <div
                  className="text-3xl mb-3 transition-transform duration-300 
                             group-hover:scale-110"
                >
                  {option.icon}
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold color-primary font-mono mb-1 tracking-wider">
                  {option.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-app-secondary-80 mb-3 leading-relaxed">
                  {option.description}
                </p>

                {/* Features */}
                <div className="space-y-1">
                  {option.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-[10px] text-app-secondary-60"
                    >
                      <div className="w-1 h-1 rounded-full bg-app-primary-color opacity-60"></div>
                      <span className="font-mono">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Hover indicator */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-app-primary-color 
                           opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                ></div>
              </button>
            ))}
          </div>
        </div>

        {/* Deploy Modals */}
        <Suspense fallback={null}>
          {selectedDeployType === 'pump' && (
            <DeployPumpModal
              isOpen={true}
              onClose={handleCloseModal}
              handleRefresh={handleRefresh}
              wallets={wallets}
              solBalances={solBalances}
            />
          )}
          {selectedDeployType === 'bonk' && (
            <DeployBonkModal
              isOpen={true}
              onClose={handleCloseModal}
              handleRefresh={handleRefresh}
              wallets={wallets}
              solBalances={solBalances}
            />
          )}
          {selectedDeployType === 'cook' && (
            <DeployCookModal
              isOpen={true}
              onClose={handleCloseModal}
              handleRefresh={handleRefresh}
              wallets={wallets}
              solBalances={solBalances}
            />
          )}
          {selectedDeployType === 'moon' && (
            <DeployMoonModal
              isOpen={true}
              onClose={handleCloseModal}
              handleRefresh={handleRefresh}
              wallets={wallets}
              solBalances={solBalances}
            />
          )}
          {selectedDeployType === 'boop' && (
            <DeployBoopModal
              isOpen={true}
              onClose={handleCloseModal}
              handleRefresh={handleRefresh}
              wallets={wallets}
              solBalances={solBalances}
            />
          )}
          {selectedDeployType === 'bags' && !sharedFeesEnabled && (
            <DeployBagsModal
              isOpen={true}
              onClose={handleCloseModal}
              handleRefresh={handleRefresh}
              wallets={wallets}
              solBalances={solBalances}
            />
          )}
          {selectedDeployType === 'bags' && sharedFeesEnabled && (
            <DeployBagsSharedFeesModal
              isOpen={true}
              onClose={handleCloseModal}
              handleRefresh={handleRefresh}
              wallets={wallets}
              solBalances={solBalances}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default DeployPage;