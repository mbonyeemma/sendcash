import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Currency } from "@/data/currencies";

interface AmountWithCurrencyProps {
  label?: string;
  amount: string;
  onAmountChange: (value: string) => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  currencies: Currency[];
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  showIcon?: boolean;
  currencySelectWidth?: string;
}

export const AmountWithCurrency = ({
  label = "Amount",
  amount,
  onAmountChange,
  currency,
  onCurrencyChange,
  currencies,
  error,
  placeholder = "0.00",
  disabled = false,
  showIcon = true,
  currencySelectWidth = "w-24",
}: AmountWithCurrencyProps) => {
  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2 mt-1.5">
        <Input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 flex-1"
          disabled={disabled}
        />
        <Select
          value={currency.id}
          onValueChange={(value) => {
            const selectedCurrency = currencies.find((c) => c.id === value);
            if (selectedCurrency) {
              onCurrencyChange(selectedCurrency);
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger className={`h-12 ${currencySelectWidth} bg-muted border-border`}>
            <SelectValue>
              <div className="flex items-center gap-2">
                {showIcon && currency.logo && (
                  <img
                    src={currency.logo}
                    alt={currency.symbol}
                    className="w-5 h-5 object-contain rounded-full"
                  />
                )}
                <span className="font-medium text-foreground">{currency.symbol}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {currencies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  {showIcon && c.logo && (
                    <img
                      src={c.logo}
                      alt={c.symbol}
                      className="w-5 h-5 object-contain rounded-full"
                    />
                  )}
                  <span>{c.symbol}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1 mt-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};
