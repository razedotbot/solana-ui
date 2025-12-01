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

![Raze.bot image](https://i.imgur.com/fDrfNv3.png)

**Solana UI** is a multi-wallet trading platform designed for the Solana blockchain.  
It provides users with a seamless interface to connect various Solana wallets and execute trades efficiently.

> 🛠️ This project was developed by the team at [**Raze.bot**](https://raze.bot) using the open-source [**Fury SDKs**](https://github.com/furydotbot) to power its backend integrations and blockchain interactions.

---

## 📚 Documentation

Find the full documentation here:  
👉 [https://docs.raze.bot/how-to-use](https://docs.raze.bot/how-to-use)

Additional docs in this repo:
- [Theme Customization](docs/CUSTOMIZATION.md) - CSS variables and theming
- [Iframe Integration](docs/IFRAME.md) - Embed the trading app in your application
- [Security Policy](docs/SECURITY.md) - Vulnerability reporting
- [Security Audit](docs/AUDIT.md) - Encryption implementation details
- [Whitelabel](docs/WHITELABEL.md) - Branding customization

---

## ✨ Features

- 🔑 **Multi-Wallet Support** – Create, import, and manage multiple Solana wallets with HD wallet derivation
- 📈 **Trading Interface** – Intuitive UI for executing buys/sells with quick trade functionality
- 🤖 **Automation Tools** – Profile-based automation with conditions and actions
- 🚀 **Token Deployment** – Deploy tokens to Pump.fun, Moonshot, Boop, and more
- 📱 **Responsive Design** – Optimized for both desktop and mobile devices
- ⚡ **Fast Performance** – Built with Vite and React for a smooth user experience
- 🔐 **Secure Storage** – AES-encrypted wallet storage with IndexedDB fallback
- 🎨 **Customizable Themes** – Full CSS variable support for theming

---

## 🚀 Demo

Try the live version here:  
👉 [https://sol.raze.bot](https://sol.raze.bot)

---

## 🧰 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

```bash
git clone https://github.com/furydotbot/solana-ui.git
cd solana-ui
npm install
npm run dev
```

Visit: `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🗂 Project Structure

```
solana-ui/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── modals/           # Modal dialogs
│   │   │   ├── BurnModal.tsx
│   │   │   ├── CalculatePNLModal.tsx
│   │   │   ├── ConsolidateModal.tsx
│   │   │   ├── CreateMasterWalletModal.tsx
│   │   │   ├── CreateWalletModal.tsx
│   │   │   ├── DepositModal.tsx
│   │   │   ├── DistributeModal.tsx
│   │   │   ├── ExportSeedPhraseModal.tsx
│   │   │   ├── FundModal.tsx
│   │   │   ├── ImportWalletModal.tsx
│   │   │   ├── MixerModal.tsx
│   │   │   ├── QuickTradeModal.tsx
│   │   │   ├── TransferModal.tsx
│   │   │   └── WalletQuickTradeModal.tsx
│   │   ├── tools/            # Trading tools & automation
│   │   │   └── automate/     # Automation system
│   │   │       ├── ProfileBuilder.tsx
│   │   │       ├── ProfileCard.tsx
│   │   │       ├── SniperFilterBuilder.tsx
│   │   │       ├── TradingTools.tsx
│   │   │       ├── UnifiedActionBuilder.tsx
│   │   │       ├── UnifiedConditionBuilder.tsx
│   │   │       └── UnifiedWalletManager.tsx
│   │   ├── Config.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── FloatingTradingCard.tsx
│   │   ├── Header.tsx
│   │   ├── Notifications.tsx
│   │   ├── PnlCard.tsx
│   │   ├── RPCEndpointManager.tsx
│   │   ├── ServerSelector.tsx
│   │   ├── Split.tsx
│   │   ├── Styles.tsx
│   │   ├── ToastContext.tsx
│   │   ├── Tooltip.tsx
│   │   └── TradingForm.tsx
│   ├── contexts/             # React contexts
│   │   ├── AppContext.tsx
│   │   ├── AppContextInstance.tsx
│   │   ├── IframeStateContext.tsx
│   │   └── useAppContext.ts
│   ├── pages/                # Page components
│   │   ├── AutomatePage.tsx  # Automation profiles
│   │   ├── DeployPage.tsx    # Token deployment
│   │   ├── HomePage.tsx      # Landing page
│   │   ├── SettingsPage.tsx  # App settings
│   │   └── WalletsPage.tsx   # Wallet management
│   ├── utils/                # Utility functions
│   │   ├── types/            # TypeScript type definitions
│   │   ├── brandConfig.ts    # Branding configuration
│   │   ├── buy.ts            # Buy transaction logic
│   │   ├── consolidate.ts    # Token consolidation
│   │   ├── create.ts         # Wallet creation
│   │   ├── distribute.ts     # SOL distribution
│   │   ├── formatting.ts     # Number/string formatting
│   │   ├── hdWallet.ts       # HD wallet derivation
│   │   ├── iframeManager.ts  # Iframe communication
│   │   ├── jitoService.ts    # Jito bundle service
│   │   ├── limitorders.ts    # Limit order logic
│   │   ├── mixer.ts          # Wallet mixer
│   │   ├── recentTokens.ts   # Recent token tracking
│   │   ├── rpcManager.ts     # RPC endpoint rotation
│   │   ├── sell.ts           # Sell transaction logic
│   │   ├── styleUtils.ts     # Style utilities
│   │   ├── trading.ts        # Trading utilities
│   │   ├── wallets.ts        # Wallet utilities
│   │   └── websocket.ts      # WebSocket handling
│   ├── Actions.tsx           # Trading actions component
│   ├── App.tsx               # Main application component
│   ├── Frame.tsx             # Chart/iframe component
│   ├── Mobile.tsx            # Mobile layout
│   ├── Utils.tsx             # Shared utilities
│   ├── Wallets.tsx           # Wallet list component
│   └── index.tsx             # Entry point
├── docs/                     # Documentation
│   ├── AUDIT.md              # Security audit
│   ├── CUSTOMIZATION.md      # Theme customization
│   ├── IFRAME.md             # Iframe integration
│   ├── SECURITY.md           # Security policy
│   └── WHITELABEL.md         # Whitelabel guide
├── scripts/
│   └── generate-html.js      # HTML template generator
├── brand.json                # Brand configuration
├── green.css                 # Default theme
├── index.html                # HTML template
├── index.template.html       # Template source
├── manifest.json             # Web app manifest
├── package.json              # Project dependencies
├── postcss.config.js         # PostCSS configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── vite.config.js            # Vite configuration
└── README.md                 # This file
```

---

## 🧪 Technologies Used

- [React 18](https://reactjs.org/) - UI library
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) - Solana blockchain interaction
- [Jupiter API](https://station.jup.ag/docs/apis/swap-api) - Token swaps
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [React Router](https://reactrouter.com/) - Client-side routing
- [Lucide React](https://lucide.dev/) - Icon library
- [Fury TypeScript SDK](https://github.com/furydotbot/typescript-sdk) - Backend integrations

---

## 🎨 Customization

### Theme Customization

Edit `green.css` or create your own theme file. See [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for all available CSS variables.

### Branding

Update `brand.json` to customize:
- Logo and app name
- Colors and theme
- Documentation URLs
- Social links

---

## 🤝 Contributing

Contributions are welcome!  
Fork the repo and open a pull request for new features, improvements, or bug fixes.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
