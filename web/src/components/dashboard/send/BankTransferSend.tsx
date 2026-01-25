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
import { fiatCurrencies } from "@/data/currencies";

interface BankTransferSendProps {
  userCurrency: string;
  userCurrencyId: string;
  amount: string;
  onAmountChange: (value: string) => void;
  errors: Record<string, string>;
  onErrorsChange: (errors: Record<string, string>) => void;
  bankAccount: string;
  onBankAccountChange: (value: string) => void;
  bankName: string;
  onBankNameChange: (value: string) => void;
  accountHolder: string;
  onAccountHolderChange: (value: string) => void;
}

const banks = [
  "Equity Bank",
  "Stanbic Bank",
  "Centenary Bank",
  "DFCU Bank",
  "Bank of Uganda",
  "Absa Bank",
  "Bank of Africa",
  "Exim Bank",
  "KCB Bank",
  "GTBank",
];

export const BankTransferSend = ({
  userCurrency,
  userCurrencyId,
  amount,
  onAmountChange,
  errors,
  bankAccount,
  onBankAccountChange,
  bankName,
  onBankNameChange,
  accountHolder,
  onAccountHolderChange,
}: BankTransferSendProps) => {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium">Bank Name</Label>
        <Select 
          value={bankName} 
          onValueChange={(v) => {
            onBankNameChange(v);
            if (errors.bankName) onErrorsChange({ ...errors, bankName: "" });
          }}
        >
          <SelectTrigger className="mt-1.5 h-12 bg-background">
            <SelectValue placeholder="Select bank" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {banks.map((bank) => (
              <SelectItem key={bank} value={bank}>
                {bank}
              </SelectItem>
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
            onBankAccountChange(e.target.value);
            if (errors.bankAccount) onErrorsChange({ ...errors, bankAccount: "" });
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
            onAccountHolderChange(e.target.value);
            if (errors.accountHolder) onErrorsChange({ ...errors, accountHolder: "" });
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

      <AmountWithCurrency
        amount={amount}
        onAmountChange={onAmountChange}
        currency={fiatCurrencies.find(c => c.id === userCurrencyId) || fiatCurrencies[0]}
        onCurrencyChange={() => {}} // Bank transfer uses user's currency, not changeable
        currencies={fiatCurrencies.filter(c => c.id === userCurrencyId)}
        error={errors.fromAmount}
        placeholder="0"
        showIcon={false}
        currencySelectWidth="w-20"
      />
    </div>
  );
};
