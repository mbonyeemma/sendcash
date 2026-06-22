import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw } from "lucide-react";
import { getTransactions, getOverview } from "@/services/admin";
import { PageHeader } from "@/components/Layout";
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Spinner,
  StatusBadge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  EmptyState,
  Badge,
  SummaryCard,
  Pagination,
} from "@/components/ui";
import { formatDate, formatNumber, shortId } from "@/lib/utils";

const STATUSES = ["", "COMPLETED", "SUCCESS", "PENDING", "PROCESSING", "FAILED", "REJECTED"];
const PAGE_SIZE = 20;

export default function Transactions() {
  const [filters, setFilters] = useState({ status: "", trans_type: "", from_date: "", to_date: "" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(0);

  const overview = useQuery({ queryKey: ["overview"], queryFn: () => getOverview().then((r) => r.data) });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["transactions", applied, page],
    queryFn: () => getTransactions({ ...applied, limit: PAGE_SIZE, offset: page * PAGE_SIZE }).then((r) => r.data || []),
  });

  const applyFilters = () => {
    setPage(0);
    setApplied(filters);
  };

  const hasFilters = !!(applied.status || applied.trans_type || applied.from_date || applied.to_date);
  const rows = data || [];

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="All wallet transactions across the platform."
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Total transactions" value={formatNumber(overview.data?.transactions.total ?? 0, 0)} />
        <SummaryCard label="Completed" value={formatNumber(overview.data?.transactions.completed ?? 0, 0)} accent="text-success" />
        <SummaryCard label="Pending" value={formatNumber(overview.data?.transactions.pending ?? 0, 0)} accent="text-warning" />
        <SummaryCard label="Volume" value={formatNumber(overview.data?.volume.total ?? 0)} />
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-40">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s || "All statuses"}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <Input className="w-40" placeholder="e.g. OFFRAMP" value={filters.trans_type} onChange={(e) => setFilters({ ...filters, trans_type: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" className="w-40" value={filters.from_date} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" className="w-40" value={filters.to_date} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })} />
          </div>
          <Button size="sm" onClick={applyFilters}>
            <Search className="h-4 w-4" /> Apply
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState message="No transactions found for these filters." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Trans ID</TH>
                  <TH>Type</TH>
                  <TH>From → To</TH>
                  <TH>Amount</TH>
                  <TH>Fee</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((t) => (
                  <TR key={t.id ?? t.trans_id}>
                    <TD className="font-mono text-xs">{shortId(t.trans_id, 8, 4)}</TD>
                    <TD>
                      <Badge variant="muted">{t.trans_type || "—"}</Badge>
                    </TD>
                    <TD className="text-xs">
                      <div>{t.sender?.username || shortId(t.user_id)}</div>
                      <div className="text-muted-foreground">→ {t.receiver?.username || shortId(t.cr_wallet_id)}</div>
                    </TD>
                    <TD className="font-medium">
                      {formatNumber(t.amount)} <span className="text-xs text-muted-foreground">{t.currency || t.asset}</span>
                    </TD>
                    <TD className="text-success">{formatNumber(t.fee)}</TD>
                    <TD>
                      <StatusBadge status={t.status} />
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(t.created_on)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          {!isLoading && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              count={rows.length}
              total={hasFilters ? undefined : overview.data?.transactions.total}
              onPage={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
