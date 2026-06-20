import { useQuery } from "@tanstack/react-query";
import { getExchangeRates } from "@/services/admin";
import { PageHeader } from "@/components/Layout";
import { Card, CardContent, Spinner, Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui";

export default function ExchangeRates() {
  const { data, isLoading } = useQuery({ queryKey: ["exchange-rates"], queryFn: () => getExchangeRates().then((r) => r.data || []) });
  const rows = data || [];
  const columns = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div>
      <PageHeader title="Exchange Rates" description="Current configured exchange rates." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState message="No exchange rates found." />
          ) : (
            <Table>
              <THead>
                <TR>
                  {columns.map((c) => (
                    <TH key={c}>{c.replace(/_/g, " ")}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {rows.map((r: any, i: number) => (
                  <TR key={i}>
                    {columns.map((c) => (
                      <TD key={c} className="text-sm">
                        {String(r[c] ?? "—")}
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
