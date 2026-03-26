import type { MediaPlacement } from "@/data/types";

interface ReportOutletMomentumProps {
  placements: MediaPlacement[];
}

export function ReportOutletMomentum({ placements }: ReportOutletMomentumProps) {
  if (placements.length < 5) return null;

  // Compute 3-month windows
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const recent = placements.filter((p) => p.date && new Date(p.date) >= threeMonthsAgo);
  const prior = placements.filter((p) => p.date && new Date(p.date) >= sixMonthsAgo && new Date(p.date) < threeMonthsAgo);

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
    .filter((o) => o.total >= 2)
    .sort((a, b) => b.trend - a.trend);

  const rising = momentum.filter((m) => m.trend > 0).slice(0, 5);
  const declining = momentum.filter((m) => m.trend < 0).slice(0, 5);

  if (!rising.length && !declining.length) return null;

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Outlet Momentum
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Coverage volume shift — last 3 months vs. prior 3 months.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {rising.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs font-mono uppercase tracking-wide text-primary mb-3">↑ Rising</p>
            <div className="space-y-2">
              {rising.map((m) => (
                <div key={m.outlet} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate mr-2">{m.outlet}</span>
                  <span className="font-semibold text-primary whitespace-nowrap">+{m.trend}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {declining.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-xs font-mono uppercase tracking-wide text-destructive mb-3">↓ Declining</p>
            <div className="space-y-2">
              {declining.map((m) => (
                <div key={m.outlet} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate mr-2">{m.outlet}</span>
                  <span className="font-semibold text-destructive whitespace-nowrap">{m.trend}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
