import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  Loader2,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
  Building2,
  ChevronLeft,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import {
  walletApi,
  paymentMethodApi,
  PaymentMethod as ApiPaymentMethod,
  type RlusdPayoutResponse,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exchangeRates, getCurrencyById, SEND_RECEIVE_CURRENCIES } from "@/data/currencies";
import { SUPPORTED_ASSETS } from "@/data/supportedAssets";
import { AddPaymentMethodModal } from "@/components/dashboard/AddPaymentMethodModal";

interface ExchangeOfframpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PAYOUT_CURRENCY_MAP: Record<string, string> = { ugx: "UGX", kes: "KES", tzs: "TZS" };

/**
 * XRPL is the only supported offramp asset settled on a custody account
 * that the user can fund from an exchange (deposit address + destination tag).
 * Base/EVM settlement has no destination tag, so this no-wallet flow is XRPL-only.
 */
const OFFRAMP_ASSET =
  SUPPORTED_ASSETS.find((a) => a.chain === "xrpl" && a.code === "RLUSD") ??
  SUPPORTED_ASSETS.find((a) => a.chain === "xrpl")!;

/** Copy-to-clipboard button used for the address and the destination tag. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(`${label} copied`);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
      title={`Copy ${label}`}
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export const ExchangeOfframpModal = ({ isOpen, onClose, onSuccess }: ExchangeOfframpModalProps) => {
  const { user } = useAuth();

  const [payoutCurrencyId, setPayoutCurrencyId] = useState<string>("ugx");
  const payoutCurrency = PAYOUT_CURRENCY_MAP[payoutCurrencyId] || user?.currency || "UGX";
  const payoutCurrencyInfo = getCurrencyById(payoutCurrencyId);

  const [amount, setAmount] = useState("");
  const [fiatAmount, setFiatAmount] = useState("");
  const [receiverType, setReceiverType] = useState<"saved" | "onetime">("saved");
  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [addPaymentMethodOpen, setAddPaymentMethodOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [instructions, setInstructions] = useState<RlusdPayoutResponse | null>(null);

  const payoutCurrencyKey = payoutCurrency.toLowerCase();
  const rate =
    exchangeRates[OFFRAMP_ASSET.rateKey]?.[payoutCurrencyKey] ??
    exchangeRates[OFFRAMP_ASSET.rateKey]?.["ugx"] ??
    3720;

  // Recipient receives net of 1% fee, converted to fiat
  useEffect(() => {
    if (amount && !isNaN(parseFloat(amount)) && rate > 0) {
      const num = parseFloat(amount);
      const net = num - num * 0.01;
      setFiatAmount((net * rate).toFixed(2));
    } else {
      setFiatAmount("");
    }
  }, [amount, rate]);

  useEffect(() => {
    if (isOpen) fetchPaymentMethods();
  }, [isOpen]);

  useEffect(() => {
    if (selectedPaymentMethod && receiverType === "saved") {
      const pm = paymentMethods.find((p) => p.id === selectedPaymentMethod);
      if (pm) setRecipient(pm.phone_number || "");
    }
  }, [selectedPaymentMethod, paymentMethods, receiverType]);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoadingPaymentMethods(true);
      const response = await paymentMethodApi.getUserPaymentMethods("MOBILE");
      if (response.data) setPaymentMethods(response.data);
    } catch (error) {
      console.error("Failed to fetch payment methods:", error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }
    if (receiverType === "saved" && !selectedPaymentMethod) {
      newErrors.recipient = "Please select a payment method";
    } else if (receiverType === "onetime" && !recipient) {
      newErrors.recipient = "Please enter recipient phone";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsLoading(true);
    try {
      const accountNumber =
        receiverType === "saved" && selectedPaymentMethod
          ? paymentMethods.find((pm) => pm.id === selectedPaymentMethod)?.phone_number || recipient
          : recipient.replace(/\s/g, "").replace(/\D/g, "");

      const selectedPm = selectedPaymentMethod
        ? paymentMethods.find((pm) => pm.id === selectedPaymentMethod)
        : undefined;

      const response = await walletApi.createPayoutRequest({
        amount: parseFloat(amount),
        fiat_amount: parseFloat(fiatAmount),
        payment_mode: "MOBILE",
        currency: payoutCurrency,
        account_number: accountNumber,
        network: receiverType === "saved" ? (selectedPm as any)?.network : undefined,
        payment_method_id: selectedPaymentMethod || undefined,
        narration: `${OFFRAMP_ASSET.code} offramp (exchange deposit)`,
        chain: "xrpl",
        asset: OFFRAMP_ASSET.code,
      });

      const data = response.data;
      if (data?.xrpl_destination && data?.memo) {
        setInstructions(data);
      } else {
        toast.error(response.message || "Could not create deposit instructions");
      }
    } catch (error: any) {
      console.error("Exchange offramp error:", error);
      toast.error(error?.message || "Could not create deposit instructions");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setAmount("");
    setFiatAmount("");
    setReceiverType("saved");
    setSelectedPaymentMethod("");
    setRecipient("");
    setErrors({});
    setInstructions(null);
    onClose();
  };

  const handleDone = () => {
    onSuccess?.();
    resetAndClose();
  };

  if (!isOpen) return null;

  const sendAmount = instructions
    ? Number(instructions.amount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })
    : "";

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
              {instructions && (
                <button
                  onClick={() => setInstructions(null)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold text-foreground">Cash out from an exchange</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No wallet needed — withdraw from Binance to a deposit address + tag
                </p>
              </div>
            </div>
            <button
              onClick={resetAndClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {!instructions ? (
              <div className="p-6 space-y-5">
                <div className="p-3 bg-muted/50 border border-border rounded-lg flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Have {OFFRAMP_ASSET.code} on Binance or another exchange? Enter how much you
                    want to cash out and where to receive the money. We'll show you a deposit
                    address and a destination tag — withdraw on the <strong>XRP Ledger</strong> and
                    your mobile money payout is sent automatically once it arrives.
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Receive in (currency)</Label>
                  <Select value={payoutCurrencyId} onValueChange={setPayoutCurrencyId}>
                    <SelectTrigger className="mt-1.5 h-11 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEND_RECEIVE_CURRENCIES.map((id) => {
                        const c = getCurrencyById(id);
                        if (!c) return null;
                        return (
                          <SelectItem key={id} value={id}>
                            <span className="flex items-center gap-2">
                              <img src={c.logo} alt={c.symbol} className="w-5 h-4 object-contain rounded" />
                              {c.symbol}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Amount ({OFFRAMP_ASSET.code})</Label>
                  <div className="flex h-12 rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (errors.amount) setErrors({ ...errors, amount: "" });
                      }}
                      placeholder="0.00"
                      className="h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                    />
                    <div className="flex items-center border-l border-input bg-muted/50 px-3">
                      <span className="text-sm font-medium text-muted-foreground">{OFFRAMP_ASSET.code}</span>
                    </div>
                  </div>
                  {errors.amount && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errors.amount}
                    </p>
                  )}
                </div>

                {fiatAmount && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">You receive</p>
                        <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                          {payoutCurrencyInfo?.logo && (
                            <img src={payoutCurrencyInfo.logo} alt={payoutCurrency} className="w-6 h-5 object-contain rounded" />
                          )}
                          {fiatAmount} {payoutCurrency}
                        </p>
                      </div>
                      <ArrowRight className="w-6 h-6 text-primary" />
                    </div>
                    <div className="mt-3 pt-3 border-t border-primary/20 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">You deposit:</span>
                        <span>{amount} {OFFRAMP_ASSET.code}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Fee (1%):</span>
                        <span>{(parseFloat(amount) * 0.01).toFixed(6)} {OFFRAMP_ASSET.code}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Rate:</span>
                        <span>1 {OFFRAMP_ASSET.code} = {rate.toFixed(2)} {payoutCurrency}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium mb-2">Payout to</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReceiverType("saved");
                        setSelectedPaymentMethod("");
                        setRecipient("");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        receiverType === "saved"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Saved Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiverType("onetime");
                        setSelectedPaymentMethod("");
                        setRecipient("");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        receiverType === "onetime"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      New Number
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="text-sm text-primary hover:underline block"
                  onClick={() => setAddPaymentMethodOpen(true)}
                >
                  Add new payment method
                </button>

                {receiverType === "saved" && (
                  <div>
                    <Label className="text-sm font-medium">Select Payment Method</Label>
                    <Select
                      value={selectedPaymentMethod || undefined}
                      onValueChange={(v) => {
                        setSelectedPaymentMethod(v);
                        if (errors.recipient) setErrors({ ...errors, recipient: "" });
                      }}
                    >
                      <SelectTrigger className="mt-1.5 h-12 bg-background">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {isLoadingPaymentMethods ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                        ) : paymentMethods.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No saved payment methods
                          </div>
                        ) : (
                          paymentMethods.map((pm) => (
                            <SelectItem key={pm.id} value={pm.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{pm.account_name}</span>
                                <span className="text-xs text-muted-foreground">{pm.phone_number}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.recipient && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.recipient}
                      </p>
                    )}
                  </div>
                )}

                {receiverType === "onetime" && (
                  <div>
                    <Label className="text-sm font-medium">Phone Number</Label>
                    <PhoneInput
                      value={recipient}
                      onChange={(value) => {
                        setRecipient(value || "");
                        if (errors.recipient) setErrors({ ...errors, recipient: "" });
                      }}
                      defaultCountry="UG"
                      className="mt-1.5"
                    />
                    {errors.recipient && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.recipient}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Deposit instructions with QR codes */
              <div className="p-6 space-y-5">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    Withdraw <strong>exactly {sendAmount} {OFFRAMP_ASSET.code}</strong> on the{" "}
                    <strong>XRP Ledger (XRPL)</strong>. You <strong>must</strong> include the
                    destination tag below or the transfer cannot be matched to your payout.
                  </p>
                </div>

                {/* Send amount */}
                <div className="rounded-lg border border-border p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount to withdraw</p>
                    <p className="text-xl font-bold">
                      {sendAmount} {OFFRAMP_ASSET.code}
                    </p>
                  </div>
                  <CopyButton value={String(instructions.amount)} label="Amount" />
                </div>

                {/* Deposit address */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Deposit address (XRPL)</Label>
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-white p-4">
                    <QRCodeSVG value={instructions.xrpl_destination!} size={160} level="M" includeMargin />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                    <code className="text-xs font-mono break-all flex-1 select-all">
                      {instructions.xrpl_destination}
                    </code>
                    <CopyButton value={instructions.xrpl_destination!} label="Address" />
                  </div>
                </div>

                {/* Destination tag */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Destination tag (required)</Label>
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-white p-4">
                    <QRCodeSVG value={instructions.memo!} size={120} level="M" includeMargin />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                    <code className="text-base font-mono font-bold tracking-widest flex-1 select-all">
                      {instructions.memo}
                    </code>
                    <CopyButton value={instructions.memo!} label="Tag" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    On Binance this is the field labelled <strong>"Tag"</strong> or{" "}
                    <strong>"Memo"</strong> on the XRP withdrawal screen.
                  </p>
                </div>

                {/* Payout summary */}
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">You'll receive</span>
                    <span className="font-semibold flex items-center gap-1.5">
                      {payoutCurrencyInfo?.logo && (
                        <img src={payoutCurrencyInfo.logo} alt={payoutCurrency} className="w-5 h-4 object-contain rounded" />
                      )}
                      {fiatAmount} {payoutCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">To</span>
                    <span className="font-medium">{recipient}</span>
                  </div>
                  {instructions.expires_in_seconds ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Valid for
                      </span>
                      <span className="font-medium">
                        {Math.round(instructions.expires_in_seconds / 60)} min
                      </span>
                    </div>
                  ) : null}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Once your withdrawal is confirmed on the XRP Ledger, {fiatAmount} {payoutCurrency} is
                  sent to {recipient} automatically. You can close this window.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border">
            {!instructions ? (
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !amount}
                className="w-full h-12 bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  "Get deposit address"
                )}
              </Button>
            ) : (
              <Button onClick={handleDone} className="w-full h-12 bg-primary hover:bg-primary/90">
                Done
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      <AddPaymentMethodModal
        open={addPaymentMethodOpen}
        onOpenChange={setAddPaymentMethodOpen}
        onSuccess={fetchPaymentMethods}
      />
    </AnimatePresence>
  );
};
