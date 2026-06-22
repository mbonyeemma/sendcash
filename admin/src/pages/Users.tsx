import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, KeyRound, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getUsers, getOverview, resetUserPassword, deleteUser, getUserBalances, User } from "@/services/admin";
import { PageHeader } from "@/components/Layout";
import {
  Button,
  Card,
  CardContent,
  Input,
  Spinner,
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

const PAGE_SIZE = 20;

export default function Users() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(0);
  const [balancesFor, setBalancesFor] = useState<string | null>(null);

  const overview = useQuery({ queryKey: ["overview"], queryFn: () => getOverview().then((r) => r.data) });

  const { data, isLoading } = useQuery({
    queryKey: ["users", applied, page],
    queryFn: () =>
      getUsers({ username: applied || undefined, limit: PAGE_SIZE, offset: page * PAGE_SIZE }).then((r) => r.data || []),
  });

  const applySearch = () => {
    setPage(0);
    setApplied(search);
  };

  const balances = useQuery({
    queryKey: ["user-balances", balancesFor],
    queryFn: () => getUserBalances(balancesFor!).then((r) => r.data || []),
    enabled: !!balancesFor,
  });

  const rows = data || [];

  const onReset = async (u: User) => {
    if (!confirm(`Reset password for ${u.username}? They will be emailed a new password.`)) return;
    try {
      await resetUserPassword(u.user_id);
      toast.success("Password reset and emailed.");
    } catch {
      /* handled */
    }
  };

  const onDelete = async (u: User) => {
    if (!confirm(`Delete user ${u.username}? This cannot be undone.`)) return;
    try {
      await deleteUser(u.user_id);
      toast.success("User deleted.");
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch {
      /* handled */
    }
  };

  return (
    <div>
      <PageHeader title="Users" description="Manage platform users." />

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total users" value={formatNumber(overview.data?.users.total ?? 0, 0)} />
        <SummaryCard label="New (30 days)" value={formatNumber(overview.data?.users.new_30d ?? 0, 0)} accent="text-success" />
        <SummaryCard label="Wallets" value={formatNumber(overview.data?.wallets.total ?? 0, 0)} />
      </div>

      <Card className="mb-4">
        <CardContent className="flex items-end gap-3 p-4">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Search by username</label>
            <Input placeholder="username" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applySearch()} />
          </div>
          <Button size="sm" onClick={applySearch}>
            <Search className="h-4 w-4" /> Search
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
            <EmptyState message="No users found." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>User</TH>
                  <TH>Email</TH>
                  <TH>Phone</TH>
                  <TH>Country</TH>
                  <TH>Joined</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((u) => (
                  <TR key={u.user_id}>
                    <TD>
                      <div className="font-medium">{u.full_name || u.username}</div>
                      <div className="text-xs text-muted-foreground">@{u.username} {u.is_merchant ? <Badge variant="default" className="ml-1">merchant</Badge> : null}</div>
                    </TD>
                    <TD className="text-sm">{u.email}</TD>
                    <TD className="text-sm">{u.phone_number || "—"}</TD>
                    <TD className="text-sm">{u.country_code || "—"}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(u.created_at)}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="View balances" onClick={() => setBalancesFor(u.user_id)}>
                          <Wallet className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Reset password" onClick={() => onReset(u)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" className="text-destructive" onClick={() => onDelete(u)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TD>
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
              total={applied ? undefined : overview.data?.users.total}
              onPage={setPage}
            />
          )}
        </CardContent>
      </Card>

      {balancesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setBalancesFor(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <Card className="relative z-10 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5">
              <h3 className="mb-3 font-semibold">Wallet balances · {shortId(balancesFor)}</h3>
              {balances.isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (balances.data || []).length === 0 ? (
                <EmptyState message="No wallets for this user." />
              ) : (
                <div className="space-y-2">
                  {(balances.data || []).map((w: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <span className="font-medium">{w.asset || w.currency || w.chain}</span>
                      <span>{w.balance ?? w.amount ?? 0}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" className="mt-4 w-full" onClick={() => setBalancesFor(null)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
