import { useQuery } from "@tanstack/react-query";
import { getAwards } from "@/services/awardsService";

export function useAwards() {
  return useQuery({
    queryKey: ["awards"],
    queryFn: getAwards,
  });
}
