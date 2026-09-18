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

    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("Your sign-in was not available in this window. Close it and try again.");
        }
        const { data, error } = await supabase.functions.invoke("gmail-connection", {
          body: { action: "complete", code },
        });
        if (error) {
          const detail = await (error as { context?: Response }).context?.text?.().catch(() => "");
          throw new Error(detail || error.message);
        }
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
        notify("appUserConnectorOAuthComplete");
        window.close();
      } catch (e) {
        const reason = e instanceof Error ? e.message : "Could not finish the Gmail connection.";
        console.error("gmail oauth complete failed:", reason);
        setMessage(reason);
        notify("appUserConnectorOAuthFailed", reason);
      }
    })();

  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="max-w-md text-center text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
