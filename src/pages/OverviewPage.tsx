import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { KpiCardSkeleton } from "@/components/KpiCardSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { TypeBadge } from "@/components/TypeBadge";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { useClients } from "@/hooks/useClients";
import { usePlacements } from "@/hooks/usePlacements";
import { useAwards } from "@/hooks/useAwards";
import { useTeams } from "@/hooks/useTeams";
import { formatNumber, formatCurrency, formatDateShort } from "@/lib/format";

export default function OverviewPage() {
  const { data: clients = [], isLoading: loadingClients, isError: errorClients, refetch: refetchClients } = useClients();
  const { data: placements = [], isLoading: loadingPlacements, isError: errorPlacements, refetch: refetchPlacements } = usePlacements();
  const { data: awards = [], isLoading: loadingAwards, isError: errorAwards, refetch: refetchAwards } = useAwards();
  const { data: teams = [], isLoading: loadingTeams } = useTeams();

  const isLoading = loadingClients || loadingPlacements || loadingAwards || loadingTeams;

  const activeClients = clients.filter((c) => c.status === "Active");
  const thisMonthPlacements = placements.filter((p) => p.date >= "2026-03-01");
  const totalReach = thisMonthPlacements.reduce((sum, p) => sum + p.readership_viewership, 0);
  const totalAdValue = thisMonthPlacements.reduce((sum, p) => sum + p.ad_value, 0);
  const inProgressAwards = awards.filter((a) => ["Drafting", "Submitted", "Finalist"].includes(a.status));
  const wonAwards = awards.filter((a) => a.status === "Won");
  const weeklyWins = placements.filter((p) => p.weekly_wins_trigger);

  // Impact-scored top placements this month
  const typeWeights: Record<string, number> = {
    Feature: 1.0, Interview: 1.0, Broadcast: 1.0, "Product review": 1.0,
    "Contributed content": 0.6, Announcement: 0.6, Data: 0.6, Award: 0.6,
    Mention: 0.3, Syndication: 0.3, "Social media": 0.3, Roundup: 0.3,
  };
  const maxReach = Math.max(...thisMonthPlacements.map((p) => p.readership_viewership), 1);
  const topPlacements = [...thisMonthPlacements]
    .map((p) => ({
      ...p,
      _score: (typeWeights[p.type] ?? 0.3) * 0.4 + (p.readership_viewership / maxReach) * 0.6,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 8);
  const topReachClients = [...activeClients].sort((a, b) => b.total_reach - a.total_reach).slice(0, 5);
  const recentActiveClients = [...activeClients].sort((a, b) => b.last_placement_date.localeCompare(a.last_placement_date)).slice(0, 5);

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">Executive summary — March 2026</p>
        </div>

        {/* KPI Stripe */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard label="Active Clients" value={activeClients.length} />
              <KpiCard label="Placements This Month" value={thisMonthPlacements.length} />
              <KpiCard label="Total Reach" value={formatNumber(totalReach)} />
              <KpiCard label="Total Ad Value" value={formatCurrency(totalAdValue)} />
              <KpiCard label="Awards In Progress" value={inProgressAwards.length} />
              <KpiCard label="Award Wins" value={wonAwards.length} />
            </>
          )}
        </div>

        {/* Recent Placements */}
        <div className="section-gap">
          <h2 className="text-lg font-semibold text-foreground">Top Placements This Month</h2>
          {errorPlacements ? (
            <ErrorState message="Failed to load placements." onRetry={() => refetchPlacements()} />
          ) : loadingPlacements ? (
            <TableSkeleton columns={6} rows={6} />
          ) : topPlacements.length === 0 ? (
            <EmptyState message="No placements recorded yet." columns={6} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Outlet</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Headline</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reach</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {topPlacements.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateShort(p.date)}</td>
                      <td className="px-4 py-3 font-sans font-medium text-foreground">{p.client_name}</td>
                      <td className="px-4 py-3 text-foreground">{p.outlet}</td>
                      <td className="max-w-xs truncate px-4 py-3">
                        <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-emerald hover:underline font-sans">
                          {p.headline}
                        </a>
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={p.type} /></td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatNumber(p.readership_viewership)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Weekly Wins Panel */}
        <div className="section-gap">
          <h2 className="text-lg font-semibold text-foreground">Weekly Wins</h2>
          {loadingPlacements ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : weeklyWins.length === 0 ? (
            <EmptyState message="No weekly wins flagged this week." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {weeklyWins.map((win) => (
                <div key={win.id} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-foreground">{win.client_name}</p>
                    <TypeBadge type={win.type} />
                  </div>
                  <a href={win.link} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-emerald hover:underline">
                    {win.headline}
                  </a>
                  <p className="mt-2 text-xs font-mono text-muted-foreground">
                    {win.outlet} · {formatDateShort(win.date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Momentum + Team Snapshot */}
        <div className="grid gap-16 lg:grid-cols-2">
          <div className="section-gap">
            <h2 className="text-lg font-semibold text-foreground">Client Momentum</h2>
            {errorClients ? (
              <ErrorState message="Failed to load clients." onRetry={() => refetchClients()} />
            ) : loadingClients ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Most Recent Activity</h3>
                  <div className="space-y-2">
                    {recentActiveClients.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">{formatDateShort(c.last_placement_date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Highest Reach</h3>
                  <div className="space-y-2">
                    {topReachClients.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">{formatNumber(c.total_reach)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="section-gap">
            <h2 className="text-lg font-semibold text-foreground">Team Activity</h2>
            {loadingTeams ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="grid grid-cols-3 gap-4">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <div key={j} className="h-8 animate-pulse rounded bg-muted" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border bg-card p-5">
                    <p className="text-sm font-semibold text-foreground">{t.team_name}</p>
                    <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="font-tight text-xl font-bold text-foreground">{t.placement_count}</p>
                        <p className="text-xs text-muted-foreground">Placements</p>
                      </div>
                      <div>
                        <p className="font-tight text-xl font-bold text-foreground">{formatNumber(t.total_reach)}</p>
                        <p className="text-xs text-muted-foreground">Reach</p>
                      </div>
                      <div>
                        <p className="font-tight text-xl font-bold text-foreground">{t.total_wins}</p>
                        <p className="text-xs text-muted-foreground">Wins</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
