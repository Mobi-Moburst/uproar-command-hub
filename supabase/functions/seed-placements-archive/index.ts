import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

function first(val: unknown): string {
  if (Array.isArray(val)) return String(val[0] ?? "");
  if (val == null) return "";
  return String(val);
}

function firstNum(val: unknown): number {
  if (Array.isArray(val)) return Number(val[0]) || 0;
  return Number(val) || 0;
}

function mapPlacement(record: AirtableRecord, outletLookup: Map<string, string>) {
  const f = record.fields;
  const rawOutlet = first(f["Outlet (Linked)"] ?? f["Outlet"]);
  const outlet = rawOutlet.startsWith("rec") ? (outletLookup.get(rawOutlet) ?? rawOutlet) : rawOutlet;
  return {
    id: record.id,
    date: first(f["Date"]),
    client_name: first(f["Client Name"] ?? f["Client"]),
    team_name: first(f["Team Name"] ?? f["Team"]),
    outlet,
    reporter_name: first(f["Reporter Name"] ?? f["Reporter"]),
    headline: first(f["Headline"]),
    link: first(f["Link"]),
    type: first(f["Type"]),
    vertical: first(f["Vertical"]),
    readership_viewership: firstNum(f["Readership/Viewership"] ?? f["Readership Viewership"]),
    ad_value: firstNum(f["Ad Value"]),
    secured_by: first(f["Secured By"]),
    topic_product: first(f["Topic/Product"] ?? f["Topic Product"]),
    notes: first(f["Notes"]),
    weekly_wins_trigger: Boolean(f["Weekly Wins Trigger"] ?? f["Weekly Wins"]),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("AIRTABLE_API_KEY");
    const rawBaseId = Deno.env.get("AIRTABLE_BASE_PLACEMENTS");
    if (!apiKey || !rawBaseId) {
      return new Response(JSON.stringify({ error: "Missing Airtable config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseId = rawBaseId.split("/")[0];
    const tableId = "tblsFhq3a6NPalO5N";
    const outletsTableId = "tbl65cHPi8TIHTfpT";

    // Fetch Outlets table for ID→name lookup
    const outletRecords: AirtableRecord[] = [];
    let outletOffset: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (outletOffset) params.set("offset", outletOffset);
      const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(outletsTableId)}?${params}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Airtable outlets error ${res.status}: ${body}`);
      }
      const data: AirtableListResponse = await res.json();
      outletRecords.push(...data.records);
      outletOffset = data.offset;
    } while (outletOffset);

    const outletLookup = new Map<string, string>(
      outletRecords.map((r) => [r.id, first(r.fields["Name"] as unknown)])
    );
    console.log(`Built outlet lookup with ${outletLookup.size} entries`);

    // Fetch ALL records from Airtable with pagination
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.set("offset", offset);

      const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}?${params}`;
      console.log(`Fetching page... (${allRecords.length} records so far)`);

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Airtable error ${res.status}: ${body}`);
      }

      const data: AirtableListResponse = await res.json();
      allRecords.push(...data.records);
      offset = data.offset;
    } while (offset);

    console.log(`Fetched ${allRecords.length} total records from Airtable`);

    // Map and filter to ≤2025
    const mapped = allRecords.map((r) => mapPlacement(r, outletLookup));
    const historical = mapped.filter((p) => {
      if (!p.date) return false;
      return p.date <= "2025-12-31";
    });

    console.log(`${historical.length} records are ≤2025, inserting into archive...`);

    // Upsert into placements_archive
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Batch upsert in chunks of 500
    const chunkSize = 500;
    let inserted = 0;

    for (let i = 0; i < historical.length; i += chunkSize) {
      const chunk = historical.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("placements_archive")
        .upsert(chunk, { onConflict: "id" });

      if (error) {
        throw new Error(`Upsert error at chunk ${i}: ${error.message}`);
      }
      inserted += chunk.length;
      console.log(`Upserted ${inserted}/${historical.length}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_fetched: allRecords.length,
        archived: historical.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Seed error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
