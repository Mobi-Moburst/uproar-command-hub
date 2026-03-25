import { useQuery } from "@tanstack/react-query";
import { getBriefings } from "@/services/briefingsService";

export function useBriefings() {
  return useQuery({
    queryKey: ["briefings"],
    queryFn: getBriefings,
    staleTime: 5 * 60 * 1000,
  });
}
