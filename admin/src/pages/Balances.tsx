import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Smartphone, Link2, Layers, AlertTriangle } from "lucide-react";
import { getBaseStablecoinBalances, getRelworxBalance, getTreasuryBalances } from "@/services/admin";
import { PageHeader } from "@/components/Layout";
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner, Badge, EmptyState } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

export default function Balances() {
  const relworx = useQuery({ queryKey: ["relworx-balance"], queryFn: () => getRelworxBalance().then((r) => r.data) });
  const treasury = useQuery({ queryKey: ["treasury-balance"], queryFn: () => getTreasuryBalances().then((r) => r.data || []) });
  const base = useQuery({ queryKey: ["base-stables"], queryFn: () => getBaseStablecoinBalances().then((r) => r.data) });

  const refreshAll = () => {
    relworx.refetch();
    treasury.refetch();
    base.refetch();
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {relworx.data.balances.map((b) => (
                  <div key={b.currency} className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground">{b.currency}</div>
                    {b.success === false || (b.balance == null && b.message) ? (
                      <div className="mt-1 text-sm text-destructive" title={b.message}>
                        {b.message || "Unavailable"}
                      </div>
                    ) : (
                      <div className="mt-1 text-xl font-bold">
                        {formatNumber(b.balance)} <span className="text-sm font-normal text-muted-foreground">{b.currency}</span>
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

      {/* Base / stablecoins */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Base (stablecoins)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {base.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : base.isError || !base.data ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-warning" /> Could not load Base balances.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">USDC</div>
                <div className="mt-1 text-xl font-bold">
                  {formatNumber(base.data.usdc_onramp_source, 4)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">USDC</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Onramp Source only</div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">USDT</div>
                <div className="mt-1 text-xl font-bold">
                  {formatNumber(base.data.usdt, 4)} <span className="text-sm font-normal text-muted-foreground">USDT</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Base</div>
              </div>
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
