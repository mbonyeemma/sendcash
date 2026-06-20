import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { getProfit } from "@/services/admin";
import { PageHeader } from "@/components/Layout";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Spinner, Table, THead, TBody, TR, TH, TD, EmptyState, PageError } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function Profits() {
  const [range, setRange] = useState({ from_date: "", to_date: "" });
  const [applied, setApplied] = useState(range);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["profit", applied],
    queryFn: () => getProfit(applied).then((r) => r.data),
  });

  if (isError) return <PageError message="Failed to load profit report." />;

  const totals = data?.totals || {};
  const byType = data?.by_type || [];
  const byCurrency = data?.by_currency || [];

  return (
    <div>
      <PageHeader title="Profits" description="Fees collected (gross), provider costs, and net profit." />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" className="w-44" value={range.from_date} onChange={(e) => setRange({ ...range, from_date: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" className="w-44" value={range.to_date} onChange={(e) => setRange({ ...range, to_date: e.target.value })} />
          </div>
          <Button size="sm" onClick={() => setApplied(range)}>
            <Search className="h-4 w-4" /> Apply
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Totals label="Gross profit (fees)" value={totals.gross_profit} accent="text-success" />
            <Totals label="Provider cost" value={totals.provider_cost} accent="text-warning" />
            <Totals label="Net profit" value={totals.net_profit} accent="text-primary" />
            <Totals label="Volume" value={totals.volume} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profit by transaction type</CardTitle>
              </CardHeader>
              <CardContent>
                {byType.length === 0 ? (
                  <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={byType.map((d) => ({ ...d, profit: Number(d.profit) }))} margin={{ left: -10, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="trans_type" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={50} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit by currency</CardTitle>
              </CardHeader>
              <CardContent>
                {byCurrency.length === 0 ? (
                  <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={byCurrency.map((d) => ({ name: d.currency || "—", value: Number(d.profit) }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {byCurrency.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Breakdown by type</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {byType.length === 0 ? (
                <EmptyState message="No transactions in this range." />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Type</TH>
                      <TH>Count</TH>
                      <TH>Volume</TH>
                      <TH>Gross profit</TH>
                      <TH>Provider cost</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {byType.map((r) => (
                      <TR key={r.trans_type}>
                        <TD className="font-medium">{r.trans_type || "—"}</TD>
                        <TD>{formatNumber(r.count, 0)}</TD>
                        <TD>{formatNumber(r.volume)}</TD>
                        <TD className="text-success">{formatNumber(r.profit)}</TD>
                        <TD className="text-warning">{formatNumber(r.provider_cost)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Totals({ label, value, accent }: { label: string; value?: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${accent || ""}`}>{formatNumber(value)}</div>
      </CardContent>
    </Card>
  );
}
