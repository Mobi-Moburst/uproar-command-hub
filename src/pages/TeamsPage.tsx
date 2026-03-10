import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FilterBar, FilterSelect } from "@/components/FilterBar";
import { teams, clients, placements } from "@/data/mockData";
import { formatNumber, formatCurrency, formatDateShort } from "@/lib/format";

export default function TeamsPage() {
  const [teamFilter, setTeamFilter] = useState("");
  const teamNames = teams.map((t) => t.team_name);

  const filtered = teamFilter ? teams.filter((t) => t.team_name === teamFilter) : teams;

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">{teams.length} teams</p>
        </div>

        <FilterBar>
          <FilterSelect label="All Teams" value={teamFilter} options={teamNames} onChange={setTeamFilter} />
        </FilterBar>

        <div className="space-y-10">
          {filtered.map((team) => {
            const teamClients = clients.filter((c) => c.team_name === team.team_name && c.status === "Active");
            const recentPlacements = placements
              .filter((p) => p.team_name === team.team_name)
              .slice(0, 3);

            return (
              <div key={team.id} className="rounded-lg border border-border bg-card">
                <div className="border-b border-border px-6 py-5">
                  <h2 className="text-lg font-semibold text-foreground">{team.team_name}</h2>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <div>
                      <p className="text-xs text-muted-foreground">Placements</p>
                      <p className="mt-1 font-tight text-2xl font-bold text-foreground">{team.placement_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Reach</p>
                      <p className="mt-1 font-tight text-2xl font-bold text-foreground">{formatNumber(team.total_reach)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ad Value</p>
                      <p className="mt-1 font-tight text-2xl font-bold text-foreground">{formatCurrency(team.total_ad_value)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Submissions</p>
                      <p className="mt-1 font-tight text-2xl font-bold text-foreground">{team.total_submissions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Wins</p>
                      <p className="mt-1 font-tight text-2xl font-bold text-foreground">{team.total_wins}</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-0 divide-x divide-border lg:grid-cols-2">
                  {/* Active Clients */}
                  <div className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Active Clients ({teamClients.length})</h3>
                    <div className="space-y-2">
                      {teamClients.map((c) => (
                        <div key={c.id} className="flex items-center justify-between">
                          <span className="text-sm text-foreground">{c.name}</span>
                          <span className="text-xs font-mono text-muted-foreground">{c.vertical}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Recent Placements */}
                  <div className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Placements</h3>
                    <div className="space-y-2">
                      {recentPlacements.map((p) => (
                        <div key={p.id}>
                          <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald hover:underline">
                            {p.headline}
                          </a>
                          <p className="text-xs font-mono text-muted-foreground">{p.outlet} · {formatDateShort(p.date)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
