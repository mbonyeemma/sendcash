import { useState, useMemo, useEffect, useCallback } from "react";
import { ArrowDownCircle, ArrowUpCircle, Send, Filter, Search, Loader2, X, ExternalLink, RefreshCw, LifeBuoy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { walletApi, supportApi } from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// Helper function to map API transaction to UI transaction
const mapApiTransactionToUI = (apiTx: any): Transaction => {
  const txType = (apiTx.trans_type || apiTx.type || apiTx.tx_type || "").toLowerCase();
  const type =
    txType.includes("onramp") || txType.includes("deposit") ? "deposit" :
    txType.includes("offramp") || txType.includes("withdraw") ? "withdrawal" :
    txType.includes("send") || txType.includes("transfer") ? "send" :
    txType.includes("receive") ? "receive" :
    (apiTx.cr_wallet_id && apiTx.dr_wallet_id) ? "send" : "deposit";

  const apiStatus = (apiTx.status || "").toUpperCase();
  const status =
    apiStatus === "SUCCESS" || apiStatus === "COMPLETED" ? "completed" :
    apiStatus === "PENDING" ||
    apiStatus === "PENDING_RLUSD" ||
    apiStatus === "PENDING_BASE_USDC" ||
    apiStatus === "PENDING_ONRAMP" ||
    apiStatus === "INPROGRESS" ||
    apiStatus === "RECEIVED" ||
    apiStatus === "SENT" ? "pending" :
    "failed";

  const description = apiTx.narration || apiTx.description || apiTx.remarks || apiTx.trans_type || "Transaction";

  let formattedDate = apiTx.created_on || apiTx.created_at || apiTx.date || new Date().toISOString();
  if (formattedDate && typeof formattedDate === "string") {
    try {
      const date = new Date(formattedDate);
      if (!isNaN(date.getTime())) formattedDate = date.toLocaleString();
    } catch {
      // keep original
    }
  }

  return {
    id: String(apiTx.id ?? apiTx.trans_id ?? Math.random().toString()),
    type: type as Transaction["type"],
    amount: Math.abs(parseFloat(apiTx.amount || "0")),
    currency: (apiTx.currency || "UGX").toUpperCase(),
    description,
    date: formattedDate,
    status: status as Transaction["status"],
  };
};

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
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

/** Infer blockchain network from stored chain or transaction metadata */
function resolveTxChain(raw: any): "base" | "xrpl" {
  const stored = String(raw?.chain || "").toLowerCase();
  if (stored === "base" || stored === "xrpl") return stored;
  const t = String(raw?.trans_type || "").toLowerCase();
  if (t.includes("base") || t.includes("usdc_onramp")) return "base";
  const dest = String(raw?.destination_address || "");
  if (/^0x[a-fA-F0-9]{40}$/.test(dest)) return "base";
  return "xrpl";
}

function chainLabel(chain: "base" | "xrpl"): string {
  return chain === "base" ? "Base" : "XRPL";
}

/** Format API trans_type for table display */
const formatTransType = (transType: string | undefined): string => {
  if (!transType) return "—";
  const t = String(transType).toLowerCase().replace(/_/g, " ");
  if (t.includes("onramp")) return "Onramp";
  if (t.includes("offramp")) return "Offramp";
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Description for table: hide raw DEST:address, show friendly label */
const formatDescription = (description: string | undefined, transType: string | undefined): string => {
  const d = (description || "").trim();
  if (d.startsWith("DEST:")) return "Buy RLUSD";
  const t = (transType || "").toLowerCase();
  if (t.includes("onramp") && !d) return "Buy RLUSD";
  return d || "—";
};

const ITEMS_PER_PAGE = 10;

function formatReceiverPhone(accountNumber: string | undefined | null): string {
  if (!accountNumber) return "—";
  const digits = accountNumber.replace(/\D/g, "");
  if (digits.startsWith("256") && digits.length >= 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (accountNumber.startsWith("+")) return accountNumber;
  return accountNumber;
}

interface StatementViewProps {
  refreshTrigger?: number;
}

export const StatementView = ({ refreshTrigger = 0 }: StatementViewProps) => {
  const [filter, setFilter] = useState<TransactionType>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedRaw, setSelectedRaw] = useState<any | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);

  const handleSendToSupport = async () => {
    const transId = selectedRaw?.trans_id ?? selectedTx?.id;
    if (!supportMessage.trim()) {
      toast.error("Please describe the issue.");
      return;
    }
    try {
      setSupportSubmitting(true);
      const res = await supportApi.createTicket({
        message: supportMessage.trim(),
        trans_id: transId ? String(transId) : undefined,
        subject: transId ? `Transaction ${transId}` : "Support request",
      });
      if (res.status === 200) {
        toast.success(`Sent to support${res.data?.ticket_ref ? ` (${res.data.ticket_ref})` : ""}. We'll get back to you.`);
        setSupportMessage("");
        setSupportOpen(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send your message.");
    } finally {
      setSupportSubmitting(false);
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatement = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const response = await walletApi.getStatement();

      let transactionsArray: any[] = [];

      if (response.data) {
        if (Array.isArray(response.data)) {
          transactionsArray = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          transactionsArray = response.data.data;
        } else if (response.data.transactions && Array.isArray(response.data.transactions)) {
          transactionsArray = response.data.transactions;
        }
      }

      if (transactionsArray.length > 0) {
        const mappedTransactions = transactionsArray.map(mapApiTransactionToUI);
        setTransactions(mappedTransactions);
        setRawTransactions(transactionsArray);
      } else {
        setTransactions([]);
        setRawTransactions([]);
      }
    } catch (error: any) {
      console.error("Statement fetch error:", error);
      toast.error(error.message || "Failed to fetch transactions");
      setTransactions([]);
      setRawTransactions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchStatement(true);
    }
  }, [refreshTrigger, fetchStatement]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const raw = rawTransactions.find((r) => String(r.id ?? r.trans_id) === tx.id);
      const receiver = raw?.account_number || "";
      const matchesType = filter === "all" || tx.type === filter;
      const matchesSearch =
        tx.description.toLowerCase().includes(search.toLowerCase()) ||
        tx.currency.toLowerCase().includes(search.toLowerCase()) ||
        tx.id.toLowerCase().includes(search.toLowerCase()) ||
        receiver.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
      return matchesType && matchesSearch && matchesStatus;
    });
  }, [transactions, rawTransactions, filter, search, statusFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const openDetail = (tx: Transaction) => {
    setSelectedTx(tx);
    const raw = rawTransactions.find(
      (r) => String(r.id || r.trans_id) === tx.id
    ) || null;
    setSelectedRaw(raw);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
          <p className="text-muted-foreground">View all your wallet transactions</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fetchStatement(true)}
          disabled={isRefreshing}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search transactions..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => {
            setFilter(v as TransactionType);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
              <SelectItem value="send">Send</SelectItem>
              <SelectItem value="receive">Receive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => {
            setStatusFilter(v);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead className="w-[100px]">Trans type</TableHead>
                  <TableHead className="w-[72px]">Network</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((tx) => {
                  const Icon = typeIcons[tx.type];
                  const raw = rawTransactions.find((r) => String(r.id ?? r.trans_id) === tx.id);
                  const assetAmount = raw?.asset_amount != null ? parseFloat(String(raw.asset_amount)) : null;
                  const asset = raw?.asset || null;
                  const transType = raw?.trans_type;
                  const txChain = resolveTxChain(raw);
                  const description = formatDescription(tx.description, transType);
                  return (
                    <TableRow
                      key={tx.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(tx)}
                    >
                      <TableCell>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeColors[tx.type]}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">{formatTransType(transType)}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                            txChain === "base"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          )}
                        >
                          {chainLabel(txChain)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{description}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground whitespace-nowrap">
                          {formatReceiverPhone(raw?.account_number)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{tx.date}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className={`font-semibold ${
                            tx.type === "deposit" || tx.type === "receive"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground"
                          }`}>
                            {tx.type === "deposit" || tx.type === "receive" ? "+" : "-"}
                            {tx.amount.toLocaleString()} {tx.currency}
                          </p>
                          {assetAmount != null && asset && (
                            <p className="text-xs text-muted-foreground">
                              {assetAmount.toLocaleString()} {asset}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[tx.status]}`}>
                          {tx.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <PaginationItem key={page}>
                            <span className="px-3 py-2">...</span>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transaction detail dialog */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction details</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4 pt-2">
              {(() => {
                const txChain = resolveTxChain(selectedRaw);
                return (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Type</span>
                  <p className="font-medium capitalize">{selectedTx.type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Status</span>
                  <p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedTx.status]}`}>
                      {selectedTx.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Network</span>
                  <p className="font-medium">{chainLabel(txChain)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Amount</span>
                  <p className="font-semibold">
                    {selectedTx.type === "deposit" || selectedTx.type === "receive" ? "+" : "-"}
                    {selectedTx.amount.toLocaleString()} {selectedTx.currency}
                  </p>
                </div>
                {selectedRaw?.asset_amount != null && selectedRaw?.asset && (
                  <div>
                    <span className="text-muted-foreground block text-xs">Asset</span>
                    <p className="font-medium">
                      {parseFloat(String(selectedRaw.asset_amount)).toLocaleString()} {selectedRaw.asset}
                    </p>
                  </div>
                )}
                {selectedRaw?.fee != null && parseFloat(String(selectedRaw.fee)) !== 0 && (
                  <div>
                    <span className="text-muted-foreground block text-xs">Fee</span>
                    <p className="font-medium">{selectedRaw.fee} {selectedRaw.currency}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs">Narration</span>
                  <p className="font-medium">{selectedTx.description}</p>
                </div>
                {selectedRaw?.ref_id && (
                  <div>
                    <span className="text-muted-foreground block text-xs">Reference</span>
                    <p className="font-mono text-xs">{selectedRaw.ref_id}</p>
                  </div>
                )}
                {selectedRaw?.account_number && (
                  <div>
                    <span className="text-muted-foreground block text-xs">Account / Phone</span>
                    <p className="font-medium">{selectedRaw.account_number}</p>
                  </div>
                )}
                {selectedRaw?.destination_address && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-xs">
                      {txChain === "base" ? "Your wallet (Base)" : "Destination (XRPL)"}
                    </span>
                    <p className="font-mono text-xs break-all">{selectedRaw.destination_address}</p>
                  </div>
                )}
                {selectedRaw?.address_id && txChain === "base" && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-xs">Escrow address (Base)</span>
                    <p className="font-mono text-xs break-all">{selectedRaw.address_id}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs">Date</span>
                  <p className="text-muted-foreground">{selectedTx.date}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs">Transaction ID</span>
                  <p className="font-mono text-xs break-all">{selectedRaw?.trans_id ?? selectedTx.id}</p>
                </div>
                {selectedRaw?.hash && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-xs mb-1">Hash</span>
                    <a
                      href={
                        txChain === "base"
                          ? `https://basescan.org/tx/${selectedRaw.hash}`
                          : `https://xrpscan.com/tx/${selectedRaw.hash}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs break-all text-primary hover:underline flex items-center gap-1.5 group"
                      title={txChain === "base" ? "View on BaseScan" : "View on XRPScan Explorer"}
                    >
                      <span className="break-all">{selectedRaw.hash}</span>
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </div>
                )}
              </div>
                );
              })()}
              <div className="pt-4 mt-2 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSupportMessage("");
                    setSupportOpen(true);
                  }}
                >
                  <LifeBuoy className="w-4 h-4 mr-2" />
                  Send to support
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send to support */}
      <Dialog open={supportOpen} onOpenChange={(open) => !open && setSupportOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact support</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(selectedRaw?.trans_id ?? selectedTx?.id) && (
              <p className="text-sm text-muted-foreground">
                Regarding transaction{" "}
                <span className="font-mono text-foreground">{String(selectedRaw?.trans_id ?? selectedTx?.id)}</span>
              </p>
            )}
            <Textarea
              placeholder="Describe the issue with this transaction…"
              rows={5}
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSupportOpen(false)} disabled={supportSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSendToSupport} disabled={supportSubmitting || !supportMessage.trim()}>
                {supportSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
