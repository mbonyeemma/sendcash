import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AmountWithCurrency } from "@/components/ui/amount-with-currency";
import { cryptoCurrencies, fiatCurrencies, Currency, exchangeRates } from "@/data/currencies";
import { paymentMethodApi, PaymentMethod as ApiPaymentMethod } from "@/services/api";

interface OfframpSendProps {
  rlusdAmount: string;
  onRlusdAmountChange: (value: string) => void;
  fiatAmount: string;
  onFiatAmountChange: (value: string) => void;
  toCurrency: Currency;
  onToCurrencyChange: (currency: Currency) => void;
  paymentMethodType: "mobile" | "bank" | "";
  onPaymentMethodTypeChange: (type: "mobile" | "bank" | "") => void;
  selectedPaymentMethod: string;
  onSelectedPaymentMethodChange: (id: string) => void;
  errors: Record<string, string>;
  onErrorsChange: (errors: Record<string, string>) => void;
  onShowPreview: () => void;
}

const calculateFee = (amount: number): number => {
  return amount * 0.01; // 1% for offramp
};

export const OfframpSend = ({
  rlusdAmount,
  onRlusdAmountChange,
  fiatAmount,
  onFiatAmountChange,
  toCurrency,
  onToCurrencyChange,
  paymentMethodType,
  onPaymentMethodTypeChange,
  selectedPaymentMethod,
  onSelectedPaymentMethodChange,
  errors,
  onErrorsChange,
  onShowPreview,
}: OfframpSendProps) => {
  const rlusdCurrency = cryptoCurrencies.find(c => c.symbol === "RLUSD") || cryptoCurrencies[0];
  const [paymentMethods, setPaymentMethods] = useState<ApiPaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [rate, setRate] = useState<number>(1);

  // Calculate exchange rate
  useEffect(() => {
    if (rlusdCurrency && toCurrency) {
      const exchangeRate = exchangeRates[rlusdCurrency.id]?.[toCurrency.id] || 1;
      setRate(exchangeRate);
    }
  }, [rlusdCurrency, toCurrency]);

  // Fetch payment methods when type is selected
  useEffect(() => {
    if (paymentMethodType) {
      fetchPaymentMethods();
    }
  }, [paymentMethodType]);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoadingPaymentMethods(true);
      const response = await paymentMethodApi.getUserPaymentMethods(
        paymentMethodType === "mobile" ? "MOBILE" : "BANK"
      );
      if (response.data) {
        setPaymentMethods(response.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch payment methods:", error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  // Calculate fiat amount when RLUSD changes
  useEffect(() => {
    if (rlusdAmount && !isNaN(parseFloat(rlusdAmount)) && rate > 0) {
      const rlusdNum = parseFloat(rlusdAmount);
      const fee = calculateFee(rlusdNum);
      const netAmount = rlusdNum - fee;
      const fiatValue = (netAmount * rate).toFixed(2);
      if (fiatValue !== fiatAmount) {
        onFiatAmountChange(fiatValue);
      }
    }
  }, [rlusdAmount, rate]);

  // Calculate RLUSD amount when fiat changes (only if user manually changed fiat)
  const handleFiatChange = (value: string) => {
    onFiatAmountChange(value);
    if (value && !isNaN(parseFloat(value)) && rate > 0) {
      const fiatNum = parseFloat(value);
      // Reverse calculation: fiat / rate = net RLUSD, then add fee back
      const netRlusd = fiatNum / rate;
      const totalRlusd = netRlusd / (1 - 0.01); // Add back the 1% fee
      onRlusdAmountChange(totalRlusd.toFixed(6));
    }
  };

  return (
    <div className="px-4 space-y-5">
      {/* RLUSD Amount Input */}
      <AmountWithCurrency
        label="Amount (RLUSD)"
        amount={rlusdAmount}
        onAmountChange={(value) => {
          onRlusdAmountChange(value);
          if (errors.offrampAmount) onErrorsChange({ ...errors, offrampAmount: "" });
        }}
        currency={rlusdCurrency}
        onCurrencyChange={() => {}} // Offramp is RLUSD only, not changeable
        currencies={[rlusdCurrency]}
        error={errors.offrampAmount}
        placeholder="0.00"
        disabled={false}
      />

  

      {/* Fiat Amount Input */}
      <AmountWithCurrency
        label={`Amount (${toCurrency.symbol})`}
        amount={fiatAmount}
        onAmountChange={(value) => {
          handleFiatChange(value);
          if (errors.fiatAmount) onErrorsChange({ ...errors, fiatAmount: "" });
        }}
        currency={toCurrency}
        onCurrencyChange={(currency) => {
          onToCurrencyChange(currency);
          if (errors.toCurrency) onErrorsChange({ ...errors, toCurrency: "" });
        }}
        currencies={fiatCurrencies}
        error={errors.fiatAmount}
        placeholder="0.00"
        showIcon={true}
      />

      {/* Payment Method Type Selection */}
      <div>
        <Label className="text-sm font-medium">Payment Method Type</Label>
        <Select
          value={paymentMethodType || undefined}
          onValueChange={(value) => {
            onPaymentMethodTypeChange(value as "mobile" | "bank");
            onSelectedPaymentMethodChange("");
            if (errors.paymentMethodType) onErrorsChange({ ...errors, paymentMethodType: "" });
          }}
        >
          <SelectTrigger className="mt-1.5 h-12 bg-background">
            <SelectValue placeholder="Select payment method type" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="mobile">Mobile Money</SelectItem>
            <SelectItem value="bank">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
        {errors.paymentMethodType && (
          <p className="text-sm text-destructive flex items-center gap-1 mt-1">
            <AlertCircle className="w-4 h-4" />
            {errors.paymentMethodType}
          </p>
        )}
      </div>

      {/* Payment Method Selection */}
      {paymentMethodType && (
        <div>
          <Label className="text-sm font-medium">Select Payment Method</Label>
          <Select 
            value={selectedPaymentMethod || undefined} 
            onValueChange={(v) => {
              onSelectedPaymentMethodChange(v);
              if (errors.selectedPaymentMethod) onErrorsChange({ ...errors, selectedPaymentMethod: "" });
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
                  No saved payment methods. Please add one in Settings.
                </div>
              ) : (
                paymentMethods.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{pm.account_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {pm.phone_number || pm.account_number} • {pm.bank_name || ""}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.selectedPaymentMethod && (
            <p className="text-sm text-destructive flex items-center gap-1 mt-1">
              <AlertCircle className="w-4 h-4" />
              {errors.selectedPaymentMethod}
            </p>
          )}
        </div>
      )}

      {/* Fee Display */}
      {rlusdAmount && !isNaN(parseFloat(rlusdAmount)) && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fee (1%)</span>
            <span className="font-medium">
              {calculateFee(parseFloat(rlusdAmount)).toFixed(6)} RLUSD
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-primary/20">
            <span className="text-muted-foreground">You'll Receive</span>
            <span className="font-semibold">
              {fiatAmount || "0.00"} {toCurrency.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Info Alert - Moved to Bottom */}
   
    </div>
  );
};
