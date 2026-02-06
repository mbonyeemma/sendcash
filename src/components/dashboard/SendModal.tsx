import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle, Smartphone, Wallet, ChevronLeft, Plus, ArrowRight, Send, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { walletApi, paymentMethodApi, PaymentMethod as ApiPaymentMethod } from "@/services/api";
import { xrplService } from "@/services/xrplService";
import { cryptoCurrencies, fiatCurrencies, Currency, exchangeRates, getCurrencyById, SEND_RECEIVE_CURRENCIES } from "@/data/currencies";
import { useAuth } from "@/contexts/AuthContext";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AmountWithCurrency } from "@/components/ui/amount-with-currency";
import { Badge } from "@/components/ui/badge";
import { AssetAmountItem } from "@/components/dashboard/AmountItem";
import { loadFavorites, saveFavorites, type XrplFavorite } from "@/components/dashboard/SendCryptoModal";
import { AddPaymentMethodModal } from "@/components/dashboard/AddPaymentMethodModal";
import { AddXRPLAddressModal } from "@/components/dashboard/AddXRPLAddressModal";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Payout currency from home dropdown: ugx, kes, tzs */
  initialPayoutCurrency?: string;
}

interface SavedContact {
  id: string;
  name: string;
  phone: string;
  network?: string;
}

type SendMode = "" | "offramp" | "crypto";
type CryptoAsset = "XRP" | "RLUSD";

const calculateFee = (amount: number): number => {
  return amount * 0.01; // 1% fee for all RLUSD offramp
};

const PAYOUT_CURRENCY_MAP: Record<string, string> = { ugx: "UGX", kes: "KES", tzs: "TZS" };

export const SendModal = ({ isOpen, onClose, onSuccess }: SendModalProps) => {
  const { user } = useAuth();
  const { isConnected, address, connectWallet, network: xrplNetwork } = useXRPLWallet();
  const userCurrency = user?.currency || "UGX";

  const [payoutCurrencyId, setPayoutCurrencyId] = useState<string>("ugx");
  const payoutCurrency = PAYOUT_CURRENCY_MAP[payoutCurrencyId] || userCurrency;
  const payoutCurrencyInfo = getCurrencyById(payoutCurrencyId);

  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [addPaymentMethodOpen, setAddPaymentMethodOpen] = useState(false);
  const [receiverType, setReceiverType] = useState<"saved" | "onetime">("saved");
  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [rlusdAmount, setRlusdAmount] = useState("");
  const [fiatAmount, setFiatAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const sendCancelledRef = useRef(false);
  const SEND_TIMEOUT_MS = 90000; // 90s – user may need time to approve in GemWallet

  // Send mode: "" = choose offramp vs crypto, "offramp" = mobile/bank, "crypto" = XRP/RLUSD to address
  const [sendMode, setSendMode] = useState<SendMode>("");
  // Crypto send (XRP/RLUSD to XRPL address)
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAsset>("RLUSD");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [favorites, setFavorites] = useState<XrplFavorite[]>([]);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string>("");
  const [customAddress, setCustomAddress] = useState("");
  const [useCustomAddress, setUseCustomAddress] = useState(false);
  const [cryptoShowPreview, setCryptoShowPreview] = useState(false);
  const [saveAddressModalOpen, setSaveAddressModalOpen] = useState(false);
  const [saveAddressInitialAddress, setSaveAddressInitialAddress] = useState("");

  const payoutCurrencyKey = payoutCurrency.toLowerCase();
  const rate = exchangeRates["rlusd"]?.[payoutCurrencyKey] ?? exchangeRates["rlusd"]?.["ugx"] ?? 3720;

  // Calculate fiat (UGX/KES/TZS) when RLUSD changes
  useEffect(() => {
    if (rlusdAmount && !isNaN(parseFloat(rlusdAmount)) && rate > 0) {
      const rlusdNum = parseFloat(rlusdAmount);
      const fee = rlusdNum * 0.01; // 1% fee
      const netAmount = rlusdNum - fee;
      const value = (netAmount * rate).toFixed(2);
      setFiatAmount(value);
    } else {
      setFiatAmount("");
    }
  }, [rlusdAmount, rate]);

  // Fetch payment methods when offramp is shown (mobile money only)
  useEffect(() => {
    if (isOpen && sendMode === "offramp") {
      fetchPaymentMethods("MOBILE");
    }
  }, [isOpen, sendMode]);

  // Load favorites when crypto send mode is active
  useEffect(() => {
    if (isOpen && sendMode === "crypto") {
      setFavorites(loadFavorites());
    }
  }, [isOpen, sendMode]);

  const cryptoDestinationAddress = useCustomAddress
    ? customAddress.trim()
    : favorites.find((f) => f.id === selectedFavoriteId)?.address?.trim() || "";
  const cryptoCanPreview =
    isConnected &&
    parseFloat(cryptoAmount) > 0 &&
    cryptoDestinationAddress.length >= 25 &&
    (cryptoAsset === "XRP" || cryptoAsset === "RLUSD");

  // Auto-populate recipient from selected payment method
  useEffect(() => {
    if (selectedPaymentMethod && receiverType === "saved") {
      const pm = paymentMethods.find(p => p.id === selectedPaymentMethod);
      if (pm) setRecipient(pm.phone_number || "");
    }
  }, [selectedPaymentMethod, paymentMethods, receiverType]);

  const fetchPaymentMethods = async (paymentType: "MOBILE" | "BANK" = "MOBILE") => {
    try {
      setIsLoadingPaymentMethods(true);
      const response = await paymentMethodApi.getUserPaymentMethods(paymentType);
      if (response.data) {
        setPaymentMethods(response.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch payment methods:", error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };


  useEffect(() => {
    if (selectedPaymentMethod) {
      const pm = paymentMethods.find(p => p.id === selectedPaymentMethod);
      if (pm) {
        setRecipient(pm.phone_number || "");
        setRecipientName(pm.account_name || "");
      }
    } else {
      setRecipient("");
      setRecipientName("");
    }
  }, [selectedPaymentMethod, paymentMethods]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!rlusdAmount || parseFloat(rlusdAmount) <= 0) {
      newErrors.rlusdAmount = "Please enter a valid RLUSD amount";
    }
    if (receiverType === "saved" && !selectedPaymentMethod) {
      newErrors.recipient = "Please select a payment method";
    } else if (receiverType === "onetime" && !recipient) {
      newErrors.recipient = "Please enter recipient phone";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSend = async () => {
    // Check if wallet is connected
    if (!isConnected) {
      toast.error("Please connect your XRPL wallet first");
      try {
        await connectWallet();
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
      return;
    }

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!showPreview) {
      setShowPreview(true);
      return;
    }

    sendCancelledRef.current = false;
    setIsLoading(true);

    try {
      const accountNumber = receiverType === "saved" && selectedPaymentMethod
        ? paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.phone_number || recipient
        : recipient.replace(/\s/g, "").replace(/\D/g, "");

      // Network is auto-detected; for saved payment methods we pass the stored network if available
      const selectedPm = selectedPaymentMethod ? paymentMethods.find(pm => pm.id === selectedPaymentMethod) : undefined;
      const autoNetwork = receiverType === "saved" ? (selectedPm as any)?.network : undefined;

      // 1) Create payout request – backend returns XRPL address + memo (numeric)
      const payoutPayload = {
        amount: parseFloat(rlusdAmount),
        fiat_amount: parseFloat(fiatAmount),
        payment_mode: "MOBILE",
        currency: payoutCurrency,
        account_number: accountNumber,
        network: autoNetwork || undefined,
        payment_method_id: selectedPaymentMethod || undefined,
        narration: "RLUSD offramp",
      };
      const response = await walletApi.createPayoutRequest(payoutPayload);
      const data = response.data as { xrpl_destination: string; memo: string; amount: number };
      if (!data?.xrpl_destination || !data?.memo) {
        toast.error(response.message || "Invalid payout response");
        return;
      }

      // 2) Open GemWallet: send RLUSD to custody address with memo (race with timeout so we don't hang)
      const issuer = xrplService.getRLUSDIssuer("Mainnet");
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("SEND_TIMEOUT")), SEND_TIMEOUT_MS);
      });
      const sendResult = await Promise.race([
        xrplService.sendPayment(
          data.xrpl_destination,
          String(data.amount),
          "RLUSD",
          issuer,
          data.memo
        ),
        timeoutPromise,
      ]) as { type?: string; result?: { hash?: string } } | undefined;

      if (sendCancelledRef.current) return;

      if (sendResult?.type === "reject") {
        toast.error("Transaction cancelled in GemWallet.");
        return;
      }
      if (sendResult?.type === "response" && sendResult?.result?.hash) {
        toast.success(`Sent ${rlusdAmount} RLUSD. Once confirmed on XRPL, ${fiatAmount} ${payoutCurrency} will be sent to the recipient.`);
        resetAndClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error("Unexpected response from wallet. Please try again.");
      }
    } catch (error: any) {
      if (sendCancelledRef.current) return;
      console.error("Send error:", error);
      if (error?.message === "SEND_TIMEOUT") {
        toast.error("Request timed out. If GemWallet showed an error, try again or refresh the extension. If you approved, check your transaction history.");
      } else {
        toast.error(error?.message || "Failed to complete transaction. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSend = () => {
    sendCancelledRef.current = true;
    setIsLoading(false);
    toast.info("Cancelled. If you already approved in GemWallet, the transaction may still go through.");
  };

  const resetAndClose = () => {
    setSendMode("");
    setRlusdAmount("");
    setFiatAmount("");
    setRecipient("");
    setRecipientName("");
    setSelectedPaymentMethod("");
    setReceiverType("saved");
    setErrors({});
    setShowPreview(false);
    setCryptoAsset("RLUSD");
    setCryptoAmount("");
    setSelectedFavoriteId("");
    setCustomAddress("");
    setUseCustomAddress(false);
    setCryptoShowPreview(false);
    setSaveAddressModalOpen(false);
    setSaveAddressInitialAddress("");
    onClose();
  };

  const handleCryptoSend = async () => {
    if (!isConnected) {
      toast.error("Connect your XRPL wallet first");
      try {
        await connectWallet();
      } catch (e) {
        console.error(e);
      }
      return;
    }
    if (!cryptoCanPreview) {
      toast.error("Enter amount and choose a destination address");
      return;
    }
    if (!cryptoShowPreview) {
      setCryptoShowPreview(true);
      return;
    }
    setIsLoading(true);
    try {
      const issuer =
        cryptoAsset === "RLUSD"
          ? xrplService.getRLUSDIssuer("Mainnet")
          : undefined;
      const result = (await xrplService.sendPayment(
        cryptoDestinationAddress,
        cryptoAmount,
        cryptoAsset,
        issuer
      )) as { type?: string; result?: { hash?: string } };
      if (result?.type === "reject") {
        toast.error("Transaction cancelled in wallet");
        return;
      }
      if (result?.type === "response" && result?.result?.hash) {
        toast.success(`Sent ${cryptoAmount} ${cryptoAsset}. Tx: ${result.result.hash.slice(0, 8)}...`);
        resetAndClose();
        onSuccess?.();
      } else {
        toast.error("Unexpected response from wallet");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = (newFav: XrplFavorite) => {
    const next = [...favorites, newFav];
    setFavorites(next);
    saveFavorites(next);
    setSelectedFavoriteId(newFav.id);
    setUseCustomAddress(false);
  };

  const removeFavorite = (id: string) => {
    const next = favorites.filter((f) => f.id !== id);
    setFavorites(next);
    saveFavorites(next);
    if (selectedFavoriteId === id) setSelectedFavoriteId("");
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
              {sendMode !== "" && (
                <button
                  onClick={() => {
                    if (sendMode === "crypto") {
                      setSendMode("");
                      setCryptoAmount("");
                      setSelectedFavoriteId("");
                      setCustomAddress("");
                      setUseCustomAddress(false);
                      setCryptoShowPreview(false);
                      setAddFavoriteLabel("");
                    } else {
                      setSendMode("");
                      setShowPreview(false);
                    }
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-xl font-bold text-foreground">Send</h2>
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
            {/* Send mode choice: offramp vs crypto */}
            {sendMode === "" && (
              <div className="p-6 space-y-5">
                <Label className="text-sm font-medium mb-3 block">How do you want to send?</Label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setSendMode("offramp")}
                    className="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">To mobile money</p>
                      <p className="text-xs text-muted-foreground mt-1">Send RLUSD, recipient gets fiat (UGX, KES, TZS)</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode("crypto")}
                    className="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">To XRPL address (XRP / RLUSD)</p>
                      <p className="text-xs text-muted-foreground mt-1">Send XRP or RLUSD to a wallet address or favorite</p>
                    </div>
                  </button>
                  <div
                    className="p-4 rounded-xl border border-border bg-muted/30 text-left flex items-start gap-3 cursor-not-allowed opacity-90"
                    aria-disabled="true"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Landmark className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        To bank
                        <Badge variant="secondary" className="text-xs font-normal">Coming soon</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Send RLUSD to a bank account</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Crypto send (XRP/RLUSD to address) */}
            {sendMode === "crypto" && (
              <div className="p-6 space-y-5">
                {!isConnected && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Wallet not connected</p>
                      <Button size="sm" variant="outline" className="mt-2" onClick={async () => { try { await connectWallet(); toast.success("Wallet connected"); } catch { toast.error("Failed to connect"); } }}>
                        <Wallet className="w-4 h-4 mr-1" /> Connect Wallet
                      </Button>
                    </div>
                  </div>
                )}
                {isConnected && (
                  <>
                    <AssetAmountItem
                      assetId={cryptoAsset}
                      onAssetChange={setCryptoAsset}
                      amount={cryptoAmount}
                      onAmountChange={setCryptoAmount}
                    />
                    <div>
                      <Label className="text-sm font-medium mb-2">Send to</Label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setUseCustomAddress(false)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${!useCustomAddress ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                          Favorites
                        </button>
                        <button type="button" onClick={() => setUseCustomAddress(true)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${useCustomAddress ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                          New address
                        </button>
                      </div>
                    </div>
                    {!useCustomAddress ? (
                      <div>
                        <Label className="text-sm font-medium">Select favorite</Label>
                        <Select value={selectedFavoriteId || undefined} onValueChange={setSelectedFavoriteId}>
                          <SelectTrigger className="mt-1.5 h-12 bg-background">
                            <SelectValue placeholder="Select saved address" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            {favorites.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">No saved addresses</div>
                            ) : (
                              favorites.map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium truncate">{f.label}</span>
                                    <span className="text-xs text-muted-foreground font-mono truncate">{f.address}</span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">XRPL address</Label>
                          <Input
                            value={customAddress}
                            onChange={(e) => setCustomAddress(e.target.value)}
                            placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                            className="mt-1.5 h-12 font-mono text-sm rounded-lg border border-input"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-11 gap-2"
                          onClick={() => {
                            setSaveAddressInitialAddress(customAddress.trim());
                            setSaveAddressModalOpen(true);
                          }}
                          disabled={customAddress.trim().length < 25}
                        >
                          <Plus className="w-4 h-4" /> Save to favorites
                        </Button>
                      </div>
                    )}
                    {!useCustomAddress && (
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={() => {
                          setSaveAddressInitialAddress("");
                          setSaveAddressModalOpen(true);
                        }}
                      >
                        Add new address
                      </button>
                    )}
                    {cryptoShowPreview && (
                      <div className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
                        <h3 className="text-base font-semibold text-foreground">Review</h3>
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-sm text-muted-foreground">Amount</span>
                            <span className="font-semibold tabular-nums">
                              {cryptoAsset === "XRP"
                                ? Number(cryptoAmount).toLocaleString(undefined, { maximumFractionDigits: 6 })
                                : Number(cryptoAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}{" "}
                              {cryptoAsset}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-sm text-muted-foreground shrink-0">To</span>
                            <span className="font-mono text-sm truncate max-w-[220px] text-right" title={cryptoDestinationAddress}>
                              {cryptoDestinationAddress}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Offramp: mobile money only */}
            {sendMode === "offramp" && (
              <>
            {!isConnected && (
              <div className="p-4 mx-6 mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">XRPL Wallet Not Connected</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Connect your wallet to send RLUSD. Recipient receives fiat via mobile money.
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          await connectWallet();
                          toast.success("Wallet connected!");
                        } catch (error: any) {
                          toast.error("Failed to connect wallet");
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="mt-2 h-8 text-xs"
                    >
                      <Wallet className="w-3 h-3 mr-1" />
                      Connect Wallet
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {isConnected && (
              <div className="p-4 mx-6 mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Wallet Connected</p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {address?.slice(0, 8)}...{address?.slice(-6)} • RLUSD transactions will use your wallet
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 space-y-5">
            {/* Offramp form: mobile money only */}
            {sendMode === "offramp" && !showPreview && (
              <div className="space-y-5">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm font-medium">RLUSD Offramp</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send RLUSD and recipient receives fiat via mobile money.
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Send to (currency)</Label>
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
                  <Label className="text-sm font-medium">Amount (RLUSD)</Label>
                  <div className="flex h-12 rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <Input
                      type="number"
                      value={rlusdAmount}
                      onChange={(e) => {
                        setRlusdAmount(e.target.value);
                        if (errors.rlusdAmount) setErrors({ ...errors, rlusdAmount: "" });
                      }}
                      placeholder="0.00"
                      className="h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                    />
                    <div className="flex items-center border-l border-input bg-muted/50 px-3">
                      <span className="text-sm font-medium text-muted-foreground">RLUSD</span>
                    </div>
                  </div>
                  {errors.rlusdAmount && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errors.rlusdAmount}
                    </p>
                  )}
                </div>

                {/* UGX Amount Display */}
                {fiatAmount && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Recipient gets</p>
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
                        <span className="text-muted-foreground">You send:</span>
                        <span>{rlusdAmount} RLUSD</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Fee (1%):</span>
                        <span>{(parseFloat(rlusdAmount) * 0.01).toFixed(6)} RLUSD</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Rate:</span>
                        <span className="flex items-center gap-1">
                          1 RLUSD = {rate.toFixed(2)}
                          {payoutCurrencyInfo?.logo && <img src={payoutCurrencyInfo.logo} alt="" className="w-4 h-3 object-contain rounded inline" />}
                          {payoutCurrency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Network Selection */}
                {/* Mobile network is auto-detected */}

                <div>
                  <Label className="text-sm font-medium mb-2">Payment From</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setReceiverType("saved"); setSelectedPaymentMethod(""); }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${receiverType === "saved" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      Saved Account
                    </button>
                    <button
                      onClick={() => { setReceiverType("onetime"); setSelectedPaymentMethod(""); }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${receiverType === "onetime" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      New Number
                    </button>
                  </div>
                </div>
                {receiverType === "saved" && (
                  <div>
                    <Label className="text-sm font-medium">Select Payment Method</Label>
                    <Select value={selectedPaymentMethod || undefined} onValueChange={(v) => { setSelectedPaymentMethod(v); if (errors.recipient) setErrors({ ...errors, recipient: "" }); }}>
                      <SelectTrigger className="mt-1.5 h-12 bg-background">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {isLoadingPaymentMethods ? <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div> : paymentMethods.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">No saved payment methods</div> :                           paymentMethods.map((pm) => (
                          <SelectItem key={pm.id} value={pm.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{pm.account_name}</span>
                              <span className="text-xs text-muted-foreground">{pm.phone_number}</span>
                              {pm.bank_address && (
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={pm.bank_address}>
                                  {pm.bank_address}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.recipient && <p className="text-sm text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-4 h-4" />{errors.recipient}</p>}
                  </div>
                )}
                <button type="button" className="text-sm text-primary hover:underline" onClick={() => setAddPaymentMethodOpen(true)}>
                  Add new payment method
                </button>
                {receiverType === "onetime" && (
                  <div>
                    <Label className="text-sm font-medium">Phone Number</Label>
                    <PhoneInput value={recipient} onChange={(value) => { setRecipient(value || ""); if (errors.recipient) setErrors({ ...errors, recipient: "" }); }} defaultCountry="UG" className="mt-1.5" />
                    {errors.recipient && <p className="text-sm text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-4 h-4" />{errors.recipient}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Preview */}
            {showPreview && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold">Review Transaction</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">You Send</span>
                    <span className="font-semibold text-lg">{rlusdAmount} RLUSD</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">They Receive</span>
                    <span className="font-semibold text-lg text-primary flex items-center gap-2">
                      {payoutCurrencyInfo?.logo && (
                        <img src={payoutCurrencyInfo.logo} alt={payoutCurrency} className="w-5 h-4 object-contain rounded" />
                      )}
                      {fiatAmount} {payoutCurrency}
                    </span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm text-muted-foreground">Fee (1%)</span>
                      <span className="text-sm font-medium">{(parseFloat(rlusdAmount) * 0.01).toFixed(6)} RLUSD</span>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Method</span>
                      <span className="text-sm font-medium">Mobile Money</span>
                    </div>
                    {recipient && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Recipient</span>
                        <span className="text-sm font-medium">{recipient}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
            </>
            )}

          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border">
            {sendMode === "crypto" && isConnected && (
              <>
                {!cryptoCanPreview && !cryptoShowPreview && (
                  <p className="text-xs text-muted-foreground px-6 pb-2 text-center">
                    Enter amount and select or add a destination address to continue.
                  </p>
                )}
                <Button
                  onClick={handleCryptoSend}
                  disabled={!cryptoCanPreview && !cryptoShowPreview}
                  className="w-full h-12 gap-2 bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : cryptoShowPreview ? (
                    <>
                      <Send className="w-5 h-5" />
                      Confirm & Send
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-5 h-5" />
                      Next
                    </>
                  )}
                </Button>
                {cryptoShowPreview && !isLoading && (
                  <Button variant="ghost" className="w-full mt-2" onClick={() => setCryptoShowPreview(false)}>
                    Back
                  </Button>
                )}
              </>
            )}
            {sendMode === "offramp" && (
              <>
            {!showPreview ? (
              <Button 
                onClick={handleSend} 
                className="w-full h-12 bg-primary hover:bg-primary/90"
                disabled={
                  isLoading ||
                  !rlusdAmount ||
                  !isConnected
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "Preview"
                )}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  className="flex-1 h-12"
                  disabled={isLoading}
                >
                  Back
                </Button>
                {isLoading ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancelSend}
                      className="flex-1 h-12 border-destructive text-destructive hover:bg-destructive/10"
                    >
                      Cancel
                    </Button>
                    <Button disabled className="flex-1 h-12 bg-primary/70 cursor-wait">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleSend}
                    className="flex-1 h-12 bg-primary hover:bg-primary/90"
                  >
                    Confirm & Send
                  </Button>
                )}
              </div>
            )}
            {showPreview && isLoading && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Check the GemWallet popup and approve, or click Cancel to stop.
              </p>
            )}
              </>
            )}
          </div>
        </motion.div>
      </div>
      <AddPaymentMethodModal
        open={addPaymentMethodOpen}
        onOpenChange={setAddPaymentMethodOpen}
        onSuccess={() => fetchPaymentMethods("MOBILE")}
      />
      <AddXRPLAddressModal
        open={saveAddressModalOpen}
        onOpenChange={setSaveAddressModalOpen}
        initialAddress={saveAddressInitialAddress}
        onSave={handleSaveAddress}
      />
    </AnimatePresence>
  );
};
