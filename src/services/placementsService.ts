import { supabase } from "@/integrations/supabase/client";
import { fetchTable, TABLE_IDS } from "./airtable";
import { mapPlacement } from "./mappers";
import { placements as mockPlacements } from "@/data/mockData";
import type { MediaPlacement } from "@/data/types";

/** Fetch archived (≤2025) placements from the database */
async function getArchivedPlacements(): Promise<MediaPlacement[]> {
  const allRows: Record<string, unknown>[] = [];
  const pageSize = 1000; // PostgREST enforces max 1000 rows per request
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("placements_archive")
      .select("id, date, client_name, team_name, outlet, reporter_name, headline, link, type, vertical, readership_viewership, ad_value, secured_by, topic_product, notes, weekly_wins_trigger")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Failed to fetch archived placements:", error.message);
      return [];
    }

    allRows.push(...(data ?? []));
    hasMore = (data?.length ?? 0) === pageSize;
    from += pageSize;
  }

  console.log(`Fetched ${allRows.length} archived placements`);

  return allRows.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    date: String(row.date ?? ""),
    client_name: String(row.client_name ?? ""),
    team_name: String(row.team_name ?? ""),
    outlet: String(row.outlet ?? ""),
    reporter_name: String(row.reporter_name ?? ""),
    headline: String(row.headline ?? ""),
    link: String(row.link ?? ""),
    type: String(row.type ?? ""),
    vertical: String(row.vertical ?? ""),
    readership_viewership: Number(row.readership_viewership) || 0,
    ad_value: Number(row.ad_value) || 0,
    secured_by: String(row.secured_by ?? ""),
    topic_product: String(row.topic_product ?? ""),
    notes: String(row.notes ?? ""),
    weekly_wins_trigger: Boolean(row.weekly_wins_trigger),
  }));
}

function first(val: unknown): string {
  if (Array.isArray(val)) return String(val[0] ?? "");
  if (val == null) return "";
  return String(val);
}

/** Fetch live (2026+) placements from Airtable, resolving outlet IDs */
async function getLivePlacements(): Promise<MediaPlacement[]> {
  const [records, outletRecords] = await Promise.all([
    fetchTable("placements", TABLE_IDS.placements, {
      filterByFormula: "IS_AFTER({Date}, '2025-12-31')",
    }),
    fetchTable("placements", TABLE_IDS.outlets),
  ]);

  const outletLookup = new Map<string, string>(
    outletRecords.map((r) => [r.id, first(r.fields["Name"])])
  );

  return records.map((r) => mapPlacement(r, outletLookup));
}

/** Fetch all media placements — archived from DB + live from Airtable */
export async function getPlacements(): Promise<MediaPlacement[]> {
  try {
    const [archived, live] = await Promise.all([
      getArchivedPlacements(),
      getLivePlacements(),
    ]);

    // Deduplicate by ID — live records take precedence
    const byId = new Map<string, MediaPlacement>();
    for (const p of archived) byId.set(p.id, p);
    for (const p of live) byId.set(p.id, p);

    return Array.from(byId.values()).sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
  } catch (e) {
    console.warn("Failed to fetch placements, using mock data:", e);
    return mockPlacements;
  }
}

/** Fetch only placements flagged as weekly wins */
export async function getWeeklyWins(): Promise<MediaPlacement[]> {
  const all = await getPlacements();
  return all.filter((p) => p.weekly_wins_trigger);
}
