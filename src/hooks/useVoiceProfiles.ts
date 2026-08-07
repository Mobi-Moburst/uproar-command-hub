import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VoiceProfile {
  id: string;
  client_name: string | null;
  name: string;
  guidance: string;
  active: boolean;
  updated_by: string | null;
  updated_at: string;
}

export function useVoiceProfiles() {
  const queryClient = useQueryClient();
  const key = ["pitch-voice-profiles"];

  const profiles = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pitch_voice_profiles")
        .select("id, client_name, name, guidance, active, updated_by, updated_at")
        .order("client_name", { nullsFirst: true });
      if (error) throw error;
      return (data ?? []) as VoiceProfile[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const save = useMutation({
    mutationFn: async (input: {
      id?: string;
      client_name: string | null;
      name: string;
      guidance: string;
      active?: boolean;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const payload = {
        client_name: input.client_name,
        name: input.name,
        guidance: input.guidance,
        active: input.active ?? true,
        updated_by: auth.user?.id ?? null,
      };
      if (input.id) {
        const { error } = await supabase
          .from("pitch_voice_profiles")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pitch_voice_profiles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Voice profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pitch_voice_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Voice profile removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { profiles, save, remove };
}

/** Distinct clients that have pitch campaigns — the set worth overriding voice for. */
export function useCampaignClients() {
  return useQuery({
    queryKey: ["pitch-campaign-clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pitch_campaigns").select("client_name");
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r) => r.client_name).filter(Boolean))).sort();
    },
  });
}

export function useVoicePreview() {
  return useMutation({
    mutationFn: async (input: { campaign_id: string; voice_override?: string }) => {
      const { data, error } = await supabase.functions.invoke("pitch-draft", {
        body: { ...input, preview: true, mode: "custom" },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { contact_name: string; subject: string; body: string };
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
