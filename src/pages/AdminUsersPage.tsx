import { useEffect, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles, type AppRole, ROLE_LABEL } from "@/hooks/useMyRoles";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminUser {
  id: string;
  email: string | null;
  display_name: string;
  roles: AppRole[];
  created_at: string;
}

function rolePriority(roles: AppRole[]): AppRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("user")) return "user";
  if (roles.includes("view_only")) return "view_only";
  return "user";
}

export default function AdminUsersPage() {
  const { user } = useAuthContext();
  const { isAdmin, loading: rolesLoading } = useMyRoles();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("user");
  const [inviting, setInviting] = useState(false);

  // Delete confirm state
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("admin-list-users");
    if (error) {
      toast.error("Failed to load users");
      setUsers([]);
      return;
    }
    setUsers(data.users ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!rolesLoading && !isAdmin) {
    return <Navigate to="/account" replace />;
  }

  const changeRole = async (target: AdminUser, nextRole: AppRole) => {
    if (target.id === user?.id && nextRole !== "admin") {
      toast.error("You can't remove your own admin role.");
      return;
    }
    setUpdatingId(target.id);
    const { error: delErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", target.id);
    if (delErr) {
      setUpdatingId(null);
      toast.error(delErr.message);
      return;
    }
    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: target.id, role: nextRole });
    setUpdatingId(null);
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    setUsers((prev) =>
      prev?.map((u) => (u.id === target.id ? { ...u, roles: [nextRole] } : u)) ?? null,
    );
    toast.success(`Updated ${target.email} to ${ROLE_LABEL[nextRole]}`);
  };

  const inviteUser = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setInviting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-users", {
      body: { action: "invite", email, role: inviteRole, redirectTo: window.location.origin },
    });
    setInviting(false);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? "Invite failed");
      return;
    }
    toast.success(`Invite sent to ${email}`);
    setInviteEmail("");
    setInviteRole("user");
    setInviteOpen(false);
    load();
  };

  const deleteUser = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-users", {
      body: { action: "delete", user_id: confirmDelete.id },
    });
    setDeleting(false);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? "Delete failed");
      return;
    }
    toast.success(`Removed ${confirmDelete.email}`);
    setUsers((prev) => prev?.filter((u) => u.id !== confirmDelete.id) ?? null);
    setConfirmDelete(null);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link to="/account" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to account
            </Link>
            <h1 className="mt-2 flex items-center gap-2 text-4xl font-bold tracking-tight text-foreground">
              <ShieldCheck className="h-7 w-7 text-[#b9e045]" />
              User Management
            </h1>
            <p className="mt-2 text-sm text-muted-foreground font-mono">
              Set access levels for everyone with a dashboard account.
            </p>
          </div>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a new user</DialogTitle>
                <DialogDescription>
                  We'll email them a sign-in link. They'll appear here once they accept.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inviteEmail">Email</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="name@moburst.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="view_only">View only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={inviting}>
                  Cancel
                </Button>
                <Button onClick={inviteUser} disabled={inviting}>
                  {inviting ? "Sending..." : "Send invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <section className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
          <div className="grid grid-cols-[1.4fr_1.8fr_1fr_1fr_60px] gap-4 border-b border-[rgba(255,255,255,0.06)] px-6 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div>Name</div>
            <div>Email</div>
            <div>Current role</div>
            <div className="text-right">Change to</div>
            <div></div>
          </div>

          {!users && (
            <div className="space-y-2 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {users && users.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No users found.</div>
          )}

          {users?.map((u) => {
            const role = rolePriority(u.roles);
            const isSelf = u.id === user?.id;
            return (
              <div
                key={u.id}
                className="grid grid-cols-[1.4fr_1.8fr_1fr_1fr_60px] items-center gap-4 border-b border-[rgba(255,255,255,0.04)] px-6 py-4 last:border-0"
              >
                <div className="flex items-center gap-2 text-sm text-foreground">
                  {u.display_name || "—"}
                  {isSelf && (
                    <span className="rounded-full bg-[#b9e045]/15 px-2 py-0.5 text-[10px] font-medium text-[#b9e045]">
                      You
                    </span>
                  )}
                </div>
                <div className="truncate text-sm text-muted-foreground">{u.email}</div>
                <div>
                  <span className="inline-flex items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-xs text-foreground">
                    {ROLE_LABEL[role]}
                  </span>
                </div>
                <div className="flex justify-end">
                  <Select
                    value={role}
                    onValueChange={(v) => changeRole(u, v as AppRole)}
                    disabled={updatingId === u.id}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="view_only">View only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-30"
                    disabled={isSelf}
                    title={isSelf ? "You can't delete your own account" : "Remove user"}
                    onClick={() => setConfirmDelete(u)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-2">Permission tiers</p>
          <ul className="space-y-1.5">
            <li><span className="text-foreground">Admin</span> — full access, can manage users and roles.</li>
            <li><span className="text-foreground">User</span> — standard dashboard access (read + write where applicable).</li>
            <li><span className="text-foreground">View only</span> — read-only access; cannot edit data.</li>
          </ul>
          <p className="mt-3">
            Note: view-only enforcement on existing pages is wired through the role API and can be applied page-by-page as needed.
          </p>
        </section>

        <div>
          <Button variant="ghost" size="sm" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.email} will lose access immediately. Their profile and role
              assignments will be deleted. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing..." : "Remove user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
