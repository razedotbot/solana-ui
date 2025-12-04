/**
 * ProfileCard - Unified profile display component
 * 
 * Displays profile information for all tool types with app-consistent styling
 */

import React from 'react';
import { 
  Play, 
  Pause, 
  Edit2, 
  Copy, 
  Trash2, 
  Zap, 
  Users, 
  Bot,
  Clock,
  Hash,
  ChevronRight
} from 'lucide-react';
import type { 
  SniperProfile, 
  CopyTradeProfile, 
  TradingStrategy, 
  ToolType 
} from './types';

interface ProfileCardProps {
  type: ToolType;
  profile: SniperProfile | CopyTradeProfile | TradingStrategy;
  isSelected?: boolean;
  onSelect?: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const formatTime = (ms: number): string => {
  const date = new Date(ms);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ProfileCard: React.FC<ProfileCardProps> = ({
  type,
  profile,
  isSelected,
  onSelect,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const getTypeIcon = (): React.ReactNode => {
    switch (type) {
      case 'sniper': return <Zap className="w-4 h-4" />;
      case 'copytrade': return <Users className="w-4 h-4" />;
      case 'automate': return <Bot className="w-4 h-4" />;
    }
  };

  const getTypeColor = (): string => {
    switch (type) {
      case 'sniper': return 'color-primary';
      case 'copytrade': return 'color-primary';
      case 'automate': return 'color-primary';
    }
  };

  const getTypeBadge = (): string => {
    switch (type) {
      case 'sniper': return 'SNIPER';
      case 'copytrade': return 'COPY';
      case 'automate': return 'AUTO';
    }
  };

  const getProfileStats = (): React.ReactNode => {
    switch (type) {
      case 'sniper': {
        const p = profile as SniperProfile;
        return (
          <>
            <span className="color-primary opacity-80">{p.eventType.toUpperCase()}</span>
            <span className="text-app-secondary-40">•</span>
            <span className="text-app-secondary-60">{p.filters.length} filter{p.filters.length !== 1 ? 's' : ''}</span>
            <span className="text-app-secondary-40">•</span>
            <span className="text-app-secondary-60">{p.buyAmount} SOL</span>
          </>
        );
      }
      case 'copytrade': {
        const p = profile as CopyTradeProfile;
        return (
          <>
            <span className="color-primary opacity-80">{p.mode.toUpperCase()}</span>
            <span className="text-app-secondary-40">•</span>
            <span className="text-app-secondary-60">{p.walletAddresses.length} wallet{p.walletAddresses.length !== 1 ? 's' : ''}</span>
            <span className="text-app-secondary-40">•</span>
            <span className="text-app-secondary-60">{p.conditions.length} cond</span>
          </>
        );
      }
      case 'automate': {
        const p = profile as TradingStrategy;
        return (
          <>
            <span className="color-primary opacity-80">{p.conditions.length} cond</span>
            <span className="text-app-secondary-40">•</span>
            <span className="text-app-secondary-60">{p.actions.length} action{p.actions.length !== 1 ? 's' : ''}</span>
            <span className="text-app-secondary-40">•</span>
            <span className="text-app-secondary-60">{p.walletAddresses.length} wallet{p.walletAddresses.length !== 1 ? 's' : ''}</span>
          </>
        );
      }
    }
  };

  return (
    <div 
      className={`
        group relative
        bg-app-accent border rounded-lg overflow-hidden
        transition-all duration-200
        ${profile.isActive 
          ? 'border-success/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
          : 'border-app-primary-40 hover:border-app-primary-60'
        }
        ${isSelected ? 'ring-1 ring-success/30' : ''}
      `}
    >
      {/* Active indicator bar */}
      {profile.isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-success via-success to-success" />
      )}

      <div 
        className="p-4 cursor-pointer"
        onClick={onSelect}
      >
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Status Toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className={`
                flex-shrink-0 p-1.5 rounded transition-all
                ${profile.isActive 
                  ? 'bg-success-20 text-success hover:bg-success-40' 
                  : 'bg-app-primary-20 text-app-secondary-60 hover:bg-app-primary-40 hover:text-app-secondary-80'
                }
              `}
              title={profile.isActive ? 'Deactivate' : 'Activate'}
            >
              {profile.isActive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Profile Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`flex-shrink-0 ${getTypeColor()}`}>
                  {getTypeIcon()}
                </span>
                <h3 className="font-mono text-sm font-medium text-app-primary truncate">
                  {profile.name}
                </h3>
                <span className={`
                  flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium
                  ${profile.isActive 
                    ? 'bg-success-20 text-success' 
                    : 'bg-app-primary-20 text-app-secondary-60'
                  }
                `}>
                  {profile.isActive ? 'ACTIVE' : getTypeBadge()}
                </span>
              </div>
              {profile.description && (
                <p className="text-xs text-app-secondary-60 truncate mt-0.5">
                  {profile.description}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded bg-app-primary-20 text-app-secondary-60 hover:bg-app-primary-40 hover:text-app-primary transition-colors"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="p-1.5 rounded bg-app-primary-20 text-app-secondary-60 hover:bg-app-primary-40 hover:text-app-primary transition-colors"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded bg-app-primary-20 text-app-secondary-60 hover:bg-error-alt-20 hover:text-error-alt transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {getProfileStats()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-app-primary-20">
          <div className="flex items-center gap-3 text-[10px] font-mono text-app-secondary-60">
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {profile.executionCount}
            </span>
            {profile.lastExecuted && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(profile.lastExecuted)}
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-app-secondary-40 group-hover:text-app-secondary-60 transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
