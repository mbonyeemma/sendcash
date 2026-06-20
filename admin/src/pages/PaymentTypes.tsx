import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { getPaymentTypes, createPaymentType, updatePaymentType, deletePaymentType, PaymentType } from "@/services/admin";
import { PageHeader } from "@/components/Layout";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
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
} from "@/components/ui";
import { formatNumber } from "@/lib/utils";

const empty: Partial<PaymentType> = {
  type: "",
  country: "",
  currency: "",
  operation: "",
  fee: 0,
  fee_type: "FLAT",
  min_amount: 0,
  max_amount: 0,
  status: "active",
};

export default function PaymentTypes() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<PaymentType> | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["payment-types"], queryFn: () => getPaymentTypes().then((r) => r.data || []) });
  const rows = data || [];

  const save = async () => {
    if (!editing) return;
    try {
      if (editing.id) await updatePaymentType(String(editing.id), editing);
      else await createPaymentType(editing);
      toast.success("Saved.");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["payment-types"] });
    } catch {
      /* handled */
    }
  };

  const remove = async (pt: PaymentType) => {
    if (!confirm(`Delete payment type "${pt.type}"?`)) return;
    try {
      await deletePaymentType(String(pt.id));
      toast.success("Deleted.");
      qc.invalidateQueries({ queryKey: ["payment-types"] });
    } catch {
      /* handled */
    }
  };

  return (
    <div>
      <PageHeader
        title="Payment Types"
        description="Fees and limits per operation/country/currency."
        action={
          <Button size="sm" onClick={() => setEditing({ ...empty })}>
            <Plus className="h-4 w-4" /> New
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState message="No payment types configured." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Type</TH>
                  <TH>Operation</TH>
                  <TH>Country</TH>
                  <TH>Currency</TH>
                  <TH>Fee</TH>
                  <TH>Limits</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((pt) => (
                  <TR key={pt.id}>
                    <TD className="font-medium">{pt.type}</TD>
                    <TD>{pt.operation}</TD>
                    <TD>{pt.country}</TD>
                    <TD>{pt.currency}</TD>
                    <TD>
                      {formatNumber(pt.fee)} {pt.fee_type === "PERCENTAGE" ? "%" : "flat"}
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {formatNumber(pt.min_amount)} – {formatNumber(pt.max_amount)}
                    </TD>
                    <TD>
                      <StatusBadge status={pt.status} />
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(pt)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(pt)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <Card className="relative z-10 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5">
              <h3 className="mb-4 font-semibold">{editing.id ? "Edit" : "New"} payment type</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type"><Input value={editing.type || ""} onChange={(e) => setEditing({ ...editing, type: e.target.value })} /></Field>
                <Field label="Operation"><Input value={editing.operation || ""} onChange={(e) => setEditing({ ...editing, operation: e.target.value })} /></Field>
                <Field label="Country"><Input value={editing.country || ""} onChange={(e) => setEditing({ ...editing, country: e.target.value })} /></Field>
                <Field label="Currency"><Input value={editing.currency || ""} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} /></Field>
                <Field label="Fee"><Input type="number" value={editing.fee ?? 0} onChange={(e) => setEditing({ ...editing, fee: Number(e.target.value) })} /></Field>
                <Field label="Fee type">
                  <Select value={editing.fee_type} onChange={(e) => setEditing({ ...editing, fee_type: e.target.value as any })}>
                    <option value="FLAT">FLAT</option>
                    <option value="PERCENTAGE">PERCENTAGE</option>
                  </Select>
                </Field>
                <Field label="Min amount"><Input type="number" value={editing.min_amount ?? 0} onChange={(e) => setEditing({ ...editing, min_amount: Number(e.target.value) })} /></Field>
                <Field label="Max amount"><Input type="number" value={editing.max_amount ?? 0} onChange={(e) => setEditing({ ...editing, max_amount: Number(e.target.value) })} /></Field>
                <Field label="Status">
                  <Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </Select>
                </Field>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={save}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
