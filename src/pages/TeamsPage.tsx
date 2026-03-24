import { useState, useMemo } from "react";
import { format, subMonths, subYears, startOfMonth } from "date-fns";
import { CalendarIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { FilterBar, FilterSelect } from "@/components/FilterBar";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { useTeams } from "@/hooks/useTeams";
import { useClients } from "@/hooks/useClients";
import { usePlacements } from "@/hooks/usePlacements";
import { formatNumber, formatCurrency, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  Tooltip,
} from "recharts";

function getMonthsBetween(from: Date, to: Date): string[] {
  const months: string[] = [];
  const cur = startOfMonth(from);
  const end = startOfMonth(to);
  while (cur <= end) {
    months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function formatShortMonth(ym: string): string {
  const [, m] = ym.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[parseInt(m, 10) - 1] || m;
}

interface DeltaBadgeProps {
  current: number;
  previous: number;
}

function DeltaBadge({ current, previous }: DeltaBadgeProps) {
  if (previous === 0 && current === 0) {
    return <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground"><Minus className="h-3 w-3" />—</span>;
  }
  if (previous === 0) {
    return <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-600"><TrendingUp className="h-3 w-3" />New</span>;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) {
    return <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground"><Minus className="h-3 w-3" />0%</span>;
  }
  if (pct > 0) {
    return <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-600"><TrendingUp className="h-3 w-3" />+{pct}%</span>;
  }
  return <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-destructive"><TrendingDown className="h-3 w-3" />{pct}%</span>;
}

const PRESETS = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "All", months: 0 },
] as const;

export default function TeamsPage() {
  const { data: teams = [], isLoading, isError, refetch } = useTeams();
  const { data: clients = [] } = useClients();
  const { data: placements = [] } = usePlacements();

  const [teamFilter, setTeamFilter] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  const teamNames = teams.map((t) => t.team_name);
  const filtered = teamFilter ? teams.filter((t) => t.team_name === teamFilter) : teams;

  // Filter placements by date range
  const datePlacements = useMemo(() => {
    if (!fromDate && !toDate) return placements;
    return placements.filter((p) => {
      if (!p.date) return false;
      const d = new Date(p.date);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [placements, fromDate, toDate]);

  // Sparkline months: use date range or default last 6
  const sparkMonths = useMemo(() => {
    if (fromDate && toDate) return getMonthsBetween(fromDate, toDate).slice(-12);
    if (fromDate) return getMonthsBetween(fromDate, new Date()).slice(-12);
    const now = new Date();
    return getMonthsBetween(subMonths(now, 5), now);
  }, [fromDate, toDate]);

  // Pre-compute monthly aggregates per team from filtered placements
  const teamMonthly = useMemo(() => {
    const map = new Map<string, Map<string, { placements: number; reach: number; adValue: number }>>();
    for (const p of datePlacements) {
      if (!p.date || !p.team_name) continue;
      const month = p.date.slice(0, 7);
      if (!map.has(p.team_name)) map.set(p.team_name, new Map());
      const teamMap = map.get(p.team_name)!;
      if (!teamMap.has(month)) teamMap.set(month, { placements: 0, reach: 0, adValue: 0 });
      const bucket = teamMap.get(month)!;
      bucket.placements++;
      bucket.reach += p.readership_viewership;
      bucket.adValue += p.ad_value;
    }
    return map;
  }, [datePlacements]);

  // Compute filtered totals per team
  const teamTotals = useMemo(() => {
    const map = new Map<string, { placements: number; reach: number; adValue: number }>();
    for (const p of datePlacements) {
      if (!p.team_name) continue;
      if (!map.has(p.team_name)) map.set(p.team_name, { placements: 0, reach: 0, adValue: 0 });
      const t = map.get(p.team_name)!;
      t.placements++;
      t.reach += p.readership_viewership;
      t.adValue += p.ad_value;
    }
    return map;
  }, [datePlacements]);

  const applyPreset = (months: number) => {
    if (months === 0) {
      setFromDate(undefined);
      setToDate(undefined);
    } else {
      setFromDate(subMonths(new Date(), months));
      setToDate(new Date());
    }
  };

  const hasDateFilter = fromDate || toDate;
  const dateLabel = fromDate && toDate
    ? `${format(fromDate, "MMM d, yyyy")} – ${format(toDate, "MMM d, yyyy")}`
    : fromDate
      ? `From ${format(fromDate, "MMM d, yyyy")}`
      : toDate
        ? `Through ${format(toDate, "MMM d, yyyy")}`
        : "All time";

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            {isLoading ? "Loading..." : `${teams.length} teams · ${dateLabel}`}
          </p>
        </div>

        <FilterBar>
          <FilterSelect label="All Teams" value={teamFilter} options={teamNames} onChange={setTeamFilter} />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 gap-2 font-mono text-xs", hasDateFilter && "border-primary text-primary")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {fromDate ? format(fromDate, "MMM d, yy") : "Start"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <span className="text-xs text-muted-foreground self-center">–</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 gap-2 font-mono text-xs", hasDateFilter && "border-primary text-primary")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {toDate ? format(toDate, "MMM d, yy") : "End"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1">
            {PRESETS.map((p) => (
              <Button key={p.label} variant="ghost" size="sm" className="h-7 px-2 text-xs font-mono" onClick={() => applyPreset(p.months)}>
                {p.label}
              </Button>
            ))}
          </div>

          {hasDateFilter && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => { setFromDate(undefined); setToDate(undefined); }}>
              Clear
            </Button>
          )}
        </FilterBar>

        {isError ? (
          <ErrorState message="Failed to load teams." onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-6 space-y-4">
                <div className="h-5 w-28 animate-pulse rounded bg-muted" />
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-10 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState message="No teams found." />
        ) : (
          <div className="space-y-10">
            {filtered.map((team) => {
              const teamClients = clients.filter((c) => c.team_name === team.team_name && c.status === "Active");
              const recentPlacements = datePlacements
                .filter((p) => p.team_name === team.team_name)
                .slice(0, 3);

              const monthly = teamMonthly.get(team.team_name);
              const totals = teamTotals.get(team.team_name) || { placements: 0, reach: 0, adValue: 0 };

              const sparkData = sparkMonths.map((m) => ({
                month: formatShortMonth(m),
                count: monthly?.get(m)?.placements || 0,
              }));

              // MoM deltas: compare last two months in the sparkline window
              const curMonth = sparkMonths[sparkMonths.length - 1];
              const prevMonth = sparkMonths.length >= 2 ? sparkMonths[sparkMonths.length - 2] : undefined;
              const cur = monthly?.get(curMonth) || { placements: 0, reach: 0, adValue: 0 };
              const prev = prevMonth ? (monthly?.get(prevMonth) || { placements: 0, reach: 0, adValue: 0 }) : { placements: 0, reach: 0, adValue: 0 };

              return (
                <div key={team.id} className="rounded-lg border border-border bg-card">
                  <div className="border-b border-border px-6 py-5">
                    <h2 className="text-lg font-semibold text-foreground">{team.team_name}</h2>
                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                      <div>
                        <p className="text-xs text-muted-foreground">Placements</p>
                        <p className="mt-1 font-tight text-2xl font-bold text-foreground">{totals.placements}</p>
                        <DeltaBadge current={cur.placements} previous={prev.placements} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Reach</p>
                        <p className="mt-1 font-tight text-2xl font-bold text-foreground">{formatNumber(totals.reach)}</p>
                        <DeltaBadge current={cur.reach} previous={prev.reach} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ad Value</p>
                        <p className="mt-1 font-tight text-2xl font-bold text-foreground">{formatCurrency(totals.adValue)}</p>
                        <DeltaBadge current={cur.adValue} previous={prev.adValue} />
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

                    {/* Sparkline */}
                    <div className="mt-4">
                      <p className="text-[10px] font-mono text-muted-foreground mb-1">
                        Placements · {hasDateFilter ? "Selected Range" : "Last 6 Months"}
                      </p>
                      <div className="h-[60px] w-full max-w-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(220, 9%, 46%)" }} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid hsl(220, 13%, 91%)" }}
                              formatter={(v: number) => [v, "Placements"]}
                            />
                            <Bar dataKey="count" fill="hsl(160, 84%, 30%)" radius={[2, 2, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-0 divide-x divide-border lg:grid-cols-2">
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
        )}
      </div>
    </DashboardLayout>
  );
}
