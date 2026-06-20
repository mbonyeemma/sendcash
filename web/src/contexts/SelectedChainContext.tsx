import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  type AssetChain,
  getDefaultCashAssetForNetwork,
  getCashAssetsForNetwork,
  getSupportedAssetById,
} from "@/data/supportedAssets";
import { useEVMWallet } from "@/contexts/EVMWalletContext";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";

const STORAGE_KEY = "sendicash_selected_chain";

interface SelectedChainContextType {
  selectedChain: AssetChain;
  setSelectedChain: (chain: AssetChain) => void;
  /** Asset id for cash-in / cash-out (usdc-base, usdt-base, rlusd-xrpl) */
  selectedAssetId: string;
  setSelectedAssetId: (id: string) => void;
  cashAssets: ReturnType<typeof getCashAssetsForNetwork>;
  selectedAsset: ReturnType<typeof getSupportedAssetById>;
  walletConnected: boolean;
  walletAddress: string | null;
}

const SelectedChainContext = createContext<SelectedChainContextType | undefined>(
  undefined
);

function loadChain(): AssetChain {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "base" || v === "xrpl") return v;
  } catch {
    /* ignore */
  }
  return "base";
}

export const SelectedChainProvider = ({ children }: { children: ReactNode }) => {
  const { isConnected: evmConnected, address: evmAddress } = useEVMWallet();
  const { isConnected: xrplConnected, address: xrplAddress } = useXRPLWallet();

  const [selectedChain, setSelectedChainState] = useState<AssetChain>(loadChain);
  const [selectedAssetId, setSelectedAssetId] = useState(() =>
    getDefaultCashAssetForNetwork(loadChain()).id
  );

  const setSelectedChain = useCallback((chain: AssetChain) => {
    setSelectedChainState(chain);
    try {
      localStorage.setItem(STORAGE_KEY, chain);
    } catch {
      /* ignore */
    }
    const assets = getCashAssetsForNetwork(chain);
    setSelectedAssetId((prev) => {
      if (assets.some((a) => a.id === prev)) return prev;
      return assets[0]?.id ?? prev;
    });
  }, []);

  useEffect(() => {
    const asset = getSupportedAssetById(selectedAssetId);
    if (!asset || asset.chain !== selectedChain) {
      setSelectedAssetId(getDefaultCashAssetForNetwork(selectedChain).id);
    }
  }, [selectedChain, selectedAssetId]);

  // Auto-switch to whichever chain has a connected wallet (when exactly one is connected)
  useEffect(() => {
    if (evmConnected && !xrplConnected) {
      setSelectedChain("base");
    } else if (xrplConnected && !evmConnected) {
      setSelectedChain("xrpl");
    }
  }, [evmConnected, xrplConnected, setSelectedChain]);

  const cashAssets = getCashAssetsForNetwork(selectedChain);
  const selectedAsset =
    getSupportedAssetById(selectedAssetId) ??
    getDefaultCashAssetForNetwork(selectedChain);
  const walletConnected =
    selectedChain === "base" ? evmConnected : xrplConnected;
  const walletAddress =
    selectedChain === "base" ? evmAddress : xrplAddress;

  return (
    <SelectedChainContext.Provider
      value={{
        selectedChain,
        setSelectedChain,
        selectedAssetId,
        setSelectedAssetId,
        cashAssets,
        selectedAsset,
        walletConnected,
        walletAddress,
      }}
    >
      {children}
    </SelectedChainContext.Provider>
  );
};

export const useSelectedChain = () => {
  const ctx = useContext(SelectedChainContext);
  if (!ctx) {
    throw new Error("useSelectedChain must be used within SelectedChainProvider");
  }
  return ctx;
};
