import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowDownCircle, ArrowUpCircle, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BalanceOverviewProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onSend: () => void;
}

export const BalanceOverview = ({ onDeposit, onWithdraw, onSend }: BalanceOverviewProps) => {
  const [hidden, setHidden] = useState(false);
  const balance = 2450.50; // USD equivalent

  const formatAmount = (val: number) => {
    if (hidden) return "••••••";
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 text-primary-foreground shadow-xl"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-primary-foreground/70 text-sm font-medium mb-1">Total Balance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl md:text-5xl font-bold">
              ${formatAmount(balance)}
            </span>
            <span className="text-primary-foreground/70 text-lg">USD</span>
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
          className="flex-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 h-12"
        >
          <ArrowDownCircle className="w-5 h-5 mr-2" />
          Deposit
        </Button>
        <Button
          onClick={onWithdraw}
          className="flex-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0 h-12"
        >
          <ArrowUpCircle className="w-5 h-5 mr-2" />
          Withdraw
        </Button>
        <Button
          onClick={onSend}
          className="flex-1 bg-amber-400 hover:bg-amber-500 text-amber-950 border-0 h-12 font-semibold"
        >
          <Send className="w-5 h-5 mr-2" />
          Send
        </Button>
      </div>
    </motion.div>
  );
};