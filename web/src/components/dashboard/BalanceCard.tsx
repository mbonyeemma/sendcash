import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowDownCircle, Send, ArrowLeftRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCurrencyById } from "@/data/currencies";
import { walletApi } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface BalanceOverviewProps {
  onDeposit: () => void;
  onSend: () => void;
  onConvert: () => void;
  onBalanceUpdate?: () => void;
}

export const BalanceOverview = ({ onDeposit, onSend, onConvert, onBalanceUpdate }: BalanceOverviewProps) => {
  const [hidden, setHidden] = useState(false);
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const currency = (user?.currency || "UGX").toUpperCase();
  const currencyId = currency.toLowerCase();
  const currencyInfo = getCurrencyById(currencyId) || getCurrencyById("ugx");

  useEffect(() => {
    fetchBalance();
  }, [currency]);

  // Expose refresh function to parent
  useEffect(() => {
    if (onBalanceUpdate) {
      // This allows parent to trigger refresh
      const interval = setInterval(() => {
        fetchBalance();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [onBalanceUpdate]);

  const fetchBalance = async () => {
    try {
      setIsLoading(true);
      const userCurrency = user?.currency || "UGX";
      const response = await walletApi.getBalance(userCurrency);
      console.log("Balance API Response:", response); // Debug log
      
      // The API returns: { status, message, data: { balance, token, issuer } }
      if (response.data && typeof response.data === 'object') {
        // Check if balance is directly in data or nested
        const balanceValue = response.data.balance ?? response.data.data?.balance;
        if (balanceValue !== undefined && balanceValue !== null) {
          setBalance(String(balanceValue));
        } else {
          console.warn("Balance not found in response:", response);
          setBalance("0");
        }
      } else {
        console.warn("Invalid response structure:", response);
        setBalance("0");
      }
    } catch (error: any) {
      console.error("Balance fetch error:", error);
      toast.error(error.message || "Failed to fetch balance");
      setBalance("0");
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmountNoDecimals = (val: string | number) => {
    if (hidden) return "••••••";
    const numVal = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(numVal)) return "0";
    return numVal.toLocaleString("en-UG", { maximumFractionDigits: 0 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 md:p-8 text-primary-foreground shadow-xl"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-primary-foreground/70 text-sm font-medium mb-1">Total Balance</p>
          <div className="flex items-center gap-3">
            {currencyInfo ? (
              <img 
                src={currencyInfo.logo} 
                alt={currency} 
                className="w-8 h-6 object-cover rounded shadow-sm" 
              />
            ) : null}
            <div className="flex items-baseline gap-2">
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <span className="text-3xl md:text-4xl font-bold">
                  {formatAmountNoDecimals(balance)}
                </span>
              )}
              <span className="text-primary-foreground/70 text-lg">{currency}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setHidden(!hidden)}
          className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
        >
          {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

        <div className="flex gap-3">
          <Button
            onClick={onDeposit}
            className="flex-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 h-11"
          >
            <ArrowDownCircle className="w-4 h-4 mr-2" />
            Deposit
          </Button>
          <Button
            onClick={onSend}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground border-0 h-11 font-semibold"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
          <Button
            onClick={onConvert}
            className="flex-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 h-11"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Convert
          </Button>
        </div>
    </motion.div>
  );
};
