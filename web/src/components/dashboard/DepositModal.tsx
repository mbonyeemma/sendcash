import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone, Loader2, AlertCircle, ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { walletApi, paymentMethodApi, PaymentMethod as ApiPaymentMethod } from "@/services/api";
import { exchangeRates } from "@/data/currencies";
import { useAuth } from "@/contexts/AuthContext";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
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
  onSuccess?: () => void;
}

const mobileNetworks = [
  { id: "mtn", name: "MTN Mobile Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/1200px-New-mtn-logo.svg.png" },
  { id: "airtel", name: "Airtel Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Airtel_Africa_logo.svg/1200px-Airtel_Africa_logo.svg.png" },
];

export const DepositModal = ({ isOpen, onClose, onSuccess }: DepositModalProps) => {
  const { user } = useAuth();
  const { isConnected, address, connectWallet } = useXRPLWallet();
  const userCurrency = user?.currency || "UGX";
  
  const [network, setNetwork] = useState("");
  const [phone, setPhone] = useState("");
  const [ugxAmount, setUgxAmount] = useState("");
  const [rlusdAmount, setRlusdAmount] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [receiverType, setReceiverType] = useState<"saved" | "onetime">("saved");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Exchange rate UGX to RLUSD
  const rate = exchangeRates["ugx"]?.["rlusd"] || 0.00027;

  // Calculate RLUSD when UGX changes
  useEffect(() => {
    if (ugxAmount && !isNaN(parseFloat(ugxAmount)) && rate > 0) {
      const ugxNum = parseFloat(ugxAmount);
      const fee = ugxNum * 0.005; // 0.5% fee
      const netAmount = ugxNum - fee;
      const rlusdValue = (netAmount * rate).toFixed(6);
      setRlusdAmount(rlusdValue);
    } else {
      setRlusdAmount("");
    }
  }, [ugxAmount, rate]);

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
    
    if (!ugxAmount || parseFloat(ugxAmount) <= 0) {
      newErrors.ugxAmount = "Please enter a valid amount";
    }
    if (!network) {
      newErrors.network = "Please select a network";
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

    setIsLoading(true);

    try {
      const phoneNumber = receiverType === "saved" && selectedPaymentMethod
        ? paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.phone_number || phone
        : phone.replace(/\s/g, "");

      const response = await walletApi.depositRequest({
        amount: parseFloat(ugxAmount),
        currency: userCurrency,
        account_number: phoneNumber,
        destination_address: address || "", // XRPL address to receive RLUSD
        network: network,
      });

      if (response.status === 200 || response.status === 201) {
        toast.success(`Deposit initiated! You will receive ${rlusdAmount} RLUSD. Please complete the payment on your phone.`);
        resetAndClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(response.message || "Deposit failed");
      }
    } catch (error: any) {
      console.error("Deposit error:", error);
      toast.error(error.message || "Failed to initiate deposit");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setNetwork("");
    setPhone("");
    setUgxAmount("");
    setRlusdAmount("");
    setSelectedPaymentMethod("");
    setReceiverType("saved");
    setErrors({});
    setShowPreview(false);
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
            <h2 className="text-xl font-bold text-foreground">Deposit - Get RLUSD</h2>
            <button
              onClick={resetAndClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Wallet Connection Alert */}
            {!isConnected ? (
              <div className="p-4 mx-6 mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Wallet Required</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Connect your GemWallet to receive RLUSD
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
            ) : (
              <div className="p-4 mx-6 mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">Wallet Connected</p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      RLUSD will be sent to: {address?.slice(0, 8)}...{address?.slice(-6)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!showPreview ? (
              <div className="p-6 space-y-5">
                {/* Info */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">RLUSD Onramp</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deposit {userCurrency} via mobile money and receive RLUSD in your wallet
                      </p>
                    </div>
                  </div>
                </div>

                {/* UGX Amount */}
                <div>
                  <Label className="text-sm font-medium">Amount ({userCurrency})</Label>
                  <Input
                    type="number"
                    value={ugxAmount}
                    onChange={(e) => {
                      setUgxAmount(e.target.value);
                      if (errors.ugxAmount) setErrors({ ...errors, ugxAmount: "" });
                    }}
                    placeholder="Enter amount"
                    className="mt-1.5 h-12"
                  />
                  {errors.ugxAmount && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.ugxAmount}
                    </p>
                  )}
                </div>

                {/* RLUSD Amount Display */}
                {rlusdAmount && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">You'll receive</p>
                        <p className="text-2xl font-bold text-foreground">{rlusdAmount} RLUSD</p>
                      </div>
                      <ArrowRight className="w-6 h-6 text-primary" />
                    </div>
                    <div className="mt-3 pt-3 border-t border-primary/20 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Amount:</span>
                        <span>{ugxAmount} {userCurrency}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Fee (0.5%):</span>
                        <span>{(parseFloat(ugxAmount) * 0.005).toFixed(2)} {userCurrency}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Rate:</span>
                        <span>1 {userCurrency} = {rate.toFixed(6)} RLUSD</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mobile Network */}
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
                      {mobileNetworks.map((net) => (
                        <SelectItem key={net.id} value={net.id}>
                          <div className="flex items-center gap-2">
                            <img src={net.logo} alt={net.name} className="w-5 h-5" />
                            <span>{net.name}</span>
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

                {/* Receiver Type Toggle */}
                <div>
                  <Label className="text-sm font-medium mb-2">Payment From</Label>
                  <div className="flex gap-2">
                    <button
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

                {/* Payment Method Selection */}
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

                {/* Phone Number Input */}
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
            ) : (
              <div className="p-6 space-y-5">
                <h3 className="text-lg font-semibold">Review Deposit</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">You Pay</span>
                    <span className="font-semibold text-lg">{ugxAmount} {userCurrency}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">You Receive</span>
                    <span className="font-semibold text-lg text-primary">{rlusdAmount} RLUSD</span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm text-muted-foreground">Fee (0.5%)</span>
                      <span className="text-sm font-medium">{(parseFloat(ugxAmount) * 0.005).toFixed(2)} {userCurrency}</span>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Network</span>
                      <span className="text-sm font-medium capitalize">{network}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <span className="text-sm font-medium">{phone}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Receive At</span>
                      <span className="text-xs font-mono">{address?.slice(0, 10)}...{address?.slice(-8)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border">
            {!showPreview ? (
              <Button
                onClick={handleDeposit}
                disabled={isLoading || !isConnected}
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
    </AnimatePresence>
  );
};
