import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Get client enrichment data
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
      const searchTerms = [
        ...client.industries,
        ...client.keywords,
      ].filter(Boolean);

      if (searchTerms.length === 0) continue;

      // Use Firecrawl search to find trending news
      const query = searchTerms.slice(0, 5).join(" OR ") + " trending news";
      
      const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 5,
          tbs: "qdr:d", // last 24 hours
        }),
      });

      const searchData = await searchResponse.json();

      if (!searchResponse.ok || !searchData.success) {
        console.error(`Firecrawl search failed for ${client.client_name}:`, searchData);
        continue;
      }

      const results = searchData.data || [];
      if (results.length === 0) continue;

      // Use Lovable AI to generate pitch angles from search results
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

        for (const signal of signals) {
          allSignals.push({
            client_name: client.client_name,
            headline: signal.headline || "Untitled Signal",
            hook: signal.hook || "",
            source_url: signal.source_url || null,
            relevance_score: Math.min(100, Math.max(1, signal.relevance_score || 50)),
            industry: signal.industry || client.industries[0] || null,
            generated_date: today,
          });
        }
      } catch (parseErr) {
        console.error(`Failed to parse AI response for ${client.client_name}:`, parseErr);
      }
    }

    // Insert signals into database
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
