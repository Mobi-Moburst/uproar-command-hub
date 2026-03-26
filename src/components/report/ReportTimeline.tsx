import type { MediaPlacement } from "@/data/types";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ReportTimelineProps {
  placements: MediaPlacement[];
}

export function ReportTimeline({ placements }: ReportTimelineProps) {
  if (placements.length < 2) return null;

  const sorted = [...placements].filter((p) => p.date).sort((a, b) => a.date.localeCompare(b.date));
  const startDate = new Date(sorted[0].date);
  const endDate = new Date(sorted[sorted.length - 1].date);
  const totalDays = Math.max((endDate.getTime() - startDate.getTime()) / 86_400_000, 1);

  // Group by week for clustering
  const weeks = new Map<string, MediaPlacement[]>();
  sorted.forEach((p) => {
    const d = new Date(p.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key)!.push(p);
  });

  const maxWeekCount = Math.max(...[...weeks.values()].map((w) => w.length), 1);

  // Month markers
  const months: { label: string; pct: number }[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (cursor <= endDate) {
    const dayOffset = (cursor.getTime() - startDate.getTime()) / 86_400_000;
    const pct = (dayOffset / totalDays) * 100;
    if (pct >= 0 && pct <= 100) {
      months.push({
        label: cursor.toLocaleDateString("en-US", { month: "short" }),
        pct,
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Coverage Timeline
      </h2>

      <div className="rounded-xl border border-border bg-card p-6">
        {/* Timeline bar */}
        <div className="relative h-20">
          {/* Base line */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />

          {/* Month markers */}
          {months.map((m) => (
            <div
              key={m.label + m.pct}
              className="absolute top-full mt-2"
              style={{ left: `${m.pct}%`, transform: "translateX(-50%)" }}
            >
              <div className="h-3 w-px bg-border mx-auto -mt-5" />
              <span className="text-[10px] font-mono text-muted-foreground/60">{m.label}</span>
            </div>
          ))}

          {/* Placement dots */}
          {[...weeks.entries()].map(([weekKey, weekPlacements]) => {
            const weekDate = new Date(weekKey);
            const dayOffset = (weekDate.getTime() - startDate.getTime()) / 86_400_000;
            const pct = Math.min(Math.max((dayOffset / totalDays) * 100, 1), 99);
            const intensity = weekPlacements.length / maxWeekCount;
            const size = Math.max(8, Math.min(24, 8 + intensity * 16));
            const isFeatureHeavy = weekPlacements.filter((p) => p.type === "Feature").length > weekPlacements.length / 2;

            return (
              <div
                key={weekKey}
                className="absolute top-1/2 -translate-y-1/2 group cursor-default"
                style={{ left: `${pct}%`, transform: `translate(-50%, -50%)` }}
              >
                <div
                  className={cn(
                    "rounded-full transition-transform hover:scale-125",
                    isFeatureHeavy ? "bg-accent" : "bg-primary"
                  )}
                  style={{
                    width: size,
                    height: size,
                    opacity: 0.3 + intensity * 0.7,
                  }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-[11px] whitespace-nowrap">
                    <p className="font-semibold text-foreground">{weekPlacements.length} placement{weekPlacements.length > 1 ? "s" : ""}</p>
                    <p className="text-muted-foreground">Week of {formatDateShort(weekKey)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center gap-6 text-[10px] font-mono text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary opacity-70" />
            Standard coverage
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent opacity-70" />
            Feature-heavy week
          </span>
          <span>Dot size = volume</span>
        </div>
      </div>
    </section>
  );
}
