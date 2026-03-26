import { useState, useMemo } from "react";
import { FilterBar, FilterSelect } from "@/components/FilterBar";
import { usePlacements } from "@/hooks/usePlacements";
import { useSamples } from "@/hooks/useSamples";
import { useBriefings } from "@/hooks/useBriefings";
import { formatNumber, formatDateShort } from "@/lib/format";
import { Star, TrendingUp, Clock, Target } from "lucide-react";
import type { MediaPlacement } from "@/data/types";

interface ReporterScore {
  reporter: string;
  score: number;
  totalPlacements: number;
  clientPlacements: number;
  verticalPlacements: number;
  conversionRate: number;
  avgDaysToCoverage: number | null;
  totalReach: number;
  recentOutlets: string[];
  lastCoverageDate: string;
  topTypes: string[];
}

const CONVERSION_WINDOW_DAYS = 90;

export function SmartReporterMatcher() {
  const { data: placements = [] } = usePlacements();
  const { data: samples = [] } = useSamples();
  const { data: briefings = [] } = useBriefings();

  const [selectedClient, setSelectedClient] = useState("");
  const [selectedVertical, setSelectedVertical] = useState("");

  const clients = useMemo(
    () => [...new Set(placements.map((p) => p.client_name).filter(Boolean))].sort(),
    [placements]
  );
  const verticals = useMemo(
    () => [...new Set(placements.map((p) => p.vertical).filter(Boolean))].sort(),
    [placements]
  );

  const recommendations = useMemo(() => {
    if (!selectedClient && !selectedVertical) return [];

    // Build reporter profiles
    const reporterMap = new Map<string, {
      placements: MediaPlacement[];
      conversions: number;
      totalOutreach: number;
      daysToCoverage: number[];
    }>();

    // Aggregate placements by reporter
    for (const p of placements) {
      if (!p.reporter_name) continue;
      const key = p.reporter_name.trim();
      if (!reporterMap.has(key)) {
        reporterMap.set(key, { placements: [], conversions: 0, totalOutreach: 0, daysToCoverage: [] });
      }
      reporterMap.get(key)!.placements.push(p);
    }

    // Match conversions for conversion rate scoring
    const allOutreach = [
      ...samples.map((s) => ({
        reporter: s.reporter_name?.trim().toLowerCase() || "",
        client: s.client?.trim().toLowerCase() || "",
        date: s.date_shipped || s.date_requested,
      })),
      ...briefings.map((b) => ({
        reporter: b.reporter_name?.trim().toLowerCase() || "",
        client: b.client?.trim().toLowerCase() || "",
        date: b.date_met,
      })),
    ];

    for (const outreach of allOutreach) {
      if (!outreach.reporter || !outreach.date) continue;
      const oTime = new Date(outreach.date).getTime();
      const windowEnd = oTime + CONVERSION_WINDOW_DAYS * 86_400_000;

      // Find the reporter entry (case-insensitive match)
      for (const [key, data] of reporterMap) {
        if (key.toLowerCase() !== outreach.reporter) continue;
        data.totalOutreach++;
        const matched = placements.find((p) => {
          if (!p.date || !p.reporter_name) return false;
          const pTime = new Date(p.date).getTime();
          return (
            pTime >= oTime &&
            pTime <= windowEnd &&
            p.reporter_name.trim().toLowerCase() === outreach.reporter &&
            p.client_name.trim().toLowerCase() === outreach.client
          );
        });
        if (matched) {
          data.conversions++;
          data.daysToCoverage.push(
            Math.round((new Date(matched.date).getTime() - oTime) / 86_400_000)
          );
        }
        break;
      }
    }

    // Score each reporter
    const scored: ReporterScore[] = [];

    for (const [reporter, data] of reporterMap) {
      const { placements: rPlacements } = data;
      if (rPlacements.length < 2) continue; // Skip one-hit reporters

      const clientPlacements = selectedClient
        ? rPlacements.filter((p) => p.client_name === selectedClient).length
        : 0;
      const verticalPlacements = selectedVertical
        ? rPlacements.filter((p) => p.vertical === selectedVertical).length
        : 0;

      // If both filters set, require at least some relevance
      if (selectedClient && selectedVertical && clientPlacements === 0 && verticalPlacements === 0) continue;
      if (selectedClient && !selectedVertical && clientPlacements === 0) continue;
      if (!selectedClient && selectedVertical && verticalPlacements === 0) continue;

      const conversionRate = data.totalOutreach > 0
        ? data.conversions / data.totalOutreach
        : 0;
      const avgDays = data.daysToCoverage.length > 0
        ? Math.round(data.daysToCoverage.reduce((a, b) => a + b, 0) / data.daysToCoverage.length)
        : null;
      const totalReach = rPlacements.reduce((s, p) => s + p.readership_viewership, 0);

      // Composite score
      const clientWeight = selectedClient ? 0.3 : 0;
      const verticalWeight = selectedVertical ? 0.3 : 0;
      const conversionWeight = 0.2;
      const volumeWeight = 0.1;
      const reachWeight = 0.1;

      const maxClientPlacements = Math.max(...[...reporterMap.values()].map((d) =>
        selectedClient ? d.placements.filter((p) => p.client_name === selectedClient).length : 0
      ), 1);
      const maxVerticalPlacements = Math.max(...[...reporterMap.values()].map((d) =>
        selectedVertical ? d.placements.filter((p) => p.vertical === selectedVertical).length : 0
      ), 1);
      const maxTotal = Math.max(...[...reporterMap.values()].map((d) => d.placements.length), 1);
      const maxReach = Math.max(...[...reporterMap.values()].map((d) =>
        d.placements.reduce((s, p) => s + p.readership_viewership, 0)
      ), 1);

      const score =
        (clientWeight * (clientPlacements / maxClientPlacements)) +
        (verticalWeight * (verticalPlacements / maxVerticalPlacements)) +
        (conversionWeight * conversionRate) +
        (volumeWeight * (rPlacements.length / maxTotal)) +
        (reachWeight * (totalReach / maxReach));

      // Top types and recent outlets
      const typeCounts = new Map<string, number>();
      rPlacements.forEach((p) => typeCounts.set(p.type, (typeCounts.get(p.type) || 0) + 1));
      const topTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

      const sorted = [...rPlacements].sort((a, b) => b.date.localeCompare(a.date));
      const recentOutlets = [...new Set(sorted.slice(0, 5).map((p) => p.outlet))].slice(0, 3);
      const lastCoverageDate = sorted[0]?.date || "";

      scored.push({
        reporter,
        score,
        totalPlacements: rPlacements.length,
        clientPlacements,
        verticalPlacements,
        conversionRate,
        avgDaysToCoverage: avgDays,
        totalReach,
        recentOutlets,
        lastCoverageDate,
        topTypes,
      });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, 15);
  }, [placements, samples, briefings, selectedClient, selectedVertical]);

  const hasSelection = selectedClient || selectedVertical;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Find the Right Reporter</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Select a client and/or vertical to get ranked reporter recommendations based on historical placement data, conversion rates, and reach.
        </p>
        <FilterBar>
          <FilterSelect label="Select Client" value={selectedClient} options={clients} onChange={setSelectedClient} />
          <FilterSelect label="Select Vertical" value={selectedVertical} options={verticals} onChange={setSelectedVertical} />
        </FilterBar>
      </div>

      {!hasSelection && (
        <div className="text-center py-12">
          <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Select a client or vertical above to see reporter recommendations</p>
        </div>
      )}

      {hasSelection && recommendations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground font-mono">No reporters found matching this criteria.</p>
        </div>
      )}

      {hasSelection && recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.map((r, i) => (
            <div
              key={r.reporter}
              className={`rounded-xl border bg-card p-5 transition-shadow hover:shadow-md ${
                i === 0 ? "border-primary/30 shadow-sm" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                    i === 0
                      ? "gradient-brand text-white"
                      : i < 3
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.reporter}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {r.totalPlacements} placements · {formatNumber(r.totalReach)} total reach
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {i < 3 && <Star className="h-3.5 w-3.5 text-brand-yellow fill-brand-yellow" />}
                  <span className="text-xs font-mono font-bold text-primary">
                    {Math.round(r.score * 100)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {selectedClient && (
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Client Hits</p>
                    <p className="mt-0.5 text-lg font-bold text-foreground">{r.clientPlacements}</p>
                  </div>
                )}
                {selectedVertical && (
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Vertical Hits</p>
                    <p className="mt-0.5 text-lg font-bold text-foreground">{r.verticalPlacements}</p>
                  </div>
                )}
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-accent" />
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Conv. Rate</p>
                  </div>
                  <p className="mt-0.5 text-lg font-bold text-foreground">
                    {r.conversionRate > 0 ? `${Math.round(r.conversionRate * 100)}%` : "–"}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Avg. Days</p>
                  </div>
                  <p className="mt-0.5 text-lg font-bold text-foreground">
                    {r.avgDaysToCoverage !== null ? r.avgDaysToCoverage : "–"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.topTypes.map((t) => (
                  <span key={t} className="inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {t}
                  </span>
                ))}
                <span className="text-[10px] text-muted-foreground font-mono">
                  Recent: {r.recentOutlets.join(", ")}
                </span>
                {r.lastCoverageDate && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    · Last: {formatDateShort(r.lastCoverageDate)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
