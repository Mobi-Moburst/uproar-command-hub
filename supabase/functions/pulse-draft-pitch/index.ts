import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-2.5-flash-lite";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { signal_id, reporter_id, force } = await req.json();
    if (!signal_id || !reporter_id) throw new Error("signal_id and reporter_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: signal, error: sErr } = await supabase
      .from("pulse_signals")
      .select("*")
      .eq("id", signal_id)
      .single();
    if (sErr || !signal) throw new Error("Signal not found");

    const existing = signal.drafted_pitches?.[reporter_id];
    if (existing && !force) {
      return new Response(JSON.stringify({ success: true, pitch: existing, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reporter = (signal.matched_reporters || []).find((r: any) => r.id === reporter_id);
    if (!reporter) throw new Error("Reporter not found on this signal");

    const { data: enr } = await supabase
      .from("client_enrichment")
      .select("industries, keywords")
      .eq("client_name", signal.client_name)
      .maybeSingle();

    const recentExample = reporter.recent_examples?.[0];
    const prompt = `You are drafting a short cold pitch email from a PR rep at Uproar to a journalist.

Client: ${signal.client_name}
Client industries: ${(enr?.industries || []).join(", ") || "n/a"}
Client keywords: ${(enr?.keywords || []).join(", ") || "n/a"}

Newsjacking angle:
Headline: ${signal.headline}
Hook: ${signal.hook}
Source article: ${signal.source_url || "n/a"}

Reporter: ${reporter.name} at ${reporter.outlet}
Their beats: ${(reporter.beats || []).join(", ") || "n/a"}
${recentExample ? `Recent piece: "${recentExample.headline}"` : ""}

Write a cold pitch:
- Subject line: punchy, max 8 words, references the angle
- Body: ONE short paragraph (max 120 words), no "Hope you're well" or filler
- Tie the angle to the reporter's beat or recent piece in one sentence
- End with a clear, specific offer (interview, data, exec quote)

Return JSON: { "subject": "...", "body": "..." }`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You write tight, modern PR pitches. No fluff. Return only JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit — try again in a moment");
      if (res.status === 402) throw new Error("AI credits exhausted — add credits in workspace settings");
      throw new Error(`AI gateway error ${res.status}`);
    }

    const ai = await res.json();
    const parsed = JSON.parse(ai.choices?.[0]?.message?.content || "{}");
    const pitch = {
      subject: parsed.subject || "",
      body: parsed.body || "",
      drafted_at: new Date().toISOString(),
      model: MODEL,
    };

    const nextPitches = { ...(signal.drafted_pitches || {}), [reporter_id]: pitch };
    const { error: uErr } = await supabase
      .from("pulse_signals")
      .update({ drafted_pitches: nextPitches })
      .eq("id", signal_id);
    if (uErr) throw uErr;

    return new Response(JSON.stringify({ success: true, pitch, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pulse-draft-pitch error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
