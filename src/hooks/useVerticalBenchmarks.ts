import { useMemo } from "react";
import { usePlacements } from "@/hooks/usePlacements";
import type { MediaPlacement } from "@/data/types";

export interface VerticalBenchmark {
  vertical: string;
  placementCount: number;
  featureCount: number;
  featurePct: number;
  avgReach: number;
  totalAdValue: number;
  uniqueReporters: number;
  uniqueClients: number;
  reporterDepth: number; // reporters per client
  topOutlets: string[];
  topReporters: string[];
}

export function useVerticalBenchmarks(yearFilter?: string) {
  const { data: placements = [], isLoading, isError, refetch } = usePlacements();

  const benchmarks = useMemo(() => {
    const filtered = placements.filter((p) => {
      if (!p.vertical) return false;
      if (yearFilter && !p.date?.startsWith(yearFilter)) return false;
      return true;
    });

    const map = new Map<string, MediaPlacement[]>();
    filtered.forEach((p) => {
      if (!map.has(p.vertical)) map.set(p.vertical, []);
      map.get(p.vertical)!.push(p);
    });

    const result: VerticalBenchmark[] = [...map.entries()].map(([vertical, pls]) => {
      const featureCount = pls.filter((p) => p.type === "Feature").length;
      const totalReach = pls.reduce((s, p) => s + p.readership_viewership, 0);
      const totalAdValue = pls.reduce((s, p) => s + p.ad_value, 0);
      const reporters = new Set(pls.map((p) => p.reporter_name).filter(Boolean));
      const clients = new Set(pls.map((p) => p.client_name));

      // Top outlets by count
      const outletCounts = new Map<string, number>();
      pls.forEach((p) => {
        if (p.outlet) outletCounts.set(p.outlet, (outletCounts.get(p.outlet) || 0) + 1);
      });
      const topOutlets = [...outletCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

      // Top reporters by count
      const repCounts = new Map<string, number>();
      pls.forEach((p) => {
        if (p.reporter_name) repCounts.set(p.reporter_name, (repCounts.get(p.reporter_name) || 0) + 1);
      });
      const topReporters = [...repCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

      return {
        vertical,
        placementCount: pls.length,
        featureCount,
        featurePct: pls.length > 0 ? Math.round((featureCount / pls.length) * 100) : 0,
        avgReach: pls.length > 0 ? Math.round(totalReach / pls.length) : 0,
        totalAdValue,
        uniqueReporters: reporters.size,
        uniqueClients: clients.size,
        reporterDepth: clients.size > 0 ? Math.round((reporters.size / clients.size) * 10) / 10 : 0,
        topOutlets,
        topReporters,
      };
    });

    return result.sort((a, b) => b.placementCount - a.placementCount);
  }, [placements, yearFilter]);

  const years = useMemo(() => {
    return [...new Set(placements.map((p) => p.date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  }, [placements]);

  return { benchmarks, years, isLoading, isError, refetch };
}
