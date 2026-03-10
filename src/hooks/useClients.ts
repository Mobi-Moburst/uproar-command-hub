import { useQuery } from "@tanstack/react-query";
import { getClients } from "@/services/clientsService";

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: getClients,
  });
}
