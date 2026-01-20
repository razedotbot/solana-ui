import { createContext } from "react";
import type { AppContextType } from "./AppContextTypes";

export const AppContext = createContext<AppContextType | undefined>(undefined);
