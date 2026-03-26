import type { MediaPlacement } from "@/data/types";

interface ReportOutletMomentumProps {
  placements: MediaPlacement[];
  toDate?: string;
  fromDate?: string;
}

export function ReportOutletMomentum({ placements, toDate, fromDate }: ReportOutletMomentumProps) {
  if (placements.length < 3) return null;

  // Use report date range midpoint to split into "recent" vs "prior" halves
  const end = toDate ? new Date(toDate) : new Date();
  const start = fromDate ? new Date(fromDate) : new Date(end.getFullYear(), end.getMonth() - 6, 1);
  const mid = new Date((start.getTime() + end.getTime()) / 2);

  const recent = placements.filter((p) => p.date && new Date(p.date) >= mid && new Date(p.date) <= end);
  const prior = placements.filter((p) => p.date && new Date(p.date) >= start && new Date(p.date) < mid);

  const recentCounts = new Map<string, number>();
  recent.forEach((p) => recentCounts.set(p.outlet, (recentCounts.get(p.outlet) || 0) + 1));

  const priorCounts = new Map<string, number>();
  prior.forEach((p) => priorCounts.set(p.outlet, (priorCounts.get(p.outlet) || 0) + 1));

  const allOutlets = new Set([...recentCounts.keys(), ...priorCounts.keys()]);
  const momentum = [...allOutlets]
    .map((outlet) => {
      const r = recentCounts.get(outlet) || 0;
      const p = priorCounts.get(outlet) || 0;
      const trend = p > 0 ? Math.round(((r - p) / p) * 100) : r > 0 ? 100 : 0;
      return { outlet, recent: r, prior: p, trend, total: r + p };
    })
    .sort((a, b) => b.trend - a.trend);

  const rising = momentum.filter((m) => m.trend > 0).slice(0, 5);
  const declining = momentum.filter((m) => m.trend < 0).slice(0, 5);
  const steady = momentum.filter((m) => m.trend === 0 && m.total >= 2).slice(0, 5);

  if (!rising.length && !declining.length && !steady.length) return null;

  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  const recentLabel = `${fmtDate(mid)} – ${fmtDate(end)}`;
  const priorLabel = `${fmtDate(start)} – ${fmtDate(mid)}`;

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Outlet Momentum
      </h2>
      <p className="text-sm text-muted-foreground mb-2">
        Coverage volume shift — comparing two halves of the selected period.
      </p>
      <p className="text-xs font-mono text-muted-foreground/60 mb-4">
        Recent: {recentLabel} &nbsp;vs.&nbsp; Prior: {priorLabel}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Rising */}
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-mono uppercase tracking-wide text-primary mb-3">↑ Rising</p>
          {rising.length > 0 ? (
            <div className="space-y-2.5">
              {rising.map((m) => (
                <div key={m.outlet} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 mr-3">
                    <span className="text-foreground truncate block">{m.outlet}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/50">{m.prior} → {m.recent} hits</span>
                  </div>
                  <span className="font-semibold text-primary whitespace-nowrap">+{m.trend}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/50">No rising outlets</p>
          )}
        </div>

        {/* Declining or Steady */}
        <div className="rounded-lg border border-border bg-card p-5">
          {declining.length > 0 ? (
            <>
              <p className="text-xs font-mono uppercase tracking-wide text-destructive mb-3">↓ Declining</p>
              <div className="space-y-2.5">
                {declining.map((m) => (
                  <div key={m.outlet} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 mr-3">
                      <span className="text-foreground truncate block">{m.outlet}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/50">{m.prior} → {m.recent} hits</span>
                    </div>
                    <span className="font-semibold text-destructive whitespace-nowrap">{m.trend}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : steady.length > 0 ? (
            <>
              <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-3">→ Steady</p>
              <div className="space-y-2.5">
                {steady.map((m) => (
                  <div key={m.outlet} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 mr-3">
                      <span className="text-foreground truncate block">{m.outlet}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/50">{m.total} hits total</span>
                    </div>
                    <span className="font-mono text-muted-foreground whitespace-nowrap">0%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-mono uppercase tracking-wide text-muted-foreground mb-3">↓ Declining</p>
              <p className="text-sm text-muted-foreground/50">No declining outlets</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
