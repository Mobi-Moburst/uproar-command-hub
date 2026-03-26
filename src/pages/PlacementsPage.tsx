import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { KpiCardSkeleton } from "@/components/KpiCardSkeleton";
import { FilterBar, FilterSelect, SearchInput } from "@/components/FilterBar";
import { TypeBadge } from "@/components/TypeBadge";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { usePlacements } from "@/hooks/usePlacements";
import { formatNumber, formatCurrency, formatDateShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TypeTrendChart } from "@/components/TypeTrendChart";

const PAGE_SIZE = 50;

export default function PlacementsPage() {
  const { data: placements = [], isLoading, isError, refetch } = usePlacements();

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [verticalFilter, setVerticalFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [securedByFilter, setSecuredByFilter] = useState("Uproar");
  const [topicFilter, setTopicFilter] = useState("");
  const [page, setPage] = useState(0);

  const clientNames = [...new Set(placements.map((p) => p.client_name))].sort();
  const teamNames = [...new Set(placements.map((p) => p.team_name))].sort();
  const types = [...new Set(placements.map((p) => p.type))].sort();
  const verticals = [...new Set(placements.map((p) => p.vertical))].sort();
  const topicProducts = [...new Set(placements.map((p) => p.topic_product).filter(Boolean))].sort();
  const years = [...new Set(placements.map((p) => p.date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const securedByNames = [...new Set(placements.map((p) => p.secured_by).filter(Boolean))].sort();

  const filtered = useMemo(() => {
    return placements.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const match = [p.headline, p.outlet, p.client_name, p.reporter_name, p.secured_by, p.vertical, p.type, p.topic_product]
          .some((field) => field?.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (clientFilter && p.client_name !== clientFilter) return false;
      if (teamFilter && p.team_name !== teamFilter) return false;
      if (typeFilter && p.type !== typeFilter) return false;
      if (verticalFilter && p.vertical !== verticalFilter) return false;
      if (yearFilter && !p.date?.startsWith(yearFilter)) return false;
      if (securedByFilter && p.secured_by !== securedByFilter) return false;
      if (topicFilter && p.topic_product !== topicFilter) return false;
      return true;
    });
  }, [placements, search, clientFilter, teamFilter, typeFilter, verticalFilter, yearFilter, securedByFilter, topicFilter]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  if (safePage !== page) setPage(safePage);

  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const totalReach = filtered.reduce((s, p) => s + p.readership_viewership, 0);
  const totalAdValue = filtered.reduce((s, p) => s + p.ad_value, 0);

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(0);
  };

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Media Placements</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">All media coverage across clients</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Total Placements" value={filtered.length.toLocaleString()} detail={yearFilter || "All time"} />
              <KpiCard label="Total Reach" value={formatNumber(totalReach)} detail="Reported total reach" />
              <KpiCard label="Total Ad Value" value={formatCurrency(totalAdValue)} detail="Reported total ad value" />
            </>
          )}
        </div>

        <FilterBar>
          <SearchInput value={search} onChange={handleFilterChange(setSearch)} placeholder="Search headlines, outlets, clients, reporters, secured by..." />
          <FilterSelect label="All Clients" value={clientFilter} options={clientNames} onChange={handleFilterChange(setClientFilter)} />
          <FilterSelect label="All Teams" value={teamFilter} options={teamNames} onChange={handleFilterChange(setTeamFilter)} />
          <FilterSelect label="All Types" value={typeFilter} options={types} onChange={handleFilterChange(setTypeFilter)} />
          <FilterSelect label="All Verticals" value={verticalFilter} options={verticals} onChange={handleFilterChange(setVerticalFilter)} />
          <FilterSelect label="All Years" value={yearFilter} options={years} onChange={handleFilterChange(setYearFilter)} />
          <FilterSelect label="All Secured By" value={securedByFilter} options={securedByNames} onChange={handleFilterChange(setSecuredByFilter)} />
          <FilterSelect label="All Topics" value={topicFilter} options={topicProducts} onChange={handleFilterChange(setTopicFilter)} />
        </FilterBar>

        {!isLoading && !isError && filtered.length > 0 && (
          <TypeTrendChart placements={filtered} />
        )}

        {isError ? (
          <ErrorState message="Failed to load placements." onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton columns={10} rows={10} />
        ) : filtered.length === 0 ? (
          <EmptyState message="No placements match your filters." columns={10} />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outlet</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reporter</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Headline</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vertical</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topic/Product</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reach</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ad Value</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secured By</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {pageRows.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateShort(p.date)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-sans font-medium text-foreground">{p.client_name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">{p.outlet || "–"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{p.reporter_name || "–"}</td>
                      <td className="max-w-[280px] truncate px-4 py-3">
                        <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 hover:underline font-sans">
                          {p.headline}
                        </a>
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={p.type} /></td>
                      <td className="px-4 py-3"><TypeBadge type={p.vertical} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground font-sans">{p.topic_product || "–"}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(p.readership_viewership)}</td>
                      <td className="px-4 py-3 text-right">{p.ad_value ? formatCurrency(p.ad_value) : "–"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground font-sans">{p.secured_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-mono text-muted-foreground">
                Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <span className="text-sm font-mono text-muted-foreground">
                  {safePage + 1} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
