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

    // The popup may not carry the app's sign-in (preview surfaces broker the
    // session to the editor frame), so hand the one-time code to the opener,
    // which is signed in, and let it finish the exchange.
    if (window.opener) {
      setMessage("Finishing the Gmail connection…");
      window.opener.postMessage(
        { type: "appUserConnectorOAuthCode", connectorId: "google_mail", code },
        window.location.origin,
      );
      return;
    }

    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("gmail-connection", {
          body: { action: "complete", code },
        });
        if (error) {
          const detail = await (error as { context?: Response }).context?.text?.().catch(() => "");
          throw new Error(detail || error.message);
        }
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
        setMessage("Gmail connected. You can close this window.");
      } catch (e) {
        const reason = e instanceof Error ? e.message : "Could not finish the Gmail connection.";
        console.error("gmail oauth complete failed:", reason);
        setMessage(reason);
      }
    })();


  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="max-w-md text-center text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
