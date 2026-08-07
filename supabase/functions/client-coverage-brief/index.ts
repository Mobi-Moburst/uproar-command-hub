import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PlacementInput {
  date?: string;
  outlet?: string;
  reporter_name?: string;
  headline?: string;
  type?: string;
  topic_product?: string;
  readership_viewership?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { client_name, placements } = (await req.json()) as {
      client_name?: string;
      placements?: PlacementInput[];
    };

    if (!client_name || typeof client_name !== "string") {
      return new Response(JSON.stringify({ error: "client_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rows = (placements ?? []).slice(0, 200);

    if (!rows.length) {
      const empty = {
        client_name,
        brief: {
          summary: "No coverage recorded for this client in the last 90 days.",
          themes: [],
          saturated: [],
          gaps: [],
          fresh_angles: [],
        },
        placement_count: 0,
        total_reach: 0,
        window_start: null,
        window_end: null,
        synced_at: new Date().toISOString(),
      };
      await admin.from("client_coverage_intel").upsert(empty, { onConflict: "client_name" });
      return new Response(JSON.stringify(empty), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dates = rows.map((p) => p.date).filter(Boolean).sort() as string[];
    const totalReach = rows.reduce((s, p) => s + (Number(p.readership_viewership) || 0), 0);

    const outletCounts: Record<string, number> = {};
    const reporterCounts: Record<string, number> = {};
    for (const p of rows) {
      if (p.outlet) outletCounts[p.outlet] = (outletCounts[p.outlet] ?? 0) + 1;
      if (p.reporter_name) reporterCounts[p.reporter_name] = (reporterCounts[p.reporter_name] ?? 0) + 1;
    }
    const top = (o: Record<string, number>) =>
      Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} (${v})`).join(", ");

    const systemPrompt = `You are a senior PR strategist at Uproar PR analyzing a client's earned media footprint from the last 90 days.
Your job is to tell an account executive what narrative the client currently owns in the press, where coverage is saturated, and which angles are still genuinely NEW.

Return ONLY valid JSON matching this shape:
{
  "summary": "2-4 sentence read on what the market currently thinks this brand is about, based on the coverage.",
  "themes": [{ "theme": "short label", "detail": "one sentence, cite specific outlets or headlines", "count": 3 }],
  "saturated": [{ "point": "Outlet or reporter or storyline already well-covered", "detail": "why re-pitching this is low value" }],
  "gaps": [{ "point": "Coverage type / outlet tier / storyline missing", "detail": "one sentence" }],
  "fresh_angles": ["A specific, unpitched angle grounded in the gaps above"]
}
Rules: 3-5 themes, up to 4 saturated items, up to 4 gaps, 3 fresh angles. Be concrete and reference real outlets/headlines from the data. No markdown, no code fences.`;

    const userPrompt = `Client: ${client_name}
Window: ${dates[0] ?? "?"} to ${dates[dates.length - 1] ?? "?"}
Placements: ${rows.length} | Total reach: ${totalReach.toLocaleString()}
Top outlets: ${top(outletCounts) || "n/a"}
Most frequent reporters: ${top(reporterCounts) || "n/a"}

Coverage list (date | outlet | reporter | type | topic | headline):
${rows
  .map(
    (p) =>
      `${p.date ?? "?"} | ${p.outlet ?? "?"} | ${p.reporter_name ?? "?"} | ${p.type ?? "?"} | ${p.topic_product ?? ""} | ${p.headline ?? ""}`,
  )
  .join("\n")}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      console.error("AI gateway error", aiRes.status, body);
      const msg =
        aiRes.status === 429
          ? "Rate limit exceeded. Try again in a moment."
          : aiRes.status === 402
            ? "AI credits exhausted. Add credits in Settings → Workspace → Usage."
            : "AI gateway error";
      return new Response(JSON.stringify({ error: msg }), {
        status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let brief: unknown = {};
    try {
      brief = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
    } catch (e) {
      console.error("Failed to parse AI JSON:", raw.slice(0, 500));
      throw new Error("The AI returned an unreadable summary. Try again.");
    }

    const record = {
      client_name,
      brief,
      placement_count: rows.length,
      total_reach: totalReach,
      window_start: dates[0] ?? null,
      window_end: dates[dates.length - 1] ?? null,
      synced_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("client_coverage_intel")
      .upsert(record, { onConflict: "client_name" });
    if (error) throw error;

    return new Response(JSON.stringify(record), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("client-coverage-brief error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
