import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PitchCampaign {
  id: string;
  client_name: string;
  angle: string;
  description: string | null;
  press_release_body: string | null;
  status: string;
  created_at: string;
}

export interface PitchWarning {
  kind: string;
  label: string;
  detail?: string;
}

export interface PitchContact {
  id: string;
  campaign_id: string;
  name: string;
  outlet: string;
  email: string | null;
  beat: string;
  title: string;
  location: string;
  hubspot_contact_id: string | null;
  hubspot_ticket_id: string | null;
  stage_cache: string | null;
  warnings: PitchWarning[];
  excluded: boolean;
}

export interface ImportRow {
  name: string;
  outlet: string;
  email: string;
  beat: string;
  title: string;
  location: string;
  source_row: Record<string, unknown>;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("pitch-hubspot", { body });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export function usePitchCampaigns() {
  const queryClient = useQueryClient();

  const campaigns = useQuery({
    queryKey: ["pitch-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pitch_campaigns")
        .select("id, client_name, angle, description, press_release_body, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PitchCampaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (input: {
      client_name: string;
      angle: string;
      description?: string;
      press_release_body?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("pitch_campaigns")
        .insert({ ...input, created_by: auth.user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pitch-campaigns"] });
      toast.success("Campaign created");
    },
    onError: (e: Error) => toast.error(e.message || "Could not create the campaign"),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pitch_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pitch-campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete the campaign"),
  });

  return {
    campaigns: campaigns.data ?? [],
    isLoading: campaigns.isLoading,
    createCampaign,
    deleteCampaign,
  };
}

export function usePitchCampaign(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["pitch-campaign", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pitch_campaigns")
        .select("id, client_name, angle, description, press_release_body, status, created_at")
        .eq("id", campaignId!)
        .maybeSingle();
      if (error) throw error;
      return (data as PitchCampaign) ?? null;
    },
  });
}

export function usePitchContacts(campaignId: string | undefined) {
  const queryClient = useQueryClient();

  const contacts = useQuery({
    queryKey: ["pitch-contacts", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pitch_contacts")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PitchContact[];
    },
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["pitch-contacts", campaignId] });

  const importRows = useMutation({
    mutationFn: (rows: ImportRow[]) =>
      invoke<{ imported: number; created: number; matched: number; failed: number }>({
        action: "import",
        campaign_id: campaignId,
        rows,
      }),
    onSuccess: (res) => {
      refresh();
      const parts = [`${res.imported} imported`];
      if (res.matched) parts.push(`${res.matched} matched in CRM`);
      if (res.created) parts.push(`${res.created} added to CRM`);
      if (res.failed) parts.push(`${res.failed} failed`);
      toast.success(parts.join(" · "));
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });

  const setExcluded = useMutation({
    mutationFn: async ({ id, excluded }: { id: string; excluded: boolean }) => {
      const { error } = await supabase.from("pitch_contacts").update({ excluded }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message || "Could not update the contact"),
  });

  return {
    contacts: contacts.data ?? [],
    isLoading: contacts.isLoading,
    importRows,
    setExcluded,
  };
}

export function useClientGuardrails(clientName: string | undefined) {
  const queryClient = useQueryClient();

  const guardrails = useQuery({
    queryKey: ["client-guardrails", clientName],
    enabled: !!clientName,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_pitch_guardrails")
        .select("id, client_name, rule, scope, created_at")
        .eq("client_name", clientName!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; client_name: string; rule: string; scope: string }[];
    },
  });

  const addGuardrail = useMutation({
    mutationFn: async (input: { rule: string; scope: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("client_pitch_guardrails").insert({
        client_name: clientName!,
        rule: input.rule,
        scope: input.scope,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-guardrails", clientName] });
      toast.success("Guardrail added");
    },
    onError: (e: Error) => toast.error(e.message || "Could not add the guardrail"),
  });

  const removeGuardrail = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_pitch_guardrails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-guardrails", clientName] }),
    onError: (e: Error) => toast.error(e.message || "Could not remove the guardrail"),
  });

  return {
    guardrails: guardrails.data ?? [],
    addGuardrail,
    removeGuardrail,
  };
}

export function useHubspotPortalId() {
  return useQuery({
    queryKey: ["hubspot-portal"],
    staleTime: 1000 * 60 * 60,
    queryFn: () => invoke<{ portal_id: string | null }>({ action: "portal" }),
  });
}
