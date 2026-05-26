import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export type AppRole = "admin" | "user" | "view_only";

export function useMyRoles() {
  const { user } = useAuthContext();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const primaryRole: AppRole = roles.includes("admin")
    ? "admin"
    : roles.includes("user")
      ? "user"
      : roles.includes("view_only")
        ? "view_only"
        : "user";

  return {
    roles,
    primaryRole,
    isAdmin: roles.includes("admin"),
    isViewOnly: roles.includes("view_only") && !roles.includes("admin") && !roles.includes("user"),
    loading,
  };
}

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  user: "User",
  view_only: "View only",
};
