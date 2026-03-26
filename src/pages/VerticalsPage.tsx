import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { KpiCardSkeleton } from "@/components/KpiCardSkeleton";
import { FilterBar, FilterSelect } from "@/components/FilterBar";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { useVerticalBenchmarks, VerticalBenchmark } from "@/hooks/useVerticalBenchmarks";
import { formatNumber, formatCurrency } from "@/lib/format";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "@/lib/utils";

/* ── Momentum badge ─────────────────────────────────── */
function MomentumBadge({ momentum, pct }: { momentum: "rising" | "steady" | "declining"; pct: number }) {
  const config = {
    rising: { icon: TrendingUp, label: "Rising", className: "bg-primary/10 text-primary" },
    steady: { icon: Minus, label: "Steady", className: "bg-muted text-muted-foreground" },
    declining: { icon: TrendingDown, label: "Declining", className: "bg-destructive/10 text-destructive" },
  }[momentum];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", config.className)}>
      <Icon className="h-3 w-3" />
      {pct > 0 ? `+${pct}%` : pct < 0 ? `${pct}%` : "—"}
    </span>
  );
}

/* ── Heatmap cell helper ────────────────────────────── */
function heatBg(value: number, max: number): string {
  if (max === 0) return "";
  const intensity = value / max;
  if (intensity >= 0.8) return "bg-primary/20 text-primary";
  if (intensity >= 0.5) return "bg-primary/10";
  if (intensity >= 0.25) return "bg-primary/5";
  return "";
}

/* ── Page ────────────────────────────────────────────── */
export default function VerticalsPage() {
  const [yearFilter, setYearFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { benchmarks, stats, years, isLoading, isError, refetch } = useVerticalBenchmarks(yearFilter || undefined);

  const chartData = benchmarks.map((b) => ({
    name: b.vertical.length > 14 ? b.vertical.slice(0, 12) + "…" : b.vertical,
    reach: b.avgReach,
    fullName: b.vertical,
  }));

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Vertical Benchmarking</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">Cross-vertical performance comparison</p>
        </div>

        {/* ── KPI Cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Total Placements"
                value={formatNumber(stats.totalPlacements)}
                detail={yearFilter || "All time"}
              />
              <KpiCard
                label="Verticals Tracked"
                value={benchmarks.length}
                detail={`${yearFilter || "All"} verticals with data`}
              />
              <KpiCard
                label="Avg Ad Value / Vertical"
                value={formatCurrency(stats.avgAdValue)}
                detail="Mean across verticals"
              />
              <KpiCard
                label="Fastest Growing"
                value={stats.fastestGrowing?.vertical || "–"}
                detail={stats.fastestGrowing ? `${stats.fastestGrowing.momentumPct > 0 ? "+" : ""}${stats.fastestGrowing.momentumPct}% vs prior 3mo` : ""}
              />
            </>
          )}
        </div>

        <FilterBar>
          <FilterSelect label="All Years" value={yearFilter} options={years as string[]} onChange={setYearFilter} />
        </FilterBar>

        {isError ? (
          <ErrorState message="Failed to load vertical data." onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton columns={8} rows={6} />
        ) : benchmarks.length === 0 ? (
          <EmptyState message="No vertical data available." columns={8} />
        ) : (
          <>
            {/* ── Chart ────────────────────────────────── */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Average Reach by Vertical</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(v)} className="text-muted-foreground" />
                  <Tooltip
                    formatter={(value: number) => [formatNumber(value), "Avg Reach"]}
                    labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ""}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="reach" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--primary))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Table ────────────────────────────────── */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="w-8 px-2 py-3" />
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vertical</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Momentum</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Placements</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Feature %</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg Reach</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ad Value</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reporters</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Depth</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {benchmarks.map((b) => (
                    <VerticalRow
                      key={b.vertical}
                      benchmark={b}
                      stats={stats}
                      isExpanded={expanded === b.vertical}
                      onToggle={() => setExpanded(expanded === b.vertical ? null : b.vertical)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ── Row ─────────────────────────────────────────────── */
function VerticalRow({
  benchmark: b,
  stats,
  isExpanded,
  onToggle,
}: {
  benchmark: VerticalBenchmark;
  stats: { maxPlacements: number; maxFeaturePct: number; maxReach: number; maxAdValue: number };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
        <td className="px-2 py-3 text-muted-foreground">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="whitespace-nowrap px-4 py-3 font-sans font-medium text-foreground">{b.vertical}</td>
        <td className="px-4 py-3 text-center">
          <MomentumBadge momentum={b.momentum} pct={b.momentumPct} />
        </td>
        <td className={cn("px-4 py-3 text-right rounded-sm", heatBg(b.placementCount, stats.maxPlacements))}>
          {b.placementCount}
        </td>
        <td className={cn("px-4 py-3 text-right rounded-sm", heatBg(b.featurePct, stats.maxFeaturePct))}>
          {b.featurePct}%
        </td>
        <td className={cn("px-4 py-3 text-right rounded-sm", heatBg(b.avgReach, stats.maxReach))}>
          {formatNumber(b.avgReach)}
        </td>
        <td className={cn("px-4 py-3 text-right rounded-sm", heatBg(b.totalAdValue, stats.maxAdValue))}>
          {formatCurrency(b.totalAdValue)}
        </td>
        <td className="px-4 py-3 text-right">{b.uniqueReporters}</td>
        <td className="px-4 py-3 text-right">{b.reporterDepth}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} className="bg-muted/30 px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Top Outlets</p>
                <div className="space-y-1">
                  {b.topOutlets.length > 0 ? b.topOutlets.map((o, i) => (
                    <div key={o} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-[10px] font-bold text-primary/60 w-4">{i + 1}</span>
                      {o}
                    </div>
                  )) : <p className="text-sm text-muted-foreground">–</p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Top Reporters</p>
                <div className="space-y-1">
                  {b.topReporters.length > 0 ? b.topReporters.map((r, i) => (
                    <div key={r} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-[10px] font-bold text-primary/60 w-4">{i + 1}</span>
                      {r}
                    </div>
                  )) : <p className="text-sm text-muted-foreground">–</p>}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
