import { createContext, useContext, ReactNode } from "react";
import { useActiveAccount, useActiveWalletChain, useDisconnect, useActiveWallet } from "thirdweb/react";

interface EVMWalletContextType {
  isConnected: boolean;
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
  const account = useActiveAccount();
  const chain = useActiveWalletChain();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();

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
        address,
        chainId,
        isOnBase,
        disconnectWallet,
      }}
    >
      {children}
    </EVMWalletContext.Provider>
  );
};
