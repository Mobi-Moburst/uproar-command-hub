/**
 * Airtable client — calls the airtable-proxy edge function
 * so the API key never reaches the browser.
 */

import { supabase } from "@/integrations/supabase/client";

/** Table IDs for each base */
export const TABLE_IDS = {
  placements: "tblsFhq3a6NPalO5N",
  awards: "tblyqY5sA6j41GqYY",
};

/** Always configured — the edge function holds the secrets */
export function isAirtableConfigured(): boolean {
  return true;
}

export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  fields: T;
  createdTime: string;
}

/**
 * Fetch all records from an Airtable table via the edge-function proxy.
 */
export async function fetchTable<T = Record<string, unknown>>(
  base: "placements" | "awards",
  table: string,
  options: Record<string, string> = {},
): Promise<AirtableRecord<T>[]> {
  const { data, error } = await supabase.functions.invoke("airtable-proxy", {
    body: { base, table, options },
  });

  if (error) {
    throw new Error(`airtable-proxy error: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data.records as AirtableRecord<T>[];
}
