import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReportSnapshot {
  clientName: string;
  teamName: string;
  periodLabel: string;
  totalPlacements: number;
  totalReach: number;
  totalAdValue: number;
  awardWins: number;
  ytdPlacements: number;
  ytdReach: number;
  typeBreakdown: Array<{ type: string; count: number; pct: number }>;
  topOutlets: Array<{ outlet: string; count: number; reach: number }>;
  monthlyReach: Array<{ label: string; reach: number; count: number }>;
  highlights: Array<{
    id: string;
    headline: string;
    outlet: string;
    date: string;
    type: string;
    reach: number;
    link: string;
  }>;
  sampleConversions: Array<{
    type: "sample";
    id: string;
    client: string;
    reporter: string;
    outlet: string;
    date: string;
    converted: boolean;
    daysToCoverage?: number;
  }>;
  briefingConversions: Array<{
    type: "briefing";
    id: string;
    client: string;
    reporter: string;
    outlet: string;
    date: string;
    converted: boolean;
    daysToCoverage?: number;
  }>;
  sampleConversionRate: number;
  briefingConversionRate: number;
  wonAwards: Array<{ id: string; award_name: string; submission_title: string; status: string; submitted_date?: string | null; due_date?: string; client_name: string }>;
  allFilteredAwards: Array<{ id: string; award_name: string; submission_title: string; status: string; submitted_date?: string | null; due_date?: string; client_name: string }>;
  placements: Array<{
    id: string;
    headline: string;
    outlet: string;
    date: string;
    type: string;
    readership_viewership: number;
    ad_value: number;
    reporter_name: string;
    link: string;
    topic_product: string;
    secured_by: string;
  }>;
}

export interface CurationState {
  hiddenSections: string[];
  dismissedCards: string[];
  textOverrides: Record<string, string>;
  manualHighlights: Array<{
    id: string;
    headline: string;
    outlet: string;
    date: string;
    type: string;
    reach: string;
    link: string;
  }>;
  aiSummary?: string;
  snapshot?: ReportSnapshot;
}

export interface ClientReport {
  id: string;
  client_name: string;
  from_date: string | null;
  to_date: string | null;
  status: string;
  slug: string;
  password_hash: string | null;
  title: string | null;
  curation_state: CurationState;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useClientReports(clientName?: string) {
  return useQuery({
    queryKey: ["client-reports", clientName],
    queryFn: async () => {
      let query = supabase
        .from("client_reports")
        .select("*")
        .order("updated_at", { ascending: false });

      if (clientName) {
        query = query.eq("client_name", clientName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ClientReport[];
    },
    enabled: !!clientName,
  });
}

export function usePublicReport(slug: string) {
  return useQuery({
    queryKey: ["public-report", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_reports")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      return data as unknown as ClientReport | null;
    },
    enabled: !!slug,
  });
}

export function useSaveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: {
      id?: string;
      client_name: string;
      from_date?: string;
      to_date?: string;
      status: "draft" | "published";
      title?: string;
      password_hash?: string;
      curation_state: CurationState;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      if (report.id) {
        // Update existing
        const { data, error } = await supabase
          .from("client_reports")
          .update({
            client_name: report.client_name,
            from_date: report.from_date || null,
            to_date: report.to_date || null,
            status: report.status,
            title: report.title || null,
            password_hash: report.password_hash ?? undefined,
            curation_state: report.curation_state as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", report.id)
          .select()
          .single();

        if (error) throw error;
        return data as unknown as ClientReport;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("client_reports")
          .insert({
            client_name: report.client_name,
            from_date: report.from_date || null,
            to_date: report.to_date || null,
            status: report.status,
            title: report.title || null,
            password_hash: report.password_hash || null,
            curation_state: report.curation_state as any,
            created_by: user?.id || null,
          })
          .select()
          .single();

        if (error) throw error;
        return data as unknown as ClientReport;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["client-reports"] });
      toast.success(data.status === "draft" ? "Draft saved" : "Report published");
    },
    onError: (err: any) => {
      toast.error("Failed to save report: " + err.message);
    },
  });
}

export function useUnpublishReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("client_reports")
        .update({ status: "draft", updated_at: new Date().toISOString() })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-reports"] });
      toast.success("Report moved back to drafts");
    },
    onError: (err: any) => {
      toast.error("Failed to unpublish: " + err.message);
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("client_reports")
        .delete()
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-reports"] });
      toast.success("Report deleted");
    },
    onError: (err: any) => {
      toast.error("Failed to delete report: " + err.message);
    },
  });
}

export async function hashReportPassword(password: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("report-password", {
    body: { action: "hash", password },
  });
  if (error) throw error;
  return data.hash;
}

export async function verifyReportPassword(password: string, hash: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("report-password", {
    body: { action: "verify", password, hash },
  });
  if (error) throw error;
  return data.match;
}
