import { motion } from "framer-motion";
import { Eye, EyeOff, TrendingUp } from "lucide-react";
import { useState } from "react";

interface BalanceCardProps {
  currency: string;
  symbol: string;
  amount: number;
  change?: number;
  isCrypto?: boolean;
}

export const BalanceCard = ({ currency, symbol, amount, change, isCrypto }: BalanceCardProps) => {
  const [hidden, setHidden] = useState(false);

  const formatAmount = (val: number) => {
    if (hidden) return "••••••";
    return val.toLocaleString("en-US", {
      minimumFractionDigits: isCrypto ? 4 : 2,
      maximumFractionDigits: isCrypto ? 4 : 2,
    });
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{currency}</span>
        <button
          onClick={() => setHidden(!hidden)}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground">
          {symbol} {formatAmount(amount)}
        </span>
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          <TrendingUp className={`w-4 h-4 ${change >= 0 ? "text-emerald-500" : "text-red-500"}`} />
          <span className={`text-sm font-medium ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {change >= 0 ? "+" : ""}{change}%
          </span>
          <span className="text-sm text-muted-foreground">today</span>
        </div>
      )}
    </motion.div>
  );
};

interface BalanceOverviewProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onSend: () => void;
}

export const BalanceOverview = ({ onDeposit, onWithdraw, onSend }: BalanceOverviewProps) => {
  const balances = [
    { currency: "Ugandan Shilling", symbol: "UGX", amount: 2450000, change: 0 },
    { currency: "US Dollar", symbol: "USD", amount: 650.50, change: 0 },
    { currency: "TRON", symbol: "TRX", amount: 1250.5000, change: 2.4, isCrypto: true },
    { currency: "DCS Token", symbol: "DCS", amount: 500.0000, change: 1.8, isCrypto: true },
    { currency: "XLUSD", symbol: "XLUSD", amount: 100.0000, change: 0, isCrypto: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet Balance</h1>
          <p className="text-muted-foreground">Manage your funds across all currencies</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDeposit}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium shadow-sm hover:shadow-md transition-shadow"
          >
            Deposit
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onWithdraw}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors"
          >
            Withdraw
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSend}
            className="px-4 py-2 bg-amber-400 text-amber-950 rounded-xl font-medium shadow-amber-400/20 shadow-lg hover:bg-amber-500 transition-colors"
          >
            Send
          </motion.button>
        </div>
      </div>

      {/* Balance Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.map((balance, index) => (
          <motion.div
            key={balance.currency}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <BalanceCard {...balance} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};