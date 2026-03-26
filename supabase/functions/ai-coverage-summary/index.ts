import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { clientName, periodLabel, metrics } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a senior PR & communications analyst writing for Uproar PR (a division of Moburst). 
Write a concise, insight-driven monthly/periodic coverage summary for a client. 

Guidelines:
- Write in a professional but conversational tone — as if Uproar PR is presenting results to the client
- Use "we" and "our" to refer to Uproar's efforts (e.g. "we secured," "our outreach," "we recommend")
- Use the client's name or "your brand" when referring to the client's outcomes
- Lead with the most impactful insight or trend
- Call out specific outlets, reporters, or coverage types that drove results
- Note any concerns (declining momentum, low conversion rates, gaps in coverage types)
- End with 2-3 actionable recommendations for the next period
- Keep it to 3-5 paragraphs
- Use specific numbers from the data provided
- Do NOT use markdown headers — write flowing paragraphs with bold for emphasis where needed`;

    const userPrompt = `Generate a coverage performance summary for **${clientName}** for the period: ${periodLabel}.

Here are the key metrics:
- Total Placements: ${metrics.totalPlacements}
- Total Reach: ${metrics.totalReach.toLocaleString()}
- Total Ad Value: $${metrics.totalAdValue.toLocaleString()}
- Award Wins: ${metrics.awardWins}
- YTD Placements: ${metrics.ytdPlacements}

Coverage Type Breakdown:
${metrics.typeBreakdown.map((t: any) => `  - ${t.type}: ${t.count} (${t.pct}%)`).join("\n")}

Top Outlets by Reach:
${metrics.topOutlets.map((o: any) => `  - ${o.outlet}: ${o.count} hits, ${o.reach.toLocaleString()} reach`).join("\n")}

Sample Outreach: ${metrics.samplesSent} sent, ${metrics.samplesConverted} converted (${metrics.sampleConversionRate}%)
Briefing Outreach: ${metrics.briefingsHeld} held, ${metrics.briefingsConverted} converted (${metrics.briefingConversionRate}%)

Top Converting Reporters:
${metrics.topReporters.map((r: any) => `  - ${r.name}: ${r.conversions} conversions`).join("\n")}

Monthly Reach Trend (recent months):
${metrics.monthlyReach.map((m: any) => `  - ${m.label}: ${m.reach.toLocaleString()} reach, ${m.count} placements`).join("\n")}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coverage-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
