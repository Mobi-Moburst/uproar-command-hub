import { formatNumber } from "@/lib/format";

interface TypeBreakdown {
  type: string;
  count: number;
  pct: number;
}

interface OutletStat {
  outlet: string;
  count: number;
  reach: number;
}

interface MonthlyData {
  label: string;
  reach: number;
  count: number;
}

interface ReportCoverageBreakdownProps {
  typeBreakdown: TypeBreakdown[];
  topOutlets: OutletStat[];
  monthlyReach: MonthlyData[];
}

export function ReportCoverageBreakdown({ typeBreakdown, topOutlets, monthlyReach }: ReportCoverageBreakdownProps) {
  const maxReach = Math.max(...monthlyReach.map((m) => m.reach), 1);

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Coverage Breakdown
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coverage Type Mix */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Coverage by Type</h3>
          <div className="space-y-3">
            {typeBreakdown.map(({ type, count, pct }) => (
              <div key={type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{type}</span>
                  <span className="font-mono text-muted-foreground">{count} ({pct}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Outlets */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top Outlets by Reach</h3>
          <div className="space-y-2.5">
            {topOutlets.map(({ outlet, count, reach }, i) => (
              <div key={outlet} className="flex items-center gap-3">
                <span className="w-5 text-xs font-mono text-muted-foreground text-right">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{outlet}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{count} hits</span>
                <span className="text-xs font-mono text-foreground font-medium w-16 text-right">{formatNumber(reach)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Reach Trend */}
      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Reach — Last 12 Months</h3>
        <div className="flex items-end gap-1.5 h-32">
          {monthlyReach.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-mono text-muted-foreground">
                {m.reach > 0 ? formatNumber(m.reach) : ""}
              </span>
              <div
                className="w-full rounded-t bg-primary/80 transition-all min-h-[2px]"
                style={{ height: `${Math.max((m.reach / maxReach) * 100, 2)}%` }}
              />
              <span className="text-[9px] font-mono text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
