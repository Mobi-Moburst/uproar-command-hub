import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GmailConnectionStatus {
  connected: boolean;
  reconnectRequired?: boolean;
  accountEmail?: string | null;
  connectedAt?: string | null;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("gmail-connection", { body });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

function waitForOAuthCompletion(popup: Window) {
  return new Promise<void>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.data?.connectorId !== "google_mail" ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      ) {
        return;
      }
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        resolve();
        return;
      }
      popup.close();
      reject(new Error(event.data?.reason ?? "The Google connection did not finish."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("The Google window closed before the connection finished."));
    }, 500);
  });
}

export function useGmailConnection() {
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: ["gmail-connection"],
    queryFn: () => invoke<GmailConnectionStatus>({ action: "status" }),
  });

  const connect = useMutation({
    mutationFn: async () => {
      const popup = window.open("", "uproar-gmail-oauth", "width=600,height=720");
      if (!popup) throw new Error("Allow pop-ups for this site, then try again.");
      try {
        const { authorizationUrl } = await invoke<{ authorizationUrl: string }>({
          action: "start",
          origin: window.location.origin,
        });
        const completion = waitForOAuthCompletion(popup);
        popup.location.href = authorizationUrl;
        await completion;
      } catch (e) {
        popup.close();
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-connection"] });
      toast.success("Gmail connected");
    },
    onError: (e: Error) => toast.error(e.message || "Could not connect Gmail"),
  });

  const disconnect = useMutation({
    mutationFn: () => invoke({ action: "disconnect" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-connection"] });
      toast.success("Gmail disconnected");
    },
    onError: (e: Error) => toast.error(e.message || "Could not disconnect Gmail"),
  });

  return {
    status: status.data,
    isLoading: status.isLoading,
    connect,
    disconnect,
  };
}
