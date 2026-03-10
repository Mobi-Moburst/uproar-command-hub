import { supabase } from "@/integrations/supabase/client";
import { fetchTable, TABLE_IDS } from "./airtable";
import { mapPlacement } from "./mappers";
import { placements as mockPlacements } from "@/data/mockData";
import type { MediaPlacement } from "@/data/types";

/** Fetch archived (≤2025) placements from the database */
async function getArchivedPlacements(): Promise<MediaPlacement[]> {
  // Fetch all rows using pagination (default limit is 1000)
  const allRows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("placements_archive")
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) {
      console.warn("Failed to fetch archived placements:", error.message);
      return [];
    }

    allRows.push(...(data ?? []));
    hasMore = (data?.length ?? 0) === pageSize;
    from += pageSize;
  }

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

/** Fetch live (2026+) placements from Airtable */
async function getLivePlacements(): Promise<MediaPlacement[]> {
  const records = await fetchTable("placements", TABLE_IDS.placements, {
    filterByFormula: "IS_AFTER({Date}, '2025-12-31')",
  });
  return records.map(mapPlacement);
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

    return Array.from(byId.values());
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
