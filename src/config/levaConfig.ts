// Leva Configuration - Define control schemas for all theme properties
// This file contains the configuration for Leva controls

import { DEFAULT_THEME, themeConfigToLevaControls, type ThemeConfig, type LevaThemeControls } from '../types/theme';

/**
 * Leva control schema for theme customization
 */
export const themeSchema = {
  // Primary Colors folder
  'Primary Colors': {
    primary: {
      value: DEFAULT_THEME.colors.primary.primary,
      label: 'Primary',
    },
    primaryLight: {
      value: DEFAULT_THEME.colors.primary.primaryLight,
      label: 'Primary Light',
    },
    primaryDark: {
      value: DEFAULT_THEME.colors.primary.primaryDark,
      label: 'Primary Dark',
    },
    primaryDarker: {
      value: DEFAULT_THEME.colors.primary.primaryDarker,
      label: 'Primary Darker',
    },
  },
  
  // Background Colors folder
  'Background Colors': {
    bgPrimary: {
      value: DEFAULT_THEME.colors.background.bgPrimary,
      label: 'Background Primary',
    },
    bgSecondary: {
      value: DEFAULT_THEME.colors.background.bgSecondary,
      label: 'Background Secondary',
    },
    bgTertiary: {
      value: DEFAULT_THEME.colors.background.bgTertiary,
      label: 'Background Tertiary',
    },
    bgQuaternary: {
      value: DEFAULT_THEME.colors.background.bgQuaternary,
      label: 'Background Quaternary',
    },
    bgOverlay: {
      value: DEFAULT_THEME.colors.background.bgOverlay,
      label: 'Background Overlay',
    },
  },
  
  // Text Colors folder
  'Text Colors': {
    textPrimary: {
      value: DEFAULT_THEME.colors.text.textPrimary,
      label: 'Text Primary',
    },
    textSecondary: {
      value: DEFAULT_THEME.colors.text.textSecondary,
      label: 'Text Secondary',
    },
    textTertiary: {
      value: DEFAULT_THEME.colors.text.textTertiary,
      label: 'Text Tertiary',
    },
    textMuted: {
      value: DEFAULT_THEME.colors.text.textMuted,
      label: 'Text Muted',
    },
    textFaded: {
      value: DEFAULT_THEME.colors.text.textFaded,
      label: 'Text Faded',
    },
  },
  
  // Status Colors folder
  'Status Colors': {
    success: {
      value: DEFAULT_THEME.colors.status.success,
      label: 'Success',
    },
    error: {
      value: DEFAULT_THEME.colors.status.error,
      label: 'Error',
    },
    errorAlt: {
      value: DEFAULT_THEME.colors.status.errorAlt,
      label: 'Error Alt',
    },
    warning: {
      value: DEFAULT_THEME.colors.status.warning,
      label: 'Warning',
    },
  },
  
  // Ping Status Colors folder
  'Ping Status': {
    pingGood: {
      value: DEFAULT_THEME.colors.ping.pingGood,
      label: 'Ping Good',
    },
    pingMedium: {
      value: DEFAULT_THEME.colors.ping.pingMedium,
      label: 'Ping Medium',
    },
    pingPoor: {
      value: DEFAULT_THEME.colors.ping.pingPoor,
      label: 'Ping Poor',
    },
  },
  
  // Scrollbar Colors folder
  'Scrollbar': {
    scrollbarThumb: {
      value: DEFAULT_THEME.colors.scrollbar.scrollbarThumb,
      label: 'Thumb',
    },
    scrollbarTrack: {
      value: DEFAULT_THEME.colors.scrollbar.scrollbarTrack,
      label: 'Track',
    },
  },
  
  // Gradient Colors folder
  'Gradients': {
    columnGradientStart: {
      value: DEFAULT_THEME.colors.gradients.columnGradientStart,
      label: 'Column Start',
    },
    columnGradientEnd: {
      value: DEFAULT_THEME.colors.gradients.columnGradientEnd,
      label: 'Column End',
    },
    hoverGradientStart: {
      value: DEFAULT_THEME.colors.gradients.hoverGradientStart,
      label: 'Hover Start',
    },
    hoverGradientEnd: {
      value: DEFAULT_THEME.colors.gradients.hoverGradientEnd,
      label: 'Hover End',
    },
    accentGradientStart: {
      value: DEFAULT_THEME.colors.gradients.accentGradientStart,
      label: 'Accent Start',
    },
    accentGradientEnd: {
      value: DEFAULT_THEME.colors.gradients.accentGradientEnd,
      label: 'Accent End',
    },
  },
  
  // Border Radius folder
  'Border Radius': {
    borderRadiusSm: {
      value: DEFAULT_THEME.styling.borderRadius.sm,
      label: 'Small',
      min: 0,
      max: 20,
      step: 1,
    },
    borderRadiusMd: {
      value: DEFAULT_THEME.styling.borderRadius.md,
      label: 'Medium',
      min: 0,
      max: 20,
      step: 1,
    },
    borderRadiusLg: {
      value: DEFAULT_THEME.styling.borderRadius.lg,
      label: 'Large',
      min: 0,
      max: 30,
      step: 1,
    },
    borderRadiusXl: {
      value: DEFAULT_THEME.styling.borderRadius.xl,
      label: 'Extra Large',
      min: 0,
      max: 40,
      step: 1,
    },
    borderRadiusXxl: {
      value: DEFAULT_THEME.styling.borderRadius.xxl,
      label: '2XL',
      min: 0,
      max: 50,
      step: 1,
    },
    borderRadiusFull: {
      value: DEFAULT_THEME.styling.borderRadius.full,
      label: 'Full (Rounded)',
      min: 0,
      max: 9999,
      step: 1,
    },
  },
  
  // Spacing folder
  'Spacing': {
    spacingXs: {
      value: DEFAULT_THEME.styling.spacing.xs,
      label: 'Extra Small',
      min: 0,
      max: 20,
      step: 1,
    },
    spacingSm: {
      value: DEFAULT_THEME.styling.spacing.sm,
      label: 'Small',
      min: 0,
      max: 30,
      step: 1,
    },
    spacingMd: {
      value: DEFAULT_THEME.styling.spacing.md,
      label: 'Medium',
      min: 0,
      max: 50,
      step: 1,
    },
    spacingLg: {
      value: DEFAULT_THEME.styling.spacing.lg,
      label: 'Large',
      min: 0,
      max: 80,
      step: 1,
    },
    spacingXl: {
      value: DEFAULT_THEME.styling.spacing.xl,
      label: 'Extra Large',
      min: 0,
      max: 100,
      step: 1,
    },
  },
  
  // Animations folder
  'Animations': {
    transitionSpeed: {
      value: DEFAULT_THEME.styling.animations.transitionSpeed,
      label: 'Transition Speed',
    },
    hoverSpeed: {
      value: DEFAULT_THEME.styling.animations.hoverSpeed,
      label: 'Hover Speed',
    },
    glowSpeed: {
      value: DEFAULT_THEME.styling.animations.glowSpeed,
      label: 'Glow Speed',
    },
    scanlineSpeed: {
      value: DEFAULT_THEME.styling.animations.scanlineSpeed,
      label: 'Scanline Speed',
    },
    gridPulseSpeed: {
      value: DEFAULT_THEME.styling.animations.gridPulseSpeed,
      label: 'Grid Pulse Speed',
    },
  },
  
  // Effects folder
  'Effects': {
    backdropBlur: {
      value: DEFAULT_THEME.styling.effects.backdropBlur,
      label: 'Backdrop Blur',
    },
    shadowIntensity: {
      value: DEFAULT_THEME.styling.effects.shadowIntensity,
      label: 'Shadow Intensity',
      min: 0,
      max: 1,
      step: 0.05,
    },
    glowIntensity: {
      value: DEFAULT_THEME.styling.effects.glowIntensity,
      label: 'Glow Intensity',
      min: 0,
      max: 1,
      step: 0.05,
    },
    gridSize: {
      value: DEFAULT_THEME.styling.effects.gridSize,
      label: 'Grid Size',
      min: 10,
      max: 50,
      step: 1,
    },
    borderWidth: {
      value: DEFAULT_THEME.styling.effects.borderWidth,
      label: 'Border Width',
      min: 0,
      max: 10,
      step: 1,
    },
  },
};

/**
 * Get initial values from theme config
 */
export function getInitialLevaValues(theme: ThemeConfig = DEFAULT_THEME): LevaThemeControls {
  return themeConfigToLevaControls(theme);
}

export {};
