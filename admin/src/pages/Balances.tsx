import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Smartphone, Link2, AlertTriangle } from "lucide-react";
import { getRelworxBalance, getTreasuryBalances } from "@/services/admin";
import { PageHeader } from "@/components/Layout";
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner, Badge, EmptyState } from "@/components/ui";
import { formatNumber, shortId } from "@/lib/utils";

export default function Balances() {
  const relworx = useQuery({ queryKey: ["relworx-balance"], queryFn: () => getRelworxBalance().then((r) => r.data) });
  const treasury = useQuery({ queryKey: ["treasury-balance"], queryFn: () => getTreasuryBalances().then((r) => r.data || []) });

  const refreshAll = () => {
    relworx.refetch();
    treasury.refetch();
  };

  return (
    <div>
      <PageHeader
        title="Balances"
        description="Live balances on third-party accounts and platform treasury addresses."
        action={
          <Button variant="outline" size="sm" onClick={refreshAll} loading={relworx.isFetching || treasury.isFetching}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {/* Relworx */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" /> Relworx mobile money
          </CardTitle>
        </CardHeader>
        <CardContent>
          {relworx.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : relworx.isError || !relworx.data ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-warning" /> Could not load Relworx balance. Check RELWORX_* env configuration.
            </div>
          ) : (
            <>
              <div className="mb-3 text-xs text-muted-foreground">Account: <span className="font-mono">{relworx.data.account}</span></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {relworx.data.balances.map((b) => (
                  <div key={b.currency} className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">{b.currency}</div>
                    {b.error ? (
                      <div className="mt-1 text-sm text-destructive">{b.error}</div>
                    ) : (
                      <div className="mt-1 text-xl font-bold">
                        {typeof b.balance === "object" ? JSON.stringify(b.balance) : formatNumber(b.balance)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Treasury / on-chain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> Treasury & offramp custody (on-chain)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {treasury.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (treasury.data || []).length === 0 ? (
            <EmptyState message="No treasury addresses configured. Set XRPL_RLUSD_PAYOUT_ADDRESS / TREASURY_ADDRESSES in the API env." />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {(treasury.data || []).map((t) => (
                <div key={t.address} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{t.label}</div>
                      <div className="font-mono text-xs text-muted-foreground" title={t.address}>
                        {shortId(t.address, 10, 6)}
                      </div>
                    </div>
                    <Badge variant={t.activated ? "success" : "muted"}>{t.network}</Badge>
                  </div>
                  {t.error ? (
                    <div className="mt-3 text-sm text-destructive">{t.error}</div>
                  ) : !t.activated ? (
                    <div className="mt-3 text-sm text-muted-foreground">Account not activated</div>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Metric label="RLUSD" value={t.rlusd} />
                      <Metric label="XRP" value={t.xrp} />
                      {Object.entries(t.tokens || {})
                        .filter(([k]) => k.toUpperCase() !== "RLUSD")
                        .map(([k, v]) => (
                          <Metric key={k} label={k} value={v} />
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value === null || value === undefined ? "—" : formatNumber(value, 4)}</div>
    </div>
  );
}
