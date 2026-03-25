import { fetchTable, TABLE_IDS } from "./airtable";
import { mapBriefing } from "./mappers";
import type { Briefing } from "@/data/types";

export async function getBriefings(): Promise<Briefing[]> {
  const records = await fetchTable("placements", TABLE_IDS.briefings);
  return records.map(mapBriefing);
}
