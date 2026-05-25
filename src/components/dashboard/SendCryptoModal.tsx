import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle, Wallet, Send, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { xrplService } from "@/services/xrplService";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import { XRPL_SEND_ASSETS, getSupportedAssetById } from "@/data/supportedAssets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const XRPL_FAVORITES_KEY = "sendcash_xrpl_favorites";

export interface XrplFavorite {
  id: string;
  label: string;
  address: string;
}

export function loadFavorites(): XrplFavorite[] {
  try {
    const raw = localStorage.getItem(XRPL_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(list: XrplFavorite[]) {
  localStorage.setItem(XRPL_FAVORITES_KEY, JSON.stringify(list));
}

interface SendCryptoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SendCryptoModal = ({ isOpen, onClose, onSuccess }: SendCryptoModalProps) => {
  const { isConnected, address, connectWallet, network: xrplNetwork } = useXRPLWallet();
  const defaultAsset = XRPL_SEND_ASSETS.find((a) => a.code === "RLUSD") ?? XRPL_SEND_ASSETS[0];
  const [assetId, setAssetId] = useState(defaultAsset.id);
  const assetMeta = getSupportedAssetById(assetId) ?? defaultAsset;
  const [amount, setAmount] = useState("");
  const [favorites, setFavorites] = useState<XrplFavorite[]>([]);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string>("");
  const [customAddress, setCustomAddress] = useState("");
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [addFavoriteLabel, setAddFavoriteLabel] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFavorites(loadFavorites());
    }
  }, [isOpen]);

  const destinationAddress = useCustomAddress
    ? customAddress.trim()
    : favorites.find((f) => f.id === selectedFavoriteId)?.address?.trim() || "";

  const canPreview =
    isConnected &&
    parseFloat(amount) > 0 &&
    destinationAddress.length >= 25 &&
    assetMeta.chain === "xrpl";

  const handleSend = async () => {
    if (!isConnected) {
      toast.error("Connect your XRPL wallet first");
      try {
        await connectWallet();
      } catch (e) {
        console.error(e);
      }
      return;
    }
    if (!canPreview) {
      toast.error("Enter amount and choose a destination address");
      return;
    }
    if (!showPreview) {
      setShowPreview(true);
      return;
    }

    setIsLoading(true);
    try {
      const issuer =
        assetMeta.code === "RLUSD"
          ? xrplService.getRLUSDIssuer("Mainnet")
          : undefined;
      const result = (await xrplService.sendPayment(
        destinationAddress,
        amount,
        assetMeta.code,
        issuer
      )) as { type?: string; result?: { hash?: string } };
      if (result?.type === "reject") {
        toast.error("Transaction cancelled in wallet");
        return;
      }
      if (result?.type === "response" && result?.result?.hash) {
        toast.success(`Sent ${amount} ${assetMeta.code}. Tx: ${result.result.hash.slice(0, 8)}...`);
        setAmount("");
        setSelectedFavoriteId("");
        setCustomAddress("");
        setShowPreview(false);
        onClose();
        onSuccess?.();
      } else {
        toast.error("Unexpected response from wallet");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setIsLoading(false);
    }
  };

  const addCurrentAsFavorite = () => {
    if (!destinationAddress || destinationAddress.length < 25) {
      toast.error("Enter a valid XRPL address first");
      return;
    }
    const label = addFavoriteLabel.trim() || `Address ${destinationAddress.slice(0, 8)}...`;
    const newFav: XrplFavorite = {
      id: `fav_${Date.now()}`,
      label,
      address: destinationAddress,
    };
    const next = [...favorites, newFav];
    setFavorites(next);
    saveFavorites(next);
    setSelectedFavoriteId(newFav.id);
    setUseCustomAddress(false);
    setAddFavoriteLabel("");
    toast.success("Saved to favorites");
  };

  const removeFavorite = (id: string) => {
    const next = favorites.filter((f) => f.id !== id);
    setFavorites(next);
    saveFavorites(next);
    if (selectedFavoriteId === id) {
      setSelectedFavoriteId("");
    }
  };

  const resetAndClose = () => {
    setAmount("");
    setSelectedFavoriteId("");
    setCustomAddress("");
    setUseCustomAddress(false);
    setShowPreview(false);
    setAddFavoriteLabel("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={resetAndClose}
          className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative bg-card h-full w-full max-w-md shadow-2xl border-l border-border flex flex-col"
        >
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Send on XRPL</h2>
            <button
              onClick={resetAndClose}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {!isConnected && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Wallet not connected</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={async () => {
                      try {
                        await connectWallet();
                        toast.success("Wallet connected");
                      } catch {
                        toast.error("Failed to connect");
                      }
                    }}
                  >
                    <Wallet className="w-4 h-4 mr-1" />
                    Connect Wallet
                  </Button>
                </div>
              </div>
            )}

            {isConnected && (
              <>
                <div>
                  <Label className="text-sm font-medium">Asset</Label>
                  <Select value={assetId} onValueChange={setAssetId}>
                    <SelectTrigger className="mt-1.5 h-12 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {XRPL_SEND_ASSETS.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <span className="flex items-center gap-2">
                            {a.logo ? (
                              <img src={a.logo} alt={a.code} className="w-5 h-4 object-contain rounded" />
                            ) : (
                              <span className="w-5 h-4 rounded bg-white text-black flex items-center justify-center text-[10px] font-bold">XRP</span>
                            )}
                            {a.code} · XRPL
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Amount ({assetMeta.code})</Label>
                  <Input
                    type="number"
                    step={assetMeta.code === "XRP" ? "0.000001" : "0.01"}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1.5 h-12"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2">Send to (favorites)</Label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setUseCustomAddress(false)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        !useCustomAddress ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      Favorites
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseCustomAddress(true)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                        useCustomAddress ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      New address
                    </button>
                  </div>
                  {!useCustomAddress ? (
                    <div className="space-y-2">
                      {favorites.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No favorites. Add one via &quot;New address&quot; then save.</p>
                      ) : (
                        favorites.map((f) => (
                          <div
                            key={f.id}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                              selectedFavoriteId === f.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                            }`}
                            onClick={() => setSelectedFavoriteId(f.id)}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Star className="w-4 h-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium truncate">{f.label}</p>
                                <p className="text-xs text-muted-foreground font-mono truncate">{f.address}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFavorite(f.id);
                              }}
                              className="text-destructive hover:bg-destructive/10 p-1 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                        className="h-11 font-mono text-sm"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={addFavoriteLabel}
                          onChange={(e) => setAddFavoriteLabel(e.target.value)}
                          placeholder="Label for favorite"
                          className="h-10 flex-1"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={addCurrentAsFavorite} className="gap-1">
                          <Plus className="w-4 h-4" />
                          Save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {showPreview && (
                  <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/30">
                    <h3 className="font-semibold">Review</h3>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">{amount} {assetMeta.code}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">To</span>
                      <span className="font-mono text-xs truncate max-w-[200px]">{destinationAddress}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {isConnected && (
            <div className="p-6 border-t border-border">
              <Button
                onClick={handleSend}
                disabled={!canPreview && !showPreview}
                className="w-full h-12 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : showPreview ? (
                  <>
                    <Send className="w-5 h-5" />
                    Confirm & Send
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Preview & Send
                  </>
                )}
              </Button>
              {showPreview && !isLoading && (
                <Button variant="ghost" className="w-full mt-2" onClick={() => setShowPreview(false)}>
                  Back
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
