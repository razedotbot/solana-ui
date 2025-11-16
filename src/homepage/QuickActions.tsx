import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, FolderOpen, Rocket, Zap, Settings, TrendingUp } from 'lucide-react';

interface QuickActionsProps {
  onNavigateToMonitor?: () => void;
  onNavigateToHoldings?: () => void;
  onExploreChart?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onNavigateToMonitor,
  onNavigateToHoldings,
  onExploreChart
}) => {
  const navigate = useNavigate();

  const handleMonitorClick = (): void => {
    if (onNavigateToMonitor) {
      onNavigateToMonitor();
    } else {
      navigate('/monitor');
    }
  };

  const handleHoldingsClick = (): void => {
    if (onNavigateToHoldings) {
      onNavigateToHoldings();
    } else {
      navigate('/holdings');
    }
  };

  const handleDeployClick = (): void => {
    navigate('/deploy');
  };

  const handleAutomationClick = (): void => {
    navigate('/automate');
  };

  const handleSettingsClick = (): void => {
    navigate('/settings');
  };

  const handleExploreChartClick = (): void => {
    if (onExploreChart) {
      onExploreChart();
    } else {
      navigate('/monitor');
    }
  };
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="space-y-3 md:space-y-4"
    >
      <h2 className="text-lg md:text-xl lg:text-2xl font-mono tracking-wider uppercase color-primary font-bold text-center mb-4">
        Quick Actions
      </h2>
      
      {/* Action cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Monitor */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleMonitorClick}
          className="group cursor-pointer bg-app-secondary-80 border border-app-primary-20 hover:border-app-primary-40 rounded-xl p-5 md:p-6 transition-all duration-300 relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary-20 rounded-lg border border-app-primary-30">
                <BarChart size={24} className="color-primary" />
              </div>
              <h3 className="font-mono font-bold color-primary text-lg">Monitor</h3>
            </div>
            <p className="text-sm text-app-secondary leading-relaxed">
              View real-time charts, price data, and market information for Solana tokens
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </motion.div>

        {/* Holdings */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleHoldingsClick}
          className="group cursor-pointer bg-app-secondary-80 border border-app-primary-20 hover:border-app-primary-40 rounded-xl p-5 md:p-6 transition-all duration-300 relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary-20 rounded-lg border border-app-primary-30">
                <FolderOpen size={24} className="color-primary" />
              </div>
              <h3 className="font-mono font-bold color-primary text-lg">Holdings</h3>
            </div>
            <p className="text-sm text-app-secondary leading-relaxed">
              View all token holdings across your wallets in one unified dashboard
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </motion.div>

        {/* Deploy Token */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleDeployClick}
          className="group cursor-pointer bg-app-secondary-80 border border-app-primary-20 hover:border-app-primary-40 rounded-xl p-5 md:p-6 transition-all duration-300 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary-20 rounded-lg border border-app-primary-30">
                <Rocket size={24} className="color-primary" />
              </div>
              <h3 className="font-mono font-bold color-primary text-lg">Deploy Token</h3>
            </div>
            <p className="text-sm text-app-secondary leading-relaxed">
              Create and deploy tokens on pump.fun, letsbonk.fun, and more platforms
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </motion.div>

        {/* Automation */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAutomationClick}
          className="group cursor-pointer bg-app-secondary-80 border border-app-primary-20 hover:border-app-primary-40 rounded-xl p-5 md:p-6 transition-all duration-300 relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary-20 rounded-lg border border-app-primary-30">
                <Zap size={24} className="color-primary" />
              </div>
              <h3 className="font-mono font-bold color-primary text-lg">Automation</h3>
            </div>
            <p className="text-sm text-app-secondary leading-relaxed">
              Set up automated trading strategies and execute trades across multiple wallets
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </motion.div>

        {/* Settings */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSettingsClick}
          className="group cursor-pointer bg-app-secondary-80 border border-app-primary-20 hover:border-app-primary-40 rounded-xl p-5 md:p-6 transition-all duration-300 relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary-20 rounded-lg border border-app-primary-30">
                <Settings size={24} className="color-primary" />
              </div>
              <h3 className="font-mono font-bold color-primary text-lg">Settings</h3>
            </div>
            <p className="text-sm text-app-secondary leading-relaxed">
              Configure your trading preferences, RPC endpoints, and application settings
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </motion.div>

        {/* Explore Chart */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExploreChartClick}
          className="group cursor-pointer bg-app-secondary-80 border border-app-primary-20 hover:border-app-primary-40 rounded-xl p-5 md:p-6 transition-all duration-300 relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary-20 rounded-lg border border-app-primary-30">
                <TrendingUp size={24} className="color-primary" />
              </div>
              <h3 className="font-mono font-bold color-primary text-lg">Explore Chart</h3>
            </div>
            <p className="text-sm text-app-secondary leading-relaxed">
              Browse tokens and explore market charts to find trading opportunities
            </p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-app-primary-05 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default QuickActions;

