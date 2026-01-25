import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, TrendingUp, AlertCircle, Smartphone, Building2, Wallet, ArrowLeftRight, ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { walletApi, paymentMethodApi, PaymentMethod as ApiPaymentMethod } from "@/services/api";
import { cryptoCurrencies, fiatCurrencies, Currency, exchangeRates, getCurrencyById } from "@/data/currencies";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AmountWithCurrency } from "@/components/ui/amount-with-currency";
import { MobileMoneySend } from "./send/MobileMoneySend";
import { BankTransferSend } from "./send/BankTransferSend";
import { CryptoSend } from "./send/CryptoSend";
import { OfframpSend } from "./send/OfframpSend";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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

type SendMethod = "mobile" | "bank" | "crypto" | "offramp" | "";

const sendMethods = [
  { value: "mobile", label: "Mobile Money", description: "Send to MTN, Airtel", icon: Smartphone },
  { value: "bank", label: "Bank Transfer", description: "Send to bank account", icon: Building2 },
  { value: "crypto", label: "Crypto Address", description: "Send to crypto wallet", icon: Wallet },
  { value: "offramp", label: "Offramp", description: "Convert RLUSD to fiat", icon: ArrowLeftRight },
];

const calculateFee = (amount: number, method: SendMethod): number => {
  if (method === "crypto") {
    return amount * 0.002; // 0.2% for crypto withdrawal
  } else if (method === "offramp") {
    return amount * 0.01; // 1% for offramp
  } else {
    return amount * 0.005; // 0.5% for mobile/bank
  }
};

export const SendModal = ({ isOpen, onClose, onSuccess }: SendModalProps) => {
  const { user } = useAuth();
  const userCurrency = user?.currency || "UGX";
  const userCurrencyId = userCurrency.toLowerCase();
  const [method, setMethod] = useState<SendMethod>("");
  const [fromCurrency, setFromCurrency] = useState<Currency>(cryptoCurrencies[0]); // Only used for crypto method
  const [network, setNetwork] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [receiverType, setReceiverType] = useState<"saved" | "onetime">("saved");
  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [fromAmount, setFromAmount] = useState("");
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  
  // Offramp specific state
  const [toCurrency, setToCurrency] = useState<Currency>(fiatCurrencies.find(c => c.id === userCurrencyId) || fiatCurrencies[0]);
  const [offrampAmount, setOfframpAmount] = useState("");
  const [fiatAmount, setFiatAmount] = useState("");
  const [offrampPaymentMethodType, setOfframpPaymentMethodType] = useState<"mobile" | "bank" | "">("");
  const [offrampSelectedPaymentMethod, setOfframpSelectedPaymentMethod] = useState<string>("");
  const [showOfframpPreview, setShowOfframpPreview] = useState(false);

  // Fetch payment methods when modal opens and method is mobile
  useEffect(() => {
    if (isOpen && method === "mobile") {
      fetchPaymentMethods();
    }
  }, [isOpen, method]);

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
    
    // Skip amount validation for offramp (it has its own amounts)
    if (method !== "offramp" && (!fromAmount || parseFloat(fromAmount) <= 0)) {
      newErrors.fromAmount = "Please enter a valid amount";
    }

    // PIN not required for offramp
    if (method !== "offramp" && !pin) {
      newErrors.pin = "Please enter your transaction PIN";
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
    } else if (method === "crypto") {
      if (!walletAddress) newErrors.walletAddress = "Please enter wallet address";
    } else if (method === "offramp") {
      if (!offrampAmount || parseFloat(offrampAmount) <= 0) newErrors.offrampAmount = "Please enter a valid RLUSD amount";
      if (!fiatAmount || parseFloat(fiatAmount) <= 0) newErrors.fiatAmount = "Please enter a valid fiat amount";
      if (!offrampPaymentMethodType) newErrors.paymentMethodType = "Please select payment method type";
      if (!offrampSelectedPaymentMethod) newErrors.selectedPaymentMethod = "Please select a payment method";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSend = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const methodType = method.toLowerCase();
      
      // Handle offramp separately
      if (methodType === "offramp") {
        if (!showOfframpPreview) {
          // Show preview instead of submitting
          setShowOfframpPreview(true);
          setIsLoading(false);
          return;
        }
        
        // Submit offramp
        const selectedPaymentMethodData = paymentMethods.find(pm => pm.id === offrampSelectedPaymentMethod);
        
        const offrampData = {
          amount: parseFloat(offrampAmount),
          fiat_amount: parseFloat(fiatAmount),
          from_currency: "RLUSD",
          to_currency: toCurrency.symbol.toUpperCase(),
          payment_method_id: offrampSelectedPaymentMethod,
          payment_mode: offrampPaymentMethodType === "mobile" ? "MOBILE" : "BANK",
          account_number: selectedPaymentMethodData?.account_number || selectedPaymentMethodData?.phone_number || "",
        };
        
        // TODO: Call offramp API endpoint
        // For now, simulate the call
        toast.success(`Offramp successful: ${offrampAmount} RLUSD converted to ${fiatAmount} ${toCurrency.symbol}`);
        resetAndClose();
        if (onSuccess) onSuccess();
        setIsLoading(false);
        return;
      }

      // Regular transfer logic for mobile, bank, crypto
      let accountNumber = "";
      let paymentMode = "";

      if (methodType.includes("mobile") || methodType.includes("momo")) {
        accountNumber = receiverType === "saved" && selectedPaymentMethod
          ? paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.account_number || recipient
          : recipient.replace(/\s/g, "");
        paymentMode = "MOBILE";
      } else if (methodType.includes("bank")) {
        accountNumber = bankAccount;
        paymentMode = "BANK";
      } else if (methodType.includes("crypto") || methodType.includes("wallet")) {
        accountNumber = walletAddress;
        paymentMode = "WALLET";
      } else {
        // Default handling for other payment types
        accountNumber = recipient || bankAccount || walletAddress;
        paymentMode = method.toUpperCase();
      }

      const transferData = {
        account_number: accountNumber,
        amount: parseFloat(fromAmount),
        payment_method_id: selectedPaymentMethod || "",
        pin: pin,
        payment_mode: paymentMode,
        currency: method === "crypto" ? fromCurrency.symbol.toUpperCase() : userCurrency,
        billerInfo: {},
      };

      const response = await walletApi.transfer(transferData);

      if (response.status === 200) {
        toast.success(response.message || `Successfully sent ${fromAmount} ${method === "crypto" ? fromCurrency.symbol : "UGX"}`);
        resetAndClose();
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to complete transaction. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setMethod("");
    setFromAmount("");
    setNetwork("");
    setRecipient("");
    setRecipientName("");
    setWalletAddress("");
    setBankAccount("");
    setBankName("");
    setAccountHolder("");
    setSelectedPaymentMethod("");
    setShowAddPaymentMethod(false);
    setReceiverType("saved");
    setPin("");
    setErrors({});
    // Reset offramp state
    setOfframpAmount("");
    setFiatAmount("");
    setOfframpPaymentMethodType("");
    setOfframpSelectedPaymentMethod("");
    setShowOfframpPreview(false);
    setToCurrency(fiatCurrencies.find(c => c.id === userCurrencyId) || fiatCurrencies[0]);
    onClose();
  };

  const fee = fromAmount && !isNaN(parseFloat(fromAmount)) && method
    ? calculateFee(parseFloat(fromAmount), method)
    : 0;

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
              {method && (
                <button
                  onClick={() => setMethod("")}
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
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Method Selection */}
            {!method && (
              <div>
                <Label className="text-sm font-medium mb-3 block">Select Send Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  {sendMethods.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setMethod(m.value as SendMethod)}
                        className="p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{m.label}</p>
                            <p className="text-xs text-muted-foreground">{m.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mobile Money Method */}
            {method === "mobile" && (
              <div className="space-y-5">
                {/* 1. Network Selection */}
                <div>
                  <Label className="text-sm font-medium">Network</Label>
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

                {/* 2. Amount */}
                <AmountWithCurrency
                  amount={fromAmount}
                  onAmountChange={setFromAmount}
                  currency={fiatCurrencies.find(c => c.id === userCurrencyId) || fiatCurrencies[0]}
                  onCurrencyChange={() => {}} // Mobile money uses user's currency, not changeable
                  currencies={fiatCurrencies.filter(c => c.id === userCurrencyId)}
                  error={errors.fromAmount}
                  placeholder="0"
                  showIcon={false}
                  currencySelectWidth="w-20"
                />

                {/* 3. Receiver Type Toggle */}
                <div>
                  <Label className="text-sm font-medium mb-2">Receiver</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setReceiverType("saved");
                        setSelectedPaymentMethod("");
                        setRecipient("");
                        setRecipientName("");
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
                        setRecipient("");
                        setRecipientName("");
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        receiverType === "onetime"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      One-time Receiver
                    </button>
                  </div>
                </div>

                {/* 4. Beneficiary Selection or Add (Same Line) */}
                {receiverType === "saved" && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select 
                        value={selectedPaymentMethod || undefined} 
                        onValueChange={(v) => {
                          setSelectedPaymentMethod(v);
                          setShowAddPaymentMethod(false);
                        }}
                      >
                        <SelectTrigger className="h-12 bg-background">
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
                                    {pm.phone_number || pm.account_number}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 px-4"
                      onClick={() => {
                        setShowAddPaymentMethod(true);
                        setSelectedPaymentMethod("");
                        setRecipient("");
                        setRecipientName("");
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* 5. One-time Receiver Phone Input */}
                {receiverType === "onetime" && (
                  <div>
                    <Label className="text-sm font-medium">Recipient Phone</Label>
                    <PhoneInput
                      value={recipient}
                      onChange={(value) => {
                        setRecipient(value || "");
                        if (errors.recipient) setErrors({ ...errors, recipient: "" });
                      }}
                      error={!!errors.recipient}
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

                {/* Add Payment Method Form (when showAddPaymentMethod is true) */}
                {showAddPaymentMethod && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-xl border border-border">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Add New Beneficiary</Label>
                      <button
                        onClick={() => {
                          setShowAddPaymentMethod(false);
                          setRecipient("");
                          setRecipientName("");
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <Input
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Enter beneficiary name"
                        className="mt-1.5 h-12"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone Number</Label>
                      <PhoneInput
                        value={recipient}
                        onChange={(value) => {
                          setRecipient(value || "");
                          if (errors.recipient) setErrors({ ...errors, recipient: "" });
                        }}
                        error={!!errors.recipient}
                        className="mt-1.5"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={async () => {
                        if (recipient && recipientName) {
                          try {
                            const phoneNumber = recipient.replace(/\s/g, "");
                            const countryCode = phoneNumber.startsWith("+256") ? "UG" : "";
                            
                            const response = await paymentMethodApi.addPaymentMethod({
                              type: "MOBILE",
                              currency: userCurrency,
                              phone_number: phoneNumber,
                              country_code: countryCode,
                              account_name: recipientName,
                              account_number: phoneNumber,
                            });

                            if (response.status === 200) {
                              setShowAddPaymentMethod(false);
                              setRecipient("");
                              setRecipientName("");
                              await fetchPaymentMethods();
                              toast.success(`${recipientName} has been saved as a beneficiary.`);
                            }
                          } catch (error: any) {
                            toast.error(error.message || "Failed to save beneficiary");
                          }
                        }
                      }}
                      className="w-full"
                    >
                      Save Beneficiary
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Bank Method */}
            {method === "bank" && (
              <BankTransferSend
                userCurrency={userCurrency}
                userCurrencyId={userCurrencyId}
                amount={fromAmount}
                onAmountChange={setFromAmount}
                errors={errors}
                onErrorsChange={setErrors}
                bankAccount={bankAccount}
                onBankAccountChange={setBankAccount}
                bankName={bankName}
                onBankNameChange={setBankName}
                accountHolder={accountHolder}
                onAccountHolderChange={setAccountHolder}
              />
            )}

            {/* BILLER Method */}
            {method && method.toUpperCase() === "BILLER" && (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium">Biller Details</Label>
                  <Input
                    type="text"
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(e.target.value);
                      if (errors.recipient) setErrors({ ...errors, recipient: "" });
                    }}
                    placeholder="Enter biller information"
                    className="mt-1.5 h-12"
                  />
                  {errors.recipient && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.recipient}
                    </p>
                  )}
                </div>

                <AmountWithCurrency
                  amount={fromAmount}
                  onAmountChange={setFromAmount}
                  currency={fiatCurrencies.find(c => c.id === userCurrencyId) || fiatCurrencies[0]}
                  onCurrencyChange={() => {}} // This method uses user's currency, not changeable
                  currencies={fiatCurrencies.filter(c => c.id === userCurrencyId)}
                  error={errors.fromAmount}
                  placeholder="0"
                  showIcon={false}
                  currencySelectWidth="w-20"
                />
              </div>
            )}

            {/* Crypto Address Method */}
            {method === "crypto" && (
              <CryptoSend
                amount={fromAmount}
                onAmountChange={setFromAmount}
                currency={fromCurrency}
                onCurrencyChange={(currency) => {
                  setFromCurrency(currency);
                  setFromAmount("");
                }}
                walletAddress={walletAddress}
                onWalletAddressChange={setWalletAddress}
                errors={errors}
                onErrorsChange={setErrors}
              />
            )}

            {/* Offramp Method */}
            {method === "offramp" && !showOfframpPreview && (
              <OfframpSend
                rlusdAmount={offrampAmount}
                onRlusdAmountChange={setOfframpAmount}
                fiatAmount={fiatAmount}
                onFiatAmountChange={setFiatAmount}
                toCurrency={toCurrency}
                onToCurrencyChange={setToCurrency}
                paymentMethodType={offrampPaymentMethodType}
                onPaymentMethodTypeChange={setOfframpPaymentMethodType}
                selectedPaymentMethod={offrampSelectedPaymentMethod}
                onSelectedPaymentMethodChange={setOfframpSelectedPaymentMethod}
                errors={errors}
                onErrorsChange={setErrors}
                onShowPreview={() => setShowOfframpPreview(true)}
              />
            )}

            {/* Offramp Preview */}
            {method === "offramp" && showOfframpPreview && (
              <div className="px-4 space-y-5">
                <h3 className="text-lg font-semibold">Review Offramp Transaction</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">From</span>
                    <span className="font-semibold text-lg">{offrampAmount} RLUSD</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">To</span>
                    <span className="font-semibold text-lg">{fiatAmount} {toCurrency.symbol}</span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm text-muted-foreground">Fee (1%)</span>
                      <span className="text-sm font-medium">{(parseFloat(offrampAmount) * 0.01).toFixed(6)} RLUSD</span>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Payment Method</span>
                      <span className="text-sm font-medium">
                        {paymentMethods.find(pm => pm.id === offrampSelectedPaymentMethod)?.account_name || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <span className="text-sm font-medium capitalize">{offrampPaymentMethodType}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border space-y-4">
            {method && method !== "offramp" && fromAmount && !isNaN(parseFloat(fromAmount)) && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee:</span>
                  <span className="font-medium text-foreground">
                    {calculateFee(parseFloat(fromAmount), method).toLocaleString()} {method === "crypto" ? fromCurrency.symbol : userCurrency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold text-foreground">
                    {(parseFloat(fromAmount) + calculateFee(parseFloat(fromAmount), method)).toLocaleString()} {method === "crypto" ? fromCurrency.symbol : userCurrency}
                  </span>
                </div>
              </div>
            )}
            {method && method !== "offramp" && (
              <div>
                <Label className="text-sm font-medium">Transaction PIN</Label>
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (errors.pin) setErrors({ ...errors, pin: "" });
                  }}
                  placeholder="Enter your PIN"
                  className="mt-1.5 h-12"
                  maxLength={6}
                />
                {errors.pin && (
                  <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.pin}
                  </p>
                )}
              </div>
            )}
            {method && method !== "offramp" && (
              <Button 
                onClick={handleSend} 
                className="w-full h-12 bg-primary hover:bg-primary/90"
                disabled={
                  !method || 
                  isLoading || 
                  !pin || 
                  !fromAmount
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "Send"
                )}
              </Button>
            )}
            {method === "offramp" && !showOfframpPreview && (
              <Button 
                onClick={handleSend} 
                className="w-full h-12 bg-primary hover:bg-primary/90"
                disabled={
                  !method || 
                  isLoading || 
                  !offrampAmount || 
                  !fiatAmount ||
                  !offrampPaymentMethodType ||
                  !offrampSelectedPaymentMethod
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
            )}
            {method === "offramp" && showOfframpPreview && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowOfframpPreview(false)}
                  className="flex-1 h-12"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Confirm & Submit"
                  )}
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
