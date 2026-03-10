/**
 * Team summaries are currently sourced from mock data.
 * When Airtable is live, derive from placements + awards grouped by team_name.
 */

import { teams as mockTeams } from "@/data/mockData";
import type { Team } from "@/data/types";

export async function getTeamSummary(): Promise<Team[]> {
  // TODO: Replace with aggregation from placements + awards data
  return mockTeams;
}
