import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ArrowLeftRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { exchangeApi } from "@/services/api";
import { currencies, Currency, exchangeRates } from "@/data/currencies";
import { AmountWithCurrency } from "@/components/ui/amount-with-currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConvertModal = ({ isOpen, onClose }: ConvertModalProps) => {
  const [fromCurrency, setFromCurrency] = useState<Currency>(currencies[0]);
  const [toCurrency, setToCurrency] = useState<Currency>(currencies[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // Fetch exchange rate when currencies change
  useEffect(() => {
    if (fromCurrency && toCurrency && fromCurrency.id !== toCurrency.id) {
      fetchExchangeRate();
    }
  }, [fromCurrency, toCurrency]);

  const fetchExchangeRate = async () => {
    try {
      setIsLoadingRate(true);
      const fromSymbol = fromCurrency.symbol.toUpperCase();
      const toSymbol = toCurrency.symbol.toUpperCase();
      const response = await exchangeApi.getExchangeRate(fromSymbol, toSymbol);
      if (response.data?.rate) {
        setExchangeRate(response.data.rate);
      }
    } catch (error: any) {
      console.error("Failed to fetch exchange rate:", error);
      // Fallback to local rates
      setExchangeRate(exchangeRates[fromCurrency.id]?.[toCurrency.id] || 1);
    } finally {
      setIsLoadingRate(false);
    }
  };

  useEffect(() => {
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      const converted = parseFloat(fromAmount) * exchangeRate;
      if (toCurrency.id === "ugx" || toCurrency.id === "kes") {
        setToAmount(converted.toFixed(0));
      } else {
        setToAmount(converted.toFixed(6));
      }
    } else {
      setToAmount("");
    }
  }, [fromAmount, exchangeRate, toCurrency]);

  const handleConvert = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    toast.success(`Successfully converted ${fromAmount} ${fromCurrency.symbol} to ${toAmount} ${toCurrency.symbol}`);
    resetAndClose();
  };

  const resetAndClose = () => {
    setFromAmount("");
    setToAmount("");
    onClose();
  };

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    setFromAmount(toAmount);
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
            <div className="flex items-center gap-3">
              <button
                onClick={resetAndClose}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-foreground">Convert</h2>
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
            {/* From Currency */}
            <div>
              <Label className="text-sm font-medium">From Currency</Label>
              <Select 
                value={fromCurrency.id} 
                onValueChange={(v) => {
                  const currency = currencies.find(c => c.id === v);
                  if (currency && currency.id !== toCurrency.id) {
                    setFromCurrency(currency);
                    setFromAmount("");
                  }
                }}
              >
                <SelectTrigger className="mt-1.5 h-12 bg-background">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <img src={fromCurrency.logo} alt={fromCurrency.symbol} className="w-5 h-5 object-contain rounded-full" />
                      <span className="font-medium">{fromCurrency.symbol}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {currencies
                    .filter(c => c.id !== toCurrency.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <img src={c.logo} alt={c.symbol} className="w-5 h-5 object-contain rounded-full" />
                          <span className="font-medium">{c.symbol}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* From Amount */}
            <div>
              <AmountWithCurrency
                amount={fromAmount}
                onAmountChange={setFromAmount}
                currency={fromCurrency}
                onCurrencyChange={(currency) => {
                  if (currency.id !== toCurrency.id) {
                    setFromCurrency(currency);
                  }
                }}
                currencies={currencies.filter(c => c.id !== toCurrency.id)}
                placeholder="0.00"
              />
            </div>

            {/* Exchange Rate Display */}
            <div className="bg-muted/50 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Exchange Rate</span>
                <button
                  onClick={swapCurrencies}
                  className="p-2 rounded-lg bg-background hover:bg-muted text-foreground transition-colors"
                  type="button"
                  title="Swap currencies"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>
              <div className="text-lg font-semibold text-foreground">
                {isLoadingRate ? (
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                ) : (
                  <>1 {fromCurrency.symbol} = {exchangeRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {toCurrency.symbol}</>
                )}
              </div>
              {fromAmount && !isNaN(parseFloat(fromAmount)) && (
                <div className="text-sm text-muted-foreground mt-1">
                  You will receive: <span className="font-medium text-foreground">{toAmount} {toCurrency.symbol}</span>
                </div>
              )}
            </div>

            {/* To Currency */}
            <div>
              <Label className="text-sm font-medium">To Currency</Label>
              <Select 
                value={toCurrency.id} 
                onValueChange={(v) => {
                  const currency = currencies.find(c => c.id === v);
                  if (currency && currency.id !== fromCurrency.id) {
                    setToCurrency(currency);
                  }
                }}
              >
                <SelectTrigger className="mt-1.5 h-12 bg-background">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <img src={toCurrency.logo} alt={toCurrency.symbol} className="w-5 h-5 object-contain rounded-full" />
                      <span className="font-medium">{toCurrency.symbol}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {currencies
                    .filter(c => c.id !== fromCurrency.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <img src={c.logo} alt={c.symbol} className="w-5 h-5 object-contain rounded-full" />
                          <span className="font-medium">{c.symbol}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* To Amount (Read-only) */}
            <AmountWithCurrency
              label="You Will Receive"
              amount={toAmount || "0.00"}
              onAmountChange={() => {}} // Read-only
              currency={toCurrency}
              onCurrencyChange={(currency) => {
                if (currency.id !== fromCurrency.id) {
                  setToCurrency(currency);
                }
              }}
              currencies={currencies.filter(c => c.id !== fromCurrency.id)}
              placeholder="0.00"
              disabled={true}
            />
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border">
            <Button 
              onClick={handleConvert} 
              className="w-full h-12 bg-primary hover:bg-primary/90"
              disabled={!fromAmount || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Converting...
                </>
              ) : (
                "Convert"
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
