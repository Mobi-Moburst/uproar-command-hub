import { useMemo } from "react";
import { usePlacements } from "@/hooks/usePlacements";
import { useSamples } from "@/hooks/useSamples";
import { useBriefings } from "@/hooks/useBriefings";
import type { MediaPlacement, Sample, Briefing } from "@/data/types";

export interface ReporterAggregate {
  name: string;
  placementCount: number;
  uniqueClients: string[];
  primaryOutlets: string[];
  topVertical: string;
  totalReach: number;
  mostRecentDate: string;
  relationshipScore: number;
  conversionRate: number;
  topAffinityVerticals: string[];
  placements: MediaPlacement[];
}

function computeRelationshipScore(
  placements: MediaPlacement[],
  allMaxCount: number
): number {
  const count = placements.length;
  const now = Date.now();

  // Recency: days since most recent placement (lower is better)
  const mostRecent = placements.reduce((best, p) => {
    const d = p.date ? new Date(p.date).getTime() : 0;
    return d > best ? d : best;
  }, 0);
  const daysSince = mostRecent ? (now - mostRecent) / 86_400_000 : 365;
  const recencyScore = Math.max(0, 1 - daysSince / 365);

  // Type quality: features/interviews score higher
  const typeWeights: Record<string, number> = {
    Feature: 1,
    Interview: 0.9,
    Byline: 0.85,
    Quote: 0.6,
    Mention: 0.3,
  };
  const avgType =
    placements.reduce((s, p) => s + (typeWeights[p.type] ?? 0.4), 0) /
    count;

  // Client breadth
  const uniqueClients = new Set(placements.map((p) => p.client_name)).size;
  const breadthScore = Math.min(uniqueClients / 5, 1);

  // Frequency (normalized against the top reporter)
  const freqScore = allMaxCount > 0 ? Math.min(count / allMaxCount, 1) : 0;

  // Weighted blend
  return Math.round(
    (freqScore * 30 + recencyScore * 30 + avgType * 25 + breadthScore * 15)
  );
}

export function useReporterAnalytics(yearFilter?: string) {
  const { data: placements = [], isLoading: lp, isError, refetch } = usePlacements();
  const { data: samples = [], isLoading: ls } = useSamples();
  const { data: briefings = [], isLoading: lb } = useBriefings();
  const isLoading = lp || ls || lb;

  const reporters = useMemo(() => {
    // Build per-reporter outreach counts
    const reporterOutreach = new Map<string, { total: number; converted: number; verticalCounts: Map<string, number> }>();
    const allOutreach = [
      ...samples.map((s: Sample) => ({ reporter: s.reporter_name?.trim(), client: s.client?.trim(), date: s.date_shipped || s.date_requested })),
      ...briefings.map((b: Briefing) => ({ reporter: b.reporter_name?.trim(), client: b.client?.trim(), date: b.date_met })),
    ];
    allOutreach.forEach((o) => {
      if (!o.reporter) return;
      const key = o.reporter;
      if (!reporterOutreach.has(key)) reporterOutreach.set(key, { total: 0, converted: 0, verticalCounts: new Map() });
      const entry = reporterOutreach.get(key)!;
      entry.total++;
      // Check if conversion exists
      if (o.date) {
        const oTime = new Date(o.date).getTime();
        const match = placements.find((p) =>
          p.reporter_name?.trim() === key &&
          p.client_name?.trim().toLowerCase() === (o.client || "").toLowerCase() &&
          p.date && new Date(p.date).getTime() >= oTime &&
          new Date(p.date).getTime() <= oTime + 90 * 86_400_000
        );
        if (match) {
          entry.converted++;
          const v = match.vertical || "Unknown";
          entry.verticalCounts.set(v, (entry.verticalCounts.get(v) || 0) + 1);
        }
      }
    });

    const filtered = placements.filter((p) => {
      if (!p.reporter_name) return false;
      if (yearFilter && !p.date?.startsWith(yearFilter)) return false;
      return true;
    });

    const map = new Map<string, MediaPlacement[]>();
    filtered.forEach((p) => {
      const key = p.reporter_name.trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });

    const maxCount = Math.max(...[...map.values()].map((arr) => arr.length), 1);

    const result: ReporterAggregate[] = [...map.entries()].map(
      ([name, pls]) => {
        const clients = [...new Set(pls.map((p) => p.client_name))];
        const outlets = [...new Set(pls.map((p) => p.outlet).filter(Boolean))];

        // Top vertical by count
        const vertCounts = new Map<string, number>();
        pls.forEach((p) => {
          if (p.vertical) vertCounts.set(p.vertical, (vertCounts.get(p.vertical) || 0) + 1);
        });
        const topVertical = [...vertCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "–";

        const totalReach = pls.reduce((s, p) => s + p.readership_viewership, 0);
        const mostRecentDate = pls.reduce(
          (best, p) => (p.date && p.date > best ? p.date : best),
          ""
        );

        const outreach = reporterOutreach.get(name);
        const conversionRate = outreach && outreach.total > 0 ? outreach.converted / outreach.total : 0;
        const topAffinityVerticals = outreach
          ? [...outreach.verticalCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v]) => v)
          : [];

        return {
          name,
          placementCount: pls.length,
          uniqueClients: clients,
          primaryOutlets: outlets.slice(0, 3),
          topVertical,
          totalReach,
          mostRecentDate,
          relationshipScore: computeRelationshipScore(pls, maxCount),
          conversionRate,
          topAffinityVerticals,
          placements: pls.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
        };
      }
    );

    return result.sort((a, b) => b.relationshipScore - a.relationshipScore);
  }, [placements, samples, briefings, yearFilter]);

  const years = useMemo(() => {
    return [...new Set(placements.map((p) => p.date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  }, [placements]);

  return { reporters, years, isLoading, isError, refetch };
}
