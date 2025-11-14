// Zustand Theme Store - State management for theme customization
// Handles theme state, persistence, and preset management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeConfig, ThemePreset, ThemeExport } from '../types/theme';
import { DEFAULT_THEME } from '../types/theme';
import { applyThemeToCSS } from '../utils/cssVariableManager';

/**
 * Theme store state interface
 */
interface ThemeStoreState {
  // Current theme configuration
  currentTheme: ThemeConfig;
  
  // Saved presets
  presets: ThemePreset[];
  
  // Active preset ID (null if custom theme)
  activePresetId: string | null;
  
  // Actions
  updateTheme: (theme: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
  
  // Preset management
  savePreset: (name: string, description?: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  updatePreset: (presetId: string, name: string, description?: string) => void;
  
  // Import/Export
  exportTheme: (name: string, description?: string) => ThemeExport;
  importTheme: (exportData: ThemeExport) => void;
}

/**
 * Generate unique ID for presets
 */
function generateId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep merge two objects
 * Type-safe implementation that recursively merges nested objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result: T = { ...target };
  
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }
    
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (sourceValue !== undefined) {
      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        // Both are objects, merge recursively
        result[key] = deepMerge(
          targetValue as object,
          sourceValue as object
        ) as T[Extract<keyof T, string>];
      } else {
        // Otherwise, replace with source value
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }
  
  return result;
}

/**
 * Create the theme store with persistence
 */
export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTheme: DEFAULT_THEME,
      presets: [],
      activePresetId: null,
      
      /**
       * Update current theme (partial update)
       */
      updateTheme: (themeUpdate: Partial<ThemeConfig>) => {
        set((state) => {
          const newTheme = deepMerge(state.currentTheme, themeUpdate);
          
          // Apply theme to CSS immediately
          applyThemeToCSS(newTheme);
          
          return {
            currentTheme: newTheme,
            activePresetId: null, // Clear active preset when manually editing
          };
        });
      },
      
      /**
       * Reset theme to default
       */
      resetTheme: () => {
        const defaultTheme = { ...DEFAULT_THEME };
        applyThemeToCSS(defaultTheme);
        
        set({
          currentTheme: defaultTheme,
          activePresetId: null,
        });
      },
      
      /**
       * Save current theme as a preset
       */
      savePreset: (name: string, description?: string) => {
        const state = get();
        const newPreset: ThemePreset = {
          id: generateId(),
          name,
          description,
          theme: { ...state.currentTheme },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set({
          presets: [...state.presets, newPreset],
          activePresetId: newPreset.id,
        });
      },
      
      /**
       * Load a preset by ID
       */
      loadPreset: (presetId: string) => {
        const state = get();
        const preset = state.presets.find(p => p.id === presetId);
        
        if (preset) {
          const theme = { ...preset.theme };
          applyThemeToCSS(theme);
          
          set({
            currentTheme: theme,
            activePresetId: presetId,
          });
        }
      },
      
      /**
       * Delete a preset
       */
      deletePreset: (presetId: string) => {
        const state = get();
        
        set({
          presets: state.presets.filter(p => p.id !== presetId),
          activePresetId: state.activePresetId === presetId ? null : state.activePresetId,
        });
      },
      
      /**
       * Update a preset's name/description
       */
      updatePreset: (presetId: string, name: string, description?: string) => {
        const state = get();
        
        set({
          presets: state.presets.map(preset => 
            preset.id === presetId
              ? { ...preset, name, description, updatedAt: Date.now() }
              : preset
          ),
        });
      },
      
      /**
       * Export current theme as JSON
       */
      exportTheme: (name: string, description?: string): ThemeExport => {
        const state = get();
        
        return {
          version: '1.0.0',
          name,
          description,
          theme: { ...state.currentTheme },
          exportedAt: Date.now(),
        };
      },
      
      /**
       * Import theme from JSON
       */
      importTheme: (exportData: ThemeExport) => {
        const theme = { ...exportData.theme };
        applyThemeToCSS(theme);
        
        set({
          currentTheme: theme,
          activePresetId: null,
        });
      },
    }),
    {
      name: 'theme-store',
      version: 1,
      
      // Customize what gets persisted
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        presets: state.presets,
        activePresetId: state.activePresetId,
      }),
    }
  )
);

/**
 * Initialize theme from store on app startup
 */
export function initializeTheme(): void {
  const state = useThemeStore.getState();
  applyThemeToCSS(state.currentTheme);
}

/**
 * Hook to get current theme
 */
export function useCurrentTheme(): ThemeConfig {
  return useThemeStore(state => state.currentTheme);
}

/**
 * Hook to get presets
 */
export function usePresets(): ThemePreset[] {
  return useThemeStore(state => state.presets);
}

/**
 * Hook to get active preset ID
 */
export function useActivePresetId(): string | null {
  return useThemeStore(state => state.activePresetId);
}

export {};

