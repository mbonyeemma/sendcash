import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import type { WalletConnectorElement } from "xrpl-connect";
import { walletManager, XRPL_NETWORK_LABEL } from "@/lib/xrplConnect";
import { XRPL_CONNECTOR_LIGHT_THEME } from "@/lib/xrplConnectorTheme";
import { useAuth } from "@/contexts/AuthContext";

/**
 * XRPL wallet provider ids supported by xrpl-connect. Kept as a type so the
 * connect modal / wallet config can reference them, but the bundled
 * `<xrpl-wallet-connector>` UI drives the actual wallet selection.
 */
export type XRPLWalletProviderType = "xaman" | "gemwallet" | "crossmark" | "walletconnect";

interface XRPLWalletContextType {
  isConnected: boolean;
  /** True while restoring a saved XRPL session after page reload (autoConnect). */
  isRestoring: boolean;
  address: string | null;
  network: string | null;
  /** Open the wallet-connector modal so the user can pick an XRPL wallet. */
  connectWallet: (provider?: XRPLWalletProviderType) => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
}

const XRPLWalletContext = createContext<XRPLWalletContextType | undefined>(undefined);

export const useXRPLWallet = () => {
  const context = useContext(XRPLWalletContext);
  if (!context) {
    throw new Error("useXRPLWallet must be used within XRPLWalletProvider");
  }
  return context;
};

interface XRPLWalletProviderProps {
  children: ReactNode;
}

export const XRPLWalletProvider = ({ children }: XRPLWalletProviderProps) => {
  const { isLoggedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  // Frontend is Mainnet-only.
  const [network] = useState<string | null>(XRPL_NETWORK_LABEL);
  const [isConnecting, setIsConnecting] = useState(false);
  // autoConnect may emit `connect` before first paint; assume restoring until
  // the manager settles so the UI can show a brief "restoring" state.
  const [isRestoring, setIsRestoring] = useState(true);

  const connectorRef = useRef<WalletConnectorElement | null>(null);

  // Register manager listeners synchronously on mount so the autoConnect
  // `connect` event (fired during WalletManager construction / load) is caught.
  useEffect(() => {
    const handleConnect = (account: { address: string }) => {
      setAddress(account?.address ?? null);
      setIsConnected(!!account?.address);
      setIsConnecting(false);
      setIsRestoring(false);
    };
    const handleConnecting = () => setIsConnecting(true);
    const handleDisconnect = () => {
      setAddress(null);
      setIsConnected(false);
      setIsConnecting(false);
      setIsRestoring(false);
    };
    const handleError = () => {
      setIsConnecting(false);
      setIsRestoring(false);
    };

    walletManager.on("connect", handleConnect);
    walletManager.on("connecting", handleConnecting);
    walletManager.on("disconnect", handleDisconnect);
    walletManager.on("error", handleError);

    // Adopt any session already restored by the time we mounted.
    const existing = walletManager.account;
    if (existing?.address) {
      setAddress(existing.address);
      setIsConnected(true);
    }
    // Stop showing "restoring" shortly after mount if nothing connected.
    const settle = setTimeout(() => setIsRestoring(false), 1500);

    return () => {
      walletManager.off("connect", handleConnect as never);
      walletManager.off("connecting", handleConnecting as never);
      walletManager.off("disconnect", handleDisconnect as never);
      walletManager.off("error", handleError as never);
      clearTimeout(settle);
    };
  }, []);

  // Wire the manager into the bundled connector UI once it mounts (after login).
  useEffect(() => {
    if (!isLoggedIn) return;
    connectorRef.current?.setWalletManager(walletManager);
  }, [isLoggedIn]);

  const connectWallet = async (_provider?: XRPLWalletProviderType) => {
    // The web component renders wallet selection + QR (desktop) / deep-link
    // (mobile browser). Connection state arrives via the manager's events.
    connectorRef.current?.open();
  };

  const disconnectWallet = () => {
    void walletManager.disconnect();
  };

  return (
    <XRPLWalletContext.Provider
      value={{
        isConnected,
        isRestoring,
        address,
        network,
        connectWallet,
        disconnectWallet,
        isConnecting,
      }}
    >
      {children}
      {isLoggedIn && (
        <xrpl-wallet-connector
          ref={connectorRef}
          primary-wallet="xaman"
          style={XRPL_CONNECTOR_LIGHT_THEME}
        />
      )}
    </XRPLWalletContext.Provider>
  );
};
