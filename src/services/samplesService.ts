import { fetchTable, TABLE_IDS } from "./airtable";
import { mapSample } from "./mappers";
import type { Sample } from "@/data/types";

export async function getSamples(): Promise<Sample[]> {
  const records = await fetchTable("placements", TABLE_IDS.samples);
  return records.map(mapSample);
}
