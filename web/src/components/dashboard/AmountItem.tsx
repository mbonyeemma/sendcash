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
import { XRPL_SEND_ASSETS, type SupportedAsset } from "@/data/supportedAssets";
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

/** Multi-chain send: amount + asset picker. Defaults to XRPL assets; pass `assets` to override. */
interface AssetAmountItemProps {
  assetId: string;
  onAssetChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  /** Asset list to display. Defaults to XRPL_SEND_ASSETS when not provided. */
  assets?: SupportedAsset[];
  amountError?: string;
  onClearAmountError?: () => void;
}

export const AssetAmountItem = ({
  assetId,
  onAssetChange,
  amount,
  onAmountChange,
  assets,
  amountError,
  onClearAmountError,
}: AssetAmountItemProps) => {
  const assetList = assets && assets.length > 0 ? assets : XRPL_SEND_ASSETS;
  const selected = assetList.find((a) => a.id === assetId) ?? assetList[0];
  const code = selected?.code ?? "XRP";
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Amount</Label>
      <div className="flex h-12 rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <Input
          type="number"
          step={code === "XRP" ? "0.000001" : "0.01"}
          value={amount}
          onChange={(e) => {
            onAmountChange(e.target.value);
            onClearAmountError?.();
          }}
          placeholder="0.00"
          className="h-full min-w-0 flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
        />
        <div className="flex items-center border-l border-input bg-muted/50 px-2 min-w-0">
          <Select value={selected.id} onValueChange={onAssetChange}>
            <SelectTrigger className="h-9 min-w-[108px] max-w-[140px] border-0 bg-transparent shadow-none focus:ring-0 gap-1.5 pr-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assetList.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    {c.logo ? (
                      <img src={c.logo} alt={c.code} className="w-5 h-4 object-contain rounded" />
                    ) : (
                      <span className="w-5 h-4 rounded bg-muted text-foreground flex items-center justify-center text-[10px] font-bold">
                        {c.code.slice(0, 3)}
                      </span>
                    )}
                    <span>{c.code}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {c.chain === "base" ? "Base" : "XRPL"}
                    </span>
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

/** Compact read-only "You'll receive" / quote display for onramp (fiat → crypto). */
interface ReceiveAmountDisplayProps {
  cryptoAmount: string;
  /** Asset ticker for the amount you'll receive (e.g. RLUSD) */
  assetCode: string;
  fiatAmount: string;
  currencySymbol: string;
  currencyLogo?: string;
  /** Fiat per 1 unit of crypto (from API) */
  rate: number;
  /** Fee percent (from API, e.g. 0.5) */
  feePercent: number;
  isLoading?: boolean;
}

export const ReceiveAmountDisplay = ({
  cryptoAmount,
  assetCode,
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
                {hasAmount && cryptoAmount ? cryptoAmount : "—"}
              </span>
              <span className="text-muted-foreground text-sm">{assetCode}</span>
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
            1 {currencySymbol} = {(1 / rate).toFixed(6)} {assetCode}
          </div>
        )}
      </div>
    </div>
  );
};
