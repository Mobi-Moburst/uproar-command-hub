// Snapshots all placements flagged "Weekly Wins" in Airtable into the
// public.weekly_wins table. Idempotent — re-running upserts by placement id
// so already-captured wins remain even after the Airtable flag is cleared.

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
  if (val == null) return 0;
  if (Array.isArray(val)) {
    const raw = val[0];
    if (raw == null || typeof raw === "object") return 0;
    const n = Number(String(raw).replace(/[^0-9.-]/g, "") || 0);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof val === "object") return 0;
  const n = Number(String(val).replace(/[^0-9.-]/g, "") || 0);
  return Number.isFinite(n) ? n : 0;
}

/** Compute ISO Monday-week-start (YYYY-MM-DD) in UTC */
function weekStartUTC(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

async function fetchAirtable(
  baseId: string,
  table: string,
  apiKey: string,
  opts: Record<string, string> = {},
): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ ...opts, pageSize: "100" });
    if (offset) params.set("offset", offset);
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params}`;

    // Retry on 429 with exponential backoff
    let res!: Response;
    let delay = 1000;
    for (let attempt = 1; attempt <= 6; attempt++) {
      res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (res.status !== 429) break;
      await res.text();
      if (attempt === 6) break;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable ${res.status}: ${body}`);
    }
    const data: AirtableListResponse = await res.json();
    all.push(...data.records);
    offset = data.offset;
  } while (offset);
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("AIRTABLE_API_KEY");
    const rawBase = Deno.env.get("AIRTABLE_BASE_PLACEMENTS");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !rawBase || !supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseId = rawBase.split("/")[0];

    // 1. Fetch all currently-flagged wins + outlet lookup
    const [winRecords, outletRecords] = await Promise.all([
      fetchAirtable(baseId, "tblw34mWTvuaIUz16", apiKey, {
        filterByFormula: "{Weekly Wins Trigger}!=''",
      }),
      fetchAirtable(baseId, "tbl65cHPi8TIHTfpT", apiKey),
    ]);

    const outletLookup = new Map<string, string>(
      outletRecords.map((r) => [r.id, first(r.fields["Outlets"] ?? r.fields["Name"])]),
    );

    // 2. Map to rows
    const rows = winRecords.map((r) => {
      const f = r.fields as Record<string, unknown>;
      const date = first(f["\uFEFFDate"] ?? f["Date"] ?? f["date"]);
      const outletLinked = first(f["Outlet (Linked)"] ?? f["Outlet"]);
      let outlet = outletLinked;
      if (outletLinked.startsWith("rec")) {
        outlet = outletLookup.get(outletLinked) || first(f["Import Outlet"]) || outletLinked;
      } else if (!outlet) {
        outlet = first(f["Import Outlet"]) || "–";
      }
      return {
        id: r.id,
        date,
        week_start: weekStartUTC(date),
        client_name: first(f["Client Name"] ?? f["Client"]),
        team_name: first(f["Team Name"] ?? f["Team"]),
        outlet,
        reporter_name: first(f["Reporter Name"]),
        headline: first(f["Headline"]),
        link: first(f["Link"]),
        type: first(f["Type"]) || "Online",
        vertical: first(f["Vertical"]),
        readership_viewership: firstNum(f["Readership/Viewership"] ?? f["Readership / Viewership"]),
        ad_value: firstNum(f["Ad Value"] ?? f["AVE"]),
        secured_by: first(f["Secured by?"] ?? f["Secured By"]),
        topic_product: first(f["Topic/Product"] ?? f["Topic / Product"]),
        notes: first(f["Notes"]),
        updated_at: new Date().toISOString(),
      };
    });

    // 3. Upsert into weekly_wins (preserves captured_at on existing rows)
    const client = createClient(supabaseUrl, serviceKey);
    let upserted = 0;
    if (rows.length) {
      const { error } = await client
        .from("weekly_wins")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: false });
      if (error) throw new Error(`upsert failed: ${error.message}`);
      upserted = rows.length;
    }

    return new Response(
      JSON.stringify({ ok: true, flagged_in_airtable: winRecords.length, upserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("snapshot-weekly-wins error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
