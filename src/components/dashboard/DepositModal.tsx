import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Loader2, AlertCircle, ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { walletApi, paymentMethodApi, PaymentMethod as ApiPaymentMethod, type SupportedCurrency } from "@/services/api";
import type { DepositRequestResponse } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import { useEVMWallet } from "@/contexts/EVMWalletContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AmountItem, ReceiveAmountDisplay } from "@/components/dashboard/AmountItem";
import { AddPaymentMethodModal } from "@/components/dashboard/AddPaymentMethodModal";
import { ChainAssetPicker } from "@/components/dashboard/ChainAssetPicker";
import { getFiatRateForAsset } from "@/data/supportedAssets";
import { useSelectedChain } from "@/contexts/SelectedChainContext";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DepositModal = ({ isOpen, onClose, onSuccess }: DepositModalProps) => {
  const { user } = useAuth();
  const { isConnected, address, connectWallet } = useXRPLWallet();
  const { isConnected: evmConnected, address: evmAddress } = useEVMWallet();
  const [supportedCurrencies, setSupportedCurrencies] = useState<SupportedCurrency[]>([]);
  const [depositCurrencyId, setDepositCurrencyId] = useState<string>("");
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const selectedCurrency = supportedCurrencies.find((c) => c.id === depositCurrencyId);
  const { selectedChain, selectedAsset: receiveAsset, walletConnected, walletAddress } =
    useSelectedChain();
  const rate = getFiatRateForAsset(receiveAsset, selectedCurrency);
  const feePercent = selectedCurrency?.fee_percent ?? 0.5;
  const [phone, setPhone] = useState("");
  const [fiatAmount, setFiatAmount] = useState("");
  const [cryptoReceiveAmount, setCryptoReceiveAmount] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [receiverType, setReceiverType] = useState<"saved" | "onetime">("saved");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [payInInstructions, setPayInInstructions] = useState<DepositRequestResponse | null>(null);
  const [addPaymentMethodOpen, setAddPaymentMethodOpen] = useState(false);
  // When no wallet is connected, the user types the address to receive the crypto at
  const [manualAddress, setManualAddress] = useState("");

  // Address the crypto will be delivered to: connected wallet, else manually entered
  const effectiveAddress = (walletAddress || manualAddress).trim();
  const addrMinLen = selectedChain === "base" ? 42 : 25;
  const hasReceiveAddress = effectiveAddress.length >= addrMinLen;

  // Fetch supported currencies (rate/quote) when modal opens — public endpoint, no auth required
  useEffect(() => {
    if (!isOpen) return;
    setRatesError(null);
    setRatesLoading(true);
    walletApi
      .getSupportedCurrencies()
      .then((res) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setSupportedCurrencies(res.data);
          setDepositCurrencyId((id) => (id && res.data!.some((c) => c.id === id) ? id : res.data![0].id));
        } else {
          setRatesError("Could not load rates.");
        }
      })
      .catch((err) => {
        console.error("getSupportedCurrencies failed", err);
        setRatesError(err?.message || "Could not load rates. Try again.");
      })
      .finally(() => setRatesLoading(false));
  }, [isOpen]);

  // Calculate crypto amount when fiat changes
  useEffect(() => {
    if (fiatAmount && !isNaN(parseFloat(fiatAmount)) && rate > 0) {
      const fiatNum = parseFloat(fiatAmount);
      const fee = fiatNum * (feePercent / 100);
      const netFiat = fiatNum - fee;
      const cryptoVal = (netFiat / rate).toFixed(6);
      setCryptoReceiveAmount(cryptoVal);
    } else {
      setCryptoReceiveAmount("");
    }
  }, [fiatAmount, rate, feePercent]);

  // Fetch payment methods when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
    }
  }, [isOpen]);

  // Auto-populate phone from selected payment method
  useEffect(() => {
    if (selectedPaymentMethod && receiverType === "saved") {
      const pm = paymentMethods.find(p => p.id === selectedPaymentMethod);
      if (pm) {
        setPhone(pm.phone_number || "");
      }
    } else {
      setPhone("");
    }
  }, [selectedPaymentMethod, paymentMethods, receiverType]);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoadingPaymentMethods(true);
      const response = await paymentMethodApi.getUserPaymentMethods("MOBILE");
      if (response.data) {
        setPaymentMethods(response.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch payment methods:", error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!fiatAmount || parseFloat(fiatAmount) <= 0) {
      newErrors.fiatAmount = "Please enter a valid amount";
    }
    if (receiverType === "saved" && !selectedPaymentMethod) {
      newErrors.payment = "Please select a payment method";
    } else if (receiverType === "onetime" && !phone) {
      newErrors.phone = "Please enter phone number";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDeposit = async () => {
    if (!receiveAsset?.supportsFiatOnramp) {
      toast.error("Onramp to this asset is not available yet.");
      return;
    }
    if (!hasReceiveAddress) {
      toast.error(`Enter a valid ${selectedChain === "base" ? "Base" : "XRPL"} address to receive ${receiveAsset?.code ?? "crypto"}`);
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

    setIsLoading(true);
    setPayInInstructions(null);

    try {
      const phoneNumber = receiverType === "saved" && selectedPaymentMethod
        ? paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.phone_number || phone
        : phone.replace(/\s/g, "").replace(/\D/g, "");

      const cryptoAmt = parseFloat(cryptoReceiveAmount) || undefined;
      const response = await walletApi.depositRequest({
        amount: fiatAmount,
        currency: selectedCurrency?.symbol ?? "",
        account_number: phoneNumber,
        destination_address: effectiveAddress,
        amount_crypto: cryptoAmt,
        amount_rlusd: selectedChain === "xrpl" ? cryptoAmt : undefined,
        asset: receiveAsset?.code,
        chain: selectedChain,
      });

      const data = response.data as DepositRequestResponse;
      if (response.status === 200 && data?.phone) {
        setPayInInstructions(data);
        toast.success("A popup has been sent to your phone. Please approve it.");
      } else {
        toast.error(response.message || "Deposit request failed");
      }
    } catch (error: any) {
      console.error("Deposit error:", error);
      toast.error(error.message || "Deposit request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setPhone("");
    setFiatAmount("");
    setCryptoReceiveAmount("");
    setSelectedPaymentMethod("");
    setReceiverType("saved");
    setErrors({});
    setShowPreview(false);
    setPayInInstructions(null);
    setManualAddress("");
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
              <p className="text-xs text-muted-foreground mt-0.5">
                Pay with mobile money, receive crypto at your wallet address
              </p>
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
            {/* After depositRequest: mobile money popup sent to user's phone */}
            {payInInstructions ? (
              <div className="p-6 space-y-5">
                <h3 className="text-lg font-semibold">Approve on your phone</h3>
                <p className="text-sm text-muted-foreground">
                  A payment request has been sent to your mobile money number. Please check your phone and approve the popup to complete the payment.
                </p>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="font-bold text-lg flex items-center gap-2">
                      {selectedCurrency?.logo && <img src={selectedCurrency.logo} alt={selectedCurrency.symbol} className="w-5 h-4 object-contain rounded" />}
                      {payInInstructions.amount_ugx} {selectedCurrency?.symbol ?? ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Sent to your phone: </span>
                    <span className="text-sm font-semibold text-foreground">{payInInstructions.phone}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Once you approve, you will receive {payInInstructions.amount_crypto ?? payInInstructions.amount_usdc ?? payInInstructions.amount_rlusd}{" "}
                  {payInInstructions.asset ?? receiveAsset?.code ?? "crypto"} at your wallet address.
                </p>
              </div>
            ) : walletConnected ? (
              <div className="p-4 mx-6 mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Wallet Connected</p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {receiveAsset?.code} will be sent to: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Supported regions notice */}
            {!payInInstructions && (
              <div className="p-3 mx-6 mt-3 bg-muted/50 border border-border rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Supported regions:</strong> Mobile money deposits are currently available for Uganda (+256) phone numbers only. More regions coming soon.
                </p>
              </div>
            )}

            {!payInInstructions && !showPreview ? (
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-sm font-medium mb-2">Receive on</p>
                  <ChainAssetPicker />
                </div>

                {!walletConnected && (
                  <div>
                    <Label className="text-sm font-medium">
                      {selectedChain === "base" ? "Base" : "XRPL"} address to receive {receiveAsset?.code ?? "crypto"}
                    </Label>
                    <Input
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder={selectedChain === "base" ? "0x0000000000000000000000000000000000000000" : "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"}
                      className="mt-1.5 h-12 font-mono text-sm rounded-lg border border-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      No wallet connected — enter the address where you want to receive {receiveAsset?.code ?? "crypto"}.
                    </p>
                  </div>
                )}

                <AmountItem
                  currencyId={depositCurrencyId}
                  onCurrencyChange={setDepositCurrencyId}
                  amount={fiatAmount}
                  onAmountChange={setFiatAmount}
                  currencySymbol={selectedCurrency?.symbol ?? ""}
                  currencyLogo={selectedCurrency?.logo}
                  supportedCurrencies={supportedCurrencies.map((c) => ({ id: c.id, symbol: c.symbol, logo: c.logo }))}
                  amountError={errors.fiatAmount}
                  onClearAmountError={() => errors.fiatAmount && setErrors({ ...errors, fiatAmount: "" })}
                />

                {ratesError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {ratesError}
                  </p>
                )}

                <ReceiveAmountDisplay
                  cryptoAmount={cryptoReceiveAmount}
                  assetCode={receiveAsset?.code ?? "RLUSD"}
                  fiatAmount={fiatAmount}
                  currencySymbol={selectedCurrency?.symbol ?? ""}
                  currencyLogo={selectedCurrency?.logo}
                  rate={rate}
                  feePercent={feePercent}
                  isLoading={ratesLoading}
                />

                {/* Payment From: fixed layout so "Add new payment method" stays in same place */}
                <div>
                  <Label className="text-sm font-medium mb-2">Payment From</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReceiverType("saved");
                        setSelectedPaymentMethod("");
                        setPhone("");
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
                        setPhone("");
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

                {/* Link always in same place to avoid flicker */}
                <button
                  type="button"
                  className="text-sm text-primary hover:underline block"
                  onClick={() => setAddPaymentMethodOpen(true)}
                >
                  Add new payment method
                </button>

                {/* Saved: Select payment method */}
                {receiverType === "saved" && (
                  <div>
                    <Label className="text-sm font-medium">Select Payment Method</Label>
                    <Select 
                      value={selectedPaymentMethod || undefined} 
                      onValueChange={(v) => {
                        setSelectedPaymentMethod(v);
                        if (errors.payment) setErrors({ ...errors, payment: "" });
                      }}
                    >
                      <SelectTrigger className="mt-1.5 h-12 bg-background">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {isLoadingPaymentMethods ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Loading...
                          </div>
                        ) : paymentMethods.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No saved payment methods
                          </div>
                        ) : (
                          paymentMethods.map((pm) => (
                            <SelectItem key={pm.id} value={pm.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{pm.account_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {pm.phone_number}
                                </span>
                                {pm.bank_address && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={pm.bank_address}>
                                    {pm.bank_address}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {errors.payment && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.payment}
                      </p>
                    )}
                  </div>
                )}

                {/* New Number: Phone input with unified border */}
                {receiverType === "onetime" && (
                  <div>
                    <Label className="text-sm font-medium">Phone Number</Label>
                    <PhoneInput
                      value={phone}
                      onChange={(value) => {
                        setPhone(value || "");
                        if (errors.phone) setErrors({ ...errors, phone: "" });
                      }}
                      defaultCountry="UG"
                      className="mt-1.5"
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.phone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : !payInInstructions ? (
              <div className="p-6 space-y-5">
                <h3 className="text-lg font-semibold">Review Deposit</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">You Pay</span>
                    <span className="font-semibold text-lg flex items-center gap-2">
                      {selectedCurrency?.logo && <img src={selectedCurrency.logo} alt={selectedCurrency.symbol} className="w-5 h-4 object-contain rounded" />}
                      {fiatAmount} {selectedCurrency?.symbol ?? ""}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">You Receive</span>
                    <span className="font-semibold text-lg text-primary">
                      {cryptoReceiveAmount} {receiveAsset?.code ?? "RLUSD"}
                    </span>
                  </div>
                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-sm text-muted-foreground">Fee (0.5%)</span>
                        <span className="text-sm font-medium flex items-center gap-1">
                        {selectedCurrency?.logo && <img src={selectedCurrency.logo} alt="" className="w-4 h-3 object-contain rounded" />}
                        {(parseFloat(fiatAmount) * (feePercent / 100)).toFixed(2)} {selectedCurrency?.symbol ?? ""}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <span className="text-sm font-medium">{phone}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Receive At</span>
                      <span className="text-xs font-mono">{effectiveAddress.slice(0, 10)}...{effectiveAddress.slice(-8)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border">
            {payInInstructions ? (
              <Button onClick={resetAndClose} className="w-full h-12 bg-primary hover:bg-primary/90">
                Done
              </Button>
            ) : !showPreview ? (
              <Button
                onClick={handleDeposit}
                disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "Preview Deposit"
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
                <Button
                  onClick={handleDeposit}
                  disabled={isLoading}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Deposit"
                  )}
                </Button>
              </div>
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
