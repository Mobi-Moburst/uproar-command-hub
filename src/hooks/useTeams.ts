import { useQuery } from "@tanstack/react-query";
import { getTeamSummary } from "@/services/teamsService";

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: getTeamSummary,
  });
}
