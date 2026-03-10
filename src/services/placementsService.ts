import { isAirtableConfigured, fetchTable, BASE_IDS, TABLE_NAMES } from "./airtable";
import { mapPlacement } from "./mappers";
import { placements as mockPlacements } from "@/data/mockData";
import type { MediaPlacement } from "@/data/types";

/** Fetch all media placements — from Airtable if configured, otherwise mock data */
export async function getPlacements(): Promise<MediaPlacement[]> {
  if (!isAirtableConfigured() || !BASE_IDS.placements) {
    // Simulate async to keep the loading-state UX consistent
    return mockPlacements;
  }

  const records = await fetchTable(BASE_IDS.placements, TABLE_NAMES.placements);
  return records.map(mapPlacement);
}

/** Fetch only placements flagged as weekly wins */
export async function getWeeklyWins(): Promise<MediaPlacement[]> {
  const all = await getPlacements();
  return all.filter((p) => p.weekly_wins_trigger);
}
