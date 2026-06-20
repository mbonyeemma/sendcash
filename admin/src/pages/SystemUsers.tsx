import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { getSystemUsers, createSystemUser, deleteSystemUser, resetSystemUserPassword, SystemUser } from "@/services/admin";
import { useAuth } from "@/contexts/AuthContext";
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
  Badge,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default function SystemUsers() {
  const qc = useQueryClient();
  const { admin } = useAuth();
  const [creating, setCreating] = useState<{ username: string; email: string; full_name: string } | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["system-users"], queryFn: () => getSystemUsers().then((r) => r.data || []) });
  const rows = data || [];

  const create = async () => {
    if (!creating?.username || !creating?.email) {
      toast.error("Username and email are required.");
      return;
    }
    try {
      await createSystemUser(creating);
      toast.success("Admin created. Credentials emailed.");
      setCreating(null);
      qc.invalidateQueries({ queryKey: ["system-users"] });
    } catch {
      /* handled */
    }
  };

  const remove = async (u: SystemUser) => {
    if (!confirm(`Delete admin ${u.username}?`)) return;
    try {
      await deleteSystemUser(String(u.id));
      toast.success("Admin deleted.");
      qc.invalidateQueries({ queryKey: ["system-users"] });
    } catch {
      /* handled */
    }
  };

  const reset = async (u: SystemUser) => {
    if (!confirm(`Reset password for ${u.username}? A new password will be emailed.`)) return;
    try {
      await resetSystemUserPassword(String(u.id));
      toast.success("Password reset and emailed.");
    } catch {
      /* handled */
    }
  };

  return (
    <div>
      <PageHeader
        title="System Users"
        description="Admin accounts with access to this panel."
        action={
          <Button size="sm" onClick={() => setCreating({ username: "", email: "", full_name: "" })}>
            <Plus className="h-4 w-4" /> New admin
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
            <EmptyState message="No system users." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Username</TH>
                  <TH>Email</TH>
                  <TH>Created</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium">
                      {u.full_name || "—"}
                      {String(u.id) === String(admin?.id) && <Badge className="ml-2">you</Badge>}
                    </TD>
                    <TD>@{u.username}</TD>
                    <TD className="text-sm">{u.email}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(u.created_at)}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Reset password" onClick={() => reset(u)}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          disabled={String(u.id) === String(admin?.id)}
                          title="Delete"
                          onClick={() => remove(u)}
                        >
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

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setCreating(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <Card className="relative z-10 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5">
              <h3 className="mb-1 font-semibold">New admin</h3>
              <p className="mb-4 text-sm text-muted-foreground">A random password will be generated and emailed to them.</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Full name</Label>
                  <Input value={creating.full_name} onChange={(e) => setCreating({ ...creating, full_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Username</Label>
                  <Input value={creating.username} onChange={(e) => setCreating({ ...creating, username: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={creating.email} onChange={(e) => setCreating({ ...creating, email: e.target.value })} />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreating(null)}>
                  Cancel
                </Button>
                <Button onClick={create}>Create</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
