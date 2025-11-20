<p align="center">

  <img src="https://img.shields.io/badge/Built%20on-Solana-3a0ca3?style=for-the-badge&logo=solana" alt="Built on Solana" />
  <img src="https://img.shields.io/badge/Open%20Source-Yes-00b386?style=for-the-badge&logo=github" alt="Open Source" />
</p>

## 🚀 One-Click Deployment

You can deploy **Raze.bot** instantly using either **Vercel** or **Netlify** with the buttons below:

<div align="center">

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/furydotbot/raze.bot)
[![Deploy with Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/furydotbot/raze.bot)

</div>

![Raze.bot image](https://i.imgur.com/lpC1qju.png)

**Solana UI** is a multi-wallet trading platform designed for the Solana blockchain.  
It provides users with a seamless interface to connect various Solana wallets and execute trades efficiently.

> 🛠️ This project was developed by the team at [**Raze.bot**](https://raze.bot) using the open-source [**Fury SDKs**](https://github.com/furydotbot) to power its backend integrations and blockchain interactions.

---

## 📚 Documentation

Find the full documentation here:  
👉 [https://docs.raze.bot/how-to-use](https://docs.raze.bot/how-to-use)

---

## ✨ Features

- 🔑 **Multi-Wallet Support** – Connect and manage multiple Solana wallets effortlessly.
- 📈 **Trading Interface** – Intuitive UI for executing trades on the Solana network.
- 📱 **Responsive Design** – Optimized for both desktop and mobile devices.
- ⚡ **Fast Performance** – Built with modern web technologies for a smooth user experience.

---

## 🚀 Demo

Try the live version here:  
👉 [https://sol.app.raze.bot/](https://sol.raze.bot)

---

## 🧰 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

```bash
git clone https://github.com/furydotbot/solana-ui.git
cd solana-ui
npm install
npm run dev
```

Visit: `http://localhost:5173`

---

## 🗂 Project Structure

```
raze.bot/
├── src/                # Source code
│   ├── modals/         # Modal components
│   │   ├── BurnModal.tsx
│   │   ├── CalculatePNLModal.tsx
│   │   ├── CleanerModal.tsx
│   │   ├── ConsolidateModal.tsx
│   │   ├── CustomBuyModal.tsx
│   │   ├── DeployBonkModal.tsx
│   │   ├── DeployBoopModal.tsx
│   │   ├── DeployCookModal.tsx
│   │   ├── DeployModal.tsx
│   │   ├── DeployMoonModal.tsx
│   │   ├── DeployPumpModal.tsx
│   │   ├── DepositModal.tsx
│   │   ├── DistributeModal.tsx
│   │   ├── IntroModal.tsx
│   │   ├── MixerModal.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── TransferModal.tsx
│   │   └── WalletsModal.tsx
│   ├── styles/         # CSS and styling
│   │   ├── Styles.tsx
│   │   ├── betterskill.css
│   │   ├── raze.css
│   │   ├── yellow.css
│   │   └── globals.css
│   ├── utils/          # Utility functions
│   │   ├── bonkcreate.ts
│   │   ├── boopcreate.ts
│   │   ├── buy.ts
│   │   ├── cleaner.ts
│   │   ├── consolidate.ts
│   │   ├── cookcreate.ts
│   │   ├── distribute.ts
│   │   ├── jitoService.ts
│   │   ├── limitorders.ts
│   │   ├── mixer.ts
│   │   ├── mooncreate.ts
│   │   ├── pumpcreate.ts
│   │   ├── sell.ts
│   │   ├── trading.ts
│   │   └── wallets.ts
│   ├── types/          # TypeScript type definitions
│   ├── Actions.tsx     # Action components
│   ├── App.tsx         # Main application component
│   ├── Chart.tsx       # Chart component
│   ├── Config.tsx      # Configuration component
│   ├── FloatingTradingCard.tsx
│   ├── Manager.tsx     # Manager component
│   ├── Menu.tsx        # Menu component
│   ├── Mobile.tsx      # Mobile-specific components
│   ├── Notifications.tsx
│   ├── OperationsWallets.tsx
│   ├── PnlCard.tsx     # P&L card component
│   ├── ServerConfig.tsx
│   ├── StepVisualizations.tsx
│   ├── TradingForm.tsx # Trading form component
│   ├── Utils.tsx       # Utility functions
│   ├── Wallets.tsx     # Wallet management
│   └── index.tsx       # Entry point
├── index.html          # HTML template
├── manifest.json       # Web app manifest
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
├── vite.config.js      # Vite configuration
├── package.json        # Project metadata and scripts
├── AUDIT.md           # Security audit documentation
├── SECURITY.md        # Security guidelines
├── README-IFRAME-INTEGRATION.md
└── README.md          # Project documentation
```

---

## 🧪 Technologies Used

- [React](https://reactjs.org/)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Fury TypeScript SDK](https://github.com/furydotbot/typescript-sdk)

---

## 🤝 Contributing

Contributions are welcome!  
Fork the repo and open a pull request for new features, improvements, or bug fixes.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
