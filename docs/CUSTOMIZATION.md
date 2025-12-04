# Theme Customization Guide

This document provides a comprehensive overview of all customizable CSS variables available for theming the application.

## Table of Contents

- [Colors](#colors)
- [Gradients](#gradients)
- [Border Radius](#border-radius)
- [Spacing](#spacing)
- [Animations](#animations)
- [Effects](#effects)
- [Usage](#usage)
- [Creating Custom Themes](#creating-custom-themes)

## Colors

### Primary Colors
Controls the main brand color and its variations.

- **Primary**: Main brand color (`#02b36d`)
- **Primary Light**: Lighter variation for hovers (`#04d47c`)
- **Primary Dark**: Darker variation for depth (`#01a35f`)
- **Primary Darker**: Darkest variation (`#029359`)

**CSS Variables**: `--color-primary`, `--color-primary-light`, `--color-primary-dark`, `--color-primary-darker`

### Background Colors
Controls all background colors used throughout the UI.

- **Background Primary**: Main background color (`#050a0e`)
- **Background Secondary**: Secondary background for cards/panels (`#0a1419`)
- **Background Tertiary**: Tertiary background for nested elements (`#091217`)
- **Background Quaternary**: Quaternary background for special sections (`#051014`)
- **Background Overlay**: Semi-transparent overlay color (`rgba(0, 0, 0, 0.8)`)

**CSS Variables**: `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-tertiary`, `--color-bg-quaternary`, `--color-bg-overlay`

### Text Colors
Controls all text colors.

- **Text Primary**: Primary text color (`#e4fbf2`)
- **Text Secondary**: Secondary text color (`#7ddfbd`)
- **Text Tertiary**: Tertiary text color (`#b3f0d7`)
- **Text Muted**: Muted text color with opacity (`rgba(125, 223, 189, 0.6)`)
- **Text Faded**: Faded text color with more opacity (`rgba(125, 223, 189, 0.4)`)

**CSS Variables**: `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-text-muted`, `--color-text-faded`

### Status Colors
Controls status indication colors (success, error, warnings).

- **Success**: Success state color (`#00ff88`)
- **Error**: Error state color (`#ff305c`)
- **Error Alt**: Alternative error color (`#ff3232`)
- **Warning**: Warning state color (`#ff6b6b`)

**CSS Variables**: `--color-success`, `--color-error`, `--color-error-alt`, `--color-warning`

### Ping Status
Controls network latency/ping indicator colors.

- **Ping Good**: Good latency color (`#10b981`)
- **Ping Medium**: Medium latency color (`#f59e0b`)
- **Ping Poor**: Poor latency color (`#ef4444`)

**CSS Variables**: `--color-ping-good`, `--color-ping-medium`, `--color-ping-poor`

### Scrollbar
Controls scrollbar appearance.

- **Thumb**: Scrollbar thumb color (`rgba(11, 82, 46, 0.5)`)
- **Track**: Scrollbar track color (`transparent`)

**CSS Variables**: `--color-scrollbar-thumb`, `--color-scrollbar-track`

## Gradients

Controls gradient colors used for cards, columns, and backgrounds.

### Column Gradients
Used for main column/card background gradients.

- **Column Start**: Gradient starting color (`rgba(10, 20, 25, 0.8)`)
- **Column End**: Gradient ending color (`rgba(5, 8, 10, 0.5)`)

**CSS Variables**: `--color-gradient-column-start`, `--color-gradient-column-end`

**Usage**: 
```css
background: linear-gradient(to bottom right, var(--color-gradient-column-start), var(--color-gradient-column-end));
```

### Hover Gradients
Used for hover state gradient effects.

- **Hover Start**: Hover gradient starting color (`rgba(2, 179, 109, 0.2)`)
- **Hover End**: Hover gradient ending color (`rgba(2, 179, 109, 0.05)`)

**CSS Variables**: `--color-gradient-hover-start`, `--color-gradient-hover-end`

### Accent Gradients
Used for buttons and highlighted elements.

- **Accent Start**: Accent gradient starting color (`#02b36d`)
- **Accent End**: Accent gradient ending color (`#01a35f`)

**CSS Variables**: `--color-gradient-accent-start`, `--color-gradient-accent-end`

## Border Radius

Controls the roundness of corners throughout the UI.

- **Small**: Small radius (4px) - For inputs, small buttons
- **Medium**: Medium radius (6px) - For regular elements
- **Large**: Large radius (8px) - For cards
- **Extra Large**: XL radius (12px) - For prominent cards
- **2XL**: 2XL radius (16px) - For large containers
- **Full**: Fully rounded (9999px) - For pills, badges

**CSS Variables**: `--border-radius-sm`, `--border-radius-md`, `--border-radius-lg`, `--border-radius-xl`, `--border-radius-xxl`, `--border-radius-full`

**Range**: 0-9999px

## Spacing

Controls padding and margin throughout the UI.

- **Extra Small**: 4px
- **Small**: 8px
- **Medium**: 16px
- **Large**: 24px
- **Extra Large**: 32px

**CSS Variables**: `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`, `--spacing-xl`

**Range**: 0-100px

## Animations

Controls animation timing and speeds throughout the UI.

### Transition Speed
Default transition speed for standard transitions.
- **Default**: `0.3s`
- **Variable**: `--transition-speed`

### Hover Speed
Speed for hover animations.
- **Default**: `0.2s`
- **Variable**: `--hover-speed`

### Glow Speed
Speed for glow/pulse animations.
- **Default**: `2s`
- **Variable**: `--glow-speed`

### Scanline Speed
Speed for scanline effect animation.
- **Default**: `8s`
- **Variable**: `--scanline-speed`

### Grid Pulse Speed
Speed for background grid pulse animation.
- **Default**: `4s`
- **Variable**: `--grid-pulse-speed`

## Effects

Controls visual effects like shadows, blurs, and other stylistic properties.

### Backdrop Blur
Amount of blur for backdrop-filter effects.
- **Default**: `10px`
- **Variable**: `--backdrop-blur`

### Shadow Intensity
Multiplier for shadow intensity (0-1).
- **Default**: `0.3`
- **Range**: 0.0 - 1.0
- **Variable**: `--shadow-intensity`

### Glow Intensity
Multiplier for glow effect intensity (0-1).
- **Default**: `0.5`
- **Range**: 0.0 - 1.0
- **Variable**: `--glow-intensity`

### Grid Size
Size of the background grid pattern.
- **Default**: `20px`
- **Range**: 10-50px
- **Variable**: `--grid-size`

### Border Width
Default border width for borders throughout the UI.
- **Default**: `1px`
- **Range**: 0-10px
- **Variable**: `--border-width`

## Usage

### Customizing the Theme

To customize the theme, edit the CSS file directly:

1. Open `green.css` in the project root
2. Modify the CSS variables under `:root`
3. Save the file - changes will be reflected immediately in development mode

### Creating a New Theme

1. Copy `green.css` to a new file (e.g., `blue.css`)
2. Modify the CSS variables to your desired colors
3. Update `brand.json` to reference your new theme:

```json
{
  "theme": {
    "name": "blue"
  }
}
```

4. Import your theme CSS file in the application

## Developer Notes

### Adding Custom Variables

All theme variables are automatically applied to CSS custom properties (CSS variables) and can be used anywhere in your styles:

```css
/* Example using theme variables */
.my-element {
  background-color: var(--color-primary);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-md);
  transition: all var(--transition-speed) ease;
}
```

## File Structure

- **Styles**: `green.css` - Default theme values (in project root)

## Complete Variable Reference

### Colors
```css
/* Primary */
--color-primary
--color-primary-light
--color-primary-dark
--color-primary-darker

/* Background */
--color-bg-primary
--color-bg-secondary
--color-bg-tertiary
--color-bg-quaternary
--color-bg-overlay

/* Text */
--color-text-primary
--color-text-secondary
--color-text-tertiary
--color-text-muted
--color-text-faded

/* Status */
--color-success
--color-error
--color-error-alt
--color-warning

/* Ping */
--color-ping-good
--color-ping-medium
--color-ping-poor

/* Scrollbar */
--color-scrollbar-thumb
--color-scrollbar-track

/* Gradients */
--color-gradient-column-start
--color-gradient-column-end
--color-gradient-hover-start
--color-gradient-hover-end
--color-gradient-accent-start
--color-gradient-accent-end
```

### Styling
```css
/* Border Radius */
--border-radius-sm
--border-radius-md
--border-radius-lg
--border-radius-xl
--border-radius-xxl
--border-radius-full

/* Spacing */
--spacing-xs
--spacing-sm
--spacing-md
--spacing-lg
--spacing-xl

/* Animations */
--transition-speed
--hover-speed
--glow-speed
--scanline-speed
--grid-pulse-speed

/* Effects */
--backdrop-blur
--shadow-intensity
--glow-intensity
--grid-size
--border-width
```

## Creating Custom Themes

### Example: Cyberpunk Blue Theme

```css
:root {
  --color-primary: #00ffff;
  --color-primary-light: #66ffff;
  --color-primary-dark: #00cccc;
  --color-primary-darker: #009999;
  
  --color-bg-primary: #0a0a1a;
  --color-bg-secondary: #0f0f2a;
  --color-bg-tertiary: #14143a;
  
  --color-gradient-accent-start: #00ffff;
  --color-gradient-accent-end: #0088ff;
  
  --grid-size: 25px;
}
```

### Example: Warm Orange Theme

```css
:root {
  --color-primary: #ff6b35;
  --color-primary-light: #ff8c5a;
  --color-primary-dark: #e55a2b;
  --color-primary-darker: #cc4a20;
  
  --color-bg-primary: #1a0a00;
  --color-bg-secondary: #2a1400;
  --color-bg-tertiary: #3a1e00;
  
  --glow-intensity: 0.7;
}
```

### Example: Minimal Dark Theme

```css
:root {
  --color-bg-primary: #000000;
  --color-bg-secondary: #0a0a0a;
  --color-bg-tertiary: #141414;
  --color-bg-quaternary: #050505;
  
  --border-radius-sm: 2px;
  --border-radius-md: 2px;
  --border-radius-lg: 4px;
  --border-radius-xl: 4px;
  
  --grid-size: 30px;
  --transition-speed: 0.15s;
  --hover-speed: 0.1s;
}
```

---

**Last Updated**: December 2024
**Version**: 5.0.0

