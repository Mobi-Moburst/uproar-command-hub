import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getConnectionKeyForUser, markReconnectRequired } from "../_shared/appUserConnections.ts";
import { GOOGLE_MAIL_CONNECTOR_ID } from "../_shared/appUserScopes.ts";
import {
  getRfcMessageId,
  gmail,
  ReconnectRequiredError,
  sendGmail,
} from "../_shared/gmail.ts";

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

function decodeB64Url(data: string): string {
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

interface Part {
  mimeType?: string;
  body?: { data?: string };
  parts?: Part[];
}

/** Walk the MIME tree and pull the best readable body. */
function extractBody(payload: Part | undefined): { html: string; text: string } {
  let html = "";
  let text = "";
  const walk = (p?: Part) => {
    if (!p) return;
    const data = p.body?.data;
    if (data) {
      if (p.mimeType === "text/html" && !html) html = decodeB64Url(data);
      else if (p.mimeType === "text/plain" && !text) text = decodeB64Url(data);
    }
    (p.parts ?? []).forEach(walk);
  };
  walk(payload);
  return { html, text };
}

function headerValue(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
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
    const action = String(body.action ?? "thread");

    const connectionKey = await getConnectionKeyForUser(user.id, GOOGLE_MAIL_CONNECTOR_ID);
    if (!connectionKey) return json({ error: "Connect your Gmail account first", needsConnection: true }, 400);

    const sendId = body.send_id ? String(body.send_id) : "";
    if (!sendId) return json({ error: "send_id required" }, 400);

    const { data: send } = await supabase
      .from("pitch_sends")
      .select("id, contact_id, campaign_id, sender_email, sender_user_id, subject, gmail_thread_id, gmail_message_id")
      .eq("id", sendId)
      .maybeSingle();
    if (!send) return json({ error: "Conversation not found" }, 404);
    if (send.sender_user_id !== user.id) {
      return json({ error: "This conversation belongs to another teammate's inbox" }, 403);
    }

    try {
      if (action === "thread") {
        const thread = await gmail(
          connectionKey,
          `/gmail/v1/users/me/threads/${send.gmail_thread_id}?format=full`,
        );
        const messages = ((thread.messages ?? []) as Record<string, unknown>[]).map((m) => {
          const payload = m.payload as Part & { headers?: { name: string; value: string }[] };
          const headers = payload?.headers ?? [];
          const from = headerValue(headers, "From");
          const { html, text } = extractBody(payload);
          const mine = !!send.sender_email &&
            from.toLowerCase().includes(String(send.sender_email).toLowerCase());
          return {
            id: String(m.id ?? ""),
            from,
            to: headerValue(headers, "To"),
            subject: headerValue(headers, "Subject"),
            date: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : null,
            html: html || "",
            text: text || "",
            snippet: String(m.snippet ?? ""),
            mine,
          };
        });
        return json({ ok: true, messages });
      }

      if (action === "reply") {
        const replyBody = String(body.body ?? "").trim();
        if (!replyBody) return json({ error: "Write something first" }, 400);

        const { data: prof } = await supabase
          .from("profiles")
          .select("email_signature")
          .eq("id", user.id)
          .maybeSingle();

        const { data: contact } = await supabase
          .from("pitch_contacts")
          .select("email, hubspot_contact_id")
          .eq("id", send.contact_id)
          .maybeSingle();
        const to = String(body.to ?? contact?.email ?? "");
        if (!to) return json({ error: "No recipient address on this reporter" }, 400);

        const rfcId = send.gmail_message_id
          ? await getRfcMessageId(connectionKey, String(send.gmail_message_id))
          : null;
        const subject = String(send.subject ?? "").startsWith("Re:")
          ? String(send.subject)
          : `Re: ${send.subject ?? ""}`;

        await sendGmail(connectionKey, {
          to,
          subject,
          body: replyBody,
          signature: (prof?.email_signature as string | null) ?? null,
          threadId: String(send.gmail_thread_id ?? ""),
          inReplyTo: rfcId,
        });

        // A human took over the conversation, so the automated nudges stop.
        await supabase
          .from("pitch_followups")
          .update({ status: "cancelled", cancelled_reason: "replied by hand from the inbox" })
          .eq("send_id", send.id)
          .eq("status", "scheduled");


        return json({ ok: true });
      }

      return json({ error: `Unknown action ${action}` }, 400);
    } catch (e) {
      if (e instanceof ReconnectRequiredError) {
        await markReconnectRequired(user.id, GOOGLE_MAIL_CONNECTOR_ID);
        return json({ error: "Your Gmail access needs renewing", reconnectRequired: true }, 400);
      }
      throw e;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("pitch-inbox error:", message);
    return json({ error: message }, 500);
  }
});
