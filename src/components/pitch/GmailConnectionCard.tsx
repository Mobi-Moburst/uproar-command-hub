import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useGmailConnection } from "@/hooks/useGmailConnection";
import { RichTextEditor } from "@/components/pitch/RichTextEditor";
import { toEditorHtml } from "@/lib/pitchHtml";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export function GmailConnectionCard() {
  const { status, isLoading, connect, disconnect } = useGmailConnection();
  const { user } = useAuthContext();
  const connected = !!status?.connected;
  const needsReconnect = !!status?.reconnectRequired;

  const [signature, setSignature] = useState("");
  const [savingSignature, setSavingSignature] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("email_signature")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setSignature(toEditorHtml(data?.email_signature ?? "")));
  }, [user?.id]);

  const saveSignature = async () => {
    if (!user) return;
    setSavingSignature(true);
    const { error } = await supabase
      .from("profiles")
      .update({ email_signature: signature })
      .eq("id", user.id);
    setSavingSignature(false);
    if (error) {
      toast.error("Could not save your signature");
      return;
    }
    toast.success("Signature saved");
  };

  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6">
      <h2 className="text-lg font-semibold text-foreground">Gmail for pitching</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Pitches you approve send from your own address, so replies come back to you.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs text-foreground">
          <Mail className="h-3.5 w-3.5" />
          {isLoading
            ? "Checking…"
            : needsReconnect
              ? "Access needs renewing"
              : connected
                ? status?.accountEmail || "Connected"
                : "Not connected"}
        </span>

        <Button
          size="sm"
          variant={connected && !needsReconnect ? "outline" : "default"}
          disabled={connect.isPending}
          onClick={() => connect.mutate()}
        >
          {connect.isPending
            ? "Opening Google…"
            : needsReconnect
              ? "Reconnect Gmail"
              : connected
                ? "Reconnect"
                : "Connect Gmail"}
        </Button>

        {connected && (
          <Button
            size="sm"
            variant="outline"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate()}
          >
            Disconnect
          </Button>
        )}
      </div>

      {!connected && !isLoading && (
        <p className="mt-3 text-xs text-muted-foreground">
          You can still draft and approve pitches without connecting. Sending needs your Google
          account.
        </p>
      )}
    </section>
  );
}
