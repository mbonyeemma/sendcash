import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, ExternalLink, Loader2, CheckCircle2, AlertCircle, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useXRPLWallet, type XRPLWalletProviderType } from "@/contexts/XRPLWalletContext";
import { toast } from "sonner";

interface ConnectXRPLWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectXRPLWalletModal = ({ isOpen, onClose }: ConnectXRPLWalletModalProps) => {
  const { 
    isConnected, 
    address, 
    network, 
    isGemWalletInstalled, 
    connectWallet, 
    disconnectWallet,
    isConnecting 
  } = useXRPLWallet();

  const [connectingProvider, setConnectingProvider] = useState<XRPLWalletProviderType | null>(null);

  const handleConnect = async (provider: XRPLWalletProviderType) => {
    try {
      setConnectingProvider(provider);
      await connectWallet(provider);
      toast.success("Wallet connected successfully!");
      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      console.error("Connection error:", error);
      const errorMessage = error.message || "Failed to connect wallet";
      if (errorMessage.includes("rejected") || errorMessage.includes("denied")) {
        const rejectMsg = provider === "gemwallet" ? "GemWallet" : provider === "xaman" ? "Xaman" : "OsmWallet";
        toast.error(`Connection rejected. Please accept the connection in ${rejectMsg}.`);
      } else if (errorMessage.includes("timed out")) {
        toast.error("Connection timed out. Look for the wallet popup (it may be behind this window) and approve it.");
      } else if (errorMessage.includes("not found") || errorMessage.includes("not detected") || errorMessage.includes("install")) {
        const installMsg = provider === "gemwallet" ? "GemWallet not detected. Please install the extension and refresh." : provider === "osmwallet" ? "OsmWallet not detected. Please install the Chrome extension and refresh." : errorMessage;
        toast.error(installMsg);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    toast.success("Wallet disconnected");
    onClose();
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-semibold">Connect XRPL Wallet</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {!isConnected ? (
                  <>
                    {/* Info Banner */}
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Connect Your XRPL Wallet</p>
                          <p className="text-xs text-muted-foreground">
                            Choose a wallet to connect. Your keys stay in your wallet; we never see them.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Which wallet to connect */}
                    <p className="text-sm font-medium text-foreground">Which wallet do you want to connect?</p>
                    <div className="grid grid-cols-1 gap-3">
                      {/* GemWallet */}
                      <button
                        type="button"
                        onClick={() => handleConnect("gemwallet")}
                        disabled={isConnecting && connectingProvider !== "gemwallet"}
                        className="w-full rounded-xl border border-border hover:border-primary hover:bg-primary/5 p-4 flex items-center justify-between transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Wallet className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">GemWallet</p>
                            <p className="text-xs text-muted-foreground">
                              {isGemWalletInstalled ? "Browser extension" : "Install extension"}
                            </p>
                          </div>
                        </div>
                        {connectingProvider === "gemwallet" ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                        ) : (
                          <ExternalLink className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {/* Xaman */}
                      <button
                        type="button"
                        onClick={() => handleConnect("xaman")}
                        disabled={isConnecting && connectingProvider !== "xaman"}
                        className="w-full rounded-xl border border-border hover:border-primary hover:bg-primary/5 p-4 flex items-center justify-between transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Smartphone className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">Xaman</p>
                            <p className="text-xs text-muted-foreground">App &amp; browser</p>
                          </div>
                        </div>
                        {connectingProvider === "xaman" ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                        ) : (
                          <ExternalLink className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {/* OsmWallet */}
                      <button
                        type="button"
                        onClick={() => handleConnect("osmwallet")}
                        disabled={isConnecting && connectingProvider !== "osmwallet"}
                        className="w-full rounded-xl border border-border hover:border-primary hover:bg-primary/5 p-4 flex items-center justify-between transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Monitor className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">OsmWallet</p>
                            <p className="text-xs text-muted-foreground">Chrome extension</p>
                          </div>
                        </div>
                        {connectingProvider === "osmwallet" ? (
                          <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                        ) : (
                          <ExternalLink className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    </div>

                    {(connectingProvider === "gemwallet" || connectingProvider === "xaman" || connectingProvider === "osmwallet") && (
                      <p className="text-xs text-muted-foreground text-center">
                        Check for a popup from your wallet (it may be behind this window) and approve the connection.
                      </p>
                    )}

                    <div className="text-center space-y-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Don&apos;t have a wallet?{" "}
                        <a href="https://gemwallet.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GemWallet</a>
                        {" · "}
                        <a href="https://xaman.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Xaman</a>
                        {" · "}
                        <a href="https://osmwallet.io/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OsmWallet</a>
                      </p>
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">Troubleshooting</summary>
                        <div className="mt-2 p-2 bg-muted rounded text-left space-y-1">
                          <p>GemWallet: {isGemWalletInstalled ? "✓ Detected" : "✗ Not detected"}. Try connecting anyway if you have the extension.</p>
                          <p className="pt-2">OsmWallet: Chrome extension — install from osmwallet.io if not detected.</p>
                          <p className="pt-2">If connection fails: enable the extension, refresh the page, or try another wallet.</p>
                        </div>
                      </details>
                    </div>

                  
                  </>
                ) : (
                  <>
                    {/* Connected State */}
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-2">Wallet Connected</p>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Address:</span>
                              <code className="text-xs bg-background px-2 py-1 rounded">
                                {formatAddress(address!)}
                              </code>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Network:</span>
                              <span className="text-xs font-medium">{network}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={handleDisconnect}
                        className="w-full"
                      >
                        Disconnect Wallet
                      </Button>
                      <Button
                        onClick={onClose}
                        className="w-full"
                      >
                        Done
                      </Button>
                    </div>
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
