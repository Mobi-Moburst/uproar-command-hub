import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InboxConversation {
  id: string;
  contact_id: string;
  campaign_id: string;
  subject: string;
  recipient_email: string;
  sender_email: string | null;
  status: string;
  sent_at: string;
  reply_at: string | null;
  reply_snippet: string | null;
  contact_name: string;
  contact_outlet: string;
  client_name: string;
  followups_pending: number;
}

export interface ThreadMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string | null;
  html: string;
  text: string;
  snippet: string;
  mine: boolean;
}

export function useInboxConversations() {
  return useQuery({
    queryKey: ["pitch-inbox"],
    queryFn: async (): Promise<InboxConversation[]> => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return [];

      const { data, error } = await supabase
        .from("pitch_sends")
        .select(
          "id, contact_id, campaign_id, subject, recipient_email, sender_email, status, sent_at, reply_at, reply_snippet",
        )
        .eq("sender_user_id", uid)
        .order("sent_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return [];

      const contactIds = [...new Set(rows.map((r) => r.contact_id))];
      const campaignIds = [...new Set(rows.map((r) => r.campaign_id))];
      const sendIds = rows.map((r) => r.id);

      const [contactsRes, campaignsRes, followupsRes] = await Promise.all([
        supabase.from("pitch_contacts").select("id, name, outlet").in("id", contactIds),
        supabase.from("pitch_campaigns").select("id, client_name").in("id", campaignIds),
        supabase
          .from("pitch_followups")
          .select("send_id")
          .in("send_id", sendIds)
          .eq("status", "scheduled"),
      ]);

      const contacts = new Map((contactsRes.data ?? []).map((c) => [c.id, c]));
      const campaigns = new Map((campaignsRes.data ?? []).map((c) => [c.id, c]));
      const pending = new Map<string, number>();
      for (const f of followupsRes.data ?? []) {
        pending.set(f.send_id, (pending.get(f.send_id) ?? 0) + 1);
      }

      return rows.map((r) => ({
        ...r,
        contact_name: contacts.get(r.contact_id)?.name ?? r.recipient_email,
        contact_outlet: contacts.get(r.contact_id)?.outlet ?? "",
        client_name: campaigns.get(r.campaign_id)?.client_name ?? "",
        followups_pending: pending.get(r.id) ?? 0,
      }));
    },
  });
}

export function useInboxThread(sendId: string | null) {
  return useQuery({
    queryKey: ["pitch-inbox-thread", sendId],
    enabled: !!sendId,
    queryFn: async (): Promise<ThreadMessage[]> => {
      const { data, error } = await supabase.functions.invoke("pitch-inbox", {
        body: { action: "thread", send_id: sendId },
      });
      if (error) throw error;
      const res = data as { error?: string; messages?: ThreadMessage[] };
      if (res.error) throw new Error(res.error);
      return res.messages ?? [];
    },
  });
}

export function useInboxReply(sendId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data, error } = await supabase.functions.invoke("pitch-inbox", {
        body: { action: "reply", send_id: sendId, body },
      });
      if (error) throw error;
      const res = data as { error?: string };
      if (res?.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      toast.success("Reply sent");
      queryClient.invalidateQueries({ queryKey: ["pitch-inbox-thread", sendId] });
      queryClient.invalidateQueries({ queryKey: ["pitch-inbox"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not send the reply"),
  });
}

export function useCheckReplies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pitch-reply-poll", { body: {} });
      if (error) throw error;
      return data as { replies?: number; reconnectRequired?: boolean };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["pitch-inbox"] });
      if (res.reconnectRequired) {
        toast.error("Your Gmail access needs renewing on the account page");
        return;
      }
      toast.success(
        res.replies ? `${res.replies} new repl${res.replies === 1 ? "y" : "ies"}` : "No new replies",
      );
    },
    onError: (e: Error) => toast.error(e.message || "Could not check replies"),
  });
}
