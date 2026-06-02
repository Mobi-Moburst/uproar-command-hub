import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------- shared reporter-matching helpers (kept inline; edge fns can't share) ----------

interface ReporterCandidate {
  id: string;
  name: string;
  outlet: string;
  source: "internal" | "web";
  beats: string[];
  recent_examples: { headline: string; url?: string; date?: string }[];
  internal_stats?: {
    placements: number;
    conversion_rate: number;
    last_coverage_date: string;
  };
}

async function sha1Short(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

async function reporterId(name: string, outlet: string): Promise<string> {
  return sha1Short(`${name.trim().toLowerCase()}|${outlet.trim().toLowerCase()}`);
}

async function findInternalCandidates(
  supabase: any,
  signal: { industry: string | null; client_name: string; headline: string },
  keywords: string[]
): Promise<ReporterCandidate[]> {
  // Build OR filter on vertical, topic_product, and headline tokens
  const terms = [signal.industry, signal.client_name, ...keywords].filter(Boolean) as string[];
  if (terms.length === 0) return [];

  const orFilters = terms
    .slice(0, 5)
    .map((t) => `vertical.ilike.%${t}%,topic_product.ilike.%${t}%`)
    .join(",");

  const { data, error } = await supabase
    .from("placements_archive")
    .select("reporter_name, outlet, headline, link, date, vertical, topic_product")
    .or(orFilters)
    .limit(500);

  if (error || !data) return [];

  // Aggregate by reporter+outlet
  const map = new Map<string, {
    name: string;
    outlet: string;
    placements: any[];
    beats: Map<string, number>;
  }>();

  for (const p of data) {
    if (!p.reporter_name || !p.outlet) continue;
    const key = `${p.reporter_name.trim().toLowerCase()}|${p.outlet.trim().toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, {
        name: p.reporter_name.trim(),
        outlet: p.outlet.trim(),
        placements: [],
        beats: new Map(),
      });
    }
    const entry = map.get(key)!;
    entry.placements.push(p);
    for (const beat of [p.vertical, p.topic_product].filter(Boolean)) {
      entry.beats.set(beat, (entry.beats.get(beat) || 0) + 1);
    }
  }

  const candidates: ReporterCandidate[] = [];
  for (const entry of map.values()) {
    if (entry.placements.length < 1) continue;
    const sorted = [...entry.placements].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const topBeats = [...entry.beats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([b]) => b);
    candidates.push({
      id: await reporterId(entry.name, entry.outlet),
      name: entry.name,
      outlet: entry.outlet,
      source: "internal",
      beats: topBeats,
      recent_examples: sorted.slice(0, 3).map((p) => ({
        headline: p.headline,
        url: p.link,
        date: p.date,
      })),
      internal_stats: {
        placements: entry.placements.length,
        conversion_rate: 0, // not computed here — keep cheap
        last_coverage_date: sorted[0]?.date || "",
      },
    });
  }

  // Take top 10 by placements
  return candidates.sort((a, b) =>
    (b.internal_stats?.placements || 0) - (a.internal_stats?.placements || 0)
  ).slice(0, 10);
}

async function findWebCandidates(
  firecrawlKey: string,
  signal: { headline: string; industry: string | null }
): Promise<ReporterCandidate[]> {
  try {
    const query = `${signal.headline} ${signal.industry || ""} reporter author`.trim();
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 5,
        tbs: "qdr:m",
      }),
    });
    const data = await res.json();
    const d = data?.data;
    const results = (Array.isArray(d) ? d : (d?.web || d?.news || data?.web || [])) as any[];
    const candidates: ReporterCandidate[] = [];

    for (const r of results) {
      // Firecrawl search result metadata sometimes includes author info via og:tags
      const author = r?.metadata?.author || r?.metadata?.["article:author"] || null;
      const url = r?.url || r?.metadata?.sourceURL;
      if (!author || !url) continue;
      let outlet = "";
      try {
        outlet = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        continue;
      }
      candidates.push({
        id: await reporterId(author, outlet),
        name: String(author),
        outlet,
        source: "web",
        beats: [signal.industry || ""].filter(Boolean),
        recent_examples: [{
          headline: r.title || "Recent article",
          url,
        }],
      });
    }
    return candidates;
  } catch (e) {
    console.error("findWebCandidates error:", e);
    return [];
  }
}

async function rankCandidatesWithAI(
  lovableKey: string,
  signal: { headline: string; hook: string; client_name: string; industry: string | null },
  candidates: ReporterCandidate[]
): Promise<Array<ReporterCandidate & { score: number; rationale: string }>> {
  if (candidates.length === 0) return [];

  const candidateSummary = candidates.map((c, i) => {
    const stats = c.internal_stats
      ? ` [internal: ${c.internal_stats.placements} placements, last ${c.internal_stats.last_coverage_date}]`
      : " [web discovery]";
    return `${i}. ${c.name} (${c.outlet}) — beats: ${c.beats.join(", ") || "n/a"}${stats}`;
  }).join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: "You are a PR strategist ranking reporters for newsjacking pitches. Return only JSON.",
        },
        {
          role: "user",
          content: `Signal for client "${signal.client_name}" (industry: ${signal.industry || "n/a"}):
Headline: ${signal.headline}
Hook: ${signal.hook}

Candidate reporters:
${candidateSummary}

Return JSON: { "ranked": [{ "index": <number>, "score": <0-100>, "rationale": "<1 sentence>" }] }
Include the top 8 candidates only. Score reflects fit for THIS specific signal.`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    console.error("AI rank error", res.status);
    // Fallback: return candidates with default scoring
    return candidates.slice(0, 8).map((c, i) => ({
      ...c,
      score: 60 - i * 3,
      rationale: c.source === "internal" ? "Prior coverage of relevant topics." : "Recently covered this beat.",
    }));
  }

  const ai = await res.json();
  try {
    const parsed = JSON.parse(ai.choices?.[0]?.message?.content || "{}");
    const ranked = (parsed.ranked || []) as { index: number; score: number; rationale: string }[];
    return ranked
      .map((r) => {
        const c = candidates[r.index];
        if (!c) return null;
        return { ...c, score: Math.max(0, Math.min(100, r.score)), rationale: r.rationale || "" };
      })
      .filter(Boolean) as Array<ReporterCandidate & { score: number; rationale: string }>;
  } catch (e) {
    console.error("Failed to parse AI rank:", e);
    return candidates.slice(0, 8).map((c, i) => ({
      ...c,
      score: 60 - i * 3,
      rationale: "",
    }));
  }
}

export async function matchReportersForSignal(
  supabase: any,
  firecrawlKey: string,
  lovableKey: string,
  signal: { headline: string; hook: string; client_name: string; industry: string | null },
  keywords: string[]
) {
  const [internal, web] = await Promise.all([
    findInternalCandidates(supabase, signal, keywords),
    findWebCandidates(firecrawlKey, signal),
  ]);

  // De-dup by id, internal wins
  const byId = new Map<string, ReporterCandidate>();
  for (const c of internal) byId.set(c.id, c);
  for (const c of web) if (!byId.has(c.id)) byId.set(c.id, c);

  const ranked = await rankCandidatesWithAI(lovableKey, signal, [...byId.values()]);
  return ranked;
}

// ---------- main scan ----------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: enrichments, error: enrichErr } = await supabase
      .from("client_enrichment")
      .select("*");

    if (enrichErr) throw enrichErr;
    if (!enrichments || enrichments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No client enrichments configured yet.", signals: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const allSignals: any[] = [];

    for (const client of enrichments) {
      const searchTerms = [...client.industries, ...client.keywords].filter(Boolean);
      if (searchTerms.length === 0) continue;

      const query = searchTerms.slice(0, 5).join(" OR ") + " trending news";

      const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, limit: 5, tbs: "qdr:d" }),
      });

      const searchData = await searchResponse.json();
      if (!searchResponse.ok || !searchData.success) {
        console.error(`Firecrawl search failed for ${client.client_name}:`, searchData);
        continue;
      }

      const results = searchData.data || [];
      if (results.length === 0) continue;

      const newsContext = results
        .map((r: any, i: number) => `${i + 1}. "${r.title}" - ${r.description || ""} (${r.url})`)
        .join("\n");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a PR strategist for Uproar PR. Given trending news articles and a client's context, generate concise pitch angle hooks. Each hook should be 1-2 sentences max — just the angle, NOT a full pitch. Return valid JSON array.`,
            },
            {
              role: "user",
              content: `Client: ${client.client_name}
Industries: ${client.industries.join(", ")}
Keywords: ${client.keywords.join(", ")}
Competitors: ${client.competitors.join(", ")}

Today's trending news:
${newsContext}

Generate a JSON array of signal objects. Each should have:
- "headline": short catchy title (max 10 words)
- "hook": the pitch angle in 1-2 sentences
- "source_url": the most relevant article URL from above
- "relevance_score": 1-100 how relevant to this client
- "industry": primary industry tag

Only include signals with relevance_score >= 40. Max 3 signals per client.`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI gateway error for ${client.client_name}:`, aiResponse.status);
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;

      try {
        const parsed = JSON.parse(content);
        const signals = Array.isArray(parsed) ? parsed : parsed.signals || [];

        // Match reporters per signal in parallel
        const enrichedSignals = await Promise.all(
          signals.map(async (signal: any) => {
            const baseSignal = {
              client_name: client.client_name,
              headline: signal.headline || "Untitled Signal",
              hook: signal.hook || "",
              source_url: signal.source_url || null,
              relevance_score: Math.min(100, Math.max(1, signal.relevance_score || 50)),
              industry: signal.industry || client.industries[0] || null,
              generated_date: today,
            };

            const matched = await matchReportersForSignal(
              supabase,
              FIRECRAWL_API_KEY,
              LOVABLE_API_KEY,
              baseSignal,
              client.keywords || []
            );

            return {
              ...baseSignal,
              matched_reporters: matched,
              drafted_pitches: {},
            };
          })
        );

        allSignals.push(...enrichedSignals);
      } catch (parseErr) {
        console.error(`Failed to parse AI response for ${client.client_name}:`, parseErr);
      }
    }

    if (allSignals.length > 0) {
      const { error: insertErr } = await supabase
        .from("pulse_signals")
        .insert(allSignals);

      if (insertErr) throw insertErr;
    }

    return new Response(
      JSON.stringify({ success: true, signals_generated: allSignals.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("pulse-scan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
