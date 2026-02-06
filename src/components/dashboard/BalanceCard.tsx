import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowDownCircle, Send, ArrowLeftRight, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getCurrencyById } from "@/data/currencies";
import { xrplService } from "@/services/xrplService";
import { useXRPLWallet } from "@/contexts/XRPLWalletContext";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface BalanceOverviewProps {
  onDeposit: () => void;
  onSend: () => void;
  onSwap: () => void;
  onBalanceUpdate?: () => void;
  /** When this value changes, balance is refetched (e.g. after a swap). */
  refreshTrigger?: number;
}

export const BalanceOverview = ({ onDeposit, onSend, onSwap, onBalanceUpdate, refreshTrigger }: BalanceOverviewProps) => {
  const [hidden, setHidden] = useState(false);
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { isConnected, address, network } = useXRPLWallet();
  const currency = "RLUSD"; // Always show RLUSD
  const currencyId = "rlusd";
  const currencyInfo = getCurrencyById(currencyId) || getCurrencyById("rlusd");

  useEffect(() => {
    fetchBalance();
  }, [isConnected, address, network]);

  // Refetch when parent signals (e.g. after swap)
  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0) {
      fetchBalance();
    }
  }, [refreshTrigger]);

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
      console.log("Fetching balance for:", address, "Network:", network);
      
      if (isConnected && address) {
        // Fetch RLUSD balance from XRPL
        const xrplBalances = await xrplService.getAccountBalances(address, "Mainnet");
        console.log("XRPL Balances:", xrplBalances);
        
        // Find RLUSD balance
        const rlusdBalance = xrplBalances.find(b => 
          xrplService.formatCurrency(b.currency) === "RLUSD" || 
          b.currency === "RLUSD"
        );
        
        console.log("RLUSD Balance found:", rlusdBalance);
        
        if (rlusdBalance) {
          setBalance(rlusdBalance.value);
          console.log("Setting balance to:", rlusdBalance.value);
        } else {
          console.log("No RLUSD balance found, setting to 0");
          setBalance("0");
        }
      } else {
        console.log("Wallet not connected");
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
    return numVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 md:p-8 text-primary-foreground shadow-xl"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <p className="text-primary-foreground/70 text-sm font-medium mb-1">Cash-Out & Cash-In</p>
          {!isConnected ? (
            <div className="space-y-2">
              <p className="text-primary-foreground/90 text-sm">Wallet not connected</p>
              <p className="text-xs text-primary-foreground/60">
                Connect your GemWallet to view your RLUSD balance
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {currencyInfo ? (
                <img 
                  src={currencyInfo.logo} 
                  alt={currency} 
                  className="w-8 h-6 object-contain rounded" 
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
          )}
          {isConnected && address && (
            <p className="text-xs text-primary-foreground/60 mt-2">
              {address.slice(0, 8)}...{address.slice(-6)} • Mainnet
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchBalance}
            disabled={isLoading || !isConnected}
            className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors disabled:opacity-50"
            title="Refresh balance"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setHidden(!hidden)}
            className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
          >
            {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={onDeposit}
            className="flex-1 min-w-[100px] bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 h-11"
          >
            <ArrowDownCircle className="w-4 h-4 mr-2" />
            Cash-In
          </Button>
          <Button
            onClick={onSwap}
            className="flex-1 min-w-[100px] bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 h-11"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Swap
          </Button>
          <Button
            onClick={onSend}
            className="flex-1 min-w-[100px] bg-accent hover:bg-accent/90 text-accent-foreground border-0 h-11 font-semibold"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
    </motion.div>
  );
};
