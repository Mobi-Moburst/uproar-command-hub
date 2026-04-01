import { fetchTable, TABLE_IDS } from "./airtable";
import { mapSample } from "./mappers";
import type { Sample } from "@/data/types";

function first(val: unknown): string {
  if (Array.isArray(val)) return String(val[0] ?? "");
  if (val == null) return "";
  return String(val);
}

export async function getSamples(): Promise<Sample[]> {
  const [records, outletRecords] = await Promise.all([
    fetchTable("placements", TABLE_IDS.samples),
    fetchTable("placements", TABLE_IDS.outlets),
  ]);

  const outletLookup = new Map<string, string>(
    outletRecords.map((r) => [r.id, first(r.fields["Name"])])
  );

  return records.map((r) => mapSample(r, outletLookup));
}
