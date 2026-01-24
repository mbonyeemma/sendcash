import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownCircle, ArrowUpCircle, Send, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type TransactionType = "all" | "deposit" | "withdrawal" | "send" | "receive";

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "send" | "receive";
  amount: number;
  currency: string;
  description: string;
  date: string;
  status: "completed" | "pending" | "failed";
}

const mockTransactions: Transaction[] = [
  { id: "1", type: "deposit", amount: 500000, currency: "UGX", description: "Mobile Money Deposit", date: "2024-01-15 14:30", status: "completed" },
  { id: "2", type: "send", amount: 50, currency: "USD", description: "Sent to +256 700 123 456", date: "2024-01-15 12:15", status: "completed" },
  { id: "3", type: "receive", amount: 100, currency: "TRON", description: "Received from TXk8rQS...", date: "2024-01-14 18:45", status: "completed" },
  { id: "4", type: "withdrawal", amount: 200000, currency: "UGX", description: "MTN Mobile Money", date: "2024-01-14 10:20", status: "completed" },
  { id: "5", type: "deposit", amount: 250, currency: "DCS", description: "Crypto Deposit", date: "2024-01-13 16:00", status: "pending" },
  { id: "6", type: "send", amount: 1000000, currency: "UGX", description: "Sent to +256 755 987 654", date: "2024-01-12 09:30", status: "completed" },
  { id: "7", type: "receive", amount: 75, currency: "XLUSD", description: "Received from XLUSDk8r...", date: "2024-01-11 22:10", status: "failed" },
];

const typeIcons = {
  deposit: ArrowDownCircle,
  withdrawal: ArrowUpCircle,
  send: Send,
  receive: ArrowDownCircle,
};

const typeColors = {
  deposit: "text-emerald-500 bg-emerald-500/10",
  withdrawal: "text-red-500 bg-red-500/10",
  send: "text-amber-500 bg-amber-500/10",
  receive: "text-primary bg-primary/10",
};

const statusColors = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
};

export const StatementView = () => {
  const [filter, setFilter] = useState<TransactionType>("all");
  const [search, setSearch] = useState("");

  const filteredTransactions = mockTransactions.filter((tx) => {
    const matchesFilter = filter === "all" || tx.type === filter;
    const matchesSearch = tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.currency.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
        <p className="text-muted-foreground">View all your wallet transactions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {(["all", "deposit", "withdrawal", "send", "receive"] as TransactionType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTransactions.map((tx, index) => {
              const Icon = typeIcons[tx.type];
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeColors[tx.type]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">{tx.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        tx.type === "deposit" || tx.type === "receive" 
                          ? "text-emerald-600" 
                          : "text-foreground"
                      }`}>
                        {tx.type === "deposit" || tx.type === "receive" ? "+" : "-"}
                        {tx.amount.toLocaleString()} {tx.currency}
                      </p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[tx.status]}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};