/**
 * Client data derived by aggregating placements + awards from Airtable.
 */

import { getPlacements } from "./placementsService";
import { getAwards } from "./awardsService";
import type { Client } from "@/data/types";

export async function getClients(): Promise<Client[]> {
  const [placements, awards] = await Promise.all([getPlacements(), getAwards()]);

  // Build client map from placements
  const clientMap = new Map<string, Client>();

  for (const p of placements) {
    const name = p.client_name;
    if (!name) continue;

    const existing = clientMap.get(name);
    if (existing) {
      existing.total_placements += 1;
      existing.total_reach += p.readership_viewership;
      existing.total_ad_value += p.ad_value;
      if (p.date > existing.last_placement_date) {
        existing.last_placement_date = p.date;
      }
      if (!existing.team_name && p.team_name) existing.team_name = p.team_name;
      if (!existing.vertical && p.vertical) existing.vertical = p.vertical;
    } else {
      clientMap.set(name, {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        status: "Active",
        team_name: p.team_name || "",
        vertical: p.vertical || "",
        active_campaign: "",
        total_placements: 1,
        total_reach: p.readership_viewership,
        total_ad_value: p.ad_value,
        total_award_submissions: 0,
        total_award_wins: 0,
        last_placement_date: p.date || "",
      });
    }
  }

  // Enrich with award data
  for (const a of awards) {
    const name = a.client_name;
    if (!name) continue;

    const existing = clientMap.get(name);
    if (existing) {
      existing.total_award_submissions += 1;
      if (a.status === "Won") existing.total_award_wins += 1;
    } else {
      clientMap.set(name, {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
        status: "Active",
        team_name: a.team_name || "",
        vertical: "",
        active_campaign: "",
        total_placements: 0,
        total_reach: 0,
        total_ad_value: 0,
        total_award_submissions: 1,
        total_award_wins: a.status === "Won" ? 1 : 0,
        last_placement_date: "",
      });
    }
  }

  return Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}
