import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Send } from "lucide-react";
import { toast } from "sonner";
import { getSupportTickets, getSupportTicket, respondToSupportTicket, SupportTicket } from "@/services/admin";
import { PageHeader } from "@/components/Layout";
import {
  Button,
  Card,
  CardContent,
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
  Badge,
} from "@/components/ui";
import { formatDate, shortId } from "@/lib/utils";

const STATUSES = ["open", "in_progress", "closed", ""];

export default function Support() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["support", status],
    queryFn: () => getSupportTickets({ status: status || undefined, limit: 200 }).then((r) => r.data || []),
  });

  const detail = useQuery({
    queryKey: ["support-detail", openId],
    queryFn: () => getSupportTicket(openId!).then((r) => r.data),
    enabled: !!openId,
  });

  const rows = data || [];

  const submit = async (newStatus?: string) => {
    if (!openId) return;
    if (!response.trim() && !newStatus) {
      toast.error("Write a response or change the status.");
      return;
    }
    try {
      setSending(true);
      await respondToSupportTicket(openId, { response: response.trim() || undefined, status: newStatus });
      toast.success("Ticket updated.");
      setResponse("");
      setOpenId(null);
      qc.invalidateQueries({ queryKey: ["support"] });
    } catch {
      /* handled */
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Customer Support"
        description="Respond to user messages and transaction issues."
        action={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "All"}
              </option>
            ))}
          </Select>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState message="No tickets for this filter." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Ref</TH>
                  <TH>User</TH>
                  <TH>Subject</TH>
                  <TH>Transaction</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((t: SupportTicket) => (
                  <TR key={t.id}>
                    <TD className="font-mono text-xs">{t.ticket_ref}</TD>
                    <TD>
                      <div className="font-medium">{t.full_name || t.username || shortId(t.user_id)}</div>
                      <div className="text-xs text-muted-foreground">{t.email}</div>
                    </TD>
                    <TD className="max-w-[220px] truncate text-sm">{t.subject || "—"}</TD>
                    <TD className="font-mono text-xs">{t.trans_id ? shortId(t.trans_id, 8, 4) : "—"}</TD>
                    <TD>
                      <StatusBadge status={t.status} />
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(t.created_at)}</TD>
                    <TD>
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setOpenId(String(t.id)); setResponse(""); }}>
                          <Eye className="h-4 w-4" /> Open
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

      {openId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpenId(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <Card className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5">
              {detail.isLoading || !detail.data ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{detail.data.subject || "Support request"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {detail.data.ticket_ref} · {detail.data.full_name || detail.data.username} · {detail.data.email}
                      </p>
                    </div>
                    <StatusBadge status={detail.data.status} />
                  </div>

                  {detail.data.trans_id && (
                    <div className="mb-3">
                      <Badge variant="muted">Transaction {detail.data.trans_id}</Badge>
                    </div>
                  )}

                  <div className="mb-4 rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{detail.data.message}</div>

                  {detail.data.admin_response && (
                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground">Previous response</div>
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm whitespace-pre-wrap">{detail.data.admin_response}</div>
                    </div>
                  )}

                  <label className="text-sm font-medium">Response</label>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={4}
                    placeholder="Type a reply to the user…"
                    className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenId(null)}>
                      Close
                    </Button>
                    <Button variant="secondary" onClick={() => submit("closed")} loading={sending}>
                      Mark closed
                    </Button>
                    <Button onClick={() => submit()} loading={sending}>
                      <Send className="h-4 w-4" /> Send reply
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
