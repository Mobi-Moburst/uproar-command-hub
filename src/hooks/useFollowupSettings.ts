import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FollowupStep {
  day: number;
  body: string;
}

export const DEFAULT_FOLLOWUP_STEPS: FollowupStep[] = [
  { day: 3, body: "Following up on the note below in case it got buried." },
  { day: 7, body: "Last nudge from me on this one." },
];

export const MAX_FOLLOWUP_STEPS = 4;

export interface FollowupSettings {
  followups_enabled: boolean;
  steps: FollowupStep[];
}

/** Plain summary used in the draft sheet, e.g. "day 3 and day 7". */
export function summarizeSteps(settings: FollowupSettings | undefined): string | null {
  if (!settings || !settings.followups_enabled || settings.steps.length === 0) return null;
  const days = settings.steps.map((s) => `day ${s.day}`);
  if (days.length === 1) return days[0];
  return `${days.slice(0, -1).join(", ")} and ${days[days.length - 1]}`;
}

/** Days must be 1 or more and strictly increasing so two steps never land together. */
export function validateSteps(steps: FollowupStep[]): string | null {
  if (!steps.length) return "Add at least one follow-up, or switch them off.";
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!Number.isFinite(s.day) || s.day < 1) return "Each follow-up has to be at least 1 day out.";
    if (i > 0 && s.day <= steps[i - 1].day) {
      return "Each follow-up has to be later than the one before it.";
    }
    if (!s.body || !s.body.replace(/<[^>]*>/g, "").trim()) {
      return "Every follow-up needs a message.";
    }
  }
  return null;
}

export function useFollowupSettings(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  const key = ["pitch-send-settings", campaignId];

  const query = useQuery({
    queryKey: key,
    enabled: !!campaignId,
    queryFn: async (): Promise<FollowupSettings> => {
      const { data, error } = await supabase
        .from("pitch_send_settings")
        .select("followups_enabled, steps")
        .eq("campaign_id", campaignId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { followups_enabled: true, steps: DEFAULT_FOLLOWUP_STEPS };
      const steps = Array.isArray(data.steps)
        ? (data.steps as unknown as FollowupStep[]).map((s) => ({
            day: Number(s?.day ?? 0),
            body: String(s?.body ?? ""),
          }))
        : DEFAULT_FOLLOWUP_STEPS;
      return { followups_enabled: data.followups_enabled !== false, steps };
    },
  });

  const save = useMutation({
    mutationFn: async (settings: FollowupSettings) => {
      const { error } = await supabase.from("pitch_send_settings").upsert(
        {
          campaign_id: campaignId!,
          followups_enabled: settings.followups_enabled,
          steps: settings.steps as unknown as never,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "campaign_id" },
      );
      if (error) throw error;
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      toast.success("Follow-ups saved");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save the follow-ups"),
  });

  return { settings: query.data, isLoading: query.isLoading, save };
}
