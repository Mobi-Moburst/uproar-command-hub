import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { KpiCardSkeleton } from "@/components/KpiCardSkeleton";
import { FilterBar, FilterSelect, SearchInput } from "@/components/FilterBar";
import { StatusBadge } from "@/components/StatusBadge";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { useAwards } from "@/hooks/useAwards";
import { formatDate } from "@/lib/format";

type ViewMode = "table" | "pipeline";

export default function AwardsPage() {
  const { data: awards = [], isLoading, isError, refetch } = useAwards();

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const clientNames = [...new Set(awards.map((a) => a.client_name))].sort();
  const teamNames = [...new Set(awards.map((a) => a.team_name))].sort();
  const statuses = ["Drafting", "Submitted", "Finalist", "Won", "Lost"];

  const filtered = awards.filter((a) => {
    if (search && !a.submission_title.toLowerCase().includes(search.toLowerCase()) && !a.client_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (clientFilter && a.client_name !== clientFilter) return false;
    if (teamFilter && a.team_name !== teamFilter) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    return true;
  });

  const draftingCount = awards.filter((a) => a.status === "Drafting").length;
  const submittedCount = awards.filter((a) => a.status === "Submitted").length;
  const finalistCount = awards.filter((a) => a.status === "Finalist").length;
  const wonCount = awards.filter((a) => a.status === "Won").length;

  const pipelineGroups = statuses.map((status) => ({
    status,
    items: filtered.filter((a) => a.status === status),
  }));

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Awards Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">Track award submissions across all clients</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Drafting" value={draftingCount} />
              <KpiCard label="Submitted" value={submittedCount} />
              <KpiCard label="Finalist" value={finalistCount} />
              <KpiCard label="Won" value={wonCount} />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterBar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search awards..." />
            <FilterSelect label="All Clients" value={clientFilter} options={clientNames} onChange={setClientFilter} />
            <FilterSelect label="All Teams" value={teamFilter} options={teamNames} onChange={setTeamFilter} />
            <FilterSelect label="All Statuses" value={statusFilter} options={statuses} onChange={setStatusFilter} />
          </FilterBar>
          <div className="flex gap-1 rounded-md border border-[rgba(255,255,255,0.05)] p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "table" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("pipeline")}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "pipeline" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              Pipeline
            </button>
          </div>
        </div>

        {isError ? (
          <ErrorState message="Failed to load awards." onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton columns={9} rows={8} />
        ) : viewMode === "table" ? (
          filtered.length === 0 ? (
            <EmptyState message="No awards match your filters." columns={9} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.05)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.04)]">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Award</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Edition</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submission Title</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Team</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Result</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b border-[rgba(255,255,255,0.05)] last:border-0 hover:bg-[rgba(18,20,24,0.7)]">
                      <td className="whitespace-nowrap px-4 py-3 font-sans font-medium text-foreground">{a.client_name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">{a.award_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.award_edition}</td>
                      <td className="max-w-[260px] truncate px-4 py-3 text-foreground">{a.submission_title}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{a.team_name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(a.due_date)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{a.submitted_date ? formatDate(a.submitted_date) : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.result || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="grid gap-6 lg:grid-cols-4">
            {pipelineGroups.map((group) => (
              <div key={group.status}>
                <div className="mb-3 flex items-center gap-2">
                  <StatusBadge status={group.status} />
                  <span className="text-sm font-mono text-muted-foreground">{group.items.length}</span>
                </div>
                <div className="space-y-2">
                  {group.items.map((a) => (
                    <div key={a.id} className="rounded-lg border border-[rgba(255,255,255,0.05)] glass p-4">
                      <p className="text-sm font-medium text-foreground">{a.client_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{a.submission_title}</p>
                      <p className="mt-2 text-xs font-mono text-muted-foreground">{a.award_name}</p>
                      {a.due_date && (
                        <p className="mt-1 text-xs font-mono text-muted-foreground">Due: {formatDate(a.due_date)}</p>
                      )}
                    </div>
                  ))}
                  {group.items.length === 0 && (
                    <p className="rounded-lg border border-[rgba(255,255,255,0.05)] px-4 py-6 text-xs font-mono text-muted-foreground">No submissions with this status.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
