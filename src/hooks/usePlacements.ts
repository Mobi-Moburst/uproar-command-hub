import { useQuery } from "@tanstack/react-query";
import { getPlacements, getWeeklyWins } from "@/services/placementsService";

export function usePlacements() {
  return useQuery({
    queryKey: ["placements"],
    queryFn: getPlacements,
  });
}

export function useWeeklyWins() {
  return useQuery({
    queryKey: ["weeklyWins"],
    queryFn: getWeeklyWins,
  });
}
