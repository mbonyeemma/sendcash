import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowDownCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getCurrencyById } from "@/data/currencies";

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const stableCoinsForSwap = [
  { id: "rlusd", label: "RLUSD", available: true },
  { id: "usdc", label: "USDC", available: false },
  { id: "usdt", label: "USDT", available: false },
];

export const SwapModal = ({ isOpen, onClose }: SwapModalProps) => {
  const [amount, setAmount] = useState("");
  const rlusdInfo = getCurrencyById("rlusd");
  const usdcInfo = getCurrencyById("usdc");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative bg-card h-full w-full max-w-md shadow-2xl border-l border-border flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Swap</h2>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <p className="text-sm text-muted-foreground">Stablecoins</p>
            <div className="space-y-2">
              {stableCoinsForSwap.map((coin) => {
                const info = getCurrencyById(coin.id);
                return (
                  <div
                    key={coin.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      {info?.logo && (
                        <img src={info.logo} alt={coin.label} className="w-8 h-6 object-contain rounded" />
                      )}
                      <span className="font-semibold text-foreground">{coin.label}</span>
                    </div>
                    {!coin.available && (
                      <Badge variant="secondary" className="text-xs">COMING SOON</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground mb-2">From</p>
              <div className="flex items-center gap-3">
                {rlusdInfo?.logo && (
                  <img src={rlusdInfo.logo} alt="RLUSD" className="w-8 h-6 object-contain rounded" />
                )}
                <span className="font-semibold text-foreground">RLUSD</span>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-2">
                <ArrowDownCircle className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground mb-2">To</p>
              <div className="flex items-center gap-3">
                {usdcInfo?.logo && (
                  <img src={usdcInfo.logo} alt="USDC" className="w-8 h-6 object-contain rounded" />
                )}
                <span className="font-semibold text-foreground">USDC</span>
                <Badge variant="secondary" className="text-xs">COMING SOON</Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Amount (RLUSD)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1.5 h-12"
              />
            </div>

            {amount && parseFloat(amount) > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs text-muted-foreground mb-1">You will receive (approx.)</p>
                <p className="text-lg font-semibold text-foreground">
                  ~{amount} USDC
                </p>
                <p className="text-xs text-muted-foreground mt-1">Rate and fees when available</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-border">
            <Button
              disabled
              className="w-full h-12 bg-muted text-muted-foreground cursor-not-allowed"
            >
              Coming soon
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
