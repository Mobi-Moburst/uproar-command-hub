/**
 * Team summaries derived from live placements + awards data.
 */

import { getPlacements } from "./placementsService";
import { getAwards } from "./awardsService";
import type { Team } from "@/data/types";

export async function getTeamSummary(): Promise<Team[]> {
  const [placements, awards] = await Promise.all([getPlacements(), getAwards()]);

  const teamMap = new Map<string, Team>();

  for (const p of placements) {
    const name = p.team_name;
    if (!name) continue;

    const existing = teamMap.get(name);
    if (existing) {
      existing.placement_count += 1;
      existing.total_reach += p.readership_viewership;
      existing.total_ad_value += p.ad_value;
    } else {
      teamMap.set(name, {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        team_name: name,
        placement_count: 1,
        total_reach: p.readership_viewership,
        total_ad_value: p.ad_value,
        total_submissions: 0,
        total_wins: 0,
      });
    }
  }

  for (const a of awards) {
    const name = a.team_name;
    if (!name) continue;

    const existing = teamMap.get(name);
    if (existing) {
      existing.total_submissions += 1;
      if (a.status === "Won") existing.total_wins += 1;
    } else {
      teamMap.set(name, {
        id: name.toLowerCase().replace(/\s+/g, "-"),
        team_name: name,
        placement_count: 0,
        total_reach: 0,
        total_ad_value: 0,
        total_submissions: 1,
        total_wins: a.status === "Won" ? 1 : 0,
      });
    }
  }

  return Array.from(teamMap.values()).sort((a, b) => a.team_name.localeCompare(b.team_name));
}
