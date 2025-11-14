// ThemeCustomizer Component - Main component integrating Leva with theme system
// This component provides the UI for real-time theme customization

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Move, Minimize2, Maximize2, Download, Upload, Save, Trash2, RefreshCw } from 'lucide-react';
import { useControls, folder, button } from 'leva';
import { useThemeStore, usePresets, useActivePresetId } from '../stores/themeStore';
import { levaControlsToThemeConfig, type ThemeConfig } from '../types/theme';
import { getInitialLevaValues } from '../config/levaConfig';
import { hexToRgb, generateOpacityVariants } from '../utils/cssVariableManager';

interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
}

// Generate CSS from theme configuration
function generateCSSFromTheme(theme: ThemeConfig): string {
  const { colors, styling } = theme;
  
  // Generate primary opacity variants
  const primaryVariants = generateOpacityVariants(colors.primary.primary, 'primary');
  const errorVariants = generateOpacityVariants(colors.status.error, 'error');
  
  // Helper to convert hex to rgba
  const hexToRgbaHelper = (hex: string, opacity: number): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  };
  
  const bgPrimaryRgb = hexToRgb(colors.background.bgPrimary);
  const bgSecondaryRgb = hexToRgb(colors.background.bgSecondary);
  const errorAltRgb = hexToRgb(colors.status.errorAlt);
  const warningRgb = hexToRgb(colors.status.warning);
  const pingGoodRgb = hexToRgb(colors.ping.pingGood);
  const pingMediumRgb = hexToRgb(colors.ping.pingMedium);
  const pingPoorRgb = hexToRgb(colors.ping.pingPoor);
  
  let css = `:root {\n`;
  
  // Primary colors
  css += `  --color-primary: ${colors.primary.primary};\n`;
  css += `  --color-primary-light: ${colors.primary.primaryLight};\n`;
  css += `  --color-primary-dark: ${colors.primary.primaryDark};\n`;
  css += `  --color-primary-darker: ${colors.primary.primaryDarker};\n\n`;
  
  // Primary opacity variants
  css += `  /* Primary with opacity variations */\n`;
  Object.entries(primaryVariants).forEach(([key, value]) => {
    const varName = `--color-${key}`;
    css += `  ${varName}: ${value};\n`;
  });
  css += `\n`;
  
  // Background colors
  css += `  /* Background Colors */\n`;
  css += `  --color-bg-primary: ${colors.background.bgPrimary};\n`;
  css += `  --color-bg-secondary: ${colors.background.bgSecondary};\n`;
  css += `  --color-bg-tertiary: ${colors.background.bgTertiary};\n`;
  css += `  --color-bg-quaternary: ${colors.background.bgQuaternary};\n\n`;
  
  // Background opacity variants
  if (bgPrimaryRgb) {
    css += `  /* Background with opacity */\n`;
    css += `  --color-bg-primary-40: rgba(${bgPrimaryRgb.r}, ${bgPrimaryRgb.g}, ${bgPrimaryRgb.b}, 0.4);\n`;
    css += `  --color-bg-primary-60: rgba(${bgPrimaryRgb.r}, ${bgPrimaryRgb.g}, ${bgPrimaryRgb.b}, 0.6);\n`;
    css += `  --color-bg-primary-80: rgba(${bgPrimaryRgb.r}, ${bgPrimaryRgb.g}, ${bgPrimaryRgb.b}, 0.8);\n`;
    css += `  --color-bg-primary-99: rgba(${bgPrimaryRgb.r}, ${bgPrimaryRgb.g}, ${bgPrimaryRgb.b}, 0.99);\n`;
  }
  if (bgSecondaryRgb) {
    css += `  --color-bg-secondary-80: rgba(${bgSecondaryRgb.r}, ${bgSecondaryRgb.g}, ${bgSecondaryRgb.b}, 0.8);\n`;
  }
  css += `\n`;
  
  // Modal/Overlay
  css += `  /* Modal/Overlay specific backgrounds */\n`;
  css += `  --color-bg-overlay: ${colors.background.bgOverlay};\n`;
  css += `  --color-bg-modal: var(--color-bg-primary);\n\n`;
  
  // Text colors
  css += `  /* Text Colors */\n`;
  css += `  --color-text-primary: ${colors.text.textPrimary};\n`;
  css += `  --color-text-secondary: ${colors.text.textSecondary};\n`;
  css += `  --color-text-tertiary: ${colors.text.textTertiary};\n`;
  css += `  --color-text-muted: ${colors.text.textMuted};\n`;
  css += `  --color-text-faded: ${colors.text.textFaded};\n`;
  
  // Text secondary opacity variant
  const textMutedMatch = colors.text.textMuted.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (textMutedMatch) {
    css += `  --color-text-secondary-90: rgba(${textMutedMatch[1]}, ${textMutedMatch[2]}, ${textMutedMatch[3]}, 0.9);\n`;
  }
  css += `\n`;
  
  // Border colors
  css += `  /* Border Colors */\n`;
  css += `  --color-border-primary: ${hexToRgbaHelper(colors.primary.primary, 0.4)};\n`;
  css += `  --color-border-secondary: ${hexToRgbaHelper(colors.primary.primary, 0.2)};\n`;
  css += `  --color-border-tertiary: ${hexToRgbaHelper(colors.primary.primary, 0.1)};\n`;
  css += `  --color-border-hover: ${colors.primary.primary};\n\n`;
  
  // Status colors
  css += `  /* Status Colors */\n`;
  css += `  --color-success: ${colors.status.success};\n`;
  css += `  --color-error: ${colors.status.error};\n`;
  css += `  --color-error-alt: ${colors.status.errorAlt};\n`;
  css += `  --color-warning: ${colors.status.warning};\n\n`;
  
  // Status opacity variants
  css += `  /* Status Colors with opacity */\n`;
  Object.entries(errorVariants).forEach(([key, value]) => {
    const varName = `--color-${key}`;
    css += `  ${varName}: ${value};\n`;
  });
  
  if (errorAltRgb) {
    css += `  --color-error-alt-20: rgba(${errorAltRgb.r}, ${errorAltRgb.g}, ${errorAltRgb.b}, 0.2);\n`;
    css += `  --color-error-alt-30: rgba(${errorAltRgb.r}, ${errorAltRgb.g}, ${errorAltRgb.b}, 0.3);\n`;
    css += `  --color-error-alt-40: rgba(${errorAltRgb.r}, ${errorAltRgb.g}, ${errorAltRgb.b}, 0.4);\n`;
    css += `  --color-error-alt-60: rgba(${errorAltRgb.r}, ${errorAltRgb.g}, ${errorAltRgb.b}, 0.6);\n`;
  }
  
  if (warningRgb) {
    css += `  --color-warning-40: rgba(${warningRgb.r}, ${warningRgb.g}, ${warningRgb.b}, 0.4);\n`;
  }
  css += `  --color-warning-color: ${colors.status.warning};\n\n`;
  
  // Ping status colors
  css += `  /* Ping Status Colors */\n`;
  css += `  --color-ping-good: ${colors.ping.pingGood};\n`;
  css += `  --color-ping-medium: ${colors.ping.pingMedium};\n`;
  css += `  --color-ping-poor: ${colors.ping.pingPoor};\n\n`;
  
  // Ping opacity variants
  css += `  /* Ping Status with opacity */\n`;
  if (pingGoodRgb) {
    css += `  --color-ping-good-10: rgba(${pingGoodRgb.r}, ${pingGoodRgb.g}, ${pingGoodRgb.b}, 0.1);\n`;
    css += `  --color-ping-good-05: rgba(${pingGoodRgb.r}, ${pingGoodRgb.g}, ${pingGoodRgb.b}, 0.05);\n`;
  }
  if (pingMediumRgb) {
    css += `  --color-ping-medium-20: rgba(${pingMediumRgb.r}, ${pingMediumRgb.g}, ${pingMediumRgb.b}, 0.2);\n`;
  }
  if (pingPoorRgb) {
    css += `  --color-ping-poor-10: rgba(${pingPoorRgb.r}, ${pingPoorRgb.g}, ${pingPoorRgb.b}, 0.1);\n`;
    css += `  --color-ping-poor-05: rgba(${pingPoorRgb.r}, ${pingPoorRgb.g}, ${pingPoorRgb.b}, 0.05);\n`;
  }
  css += `\n`;
  
  // Scrollbar colors
  css += `  /* Scrollbar Colors */\n`;
  css += `  --color-scrollbar-thumb: ${colors.scrollbar.scrollbarThumb};\n`;
  css += `  --color-scrollbar-track: ${colors.scrollbar.scrollbarTrack};\n\n`;
  
  // Gradient colors
  css += `  /* Gradient Colors (for columns, cards, etc.) */\n`;
  css += `  --color-gradient-column-start: ${colors.gradients.columnGradientStart};\n`;
  css += `  --color-gradient-column-end: ${colors.gradients.columnGradientEnd};\n`;
  css += `  --color-gradient-hover-start: ${colors.gradients.hoverGradientStart};\n`;
  css += `  --color-gradient-hover-end: ${colors.gradients.hoverGradientEnd};\n`;
  css += `  --color-gradient-accent-start: ${colors.gradients.accentGradientStart};\n`;
  css += `  --color-gradient-accent-end: ${colors.gradients.accentGradientEnd};\n\n`;
  
  // Border radius
  css += `  /* Border Radius */\n`;
  css += `  --border-radius-sm: ${styling.borderRadius.sm}px;\n`;
  css += `  --border-radius-md: ${styling.borderRadius.md}px;\n`;
  css += `  --border-radius-lg: ${styling.borderRadius.lg}px;\n`;
  css += `  --border-radius-xl: ${styling.borderRadius.xl}px;\n`;
  css += `  --border-radius-xxl: ${styling.borderRadius.xxl}px;\n`;
  css += `  --border-radius-full: ${styling.borderRadius.full}px;\n\n`;
  
  // Spacing
  css += `  /* Spacing */\n`;
  css += `  --spacing-xs: ${styling.spacing.xs}px;\n`;
  css += `  --spacing-sm: ${styling.spacing.sm}px;\n`;
  css += `  --spacing-md: ${styling.spacing.md}px;\n`;
  css += `  --spacing-lg: ${styling.spacing.lg}px;\n`;
  css += `  --spacing-xl: ${styling.spacing.xl}px;\n\n`;
  
  // Animations
  css += `  /* Animations */\n`;
  css += `  --transition-speed: ${styling.animations.transitionSpeed};\n`;
  css += `  --hover-speed: ${styling.animations.hoverSpeed};\n`;
  css += `  --glow-speed: ${styling.animations.glowSpeed};\n`;
  css += `  --scanline-speed: ${styling.animations.scanlineSpeed};\n`;
  css += `  --grid-pulse-speed: ${styling.animations.gridPulseSpeed};\n\n`;
  
  // Effects
  css += `  /* Effects */\n`;
  css += `  --backdrop-blur: ${styling.effects.backdropBlur};\n`;
  css += `  --shadow-intensity: ${styling.effects.shadowIntensity};\n`;
  css += `  --glow-intensity: ${styling.effects.glowIntensity};\n`;
  css += `  --grid-size: ${styling.effects.gridSize}px;\n`;
  css += `  --border-width: ${styling.effects.borderWidth}px;\n`;
  
  css += `}\n`;
  
  return css;
}

// Parse CSS content and extract theme configuration
function parseCSSToTheme(cssContent: string): ThemeConfig | null {
  try {
    // Extract CSS variables from :root block (handle multiline)
    const rootMatch = cssContent.match(/:root\s*\{([\s\S]+?)\}/);
    if (!rootMatch) return null;
    
    const cssVars = rootMatch[1];
    
    // Helper to extract CSS variable value
    const getVar = (name: string): string | null => {
      const regex = new RegExp(`--${name.replace(/-/g, '\\-')}:\\s*([^;]+);`, 'm');
      const match = cssVars.match(regex);
      return match ? match[1].trim() : null;
    };
    
    // Helper to extract numeric value (remove px, etc.)
    const getNumeric = (name: string): number => {
      const value = getVar(name);
      if (!value) return 0;
      const num = parseFloat(value.replace(/px|s|%/, ''));
      return isNaN(num) ? 0 : num;
    };
    
    // Extract colors
    const primary = getVar('color-primary') || '#02b36d';
    const primaryLight = getVar('color-primary-light') || '#04d47c';
    const primaryDark = getVar('color-primary-dark') || '#01a35f';
    const primaryDarker = getVar('color-primary-darker') || '#029359';
    
    const bgPrimary = getVar('color-bg-primary') || '#050a0e';
    const bgSecondary = getVar('color-bg-secondary') || '#0a1419';
    const bgTertiary = getVar('color-bg-tertiary') || '#091217';
    const bgQuaternary = getVar('color-bg-quaternary') || '#051014';
    const bgOverlay = getVar('color-bg-overlay') || 'rgba(0, 0, 0, 0.8)';
    
    const textPrimary = getVar('color-text-primary') || '#e4fbf2';
    const textSecondary = getVar('color-text-secondary') || '#7ddfbd';
    const textTertiary = getVar('color-text-tertiary') || '#b3f0d7';
    const textMuted = getVar('color-text-muted') || 'rgba(125, 223, 189, 0.6)';
    const textFaded = getVar('color-text-faded') || 'rgba(125, 223, 189, 0.4)';
    
    const success = getVar('color-success') || '#00ff88';
    const error = getVar('color-error') || '#ff305c';
    const errorAlt = getVar('color-error-alt') || '#ff3232';
    const warning = getVar('color-warning') || '#ff6b6b';
    
    const pingGood = getVar('color-ping-good') || '#10b981';
    const pingMedium = getVar('color-ping-medium') || '#f59e0b';
    const pingPoor = getVar('color-ping-poor') || '#ef4444';
    
    const scrollbarThumb = getVar('color-scrollbar-thumb') || 'rgba(11, 82, 46, 0.5)';
    const scrollbarTrack = getVar('color-scrollbar-track') || 'transparent';
    
    const columnGradientStart = getVar('color-gradient-column-start') || 'rgba(10, 20, 25, 0.8)';
    const columnGradientEnd = getVar('color-gradient-column-end') || 'rgba(5, 8, 10, 0.5)';
    const hoverGradientStart = getVar('color-gradient-hover-start') || 'rgba(2, 179, 109, 0.2)';
    const hoverGradientEnd = getVar('color-gradient-hover-end') || 'rgba(2, 179, 109, 0.05)';
    const accentGradientStart = getVar('color-gradient-accent-start') || '#02b36d';
    const accentGradientEnd = getVar('color-gradient-accent-end') || '#01a35f';
    
    // Extract styling values
    const borderRadiusSm = getNumeric('border-radius-sm');
    const borderRadiusMd = getNumeric('border-radius-md');
    const borderRadiusLg = getNumeric('border-radius-lg');
    const borderRadiusXl = getNumeric('border-radius-xl');
    const borderRadiusXxl = getNumeric('border-radius-xxl');
    const borderRadiusFull = getNumeric('border-radius-full');
    
    const spacingXs = getNumeric('spacing-xs');
    const spacingSm = getNumeric('spacing-sm');
    const spacingMd = getNumeric('spacing-md');
    const spacingLg = getNumeric('spacing-lg');
    const spacingXl = getNumeric('spacing-xl');
    
    const transitionSpeed = getVar('transition-speed') || '0.3s';
    const hoverSpeed = getVar('hover-speed') || '0.2s';
    const glowSpeed = getVar('glow-speed') || '2s';
    const scanlineSpeed = getVar('scanline-speed') || '8s';
    const gridPulseSpeed = getVar('grid-pulse-speed') || '4s';
    
    const backdropBlur = getVar('backdrop-blur') || '10px';
    const shadowIntensity = getNumeric('shadow-intensity');
    const glowIntensity = getNumeric('glow-intensity');
    const gridSize = getNumeric('grid-size');
    const borderWidth = getNumeric('border-width');
    
    return {
      colors: {
        primary: {
          primary,
          primaryLight,
          primaryDark,
          primaryDarker,
        },
        background: {
          bgPrimary,
          bgSecondary,
          bgTertiary,
          bgQuaternary,
          bgOverlay,
        },
        text: {
          textPrimary,
          textSecondary,
          textTertiary,
          textMuted,
          textFaded,
        },
        status: {
          success,
          error,
          errorAlt,
          warning,
        },
        ping: {
          pingGood,
          pingMedium,
          pingPoor,
        },
        scrollbar: {
          scrollbarThumb,
          scrollbarTrack,
        },
        gradients: {
          columnGradientStart,
          columnGradientEnd,
          hoverGradientStart,
          hoverGradientEnd,
          accentGradientStart,
          accentGradientEnd,
        },
      },
      styling: {
        borderRadius: {
          sm: borderRadiusSm || 4,
          md: borderRadiusMd || 6,
          lg: borderRadiusLg || 8,
          xl: borderRadiusXl || 12,
          xxl: borderRadiusXxl || 16,
          full: borderRadiusFull || 9999,
        },
        spacing: {
          xs: spacingXs || 4,
          sm: spacingSm || 8,
          md: spacingMd || 16,
          lg: spacingLg || 24,
          xl: spacingXl || 32,
        },
        animations: {
          transitionSpeed,
          hoverSpeed,
          glowSpeed,
          scanlineSpeed,
          gridPulseSpeed,
        },
        effects: {
          backdropBlur,
          shadowIntensity: shadowIntensity || 0.3,
          glowIntensity: glowIntensity || 0.5,
          gridSize: gridSize || 20,
          borderWidth: borderWidth || 1,
        },
      },
    };
  } catch (error) {
    console.error('Error parsing CSS:', error);
    return null;
  }
}

// Hook to detect mobile viewport
const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  isOpen,
  onClose,
  position,
  onPositionChange,
}) => {
  const isMobile = useIsMobile();
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Theme store actions
  const updateTheme = useThemeStore(state => state.updateTheme);
  const resetTheme = useThemeStore(state => state.resetTheme);
  const savePreset = useThemeStore(state => state.savePreset);
  const loadPreset = useThemeStore(state => state.loadPreset);
  const deletePreset = useThemeStore(state => state.deletePreset);
  const exportTheme = useThemeStore(state => state.exportTheme);
  const importTheme = useThemeStore(state => state.importTheme);
  const currentTheme = useThemeStore(state => state.currentTheme);
  
  // Get presets
  const presets = usePresets();
  const activePresetId = useActivePresetId();
  
  // Export CSS file
  const handleExportCSS = (): void => {
    const name = prompt('Enter CSS file name:');
    if (!name) return;
    
    const css = generateCSSFromTheme(currentTheme);
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, '-')}.css`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import CSS file
  const handleImportCSS = (): void => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'text/css,.css';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const cssContent = event.target?.result as string;
          const theme = parseCSSToTheme(cssContent);
          if (theme) {
            importTheme({
              version: '1.0.0',
              name: file.name.replace('.css', ''),
              description: 'Imported from CSS file',
              theme,
              exportedAt: Date.now(),
            });
            setLevaValues(getInitialLevaValues(theme));
          } else {
            alert('Failed to parse CSS file. Please ensure it contains valid CSS variables.');
          }
        } catch (error) {
          console.error('Failed to import CSS:', error);
          alert('Failed to import CSS file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Leva controls
  const [levaValues, setLevaValues] = useControls(() => {
    // Create reset handler that captures current values
    const handleReset = (): void => {
      if (confirm('Reset theme to default values?')) {
        resetTheme();
        // Use setTimeout to ensure resetTheme completes before updating Leva values
        setTimeout(() => {
          const defaultValues = getInitialLevaValues();
          setLevaValues(defaultValues);
        }, 0);
      }
    };
    
    return {
      'Actions': folder({
        resetTheme: button(handleReset),
        exportCSS: button(handleExportCSS),
        importCSS: button(handleImportCSS),
      }),
      'Primary Colors': folder({
      primary: { value: currentTheme.colors.primary.primary, label: 'Primary' },
      primaryLight: { value: currentTheme.colors.primary.primaryLight, label: 'Primary Light' },
      primaryDark: { value: currentTheme.colors.primary.primaryDark, label: 'Primary Dark' },
      primaryDarker: { value: currentTheme.colors.primary.primaryDarker, label: 'Primary Darker' },
    }),
    'Background Colors': folder({
      bgPrimary: { value: currentTheme.colors.background.bgPrimary, label: 'Background Primary' },
      bgSecondary: { value: currentTheme.colors.background.bgSecondary, label: 'Background Secondary' },
      bgTertiary: { value: currentTheme.colors.background.bgTertiary, label: 'Background Tertiary' },
      bgQuaternary: { value: currentTheme.colors.background.bgQuaternary, label: 'Background Quaternary' },
      bgOverlay: { value: currentTheme.colors.background.bgOverlay, label: 'Background Overlay' },
    }),
    'Text Colors': folder({
      textPrimary: { value: currentTheme.colors.text.textPrimary, label: 'Text Primary' },
      textSecondary: { value: currentTheme.colors.text.textSecondary, label: 'Text Secondary' },
      textTertiary: { value: currentTheme.colors.text.textTertiary, label: 'Text Tertiary' },
      textMuted: { value: currentTheme.colors.text.textMuted, label: 'Text Muted' },
      textFaded: { value: currentTheme.colors.text.textFaded, label: 'Text Faded' },
    }),
    'Status Colors': folder({
      success: { value: currentTheme.colors.status.success, label: 'Success' },
      error: { value: currentTheme.colors.status.error, label: 'Error' },
      errorAlt: { value: currentTheme.colors.status.errorAlt, label: 'Error Alt' },
      warning: { value: currentTheme.colors.status.warning, label: 'Warning' },
    }),
    'Ping Status': folder({
      pingGood: { value: currentTheme.colors.ping.pingGood, label: 'Good' },
      pingMedium: { value: currentTheme.colors.ping.pingMedium, label: 'Medium' },
      pingPoor: { value: currentTheme.colors.ping.pingPoor, label: 'Poor' },
    }),
    'Scrollbar': folder({
      scrollbarThumb: { value: currentTheme.colors.scrollbar.scrollbarThumb, label: 'Thumb' },
      scrollbarTrack: { value: currentTheme.colors.scrollbar.scrollbarTrack, label: 'Track' },
    }),
    'Gradients': folder({
      columnGradientStart: { value: currentTheme.colors.gradients.columnGradientStart, label: 'Column Start' },
      columnGradientEnd: { value: currentTheme.colors.gradients.columnGradientEnd, label: 'Column End' },
      hoverGradientStart: { value: currentTheme.colors.gradients.hoverGradientStart, label: 'Hover Start' },
      hoverGradientEnd: { value: currentTheme.colors.gradients.hoverGradientEnd, label: 'Hover End' },
      accentGradientStart: { value: currentTheme.colors.gradients.accentGradientStart, label: 'Accent Start' },
      accentGradientEnd: { value: currentTheme.colors.gradients.accentGradientEnd, label: 'Accent End' },
    }),
    'Border Radius': folder({
      borderRadiusSm: { value: currentTheme.styling.borderRadius.sm, label: 'Small', min: 0, max: 20, step: 1 },
      borderRadiusMd: { value: currentTheme.styling.borderRadius.md, label: 'Medium', min: 0, max: 20, step: 1 },
      borderRadiusLg: { value: currentTheme.styling.borderRadius.lg, label: 'Large', min: 0, max: 30, step: 1 },
      borderRadiusXl: { value: currentTheme.styling.borderRadius.xl, label: 'Extra Large', min: 0, max: 40, step: 1 },
      borderRadiusXxl: { value: currentTheme.styling.borderRadius.xxl, label: '2XL', min: 0, max: 50, step: 1 },
      borderRadiusFull: { value: currentTheme.styling.borderRadius.full, label: 'Full', min: 0, max: 9999, step: 1 },
    }),
    'Spacing': folder({
      spacingXs: { value: currentTheme.styling.spacing.xs, label: 'Extra Small', min: 0, max: 20, step: 1 },
      spacingSm: { value: currentTheme.styling.spacing.sm, label: 'Small', min: 0, max: 30, step: 1 },
      spacingMd: { value: currentTheme.styling.spacing.md, label: 'Medium', min: 0, max: 50, step: 1 },
      spacingLg: { value: currentTheme.styling.spacing.lg, label: 'Large', min: 0, max: 80, step: 1 },
      spacingXl: { value: currentTheme.styling.spacing.xl, label: 'Extra Large', min: 0, max: 100, step: 1 },
    }),
    'Animations': folder({
      transitionSpeed: { value: currentTheme.styling.animations.transitionSpeed, label: 'Transition Speed' },
      hoverSpeed: { value: currentTheme.styling.animations.hoverSpeed, label: 'Hover Speed' },
      glowSpeed: { value: currentTheme.styling.animations.glowSpeed, label: 'Glow Speed' },
      scanlineSpeed: { value: currentTheme.styling.animations.scanlineSpeed, label: 'Scanline Speed' },
      gridPulseSpeed: { value: currentTheme.styling.animations.gridPulseSpeed, label: 'Grid Pulse Speed' },
    }),
    'Effects': folder({
      backdropBlur: { value: currentTheme.styling.effects.backdropBlur, label: 'Backdrop Blur' },
      shadowIntensity: { value: currentTheme.styling.effects.shadowIntensity, label: 'Shadow Intensity', min: 0, max: 1, step: 0.05 },
      glowIntensity: { value: currentTheme.styling.effects.glowIntensity, label: 'Glow Intensity', min: 0, max: 1, step: 0.05 },
      gridSize: { value: currentTheme.styling.effects.gridSize, label: 'Grid Size', min: 10, max: 50, step: 1 },
      borderWidth: { value: currentTheme.styling.effects.borderWidth, label: 'Border Width', min: 0, max: 10, step: 1 },
    }),
    };
  }, [currentTheme]);
  
  // Update theme when Leva values change
  useEffect(() => {
    const newTheme = levaControlsToThemeConfig(levaValues);
    updateTheme(newTheme);
  }, [levaValues, updateTheme]);
  
  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.leva-container')) {
      return; // Don't drag when interacting with Leva controls
    }
    
    setIsDragging(true);
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 400;
      const maxY = window.innerHeight - 100;
      
      onPositionChange({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  }, [isDragging, dragOffset, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Export theme as JSON file
  const handleExport = (): void => {
    const name = prompt('Enter theme name:');
    if (!name) return;
    
    const themeExport = exportTheme(name, 'Exported theme');
    const blob = new Blob([JSON.stringify(themeExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Import theme from JSON file
  const handleImport = (): void => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const themeExport = JSON.parse(event.target?.result as string) as import('../types/theme').ThemeExport;
          importTheme(themeExport);
          setLevaValues(getInitialLevaValues(themeExport.theme));
        } catch (error) {
          console.error('Failed to import theme:', error);
          alert('Failed to import theme. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };
  
  // Save preset
  const handleSavePreset = (): void => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }
    savePreset(presetName);
    setPresetName('');
    setShowPresetInput(false);
  };
  
  // Load preset
  const handleLoadPreset = (presetId: string): void => {
    loadPreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setLevaValues(getInitialLevaValues(preset.theme));
    }
  };
  
  // Reset to default
  const handleReset = (): void => {
    if (confirm('Reset theme to default values?')) {
      resetTheme();
      setLevaValues(getInitialLevaValues());
    }
  };

  if (!isOpen) return null;

  // Mobile full-screen layout
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[9999] bg-app-overlay flex items-center justify-center p-4">
        <div className="bg-app-primary border border-app-primary-40 rounded-lg w-full h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-app-primary-20">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-mono color-primary">THEME CUSTOMIZER</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-primary-10 rounded transition-colors"
            >
              <X size={18} className="color-primary" />
            </button>
          </div>
          
          {/* Controls */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="leva-container" />
          </div>
          
          {/* Actions */}
          <div className="p-4 border-t border-app-primary-20 space-y-2">
            <button
              onClick={handleReset}
              className="w-full px-3 py-2 text-xs font-mono border border-app-primary-40 rounded hover:bg-primary-10 transition-colors color-primary"
            >
              <RefreshCw size={14} className="inline mr-2" />
              RESET TO DEFAULT
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop draggable panel
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        ref={cardRef}
        className={`fixed z-[9999] bg-app-secondary border border-app-primary-40 rounded-lg shadow-2xl ${
          isDragging ? 'cursor-grabbing' : ''
        } ${isMinimized ? 'w-80' : 'w-96'}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b border-app-primary-20 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <Move size={14} className="color-primary opacity-60" />
            <h3 className="text-sm font-mono color-primary tracking-wider">THEME CUSTOMIZER</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-primary-10 rounded transition-colors"
            >
              {isMinimized ? (
                <Maximize2 size={14} className="color-primary" />
              ) : (
                <Minimize2 size={14} className="color-primary" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-primary-10 rounded transition-colors"
            >
              <X size={14} className="color-primary" />
            </button>
          </div>
        </div>
        
        {!isMinimized && (
          <>
            {/* Presets Section */}
            <div className="p-3 border-b border-app-primary-20">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs font-mono text-app-secondary uppercase">Presets</label>
              </div>
              
              {presets.length > 0 && (
                <div className="mb-2 space-y-1 max-h-24 overflow-y-auto">
                  {presets.map(preset => (
                    <div
                      key={preset.id}
                      className={`flex items-center gap-2 p-2 rounded border ${
                        activePresetId === preset.id
                          ? 'border-app-primary bg-primary-10'
                          : 'border-app-primary-20 hover:bg-primary-05'
                      }`}
                    >
                      <button
                        onClick={() => handleLoadPreset(preset.id)}
                        className="flex-1 text-left text-xs font-mono color-primary"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete preset "${preset.name}"?`)) {
                            deletePreset(preset.id);
                          }
                        }}
                        className="p-1 hover:bg-error-20 rounded transition-colors"
                      >
                        <Trash2 size={12} className="text-error" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {showPresetInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                    placeholder="Preset name..."
                    className="flex-1 px-2 py-1 text-xs font-mono bg-app-primary border border-app-primary-40 rounded focus:outline-none focus:border-app-primary text-app-primary"
                    autoFocus
                  />
                  <button
                    onClick={handleSavePreset}
                    className="px-2 py-1 text-xs font-mono border border-app-primary rounded hover:bg-primary-10 transition-colors color-primary"
                  >
                    <Save size={12} />
                  </button>
                  <button
                    onClick={() => {
                      setShowPresetInput(false);
                      setPresetName('');
                    }}
                    className="px-2 py-1 text-xs font-mono border border-app-primary-20 rounded hover:bg-primary-05 transition-colors text-app-secondary"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPresetInput(true)}
                  className="w-full px-2 py-1 text-xs font-mono border border-app-primary-40 rounded hover:bg-primary-10 transition-colors color-primary"
                >
                  <Save size={12} className="inline mr-1" />
                  SAVE CURRENT
                </button>
              )}
            </div>
            
            {/* Leva Controls */}
            <div className="p-3 max-h-96 overflow-y-auto leva-container">
              {/* Leva panel will be injected here */}
            </div>
            
            {/* Actions */}
            <div className="p-3 border-t border-app-primary-20 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExport}
                  className="px-2 py-1.5 text-xs font-mono border border-app-primary-40 rounded hover:bg-primary-10 transition-colors color-primary"
                >
                  <Download size={12} className="inline mr-1" />
                  EXPORT
                </button>
                <button
                  onClick={handleImport}
                  className="px-2 py-1.5 text-xs font-mono border border-app-primary-40 rounded hover:bg-primary-10 transition-colors color-primary"
                >
                  <Upload size={12} className="inline mr-1" />
                  IMPORT
                </button>
              </div>
              <button
                onClick={handleReset}
                className="w-full px-2 py-1.5 text-xs font-mono border border-error-alt-40 rounded hover:bg-error-20 transition-colors text-error-alt"
              >
                <RefreshCw size={12} className="inline mr-1" />
                RESET TO DEFAULT
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ThemeCustomizer;
