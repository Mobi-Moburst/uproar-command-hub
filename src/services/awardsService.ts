import { isAirtableConfigured, fetchTable, BASE_IDS, TABLE_NAMES } from "./airtable";
import { mapAward } from "./mappers";
import { awards as mockAwards } from "@/data/mockData";
import type { AwardSubmission } from "@/data/types";

/** Fetch all award submissions — from Airtable if configured, otherwise mock data */
export async function getAwards(): Promise<AwardSubmission[]> {
  if (!isAirtableConfigured() || !BASE_IDS.awards) {
    return mockAwards;
  }

  const records = await fetchTable(BASE_IDS.awards, TABLE_NAMES.awards);
  return records.map(mapAward);
}
