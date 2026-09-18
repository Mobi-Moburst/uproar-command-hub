import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useGmailConnection } from "@/hooks/useGmailConnection";

export function GmailConnectionCard() {
  const { status, isLoading, connect, disconnect } = useGmailConnection();
  const connected = !!status?.connected;
  const needsReconnect = !!status?.reconnectRequired;

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
