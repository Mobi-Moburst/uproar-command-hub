import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "openai/gpt-5.6-sol";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
    rationale: { type: "string" },
  },
  required: ["subject", "body", "rationale"],
};

/** Streams /v1/responses and returns the accumulated output text. */
async function callModel(system: string, user: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      instructions: system,
      input: [{ role: "user", content: [{ type: "input_text", text: user }] }],
      text: {
        format: {
          type: "json_schema",
          name: "pitch_draft",
          strict: true,
          schema: DRAFT_SCHEMA,
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 429) throw new Error("Rate limit — try again in a moment");
    if (res.status === 402) throw new Error("AI credits exhausted — add credits in workspace settings");
    throw new Error(`AI gateway error ${res.status}: ${detail}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta;
        } else if (evt.type === "response.completed" && !text) {
          const out = evt.response?.output ?? [];
          for (const item of out) {
            for (const part of item?.content ?? []) {
              if (part?.type === "output_text" && part.text) text += part.text;
            }
          }
        }
      } catch (_e) {
        // ignore keepalive / partial frames
      }
    }
  }

  if (!text.trim()) throw new Error("The model returned an empty draft — try again");
  return text;
}

function line(label: string, value: unknown) {
  const v = Array.isArray(value) ? value.join(", ") : value;
  return v ? `${label}: ${v}` : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { campaign_id, contact_ids, mode, preview, voice_override } = await req.json();
    if (!campaign_id) throw new Error("campaign_id is required");
    const isPreview = preview === true;
    if (!isPreview && (!Array.isArray(contact_ids) || contact_ids.length === 0)) {
      throw new Error("contact_ids is required");
    }
    const draftMode = mode === "bulk" ? "bulk" : "custom";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: campaign, error: cErr } = await supabase
      .from("pitch_campaigns")
      .select("id, client_name, angle, description, press_release_body")
      .eq("id", campaign_id)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!campaign) throw new Error("Campaign not found");

    const [{ data: contacts }, { data: guardrails }, { data: comms }, { data: coverage }] =
      await Promise.all([
        supabase
          .from("pitch_contacts")
          .select("id, name, outlet, email, beat, title, location, source_row, warnings")
          .eq("campaign_id", campaign_id)
          .in("id", contact_ids),
        supabase
          .from("client_pitch_guardrails")
          .select("rule, scope")
          .eq("client_name", campaign.client_name),
        supabase
          .from("client_comms_intel")
          .select("brief")
          .eq("client_name", campaign.client_name)
          .maybeSingle(),
        supabase
          .from("client_coverage_intel")
          .select("brief")
          .eq("client_name", campaign.client_name)
          .maybeSingle(),
      ]);

    if (!contacts || contacts.length === 0) throw new Error("No contacts found for this campaign");

    const commsBrief = (comms?.brief ?? {}) as Record<string, unknown>;
    const coverageBrief = (coverage?.brief ?? {}) as Record<string, unknown>;

    const clientContext = [
      `Client: ${campaign.client_name}`,
      `Campaign angle: ${campaign.angle}`,
      line("Angle detail", campaign.description),
      campaign.press_release_body
        ? `Press release (source material):\n${String(campaign.press_release_body).slice(0, 4000)}`
        : "",
      guardrails?.length
        ? `HARD GUARDRAILS (explicit client rules — never violate):\n${guardrails
            .map((g) => `- [${g.scope}] ${g.rule}`)
            .join("\n")}`
        : "",
      Object.keys(commsBrief).length
        ? `Inferred from recent client emails (soft signal, may be incomplete):\n${JSON.stringify(
            commsBrief,
          ).slice(0, 2500)}`
        : "",
      Object.keys(coverageBrief).length
        ? `Recent coverage themes (last 90 days):\n${JSON.stringify(coverageBrief).slice(0, 2500)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const system =
      "You are a senior PR strategist at Uproar writing 1:1 media pitches. " +
      "You write tight, specific, human copy. No 'Hope you're well', no buzzwords, no exclamation marks. " +
      "Hard guardrails are absolute: never pitch anything they forbid. " +
      "Return only the structured fields requested.";

    const results: Array<{ contact_id: string; subject?: string; body?: string; error?: string }> = [];

    for (const contact of contacts) {
      try {
        const src = (contact.source_row ?? {}) as Record<string, unknown>;
        const reporterContext = [
          `Reporter: ${contact.name}`,
          line("Outlet", contact.outlet),
          line("Title", contact.title),
          line("Beat", contact.beat),
          line("Location", contact.location),
          line("Notes / pitch preferences", src.notes ?? src.Notes),
          (contact.warnings as { label: string }[] | null)?.length
            ? `CRM flags: ${(contact.warnings as { label: string }[]).map((w) => w.label).join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");

        const modeRule =
          draftMode === "bulk"
            ? "This is a bulk press-release send: keep the body consistent with the release, but personalize the opening line to this reporter's beat or outlet."
            : "This is a fully custom 1:1 pitch: lead with why THIS reporter, on THIS beat, should care.";

        const user = `${clientContext}\n\n---\n${reporterContext}\n\n---\nTask: write the pitch email.
${modeRule}
Rules:
- Subject line: max 9 words, concrete, no clickbait.
- Body: max 150 words, 2 short paragraphs max, plain text (no markdown, no signature block).
- One sentence connecting the angle to this reporter's beat/outlet.
- End with one specific, easy-to-say-yes-to offer (interview, exclusive data, exec quote, embargoed release).
- Rationale: one sentence on why this reporter and how guardrails were respected.`;

        const raw = await callModel(system, user);
        const parsed = JSON.parse(raw) as { subject?: string; body?: string; rationale?: string };
        const subject = (parsed.subject ?? "").trim();
        const body = [(parsed.body ?? "").trim(), parsed.rationale ? `\n\n—\nWhy this reporter: ${parsed.rationale.trim()}` : ""]
          .join("")
          .trim();
        if (!subject || !body) throw new Error("Incomplete draft returned");

        const { data: existing } = await supabase
          .from("pitch_drafts")
          .select("id, status")
          .eq("contact_id", contact.id)
          .maybeSingle();

        if (existing) {
          if (existing.status === "sent") {
            results.push({ contact_id: contact.id, error: "Already sent — not overwritten" });
            continue;
          }
          const { error } = await supabase
            .from("pitch_drafts")
            .update({ subject, body, mode: draftMode, status: "draft" })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("pitch_drafts")
            .insert({ contact_id: contact.id, subject, body, mode: draftMode, status: "draft" });
          if (error) throw error;
        }

        results.push({ contact_id: contact.id, subject, body });
      } catch (e) {
        console.error("draft failed", contact.id, e);
        results.push({
          contact_id: contact.id,
          error: e instanceof Error ? e.message : "Draft failed",
        });
      }
    }

    return json({
      drafted: results.filter((r) => !r.error).length,
      failed: results.filter((r) => r.error).length,
      results,
    });
  } catch (e) {
    console.error("pitch-draft error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
