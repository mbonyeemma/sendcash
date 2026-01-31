import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { isInstalled, getAddress, getNetwork } from "@gemwallet/api";

interface XRPLWalletContextType {
  isConnected: boolean;
  address: string | null;
  network: string | null;
  isGemWalletInstalled: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnecting: boolean;
  setNetwork: (network: string) => void;
  switchToTestnet: () => void;
  switchToMainnet: () => void;
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
  const [network, setNetwork] = useState<string | null>(null);
  const [isGemWalletInstalled, setIsGemWalletInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

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

  // Check if wallet was previously connected (from localStorage)
  useEffect(() => {
    const savedAddress = localStorage.getItem("xrpl_wallet_address");
    const savedNetwork = localStorage.getItem("xrpl_wallet_network");
    
    if (savedAddress && savedNetwork) {
      setAddress(savedAddress);
      setNetwork(savedNetwork);
      setIsConnected(true);
    }
  }, []);

  const CONNECT_TIMEOUT_MS = 45000; // 45s – user may need time to approve in extension popup

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      console.log("Attempting to connect to GemWallet...");

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Connection timed out. Check for a GemWallet popup and approve it, then try again.")), CONNECT_TIMEOUT_MS);
      });

      // Race getAddress against timeout so we don't hang forever
      const addressResponse = await Promise.race([getAddress(), timeoutPromise]) as Awaited<ReturnType<typeof getAddress>>;
      console.log("Address response:", addressResponse);

      if (addressResponse?.type === "reject" || !addressResponse?.result?.address) {
        throw new Error("Connection rejected or no address returned. Please approve the request in the GemWallet popup.");
      }

      const walletAddress = addressResponse.result.address;

      // Get network
      const networkResponse = await getNetwork();
      const walletNetwork = networkResponse?.result?.network || "Mainnet";

      console.log("✅ Successfully connected to GemWallet");
      console.log("Address:", walletAddress);
      console.log("Network:", walletNetwork);

      setAddress(walletAddress);
      setNetwork(walletNetwork);
      setIsConnected(true);
      setIsGemWalletInstalled(true);

      localStorage.setItem("xrpl_wallet_address", walletAddress);
      localStorage.setItem("xrpl_wallet_network", walletNetwork);
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
    setAddress(null);
    setNetwork(null);
    setIsConnected(false);
    localStorage.removeItem("xrpl_wallet_address");
    localStorage.removeItem("xrpl_wallet_network");
  };

  const setNetworkManual = (newNetwork: string) => {
    setNetwork(newNetwork);
    localStorage.setItem("xrpl_wallet_network", newNetwork);
  };

  const switchToTestnet = () => {
    setNetworkManual("Testnet");
  };

  const switchToMainnet = () => {
    setNetworkManual("Mainnet");
  };

  return (
    <XRPLWalletContext.Provider
      value={{
        isConnected,
        address,
        network,
        isGemWalletInstalled,
        connectWallet,
        disconnectWallet,
        isConnecting,
        setNetwork: setNetworkManual,
        switchToTestnet,
        switchToMainnet,
      }}
    >
      {children}
    </XRPLWalletContext.Provider>
  );
};
