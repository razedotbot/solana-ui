import { createContext } from 'react';
import type { AppContextType } from './AppContext';

export const AppContext = createContext<AppContextType | undefined>(undefined);

