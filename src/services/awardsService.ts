import { fetchTable, TABLE_IDS } from "./airtable";
import { mapAward } from "./mappers";
import { awards as mockAwards } from "@/data/mockData";
import type { AwardSubmission } from "@/data/types";

function first(val: unknown): string {
  if (Array.isArray(val)) return String(val[0] ?? "");
  if (val == null) return "";
  return String(val);
}

/** Fetch all award submissions — from Airtable via edge function, fallback to mock */
export async function getAwards(): Promise<AwardSubmission[]> {
  try {
    const [submissions, clientRecords] = await Promise.all([
      fetchTable("awards", TABLE_IDS.awards),
      fetchTable("awards", TABLE_IDS.awardsClients),
    ]);

    const clientLookup = new Map<string, string>(
      clientRecords.map((r) => [r.id, first(r.fields["Name"])])
    );

    return submissions.map((r) => mapAward(r, clientLookup));
  } catch (e) {
    console.warn("Failed to fetch awards from Airtable, using mock data:", e);
    return mockAwards;
  }
}
