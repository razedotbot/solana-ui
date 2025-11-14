# Theme Customization Tool

## Overview

A real-time theme customization developer tool built with Leva, Zustand, and CSS variables. This tool allows instant modification of design tokens with preset management and import/export capabilities.

## Features

- ✨ **Real-time Preview**: Changes instantly reflected via CSS variables
- 💾 **Preset System**: Save, load, and delete named theme presets
- 📥 **Import/Export**: Download/upload theme configurations as JSON
- 🔄 **Persistence**: Auto-save current theme to localStorage
- 🛠️ **Development Only**: Panel hidden in production builds
- 🎨 **Professional UI**: Matches existing app design with green theme

## Usage

### Opening the Theme Customizer

**Keyboard Shortcut**: Press `Ctrl+Shift+T` to toggle the theme customizer panel.

> **Note**: The theme customizer is only available in development mode (`npm run dev`).

### Customizing Colors

The theme customizer organizes colors into logical groups:

1. **Primary Colors**: Main brand colors (primary, light, dark, darker variants)
2. **Background Colors**: Background layers (primary, secondary, tertiary, quaternary, overlay)
3. **Text Colors**: Text styling (primary, secondary, tertiary, muted, faded)
4. **Status Colors**: Feedback colors (success, error, warning)
5. **Ping Status**: Connection quality indicators (good, medium, poor)
6. **Scrollbar**: Scrollbar styling (thumb, track)

### Saving Presets

1. Customize your theme using the color pickers
2. Click **"SAVE CURRENT"** in the Presets section
3. Enter a name for your preset
4. Press Enter or click the save icon

### Loading Presets

- Click on any saved preset in the list to apply it instantly
- The active preset is highlighted with a green border
- Delete unwanted presets using the trash icon

### Exporting Themes

1. Click **"EXPORT"** button
2. Enter a name for the theme export
3. A JSON file will be downloaded with your theme configuration

### Importing Themes

1. Click **"IMPORT"** button
2. Select a previously exported theme JSON file
3. The theme will be applied immediately

### Resetting to Default

Click **"RESET TO DEFAULT"** to restore the original green theme values.

## Technical Details

### Architecture

- **State Management**: Zustand store (`src/stores/themeStore.ts`)
- **CSS Variables**: Dynamic updates via `src/utils/cssVariableManager.ts`
- **UI Controls**: Leva integration (`src/config/levaConfig.ts`)
- **Component**: Draggable panel (`src/components/ThemeCustomizer.tsx`)

### File Structure

```
src/
├── types/theme.ts              # TypeScript interfaces
├── stores/themeStore.ts        # Zustand state management
├── utils/cssVariableManager.ts # CSS variable utilities
├── config/levaConfig.ts        # Leva control schemas
└── components/
    └── ThemeCustomizer.tsx     # Main UI component
```

### Data Persistence

- **Current Theme**: Saved to localStorage under `theme-store`
- **Presets**: Stored alongside the current theme
- **Auto-save**: Changes persist across page refreshes

### Theme Export Format

```json
{
  "version": "1.0.0",
  "name": "My Custom Theme",
  "description": "Exported theme",
  "theme": {
    "colors": {
      "primary": { ... },
      "background": { ... },
      "text": { ... },
      "status": { ... },
      "ping": { ... },
      "scrollbar": { ... }
    }
  },
  "exportedAt": 1234567890
}
```

## Development

### Adding New Theme Properties

1. Add the property to `ThemeConfig` interface in `src/types/theme.ts`
2. Update `DEFAULT_THEME` with the default value
3. Add Leva control in `src/config/levaConfig.ts`
4. Update CSS variable application in `src/utils/cssVariableManager.ts`

### Customizing the UI

The theme customizer UI can be styled by modifying:
- `src/components/ThemeCustomizer.tsx` - Component structure and styling
- CSS classes follow the existing green theme patterns

## Keyboard Shortcuts

- `Ctrl+Shift+T` - Toggle theme customizer panel
- `Enter` - Save preset name when editing
- `Escape` - Cancel preset name editing

## Mobile Support

On mobile devices, the theme customizer displays as a full-screen modal instead of a draggable panel for better usability.

## Production Builds

The theme customizer is automatically excluded from production builds via:

```typescript
process.env.NODE_ENV === 'development'
```

This ensures zero runtime cost in production deployments.

