import { useState, useEffect } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AmountWithCurrency } from "@/components/ui/amount-with-currency";
import { paymentMethodApi, PaymentMethod as ApiPaymentMethod } from "@/services/api";
import { fiatCurrencies, Currency } from "@/data/currencies";
import { toast } from "sonner";

const mobileNetworks = [
  { id: "mtn", name: "MTN Mobile Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/1200px-New-mtn-logo.svg.png" },
  { id: "airtel", name: "Airtel Money", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Airtel_Africa_logo.svg/1200px-Airtel_Africa_logo.svg.png" },
];

interface MobileMoneySendProps {
  userCurrency: string;
  userCurrencyId: string;
  amount: string;
  onAmountChange: (value: string) => void;
  errors: Record<string, string>;
  onErrorsChange: (errors: Record<string, string>) => void;
  onNetworkChange?: (network: string) => void;
  onRecipientChange?: (recipient: string) => void;
  onReceiverTypeChange?: (type: "saved" | "onetime") => void;
  onSelectedPaymentMethodChange?: (id: string) => void;
}

export const MobileMoneySend = ({
  userCurrency,
  userCurrencyId,
  amount,
  onAmountChange,
  errors,
  onErrorsChange,
  onNetworkChange,
  onRecipientChange,
  onReceiverTypeChange,
  onSelectedPaymentMethodChange,
}: MobileMoneySendProps) => {
  const [network, setNetwork] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [receiverType, setReceiverType] = useState<"saved" | "onetime">("saved");
  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

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

  const handleAddPaymentMethod = async () => {
    if (recipient && recipientName) {
      try {
        const phoneNumber = recipient.replace(/\s/g, "");
        const countryCode = phoneNumber.startsWith("+256") ? "UG" : "";
        
        const response = await paymentMethodApi.addPaymentMethod({
          type: "MOBILE",
          account_number: phoneNumber,
          account_name: recipientName,
          bank_name: network === "mtn" ? "MTN Mobile Money" : "Airtel Money",
          country_code: countryCode,
        });

        if (response.status === 200) {
          toast.success("Beneficiary added successfully");
          setShowAddPaymentMethod(false);
          setRecipient("");
          setRecipientName("");
          fetchPaymentMethods();
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to add beneficiary");
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Network Selection */}
      <div>
        <Label className="text-sm font-medium">Network</Label>
        <Select value={network} onValueChange={(v) => {
          setNetwork(v);
          if (errors.network) onErrorsChange({ ...errors, network: "" });
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
        amount={amount}
        onAmountChange={onAmountChange}
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
              if (onReceiverTypeChange) onReceiverTypeChange("saved");
              setSelectedPaymentMethod("");
              if (onSelectedPaymentMethodChange) onSelectedPaymentMethodChange("");
              setRecipient("");
              if (onRecipientChange) onRecipientChange("");
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
              if (onReceiverTypeChange) onReceiverTypeChange("onetime");
              setSelectedPaymentMethod("");
              if (onSelectedPaymentMethodChange) onSelectedPaymentMethodChange("");
              setRecipient("");
              if (onRecipientChange) onRecipientChange("");
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
              if (onRecipientChange) onRecipientChange(value || "");
              if (errors.recipient) onErrorsChange({ ...errors, recipient: "" });
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

      {/* Add Payment Method Form */}
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
                if (errors.recipient) onErrorsChange({ ...errors, recipient: "" });
              }}
              error={!!errors.recipient}
              className="mt-1.5"
            />
          </div>
          <Button
            type="button"
            onClick={handleAddPaymentMethod}
            className="w-full"
          >
            Add Beneficiary
          </Button>
        </div>
      )}
    </div>
  );
};
