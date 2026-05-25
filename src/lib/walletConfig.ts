import { createWallet } from "thirdweb/wallets";
import type { XRPLWalletProviderType } from "@/contexts/XRPLWalletContext";

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

export interface XrplConnectWalletOption {
  id: XRPLWalletProviderType;
  label: string;
  description: string;
}

/**
 * XRPL wallet providers — used with `connectWallet(id)` from XRPLWalletContext (not thirdweb).
 */
export const xrplConnectWallets: XrplConnectWalletOption[] = [
  { id: "gemwallet", label: "GemWallet", description: "Browser extension" },
  { id: "xaman", label: "Xaman", description: "App or browser extension" },
  { id: "osmwallet", label: "OsmWallet", description: "Chrome extension" },
];
