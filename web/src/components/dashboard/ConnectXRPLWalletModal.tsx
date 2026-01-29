import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
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

  const handleConnect = async () => {
    try {
      console.log("Connect button clicked");
      await connectWallet();
      toast.success("Wallet connected successfully!");
      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      console.error("Connection error:", error);
      
      // Show user-friendly error message
      const errorMessage = error.message || "Failed to connect wallet";
      
      if (errorMessage.includes("rejected") || errorMessage.includes("denied")) {
        toast.error("Connection rejected. Please accept the connection in GemWallet.");
      } else if (errorMessage.includes("timed out")) {
        toast.error("Connection timed out. Look for a GemWallet popup (it may be behind this window) and approve it.");
      } else if (errorMessage.includes("not found") || errorMessage.includes("install")) {
        toast.error("GemWallet not detected. Please install the extension and refresh.");
      } else {
        toast.error(errorMessage);
      }
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
                            Connect GemWallet to enable RLUSD offramp and XRPL features. Your wallet stays under your control.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* GemWallet Option */}
                    <div className="space-y-3">
                      <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl p-4 flex items-center justify-between transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                            <Wallet className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold">GemWallet</p>
                            <p className="text-xs opacity-90">
                              {isGemWalletInstalled ? "Click to connect" : "Install extension"}
                            </p>
                          </div>
                        </div>
                        {isConnecting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <ExternalLink className="w-5 h-5" />
                        )}
                      </button>
                      {isConnecting && (
                        <p className="text-xs text-muted-foreground text-center">
                          Check for the GemWallet popup (extension icon or behind this window) and approve the connection.
                        </p>
                      )}

                      <div className="text-center space-y-2">
                        {!isGemWalletInstalled ? (
                          <>
                            <p className="text-sm text-muted-foreground mb-2">
                              Don't have GemWallet installed?
                            </p>
                            <a
                              href="https://gemwallet.app/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                              Download GemWallet <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        ) : (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            ✓ GemWallet detected
                          </p>
                        )}
                        
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer hover:text-foreground">
                            Troubleshooting
                          </summary>
                          <div className="mt-2 p-2 bg-muted rounded text-left space-y-1">
                            <p>Detection Status: {isGemWalletInstalled ? "✓ Detected" : "✗ Not detected"}</p>
                            <p className="text-xs pt-2 text-yellow-600 dark:text-yellow-400">
                              ⚠️ Detection may fail even if extension is installed.
                              <br />Try clicking "Connect" anyway - it should work!
                            </p>
                            <p className="text-xs pt-2">
                              If connection fails:
                              <br />1. Make sure GemWallet extension is enabled
                              <br />2. Refresh the page (Cmd+R or Ctrl+R)
                              <br />3. Check browser console (F12) for errors
                              <br />4. Try restarting your browser
                            </p>
                          </div>
                        </details>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-2 pt-4 border-t border-border">
                      <p className="text-sm font-medium mb-3">What you can do:</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                          <p className="text-sm text-muted-foreground">Convert RLUSD to local currency</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                          <p className="text-sm text-muted-foreground">Send RLUSD instantly</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                          <p className="text-sm text-muted-foreground">Non-custodial - you own your keys</p>
                        </div>
                      </div>
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
