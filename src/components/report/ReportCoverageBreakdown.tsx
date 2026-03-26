import { formatNumber } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

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
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-5">Coverage by Type</h3>
          <div className="space-y-3.5">
            {typeBreakdown.map(({ type, count, pct }) => (
              <div key={type}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-foreground">{type}</span>
                  <span className="font-mono text-xs text-muted-foreground">{count} ({pct}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full gradient-brand transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Outlets */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-5">Top Outlets by Reach</h3>
          <div className="space-y-3">
            {topOutlets.map(({ outlet, count, reach }, i) => (
              <div key={outlet} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{outlet}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{count} hits</span>
                <span className="text-xs font-mono text-foreground font-semibold w-16 text-right">{formatNumber(reach)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Reach Trend */}
      {monthlyReach.filter((m) => m.reach > 0 || m.count > 0).length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-5">Monthly Reach — Selected Period</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyReach.filter((m) => m.reach > 0 || m.count > 0)} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(v)} className="text-muted-foreground" />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "reach" ? formatNumber(value) : value,
                  name === "reach" ? "Reach" : "Placements",
                ]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="reach" name="reach" radius={[4, 4, 0, 0]}>
                {monthlyReach.filter((m) => m.reach > 0 || m.count > 0).map((_, i) => (
                  <Cell key={i} fill="hsl(var(--primary))" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
