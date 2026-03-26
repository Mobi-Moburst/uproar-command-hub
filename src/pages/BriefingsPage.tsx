import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { KpiCardSkeleton } from "@/components/KpiCardSkeleton";
import { FilterBar, FilterSelect, SearchInput } from "@/components/FilterBar";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBriefings } from "@/hooks/useBriefings";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 50;

export default function BriefingsPage() {
  const { data: briefings, isLoading, error } = useBriefings();
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);

  const clients = useMemo(() => [...new Set(briefings?.map((b) => b.client).filter(Boolean))].sort(), [briefings]);
  const teams = useMemo(() => [...new Set(briefings?.map((b) => b.team).filter(Boolean))].sort(), [briefings]);
  const interviewTypes = useMemo(() => [...new Set(briefings?.map((b) => b.interview_type).filter(Boolean))].sort(), [briefings]);
  const statuses = useMemo(() => [...new Set(briefings?.map((b) => b.status).filter(Boolean))].sort(), [briefings]);

  const filtered = useMemo(() => {
    if (!briefings) return [];
    return briefings.filter((b) => {
      if (clientFilter && b.client !== clientFilter) return false;
      if (teamFilter && b.team !== teamFilter) return false;
      if (typeFilter && b.interview_type !== typeFilter) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.client.toLowerCase().includes(q) ||
          b.reporter_name.toLowerCase().includes(q) ||
          b.outlet.toLowerCase().includes(q) ||
          b.topic.toLowerCase().includes(q) ||
          b.spokesperson.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      const da = a.date_met ? new Date(a.date_met).getTime() : 0;
      const db = b.date_met ? new Date(b.date_met).getTime() : 0;
      return db - da;
    });
  }, [briefings, search, clientFilter, teamFilter, typeFilter, statusFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // KPIs
  const total = filtered.length;
  const coverageLive = filtered.filter((b) => b.status.toLowerCase().includes("coverage live")).length;
  const conversionRate = total > 0 ? ((coverageLive / total) * 100).toFixed(1) : "0";
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((b) => {
      if (b.interview_type) map.set(b.interview_type, (map.get(b.interview_type) || 0) + 1);
    });
    // Return top type
    let topType = "—";
    let topCount = 0;
    map.forEach((count, type) => { if (count > topCount) { topType = type; topCount = count; } });
    return topType;
  }, [filtered]);

  return (
    <DashboardLayout>
      <div className="section-gap">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Briefings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reporter briefings and interviews · {filtered.length} records
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <ErrorState message="Failed to load briefings" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Total Briefings" value={total} />
              <KpiCard label="Coverage Live" value={coverageLive} />
              <KpiCard label="Conversion Rate" value={`${conversionRate}%`} detail={`${coverageLive} of ${total}`} />
              <KpiCard label="Top Type" value={byType} />
            </div>

            <FilterBar>
              <SearchInput value={search} onChange={setSearch} placeholder="Search briefings..." />
              <FilterSelect label="All Clients" value={clientFilter} options={clients} onChange={setClientFilter} />
              <FilterSelect label="All Teams" value={teamFilter} options={teams} onChange={setTeamFilter} />
              <FilterSelect label="All Types" value={typeFilter} options={interviewTypes} onChange={setTypeFilter} />
              <FilterSelect label="All Statuses" value={statusFilter} options={statuses} onChange={setStatusFilter} />
            </FilterBar>

            {filtered.length === 0 ? (
              <EmptyState message="No briefings match your filters" />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Coverage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(b.date_met)}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{b.client}</TableCell>
                        <TableCell className="text-muted-foreground">{b.outlet}</TableCell>
                        <TableCell className="text-muted-foreground">{b.reporter_name}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-muted-foreground">{b.topic}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{b.interview_type || "—"}</TableCell>
                        <TableCell>{b.status ? <StatusBadge status={b.status} /> : "—"}</TableCell>
                        <TableCell>
                          {b.coverage_link ? (
                            <a
                              href={b.coverage_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              View
                            </a>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
