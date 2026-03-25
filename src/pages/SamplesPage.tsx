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
import { useSamples } from "@/hooks/useSamples";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 50;

export default function SamplesPage() {
  const { data: samples, isLoading, error } = useSamples();
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);

  const clients = useMemo(() => [...new Set(samples?.map((s) => s.client).filter(Boolean))].sort(), [samples]);
  const teams = useMemo(() => [...new Set(samples?.map((s) => s.team).filter(Boolean))].sort(), [samples]);
  const statuses = useMemo(() => [...new Set(samples?.map((s) => s.status).filter(Boolean))].sort(), [samples]);

  const filtered = useMemo(() => {
    if (!samples) return [];
    return samples.filter((s) => {
      if (clientFilter && s.client !== clientFilter) return false;
      if (teamFilter && s.team !== teamFilter) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.client.toLowerCase().includes(q) ||
          s.reporter_name.toLowerCase().includes(q) ||
          s.outlet.toLowerCase().includes(q) ||
          s.products.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [samples, search, clientFilter, teamFilter, statusFilter]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // KPIs
  const total = filtered.length;
  const coverageLive = filtered.filter((s) => s.status.toLowerCase().includes("coverage live")).length;
  const conversionRate = total > 0 ? ((coverageLive / total) * 100).toFixed(1) : "0";
  const pending = filtered.filter((s) => s.status.toLowerCase().includes("pending")).length;

  return (
    <DashboardLayout>
      <div className="section-gap">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Samples</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Product samples shared with reporters · {filtered.length} records
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <ErrorState message="Failed to load samples" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Total Samples" value={total} />
              <KpiCard label="Coverage Live" value={coverageLive} />
              <KpiCard label="Conversion Rate" value={`${conversionRate}%`} detail={`${coverageLive} of ${total}`} />
              <KpiCard label="Pending Coverage" value={pending} />
            </div>

            <FilterBar>
              <SearchInput value={search} onChange={setSearch} placeholder="Search samples..." />
              <FilterSelect label="All Clients" value={clientFilter} options={clients} onChange={setClientFilter} />
              <FilterSelect label="All Teams" value={teamFilter} options={teams} onChange={setTeamFilter} />
              <FilterSelect label="All Statuses" value={statusFilter} options={statuses} onChange={setStatusFilter} />
            </FilterBar>

            {filtered.length === 0 ? (
              <EmptyState message="No samples match your filters" />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Coverage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(s.date_requested)}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{s.client}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">{s.products}</TableCell>
                        <TableCell className="text-muted-foreground">{s.outlet}</TableCell>
                        <TableCell className="text-muted-foreground">{s.reporter_name}</TableCell>
                        <TableCell>{s.status ? <StatusBadge status={s.status} /> : "—"}</TableCell>
                        <TableCell>
                          {s.coverage_link ? (
                            <a
                              href={s.coverage_link}
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
