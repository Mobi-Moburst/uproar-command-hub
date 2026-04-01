import { fetchTable, TABLE_IDS } from "./airtable";
import { mapBriefing } from "./mappers";
import type { Briefing } from "@/data/types";

function first(val: unknown): string {
  if (Array.isArray(val)) return String(val[0] ?? "");
  if (val == null) return "";
  return String(val);
}

export async function getBriefings(): Promise<Briefing[]> {
  const [records, outletRecords] = await Promise.all([
    fetchTable("placements", TABLE_IDS.briefings),
    fetchTable("placements", TABLE_IDS.outlets),
  ]);

  const outletLookup = new Map<string, string>(
    outletRecords.map((r) => [r.id, first(r.fields["Outlets"] ?? r.fields["Name"])])
  );

  return records.map((r) => mapBriefing(r, outletLookup));
}
