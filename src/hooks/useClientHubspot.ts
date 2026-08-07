import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HubspotSuggestion {
  id: string;
  name: string;
  domain: string;
  city: string;
  lifecycle_stage: string;
  industry: string;
  owner_name: string;
  hubspot_url: string;
}

export interface HubspotContact {
  id: string;
  name: string;
  title: string;
  email: string;
  hubspot_url: string;
}

export interface HubspotDeal {
  id: string;
  name: string;
  stage: string;
  amount: number | null;
  close_date: string | null;
  hubspot_url: string;
}

export interface HubspotLink {
  client_name: string;
  hubspot_company_id: string | null;
  match_confidence: string;
  matched_by: string;
  suggestions: HubspotSuggestion[];
}

export interface HubspotSnapshot {
  client_name: string;
  hubspot_company_id: string;
  company_name: string | null;
  domain: string | null;
  lifecycle_stage: string | null;
  industry: string | null;
  owner_name: string | null;
  city: string | null;
  contacts: HubspotContact[];
  deals: HubspotDeal[];
  last_activity_date: string | null;
  synced_at: string;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("hubspot-clients", { body });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export function useClientHubspot(clientName: string | null) {
  const queryClient = useQueryClient();

  const link = useQuery({
    queryKey: ["hubspot-link", clientName],
    enabled: !!clientName,
    queryFn: async () => {
      const { data } = await supabase
        .from("client_hubspot_links")
        .select("client_name, hubspot_company_id, match_confidence, matched_by, suggestions")
        .eq("client_name", clientName!)
        .maybeSingle();
      return (data as unknown as HubspotLink) ?? null;
    },
  });

  const snapshot = useQuery({
    queryKey: ["hubspot-snapshot", clientName],
    enabled: !!clientName,
    queryFn: async () => {
      const { data } = await supabase
        .from("client_hubspot_snapshot")
        .select("*")
        .eq("client_name", clientName!)
        .maybeSingle();
      return (data as unknown as HubspotSnapshot) ?? null;
    },
  });

  const portal = useQuery({
    queryKey: ["hubspot-portal"],
    staleTime: 1000 * 60 * 60,
    queryFn: () => invoke<{ portal_id: string | null }>({ action: "portal" }),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hubspot-link", clientName] });
    queryClient.invalidateQueries({ queryKey: ["hubspot-snapshot", clientName] });
  };

  const linkCompany = useMutation({
    mutationFn: (companyId: string | null) =>
      invoke({ action: "link", client_name: clientName, hubspot_company_id: companyId }),
    onSuccess: (_d, companyId) => {
      refresh();
      toast.success(companyId ? "Linked to HubSpot" : "Marked as not in HubSpot");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save the link"),
  });

  const sync = useMutation({
    mutationFn: () => invoke({ action: "sync", client_name: clientName }),
    onSuccess: () => {
      refresh();
      toast.success("HubSpot data refreshed");
    },
    onError: (e: Error) => toast.error(e.message || "Sync failed"),
  });

  return {
    link: link.data ?? null,
    snapshot: snapshot.data ?? null,
    portalId: portal.data?.portal_id ?? null,
    isLoading: link.isLoading || snapshot.isLoading,
    linkCompany,
    sync,
  };
}

export function useHubspotSearch() {
  return useMutation({
    mutationFn: (term: string) =>
      invoke<{ results: HubspotSuggestion[] }>({ action: "search", term }),
  });
}

export function useHubspotMatchAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clients: string[]) =>
      invoke<{ auto_linked: number; needs_pick: number }>({ action: "match", clients }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["hubspot-link"] });
      queryClient.invalidateQueries({ queryKey: ["hubspot-snapshot"] });
      toast.success(`${res.auto_linked} clients linked · ${res.needs_pick} need a quick check`);
    },
    onError: (e: Error) => toast.error(e.message || "Match failed"),
  });
}
