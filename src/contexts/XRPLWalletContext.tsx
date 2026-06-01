import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { isInstalled, getAddress, getNetwork } from "@gemwallet/api";

export type XRPLWalletProviderType = "gemwallet" | "xaman" | "osmwallet";

const XRPL_ADDRESS_KEY = "xrpl_wallet_address";
const XRPL_NETWORK_KEY = "xrpl_wallet_network";
const XRPL_PROVIDER_KEY = "xrpl_wallet_provider";

interface XRPLWalletContextType {
  isConnected: boolean;
  /** True while restoring a saved XRPL session after page reload */
  isRestoring: boolean;
  address: string | null;
  network: string | null;
  isGemWalletInstalled: boolean;
  /** Connect with the chosen provider. Call with 'gemwallet' or 'xaman' (e.g. from Connect modal). */
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
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  // Frontend is Mainnet-only
  const [network, setNetwork] = useState<string | null>("Mainnet");
  const [isGemWalletInstalled, setIsGemWalletInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const persistSession = (
    walletAddress: string,
    walletNetwork: string,
    provider: XRPLWalletProviderType
  ) => {
    setAddress(walletAddress);
    setNetwork(walletNetwork);
    setIsConnected(true);
    localStorage.setItem(XRPL_ADDRESS_KEY, walletAddress);
    localStorage.setItem(XRPL_NETWORK_KEY, walletNetwork);
    localStorage.setItem(XRPL_PROVIDER_KEY, provider);
  };

  const clearSession = () => {
    setAddress(null);
    setNetwork("Mainnet");
    setIsConnected(false);
    localStorage.removeItem(XRPL_ADDRESS_KEY);
    localStorage.removeItem(XRPL_NETWORK_KEY);
    localStorage.removeItem(XRPL_PROVIDER_KEY);
  };

  // Check if GemWallet is installed
  useEffect(() => {
    const checkGemWallet = async () => {
      try {
        console.log("Checking for GemWallet...");
        console.log("Window object keys:", Object.keys(window));
        
        // Try calling isInstalled directly - this should work if extension is loaded
        const result = await isInstalled();
        console.log("isInstalled response:", result);
        
        if (result?.result?.isInstalled) {
          setIsGemWalletInstalled(true);
          console.log("✅ GemWallet detected via API");
        } else {
          setIsGemWalletInstalled(false);
          console.log("❌ GemWallet not detected via API");
        }
      } catch (error) {
        console.log("⚠️ GemWallet detection error:", error);
        // Extension might still work even if detection fails
        setIsGemWalletInstalled(false);
      }
    };

    // Wait for page to fully load
    if (document.readyState === 'complete') {
      checkGemWallet();
    } else {
      window.addEventListener('load', checkGemWallet);
    }

    // Also recheck after delays (extension might load late)
    const timeout1 = setTimeout(checkGemWallet, 500);
    const timeout2 = setTimeout(checkGemWallet, 1500);
    const timeout3 = setTimeout(checkGemWallet, 3000);
    
    return () => {
      window.removeEventListener('load', checkGemWallet);
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, []);

  // Restore saved XRPL session on reload; re-verify with the wallet extension when possible
  useEffect(() => {
    const savedAddress = localStorage.getItem(XRPL_ADDRESS_KEY);
    const savedProvider = localStorage.getItem(XRPL_PROVIDER_KEY) as XRPLWalletProviderType | null;
    if (!savedAddress) return;

    setAddress(savedAddress);
    setNetwork("Mainnet");
    setIsConnected(true);

    if (savedProvider !== "gemwallet") return;

    let cancelled = false;
    setIsRestoring(true);

    (async () => {
      try {
        const addressResponse = await getAddress();
        if (cancelled) return;

        const liveAddress = addressResponse?.result?.address;
        if (addressResponse?.type !== "reject" && liveAddress) {
          setAddress(liveAddress);
          setIsConnected(true);
          setIsGemWalletInstalled(true);
          localStorage.setItem(XRPL_ADDRESS_KEY, liveAddress);
        }
      } catch {
        // Keep the saved session — user may reconnect manually if signing fails
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const CONNECT_TIMEOUT_MS = 45000; // 45s – user may need time to approve in extension popup

  const connectWallet = async (provider: XRPLWalletProviderType = "gemwallet") => {
    const w = typeof window !== "undefined" ? (window as any) : undefined;

    if (provider === "xaman") {
      try {
        setIsConnecting(true);
        if (w?.xumm?.getAddress) {
          const addr = await Promise.race([
            Promise.resolve(w.xumm.getAddress()),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Connection timed out.")), CONNECT_TIMEOUT_MS)),
          ]);
          if (addr) {
            persistSession(addr, "Mainnet", "xaman");
            return;
          }
        }
        window.open("https://xaman.app/", "_blank");
        throw new Error("Xaman wallet not detected. Install the Xaman app or extension and try again.");
      } catch (err: any) {
        if (err?.message?.includes("not detected") || err?.message?.includes("timed out")) throw err;
        throw new Error(err?.message || "Failed to connect Xaman.");
      } finally {
        setIsConnecting(false);
      }
    }

    if (provider === "osmwallet") {
      try {
        setIsConnecting(true);
        // OsmWallet Chrome extension may inject window.xrpl or window.osmWallet
        const osm = w?.osmWallet ?? w?.xrpl;
        const getAddr = osm?.getAddress ?? osm?.getWalletAddress;
        if (typeof getAddr === "function") {
          const addr = await Promise.race([
            Promise.resolve(getAddr()),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Connection timed out.")), CONNECT_TIMEOUT_MS)),
          ]);
          const resolvedAddr = typeof addr === "string" ? addr : (addr as any)?.address ?? (addr as any)?.result?.address;
          if (resolvedAddr) {
            persistSession(resolvedAddr, "Mainnet", "osmwallet");
            return;
          }
        }
        window.open("https://osmwallet.io/", "_blank");
        throw new Error("OsmWallet not detected. Install the Chrome extension and try again.");
      } catch (err: any) {
        if (err?.message?.includes("not detected") || err?.message?.includes("timed out")) throw err;
        throw new Error(err?.message || "Failed to connect OsmWallet.");
      } finally {
        setIsConnecting(false);
      }
    }

    // GemWallet
    try {
      setIsConnecting(true);
      console.log("Attempting to connect to GemWallet...");

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Connection timed out. Check for a GemWallet popup and approve it, then try again.")), CONNECT_TIMEOUT_MS);
      });

      const addressResponse = await Promise.race([getAddress(), timeoutPromise]) as Awaited<ReturnType<typeof getAddress>>;
      console.log("Address response:", addressResponse);

      if (addressResponse?.type === "reject" || !addressResponse?.result?.address) {
        throw new Error("Connection rejected or no address returned. Please approve the request in the GemWallet popup.");
      }

      const walletAddress = addressResponse.result.address;

      const networkResponse = await getNetwork();
      // Ignore extension network; app is Mainnet-only
      const walletNetwork = "Mainnet";

      console.log("✅ Successfully connected to GemWallet");
      persistSession(walletAddress, walletNetwork, "gemwallet");
      setIsGemWalletInstalled(true);
    } catch (error: any) {
      console.error("❌ Failed to connect wallet:", error);

      if (error.message?.includes("not found") || error.message?.includes("undefined")) {
        window.open("https://gemwallet.app/", "_blank");
        throw new Error("GemWallet extension not found. Please install it and refresh the page.");
      }
      if (error.message?.includes("timed out")) {
        throw new Error("Connection timed out. Look for a GemWallet popup (it may be behind this window) and approve it, then click Connect again.");
      }
      if (error.message?.includes("rejected") || error.message?.includes("reject")) {
        throw new Error("Connection rejected. Please approve the request in the GemWallet popup.");
      }

      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    clearSession();
  };

  return (
    <XRPLWalletContext.Provider
      value={{
        isConnected,
        isRestoring,
        address,
        network,
        isGemWalletInstalled,
        connectWallet,
        disconnectWallet,
        isConnecting,
      }}
    >
      {children}
    </XRPLWalletContext.Provider>
  );
};
