import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getConnectionKeyForUser, markReconnectRequired } from "../_shared/appUserConnections.ts";
import { GOOGLE_MAIL_CONNECTOR_ID } from "../_shared/appUserScopes.ts";
import { htmlToText, ReconnectRequiredError, sendGmail } from "../_shared/gmail.ts";
import {
  ensureTicket,
  hs,
  logNote,
  moveTicket,
  ownerIdForEmail,
  readContact,
} from "../_shared/hubspotPitch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Conservative per-person ceiling, well under Gmail's own daily limit.
const DAILY_SEND_CAP = 200;
// A reporter is not pitched twice inside this window by anyone on the team.
const REPORTER_COOLDOWN_DAYS = 7;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
type Db = any;

async function acquireClaim(
  supabase: Db,
  args: {
    hubspot_contact_id: string;
    campaign_id: string | null;
    contact_id: string;
    user_id: string;
    user_email: string | null;
  },
) {
  const { data, error } = await supabase
    .from("pitch_claims")
    .insert({
      hubspot_contact_id: args.hubspot_contact_id,
      campaign_id: args.campaign_id,
      contact_id: args.contact_id,
      claimed_by: args.user_id,
      claimed_by_email: args.user_email,
    })
    .select("id")
    .single();
  if (!error) return { claim_id: String(data.id), blocked: null as unknown };

  const { data: holder } = await supabase
    .from("pitch_claims")
    .select("id, claimed_by_email, claimed_at")
    .eq("hubspot_contact_id", args.hubspot_contact_id)
    .is("released_at", null)
    .maybeSingle();
  return { claim_id: null, blocked: holder ?? { reason: error.message } };
}

async function releaseClaim(supabase: Db, claimId: string, reason: string) {
  await supabase
    .from("pitch_claims")
    .update({ released_at: new Date().toISOString(), release_reason: reason })
    .eq("id", claimId)
    .is("released_at", null);
}

async function scheduleFollowups(supabase: Db, campaignId: string, sendId: string) {
  const { data: settings } = await supabase
    .from("pitch_send_settings")
    .select("followups_enabled, steps")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (settings && settings.followups_enabled === false) return 0;

  const steps = (settings?.steps ?? [
    { day: 3, body: "Following up on the note below in case it got buried." },
    { day: 7, body: "Last nudge from me on this one." },
  ]) as { day: number; body: string }[];

  const rows = steps
    .filter((s) => Number(s.day) > 0)
    .map((s, i) => ({
      send_id: sendId,
      step: i + 1,
      scheduled_for: new Date(Date.now() + Number(s.day) * 86400000).toISOString(),
      body: String(s.body ?? ""),
    }));
  if (!rows.length) return 0;
  await supabase.from("pitch_followups").insert(rows);
  return rows.length;
}

async function sendOne(
  supabase: Db,
  contactRowId: string,
  user: { id: string; email?: string | null },
  connectionKey: string,
  senderEmail: string,
  signature: string | null,
): Promise<{ ok: boolean; reason?: string; blocked?: unknown; send_id?: string }> {
  const { data: contact } = await supabase
    .from("pitch_contacts")
    .select("*")
    .eq("id", contactRowId)
    .maybeSingle();
  if (!contact) return { ok: false, reason: "Reporter not found" };
  if (contact.excluded) return { ok: false, reason: "Reporter is excluded from this campaign" };
  if (!contact.email) return { ok: false, reason: "No email address on this reporter" };

  const { data: campaign } = await supabase
    .from("pitch_campaigns")
    .select("id, client_name, angle")
    .eq("id", contact.campaign_id)
    .maybeSingle();
  if (!campaign) return { ok: false, reason: "Campaign not found" };

  const { data: draft } = await supabase
    .from("pitch_drafts")
    .select("id, subject, body, status")
    .eq("contact_id", contactRowId)
    .maybeSingle();
  if (!draft) return { ok: false, reason: "No draft to send" };
  if (draft.status !== "approved") return { ok: false, reason: "Draft is not approved yet" };

  // Cooldown: nobody pitches the same reporter twice inside the window.
  if (contact.hubspot_contact_id) {
    const since = new Date(Date.now() - REPORTER_COOLDOWN_DAYS * 86400000).toISOString();
    const { data: recent } = await supabase
      .from("pitch_sends")
      .select("id, sent_at")
      .eq("contact_id", contactRowId)
      .gte("sent_at", since)
      .limit(1);
    if (recent?.length) {
      return { ok: false, reason: `Already pitched in the last ${REPORTER_COOLDOWN_DAYS} days` };
    }
  }

  const claim = await acquireClaim(supabase, {
    hubspot_contact_id: String(contact.hubspot_contact_id ?? contactRowId),
    campaign_id: contact.campaign_id,
    contact_id: contactRowId,
    user_id: user.id,
    user_email: user.email ?? null,
  });
  if (!claim.claim_id) {
    return { ok: false, reason: "Another pitch is active on this reporter", blocked: claim.blocked };
  }

  let sendId: string | null = null;
  try {
    const sent = await sendGmail(connectionKey, {
      to: String(contact.email),
      subject: draft.subject ?? "",
      body: draft.body ?? "",
    });

    const { data: sendRow, error: sendErr } = await supabase
      .from("pitch_sends")
      .insert({
        campaign_id: campaign.id,
        contact_id: contactRowId,
        draft_id: draft.id,
        sender_user_id: user.id,
        sender_email: senderEmail,
        recipient_email: String(contact.email),
        subject: draft.subject ?? "",
        body: draft.body ?? "",
        gmail_message_id: sent.id,
        gmail_thread_id: sent.threadId,
        status: "sent",
      })
      .select("id")
      .single();
    if (sendErr) throw new Error(sendErr.message);
    sendId = String(sendRow.id);

    await scheduleFollowups(supabase, String(campaign.id), sendId);

    const nowIso = new Date().toISOString();
    await supabase
      .from("pitch_drafts")
      .update({ status: "sent", sent_at: nowIso })
      .eq("id", draft.id);
    await supabase
      .from("pitch_contacts")
      .update({ armed_at: nowIso, arm_error: null })
      .eq("id", contactRowId);

    // CRM record: stamp the contact, log the pitch, open and advance the ticket.
    if (contact.hubspot_contact_id) {
      try {
        const today = nowIso.slice(0, 10);
        const props: Record<string, string> = { last_pitched_date: today };
        const ownerId = await ownerIdForEmail(user.email);
        if (ownerId) props.hubspot_owner_id = ownerId;
        const current = await readContact(String(contact.hubspot_contact_id), [
          "media_relationship_status",
        ]);
        if (String(current.media_relationship_status ?? "New") === "New") {
          props.media_relationship_status = "Warm";
        }
        await hs(`/crm/v3/objects/contacts/${contact.hubspot_contact_id}`, {
          method: "PATCH",
          body: JSON.stringify({ properties: props }),
        });
        await logNote(
          String(contact.hubspot_contact_id),
          `Uproar pitch sent by ${senderEmail || user.email || "a PR user"} for ${campaign.client_name} / ${campaign.angle}\n\nSubject: ${draft.subject}\n\n${draft.body}`,
        );
      } catch (e) {
        console.error("CRM logging failed after send:", e);
      }
    }

    try {
      const ticketId = await ensureTicket(supabase, contact, campaign);
      await moveTicket(ticketId, "Pitched");
      await supabase
        .from("pitch_contacts")
        .update({ hubspot_ticket_id: ticketId, stage_cache: "Pitched" })
        .eq("id", contactRowId);
    } catch (e) {
      console.error("ticket update failed after send:", e);
    }

    return { ok: true, send_id: sendId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (e instanceof ReconnectRequiredError) {
      await markReconnectRequired(user.id, GOOGLE_MAIL_CONNECTOR_ID);
    }
    // Nothing sent: free the reporter so someone else can pitch.
    if (!sendId) await releaseClaim(supabase, claim.claim_id, `send failed: ${message}`);
    await supabase.from("pitch_contacts").update({ arm_error: message }).eq("id", contactRowId);
    return { ok: false, reason: message };
  }
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

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.contact_ids)
      ? body.contact_ids.map(String)
      : body.contact_id
        ? [String(body.contact_id)]
        : [];
    if (!ids.length) return json({ error: "contact_id required" }, 400);

    const connectionKey = await getConnectionKeyForUser(user.id, GOOGLE_MAIL_CONNECTOR_ID);
    if (!connectionKey) {
      return json({ error: "Connect your Gmail account before sending", needsConnection: true }, 400);
    }

    const { data: conn } = await supabase
      .from("app_user_connections")
      .select("account_email, reconnect_required")
      .eq("user_id", user.id)
      .eq("connector_id", GOOGLE_MAIL_CONNECTOR_ID)
      .maybeSingle();
    if (conn?.reconnect_required) {
      return json({ error: "Your Gmail access needs to be renewed", needsConnection: true }, 400);
    }
    const senderEmail = String(conn?.account_email ?? user.email ?? "");

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count: sentToday } = await supabase
      .from("pitch_sends")
      .select("id", { count: "exact", head: true })
      .eq("sender_user_id", user.id)
      .gte("sent_at", since.toISOString());
    let remaining = Math.max(0, DAILY_SEND_CAP - (sentToday ?? 0));

    let sent = 0, blocked = 0, failed = 0, capped = 0;
    const results: Record<string, unknown>[] = [];

    for (const id of ids) {
      if (remaining <= 0) {
        capped++;
        results.push({ contact_id: id, ok: false, reason: "Daily send cap reached" });
        continue;
      }
      const res = await sendOne(supabase, id, { id: user.id, email: user.email }, connectionKey, senderEmail);
      if (res.ok) { sent++; remaining--; }
      else if (res.blocked) blocked++;
      else failed++;
      results.push({ contact_id: id, ...res });
    }

    return json({ ok: true, sent, blocked, failed, capped, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("pitch-send error:", message);
    return json({ error: message }, 500);
  }
});
