import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { KpiCardSkeleton } from "@/components/KpiCardSkeleton";
import { FilterBar, FilterSelect } from "@/components/FilterBar";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { useVerticalBenchmarks } from "@/hooks/useVerticalBenchmarks";
import { formatNumber, formatCurrency } from "@/lib/format";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function VerticalsPage() {
  const [yearFilter, setYearFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { benchmarks, years, isLoading, isError, refetch } = useVerticalBenchmarks(yearFilter || undefined);

  const topReachVertical = benchmarks.length > 0
    ? benchmarks.reduce((a, b) => (a.avgReach > b.avgReach ? a : b)).vertical
    : "–";

  const topFeatureVertical = benchmarks.length > 0
    ? benchmarks.reduce((a, b) => (a.featurePct > b.featurePct ? a : b)).vertical
    : "–";

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

        <div className="grid grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Verticals" value={benchmarks.length} detail={yearFilter || "All time"} />
              <KpiCard label="Highest Avg Reach" value={topReachVertical} detail="Per placement" />
              <KpiCard label="Highest Feature %" value={topFeatureVertical} detail="Feature-type coverage" />
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
            {/* Chart */}
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

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="w-8 px-2 py-3" />
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vertical</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Placements</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Feature %</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg Reach</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ad Value</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reporters</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Clients</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reporter Depth</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {benchmarks.map((b) => (
                    <VerticalRow
                      key={b.vertical}
                      benchmark={b}
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

function VerticalRow({
  benchmark: b,
  isExpanded,
  onToggle,
}: {
  benchmark: ReturnType<typeof import("@/hooks/useVerticalBenchmarks").useVerticalBenchmarks>["benchmarks"][number];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50">
        <td className="px-2 py-3 text-muted-foreground">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="whitespace-nowrap px-4 py-3 font-sans font-medium text-foreground">{b.vertical}</td>
        <td className="px-4 py-3 text-right">{b.placementCount}</td>
        <td className="px-4 py-3 text-right">{b.featurePct}%</td>
        <td className="px-4 py-3 text-right">{formatNumber(b.avgReach)}</td>
        <td className="px-4 py-3 text-right">{formatCurrency(b.totalAdValue)}</td>
        <td className="px-4 py-3 text-right">{b.uniqueReporters}</td>
        <td className="px-4 py-3 text-right">{b.uniqueClients}</td>
        <td className="px-4 py-3 text-right">{b.reporterDepth}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} className="bg-muted/30 px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Top Outlets</p>
                <div className="space-y-1">
                  {b.topOutlets.length > 0 ? b.topOutlets.map((o) => (
                    <p key={o} className="text-sm text-muted-foreground">{o}</p>
                  )) : <p className="text-sm text-muted-foreground">–</p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-2">Top Reporters</p>
                <div className="space-y-1">
                  {b.topReporters.length > 0 ? b.topReporters.map((r) => (
                    <p key={r} className="text-sm text-muted-foreground">{r}</p>
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
