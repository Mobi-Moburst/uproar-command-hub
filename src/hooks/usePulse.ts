import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PulseSignal {
  id: string;
  client_name: string;
  headline: string;
  hook: string;
  source_url: string | null;
  relevance_score: number;
  industry: string | null;
  generated_date: string;
  claimed_by: string | null;
  claimed_at: string | null;
  dismissed: boolean;
  created_at: string;
}

export interface ClientEnrichment {
  id: string;
  client_name: string;
  industries: string[];
  keywords: string[];
  competitors: string[];
  created_at: string;
  updated_at: string;
}

export function usePulseSignals() {
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["pulse-signals", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pulse_signals")
        .select("*")
        .eq("generated_date", today)
        .eq("dismissed", false)
        .order("relevance_score", { ascending: false });

      if (error) throw error;
      return (data || []) as PulseSignal[];
    },
  });
}

export function useClaimSignal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ signalId, userId }: { signalId: string; userId: string }) => {
      const { error } = await supabase
        .from("pulse_signals")
        .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
        .eq("id", signalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pulse-signals"] });
      toast({ title: "Signal claimed", description: "You've claimed this signal." });
    },
  });
}

export function useDismissSignal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signalId: string) => {
      const { error } = await supabase
        .from("pulse_signals")
        .update({ dismissed: true })
        .eq("id", signalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pulse-signals"] });
    },
  });
}

export function useScanPulse() {
  const [isScanning, setIsScanning] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const scan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("pulse-scan");
      if (error) throw error;

      toast({
        title: "Pulse scan complete",
        description: `Generated ${data?.signals_generated || 0} new signals.`,
      });
      queryClient.invalidateQueries({ queryKey: ["pulse-signals"] });
    } catch (err) {
      toast({
        title: "Scan failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return { scan, isScanning };
}

export function useClientEnrichments() {
  return useQuery({
    queryKey: ["client-enrichments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_enrichment")
        .select("*")
        .order("client_name");

      if (error) throw error;
      return (data || []) as ClientEnrichment[];
    },
  });
}

export function useSaveEnrichment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (enrichment: Omit<ClientEnrichment, "id" | "created_at" | "updated_at">) => {
      // Upsert by client_name
      const { error } = await supabase
        .from("client_enrichment")
        .upsert(
          { ...enrichment, updated_at: new Date().toISOString() },
          { onConflict: "client_name" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-enrichments"] });
      toast({ title: "Saved", description: "Client enrichment updated." });
    },
  });
}
