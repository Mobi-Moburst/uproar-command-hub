import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "client-logos";

function clientSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function useClientLogo(clientName: string) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!clientName) return;
    const slug = clientSlug(clientName);
    // Try to get the public URL — if the file exists it'll resolve
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${slug}/logo`);
    // Check if it actually exists by fetching head
    fetch(data.publicUrl, { method: "HEAD" })
      .then((res) => {
        if (res.ok) setLogoUrl(data.publicUrl);
        else setLogoUrl(null);
      })
      .catch(() => setLogoUrl(null));
  }, [clientName]);

  async function uploadLogo(file: File) {
    if (!clientName) return;
    setIsUploading(true);
    try {
      const slug = clientSlug(clientName);
      const path = `${slug}/logo`;
      
      // Upload (upsert)
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      // Add cache buster
      setLogoUrl(`${data.publicUrl}?t=${Date.now()}`);
    } catch (err) {
      console.error("Logo upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  }

  return { logoUrl, uploadLogo, isUploading };
}
