const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  base: "placements" | "awards";
  table: string;
  options?: Record<string, string>;
  maxRecords?: number;
}

interface AirtableListResponse {
  records: Array<{ id: string; fields: Record<string, unknown>; createdTime: string }>;
  offset?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("AIRTABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AIRTABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { base, table, options = {}, maxRecords } = (await req.json()) as RequestBody;

    const sanitizedOptions = { ...options };

    const rawBaseIds: Record<string, string | undefined> = {
      placements: Deno.env.get("AIRTABLE_BASE_PLACEMENTS"),
      awards: Deno.env.get("AIRTABLE_BASE_AWARDS"),
    };

    const rawBaseId = rawBaseIds[base];
    if (!rawBaseId) {
      return new Response(JSON.stringify({ error: `Base "${base}" not configured` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseId = rawBaseId.split("/")[0];

    // Fetch pages with optional maxRecords cap
    const allRecords: AirtableListResponse["records"] = [];
    let offset: string | undefined;
    const limit = maxRecords ?? 10000; // default cap to avoid runaway pagination

    do {
      const params = new URLSearchParams({ ...sanitizedOptions, pageSize: "100" });
      if (offset) params.set("offset", offset);

      const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params}`;
      console.log("Fetching Airtable URL:", url);

      // Fetch with retry on 429 (rate limit) using exponential backoff
      let res!: Response;
      let delay = 1000;
      const maxAttempts = 6;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
        if (res.status !== 429) break;
        await res.text(); // drain body
        if (attempt === maxAttempts) break;
        console.warn(`Airtable 429, retry ${attempt} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }

      if (!res.ok) {
        const body = await res.text();
        return new Response(JSON.stringify({ error: `Airtable error ${res.status}: ${body}` }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data: AirtableListResponse = await res.json();
      allRecords.push(...data.records);
      offset = data.offset;
    } while (offset && allRecords.length < limit);

    return new Response(JSON.stringify({ records: allRecords }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
