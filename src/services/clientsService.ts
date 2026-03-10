/**
 * Client data is currently derived by aggregating placements + awards.
 * If you later add a dedicated Clients table in Airtable, replace the
 * derivation logic with a direct fetchTable() call + mapper.
 */

import { clients as mockClients } from "@/data/mockData";
import type { Client } from "@/data/types";

/**
 * Returns the client list.
 * Today this returns mock data. When Airtable is connected you can either:
 *   a) fetch from a dedicated Clients table, or
 *   b) derive from placements + awards (see commented sketch below)
 */
export async function getClients(): Promise<Client[]> {
  // TODO: Replace with Airtable fetch or derivation logic
  return mockClients;
}
