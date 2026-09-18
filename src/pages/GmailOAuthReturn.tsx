import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function GmailOAuthReturn() {
  const [message, setMessage] = useState("Finishing the Gmail connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const notify = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
      reason?: string,
    ) => {
      window.opener?.postMessage(
        { type, connectorId: "google_mail", reason },
        window.location.origin,
      );
    };

    if (params.get("success") !== "true") {
      const reason = params.get("error") ?? "Google did not complete the connection.";
      setMessage(reason);
      notify("appUserConnectorOAuthFailed", reason);
      window.close();
      return;
    }

    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        const reason =
          "This Google connection cannot send yet: an admin needs to enable offline access on the Gmail connector client in workspace settings.";
        setMessage(reason);
        notify("appUserConnectorOAuthFailed", reason);
        return;
      }
      const reason = "Google finished without returning a connection code.";
      setMessage(reason);
      notify("appUserConnectorOAuthFailed", reason);
      window.close();
      return;
    }

    void supabase.functions
      .invoke("gmail-connection", { body: { action: "complete", code } })
      .then(({ data, error }) => {
        if (error) throw error;
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
        notify("appUserConnectorOAuthComplete");
        window.close();
      })
      .catch(() => {
        const reason = "Could not finish the Gmail connection.";
        setMessage(reason);
        notify("appUserConnectorOAuthFailed", reason);
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="max-w-md text-center text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
