import { useQuery } from "@tanstack/react-query";
import { getReferralLeaderboard, ReferralRow } from "@/services/admin";
import { PageHeader } from "@/components/Layout";
import { Card, CardContent, Spinner, Table, THead, TBody, TR, TH, TD, EmptyState, Badge } from "@/components/ui";
import { formatNumber, shortId } from "@/lib/utils";

export default function Referrals() {
  const { data, isLoading } = useQuery({
    queryKey: ["referrals"],
    queryFn: () => getReferralLeaderboard({ limit: 200 }).then((r) => r.data || []),
  });
  const rows = data || [];

  return (
    <div>
      <PageHeader
        title="Referrals"
        description="Referral leaderboard. Reward rules (e.g. zero fees) can be configured later."
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState message="No referral activity yet." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>User</TH>
                  <TH>Code</TH>
                  <TH>Total</TH>
                  <TH>Active</TH>
                  <TH>Commission</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r: ReferralRow, i: number) => (
                  <TR key={r.user_id}>
                    <TD className="text-muted-foreground">{i + 1}</TD>
                    <TD>
                      <div className="font-medium">{r.full_name || r.username || shortId(r.user_id)}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TD>
                    <TD>
                      <Badge variant="muted" className="font-mono">{r.referral_code}</Badge>
                    </TD>
                    <TD className="font-medium">{formatNumber(r.total_referrals, 0)}</TD>
                    <TD>{formatNumber(r.active_referrals, 0)}</TD>
                    <TD className="text-success">{formatNumber(r.total_commission)}</TD>
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
