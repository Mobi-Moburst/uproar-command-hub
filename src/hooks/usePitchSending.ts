import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PitchSend {
  id: string;
  contact_id: string;
  status: string;
  sent_at: string;
  reply_at: string | null;
  reply_snippet: string | null;
  sender_email: string | null;
}

export interface PitchFollowup {
  id: string;
  send_id: string;
  step: number;
  scheduled_for: string;
  status: string;
}

export function usePitchSending(campaignId: string | undefined) {
  const queryClient = useQueryClient();
  const key = ["pitch-sends", campaignId];

  const sends = useQuery({
    queryKey: key,
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pitch_sends")
        .select("id, contact_id, status, sent_at, reply_at, reply_snippet, sender_email")
        .eq("campaign_id", campaignId!)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, PitchSend> = {};
      for (const s of (data ?? []) as PitchSend[]) {
        if (!map[s.contact_id]) map[s.contact_id] = s;
      }
      return map;
    },
  });

  const sendIds = Object.values(sends.data ?? {}).map((s) => s.id);

  const followups = useQuery({
    queryKey: ["pitch-followups", campaignId, sendIds.length],
    enabled: sendIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pitch_followups")
        .select("id, send_id, step, scheduled_for, status")
        .in("send_id", sendIds)
        .eq("status", "scheduled")
        .order("scheduled_for", { ascending: true });
      if (error) throw error;
      const map: Record<string, PitchFollowup> = {};
      for (const f of (data ?? []) as PitchFollowup[]) {
        if (!map[f.send_id]) map[f.send_id] = f;
      }
      return map;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["pitch-followups", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["pitch-contacts", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["pitch-drafts", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["pitch-claims", campaignId] });
  };

  const send = useMutation({
    mutationFn: async (contactIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("pitch-send", {
        body: { contact_ids: contactIds },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as {
        sent: number;
        blocked: number;
        failed: number;
        capped: number;
        results: { contact_id: string; ok: boolean; reason?: string }[];
      };
    },
    onSuccess: (res) => {
      refresh();
      if (res.sent) toast.success(`${res.sent} pitch${res.sent === 1 ? "" : "es"} sent`);
      if (res.blocked) toast.warning(`${res.blocked} held by someone else`);
      if (res.capped) toast.warning(`${res.capped} hit today's send cap`);
      if (res.failed) {
        const first = res.results.find((r) => !r.ok && r.reason)?.reason;
        toast.error(first || `${res.failed} could not be sent`);
      }
    },
    onError: (e: Error) => toast.error(e.message || "Sending failed"),
  });

  const checkReplies = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pitch-reply-poll", { body: {} });
      if (error) throw error;
      return data as { replies?: number; reconnectRequired?: boolean };
    },
    onSuccess: (res) => {
      refresh();
      if (res.reconnectRequired) {
        toast.error("Your Gmail access needs renewing on the account page");
        return;
      }
      toast.success(res.replies ? `${res.replies} new repl${res.replies === 1 ? "y" : "ies"}` : "No new replies");
    },
    onError: (e: Error) => toast.error(e.message || "Could not check replies"),
  });

  const runFollowups = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pitch-followup-run", { body: {} });
      if (error) throw error;
      return data as { sent?: number; failed?: number; reconnectRequired?: boolean };
    },
    onSuccess: (res) => {
      refresh();
      if (res.reconnectRequired) {
        toast.error("Your Gmail access needs renewing on the account page");
        return;
      }
      if (res.sent) toast.success(`${res.sent} follow-up${res.sent === 1 ? "" : "s"} sent`);
      if (res.failed) toast.error(`${res.failed} follow-up${res.failed === 1 ? "" : "s"} failed`);
    },
    onError: (e: Error) => toast.error(e.message || "Could not run follow-ups"),
  });

  return {
    sends: sends.data ?? {},
    followups: followups.data ?? {},
    send,
    checkReplies,
    runFollowups,
  };
}
