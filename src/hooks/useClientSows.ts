import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ClientSOW } from "@/data/types";

export function useClientSows(clientName: string | null) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: sows = [], isLoading } = useQuery({
    queryKey: ["client-sows", clientName],
    enabled: !!clientName,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_sows")
        .select("*")
        .eq("client_name", clientName!)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        client_name: row.client_name,
        file_name: row.file_name,
        storage_path: row.storage_path,
        is_current: row.is_current,
        uploaded_at: row.uploaded_at,
        summary: row.summary,
        start_date: row.start_date,
        end_date: row.end_date,
        renewal_date: row.renewal_date,
        retainer_amount: row.retainer_amount,
        deliverables: row.deliverables as string[] | undefined,
        ai_processed: row.ai_processed,
      })) as ClientSOW[];
    },
  });

  const uploadSow = async (file: File) => {
    if (!clientName) return;
    setUploading(true);
    try {
      const storagePath = `${clientName}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("client-sows")
        .upload(storagePath, file, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      const isFirst = sows.length === 0;
      const { data: inserted, error: insertError } = await supabase
        .from("client_sows")
        .insert({
          client_name: clientName,
          file_name: file.name,
          storage_path: storagePath,
          is_current: isFirst,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      // Trigger AI extraction
      supabase.functions.invoke("extract-sow", {
        body: { sowId: inserted.id },
      }).then(({ error }) => {
        if (error) console.error("SOW extraction error:", error);
        queryClient.invalidateQueries({ queryKey: ["client-sows", clientName] });
      });

      toast.success("SOW uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["client-sows", clientName] });
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const setAsCurrent = async (sowId: string) => {
    const { error } = await supabase
      .from("client_sows")
      .update({ is_current: true })
      .eq("id", sowId);
    if (error) {
      toast.error("Failed to set as current");
    } else {
      queryClient.invalidateQueries({ queryKey: ["client-sows", clientName] });
    }
  };

  const deleteSow = async (sow: ClientSOW) => {
    await supabase.storage.from("client-sows").remove([sow.storage_path]);
    const { error } = await supabase.from("client_sows").delete().eq("id", sow.id);
    if (error) {
      toast.error("Failed to delete SOW");
    } else {
      toast.success("SOW deleted");
      queryClient.invalidateQueries({ queryKey: ["client-sows", clientName] });
    }
  };

  const downloadSow = async (sow: ClientSOW) => {
    const { data, error } = await supabase.storage
      .from("client-sows")
      .download(sow.storage_path);
    if (error || !data) {
      toast.error("Download failed");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = sow.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { sows, isLoading, uploading, uploadSow, setAsCurrent, deleteSow, downloadSow };
}
