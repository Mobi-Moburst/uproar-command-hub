import { useQuery } from "@tanstack/react-query";
import { getSamples } from "@/services/samplesService";

export function useSamples() {
  return useQuery({
    queryKey: ["samples"],
    queryFn: getSamples,
    staleTime: 5 * 60 * 1000,
  });
}
