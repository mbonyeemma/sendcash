import { createWallet } from "thirdweb/wallets";

/**
 * Browser / extension wallets for Base (EVM) via thirdweb ConnectEmbed — no in-app wallet.
 */
export const evmConnectWallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
  createWallet("com.okex.wallet"),
  createWallet("app.phantom"),
];

// XRPL wallet selection (Xaman, GemWallet, Crossmark, WalletConnect) is handled
// by the bundled `<xrpl-wallet-connector>` web component — see XRPLWalletContext.
