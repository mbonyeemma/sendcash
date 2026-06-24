/**
 * Single shared xrpl-connect WalletManager for the whole app.
 *
 * Importing this module also registers the `<xrpl-wallet-connector>` custom
 * element (side effect of importing `xrpl-connect`). Construct the manager
 * once here so every consumer (XRPLWalletContext, xrplService signing) shares
 * the same connection + session state.
 *
 * The app is Mainnet-only. Xaman (incl. mobile-browser deep-link) and
 * WalletConnect need credentials; GemWallet/Crossmark are extension-only and
 * need none. Missing credentials simply disable that adapter at connect time.
 */
import {
  WalletManager,
  XamanAdapter,
  CrossmarkAdapter,
  GemWalletAdapter,
  WalletConnectAdapter,
} from "xrpl-connect";

const XAMAN_API_KEY = import.meta.env.VITE_XAMAN_API_KEY as string | undefined;
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

const adapters = [
  new XamanAdapter(XAMAN_API_KEY ? { apiKey: XAMAN_API_KEY } : undefined),
  new GemWalletAdapter(),
  new CrossmarkAdapter(),
  new WalletConnectAdapter({
    ...(WALLETCONNECT_PROJECT_ID ? { projectId: WALLETCONNECT_PROJECT_ID } : {}),
    themeMode: "light",
  }),
];

export const walletManager = new WalletManager({
  adapters,
  network: "mainnet",
  // Restore the previous session on load and emit `connect` before any user
  // interaction — XRPLWalletContext registers its listeners synchronously so
  // it does not miss that initial event.
  autoConnect: true,
});

/** Frontend is Mainnet-only; the rest of the app expects this label. */
export const XRPL_NETWORK_LABEL = "Mainnet";
