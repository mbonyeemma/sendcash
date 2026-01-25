import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpDown, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { currencies, cryptoCurrencies, fiatCurrencies, Currency, exchangeRates } from "@/data/currencies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mobileNetworks = [
  { id: "mtn", name: "MTN Mobile Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/1200px-New-mtn-logo.svg.png" },
  { id: "airtel", name: "Airtel Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Airtel_Africa_logo.svg/1200px-Airtel_Africa_logo.svg.png" },
];

export const SendModal = ({ isOpen, onClose }: SendModalProps) => {
  const [activeTab, setActiveTab] = useState<"convert" | "mobile">("convert");
  const [fromCurrency, setFromCurrency] = useState<Currency>(cryptoCurrencies[0]);
  const [toCurrency, setToCurrency] = useState<Currency>(fiatCurrencies[0]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [network, setNetwork] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getRate = () => {
    return exchangeRates[fromCurrency.id]?.[toCurrency.id] || 1;
  };

  useEffect(() => {
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      const rate = getRate();
      setToAmount((parseFloat(fromAmount) * rate).toFixed(2));
    } else {
      setToAmount("");
    }
  }, [fromAmount, fromCurrency, toCurrency]);

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    setFromAmount(toAmount);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    toast({
      title: "Transfer sent!",
      description: activeTab === "convert" 
        ? `Successfully converted ${fromAmount} ${fromCurrency.symbol} to ${toAmount} ${toCurrency.symbol}`
        : `Sent ${fromAmount} UGX to ${recipient}`,
    });
    resetAndClose();
  };

  const resetAndClose = () => {
    setFromAmount("");
    setToAmount("");
    setNetwork("");
    setRecipient("");
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
              <p className="text-sm text-muted-foreground">Convert & send funds</p>
            </div>
            <button
              onClick={resetAndClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "convert" | "mobile")} className="flex-1 flex flex-col">
            <TabsList className="mx-6 mt-4 grid grid-cols-2 bg-muted">
              <TabsTrigger value="convert" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Convert
              </TabsTrigger>
              <TabsTrigger value="mobile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Mobile Money
              </TabsTrigger>
            </TabsList>

            {/* Convert Tab */}
            <TabsContent value="convert" className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* From Section */}
              <div className="bg-muted rounded-2xl p-5 space-y-3">
                <Label className="text-sm text-muted-foreground">From</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    placeholder="0"
                    className="text-3xl font-bold h-14 bg-transparent border-0 p-0 focus-visible:ring-0 flex-1"
                  />
                  <Select value={fromCurrency.id} onValueChange={(v) => setFromCurrency(currencies.find(c => c.id === v) || fromCurrency)}>
                    <SelectTrigger className="h-12 w-36 bg-background rounded-xl">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <img src={fromCurrency.logo} alt={fromCurrency.symbol} className="w-6 h-6 object-contain rounded-full" />
                          <span className="font-semibold">{fromCurrency.symbol}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={c.id} disabled={c.id === toCurrency.id}>
                          <div className="flex items-center gap-2">
                            <img src={c.logo} alt={c.symbol} className="w-5 h-5 object-contain rounded-full" />
                            <span>{c.symbol}</span>
                            <span className="text-xs text-muted-foreground">({c.name})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-2 relative z-10">
                <button
                  onClick={swapCurrencies}
                  className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                >
                  <ArrowUpDown className="w-5 h-5" />
                </button>
              </div>

              {/* To Section */}
              <div className="bg-muted rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">To</Label>
                  <span className="text-xs text-accent flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Live
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-bold flex-1 min-h-[3.5rem] flex items-center">
                    {toAmount || "0"}
                  </p>
                  <Select value={toCurrency.id} onValueChange={(v) => setToCurrency(currencies.find(c => c.id === v) || toCurrency)}>
                    <SelectTrigger className="h-12 w-36 bg-primary text-primary-foreground rounded-xl">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <img src={toCurrency.logo} alt={toCurrency.symbol} className="w-6 h-6 object-contain rounded-full" />
                          <span className="font-semibold">{toCurrency.symbol}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={c.id} disabled={c.id === fromCurrency.id}>
                          <div className="flex items-center gap-2">
                            <img src={c.logo} alt={c.symbol} className="w-5 h-5 object-contain rounded-full" />
                            <span>{c.symbol}</span>
                            <span className="text-xs text-muted-foreground">({c.name})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rate Info */}
              {fromAmount && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Min: 1 {fromCurrency.symbol} | Max: 5,000,000 {toCurrency.symbol}</span>
                  </div>
                  <p className="text-primary font-medium mt-1">
                    Rate: 1 {fromCurrency.symbol} = {getRate().toLocaleString()} {toCurrency.symbol}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Mobile Money Tab */}
            <TabsContent value="mobile" className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <Label className="text-sm font-medium">Network</Label>
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
                <Label className="text-sm font-medium">Recipient Phone</Label>
                <Input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="+256 700 000 000"
                  className="mt-1.5 h-12"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Amount (UGX)</Label>
                <Input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0"
                  className="mt-1.5 h-12"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="p-6 border-t border-border space-y-3">
            <Button 
              onClick={handleConfirm} 
              className="w-full h-12 bg-primary hover:bg-primary/90"
              disabled={
                (activeTab === "convert" && !fromAmount) ||
                (activeTab === "mobile" && (!network || !recipient || !fromAmount)) ||
                isLoading
              }
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
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
