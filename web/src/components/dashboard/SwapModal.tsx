import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeftRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmountWithCurrency } from "@/components/ui/amount-with-currency";
import { getCurrencyById, type Currency } from "@/data/currencies";
import { toast } from "sonner";
import { xrplService } from "@/services/xrplService";
import { walletApi } from "@/services/api";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful swap (use to refresh dashboard balance, etc.) */
  onSwapSuccess?: () => void;
}

const SWAP_CURRENCIES: Currency[] = [
  getCurrencyById("xrp")!,
  getCurrencyById("rlusd")!,
].filter(Boolean);

export const SwapModal = ({ isOpen, onClose, onSwapSuccess }: SwapModalProps) => {
  const fromXrp = getCurrencyById("xrp")!;
  const fromRlusd = getCurrencyById("rlusd")!;

  const { isConnected, address } = useXRPLWallet();

  const [fromAmount, setFromAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState<Currency>(() => fromXrp);
  const [toCurrency, setToCurrency] = useState<Currency>(() => fromRlusd);
  const [rate, setRate] = useState<number | null>(null);
  const [rateNote, setRateNote] = useState("");
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [slippagePct, setSlippagePct] = useState<number>(0.5);
  const [xrplBalances, setXrplBalances] = useState<Array<{ currency: string; value: string }>>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  const parsedFrom = Number(fromAmount);
  const isXrpRlusd =
    (fromCurrency.id === "xrp" && toCurrency.id === "rlusd") ||
    (fromCurrency.id === "rlusd" && toCurrency.id === "xrp");
  const sameAsset = fromCurrency.id === toCurrency.id;
  const canSwapPair = !sameAsset && isXrpRlusd;

  const toAmount = useMemo(() => {
    if (!fromAmount || isNaN(parsedFrom) || parsedFrom <= 0) return "";
    const r = rate ?? 1;
    return (parsedFrom * r).toFixed(6);
  }, [fromAmount, parsedFrom, rate]);

  // Same list for both dropdowns so user can swap either direction
  const fromCurrencies = SWAP_CURRENCIES;
  const toCurrencies = SWAP_CURRENCIES;

  useEffect(() => {
    const fetchBalances = async () => {
      if (!isOpen) return;
      if (!isConnected || !address) {
        setXrplBalances([]);
        return;
      }
      try {
        setIsLoadingBalances(true);
        const bals = await xrplService.getAccountBalances(address, "Mainnet");
        setXrplBalances(bals.map((b) => ({ currency: xrplService.formatCurrency(b.currency), value: b.value })));
      } catch (e: any) {
        console.error("Failed to fetch XRPL balances:", e);
        setXrplBalances([]);
      } finally {
        setIsLoadingBalances(false);
      }
    };
    fetchBalances();
  }, [isOpen, isConnected, address]);

  const availableFrom = useMemo(() => {
    const symbol = fromCurrency.symbol.toUpperCase();
    const match = xrplBalances.find((b) => b.currency?.toUpperCase() === symbol);
    return match?.value ?? null;
  }, [fromCurrency.symbol, xrplBalances]);

  const availableTo = useMemo(() => {
    const symbol = toCurrency.symbol.toUpperCase();
    const match = xrplBalances.find((b) => b.currency?.toUpperCase() === symbol);
    return match?.value ?? null;
  }, [toCurrency.symbol, xrplBalances]);

  const formatBalance = (val: string | null) => {
    if (val == null) return "0";
    const num = Number(val);
    if (!isFinite(num)) return val;
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  useEffect(() => {
    const fetchRate = async () => {
      setRate(null);
      setRateNote("");
      if (!fromAmount || isNaN(parsedFrom) || parsedFrom <= 0) return;
      if (!canSwapPair) return;
      try {
        setIsLoadingRate(true);
        const fromSym = fromCurrency.symbol.toUpperCase();
        const toSym = toCurrency.symbol.toUpperCase();
        console.log("[SwapModal] getDexQuote call", { fromSym, toSym, amount: parsedFrom });
        const quote = await xrplService.getDexQuote(fromSym as any, toSym as any, parsedFrom);
        console.log("[SwapModal] getDexQuote result", quote);
        if (quote.rate > 0) {
          setRate(quote.rate);
        } else {
          setRate(null);
        }
        if (quote.note) setRateNote(quote.note);
        if (!quote.liquidityOk && !quote.note) setRateNote("Not enough liquidity for the full amount.");
      } catch (e: any) {
        console.error("[SwapModal] getDexQuote error", e?.message || e, e);
        setRate(null);
        setRateNote(e?.message || "Rate unavailable.");
      } finally {
        setIsLoadingRate(false);
      }
    };
    fetchRate();
  }, [fromCurrency.id, toCurrency.id, fromAmount, canSwapPair, parsedFrom]);

  const reset = () => {
    setFromAmount("");
    setFromCurrency(fromXrp);
    setToCurrency(fromRlusd);
    setRate(null);
    setRateNote("");
    setIsLoadingRate(false);
    setIsSwapping(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const swapDirection = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setFromAmount(toAmount || "");
    setRate(null);
    setRateNote("");
  };

  const handleFromCurrencyChange = (c: Currency) => {
    setFromCurrency(c);
    if (c.id === toCurrency.id) setToCurrency(SWAP_CURRENCIES.find((x) => x.id !== c.id) ?? toCurrency);
    setRate(null);
  };

  const handleToCurrencyChange = (c: Currency) => {
    setToCurrency(c);
    if (c.id === fromCurrency.id) setFromCurrency(SWAP_CURRENCIES.find((x) => x.id !== c.id) ?? fromCurrency);
    setRate(null);
  };

  const handleSwap = async () => {
    if (!fromAmount || isNaN(parsedFrom) || parsedFrom <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!isConnected || !address) {
      toast.error("Connect your wallet to swap.");
      return;
    }
    if (sameAsset) {
      toast.error("Select different assets to swap.");
      return;
    }
    if (!canSwapPair) {
      toast.error("This swap pair is not supported yet.");
      return;
    }
    if (!rate || !isFinite(rate) || rate <= 0) {
      toast.error("Quote unavailable. Try again.");
      return;
    }
    try {
      setIsSwapping(true);

      // Ensure trustline exists before XRP -> RLUSD
      if (fromCurrency.id === "xrp" && toCurrency.id === "rlusd") {
        const ok = await xrplService.ensureRlusdTrustline(address);
        if (!ok.ok) {
          toast.error(ok.reason || "RLUSD trustline is required.");
          return;
        }
      }

      const expectedOutNum = Number(toAmount);
      const res = await xrplService.createDexSwapOffer({
        fromAsset: fromCurrency.symbol.toUpperCase() as any,
        toAsset: toCurrency.symbol.toUpperCase() as any,
        fromAmount: parsedFrom,
        expectedOut: expectedOutNum,
        slippagePct,
      });

      if ((res as any)?.type === "reject") {
        toast.error("Swap cancelled in wallet.");
        return;
      }

      const txHash = (res as any)?.result?.hash;
      try {
        await walletApi.recordSwap({
          fromAsset: fromCurrency.symbol.toUpperCase(),
          toAsset: toCurrency.symbol.toUpperCase(),
          amountSwapped: parsedFrom,
          receivedAmount: expectedOutNum,
          txHash: txHash || undefined,
          walletAddress: address || undefined,
        });
      } catch (recordErr: any) {
        console.warn("Failed to record swap in database:", recordErr?.message);
      }

      toast.success(`Swap submitted. Check your wallet for confirmation.`);

      // Refresh balances in modal and trigger dashboard balance refresh
      try {
        const bals = await xrplService.getAccountBalances(address, "Mainnet");
        setXrplBalances(bals.map((b) => ({ currency: xrplService.formatCurrency(b.currency), value: b.value })));
      } catch {}
      onSwapSuccess?.();

      handleClose();
    } catch (e: any) {
      toast.error(e?.message || "Swap failed. Please try again.");
    } finally {
      setIsSwapping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
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
              onClick={handleClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AmountWithCurrency
              label="Swap from"
              amount={fromAmount}
              onAmountChange={setFromAmount}
              currency={fromCurrency}
              onCurrencyChange={handleFromCurrencyChange}
              currencies={fromCurrencies}
              placeholder="0.00"
            />
            <div className="flex items-center justify-between -mt-2">
              <p className="text-xs text-muted-foreground">
                {isConnected ? (
                  isLoadingBalances ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading balance…
                    </span>
                  ) : (
                    <>Available: {formatBalance(availableFrom)} {fromCurrency.symbol}</>
                  )
                ) : (
                  "Connect wallet to see balance"
                )}
              </p>
              {isConnected && availableFrom != null && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setFromAmount(String(availableFrom))}
                >
                  Max
                </button>
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={swapDirection}
                className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                title="Swap direction"
              >
                <ArrowLeftRight className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>

            <AmountWithCurrency
              label="Swap to"
              amount={toAmount}
              onAmountChange={() => {}}
              currency={toCurrency}
              onCurrencyChange={handleToCurrencyChange}
              currencies={toCurrencies}
              placeholder="0.00"
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Slippage</p>
              <select
                className="h-8 rounded-md border border-border bg-muted px-2 text-xs text-foreground"
                value={slippagePct}
                onChange={(e) => setSlippagePct(Number(e.target.value))}
              >
                <option value={0.5}>0.5%</option>
                <option value={1}>1%</option>
                <option value={2}>2%</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              {isConnected ? (
                isLoadingBalances ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading balance…
                  </span>
                ) : (
                  <>Available: {formatBalance(availableTo)} {toCurrency.symbol}</>
                )
              ) : (
                "Connect wallet to see balance"
              )}
            </p>

            {fromAmount && parseFloat(fromAmount) > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs text-muted-foreground mb-1">You will receive (approx.)</p>
                <p className="text-lg font-semibold text-foreground">
                  {isLoadingRate ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Calculating…
                    </span>
                  ) : (
                    `~${toAmount} ${toCurrency.symbol}`
                  )}
                </p>
                {rateNote && (
                  <p className="text-xs text-muted-foreground mt-1">{rateNote}</p>
                )}
                {canSwapPair && rate != null && !rateNote && (
                  <p className="text-xs text-muted-foreground mt-1">Quote from XRPL DEX order book. You’ll confirm in your wallet.</p>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-border">
            {sameAsset && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Select different assets to swap.</p>
            )}
            <Button
              onClick={handleSwap}
              disabled={isSwapping || !canSwapPair || sameAsset}
              className="w-full h-12"
            >
              {isSwapping ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Swapping…
                </span>
              ) : (
                `Swap ${fromCurrency.symbol} → ${toCurrency.symbol}`
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
