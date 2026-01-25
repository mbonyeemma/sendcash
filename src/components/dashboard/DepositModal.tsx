import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, CreditCard, Bitcoin, Copy, Check, QrCode, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cryptoCurrencies, fiatCurrencies, Currency } from "@/data/currencies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DepositMethod = "mobile" | "crypto";
type Step = 1 | 2;

const mobileNetworks = [
  { id: "mtn", name: "MTN Mobile Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/1200px-New-mtn-logo.svg.png" },
  { id: "airtel", name: "Airtel Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Airtel_Africa_logo.svg/1200px-Airtel_Africa_logo.svg.png" },
];

const walletAddresses: Record<string, string> = {
  usdc: "0x1234567890abcdef1234567890abcdef12345678",
  usdt: "TXk8rQSAvPvBBNtqSoY6nCfsXWCSSpTVQF",
  rlusd: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
};

export const DepositModal = ({ isOpen, onClose }: DepositModalProps) => {
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<DepositMethod | null>(null);
  const [network, setNetwork] = useState("");
  const [phoneOption, setPhoneOption] = useState<"saved" | "onetime">("saved");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(fiatCurrencies[0]);
  const [selectedToken, setSelectedToken] = useState<Currency>(cryptoCurrencies[0]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleMethodSelect = (m: DepositMethod) => {
    setMethod(m);
    setStep(2);
  };

  const copyAddress = async () => {
    await navigator.clipboard.writeText(walletAddresses[selectedToken.id]);
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
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Bitcoin className="w-6 h-6 text-accent" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">Cryptocurrency</h3>
                    <p className="text-sm text-muted-foreground">USDC, USDT, RLUSD</p>
                  </div>
                </button>
              </div>
            )}

            {/* Step 2: Mobile Money */}
            {step === 2 && method === "mobile" && (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium">Payment Network</Label>
                  <Select value={network} onValueChange={setNetwork}>
                    <SelectTrigger className="mt-1.5 h-12 bg-background">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {mobileNetworks.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          <div className="flex items-center gap-3">
                            <img src={n.logo} alt={n.name} className="w-5 h-5 object-contain" />
                            <span>{n.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Phone Number</Label>
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => setPhoneOption("saved")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        phoneOption === "saved"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Saved Number
                    </button>
                    <button
                      onClick={() => setPhoneOption("onetime")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        phoneOption === "onetime"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      One-time Number
                    </button>
                  </div>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={phoneOption === "saved" ? "+256 700 000 000" : "Enter phone number"}
                    className="mt-2 h-12"
                  />
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
                    <Select value={selectedCurrency.id} onValueChange={(v) => setSelectedCurrency(fiatCurrencies.find(c => c.id === v) || fiatCurrencies[0])}>
                      <SelectTrigger className="h-12 w-32 bg-background">
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <img src={selectedCurrency.logo} alt={selectedCurrency.symbol} className="w-5 h-4 object-cover rounded-sm" />
                            <span>{selectedCurrency.symbol}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {fiatCurrencies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-2">
                              <img src={c.logo} alt={c.symbol} className="w-5 h-4 object-cover rounded-sm" />
                              <span>{c.symbol}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Crypto */}
            {step === 2 && method === "crypto" && (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium">Select Token to Deposit</Label>
                  <Select value={selectedToken.id} onValueChange={(v) => setSelectedToken(cryptoCurrencies.find(c => c.id === v) || cryptoCurrencies[0])}>
                    <SelectTrigger className="mt-1.5 h-14 bg-background">
                      <SelectValue>
                        <div className="flex items-center gap-3">
                          <img src={selectedToken.logo} alt={selectedToken.symbol} className="w-7 h-7 object-contain" />
                          <div className="text-left">
                            <p className="font-semibold">{selectedToken.symbol}</p>
                            <p className="text-xs text-muted-foreground">{selectedToken.network}</p>
                          </div>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {cryptoCurrencies.map((token) => (
                        <SelectItem key={token.id} value={token.id}>
                          <div className="flex items-center gap-3">
                            <img src={token.logo} alt={token.symbol} className="w-6 h-6 object-contain" />
                            <div>
                              <p className="font-medium">{token.symbol}</p>
                              <p className="text-xs text-muted-foreground">{token.network}</p>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Wallet Address</Label>
                  <div className="mt-2 p-4 rounded-xl bg-muted border border-border">
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-sm text-foreground break-all">
                        {walletAddresses[selectedToken.id]}
                      </code>
                      <button
                        onClick={copyAddress}
                        className="p-2 rounded-lg hover:bg-background transition-colors shrink-0"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-accent" />
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
                  Send only <span className="font-semibold text-foreground">{selectedToken.symbol}</span> ({selectedToken.network}) to this address
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border space-y-3">
            {step === 2 && method === "mobile" && (
              <Button 
                onClick={handleConfirm} 
                className="w-full h-12 bg-primary hover:bg-primary/90"
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
