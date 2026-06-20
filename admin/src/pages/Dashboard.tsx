import { useQuery } from "@tanstack/react-query";
import { Users, ArrowLeftRight, TrendingUp, Wallet, Clock, DollarSign } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getOverview, getTimeseries } from "@/services/admin";
import { PageHeader } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, Spinner, PageError } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent || "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="truncate text-xl font-bold">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => getOverview().then((r) => r.data) });
  const ts = useQuery({ queryKey: ["timeseries", 30], queryFn: () => getTimeseries(30).then((r) => r.data) });

  if (overview.isError) return <PageError message="Failed to load dashboard metrics." />;

  const o = overview.data;
  const txSeries = (ts.data?.transactions || []).map((d) => ({
    day: String(d.day).slice(5),
    volume: Number(d.volume),
    profit: Number(d.profit),
    count: Number(d.count),
  }));
  const signupSeries = (ts.data?.signups || []).map((d) => ({ day: String(d.day).slice(5), count: Number(d.count) }));

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform overview at a glance." />

      {overview.isLoading || !o ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Total profit" value={formatNumber(o.profit.total)} sub={`Today: ${formatNumber(o.profit.today)}`} icon={DollarSign} accent="bg-success/15 text-success" />
            <StatCard label="Transaction volume" value={formatNumber(o.volume.total)} icon={TrendingUp} />
            <StatCard label="Transactions" value={formatNumber(o.transactions.total, 0)} sub={`${formatNumber(o.transactions.completed, 0)} completed`} icon={ArrowLeftRight} />
            <StatCard label="Users" value={formatNumber(o.users.total, 0)} sub={`+${formatNumber(o.users.new_30d, 0)} in 30d`} icon={Users} />
            <StatCard label="Pending transactions" value={formatNumber(o.transactions.pending, 0)} icon={Clock} accent="bg-warning/15 text-warning" />
            <StatCard label="Wallets" value={formatNumber(o.wallets.total, 0)} icon={Wallet} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Volume & profit (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartFrame loading={ts.isLoading} empty={txSeries.length === 0}>
                  <AreaChart data={txSeries} margin={{ left: -10, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={50} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="volume" stroke="hsl(var(--primary))" fill="url(#vol)" name="Volume" />
                    <Area type="monotone" dataKey="profit" stroke="hsl(var(--success))" fillOpacity={0} name="Profit" />
                  </AreaChart>
                </ChartFrame>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>New signups (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartFrame loading={ts.isLoading} empty={signupSeries.length === 0}>
                  <BarChart data={signupSeries} margin={{ left: -10, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Signups" />
                  </BarChart>
                </ChartFrame>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function ChartFrame({ loading, empty, children }: { loading: boolean; empty: boolean; children: any }) {
  if (loading)
    return (
      <div className="flex h-[260px] items-center justify-center">
        <Spinner />
      </div>
    );
  if (empty) return <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">No data yet</div>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      {children}
    </ResponsiveContainer>
  );
}
