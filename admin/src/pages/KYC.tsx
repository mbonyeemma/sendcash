import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldX, Eye } from "lucide-react";
import { toast } from "sonner";
import { getKycSubmissions, getKycSubmission, reviewKyc, KycSubmission } from "@/services/admin";
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
} from "@/components/ui";
import { formatDate, shortId } from "@/lib/utils";

const STATUSES = ["pending", "verified", "rejected", ""];

export default function KYC() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [reviewId, setReviewId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["kyc", status],
    queryFn: () => getKycSubmissions({ status: status || undefined, limit: 200 }).then((r) => r.data || []),
  });

  const detail = useQuery({
    queryKey: ["kyc-detail", reviewId],
    queryFn: () => getKycSubmission(reviewId!).then((r) => r.data),
    enabled: !!reviewId,
  });

  const rows = data || [];

  const act = async (id: string, action: "approve" | "reject") => {
    let reason: string | undefined;
    if (action === "reject") {
      reason = window.prompt("Reason for rejection (shown to the user):") || undefined;
      if (!reason) return;
    }
    try {
      await reviewKyc(id, action, reason);
      toast.success(action === "approve" ? "KYC approved." : "KYC rejected.");
      setReviewId(null);
      qc.invalidateQueries({ queryKey: ["kyc"] });
    } catch {
      /* handled */
    }
  };

  return (
    <div>
      <PageHeader
        title="KYC Review"
        description="Review and approve user identity verification submissions."
        action={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? s[0].toUpperCase() + s.slice(1) : "All"}
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
            <EmptyState message="No KYC submissions for this filter." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>User</TH>
                  <TH>Document</TH>
                  <TH>Status</TH>
                  <TH>Submitted</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((s: KycSubmission) => (
                  <TR key={s.id}>
                    <TD>
                      <div className="font-medium">{s.full_name || s.username || shortId(s.user_id)}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </TD>
                    <TD className="text-sm">
                      {(s.id_document_type || "—").replace(/_/g, " ")}
                      {s.id_number ? <div className="text-xs text-muted-foreground">{s.id_number}</div> : null}
                    </TD>
                    <TD>
                      <StatusBadge status={s.status} />
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(s.submitted_at)}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => setReviewId(String(s.id))}>
                          <Eye className="h-4 w-4" /> Review
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

      {reviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setReviewId(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5">
              {detail.isLoading || !detail.data ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{detail.data.full_name || detail.data.username}</h3>
                      <p className="text-sm text-muted-foreground">{detail.data.email} · {detail.data.phone_number || "no phone"}</p>
                    </div>
                    <StatusBadge status={detail.data.status} />
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                    <Info label="Document type" value={(detail.data.id_document_type || "—").replace(/_/g, " ")} />
                    <Info label="Document number" value={detail.data.id_number || "—"} />
                    <Info label="Country" value={detail.data.country || "—"} />
                    <Info label="Submitted" value={formatDate(detail.data.submitted_at)} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ImageBlock label="ID document" src={detail.data.id_document_image} />
                    <ImageBlock label="Selfie" src={detail.data.selfie_image} />
                  </div>

                  {detail.data.status === "rejected" && detail.data.rejection_reason && (
                    <p className="mt-3 text-sm text-destructive">Rejected: {detail.data.rejection_reason}</p>
                  )}

                  <div className="mt-5 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setReviewId(null)}>
                      Close
                    </Button>
                    <Button variant="destructive" onClick={() => act(String(detail.data!.id), "reject")}>
                      <ShieldX className="h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => act(String(detail.data!.id), "approve")}>
                      <ShieldCheck className="h-4 w-4" /> Approve
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium capitalize">{value}</div>
    </div>
  );
}

function ImageBlock({ label, src }: { label: string; src?: string }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      {src ? (
        <a href={src} target="_blank" rel="noreferrer">
          <img src={src} alt={label} className="h-48 w-full rounded-lg border object-contain bg-muted/30" />
        </a>
      ) : (
        <div className="flex h-48 w-full items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
          Not provided
        </div>
      )}
    </div>
  );
}
