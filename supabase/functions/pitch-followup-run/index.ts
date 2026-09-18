import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getConnectionKeyForUser, markReconnectRequired } from "../_shared/appUserConnections.ts";
import { GOOGLE_MAIL_CONNECTOR_ID } from "../_shared/appUserScopes.ts";
import { getRfcMessageId, ReconnectRequiredError, sendGmail } from "../_shared/gmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const connectionKey = await getConnectionKeyForUser(user.id, GOOGLE_MAIL_CONNECTOR_ID);
    if (!connectionKey) return json({ ok: true, sent: 0, connected: false });

    const { data: prof } = await supabase
      .from("profiles")
      .select("email_signature")
      .eq("id", user.id)
      .maybeSingle();
    const signature = (prof?.email_signature as string | null) ?? null;

    // Only this user's own sends, and only those still awaiting a reply.
    const { data: sends } = await supabase
      .from("pitch_sends")
      .select("id, contact_id, recipient_email, subject, gmail_message_id, gmail_thread_id")
      .eq("sender_user_id", user.id)
      .eq("status", "sent")
      .limit(200);
    const sendIds = (sends ?? []).map((s) => s.id);
    if (!sendIds.length) return json({ ok: true, sent: 0 });

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
      const parent = (sends ?? []).find((s) => s.id === f.send_id);
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
          await markReconnectRequired(user.id, GOOGLE_MAIL_CONNECTOR_ID);
          return json({ ok: false, reconnectRequired: true, sent });
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

    return json({ ok: true, sent, failed });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("pitch-followup-run error:", message);
    return json({ error: message }, 500);
  }
});
