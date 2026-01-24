import { createContext } from 'react';
import type { MultichartToken, MultichartTokenStats } from '../utils/types/multichart';

export interface MultichartContextType {
  tokens: MultichartToken[];
  activeTokenIndex: number;
  tokenStats: Map<string, MultichartTokenStats>;
  addToken: (address: string, metadata?: Partial<MultichartToken>) => boolean;
  removeToken: (address: string) => void;
  setActiveToken: (index: number) => void;
  updateTokenStats: (address: string, stats: MultichartTokenStats) => void;
  updateTokenMetadata: (address: string, metadata: Partial<MultichartToken>) => void;
  reorderTokens: (fromIndex: number, toIndex: number) => void;
  replaceToken: (oldAddress: string, newAddress: string) => void;
  maxTokens: number;
}

export const MultichartContext = createContext<MultichartContextType | undefined>(undefined);
