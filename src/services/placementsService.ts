import { fetchTable, TABLE_IDS } from "./airtable";
import { mapPlacement } from "./mappers";
import { placements as mockPlacements } from "@/data/mockData";
import type { MediaPlacement } from "@/data/types";

/** Fetch all media placements — from Airtable via edge function, fallback to mock */
export async function getPlacements(): Promise<MediaPlacement[]> {
  try {
    const records = await fetchTable("placements", TABLE_IDS.placements);
    return records.map(mapPlacement);
  } catch (e) {
    console.warn("Failed to fetch placements from Airtable, using mock data:", e);
    return mockPlacements;
  }
}

/** Fetch only placements flagged as weekly wins */
export async function getWeeklyWins(): Promise<MediaPlacement[]> {
  const all = await getPlacements();
  return all.filter((p) => p.weekly_wins_trigger);
}
