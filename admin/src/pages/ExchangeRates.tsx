import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { getExchangeRates, updateExchangeRate, ExchangeRate } from "@/services/admin";
import { PageHeader } from "@/components/Layout";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Spinner,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  EmptyState,
} from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/utils";

export default function ExchangeRates() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ExchangeRate | null>(null);
  const [rate, setRate] = useState("");
  const [markup, setMarkup] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: () => getExchangeRates().then((r) => r.data || []),
  });
  const rows = data || [];

  const openEdit = (r: ExchangeRate) => {
    setEditing(r);
    setRate(String(r.rate ?? ""));
    setMarkup(String(r.markup ?? "0"));
  };

  const save = async () => {
    if (!editing) return;
    const rateNum = Number(rate);
    if (Number.isNaN(rateNum) || rateNum <= 0) {
      toast.error("Enter a valid rate.");
      return;
    }
    try {
      setSaving(true);
      await updateExchangeRate(String(editing.id), { rate: rateNum, markup: markup === "" ? undefined : Number(markup) });
      toast.success("Rate updated.");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["exchange-rates"] });
    } catch {
      /* handled */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Exchange Rates" description="Rates used for on/off-ramp quotes. Edit the rate or markup per pair." />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState message="No exchange rates configured." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Pair</TH>
                  <TH>Rate</TH>
                  <TH>Markup</TH>
                  <TH>Effective</TH>
                  <TH>Updated</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => {
                  const effective = Number(r.rate) + Number(r.markup || 0);
                  return (
                    <TR key={r.id}>
                      <TD className="font-medium">
                        {r.from_currency} → {r.to_currency}
                      </TD>
                      <TD>{formatNumber(r.rate)}</TD>
                      <TD className="text-muted-foreground">{formatNumber(r.markup || 0)}</TD>
                      <TD className="font-medium">{formatNumber(effective)}</TD>
                      <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.updated_at)}</TD>
                      <TD>
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <Card className="relative z-10 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5">
              <h3 className="mb-1 font-semibold">
                Edit rate · {editing.from_currency} → {editing.to_currency}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                1 {editing.from_currency} = rate + markup {editing.to_currency}
              </p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Rate</Label>
                  <Input type="number" step="any" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Markup</Label>
                  <Input type="number" step="any" value={markup} onChange={(e) => setMarkup(e.target.value)} />
                </div>
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  Effective rate:{" "}
                  <span className="font-semibold">
                    {formatNumber(Number(rate || 0) + Number(markup || 0))} {editing.to_currency}
                  </span>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={save} loading={saving}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
