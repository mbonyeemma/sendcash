import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AmountWithCurrency } from "@/components/ui/amount-with-currency";
import { cryptoCurrencies, Currency } from "@/data/currencies";

interface CryptoSendProps {
  amount: string;
  onAmountChange: (value: string) => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  walletAddress: string;
  onWalletAddressChange: (value: string) => void;
  errors: Record<string, string>;
  onErrorsChange: (errors: Record<string, string>) => void;
}

export const CryptoSend = ({
  amount,
  onAmountChange,
  currency,
  onCurrencyChange,
  walletAddress,
  onWalletAddressChange,
  errors,
  onErrorsChange,
}: CryptoSendProps) => {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium">Select Asset</Label>
        <Select 
          value={currency.id} 
          onValueChange={(v) => {
            const selectedCurrency = cryptoCurrencies.find(c => c.id === v);
            if (selectedCurrency) {
              onCurrencyChange(selectedCurrency);
            }
          }}
        >
          <SelectTrigger className="mt-1.5 h-12 bg-background">
            <SelectValue>
              <div className="flex items-center gap-2">
                <img src={currency.logo} alt={currency.symbol} className="w-5 h-5 object-contain rounded-full" />
                <span className="font-medium">{currency.symbol}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {cryptoCurrencies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <img src={c.logo} alt={c.symbol} className="w-5 h-5 object-contain rounded-full" />
                  <span>{c.symbol}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium">Wallet Address</Label>
        <Input
          value={walletAddress}
          onChange={(e) => {
            onWalletAddressChange(e.target.value);
            if (errors.walletAddress) onErrorsChange({ ...errors, walletAddress: "" });
          }}
          placeholder="Enter destination wallet address"
          className="mt-1.5 h-12"
        />
        {errors.walletAddress && (
          <p className="text-sm text-destructive flex items-center gap-1 mt-1">
            <AlertCircle className="w-4 h-4" />
            {errors.walletAddress}
          </p>
        )}
      </div>

      <AmountWithCurrency
        amount={amount}
        onAmountChange={onAmountChange}
        currency={currency}
        onCurrencyChange={onCurrencyChange}
        currencies={cryptoCurrencies}
        error={errors.fromAmount}
        placeholder="0.00"
      />
    </div>
  );
};
