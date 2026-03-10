import { fetchTable, TABLE_IDS } from "./airtable";
import { mapAward } from "./mappers";
import { awards as mockAwards } from "@/data/mockData";
import type { AwardSubmission } from "@/data/types";

/** Fetch all award submissions — from Airtable via edge function, fallback to mock */
export async function getAwards(): Promise<AwardSubmission[]> {
  try {
    const records = await fetchTable("awards", TABLE_IDS.awards);
    return records.map(mapAward);
  } catch (e) {
    console.warn("Failed to fetch awards from Airtable, using mock data:", e);
    return mockAwards;
  }
}
