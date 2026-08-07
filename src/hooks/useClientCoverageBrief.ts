import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MediaPlacement } from "@/data/types";

export interface CoveragePoint {
  point: string;
  detail?: string;
}

export interface CoverageTheme {
  theme: string;
  detail?: string;
  count?: number;
}

export interface CoverageBrief {
  summary?: string;
  themes?: CoverageTheme[];
  saturated?: CoveragePoint[];
  gaps?: CoveragePoint[];
  fresh_angles?: string[];
}

export interface CoverageIntel {
  client_name: string;
  brief: CoverageBrief;
  placement_count: number;
  total_reach: number;
  window_start: string | null;
  window_end: string | null;
  synced_at: string;
}

const STALE_DAYS = 3;

/** Placements for this client within the last 90 days (UTC-safe date compare). */
export function recentPlacements(placements: MediaPlacement[], clientName: string) {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return placements
    .filter((p) => p.client_name === clientName && (p.date || "").slice(0, 10) >= cutoff)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export function useClientCoverageBrief(clientName: string | null, placements: MediaPlacement[]) {
  const queryClient = useQueryClient();
  const attempted = useRef<string | null>(null);

  const rows = clientName ? recentPlacements(placements, clientName) : [];

  const intel = useQuery({
    queryKey: ["client-coverage-brief", clientName],
    enabled: !!clientName,
    queryFn: async () => {
      const { data } = await supabase
        .from("client_coverage_intel")
        .select("client_name, brief, placement_count, total_reach, window_start, window_end, synced_at")
        .eq("client_name", clientName!)
        .maybeSingle();
      return (data as unknown as CoverageIntel) ?? null;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("client-coverage-brief", {
        body: {
          client_name: clientName,
          placements: rows.map((p) => ({
            date: p.date,
            outlet: p.outlet,
            reporter_name: p.reporter_name,
            headline: p.headline,
            type: p.type,
            topic_product: p.topic_product,
            readership_viewership: p.readership_viewership,
          })),
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as CoverageIntel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-coverage-brief", clientName] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not summarize recent coverage"),
  });

  // Auto-generate on open when missing or stale, once per client per session-open.
  useEffect(() => {
    if (!clientName || intel.isLoading || generate.isPending) return;
    if (attempted.current === clientName) return;

    const data = intel.data;
    const stale =
      !data ||
      Date.now() - new Date(data.synced_at).getTime() > STALE_DAYS * 24 * 60 * 60 * 1000 ||
      data.placement_count !== rows.length;

    if (stale) {
      attempted.current = clientName;
      generate.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName, intel.isLoading, intel.data, rows.length]);

  return {
    intel: intel.data ?? null,
    isLoading: intel.isLoading,
    isGenerating: generate.isPending,
    regenerate: () => generate.mutate(),
    placementCount: rows.length,
  };
}
