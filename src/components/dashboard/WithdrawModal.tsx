import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Bitcoin, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WithdrawMethod = "mobile" | "crypto";
type Step = 1 | 2 | 3;

const mobileNetworks = ["MTN Mobile Money", "Airtel Money", "Others"];
const cryptoTokens = ["TRON", "DCS", "XLUSD"];

export const WithdrawModal = ({ isOpen, onClose }: WithdrawModalProps) => {
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<WithdrawMethod | null>(null);
  const [network, setNetwork] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [selectedToken, setSelectedToken] = useState("TRON");
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleMethodSelect = (m: WithdrawMethod) => {
    setMethod(m);
    setStep(2);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsLoading(false);
    toast({
      title: "Withdrawal initiated!",
      description: method === "mobile"
        ? "Your mobile money will arrive shortly."
        : "Transaction submitted to the blockchain.",
    });
    setStep(3);
  };

  const resetAndClose = () => {
    setStep(1);
    setMethod(null);
    setNetwork("");
    setPhone("");
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
              <h2 className="text-xl font-bold text-foreground mb-2">Withdraw Funds</h2>
              <p className="text-muted-foreground mb-6">Choose your withdrawal method</p>

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

          {/* Step 2: Mobile */}
          {step === 2 && method === "mobile" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Mobile Money Withdrawal</h2>
              <p className="text-muted-foreground mb-6">Enter your withdrawal details</p>

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
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Withdrawal"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Crypto */}
          {step === 2 && method === "crypto" && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Crypto Withdrawal</h2>
              <p className="text-muted-foreground mb-6">Enter your wallet details</p>

              <div className="space-y-4">
                <div>
                  <Label>Select Token</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {cryptoTokens.map((token) => (
                      <button
                        key={token}
                        onClick={() => setSelectedToken(token)}
                        className={`p-3 rounded-xl border transition-all ${
                          selectedToken === token
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
                  <Label>Wallet Address</Label>
                  <Input
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Enter destination wallet address"
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
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Withdrawal"}
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
              <h2 className="text-xl font-bold text-foreground mb-2">Withdrawal Initiated!</h2>
              <p className="text-muted-foreground mb-6">
                {method === "mobile"
                  ? "Your mobile money will arrive within minutes."
                  : "Your crypto will arrive once confirmed on the blockchain."}
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