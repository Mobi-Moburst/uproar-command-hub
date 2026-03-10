/**
 * Airtable API client for Uproar Command Center.
 *
 * SETUP INSTRUCTIONS:
 * 1. Set VITE_AIRTABLE_API_KEY to your Airtable Personal Access Token
 * 2. Set VITE_AIRTABLE_BASE_PLACEMENTS to your Clips / Media Placements base ID (e.g. "appXXXXXXXXXXXXXX")
 * 3. Set VITE_AIRTABLE_BASE_AWARDS to your Awards Submissions base ID
 * 4. Update TABLE_NAMES below to match your actual table names
 *
 * All env vars are read at runtime so the app gracefully falls back to mock data
 * when credentials are missing.
 */

// ── Configuration ──────────────────────────────────────────────────────────────

const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY as string | undefined;

/** Base IDs — one per Airtable base */
export const BASE_IDS = {
  placements: import.meta.env.VITE_AIRTABLE_BASE_PLACEMENTS as string | undefined,
  awards: import.meta.env.VITE_AIRTABLE_BASE_AWARDS as string | undefined,
};

/** Table names inside each base — update these to match your Airtable schema */
export const TABLE_NAMES = {
  placements: "Clips",        // ← rename to your actual table name
  awards: "Submissions",      // ← rename to your actual table name
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns true when at least one Airtable base is configured */
export function isAirtableConfigured(): boolean {
  return Boolean(AIRTABLE_API_KEY && (BASE_IDS.placements || BASE_IDS.awards));
}

export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  fields: T;
  createdTime: string;
}

interface AirtableListResponse<T = Record<string, unknown>> {
  records: AirtableRecord<T>[];
  offset?: string;
}

/**
 * Generic Airtable table fetcher.
 * Handles pagination automatically and returns all records.
 *
 * @param baseId  – Airtable base ID (starts with "app")
 * @param table   – Table name or ID
 * @param options – Optional Airtable API params (view, filterByFormula, sort, etc.)
 */
export async function fetchTable<T = Record<string, unknown>>(
  baseId: string,
  table: string,
  options: Record<string, string> = {},
): Promise<AirtableRecord<T>[]> {
  if (!AIRTABLE_API_KEY) {
    throw new Error("Airtable API key is not configured. Set VITE_AIRTABLE_API_KEY.");
  }

  const allRecords: AirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ ...options });
    if (offset) params.set("offset", offset);

    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${params}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable error ${res.status}: ${body}`);
    }

    const data: AirtableListResponse<T> = await res.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}
