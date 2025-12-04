# Whitelabel Guide

## Overview

This guide explains how to customize the Solana UI for your own brand.

## Brand Configuration

All brand-related settings are centralized in `brand.json`:

```json
{
  "brand": {
    "name": "Your Brand",
    "displayName": "YOUR BRAND",
    "altText": "Your Brand Description",
    "domain": "yourdomain.com",
    "appUrl": "https://app.yourdomain.com",
    "docsUrl": "https://docs.yourdomain.com",
    "githubUrl": "https://github.com/yourbrand/repo",
    "githubOrg": "https://github.com/yourbrand",
    "social": {
      "twitter": "@yourbrand",
      "github": "yourbrand"
    },
    "seo": {
      "title": "Your Brand - Trading Platform",
      "ogTitle": "Your Brand - Solana Trading",
      "description": "Your brand description for SEO",
      "ogImage": "https://yourdomain.com/images/og.jpg",
      "twitterImage": "https://yourdomain.com/images/twitter.png"
    },
    "favicon": {
      "baseUrl": "https://yourdomain.com/images/favicon",
      "themeColor": "#000000",
      "tileColor": "#000000"
    },
    "theme": {
      "name": "green"
    }
  }
}
```

## Customization Steps

### 1. Update Brand Configuration

Edit `brand.json` with your brand details:

- **name**: Internal brand name
- **displayName**: Display name shown in the UI (typically uppercase)
- **altText**: Alt text for logo images
- **domain**: Your domain without protocol
- **appUrl**: Full URL to your app
- **docsUrl**: Link to your documentation

### 2. Replace Logo

Replace `src/logo.png` with your logo. The logo should:
- Be a PNG with transparent background
- Work well at small sizes (32-64px height)
- Have good contrast against dark backgrounds

### 3. Customize Theme

Create a new CSS file or edit `green.css`:

```css
:root {
  --color-primary: #your-brand-color;
  --color-primary-light: #your-lighter-color;
  --color-primary-dark: #your-darker-color;
  /* See docs/CUSTOMIZATION.md for all variables */
}
```

Update the theme name in `brand.json`:

```json
{
  "theme": {
    "name": "your-theme-name"
  }
}
```

### 4. Update Favicon

Place your favicon files at the URL specified in `brand.json`:
- favicon.ico
- favicon-16x16.png
- favicon-32x32.png
- apple-touch-icon.png

### 5. Update SEO

Configure the SEO section in `brand.json`:
- **title**: Browser tab title
- **ogTitle**: Open Graph title for social sharing
- **description**: Meta description
- **ogImage**: Image for social sharing (1200x630px recommended)
- **twitterImage**: Twitter card image

### 6. Regenerate HTML

After updating `brand.json`, regenerate the HTML template:

```bash
npm run generate-html
```

This updates `index.html` with your brand configuration.

## Build and Deploy

```bash
npm run build
```

Deploy the `dist` folder to your hosting provider.

## Additional Resources

- [Theme Customization](CUSTOMIZATION.md) - Full CSS variable reference
- [Iframe Integration](IFRAME.md) - Embed in external applications
