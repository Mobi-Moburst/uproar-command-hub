import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { KpiCardSkeleton } from "@/components/KpiCardSkeleton";
import { FilterBar, FilterSelect, SearchInput } from "@/components/FilterBar";
import { TypeBadge } from "@/components/TypeBadge";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { useReporterAnalytics, ReporterAggregate } from "@/hooks/useReporterAnalytics";
import { formatNumber, formatDateShort } from "@/lib/format";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function ReportersPage() {
  const [yearFilter, setYearFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { reporters, years, isLoading, isError, refetch } = useReporterAnalytics(yearFilter || undefined);

  const filtered = reporters.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.primaryOutlets.some((o) => o.toLowerCase().includes(q)) ||
      r.uniqueClients.some((c) => c.toLowerCase().includes(q))
    );
  });

  const totalWithReporter = reporters.reduce((s, r) => s + r.placementCount, 0);

  const topOutlet = (() => {
    const counts = new Map<string, number>();
    reporters.forEach((r) =>
      r.primaryOutlets.forEach((o) => counts.set(o, (counts.get(o) || 0) + r.placementCount))
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "–";
  })();

  const toggleExpand = (name: string) => {
    setExpanded(expanded === name ? null : name);
  };

  const scoreColor = (score: number) => {
    if (score >= 60) return "text-emerald";
    if (score >= 35) return "text-status-drafting";
    return "text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reporter Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">Relationship depth and outlet affiliations</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Unique Reporters" value={reporters.length.toLocaleString()} detail={yearFilter || "All time"} />
              <KpiCard label="Placements w/ Reporter" value={totalWithReporter.toLocaleString()} detail="Named attribution" />
              <KpiCard label="Top Outlet" value={topOutlet} detail="By reporter coverage" />
            </>
          )}
        </div>

        <FilterBar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search reporters, outlets, clients..." />
          <FilterSelect label="All Years" value={yearFilter} options={years as string[]} onChange={setYearFilter} />
        </FilterBar>

        {isError ? (
          <ErrorState message="Failed to load reporter data." onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton columns={7} rows={10} />
        ) : filtered.length === 0 ? (
          <EmptyState message="No reporters match your filters." columns={7} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="w-8 px-2 py-3" />
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reporter</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Placements</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Primary Outlet(s)</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Clients</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Top Vertical</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reach</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last Placement</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {filtered.map((r) => (
                  <ReporterRow
                    key={r.name}
                    reporter={r}
                    isExpanded={expanded === r.name}
                    onToggle={() => toggleExpand(r.name)}
                    scoreColor={scoreColor}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ReporterRow({
  reporter: r,
  isExpanded,
  onToggle,
  scoreColor,
}: {
  reporter: ReporterAggregate;
  isExpanded: boolean;
  onToggle: () => void;
  scoreColor: (s: number) => string;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
      >
        <td className="px-2 py-3 text-muted-foreground">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="whitespace-nowrap px-4 py-3 font-sans font-medium text-foreground">{r.name}</td>
        <td className={`px-4 py-3 text-right font-bold ${scoreColor(r.relationshipScore)}`}>
          {r.relationshipScore}
        </td>
        <td className="px-4 py-3 text-right">{r.placementCount}</td>
        <td className="px-4 py-3 text-muted-foreground font-sans">{r.primaryOutlets.join(", ") || "–"}</td>
        <td className="px-4 py-3 text-right">{r.uniqueClients.length}</td>
        <td className="px-4 py-3"><TypeBadge type={r.topVertical} /></td>
        <td className="px-4 py-3 text-right">{formatNumber(r.totalReach)}</td>
        <td className="px-4 py-3 text-right text-muted-foreground">{formatDateShort(r.mostRecentDate)}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} className="bg-muted/30 px-6 py-4">
            <div className="mb-3 flex items-center gap-4">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Clients:</span> {r.uniqueClients.join(", ")}
              </p>
            </div>
            <div className="space-y-1.5">
              {r.placements.slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 rounded-md border border-border bg-background p-3">
                  <div className="min-w-0 flex-1">
                    <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald hover:underline font-sans truncate block">
                      {p.headline}
                    </a>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {p.client_name} · {p.outlet} · {formatDateShort(p.date)}
                      {p.topic_product && ` · ${p.topic_product}`}
                    </p>
                  </div>
                  <TypeBadge type={p.type} />
                </div>
              ))}
              {r.placements.length > 10 && (
                <p className="text-xs font-mono text-muted-foreground pt-1">
                  + {r.placements.length - 10} more placements
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
