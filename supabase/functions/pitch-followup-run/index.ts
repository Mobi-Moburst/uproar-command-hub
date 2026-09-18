import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getConnectionKeyForUser, markReconnectRequired } from "../_shared/appUserConnections.ts";
import { GOOGLE_MAIL_CONNECTOR_ID } from "../_shared/appUserScopes.ts";
import { getRfcMessageId, ReconnectRequiredError, sendGmail } from "../_shared/gmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
type Db = any;

async function runForUser(supabase: Db, userId: string) {
  const connectionKey = await getConnectionKeyForUser(userId, GOOGLE_MAIL_CONNECTOR_ID);
  if (!connectionKey) return { sent: 0, failed: 0, connected: false };

  const { data: prof } = await supabase
    .from("profiles")
    .select("email_signature")
    .eq("id", userId)
    .maybeSingle();
  const signature = (prof?.email_signature as string | null) ?? null;

  // Only this user's own sends, and only those still awaiting a reply.
  const { data: sends } = await supabase
    .from("pitch_sends")
    .select("id, contact_id, recipient_email, subject, gmail_message_id, gmail_thread_id")
    .eq("sender_user_id", userId)
    .eq("status", "sent")
    .limit(200);
  const sendIds = (sends ?? []).map((s: Db) => s.id);
  if (!sendIds.length) return { sent: 0, failed: 0, connected: true };

  const { data: due } = await supabase
    .from("pitch_followups")
    .select("id, send_id, step, body")
    .in("send_id", sendIds)
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50);

  let sent = 0, failed = 0;
  for (const f of due ?? []) {
    const parent = (sends ?? []).find((s: Db) => s.id === f.send_id);
    if (!parent) continue;
    try {
      // Only the earliest due step per send goes out in a single run.
      const rfcId = parent.gmail_message_id
        ? await getRfcMessageId(connectionKey, String(parent.gmail_message_id))
        : null;
      const res = await sendGmail(connectionKey, {
        to: String(parent.recipient_email),
        subject: `Re: ${parent.subject}`,
        body: String(f.body ?? ""),
        signature,
        threadId: parent.gmail_thread_id ? String(parent.gmail_thread_id) : null,
        inReplyTo: rfcId,
      });
      await supabase
        .from("pitch_followups")
        .update({ status: "sent", sent_at: new Date().toISOString(), gmail_message_id: res.id })
        .eq("id", f.id);
      sent++;
    } catch (e) {
      if (e instanceof ReconnectRequiredError) {
        await markReconnectRequired(userId, GOOGLE_MAIL_CONNECTOR_ID);
        return { sent, failed, reconnectRequired: true, connected: true };
      }
      const message = e instanceof Error ? e.message : String(e);
      console.error(`follow-up ${f.id} failed:`, message);
      await supabase
        .from("pitch_followups")
        .update({ status: "failed", cancelled_reason: message })
        .eq("id", f.id);
      failed++;
    }
  }

  return { sent, failed, connected: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Scheduled run: process every connected sender.
    const cronSecret = Deno.env.get("PITCH_CRON_SECRET");
    if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) {
      const { data: conns } = await supabase
        .from("app_user_connections")
        .select("user_id")
        .eq("connector_id", GOOGLE_MAIL_CONNECTOR_ID)
        .eq("reconnect_required", false);
      let sent = 0, failed = 0;
      for (const c of conns ?? []) {
        try {
          const r = await runForUser(supabase, String(c.user_id));
          sent += r.sent;
          failed += r.failed;
        } catch (e) {
          console.error(`cron follow-up run failed for ${c.user_id}:`, e);
        }
      }
      return json({ ok: true, mode: "cron", users: conns?.length ?? 0, sent, failed });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const result = await runForUser(supabase, user.id);
    return json({ ok: !result.reconnectRequired, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("pitch-followup-run error:", message);
    return json({ error: message }, 500);
  }
});
