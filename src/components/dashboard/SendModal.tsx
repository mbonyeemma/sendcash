import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SendType = "mobile" | "crypto";
type Step = 1 | 2;

const mobileNetworks = ["MTN Mobile Money", "Airtel Money", "Others"];
const cryptoTokens = [
  { id: "usdt", name: "Tether", symbol: "USDT", color: "bg-emerald-500" },
  { id: "usdc", name: "USD Coin", symbol: "USDC", color: "bg-blue-500" },
];

export const SendModal = ({ isOpen, onClose }: SendModalProps) => {
  const [step, setStep] = useState<Step>(1);
  const [sendType, setSendType] = useState<SendType | null>(null);
  const [network, setNetwork] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState(cryptoTokens[0]);
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTypeSelect = (type: SendType) => {
    setSendType(type);
    setStep(2);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    toast({
      title: "Transfer sent!",
      description: "Your transfer has been initiated successfully.",
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep(1);
    setSendType(null);
    setNetwork("");
    setRecipient("");
    setAmount("");
    setWalletAddress("");
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
              <h2 className="text-xl font-bold text-foreground">Send Money</h2>
              <p className="text-sm text-muted-foreground">Step {step} of 2</p>
            </div>
            <button
              onClick={resetAndClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress */}
          <div className="flex gap-2 px-6 pt-4">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-muted-foreground">Choose how you want to send</p>

                <button
                  onClick={() => handleTypeSelect("mobile")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">Mobile Money</h3>
                    <p className="text-sm text-muted-foreground">Send to MTN, Airtel & more</p>
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect("crypto")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center">
                    <ArrowRightLeft className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">Cryptocurrency</h3>
                    <p className="text-sm text-muted-foreground">Send USDT, USDC</p>
                  </div>
                </button>
              </div>
            )}

            {/* Step 2: Mobile */}
            {step === 2 && sendType === "mobile" && (
              <div className="space-y-5">
                <div>
                  <Label>Network</Label>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="w-full mt-1.5 h-12 px-4 rounded-xl border border-input bg-background text-foreground"
                  >
                    <option value="">Select network</option>
                    {mobileNetworks.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Recipient Phone</Label>
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="+256 700 000 000"
                    className="mt-1.5 h-12"
                  />
                </div>

                <div>
                  <Label>Amount (UGX)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100,000"
                    className="mt-1.5 h-12"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Crypto */}
            {step === 2 && sendType === "crypto" && (
              <div className="space-y-5">
                <div>
                  <Label>Select Token</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {cryptoTokens.map((token) => (
                      <button
                        key={token.id}
                        onClick={() => setSelectedToken(token)}
                        className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                          selectedToken.id === token.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full ${token.color} flex items-center justify-center text-white text-xs font-bold`}>
                          {token.symbol.charAt(0)}
                        </div>
                        <span className="font-semibold text-foreground">{token.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Recipient Wallet Address</Label>
                  <Input
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Enter wallet address"
                    className="mt-1.5 h-12"
                  />
                </div>

                <div>
                  <Label>Amount ({selectedToken.symbol})</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1.5 h-12"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border space-y-3">
            {step === 2 && (
              <Button 
                variant="hero" 
                onClick={handleConfirm} 
                className="w-full h-12"
                disabled={
                  (sendType === "mobile" && (!network || !recipient || !amount)) ||
                  (sendType === "crypto" && (!walletAddress || !amount)) ||
                  isLoading
                }
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Money"}
              </Button>
            )}
            <Button variant="outline" onClick={step === 1 ? resetAndClose : () => setStep(1)} className="w-full h-12">
              {step === 1 ? "Cancel" : "Back"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};