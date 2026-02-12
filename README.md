# SendiCash Web

This is the **frontend** of SendiCash — a live web application for fast, simple, and secure digital payments across East Africa. Send money, swap crypto, cash in/out with mobile money, and manage your finances — all in one place.

Built with **React**, **TypeScript**, and **Vite**, using **Tailwind CSS** and **shadcn/ui** for the UI.

## Live

The app is live and deployed in production.

## Features

- **RLUSD (Ripple USD)** — Full support for RLUSD, a stablecoin on the XRP Ledger. Hold, send, receive, and swap RLUSD.
- **XRP/RLUSD Swap** — Swap between XRP and RLUSD directly on the XRPL DEX with real-time quotes and configurable slippage.
- **Mobile Money Cash-In / Cash-Out** — Deposit and withdraw via MTN, Airtel, and other East African mobile networks.
- **Multi-Currency Support** — Manage XRP, RLUSD, USDC, USDT, UGX, KES, TZS, RWF, SSD, and more.
- **Send & Receive** — Send crypto or fiat to anyone instantly.
- **Transaction History** — Full statement and balance views.
- **KYC & Settings** — Identity verification and account management.
- **Notifications** — Real-time in-app notifications.

## GemWallet Requirement

SendiCash uses **GemWallet** as the primary XRPL wallet provider to sign transactions (swaps, sends, trustline setup, etc.).

To use wallet features you must:

1. Install the [GemWallet browser extension](https://gemwallet.app/).
2. Create or import an XRPL wallet inside GemWallet.
3. Make sure GemWallet is set to **Mainnet**.
4. Click **Connect Wallet** in the SendiCash dashboard to link your address.

> Xaman and OsmWallet are also supported as alternative wallet providers.

## How to Swap XRP ↔ RLUSD

1. Log in and connect your GemWallet.
2. Click the **Swap** button on the dashboard.
3. Choose the **From** asset (XRP or RLUSD) and the **To** asset.
4. Enter the amount — a live quote from the XRPL DEX order book will appear.
5. Adjust slippage tolerance if needed (0.5%, 1%, or 2%).
6. Click **Swap** and approve the transaction in your GemWallet popup.
7. If swapping XRP → RLUSD for the first time, a trustline will be set up automatically before the swap.

## How to Run the Project

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) and npm
- [GemWallet extension](https://gemwallet.app/) installed in your browser

### Setup

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the web directory
cd sendcash/web

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Other Commands

```sh
# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Lint
npm run lint
```

## Tech Stack

- **React** + **TypeScript**
- **Vite** — Build tool
- **Tailwind CSS** + **shadcn/ui** — Styling and components
- **xrpl.js** — XRPL interaction
- **@gemwallet/api** — Wallet signing
- **React Query** — Server state management
- **Framer Motion** — Animations
- **React Router** — Client-side routing
