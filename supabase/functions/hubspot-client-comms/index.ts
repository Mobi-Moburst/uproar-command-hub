import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/hubspot";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hs(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const HUBSPOT_API_KEY = Deno.env.get("HUBSPOT_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!HUBSPOT_API_KEY) throw new Error("HUBSPOT_API_KEY is not configured");

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": HUBSPOT_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`HubSpot request failed [${res.status}] ${path}: ${body}`);
    throw new Error(`[${res.status}]: ${body}`);
  }
  return await res.json();
}

/** Strip quoted replies, signatures, tracking noise and zero-width padding. */
function cleanBody(raw: string): string {
  if (!raw) return "";
  let t = raw
    .replace(/\u200c|\u00a0|‌/g, " ")
    .replace(/\r/g, "")
    .replace(/https?:\/\/\S+/g, (u) => (u.length > 90 ? "[link]" : u));

  // cut at the first quoted-reply marker
  const cuts = [
    /\n-{2,}\s*Forwarded message\s*-{2,}/i,
    /\nOn .{5,80} wrote:/,
    /\nFrom: .+/,
    /\nSent from my /i,
    /\nTake me to Superhuman/i,
  ];
  for (const re of cuts) {
    const m = t.match(re);
    if (m?.index !== undefined) t = t.slice(0, m.index);
  }

  return t.split("\n").map((l) => l.trim()).filter(Boolean).join("\n").slice(0, 2500);
}

const ENGAGEMENTS = [
  { type: "emails", props: ["hs_email_subject", "hs_email_text", "hs_email_direction", "hs_timestamp"] },
  { type: "notes", props: ["hs_note_body", "hs_timestamp"] },
  { type: "meetings", props: ["hs_meeting_title", "hs_meeting_body", "hs_timestamp"] },
];

async function fetchEngagements(companyId: string, portalId: string | null) {
  const items: any[] = [];

  for (const { type, props } of ENGAGEMENTS) {
    let ids: string[] = [];
    try {
      const assoc = await hs(`/crm/v4/objects/companies/${companyId}/associations/${type}?limit=100`);
      ids = (assoc?.results ?? []).map((r: any) => String(r.toObjectId));
    } catch (e) {
      console.error(`assoc ${type} failed: ${e}`);
      continue;
    }
    if (!ids.length) continue;

    // newest object ids are numerically largest — take the most recent 60
    ids = ids.sort((a, b) => Number(b) - Number(a)).slice(0, 60);

    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      try {
        const batch = await hs(`/crm/v3/objects/${type}/batch/read`, {
          method: "POST",
          body: JSON.stringify({ properties: props, inputs: chunk.map((id) => ({ id })) }),
        });
        for (const r of batch?.results ?? []) {
          const p = r.properties ?? {};
          const body = cleanBody(p.hs_email_text ?? p.hs_note_body ?? p.hs_meeting_body ?? "");
          if (!body) continue;
          items.push({
            id: String(r.id),
            kind: type === "emails" ? "email" : type === "notes" ? "note" : "meeting",
            subject: p.hs_email_subject ?? p.hs_meeting_title ?? (type === "notes" ? "Note" : "Untitled"),
            direction: p.hs_email_direction === "INCOMING_EMAIL"
              ? "from_client"
              : p.hs_email_direction
              ? "from_us"
              : "internal",
            date: p.hs_timestamp ?? null,
            body,
            hubspot_url: portalId && type === "emails"
              ? `https://app.hubspot.com/contacts/${portalId}/record/0-2/${companyId}/view/1`
              : "",
          });
        }
      } catch (e) {
        console.error(`batch read ${type} failed: ${e}`);
      }
    }
  }

  items.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
  return items.slice(0, 60);
}

const SYSTEM_PROMPT = `You read a PR agency's email history with a client and extract what the account team must know before pitching anything.

Return STRICT JSON only, no markdown fence, with this exact shape:
{
  "summary": "2-3 sentence plain-English state of the relationship right now",
  "guardrails": [{"point": "something the client said NOT to do, or a sensitivity to avoid", "quote": "short verbatim excerpt", "date": "YYYY-MM-DD"}],
  "priorities": [{"point": "what the client wants / is pushing for", "quote": "short verbatim excerpt", "date": "YYYY-MM-DD"}],
  "open_asks": [{"point": "an outstanding request or commitment not yet closed", "quote": "short verbatim excerpt", "date": "YYYY-MM-DD"}],
  "preferences": ["how they like to be communicated with, tone, cadence, spokespeople, approval process"],
  "topics": ["short topic/theme labels recently discussed"],
  "pitch_angles": ["a specific, safe outreach angle that fits what they've said"]
}

Rules:
- Only use what is actually in the messages. Never invent. Empty array is a valid answer.
- Guardrails are the highest-value output: anything phrased as "don't", "hold off", "not comfortable", "let's avoid", "we can't talk about", legal/embargo/competitor sensitivities, spokespeople who are off-limits.
- Prefer the client's own words over the agency's.
- Keep each "point" under 20 words. Keep each "quote" under 25 words.
- Ignore email signatures, scheduling logistics, and pure pleasantries.`;

async function buildBrief(clientName: string, items: any[]) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const transcript = items
    .slice(0, 45)
    .map((i) => {
      const who = i.direction === "from_client" ? "CLIENT" : i.direction === "from_us" ? "AGENCY" : "INTERNAL";
      return `[${(i.date ?? "").slice(0, 10)}] ${who} · ${i.kind} · ${i.subject}\n${i.body}`;
    })
    .join("\n\n---\n\n")
    .slice(0, 90000);

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Client: ${clientName}\n\nMessage history (newest first):\n\n${transcript}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`AI request failed [${res.status}]: ${body}`);
    throw new Error(`AI [${res.status}]: ${body}`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI returned no JSON");
  return JSON.parse(match[0]);
}

let cachedPortalId: string | null = null;
async function getPortalId(): Promise<string | null> {
  if (cachedPortalId) return cachedPortalId;
  try {
    const data = await hs("/account-info/v3/details");
    cachedPortalId = String(data?.portalId ?? "");
    return cachedPortalId || null;
  } catch (_e) {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const clientName = String(body.client_name ?? "").trim();
    if (!clientName) return json({ error: "client_name required" }, 400);

    const { data: link } = await supabase
      .from("client_hubspot_links")
      .select("hubspot_company_id")
      .eq("client_name", clientName)
      .maybeSingle();

    const companyId = link?.hubspot_company_id;
    if (!companyId) return json({ error: "This client isn't linked to a CRM account yet." }, 400);

    const portalId = await getPortalId();
    const items = await fetchEngagements(String(companyId), portalId);

    if (!items.length) {
      const empty = {
        client_name: clientName,
        hubspot_company_id: String(companyId),
        brief: { summary: "No synced email conversations found on this account yet." },
        threads: [],
        email_count: 0,
        last_email_at: null,
        synced_at: new Date().toISOString(),
      };
      await supabase.from("client_comms_intel").upsert(empty, { onConflict: "client_name" });
      return json({ ok: true, ...empty });
    }

    const brief = await buildBrief(clientName, items);

    const threads = items.slice(0, 25).map((i) => ({
      id: i.id,
      kind: i.kind,
      subject: i.subject,
      direction: i.direction,
      date: i.date,
      snippet: i.body.slice(0, 220),
      hubspot_url: i.hubspot_url,
    }));

    const row = {
      client_name: clientName,
      hubspot_company_id: String(companyId),
      brief,
      threads,
      email_count: items.length,
      last_email_at: items[0]?.date ?? null,
      synced_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("client_comms_intel")
      .upsert(row, { onConflict: "client_name" });
    if (error) throw new Error(error.message);

    return json({ ok: true, ...row });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("hubspot-client-comms error:", message);
    return json({ error: message }, 500);
  }
});
