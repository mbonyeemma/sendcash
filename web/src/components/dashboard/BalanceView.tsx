import { useState, useEffect } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { walletApi } from "@/services/api";
import { getCurrencyById } from "@/data/currencies";
import { toast } from "sonner";

interface Balance {
  currency: string;
  balance: string;
  isLoading: boolean;
}

export const BalanceView = () => {
  const [hidden, setHidden] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([
    { currency: "RLUSD", balance: "0", isLoading: true },
    { currency: "UGX", balance: "0", isLoading: true },
  ]);

  useEffect(() => {
    fetchBalances();
    // Refresh balances every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBalances = async () => {
    // Fetch RLUSD balance
    try {
      const rlusdResponse = await walletApi.getBalance("RLUSD");
      if (rlusdResponse.data) {
        const balanceValue = rlusdResponse.data.balance ?? rlusdResponse.data.data?.balance;
        setBalances(prev =>
          prev.map(b =>
            b.currency === "RLUSD"
              ? { ...b, balance: String(balanceValue || "0"), isLoading: false }
              : b
          )
        );
      }
    } catch (error: any) {
      console.error("Failed to fetch RLUSD balance:", error);
      setBalances(prev =>
        prev.map(b => (b.currency === "RLUSD" ? { ...b, balance: "0", isLoading: false } : b))
      );
    }

    // Fetch UGX balance
    try {
      const ugxResponse = await walletApi.getBalance("UGX");
      if (ugxResponse.data) {
        const balanceValue = ugxResponse.data.balance ?? ugxResponse.data.data?.balance;
        setBalances(prev =>
          prev.map(b =>
            b.currency === "UGX"
              ? { ...b, balance: String(balanceValue || "0"), isLoading: false }
              : b
          )
        );
      }
    } catch (error: any) {
      console.error("Failed to fetch UGX balance:", error);
      setBalances(prev =>
        prev.map(b => (b.currency === "UGX" ? { ...b, balance: "0", isLoading: false } : b))
      );
    }
  };

  const formatAmount = (val: string | number, currency: string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0.00";
    
    if (currency === "UGX" || currency === "KES") {
      return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Balances</h1>
          <p className="text-sm text-muted-foreground mt-1">View your account balances</p>
        </div>
        <button
          onClick={() => setHidden(!hidden)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {hidden ? <Eye className="w-5 h-5 text-muted-foreground" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {balances.map((balance) => {
          const currencyInfo = getCurrencyById(balance.currency.toLowerCase());
          const isLoading = balance.isLoading;

          return (
            <div
              key={balance.currency}
              className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {currencyInfo?.logo && (
                    <img
                      src={currencyInfo.logo}
                      alt={balance.currency}
                      className="w-10 h-10 object-contain rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{balance.currency}</p>
                    {currencyInfo?.name && (
                      <p className="text-xs text-muted-foreground">{currencyInfo.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {hidden ? "••••••" : formatAmount(balance.balance, balance.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {balance.currency} Balance
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
