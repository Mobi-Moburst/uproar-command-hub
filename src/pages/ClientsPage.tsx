import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FilterBar, FilterSelect, SearchInput } from "@/components/FilterBar";
import { StatusBadge } from "@/components/StatusBadge";
import { TypeBadge } from "@/components/TypeBadge";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { useClients } from "@/hooks/useClients";
import { usePlacements } from "@/hooks/usePlacements";
import { useAwards } from "@/hooks/useAwards";
import { formatNumber, formatCurrency, formatDateShort } from "@/lib/format";
import type { Client } from "@/data/types";

export default function ClientsPage() {
  const { data: clients = [], isLoading, isError, refetch } = useClients();
  const { data: placements = [] } = usePlacements();
  const { data: awards = [] } = useAwards();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [verticalFilter, setVerticalFilter] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const statuses = [...new Set(clients.map((c) => c.status))];
  const teamNames = [...new Set(clients.map((c) => c.team_name))];
  const verticals = [...new Set(clients.map((c) => c.vertical))];

  const filtered = clients.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (teamFilter && c.team_name !== teamFilter) return false;
    if (verticalFilter && c.vertical !== verticalFilter) return false;
    return true;
  });

  const clientPlacements = selectedClient
    ? placements.filter((p) => p.client_name === selectedClient.name).slice(0, 5)
    : [];
  const clientAwards = selectedClient
    ? awards.filter((a) => a.client_name === selectedClient.name)
    : [];

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            {isLoading ? "Loading..." : `${clients.length} clients total · ${clients.filter(c => c.status === "Active").length} active`}
          </p>
        </div>

        <FilterBar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search clients..." />
          <FilterSelect label="All Statuses" value={statusFilter} options={statuses} onChange={setStatusFilter} />
          <FilterSelect label="All Teams" value={teamFilter} options={teamNames} onChange={setTeamFilter} />
          <FilterSelect label="All Verticals" value={verticalFilter} options={verticals} onChange={setVerticalFilter} />
        </FilterBar>

        {isError ? (
          <ErrorState message="Failed to load clients." onRetry={() => refetch()} />
        ) : isLoading ? (
          <TableSkeleton columns={10} rows={10} />
        ) : filtered.length === 0 ? (
          <EmptyState message="No clients match your filters." columns={10} />
        ) : (
          <div className="relative">
            <div className={`overflow-x-auto rounded-lg border border-border transition-all ${selectedClient ? "lg:mr-[50%]" : ""}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Team</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vertical</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Placements</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reach</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ad Value</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Awards</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Wins</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Last Placement</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedClient(selectedClient?.id === c.id ? null : c)}
                      className={`cursor-pointer border-b border-border last:border-0 transition-colors ${
                        selectedClient?.id === c.id ? "bg-emerald-light" : "hover:bg-muted/50"
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-sans font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.team_name}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{c.vertical}</td>
                      <td className="px-4 py-3 text-right">{c.total_placements}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(c.total_reach)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(c.total_ad_value)}</td>
                      <td className="px-4 py-3 text-right">{c.total_award_submissions}</td>
                      <td className="px-4 py-3 text-right">{c.total_award_wins}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatDateShort(c.last_placement_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedClient && (
              <div className="fixed right-0 top-0 z-40 h-screen w-full overflow-y-auto border-l border-border bg-background p-6 shadow-xl animate-slide-in-right lg:w-1/2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">{selectedClient.name}</h2>
                  <button onClick={() => setSelectedClient(null)} className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                    Close
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={selectedClient.status} />
                  <span className="text-sm font-mono text-muted-foreground">{selectedClient.team_name} · {selectedClient.vertical}</span>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs text-muted-foreground">Placements</p>
                    <p className="mt-1 font-tight text-2xl font-bold">{selectedClient.total_placements}</p>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs text-muted-foreground">Reach</p>
                    <p className="mt-1 font-tight text-2xl font-bold">{formatNumber(selectedClient.total_reach)}</p>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs text-muted-foreground">Ad Value</p>
                    <p className="mt-1 font-tight text-2xl font-bold">{formatCurrency(selectedClient.total_ad_value)}</p>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs text-muted-foreground">Award Wins</p>
                    <p className="mt-1 font-tight text-2xl font-bold">{selectedClient.total_award_wins}</p>
                  </div>
                </div>

                {selectedClient.active_campaign && (
                  <div className="mt-6">
                    <p className="text-xs text-muted-foreground">Active Campaign</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{selectedClient.active_campaign}</p>
                  </div>
                )}

                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Recent Placements</h3>
                  {clientPlacements.length > 0 ? (
                    <div className="space-y-2">
                      {clientPlacements.map((p) => (
                        <div key={p.id} className="rounded-md border border-border p-3">
                          <div className="flex items-start justify-between">
                            <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald hover:underline">
                              {p.headline}
                            </a>
                            <TypeBadge type={p.type} />
                          </div>
                          <p className="mt-1 text-xs font-mono text-muted-foreground">
                            {p.outlet} · {formatDateShort(p.date)} · {formatNumber(p.readership_viewership)} reach
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-mono text-muted-foreground">No placements recorded.</p>
                  )}
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Awards Submissions</h3>
                  {clientAwards.length > 0 ? (
                    <div className="space-y-2">
                      {clientAwards.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{a.submission_title}</p>
                            <p className="text-xs font-mono text-muted-foreground">{a.award_name} — {a.award_edition}</p>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-mono text-muted-foreground">No award submissions.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
