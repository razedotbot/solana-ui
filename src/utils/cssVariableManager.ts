// CSS Variable Manager - Utility functions for applying theme values to CSS variables
// This file handles the application of theme configuration to CSS custom properties

import type { ThemeConfig } from '../types/theme';

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Parse hex
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Parse rgba string to get rgba values
 */
export function parseRgba(rgba: string): { r: number; g: number; b: number; a: number } | null {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] ? parseFloat(match[4]) : 1
  };
}

/**
 * Create rgba color with specific opacity from hex
 */
export function hexToRgba(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Generate opacity variants for a color
 */
export function generateOpacityVariants(
  baseColor: string,
  variantName: string
): Record<string, string> {
  const opacities = [0.05, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90];
  const variants: Record<string, string> = {};
  
  opacities.forEach(opacity => {
    const key = `${variantName}-${Math.round(opacity * 100)}`;
    variants[key] = hexToRgba(baseColor, opacity);
  });
  
  return variants;
}

/**
 * Apply a single CSS variable to the document root
 */
export function setCssVariable(name: string, value: string): void {
  document.documentElement.style.setProperty(name, value);
}

/**
 * Get a CSS variable value from the document root
 */
export function getCssVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Apply theme configuration to CSS variables
 */
export function applyThemeToCSS(theme: ThemeConfig): void {
  const { colors } = theme;
  
  // Primary colors
  setCssVariable('--color-primary', colors.primary.primary);
  setCssVariable('--color-primary-light', colors.primary.primaryLight);
  setCssVariable('--color-primary-dark', colors.primary.primaryDark);
  setCssVariable('--color-primary-darker', colors.primary.primaryDarker);
  
  // Generate primary opacity variants
  const primaryVariants = generateOpacityVariants(colors.primary.primary, '--color-primary');
  Object.entries(primaryVariants).forEach(([key, value]) => {
    setCssVariable(key, value);
  });
  
  // Background colors
  setCssVariable('--color-bg-primary', colors.background.bgPrimary);
  setCssVariable('--color-bg-secondary', colors.background.bgSecondary);
  setCssVariable('--color-bg-tertiary', colors.background.bgTertiary);
  setCssVariable('--color-bg-quaternary', colors.background.bgQuaternary);
  setCssVariable('--color-bg-overlay', colors.background.bgOverlay);
  setCssVariable('--color-bg-modal', colors.background.bgPrimary);
  
  // Generate background opacity variants
  const bgPrimaryRgb = hexToRgb(colors.background.bgPrimary);
  if (bgPrimaryRgb) {
    setCssVariable('--color-bg-primary-40', `rgba(${bgPrimaryRgb.r}, ${bgPrimaryRgb.g}, ${bgPrimaryRgb.b}, 0.4)`);
    setCssVariable('--color-bg-primary-60', `rgba(${bgPrimaryRgb.r}, ${bgPrimaryRgb.g}, ${bgPrimaryRgb.b}, 0.6)`);
    setCssVariable('--color-bg-primary-80', `rgba(${bgPrimaryRgb.r}, ${bgPrimaryRgb.g}, ${bgPrimaryRgb.b}, 0.8)`);
    setCssVariable('--color-bg-primary-99', `rgba(${bgPrimaryRgb.r}, ${bgPrimaryRgb.g}, ${bgPrimaryRgb.b}, 0.99)`);
  }
  
  const bgSecondaryRgb = hexToRgb(colors.background.bgSecondary);
  if (bgSecondaryRgb) {
    setCssVariable('--color-bg-secondary-80', `rgba(${bgSecondaryRgb.r}, ${bgSecondaryRgb.g}, ${bgSecondaryRgb.b}, 0.8)`);
  }
  
  // Text colors
  setCssVariable('--color-text-primary', colors.text.textPrimary);
  setCssVariable('--color-text-secondary', colors.text.textSecondary);
  setCssVariable('--color-text-tertiary', colors.text.textTertiary);
  setCssVariable('--color-text-muted', colors.text.textMuted);
  setCssVariable('--color-text-faded', colors.text.textFaded);
  
  // Generate text secondary opacity variant
  const textSecondaryRgba = parseRgba(colors.text.textMuted);
  if (textSecondaryRgba) {
    setCssVariable('--color-text-secondary-90', `rgba(${textSecondaryRgba.r}, ${textSecondaryRgba.g}, ${textSecondaryRgba.b}, 0.9)`);
  }
  
  // Border colors (derived from primary)
  setCssVariable('--color-border-primary', hexToRgba(colors.primary.primary, 0.4));
  setCssVariable('--color-border-secondary', hexToRgba(colors.primary.primary, 0.2));
  setCssVariable('--color-border-tertiary', hexToRgba(colors.primary.primary, 0.1));
  setCssVariable('--color-border-hover', colors.primary.primary);
  
  // Status colors
  setCssVariable('--color-success', colors.status.success);
  setCssVariable('--color-error', colors.status.error);
  setCssVariable('--color-error-alt', colors.status.errorAlt);
  setCssVariable('--color-warning', colors.status.warning);
  setCssVariable('--color-warning-color', colors.status.warning);
  
  // Generate error opacity variants
  const errorVariants = generateOpacityVariants(colors.status.error, '--color-error');
  Object.entries(errorVariants).forEach(([key, value]) => {
    setCssVariable(key, value);
  });
  
  // Generate error-alt opacity variants
  const errorAltRgb = hexToRgb(colors.status.errorAlt);
  if (errorAltRgb) {
    setCssVariable('--color-error-alt-20', `rgba(${errorAltRgb.r}, ${errorAltRgb.g}, ${errorAltRgb.b}, 0.2)`);
    setCssVariable('--color-error-alt-30', `rgba(${errorAltRgb.r}, ${errorAltRgb.g}, ${errorAltRgb.b}, 0.3)`);
    setCssVariable('--color-error-alt-40', `rgba(${errorAltRgb.r}, ${errorAltRgb.g}, ${errorAltRgb.b}, 0.4)`);
    setCssVariable('--color-error-alt-60', `rgba(${errorAltRgb.r}, ${errorAltRgb.g}, ${errorAltRgb.b}, 0.6)`);
  }
  
  // Generate warning opacity variant
  const warningRgb = hexToRgb(colors.status.warning);
  if (warningRgb) {
    setCssVariable('--color-warning-40', `rgba(${warningRgb.r}, ${warningRgb.g}, ${warningRgb.b}, 0.4)`);
  }
  
  // Ping status colors
  setCssVariable('--color-ping-good', colors.ping.pingGood);
  setCssVariable('--color-ping-medium', colors.ping.pingMedium);
  setCssVariable('--color-ping-poor', colors.ping.pingPoor);
  
  // Generate ping opacity variants
  const pingGoodRgb = hexToRgb(colors.ping.pingGood);
  if (pingGoodRgb) {
    setCssVariable('--color-ping-good-10', `rgba(${pingGoodRgb.r}, ${pingGoodRgb.g}, ${pingGoodRgb.b}, 0.1)`);
    setCssVariable('--color-ping-good-05', `rgba(${pingGoodRgb.r}, ${pingGoodRgb.g}, ${pingGoodRgb.b}, 0.05)`);
  }
  
  const pingMediumRgb = hexToRgb(colors.ping.pingMedium);
  if (pingMediumRgb) {
    setCssVariable('--color-ping-medium-20', `rgba(${pingMediumRgb.r}, ${pingMediumRgb.g}, ${pingMediumRgb.b}, 0.2)`);
  }
  
  const pingPoorRgb = hexToRgb(colors.ping.pingPoor);
  if (pingPoorRgb) {
    setCssVariable('--color-ping-poor-10', `rgba(${pingPoorRgb.r}, ${pingPoorRgb.g}, ${pingPoorRgb.b}, 0.1)`);
    setCssVariable('--color-ping-poor-05', `rgba(${pingPoorRgb.r}, ${pingPoorRgb.g}, ${pingPoorRgb.b}, 0.05)`);
  }
  
  // Scrollbar colors
  setCssVariable('--color-scrollbar-thumb', colors.scrollbar.scrollbarThumb);
  setCssVariable('--color-scrollbar-track', colors.scrollbar.scrollbarTrack);
  
  // Gradient colors
  setCssVariable('--color-gradient-column-start', colors.gradients.columnGradientStart);
  setCssVariable('--color-gradient-column-end', colors.gradients.columnGradientEnd);
  setCssVariable('--color-gradient-hover-start', colors.gradients.hoverGradientStart);
  setCssVariable('--color-gradient-hover-end', colors.gradients.hoverGradientEnd);
  setCssVariable('--color-gradient-accent-start', colors.gradients.accentGradientStart);
  setCssVariable('--color-gradient-accent-end', colors.gradients.accentGradientEnd);
  
  // Styling - Border Radius
  const { styling } = theme;
  setCssVariable('--border-radius-sm', `${styling.borderRadius.sm}px`);
  setCssVariable('--border-radius-md', `${styling.borderRadius.md}px`);
  setCssVariable('--border-radius-lg', `${styling.borderRadius.lg}px`);
  setCssVariable('--border-radius-xl', `${styling.borderRadius.xl}px`);
  setCssVariable('--border-radius-xxl', `${styling.borderRadius.xxl}px`);
  setCssVariable('--border-radius-full', `${styling.borderRadius.full}px`);
  
  // Spacing
  setCssVariable('--spacing-xs', `${styling.spacing.xs}px`);
  setCssVariable('--spacing-sm', `${styling.spacing.sm}px`);
  setCssVariable('--spacing-md', `${styling.spacing.md}px`);
  setCssVariable('--spacing-lg', `${styling.spacing.lg}px`);
  setCssVariable('--spacing-xl', `${styling.spacing.xl}px`);
  
  // Animations
  setCssVariable('--transition-speed', styling.animations.transitionSpeed);
  setCssVariable('--hover-speed', styling.animations.hoverSpeed);
  setCssVariable('--glow-speed', styling.animations.glowSpeed);
  setCssVariable('--scanline-speed', styling.animations.scanlineSpeed);
  setCssVariable('--grid-pulse-speed', styling.animations.gridPulseSpeed);
  
  // Effects
  setCssVariable('--backdrop-blur', styling.effects.backdropBlur);
  setCssVariable('--shadow-intensity', styling.effects.shadowIntensity.toString());
  setCssVariable('--glow-intensity', styling.effects.glowIntensity.toString());
  setCssVariable('--grid-size', `${styling.effects.gridSize}px`);
  setCssVariable('--border-width', `${styling.effects.borderWidth}px`);
}

/**
 * Reset theme to default values
 */
export function resetThemeToDefault(): void {
  // Simply reload the page to restore original CSS
  window.location.reload();
}

/**
 * Validate color string (hex or rgba)
 */
export function isValidColor(color: string): boolean {
  // Check for hex color
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
    return true;
  }
  
  // Check for rgba color
  if (/^rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*[\d.]+)?\)$/.test(color)) {
    return true;
  }
  
  // Check for named colors (basic validation)
  if (color === 'transparent') {
    return true;
  }
  
  return false;
}

export {};
