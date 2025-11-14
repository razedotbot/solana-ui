// Theme Types - TypeScript interfaces for theme configuration
// This file contains all type definitions for the theme system

/**
 * Base color configuration
 */
export interface ColorConfig {
  hex: string;
  rgb?: string;
  rgba?: string;
}

/**
 * Primary color palette
 */
export interface PrimaryColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryDarker: string;
}

/**
 * Background color palette
 */
export interface BackgroundColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgQuaternary: string;
  bgOverlay: string;
}

/**
 * Text color palette
 */
export interface TextColors {
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textFaded: string;
}

/**
 * Status color palette
 */
export interface StatusColors {
  success: string;
  error: string;
  errorAlt: string;
  warning: string;
}

/**
 * Ping status colors
 */
export interface PingColors {
  pingGood: string;
  pingMedium: string;
  pingPoor: string;
}

/**
 * Scrollbar colors
 */
export interface ScrollbarColors {
  scrollbarThumb: string;
  scrollbarTrack: string;
}

/**
 * Gradient colors for backgrounds (cards, columns, etc.)
 */
export interface GradientColors {
  // Column/Card gradients
  columnGradientStart: string;    // from-app-secondary-80
  columnGradientEnd: string;      // to-app-primary-dark-50
  
  // Hover gradients
  hoverGradientStart: string;     // hover gradient start
  hoverGradientEnd: string;       // hover gradient end
  
  // Accent gradients (for buttons, highlights)
  accentGradientStart: string;
  accentGradientEnd: string;
}

/**
 * Border radius values (in pixels)
 */
export interface BorderRadius {
  sm: number;    // Small radius (e.g., inputs, small buttons)
  md: number;    // Medium radius
  lg: number;    // Large radius (cards)
  xl: number;    // Extra large radius
  xxl: number;   // 2XL radius
  full: number;  // Fully rounded (9999px)
}

/**
 * Spacing/padding values (in pixels)
 */
export interface Spacing {
  xs: number;    // Extra small spacing
  sm: number;    // Small spacing
  md: number;    // Medium spacing
  lg: number;    // Large spacing
  xl: number;    // Extra large spacing
}

/**
 * Animation and transition settings
 */
export interface Animations {
  transitionSpeed: string;      // Default transition speed (e.g., "0.3s")
  hoverSpeed: string;           // Hover animation speed
  glowSpeed: string;            // Glow animation speed
  scanlineSpeed: string;        // Scanline animation speed
  gridPulseSpeed: string;       // Grid pulse animation speed
}

/**
 * Effect settings (shadows, blurs, etc.)
 */
export interface Effects {
  backdropBlur: string;         // Backdrop blur amount (e.g., "10px")
  shadowIntensity: number;      // Shadow intensity multiplier (0-1)
  glowIntensity: number;        // Glow effect intensity (0-1)
  gridSize: number;             // Background grid size in pixels
  borderWidth: number;          // Default border width in pixels
}

/**
 * Complete theme configuration
 */
export interface ThemeConfig {
  colors: {
    primary: PrimaryColors;
    background: BackgroundColors;
    text: TextColors;
    status: StatusColors;
    ping: PingColors;
    scrollbar: ScrollbarColors;
    gradients: GradientColors;
  };
  styling: {
    borderRadius: BorderRadius;
    spacing: Spacing;
    animations: Animations;
    effects: Effects;
  };
}

/**
 * Theme preset structure for saving/loading
 */
export interface ThemePreset {
  id: string;
  name: string;
  description?: string;
  theme: ThemeConfig;
  createdAt: number;
  updatedAt: number;
}

/**
 * Export/Import format
 */
export interface ThemeExport {
  version: string;
  name: string;
  description?: string;
  theme: ThemeConfig;
  exportedAt: number;
}

/**
 * Leva control values (flat structure for Leva)
 */
export interface LevaThemeControls {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryDarker: string;
  
  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgQuaternary: string;
  bgOverlay: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textFaded: string;
  
  // Status colors
  success: string;
  error: string;
  errorAlt: string;
  warning: string;
  
  // Ping colors
  pingGood: string;
  pingMedium: string;
  pingPoor: string;
  
  // Scrollbar colors
  scrollbarThumb: string;
  scrollbarTrack: string;
  
  // Gradient colors
  columnGradientStart: string;
  columnGradientEnd: string;
  hoverGradientStart: string;
  hoverGradientEnd: string;
  accentGradientStart: string;
  accentGradientEnd: string;
  
  // Border radius
  borderRadiusSm: number;
  borderRadiusMd: number;
  borderRadiusLg: number;
  borderRadiusXl: number;
  borderRadiusXxl: number;
  borderRadiusFull: number;
  
  // Spacing
  spacingXs: number;
  spacingSm: number;
  spacingMd: number;
  spacingLg: number;
  spacingXl: number;
  
  // Animations
  transitionSpeed: string;
  hoverSpeed: string;
  glowSpeed: string;
  scanlineSpeed: string;
  gridPulseSpeed: string;
  
  // Effects
  backdropBlur: string;
  shadowIntensity: number;
  glowIntensity: number;
  gridSize: number;
  borderWidth: number;
}

/**
 * Default theme values (from green.css)
 */
export const DEFAULT_THEME: ThemeConfig = {
  colors: {
    primary: {
      primary: '#02b36d',
      primaryLight: '#04d47c',
      primaryDark: '#01a35f',
      primaryDarker: '#029359',
    },
    background: {
      bgPrimary: '#050a0e',
      bgSecondary: '#0a1419',
      bgTertiary: '#091217',
      bgQuaternary: '#051014',
      bgOverlay: 'rgba(0, 0, 0, 0.8)',
    },
    text: {
      textPrimary: '#e4fbf2',
      textSecondary: '#7ddfbd',
      textTertiary: '#b3f0d7',
      textMuted: 'rgba(125, 223, 189, 0.6)',
      textFaded: 'rgba(125, 223, 189, 0.4)',
    },
    status: {
      success: '#00ff88',
      error: '#ff305c',
      errorAlt: '#ff3232',
      warning: '#ff6b6b',
    },
    ping: {
      pingGood: '#10b981',
      pingMedium: '#f59e0b',
      pingPoor: '#ef4444',
    },
    scrollbar: {
      scrollbarThumb: 'rgba(11, 82, 46, 0.5)',
      scrollbarTrack: 'transparent',
    },
    gradients: {
      // Default gradient values matching current usage
      columnGradientStart: 'rgba(10, 20, 25, 0.8)',      // from-app-secondary-80
      columnGradientEnd: 'rgba(5, 8, 10, 0.5)',          // to-app-primary-dark-50
      hoverGradientStart: 'rgba(2, 179, 109, 0.2)',      // hover from-app-primary-20
      hoverGradientEnd: 'rgba(2, 179, 109, 0.05)',       // hover to-app-primary-05
      accentGradientStart: '#02b36d',                    // from-app-primary-color
      accentGradientEnd: '#01a35f',                      // to-app-primary-dark
    },
  },
  styling: {
    borderRadius: {
      sm: 4,      // 0.25rem / rounded-sm
      md: 6,      // 0.375rem / rounded-md
      lg: 8,      // 0.5rem / rounded-lg
      xl: 12,     // 0.75rem / rounded-xl
      xxl: 16,    // 1rem / rounded-2xl
      full: 9999, // fully rounded
    },
    spacing: {
      xs: 4,   // 0.25rem
      sm: 8,   // 0.5rem
      md: 16,  // 1rem
      lg: 24,  // 1.5rem
      xl: 32,  // 2rem
    },
    animations: {
      transitionSpeed: '0.3s',
      hoverSpeed: '0.2s',
      glowSpeed: '2s',
      scanlineSpeed: '8s',
      gridPulseSpeed: '4s',
    },
    effects: {
      backdropBlur: '10px',
      shadowIntensity: 0.3,
      glowIntensity: 0.5,
      gridSize: 20,
      borderWidth: 1,
    },
  },
};

/**
 * Convert ThemeConfig to flat Leva controls structure
 */
export function themeConfigToLevaControls(theme: ThemeConfig): LevaThemeControls {
  return {
    // Primary colors
    primary: theme.colors.primary.primary,
    primaryLight: theme.colors.primary.primaryLight,
    primaryDark: theme.colors.primary.primaryDark,
    primaryDarker: theme.colors.primary.primaryDarker,
    
    // Background colors
    bgPrimary: theme.colors.background.bgPrimary,
    bgSecondary: theme.colors.background.bgSecondary,
    bgTertiary: theme.colors.background.bgTertiary,
    bgQuaternary: theme.colors.background.bgQuaternary,
    bgOverlay: theme.colors.background.bgOverlay,
    
    // Text colors
    textPrimary: theme.colors.text.textPrimary,
    textSecondary: theme.colors.text.textSecondary,
    textTertiary: theme.colors.text.textTertiary,
    textMuted: theme.colors.text.textMuted,
    textFaded: theme.colors.text.textFaded,
    
    // Status colors
    success: theme.colors.status.success,
    error: theme.colors.status.error,
    errorAlt: theme.colors.status.errorAlt,
    warning: theme.colors.status.warning,
    
    // Ping colors
    pingGood: theme.colors.ping.pingGood,
    pingMedium: theme.colors.ping.pingMedium,
    pingPoor: theme.colors.ping.pingPoor,
    
    // Scrollbar colors
    scrollbarThumb: theme.colors.scrollbar.scrollbarThumb,
    scrollbarTrack: theme.colors.scrollbar.scrollbarTrack,
    
    // Gradient colors
    columnGradientStart: theme.colors.gradients.columnGradientStart,
    columnGradientEnd: theme.colors.gradients.columnGradientEnd,
    hoverGradientStart: theme.colors.gradients.hoverGradientStart,
    hoverGradientEnd: theme.colors.gradients.hoverGradientEnd,
    accentGradientStart: theme.colors.gradients.accentGradientStart,
    accentGradientEnd: theme.colors.gradients.accentGradientEnd,
    
    // Border radius
    borderRadiusSm: theme.styling.borderRadius.sm,
    borderRadiusMd: theme.styling.borderRadius.md,
    borderRadiusLg: theme.styling.borderRadius.lg,
    borderRadiusXl: theme.styling.borderRadius.xl,
    borderRadiusXxl: theme.styling.borderRadius.xxl,
    borderRadiusFull: theme.styling.borderRadius.full,
    
    // Spacing
    spacingXs: theme.styling.spacing.xs,
    spacingSm: theme.styling.spacing.sm,
    spacingMd: theme.styling.spacing.md,
    spacingLg: theme.styling.spacing.lg,
    spacingXl: theme.styling.spacing.xl,
    
    // Animations
    transitionSpeed: theme.styling.animations.transitionSpeed,
    hoverSpeed: theme.styling.animations.hoverSpeed,
    glowSpeed: theme.styling.animations.glowSpeed,
    scanlineSpeed: theme.styling.animations.scanlineSpeed,
    gridPulseSpeed: theme.styling.animations.gridPulseSpeed,
    
    // Effects
    backdropBlur: theme.styling.effects.backdropBlur,
    shadowIntensity: theme.styling.effects.shadowIntensity,
    glowIntensity: theme.styling.effects.glowIntensity,
    gridSize: theme.styling.effects.gridSize,
    borderWidth: theme.styling.effects.borderWidth,
  };
}

/**
 * Convert flat Leva controls to ThemeConfig structure
 */
export function levaControlsToThemeConfig(controls: LevaThemeControls): ThemeConfig {
  return {
    colors: {
      primary: {
        primary: controls.primary,
        primaryLight: controls.primaryLight,
        primaryDark: controls.primaryDark,
        primaryDarker: controls.primaryDarker,
      },
      background: {
        bgPrimary: controls.bgPrimary,
        bgSecondary: controls.bgSecondary,
        bgTertiary: controls.bgTertiary,
        bgQuaternary: controls.bgQuaternary,
        bgOverlay: controls.bgOverlay,
      },
      text: {
        textPrimary: controls.textPrimary,
        textSecondary: controls.textSecondary,
        textTertiary: controls.textTertiary,
        textMuted: controls.textMuted,
        textFaded: controls.textFaded,
      },
      status: {
        success: controls.success,
        error: controls.error,
        errorAlt: controls.errorAlt,
        warning: controls.warning,
      },
      ping: {
        pingGood: controls.pingGood,
        pingMedium: controls.pingMedium,
        pingPoor: controls.pingPoor,
      },
      scrollbar: {
        scrollbarThumb: controls.scrollbarThumb,
        scrollbarTrack: controls.scrollbarTrack,
      },
      gradients: {
        columnGradientStart: controls.columnGradientStart,
        columnGradientEnd: controls.columnGradientEnd,
        hoverGradientStart: controls.hoverGradientStart,
        hoverGradientEnd: controls.hoverGradientEnd,
        accentGradientStart: controls.accentGradientStart,
        accentGradientEnd: controls.accentGradientEnd,
      },
    },
    styling: {
      borderRadius: {
        sm: controls.borderRadiusSm,
        md: controls.borderRadiusMd,
        lg: controls.borderRadiusLg,
        xl: controls.borderRadiusXl,
        xxl: controls.borderRadiusXxl,
        full: controls.borderRadiusFull,
      },
      spacing: {
        xs: controls.spacingXs,
        sm: controls.spacingSm,
        md: controls.spacingMd,
        lg: controls.spacingLg,
        xl: controls.spacingXl,
      },
      animations: {
        transitionSpeed: controls.transitionSpeed,
        hoverSpeed: controls.hoverSpeed,
        glowSpeed: controls.glowSpeed,
        scanlineSpeed: controls.scanlineSpeed,
        gridPulseSpeed: controls.gridPulseSpeed,
      },
      effects: {
        backdropBlur: controls.backdropBlur,
        shadowIntensity: controls.shadowIntensity,
        glowIntensity: controls.glowIntensity,
        gridSize: controls.gridSize,
        borderWidth: controls.borderWidth,
      },
    },
  };
}

export {};
