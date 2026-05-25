import { useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEVMWallet } from "@/contexts/EVMWalletContext";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import { ConnectEmbed } from "thirdweb/react";
import { base } from "thirdweb/chains";
import { thirdwebClient } from "@/lib/thirdweb";
import { evmConnectWallets, xrplConnectWallets } from "@/lib/walletConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Match `html.dark` (Tailwind) so thirdweb text isn't light-on-light — ConnectEmbed defaults to dark theme. */
function subscribeHtmlClass(cb: () => void) {
  const el = document.documentElement;
  const mo = new MutationObserver(cb);
  mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

function getIsDarkModeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function useAppDarkMode() {
  return useSyncExternalStore(subscribeHtmlClass, getIsDarkModeSnapshot, () => false);
}

interface ConnectXRPLWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ChainTab = "evm" | "xrp";

/**
 * Connect wallet modal: Base (EVM) via thirdweb, or XRPL via GemWallet / Xaman / OsmWallet.
 */
export const ConnectXRPLWalletModal = ({ isOpen, onClose }: ConnectXRPLWalletModalProps) => {
  const [tab, setTab] = useState<ChainTab>("evm");
  const isDark = useAppDarkMode();
  const {
    isConnected: evmConnected,
    address: evmAddress,
    isOnBase,
    disconnectWallet: disconnectEvmWallet,
  } = useEVMWallet();

  const {
    isConnected: xrplConnected,
    address: xrplAddress,
    connectWallet: connectXrplWallet,
    disconnectWallet: disconnectXrplWallet,
    isConnecting: xrplConnecting,
  } = useXRPLWallet();

  const handleEvmDisconnect = () => {
    disconnectEvmWallet();
    toast.success("Wallet disconnected");
  };

  const handleXrplDisconnect = () => {
    disconnectXrplWallet();
    toast.success("XRPL wallet disconnected");
  };

  const handleXrplConnect = async (id: (typeof xrplConnectWallets)[number]["id"]) => {
    try {
      await connectXrplWallet(id);
      toast.success("Wallet connected");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not connect";
      toast.error(msg);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
                <h2 className="text-xl font-semibold">Connect Wallet</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex rounded-lg border border-border p-1 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setTab("evm")}
                    className={cn(
                      "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                      tab === "evm" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Base (EVM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("xrp")}
                    className={cn(
                      "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                      tab === "xrp" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    XRPL
                  </button>
                </div>

                {tab === "evm" && (
                  <>
                    {!evmConnected ? (
                      <ConnectEmbed
                        client={thirdwebClient}
                        chain={base}
                        wallets={evmConnectWallets}
                        modalSize="compact"
                        theme={isDark ? "dark" : "light"}
                        className="!w-full !max-w-none rounded-xl border-0 shadow-none"
                      />
                    ) : (
                      <>
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium mb-2">Wallet connected</p>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Address</span>
                                  <code className="text-xs bg-background px-2 py-1 rounded truncate max-w-[200px]">
                                    {formatAddress(evmAddress!)}
                                  </code>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-muted-foreground">Network</span>
                                  <span className="text-xs font-medium">
                                    {isOnBase ? "Base" : "Switch to Base in your wallet"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="outline" onClick={handleEvmDisconnect} className="w-full">
                            Disconnect
                          </Button>
                          <Button onClick={onClose} className="w-full">
                            Done
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}

                {tab === "xrp" && (
                  <>
                    {!xrplConnected ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground mb-3">
                          Choose an XRPL wallet. These connect separately from Base.
                        </p>
                        {xrplConnectWallets.map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            disabled={xrplConnecting}
                            onClick={() => handleXrplConnect(w.id)}
                            className="w-full flex items-center justify-between rounded-xl border border-border bg-background hover:bg-muted/60 px-4 py-3 text-left transition-colors disabled:opacity-60"
                          >
                            <div>
                              <p className="text-sm font-medium">{w.label}</p>
                              <p className="text-xs text-muted-foreground">{w.description}</p>
                            </div>
                            {xrplConnecting ? (
                              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium mb-2">XRPL wallet connected</p>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Address</span>
                                  <code className="text-xs bg-background px-2 py-1 rounded truncate max-w-[200px]">
                                    {formatAddress(xrplAddress!)}
                                  </code>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button variant="outline" onClick={handleXrplDisconnect} className="w-full">
                            Disconnect
                          </Button>
                          <Button onClick={onClose} className="w-full">
                            Done
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
