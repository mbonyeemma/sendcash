import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, AlertCircle, Smartphone, Building2, Wallet, ChevronLeft, Plus, ArrowRight, Star, Send } from "lucide-react";
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
import { loadFavorites, saveFavorites, type XrplFavorite } from "@/components/dashboard/SendCryptoModal";

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

const mobileNetworks = [
  { id: "mtn", name: "MTN Mobile Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/1200px-New-mtn-logo.svg.png" },
  { id: "airtel", name: "Airtel Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Airtel_Africa_logo.svg/1200px-Airtel_Africa_logo.svg.png" },
];

type SendMethod = "mobile" | "bank" | "";
type SendMode = "" | "offramp" | "crypto";
type CryptoAsset = "XRP" | "RLUSD";

const sendMethods = [
  { value: "mobile", label: "Mobile Money", description: "Send RLUSD as UGX", icon: Smartphone },
  { value: "bank", label: "Bank Transfer", description: "Send RLUSD as UGX", icon: Building2 },
];

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

  const [method, setMethod] = useState<SendMethod>("");
  const [network, setNetwork] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
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
  const [addFavoriteLabel, setAddFavoriteLabel] = useState("");

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

  // Fetch payment methods when modal opens and method changes
  useEffect(() => {
    if (isOpen && method) {
      const paymentType = method === "mobile" ? "MOBILE" : "BANK";
      fetchPaymentMethods(paymentType);
    }
  }, [isOpen, method]);

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

  // Auto-populate recipient info from selected payment method
  useEffect(() => {
    if (selectedPaymentMethod && receiverType === "saved") {
      const pm = paymentMethods.find(p => p.id === selectedPaymentMethod);
      if (pm) {
        if (method === "mobile") {
          setRecipient(pm.phone_number || "");
        } else if (method === "bank") {
          setBankAccount(pm.account_number || "");
          setBankName(pm.bank_name || "");
          setAccountHolder(pm.account_name || "");
        }
      }
    }
  }, [selectedPaymentMethod, paymentMethods, receiverType, method]);

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
      const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
      if (paymentMethod) {
        setRecipient(paymentMethod.phone_number || paymentMethod.account_number || "");
        setRecipientName(paymentMethod.account_name);
        // Try to infer network from payment method type or phone
        if (paymentMethod.type === "MOBILE" && paymentMethod.phone_number) {
          // You might want to add network detection logic here
        }
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

    if (method === "mobile") {
      if (!network) newErrors.network = "Please select a network";
      if (receiverType === "saved" && !selectedPaymentMethod) {
        newErrors.recipient = "Please select a beneficiary";
      } else if (receiverType === "onetime" && !recipient) {
        newErrors.recipient = "Please enter recipient phone";
      }
    } else if (method === "bank") {
      if (!bankAccount) newErrors.bankAccount = "Please enter account number";
      if (!bankName) newErrors.bankName = "Please select bank";
      if (!accountHolder) newErrors.accountHolder = "Please enter account holder name";
      if (receiverType === "saved" && !selectedPaymentMethod) {
        newErrors.recipient = "Please select a beneficiary";
      }
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
      let accountNumber = "";
      const paymentMode = method === "mobile" ? "MOBILE" : "BANK";
      if (method === "mobile") {
        accountNumber = receiverType === "saved" && selectedPaymentMethod
          ? paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.phone_number || recipient
          : recipient.replace(/\s/g, "");
      } else {
        accountNumber = bankAccount;
      }

      // 1) Create payout request – backend returns XRPL address + memo (numeric)
      const payoutPayload = {
        amount: parseFloat(rlusdAmount),
        fiat_amount: parseFloat(fiatAmount),
        payment_mode: paymentMode,
        account_number: accountNumber,
        bank_name: bankName || undefined,
        account_holder_name: accountHolder || undefined,
        network: network || undefined,
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
      const issuer = xrplService.getRLUSDIssuer(xrplNetwork === "Testnet" ? "Testnet" : "Mainnet");
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
    setMethod("");
    setRlusdAmount("");
    setFiatAmount("");
    setNetwork("");
    setRecipient("");
    setRecipientName("");
    setBankAccount("");
    setBankName("");
    setAccountHolder("");
    setSelectedPaymentMethod("");
    setShowAddPaymentMethod(false);
    setReceiverType("saved");
    setErrors({});
    setShowPreview(false);
    setCryptoAsset("RLUSD");
    setCryptoAmount("");
    setSelectedFavoriteId("");
    setCustomAddress("");
    setUseCustomAddress(false);
    setCryptoShowPreview(false);
    setAddFavoriteLabel("");
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
          ? xrplService.getRLUSDIssuer(xrplNetwork === "Testnet" ? "Testnet" : "Mainnet")
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

  const addCurrentAsFavorite = () => {
    if (!cryptoDestinationAddress || cryptoDestinationAddress.length < 25) {
      toast.error("Enter a valid XRPL address first");
      return;
    }
    const label = addFavoriteLabel.trim() || `Address ${cryptoDestinationAddress.slice(0, 8)}...`;
    const newFav: XrplFavorite = {
      id: `fav_${Date.now()}`,
      label,
      address: cryptoDestinationAddress,
    };
    const next = [...favorites, newFav];
    setFavorites(next);
    saveFavorites(next);
    setSelectedFavoriteId(newFav.id);
    setUseCustomAddress(false);
    setAddFavoriteLabel("");
    toast.success("Saved to favorites");
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
              {(sendMode !== "" || method) && (
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
                    } else if (method) {
                      setMethod("");
                      setShowPreview(false);
                    } else {
                      setSendMode("");
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
                      <p className="font-semibold text-foreground">To mobile money or bank</p>
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
                    <div>
                      <Label className="text-sm font-medium">Asset</Label>
                      <div className="flex gap-2 mt-1.5">
                        <button type="button" onClick={() => setCryptoAsset("XRP")} className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 ${cryptoAsset === "XRP" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground"}`}>
                          <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold">XRP</span> XRP
                        </button>
                        <button type="button" onClick={() => setCryptoAsset("RLUSD")} className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 ${cryptoAsset === "RLUSD" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground"}`}>
                          {getCurrencyById("rlusd")?.logo ? <img src={getCurrencyById("rlusd")?.logo} alt="RLUSD" className="w-6 h-5 object-contain rounded" /> : null} RLUSD
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Amount ({cryptoAsset})</Label>
                      <Input type="number" step={cryptoAsset === "XRP" ? "0.000001" : "0.01"} value={cryptoAmount} onChange={(e) => setCryptoAmount(e.target.value)} placeholder="0.00" className="mt-1.5 h-12" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2">Send to (favorites)</Label>
                      <div className="flex gap-2 mb-2">
                        <button type="button" onClick={() => setUseCustomAddress(false)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${!useCustomAddress ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Favorites</button>
                        <button type="button" onClick={() => setUseCustomAddress(true)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${useCustomAddress ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>New address</button>
                      </div>
                      {!useCustomAddress ? (
                        <div className="space-y-2">
                          {favorites.length === 0 ? <p className="text-sm text-muted-foreground py-2">No favorites. Add one via &quot;New address&quot; then save.</p> : favorites.map((f) => (
                            <div key={f.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${selectedFavoriteId === f.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`} onClick={() => setSelectedFavoriteId(f.id)}>
                              <div className="flex items-center gap-2 min-w-0">
                                <Star className="w-4 h-4 text-primary shrink-0" />
                                <div className="min-w-0"><p className="font-medium truncate">{f.label}</p><p className="text-xs text-muted-foreground font-mono truncate">{f.address}</p></div>
                              </div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); removeFavorite(f.id); }} className="text-destructive hover:bg-destructive/10 p-1 rounded">Remove</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" className="h-11 font-mono text-sm" />
                          <div className="flex gap-2">
                            <Input value={addFavoriteLabel} onChange={(e) => setAddFavoriteLabel(e.target.value)} placeholder="Label for favorite" className="h-10 flex-1" />
                            <Button type="button" variant="outline" size="sm" onClick={addCurrentAsFavorite} className="gap-1"><Plus className="w-4 h-4" /> Save</Button>
                          </div>
                        </div>
                      )}
                    </div>
                    {cryptoShowPreview && (
                      <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/30">
                        <h3 className="font-semibold">Review</h3>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-medium">{cryptoAmount} {cryptoAsset}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">To</span><span className="font-mono text-xs truncate max-w-[200px]">{cryptoDestinationAddress}</span></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Offramp: wallet alert + method selection */}
            {sendMode === "offramp" && (
              <>
            {!isConnected && (
              <div className="p-4 mx-6 mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">XRPL Wallet Not Connected</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Connect your GemWallet to send RLUSD. Mobile money and bank transfers will use the API.
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
            {/* Method Selection */}
            {!method && !showPreview && (
              <div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">RLUSD Offramp</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Send your RLUSD and recipient receives fiat via mobile money or bank transfer.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-5">
                  <Label className="text-sm font-medium">Send to (currency)</Label>
                  <Select value={payoutCurrencyId} onValueChange={setPayoutCurrencyId}>
                    <SelectTrigger className="mt-1.5 h-11 bg-muted">
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

                <Label className="text-sm font-medium mb-3 block">How should they receive?</Label>
                <div className="grid grid-cols-2 gap-3">
                  {sendMethods.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setMethod(m.value as SendMethod)}
                        className="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <p className="font-semibold text-foreground text-sm">{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mobile Money Offramp */}
            {method === "mobile" && !showPreview && (
              <div className="space-y-5">
                {/* RLUSD Amount */}
                <div>
                  <Label className="text-sm font-medium">Amount (RLUSD)</Label>
                  <Input
                    type="number"
                    value={rlusdAmount}
                    onChange={(e) => {
                      setRlusdAmount(e.target.value);
                      if (errors.rlusdAmount) setErrors({ ...errors, rlusdAmount: "" });
                    }}
                    placeholder="0.00"
                    className="mt-1.5 h-12"
                  />
                  {errors.rlusdAmount && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="w-4 h-4" />
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
                <div>
                  <Label className="text-sm font-medium">Mobile Network</Label>
                  <Select value={network} onValueChange={(v) => {
                    setNetwork(v);
                    if (errors.network) setErrors({ ...errors, network: "" });
                  }}>
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
                  {errors.network && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.network}
                    </p>
                  )}
                </div>

                {/* Receiver Type & Beneficiary for Mobile */}
                <div>
                  <Label className="text-sm font-medium mb-2">Send To</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setReceiverType("saved"); setSelectedPaymentMethod(""); }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${receiverType === "saved" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      Saved Beneficiary
                    </button>
                    <button
                      onClick={() => { setReceiverType("onetime"); setSelectedPaymentMethod(""); }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${receiverType === "onetime" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      New Recipient
                    </button>
                  </div>
                </div>
                {receiverType === "saved" && (
                  <div>
                    <Label className="text-sm font-medium">Select Beneficiary</Label>
                    <Select value={selectedPaymentMethod || undefined} onValueChange={(v) => { setSelectedPaymentMethod(v); if (errors.recipient) setErrors({ ...errors, recipient: "" }); }}>
                      <SelectTrigger className="mt-1.5 h-12 bg-background">
                        <SelectValue placeholder="Select beneficiary" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {isLoadingPaymentMethods ? <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div> : paymentMethods.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">No saved beneficiaries</div> : paymentMethods.map((pm) => (
                          <SelectItem key={pm.id} value={pm.id}>
                            <div className="flex flex-col"><span className="font-medium">{pm.account_name}</span><span className="text-xs text-muted-foreground">{pm.account_number}</span></div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.recipient && <p className="text-sm text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-4 h-4" />{errors.recipient}</p>}
                  </div>
                )}
                {receiverType === "onetime" && method === "mobile" && (
                  <div>
                    <Label className="text-sm font-medium">Recipient Phone</Label>
                    <Input value={recipient} onChange={(e) => { setRecipient(e.target.value); if (errors.recipient) setErrors({ ...errors, recipient: "" }); }} placeholder="e.g. 256700000000" className="mt-1.5 h-12" />
                    {errors.recipient && <p className="text-sm text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-4 h-4" />{errors.recipient}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Bank Transfer Offramp */}
            {method === "bank" && !showPreview && (
              <div className="space-y-5">
                {/* RLUSD Amount */}
                <div>
                  <Label className="text-sm font-medium">Amount (RLUSD)</Label>
                  <Input
                    type="number"
                    value={rlusdAmount}
                    onChange={(e) => {
                      setRlusdAmount(e.target.value);
                      if (errors.rlusdAmount) setErrors({ ...errors, rlusdAmount: "" });
                    }}
                    placeholder="0.00"
                    className="mt-1.5 h-12"
                  />
                  {errors.rlusdAmount && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="w-4 h-4" />
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

                {/* Receiver Type Toggle */}
                <div>
                  <Label className="text-sm font-medium mb-2">Send To</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setReceiverType("saved");
                        setSelectedPaymentMethod("");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        receiverType === "saved"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Saved Beneficiary
                    </button>
                    <button
                      onClick={() => {
                        setReceiverType("onetime");
                        setSelectedPaymentMethod("");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        receiverType === "onetime"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      New Recipient
                    </button>
                  </div>
                </div>

                {/* Saved Beneficiary */}
                {receiverType === "saved" && (
                  <div>
                    <Label className="text-sm font-medium">Select Beneficiary</Label>
                    <Select 
                      value={selectedPaymentMethod || undefined} 
                      onValueChange={(v) => {
                        setSelectedPaymentMethod(v);
                        if (errors.recipient) setErrors({ ...errors, recipient: "" });
                      }}
                    >
                      <SelectTrigger className="mt-1.5 h-12 bg-background">
                        <SelectValue placeholder="Select beneficiary" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {isLoadingPaymentMethods ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Loading...
                          </div>
                        ) : paymentMethods.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No saved beneficiaries
                          </div>
                        ) : (
                          paymentMethods.map((pm) => (
                            <SelectItem key={pm.id} value={pm.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{pm.account_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {pm.account_number}
                                </span>
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

                {/* Bank Details for New Recipient */}
                {receiverType === "onetime" && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Bank Name</Label>
                      <Select value={bankName} onValueChange={setBankName}>
                        <SelectTrigger className="mt-1.5 h-12">
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {["Equity Bank", "Stanbic Bank", "Centenary Bank", "DFCU Bank", "Bank of Uganda", "Absa Bank", "Bank of Africa", "Exim Bank", "KCB Bank", "GTBank"].map((bank) => (
                            <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.bankName && (
                        <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.bankName}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Account Number</Label>
                      <Input
                        value={bankAccount}
                        onChange={(e) => {
                          setBankAccount(e.target.value);
                          if (errors.bankAccount) setErrors({ ...errors, bankAccount: "" });
                        }}
                        placeholder="Enter account number"
                        className="mt-1.5 h-12"
                      />
                      {errors.bankAccount && (
                        <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.bankAccount}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Account Holder Name</Label>
                      <Input
                        value={accountHolder}
                        onChange={(e) => {
                          setAccountHolder(e.target.value);
                          if (errors.accountHolder) setErrors({ ...errors, accountHolder: "" });
                        }}
                        placeholder="Enter account holder name"
                        className="mt-1.5 h-12"
                      />
                      {errors.accountHolder && (
                        <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.accountHolder}
                        </p>
                      )}
                    </div>
                  </>
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
                      <span className="text-sm font-medium capitalize">{method === "mobile" ? "Mobile Money" : "Bank Transfer"}</span>
                    </div>
                    {method === "mobile" && network && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Network</span>
                        <span className="text-sm font-medium capitalize">{network}</span>
                      </div>
                    )}
                    {method === "mobile" && recipient && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Recipient</span>
                        <span className="text-sm font-medium">{recipient}</span>
                      </div>
                    )}
                    {method === "bank" && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Bank</span>
                          <span className="text-sm font-medium">{bankName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Account</span>
                          <span className="text-sm font-medium">{bankAccount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Holder</span>
                          <span className="text-sm font-medium">{accountHolder}</span>
                        </div>
                      </>
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
                <Button
                  onClick={handleCryptoSend}
                  disabled={!cryptoCanPreview && !cryptoShowPreview}
                  className="w-full h-12 gap-2"
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
                      <Send className="w-5 h-5" />
                      Preview & Send
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
                  !method || 
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
    </AnimatePresence>
  );
};
