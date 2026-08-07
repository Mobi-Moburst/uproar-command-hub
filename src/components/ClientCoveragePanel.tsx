import { Loader2, Newspaper, RefreshCw, Sparkles, TrendingUp, Ban, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateShort, formatNumber } from "@/lib/format";
import { useClientCoverageBrief, type CoveragePoint } from "@/hooks/useClientCoverageBrief";
import type { MediaPlacement } from "@/data/types";

function PointBlock({
  title,
  icon,
  points,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  points: CoveragePoint[];
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
              tone === "warn" ? "border-accent/30 bg-accent/5" : "border-[rgba(255,255,255,0.05)]"
            }`}
          >
            <p className="text-sm text-foreground">{p.point}</p>
            {p.detail && (
              <p className="mt-1 text-xs font-mono text-muted-foreground">{p.detail}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClientCoveragePanel({
  clientName,
  placements,
}: {
  clientName: string;
  placements: MediaPlacement[];
}) {
  const { intel, isLoading, isGenerating, regenerate, placementCount } = useClientCoverageBrief(
    clientName,
    placements,
  );
  const brief = intel?.brief ?? {};

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Newspaper className="h-3.5 w-3.5 text-muted-foreground" />
          What they've been covered on
          <span className="inline-flex items-center rounded-full bg-[rgba(255,255,255,0.04)] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            Last 90 days
          </span>
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={regenerate}
          disabled={isGenerating}
          className="h-7 px-2 text-xs"
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          <span className="ml-1">Refresh</span>
        </Button>
      </div>

      {isLoading || (isGenerating && !intel) ? (
        <p className="text-sm font-mono text-muted-foreground">
          {isGenerating ? "Reading the last 90 days of coverage..." : "Loading coverage brief..."}
        </p>
      ) : placementCount === 0 ? (
        <div className="rounded-md border border-[rgba(255,255,255,0.05)] p-4">
          <p className="text-sm font-mono text-muted-foreground">
            No coverage in the last 90 days — everything is a fresh angle.
          </p>
        </div>
      ) : !intel ? (
        <div className="rounded-md border border-[rgba(255,255,255,0.05)] p-4">
          <p className="text-sm font-mono text-muted-foreground">No coverage brief yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {brief.summary && (
            <div className="rounded-md border border-[rgba(255,255,255,0.05)] p-4">
              <p className="text-sm text-foreground">{brief.summary}</p>
              <p className="mt-2 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                {intel.placement_count} placements · {formatNumber(intel.total_reach)} reach · updated{" "}
                {formatDateShort(intel.synced_at)}
              </p>
            </div>
          )}

          {!!brief.themes?.length && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Storylines they own right now
              </p>
              <div className="space-y-2">
                {brief.themes.map((t, i) => (
                  <div key={i} className="rounded-md border border-[rgba(255,255,255,0.05)] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{t.theme}</p>
                      {!!t.count && (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {t.count} hits
                        </span>
                      )}
                    </div>
                    {t.detail && (
                      <p className="mt-1 text-xs font-mono text-muted-foreground">{t.detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <PointBlock
            title="Already saturated — don't re-pitch"
            icon={<Ban className="h-3 w-3" />}
            points={brief.saturated ?? []}
            tone="warn"
          />
          <PointBlock
            title="Coverage gaps"
            icon={<Search className="h-3 w-3" />}
            points={brief.gaps ?? []}
            tone="neutral"
          />

          {!!brief.fresh_angles?.length && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Angles that haven't been told yet
              </p>
              <div className="space-y-2">
                {brief.fresh_angles.map((a, i) => (
                  <div key={i} className="rounded-md border border-primary/25 bg-primary/5 p-3">
                    <p className="text-sm text-foreground">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
