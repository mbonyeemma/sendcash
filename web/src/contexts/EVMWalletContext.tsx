import { createContext, useContext, ReactNode } from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useDisconnect,
  useActiveWallet,
  AutoConnect,
  useIsAutoConnecting,
} from "thirdweb/react";
import { thirdwebClient } from "@/lib/thirdweb";
import { evmConnectWallets } from "@/lib/walletConfig";
import { useAuth } from "@/contexts/AuthContext";

interface EVMWalletContextType {
  isConnected: boolean;
  /** True while thirdweb is reconnecting the last wallet after a page reload */
  isRestoring: boolean;
  address: string | null;
  chainId: number | null;
  isOnBase: boolean;
  disconnectWallet: () => void;
}

const EVMWalletContext = createContext<EVMWalletContextType | undefined>(undefined);

export const useEVMWallet = () => {
  const context = useContext(EVMWalletContext);
  if (!context) {
    throw new Error("useEVMWallet must be used within EVMWalletProvider");
  }
  return context;
};

const BASE_CHAIN_ID = 8453;

interface EVMWalletProviderProps {
  children: ReactNode;
}

export const EVMWalletProvider = ({ children }: EVMWalletProviderProps) => {
  const { isLoggedIn } = useAuth();
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const isRestoring = useIsAutoConnecting();

  const isConnected = !!account?.address;
  const address = account?.address ?? null;
  const chainId = chain?.id ?? null;
  const isOnBase = chainId === BASE_CHAIN_ID;

  const disconnectWallet = () => {
    if (activeWallet) {
      disconnect(activeWallet);
    }
  };

  return (
    <EVMWalletContext.Provider
      value={{
        isConnected,
        isRestoring,
        address,
        chainId,
        isOnBase,
        disconnectWallet,
      }}
    >
      {isLoggedIn && <AutoConnect client={thirdwebClient} wallets={evmConnectWallets} />}
      {children}
    </EVMWalletContext.Provider>
  );
};
