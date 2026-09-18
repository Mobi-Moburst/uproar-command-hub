import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getConnectionKeyForUser, markReconnectRequired } from "../_shared/appUserConnections.ts";
import { GOOGLE_MAIL_CONNECTOR_ID } from "../_shared/appUserScopes.ts";
import { findThreadReply, ReconnectRequiredError } from "../_shared/gmail.ts";
import { logNote, moveTicket } from "../_shared/hubspotPitch.ts";

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
    if (!connectionKey) return json({ ok: true, checked: 0, replies: 0, connected: false });

    const { data: sends } = await supabase
      .from("pitch_sends")
      .select("id, contact_id, gmail_thread_id, sender_email, subject")
      .eq("sender_user_id", user.id)
      .eq("status", "sent")
      .not("gmail_thread_id", "is", null)
      .order("sent_at", { ascending: false })
      .limit(100);

    let replies = 0;
    for (const s of sends ?? []) {
      try {
        const reply = await findThreadReply(
          connectionKey,
          String(s.gmail_thread_id),
          String(s.sender_email ?? user.email ?? ""),
        );
        if (!reply) continue;

        await supabase
          .from("pitch_sends")
          .update({
            status: "replied",
            reply_at: reply.repliedAt ?? new Date().toISOString(),
            reply_snippet: reply.snippet,
          })
          .eq("id", s.id);

        await supabase
          .from("pitch_followups")
          .update({ status: "cancelled", cancelled_reason: "reporter replied" })
          .eq("send_id", s.id)
          .eq("status", "scheduled");

        const { data: claim } = await supabase
          .from("pitch_claims")
          .select("id")
          .eq("contact_id", s.contact_id)
          .is("released_at", null)
          .maybeSingle();
        if (claim) {
          await supabase
            .from("pitch_claims")
            .update({ released_at: new Date().toISOString(), release_reason: "reporter replied" })
            .eq("id", claim.id);
        }

        const { data: contact } = await supabase
          .from("pitch_contacts")
          .select("hubspot_contact_id, hubspot_ticket_id")
          .eq("id", s.contact_id)
          .maybeSingle();
        if (contact?.hubspot_ticket_id) {
          try {
            await moveTicket(String(contact.hubspot_ticket_id), "In Conversation");
            await supabase
              .from("pitch_contacts")
              .update({ stage_cache: "In Conversation" })
              .eq("id", s.contact_id);
          } catch (e) {
            console.error("stage move after reply failed:", e);
          }
        }
        replies++;
      } catch (e) {
        if (e instanceof ReconnectRequiredError) {
          await markReconnectRequired(user.id, GOOGLE_MAIL_CONNECTOR_ID);
          return json({ ok: false, reconnectRequired: true });
        }
        console.error(`reply poll failed for send ${s.id}:`, e);
      }
    }

    return json({ ok: true, checked: sends?.length ?? 0, replies });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("pitch-reply-poll error:", message);
    return json({ error: message }, 500);
  }
});
