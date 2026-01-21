import { useContext } from 'react';
import { MultichartContext, type MultichartContextType } from './MultichartContextDef';

export function useMultichart(): MultichartContextType {
  const context = useContext(MultichartContext);
  if (context === undefined) {
    throw new Error('useMultichart must be used within a MultichartProvider');
  }
  return context;
}
