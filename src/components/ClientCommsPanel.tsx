import { AlertTriangle, ExternalLink, Loader2, MessageSquareText, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateShort } from "@/lib/format";
import { useClientComms, type CommsPoint } from "@/hooks/useClientComms";

function PointList({
  title,
  icon,
  points,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  points: CommsPoint[];
  tone: "warn" | "neutral";
}) {
  if (!points?.length) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {title}
      </p>
      <div className="space-y-2">
        {points.map((p, i) => (
          <div
            key={i}
            className={`rounded-md border p-3 ${
              tone === "warn"
                ? "border-accent/30 bg-accent/5"
                : "border-[rgba(255,255,255,0.05)]"
            }`}
          >
            <p className="text-sm text-foreground">{p.point}</p>
            {p.quote && (
              <p className="mt-1 border-l-2 border-[rgba(255,255,255,0.12)] pl-2 text-xs italic text-muted-foreground">
                "{p.quote}"
              </p>
            )}
            {p.date && (
              <p className="mt-1 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                {formatDateShort(p.date)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClientCommsPanel({
  clientName,
  linked,
  companyUrl,
}: {
  clientName: string;
  linked: boolean;
  companyUrl?: string;
}) {
  const { intel, isLoading, analyze } = useClientComms(clientName);
  const brief = intel?.brief ?? {};

  if (!linked) return null;

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
          What the client has been saying
        </h3>
        <div className="flex items-center gap-2">
          {companyUrl && (
            <a
              href={companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Open in HubSpot <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => analyze.mutate()}
            disabled={analyze.isPending}
            className="h-7 px-2 text-xs"
          >
            {analyze.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            <span className="ml-1">{intel ? "Refresh" : "Read conversations"}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm font-mono text-muted-foreground">Loading conversation brief...</p>
      ) : !intel ? (
        <div className="rounded-md border border-[rgba(255,255,255,0.05)] p-4">
          <p className="text-sm font-mono text-muted-foreground">
            Read this client's synced email history to surface what they've asked for — and what
            they've asked us not to do — before your next pitch.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {brief.summary && (
            <div className="rounded-md border border-[rgba(255,255,255,0.05)] p-4">
              <p className="text-sm text-foreground">{brief.summary}</p>
              <p className="mt-2 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                {intel.email_count} messages
                {intel.last_email_at ? ` · last ${formatDateShort(intel.last_email_at)}` : ""} · updated{" "}
                {formatDateShort(intel.synced_at)}
              </p>
            </div>
          )}

          <PointList
            title="Do not pitch / sensitivities"
            icon={<AlertTriangle className="h-3 w-3" />}
            points={brief.guardrails ?? []}
            tone="warn"
          />
          <PointList
            title="What they're pushing for"
            icon={<Target className="h-3 w-3" />}
            points={brief.priorities ?? []}
            tone="neutral"
          />
          <PointList
            title="Open asks"
            icon={<MessageSquareText className="h-3 w-3" />}
            points={brief.open_asks ?? []}
            tone="neutral"
          />

          {!!brief.preferences?.length && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">How they like to work</p>
              <ul className="space-y-1">
                {brief.preferences.map((p, i) => (
                  <li key={i} className="text-sm text-foreground">
                    · {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!brief.pitch_angles?.length && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Safe angles to pitch
              </p>
              <div className="space-y-2">
                {brief.pitch_angles.map((a, i) => (
                  <div key={i} className="rounded-md border border-primary/25 bg-primary/5 p-3">
                    <p className="text-sm text-foreground">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!!brief.topics?.length && (
            <div className="flex flex-wrap gap-1.5">
              {brief.topics.map((t, i) => (
                <span
                  key={i}
                  className="rounded-md bg-[rgba(255,255,255,0.06)] px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {!!intel.threads?.length && (
            <details className="rounded-md border border-[rgba(255,255,255,0.05)] p-3">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                Recent messages ({intel.threads.length})
              </summary>
              <div className="mt-3 space-y-2">
                {intel.threads.map((t) => (
                  <div key={t.id} className="border-l-2 border-[rgba(255,255,255,0.08)] pl-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-foreground">{t.subject}</p>
                      <span className="shrink-0 text-[10px] font-mono uppercase text-muted-foreground">
                        {t.direction === "from_client" ? "Client" : t.direction === "from_us" ? "Us" : "Internal"}
                        {t.date ? ` · ${formatDateShort(t.date)}` : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs font-mono text-muted-foreground">
                      {t.snippet}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
