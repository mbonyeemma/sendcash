import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrencyById, SEND_RECEIVE_CURRENCIES, type Currency } from "@/data/currencies";
import { AlertCircle } from "lucide-react";
import type { SupportedCurrency } from "@/services/api";

/** Minimal currency option for dropdown (from API or fallback) */
export type CurrencyOption = { id: string; symbol: string; logo: string };

interface AmountItemProps {
  currencyId: string;
  onCurrencyChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  /** Symbol for selected currency (for display) */
  currencySymbol: string;
  /** Logo URL for selected currency (optional) */
  currencyLogo?: string;
  /** List from API; if not provided, uses SEND_RECEIVE_CURRENCIES + getCurrencyById */
  supportedCurrencies?: CurrencyOption[];
  amountError?: string;
  onClearAmountError?: () => void;
}

export const AmountItem = ({
  currencyId,
  onCurrencyChange,
  amount,
  onAmountChange,
  currencySymbol,
  currencyLogo,
  supportedCurrencies,
  amountError,
  onClearAmountError,
}: AmountItemProps) => {
  const options: CurrencyOption[] = supportedCurrencies?.length
    ? supportedCurrencies
    : SEND_RECEIVE_CURRENCIES.map((id) => {
        const c = getCurrencyById(id);
        return c ? { id: c.id, symbol: c.symbol, logo: c.logo } : null;
      }).filter(Boolean) as CurrencyOption[];

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Pay with</Label>
      <div className="flex h-12 rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <Input
          type="number"
          value={amount}
          onChange={(e) => {
            onAmountChange(e.target.value);
            onClearAmountError?.();
          }}
          placeholder="0.00"
          className="h-full min-w-0 flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
        />
        <div className="flex items-center border-l border-input bg-muted/50 px-2">
          <Select value={currencyId} onValueChange={onCurrencyChange}>
            <SelectTrigger className="h-9 w-[100px] border-0 bg-transparent shadow-none focus:ring-0 gap-1.5 pr-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <img src={c.logo} alt={c.symbol} className="w-5 h-4 object-contain rounded" />
                    {c.symbol}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {amountError && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {amountError}
        </p>
      )}
    </div>
  );
};

/** Compact read-only "You'll receive" / quote display. Always shows rate and fee when rate > 0; shows RLUSD amount when user entered fiat. */
interface ReceiveAmountDisplayProps {
  rlusdAmount: string;
  fiatAmount: string;
  currencySymbol: string;
  currencyLogo?: string;
  /** Fiat per 1 RLUSD (from API) */
  rate: number;
  /** Fee percent (from API, e.g. 0.5) */
  feePercent: number;
  /** When true, show loading placeholder instead of rate */
  isLoading?: boolean;
}

export const ReceiveAmountDisplay = ({
  rlusdAmount,
  fiatAmount,
  currencySymbol,
  currencyLogo,
  rate,
  feePercent,
  isLoading = false,
}: ReceiveAmountDisplayProps) => {
  const hasAmount = fiatAmount && !isNaN(parseFloat(fiatAmount)) && parseFloat(fiatAmount) > 0;
  const fee = (parseFloat(fiatAmount) || 0) * (feePercent / 100);
  const showQuote = rate > 0 && !isLoading;
  if (!showQuote && !isLoading) return null;
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-muted-foreground">You&apos;ll receive</Label>
      <div className="rounded-lg border border-input bg-muted/30 overflow-hidden">
        <div className="flex h-11 items-center px-3 gap-2">
          {isLoading ? (
            <span className="text-muted-foreground text-sm">Loading rate…</span>
          ) : (
            <>
              <span className="font-semibold text-foreground tabular-nums">
                {hasAmount && rlusdAmount ? rlusdAmount : "—"}
              </span>
              <span className="text-muted-foreground text-sm">RLUSD</span>
              <span className="flex-1" />
              {currencyLogo && <img src={currencyLogo} alt="" className="w-4 h-3 object-contain rounded" />}
              <span className="text-sm text-muted-foreground">
                {hasAmount ? `${fiatAmount} ${currencySymbol}` : `Enter amount above for quote`}
              </span>
            </>
          )}
        </div>
        {showQuote && (
          <div className="border-t border-border/50 px-3 py-1.5 text-xs text-muted-foreground">
            Fee {feePercent}%: {hasAmount ? `${fee.toFixed(2)} ${currencySymbol} · ` : ""}
            1 {currencySymbol} = {(1 / rate).toFixed(6)} RLUSD
          </div>
        )}
      </div>
    </div>
  );
};
