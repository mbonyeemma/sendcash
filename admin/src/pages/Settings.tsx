import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { changePassword, getSweepSettings, getCryptoDepositAddresses, getQuoteLimits, updateQuoteLimits } from "@/services/admin";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/Layout";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Spinner,
  Badge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  EmptyState,
} from "@/components/ui";
import { shortId } from "@/lib/utils";

export default function Settings() {
  const { admin } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const sweep = useQuery({ queryKey: ["sweep-settings"], queryFn: () => getSweepSettings().then((r) => r.data) });
  const addresses = useQuery({ queryKey: ["deposit-addresses"], queryFn: () => getCryptoDepositAddresses({ limit: 100 }).then((r) => r.data || []) });
  const quoteLimits = useQuery({ queryKey: ["quote-limits"], queryFn: () => getQuoteLimits().then((r) => r.data) });

  const [qlRlusd, setQlRlusd] = useState<string>("");
  const [qlUsdc, setQlUsdc] = useState<string>("");
  const [qlUsdt, setQlUsdt] = useState<string>("");
  const [savingLimits, setSavingLimits] = useState(false);

  const submit = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters.");
    if (pw !== pw2) return toast.error("Passwords do not match.");
    setSaving(true);
    try {
      await changePassword(pw);
      toast.success("Password changed.");
      setPw("");
      setPw2("");
    } catch {
      /* handled */
    } finally {
      setSaving(false);
    }
  };

  const sweepAddresses: any[] = sweep.data?.sweep_addresses || [];

  const hydrateLimits = () => {
    const d: any = quoteLimits.data;
    if (!d) return;
    setQlRlusd(String(d.RLUSD ?? ""));
    setQlUsdc(String(d.USDC ?? ""));
    setQlUsdt(String(d.USDT ?? ""));
  };

  const saveLimits = async () => {
    setSavingLimits(true);
    try {
      const body: any = {
        RLUSD: qlRlusd ? Number(qlRlusd) : undefined,
        USDC: qlUsdc ? Number(qlUsdc) : undefined,
        USDT: qlUsdt ? Number(qlUsdt) : undefined,
      };
      await updateQuoteLimits(body);
      toast.success("Quote limits updated.");
      quoteLimits.refetch();
    } catch {
      /* handled */
    } finally {
      setSavingLimits(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Account security and platform configuration." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Signed in as {admin?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>New password</Label>
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Confirm password</Label>
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <Button onClick={submit} loading={saving}>
              Update password
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sweep configuration</CardTitle>
            <CardDescription>Configured via API environment variables.</CardDescription>
          </CardHeader>
          <CardContent>
            {sweep.isLoading ? (
              <Spinner />
            ) : (
              <div className="space-y-2 text-sm">
                <Row label="Auto sweep" value={<Badge variant={sweep.data?.auto_sweep_enabled ? "success" : "muted"}>{sweep.data?.auto_sweep_enabled ? "enabled" : "disabled"}</Badge>} />
                <Row label="Threshold" value={String(sweep.data?.sweep_threshold ?? "—")} />
                <Row label="Frequency" value={String(sweep.data?.sweep_frequency ?? "—")} />
                <Row label="Currency" value={String(sweep.data?.sweep_currency ?? "—")} />
                <Row label="Fee %" value={String(sweep.data?.sweep_fee_percentage ?? "—")} />
                {sweepAddresses.length > 0 && (
                  <div className="pt-2">
                    <div className="mb-1 text-xs font-medium text-muted-foreground">Sweep destinations</div>
                    {sweepAddresses.map((a, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border p-2 text-xs">
                        <span>
                          {a.name} · {a.network} {a.currency}
                        </span>
                        <span className="font-mono">{shortId(a.address, 8, 6)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quote limits</CardTitle>
            <CardDescription>Maximum crypto amount allowed when generating quotes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quoteLimits.isLoading ? (
              <Spinner />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label>RLUSD max</Label>
                    <Input value={qlRlusd || String(quoteLimits.data?.RLUSD ?? "")} onFocus={hydrateLimits} onChange={(e) => setQlRlusd(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>USDC max</Label>
                    <Input value={qlUsdc || String(quoteLimits.data?.USDC ?? "")} onFocus={hydrateLimits} onChange={(e) => setQlUsdc(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>USDT max</Label>
                    <Input value={qlUsdt || String(quoteLimits.data?.USDT ?? "")} onFocus={hydrateLimits} onChange={(e) => setQlUsdt(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveLimits} loading={savingLimits}>
                    Save limits
                  </Button>
                  <Button variant="outline" onClick={hydrateLimits}>
                    Reset
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User deposit addresses</CardTitle>
          <CardDescription>Per-user blockchain deposit addresses (offramp/onramp).</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {addresses.isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (addresses.data || []).length === 0 ? (
            <EmptyState message="No deposit addresses found." />
          ) : (
            <Table>
              <THead>
                <TR>
                  {Object.keys((addresses.data as any[])[0]).slice(0, 6).map((c) => (
                    <TH key={c}>{c.replace(/_/g, " ")}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {(addresses.data as any[]).map((r, i) => (
                  <TR key={i}>
                    {Object.keys((addresses.data as any[])[0])
                      .slice(0, 6)
                      .map((c) => (
                        <TD key={c} className="text-xs">
                          {typeof r[c] === "string" && r[c].length > 24 ? shortId(r[c], 10, 6) : String(r[c] ?? "—")}
                        </TD>
                      ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
