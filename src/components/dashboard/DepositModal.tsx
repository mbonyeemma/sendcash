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

type DepositMethod = "mobile" | "visa" | "crypto";
type Step = 1 | 2 | 3;

const mobileNetworks = ["MTN Mobile Money", "Airtel Money", "Others"];
const cryptoTokens = [
  { id: "tron", name: "TRON", symbol: "TRX", address: "TXk8rQSAvPvBBNtqSoY6nCfsXWCSSpTVQF" },
  { id: "dcs", name: "DCS Token", symbol: "DCS", address: "DCSk8rQSAvPvBBNtqSoY6nCfsXWCSSpTVQF" },
  { id: "xlusd", name: "XLUSD", symbol: "XLUSD", address: "XLUSDk8rQSAvPvBBNtqSoY6nCfsXWCSSpTVQF" },
];

export const DepositModal = ({ isOpen, onClose }: DepositModalProps) => {
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<DepositMethod | null>(null);
  const [network, setNetwork] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UGX");
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
    await new Promise((r) => setTimeout(r, 2000));
    setIsLoading(false);
    toast({
      title: "Deposit initiated!",
      description: method === "mobile" 
        ? "Please complete the payment on your phone." 
        : "Waiting for blockchain confirmation.",
    });
    setStep(3);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={resetAndClose}
          className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-card rounded-2xl shadow-xl w-full max-w-lg p-6 border border-border"
        >
          <button
            onClick={resetAndClose}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step 1: Method Selection */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Deposit Funds</h2>
              <p className="text-muted-foreground mb-6">Choose your deposit method</p>

              <div className="space-y-3">
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
                    <p className="text-sm text-muted-foreground">TRON, DCS, XLUSD</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && method === "mobile" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Mobile Money Deposit</h2>
              <p className="text-muted-foreground mb-6">Enter your payment details</p>

              <div className="space-y-4">
                <div>
                  <Label>Network</Label>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="w-full mt-1.5 h-11 px-3 rounded-lg border border-input bg-background text-foreground"
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
                    className="mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100,000"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full mt-1.5 h-11 px-3 rounded-lg border border-input bg-background text-foreground"
                    >
                      <option value="UGX">UGX</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    variant="hero" 
                    onClick={handleConfirm} 
                    className="flex-1"
                    disabled={!network || !phone || !amount || isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Deposit"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && method === "crypto" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Crypto Deposit</h2>
              <p className="text-muted-foreground mb-6">Send crypto to your wallet address</p>

              <div className="space-y-4">
                <div>
                  <Label>Select Token</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {cryptoTokens.map((token) => (
                      <button
                        key={token.id}
                        onClick={() => setSelectedToken(token)}
                        className={`p-3 rounded-xl border transition-all ${
                          selectedToken.id === token.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="font-semibold text-foreground">{token.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Wallet Address</Label>
                  <div className="mt-1.5 p-4 rounded-xl bg-muted border border-border">
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
                  Send only {selectedToken.name} ({selectedToken.symbol}) to this address.
                  Sending other tokens may result in loss.
                </p>

                <Button variant="outline" onClick={() => setStep(1)} className="w-full">
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Deposit Initiated!</h2>
              <p className="text-muted-foreground mb-6">
                {method === "mobile"
                  ? "Please complete the payment on your phone. Your balance will update once confirmed."
                  : "Your balance will update once the transaction is confirmed on the blockchain."}
              </p>
              <Button variant="hero" onClick={resetAndClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};