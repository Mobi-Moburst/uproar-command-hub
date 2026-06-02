import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- duplicated matching helpers (edge fns can't share modules) ---

async function sha1Short(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

async function reporterId(name: string, outlet: string) {
  return sha1Short(`${name.trim().toLowerCase()}|${outlet.trim().toLowerCase()}`);
}

async function findInternalCandidates(supabase: any, signal: any, keywords: string[]) {
  const terms = [signal.industry, signal.client_name, ...keywords].filter(Boolean) as string[];
  if (terms.length === 0) return [];
  const orFilters = terms.slice(0, 5)
    .map((t) => `vertical.ilike.%${t}%,topic_product.ilike.%${t}%`).join(",");
  const { data } = await supabase
    .from("placements_archive")
    .select("reporter_name, outlet, headline, link, date, vertical, topic_product")
    .or(orFilters)
    .limit(500);
  if (!data) return [];
  const map = new Map<string, any>();
  for (const p of data) {
    if (!p.reporter_name || !p.outlet) continue;
    const key = `${p.reporter_name.trim().toLowerCase()}|${p.outlet.trim().toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, { name: p.reporter_name.trim(), outlet: p.outlet.trim(), placements: [], beats: new Map() });
    }
    const e = map.get(key);
    e.placements.push(p);
    for (const beat of [p.vertical, p.topic_product].filter(Boolean)) {
      e.beats.set(beat, (e.beats.get(beat) || 0) + 1);
    }
  }
  const out = [];
  for (const e of map.values()) {
    const sorted = [...e.placements].sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));
    out.push({
      id: await reporterId(e.name, e.outlet),
      name: e.name,
      outlet: e.outlet,
      source: "internal" as const,
      beats: [...e.beats.entries()].sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map(([b]: any) => b),
      recent_examples: sorted.slice(0, 3).map((p: any) => ({ headline: p.headline, url: p.link, date: p.date })),
      internal_stats: {
        placements: e.placements.length,
        conversion_rate: 0,
        last_coverage_date: sorted[0]?.date || "",
      },
    });
  }
  return out.sort((a: any, b: any) => b.internal_stats.placements - a.internal_stats.placements).slice(0, 10);
}

async function findWebCandidates(firecrawlKey: string, signal: any) {
  try {
    const query = `${signal.headline} ${signal.industry || ""} reporter author`.trim();
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 5, tbs: "qdr:m" }),
    });
    const data = await res.json();
    const results = (data?.data || data?.web || []) as any[];
    const out = [];
    for (const r of results) {
      const author = r?.metadata?.author || r?.metadata?.["article:author"];
      const url = r?.url || r?.metadata?.sourceURL;
      if (!author || !url) continue;
      let outlet = "";
      try { outlet = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }
      out.push({
        id: await reporterId(author, outlet),
        name: String(author),
        outlet,
        source: "web" as const,
        beats: [signal.industry || ""].filter(Boolean),
        recent_examples: [{ headline: r.title || "Recent article", url }],
      });
    }
    return out;
  } catch (e) {
    console.error("web candidates err", e);
    return [];
  }
}

async function rankWithAI(lovableKey: string, signal: any, candidates: any[]) {
  if (candidates.length === 0) return [];
  const summary = candidates.map((c, i) => {
    const stats = c.internal_stats
      ? ` [internal: ${c.internal_stats.placements} placements]`
      : " [web]";
    return `${i}. ${c.name} (${c.outlet}) — beats: ${c.beats.join(", ") || "n/a"}${stats}`;
  }).join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "You are a PR strategist ranking reporters. Return only JSON." },
        { role: "user", content: `Signal for "${signal.client_name}" (industry: ${signal.industry || "n/a"}):
Headline: ${signal.headline}
Hook: ${signal.hook}

Candidates:
${summary}

Return JSON: { "ranked": [{ "index": <n>, "score": <0-100>, "rationale": "<1 sentence>" }] } — top 8 only.` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    return candidates.slice(0, 8).map((c, i) => ({ ...c, score: 60 - i * 3, rationale: "" }));
  }
  const ai = await res.json();
  try {
    const parsed = JSON.parse(ai.choices?.[0]?.message?.content || "{}");
    const ranked = (parsed.ranked || []) as any[];
    return ranked.map((r) => {
      const c = candidates[r.index];
      if (!c) return null;
      return { ...c, score: Math.max(0, Math.min(100, r.score)), rationale: r.rationale || "" };
    }).filter(Boolean);
  } catch {
    return candidates.slice(0, 8).map((c, i) => ({ ...c, score: 60 - i * 3, rationale: "" }));
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { signal_id } = await req.json();
    if (!signal_id) throw new Error("signal_id required");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY")!;
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

    const { data: enr } = await supabase
      .from("client_enrichment")
      .select("keywords")
      .eq("client_name", signal.client_name)
      .maybeSingle();

    const [internal, web] = await Promise.all([
      findInternalCandidates(supabase, signal, enr?.keywords || []),
      findWebCandidates(FIRECRAWL_API_KEY, signal),
    ]);

    const byId = new Map<string, any>();
    for (const c of internal) byId.set(c.id, c);
    for (const c of web) if (!byId.has(c.id)) byId.set(c.id, c);

    const ranked = await rankWithAI(LOVABLE_API_KEY, signal, [...byId.values()]);

    const { error: uErr } = await supabase
      .from("pulse_signals")
      .update({ matched_reporters: ranked })
      .eq("id", signal_id);
    if (uErr) throw uErr;

    return new Response(JSON.stringify({ success: true, matched_reporters: ranked }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pulse-match-reporters error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
