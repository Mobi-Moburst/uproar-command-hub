// Admin actions: invite a new user (by email) or delete an existing user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "user" | "view_only";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "invite" | "delete" | undefined;

    if (action === "invite") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const role = (body.role ?? "user") as AppRole;
      if (!email || !email.includes("@")) {
        return json({ error: "Valid email required" }, 400);
      }
      if (!["admin", "user", "view_only"].includes(role)) {
        return json({ error: "Invalid role" }, 400);
      }

      const redirectTo =
        body.redirectTo ??
        req.headers.get("origin") ??
        "https://uproar-command-hub.lovable.app";

      const { data: invited, error: inviteErr } =
        await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (inviteErr || !invited?.user) {
        return json({ error: inviteErr?.message ?? "Invite failed" }, 400);
      }

      // Replace default 'user' role assigned by trigger with the requested role.
      await admin.from("user_roles").delete().eq("user_id", invited.user.id);
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: invited.user.id, role });
      if (roleErr) {
        return json({ error: `Invited but role failed: ${roleErr.message}` }, 500);
      }

      return json({ ok: true, user_id: invited.user.id });
    }

    if (action === "delete") {
      const targetId = String(body.user_id ?? "");
      if (!targetId) return json({ error: "user_id required" }, 400);
      if (targetId === userData.user.id) {
        return json({ error: "You can't delete your own account." }, 400);
      }

      const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
      if (delErr) return json({ error: delErr.message }, 400);
      // profiles + user_roles cascade via FK to auth.users, but clean up
      // defensively in case cascade isn't set.
      await admin.from("user_roles").delete().eq("user_id", targetId);
      await admin.from("profiles").delete().eq("id", targetId);

      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-manage-users error:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
