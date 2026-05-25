import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bitcoin, Loader2, Info, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getCurrencyById } from "@/data/currencies";
import { SUPPORTED_ASSETS, getSupportedAssetById } from "@/data/supportedAssets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Calculate fees - 0.2% for crypto withdrawal
const calculateFee = (amount: number): number => {
  return amount * 0.002; // 0.2% fee for crypto withdrawal
};

export const WithdrawModal = ({ isOpen, onClose }: WithdrawModalProps) => {
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [withdrawAssetId, setWithdrawAssetId] = useState(SUPPORTED_ASSETS[0]?.id ?? "");
  const withdrawAsset = getSupportedAssetById(withdrawAssetId);
  const displayCurrency = withdrawAsset
    ? getCurrencyById(withdrawAsset.chain === "base" ? (withdrawAsset.code === "USDC" ? "usdc-base" : "usdt-base") : withdrawAsset.code.toLowerCase()) ||
      getCurrencyById("rlusd")
    : getCurrencyById("rlusd");
  const fee = amount && !isNaN(parseFloat(amount))
    ? calculateFee(parseFloat(amount))
    : 0;
  const totalAmount = amount && !isNaN(parseFloat(amount))
    ? parseFloat(amount) + fee
    : 0;

  const copyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast({ title: "Address copied!", description: "Wallet address copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirm = async () => {
    if (!walletAddress || !amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    toast({
      title: "Withdrawal initiated!",
      description: `Transaction submitted to the blockchain. You will receive ${withdrawAsset?.code ?? "crypto"} shortly.`,
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setAmount("");
    setWalletAddress("");
    setCopied(false);
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
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-xl font-bold text-foreground">Withdraw crypto</h2>
              <p className="text-sm text-muted-foreground">Withdraw to an external wallet</p>
            </div>
            <button
              onClick={resetAndClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <Label className="text-sm font-medium">Asset</Label>
              <Select value={withdrawAssetId} onValueChange={setWithdrawAssetId}>
                <SelectTrigger className="mt-1.5 h-11 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_ASSETS.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} · {a.chain === "base" ? "Base" : "XRPL"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                {displayCurrency && (
                  <img
                    src={displayCurrency.logo}
                    alt={withdrawAsset?.code}
                    className="w-10 h-10 rounded-full object-contain"
                  />
                )}
                <div>
                  <p className="font-semibold text-foreground">{withdrawAsset?.name}</p>
                  <p className="text-xs text-muted-foreground">{displayCurrency?.network}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Withdraw your balance to an external {withdrawAsset?.chain === "base" ? "Base (EVM)" : "XRPL"} address.
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Destination Wallet Address</Label>
              <div className="mt-1.5 relative">
                <Input
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder={withdrawAsset?.chain === "base" ? "0x… Base address" : "r… XRPL address"}
                  className="h-12 pr-10"
                />
                {walletAddress && (
                  <button
                    onClick={copyAddress}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-accent" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use a valid {withdrawAsset?.chain === "base" ? "Base (EVM)" : "XRPL"} address.
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Amount</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-12 flex-1"
                />
                <div className="h-12 w-24 bg-muted rounded-md border border-border flex items-center justify-center">
                  <span className="font-medium text-foreground">{withdrawAsset?.code ?? "—"}</span>
                </div>
              </div>
            </div>

            {amount && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Withdrawal Fee</span>
                  <span className="font-medium text-foreground">
                    {fee.toFixed(6)} {withdrawAsset?.code} (0.2%)
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-primary/20">
                  <span className="text-muted-foreground">Total Deducted</span>
                  <span className="font-semibold text-foreground">
                    {totalAmount.toFixed(6)} {withdrawAsset?.code}
                  </span>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-primary/20">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Minimum withdrawal: 10 {withdrawAsset?.code}</p>
                    <p>• Processing time: 1-3 blockchain confirmations (usually 5-15 minutes)</p>
                    <p>
                      • Ensure the address matches {withdrawAsset?.chain === "base" ? "Base" : "XRPL"}
                    </p>
                    <p>• Double-check the address before confirming</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border space-y-3">
            <Button 
              onClick={handleConfirm} 
              className="w-full h-12 bg-primary hover:bg-primary/90"
              disabled={!walletAddress || !amount || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Confirm Withdrawal"
              )}
            </Button>
            <Button variant="outline" onClick={resetAndClose} className="w-full h-12">
              Cancel
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
