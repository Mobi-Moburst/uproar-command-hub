const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  base: "placements" | "awards";
  table: string;
  options?: Record<string, string>;
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

    const { base, table, options = {} } = (await req.json()) as RequestBody;

    const baseIds: Record<string, string | undefined> = {
      placements: Deno.env.get("AIRTABLE_BASE_PLACEMENTS"),
      awards: Deno.env.get("AIRTABLE_BASE_AWARDS"),
    };

    const baseId = baseIds[base];
    if (!baseId) {
      return new Response(JSON.stringify({ error: `Base "${base}" not configured` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all pages
    const allRecords: AirtableListResponse["records"] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams({ ...options });
      if (offset) params.set("offset", offset);

      const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params}`;
      console.log("Fetching Airtable URL:", url, "baseId:", baseId);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

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
    } while (offset);

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
