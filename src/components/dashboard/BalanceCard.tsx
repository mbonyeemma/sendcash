import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowDownCircle, ArrowUpCircle, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fiatCurrencies, getCurrencyById } from "@/data/currencies";

interface BalanceOverviewProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onSend: () => void;
}

export const BalanceOverview = ({ onDeposit, onWithdraw, onSend }: BalanceOverviewProps) => {
  const [hidden, setHidden] = useState(false);
  const balanceUGX = 9125000; // Default balance in UGX
  const ugxCurrency = getCurrencyById("ugx");

  const formatAmount = (val: number) => {
    if (hidden) return "••••••";
    return val.toLocaleString("en-UG");
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
            {ugxCurrency && (
              <img 
                src={ugxCurrency.logo} 
                alt="UGX" 
                className="w-8 h-6 object-cover rounded shadow-sm" 
              />
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-bold">
                {formatAmount(balanceUGX)}
              </span>
              <span className="text-primary-foreground/70 text-lg">UGX</span>
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
          onClick={onWithdraw}
          className="flex-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 h-11"
        >
          <ArrowUpCircle className="w-4 h-4 mr-2" />
          Withdraw
        </Button>
        <Button
          onClick={onSend}
          className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground border-0 h-11 font-semibold"
        >
          <Send className="w-4 h-4 mr-2" />
          Send
        </Button>
      </div>
    </motion.div>
  );
};
