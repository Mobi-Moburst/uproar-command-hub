import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CommsPoint {
  point: string;
  quote?: string;
  date?: string;
}

export interface CommsBrief {
  summary?: string;
  guardrails?: CommsPoint[];
  priorities?: CommsPoint[];
  open_asks?: CommsPoint[];
  preferences?: string[];
  topics?: string[];
  pitch_angles?: string[];
}

export interface CommsThread {
  id: string;
  kind: "email" | "note" | "meeting";
  subject: string;
  direction: "from_client" | "from_us" | "internal";
  date: string | null;
  snippet: string;
  hubspot_url: string;
}

export interface CommsIntel {
  client_name: string;
  brief: CommsBrief;
  threads: CommsThread[];
  email_count: number;
  last_email_at: string | null;
  synced_at: string;
}

export function useClientComms(clientName: string | null) {
  const queryClient = useQueryClient();

  const intel = useQuery({
    queryKey: ["client-comms", clientName],
    enabled: !!clientName,
    queryFn: async () => {
      const { data } = await supabase
        .from("client_comms_intel")
        .select("client_name, brief, threads, email_count, last_email_at, synced_at")
        .eq("client_name", clientName!)
        .maybeSingle();
      return (data as unknown as CommsIntel) ?? null;
    },
  });

  const analyze = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("hubspot-client-comms", {
        body: { client_name: clientName },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as CommsIntel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-comms", clientName] });
      toast.success("Client conversation brief updated");
    },
    onError: (e: Error) => toast.error(e.message || "Could not read the conversation history"),
  });

  return { intel: intel.data ?? null, isLoading: intel.isLoading, analyze };
}
