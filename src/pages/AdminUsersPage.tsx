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
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    // Remove all existing roles, then insert the new single role.
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
        </header>

        <section className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
          <div className="grid grid-cols-[1.5fr_2fr_1.2fr_1fr] gap-4 border-b border-[rgba(255,255,255,0.06)] px-6 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div>Name</div>
            <div>Email</div>
            <div>Current role</div>
            <div className="text-right">Change to</div>
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
                className="grid grid-cols-[1.5fr_2fr_1.2fr_1fr] items-center gap-4 border-b border-[rgba(255,255,255,0.04)] px-6 py-4 last:border-0"
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
    </DashboardLayout>
  );
}
