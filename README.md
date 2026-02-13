<p align="center">
  <img src="https://img.shields.io/badge/Built%20on-Solana-3a0ca3?style=for-the-badge&logo=solana" alt="Built on Solana" />
  <img src="https://img.shields.io/badge/Open%20Source-Yes-00b386?style=for-the-badge&logo=github" alt="Open Source" />
</p>

## 🚀 One-Click Deployment

You can deploy **Raze.bot** instantly using either **Vercel** or **Netlify** with the buttons below:

<div align="center">

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/razedotbot/solana-ui)
[![Deploy with Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/razedotbot/solana-ui)

</div>

**Raze.bot** is a comprehensive, open-source multi-wallet trading platform designed for the Solana blockchain.  
It provides users with a seamless interface to connect various Solana wallets and execute trades efficiently.

> 🛠️ This project was developed by the team at [**Raze.bot**](https://raze.bot) using [**Raze APIs**](https://docs.raze.bot) to power its backend integrations and blockchain interactions.

---

## 📚 Documentation

Find the full documentation here:  
👉 [https://docs.raze.bot/solana-ui/introduction](https://docs.raze.bot/solana-ui/introduction)

---

## ✨ Features

### Wallet Management
- 🔑 **Multi-Wallet Support** – Create, import, and manage multiple Solana wallets with HD wallet derivation
- �  **Import Options** – Private key import (Base58), seed phrase recovery, bulk import from file
- 🏷️ **Wallet Organization** – Custom labels, categories (Soft, Medium, Hard), drag & drop reordering
- 💰 **Wallet Operations** – Fund/Distribute, Consolidate, Transfer, Deposit, Burn tokens

### Trading Features
- 📈 **Quick Trade** – One-click buy/sell with customizable preset buttons
- � **Multi-Wallet Trading** – Execute trades across all wallets simultaneously
- 📊 **Bundle Strategies** – Single Thread, Batch Mode, or All-In-One execution
- 📋 **Limit Orders** – Market cap triggers, price targets, expiry dates

### Automation Tools
- 🎯 **Sniper Bot** – Automatically snipe new token launches with configurable filters
- 👥 **Copy Trading** – Mirror trades from successful wallets in real-time
- ⚙️ **Custom Profiles** – Create automation profiles with conditions and actions

### Token Deployment
- 🚀 **Multi-Platform** – Deploy to Pump.fun, Bonk.fun, Meteora, and more
- 🎨 **Full Customization** – Token metadata, social links, image upload
- 📦 **Multi-Wallet Bundling** – Deploy with up to 5-20 wallets depending on platform

### Additional Features
- 📱 **Responsive Design** – Optimized for both desktop and mobile devices
- 🎨 **Whitelabel Support** – Customizable themes, branding, and CSS variables
- 🔒 **Security First** – AES encryption, local-first storage, fully auditable codebase
- 🖼️ **Iframe Integration** – Embed Raze in your application via iframe

---

## 🚀 Demo

Try the live version here:  
👉 [https://sol.raze.bot/](https://sol.raze.bot/)

---

## 🧰 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

```bash
git clone https://github.com/razedotbot/solana-ui.git
cd solana-ui
npm install
npm run dev
```

Visit: `http://localhost:5173`

---

## 🗂 Project Structure

```
solana-ui/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── modals/       # Modal dialogs
│   │   └── tools/        # Trading tools & automation
│   ├── contexts/         # React contexts
│   ├── pages/            # Page components
│   │   ├── HomePage.tsx
│   │   ├── WalletsPage.tsx
│   │   ├── AutomatePage.tsx
│   │   ├── DeployPage.tsx
│   │   └── SettingsPage.tsx
│   └── utils/            # Utility functions
├── docs/                 # Documentation
├── scripts/              # Build scripts
├── brand.json            # Brand configuration
├── green.css             # Default theme
└── package.json
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint for code quality |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run analyze` | Analyze bundle size |
| `npm run generate-html` | Regenerate HTML from template |

---

## 🧪 Technologies Used

- [React 18](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Jupiter API](https://jup.ag/)

---

## 🔧 Configuration

### Brand Configuration

Customize branding by editing `brand.json`:

```json
{
  "brand": {
    "name": "Your Brand",
    "displayName": "YOUR BRAND",
    "domain": "yourdomain.com",
    "appUrl": "https://app.yourdomain.com",
    "docsUrl": "https://docs.yourdomain.com",
    "theme": {
      "name": "green"
    }
  }
}
```

After editing, regenerate HTML:

```bash
npm run generate-html
```

### Theme Customization

Edit `green.css` or create a new theme file:

```css
:root {
  /* Primary Colors */
  --color-primary: #02b36d;
  --color-primary-light: #04d47c;
  --color-primary-dark: #01a35f;
  
  /* Background Colors */
  --color-bg-primary: #050a0e;
  --color-bg-secondary: #0a1419;
}
```

---

## 🔒 Security

Raze prioritizes security at every level:

- **Encrypted Storage** – All wallet private keys are encrypted using AES encryption before storage
- **Local-First** – Your keys never leave your device - all encryption happens client-side
- **Dual Storage** – Redundant storage in localStorage and IndexedDB for reliability
- **Open Source** – Fully auditable codebase - verify the security yourself

---

## 🌐 Community & Support

<p align="center">
  <a href="https://github.com/razedotbot"><img src="https://img.shields.io/badge/GitHub-razedotbot-181717?style=for-the-badge&logo=github" alt="GitHub" /></a>
  <a href="https://t.me/razesolana"><img src="https://img.shields.io/badge/Telegram-razesolana-26A5E4?style=for-the-badge&logo=telegram" alt="Telegram" /></a>
  <a href="https://discord.com/invite/RNK5v92XpB"><img src="https://img.shields.io/badge/Discord-Join%20Us-5865F2?style=for-the-badge&logo=discord" alt="Discord" /></a>
</p>

---

## 🤝 Contributing

Contributions are welcome!  
Fork the repo and open a pull request for new features, improvements, or bug fixes.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
