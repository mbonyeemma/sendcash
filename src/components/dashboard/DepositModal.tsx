import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, CreditCard, Bitcoin, Copy, Check, QrCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DepositMethod = "mobile" | "crypto";
type Step = 1 | 2;

const mobileNetworks = ["MTN Mobile Money", "Airtel Money", "Others"];
const cryptoTokens = [
  { id: "usdt", name: "Tether", symbol: "USDT", address: "TXk8rQSAvPvBBNtqSoY6nCfsXWCSSpTVQF", color: "bg-emerald-500" },
  { id: "usdc", name: "USD Coin", symbol: "USDC", address: "0x1234567890abcdef1234567890abcdef12345678", color: "bg-blue-500" },
];

export const DepositModal = ({ isOpen, onClose }: DepositModalProps) => {
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<DepositMethod | null>(null);
  const [network, setNetwork] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState(cryptoTokens[0]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleMethodSelect = (m: DepositMethod) => {
    setMethod(m);
    setStep(2);
  };

  const copyAddress = async () => {
    await navigator.clipboard.writeText(selectedToken.address);
    setCopied(true);
    toast({ title: "Address copied!", description: "Wallet address copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    toast({
      title: "Deposit initiated!",
      description: method === "mobile" 
        ? "Please complete the payment on your phone." 
        : "Waiting for blockchain confirmation.",
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep(1);
    setMethod(null);
    setNetwork("");
    setPhone("");
    setAmount("");
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
              <h2 className="text-xl font-bold text-foreground">Deposit Funds</h2>
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
            {/* Step 1: Method Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-muted-foreground">Choose your deposit method</p>

                <button
                  onClick={() => handleMethodSelect("mobile")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">Mobile Money</h3>
                    <p className="text-sm text-muted-foreground">MTN, Airtel & more</p>
                  </div>
                </button>

                <button
                  disabled
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border opacity-50 cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-muted-foreground">Visa/Mastercard</h3>
                    <p className="text-sm text-muted-foreground">Coming Soon</p>
                  </div>
                </button>

                <button
                  onClick={() => handleMethodSelect("crypto")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center">
                    <Bitcoin className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">Cryptocurrency</h3>
                    <p className="text-sm text-muted-foreground">USDT, USDC</p>
                  </div>
                </button>
              </div>
            )}

            {/* Step 2: Mobile Money */}
            {step === 2 && method === "mobile" && (
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
                  <Label>Phone Number</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
            {step === 2 && method === "crypto" && (
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
                  <Label>Wallet Address</Label>
                  <div className="mt-2 p-4 rounded-xl bg-muted border border-border">
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-sm text-foreground break-all">
                        {selectedToken.address}
                      </code>
                      <button
                        onClick={copyAddress}
                        className="p-2 rounded-lg hover:bg-background transition-colors shrink-0"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center py-4">
                  <div className="w-32 h-32 bg-muted rounded-xl flex items-center justify-center border border-border">
                    <QrCode className="w-16 h-16 text-muted-foreground" />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Send only {selectedToken.symbol} to this address
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border space-y-3">
            {step === 2 && method === "mobile" && (
              <Button 
                variant="hero" 
                onClick={handleConfirm} 
                className="w-full h-12"
                disabled={!network || !phone || !amount || isLoading}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Deposit"}
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