import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, ArrowRightLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SendType = "mobile" | "fiat-to-crypto" | "crypto-to-crypto";
type Step = 1 | 2 | 3;

const mobileNetworks = ["MTN Mobile Money", "Airtel Money", "Others"];
const cryptoTokens = ["TRON", "DCS", "XLUSD"];
const fiatCurrencies = ["UGX", "USD"];

export const SendModal = ({ isOpen, onClose }: SendModalProps) => {
  const [step, setStep] = useState<Step>(1);
  const [sendType, setSendType] = useState<SendType | null>(null);
  const [network, setNetwork] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [fromToken, setFromToken] = useState("TRON");
  const [toToken, setToToken] = useState("DCS");
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTypeSelect = (type: SendType) => {
    setSendType(type);
    setStep(2);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsLoading(false);
    toast({
      title: "Transfer sent!",
      description: "Your transfer has been initiated successfully.",
    });
    setStep(3);
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

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Send Money</h2>
              <p className="text-muted-foreground mb-6">Choose how you want to send</p>

              <div className="space-y-3">
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
                  onClick={() => handleTypeSelect("fiat-to-crypto")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center">
                    <ArrowRightLeft className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">Fiat → Crypto</h3>
                    <p className="text-sm text-muted-foreground">Convert UGX/USD to crypto</p>
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect("crypto-to-crypto")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <ArrowRightLeft className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">Crypto → Crypto</h3>
                    <p className="text-sm text-muted-foreground">Send crypto to another wallet</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Mobile */}
          {step === 2 && sendType === "mobile" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Send to Mobile Money</h2>
              <p className="text-muted-foreground mb-6">Enter recipient details</p>

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
                  <Label>Recipient Phone</Label>
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
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
                      {fiatCurrencies.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
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
                    disabled={!network || !recipient || !amount || isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Money"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Fiat to Crypto */}
          {step === 2 && sendType === "fiat-to-crypto" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Convert Fiat to Crypto</h2>
              <p className="text-muted-foreground mb-6">Exchange your local currency</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>From Currency</Label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full mt-1.5 h-11 px-3 rounded-lg border border-input bg-background text-foreground"
                    >
                      {fiatCurrencies.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>To Token</Label>
                    <select
                      value={toToken}
                      onChange={(e) => setToToken(e.target.value)}
                      className="w-full mt-1.5 h-11 px-3 rounded-lg border border-input bg-background text-foreground"
                    >
                      {cryptoTokens.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Amount ({currency})</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100,000"
                    className="mt-1.5"
                  />
                </div>

                <div className="p-4 rounded-xl bg-muted border border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">You will receive (est.)</span>
                    <span className="font-semibold text-foreground">
                      {amount ? (parseFloat(amount) * 0.00027).toFixed(4) : "0.0000"} {toToken}
                    </span>
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
                    disabled={!amount || isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convert"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Crypto to Crypto */}
          {step === 2 && sendType === "crypto-to-crypto" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Send Crypto</h2>
              <p className="text-muted-foreground mb-6">Send to another wallet</p>

              <div className="space-y-4">
                <div>
                  <Label>Select Token</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {cryptoTokens.map((token) => (
                      <button
                        key={token}
                        onClick={() => setFromToken(token)}
                        className={`p-3 rounded-xl border transition-all ${
                          fromToken === token
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="font-semibold text-foreground">{token}</span>
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
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1.5"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button
                    variant="hero"
                    onClick={handleConfirm}
                    className="flex-1"
                    disabled={!walletAddress || !amount || isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Crypto"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Transfer Sent!</h2>
              <p className="text-muted-foreground mb-6">
                Your transfer has been initiated and will be processed shortly.
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