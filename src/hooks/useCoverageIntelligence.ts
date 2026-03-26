import { useMemo } from "react";
import { usePlacements } from "@/hooks/usePlacements";
import { useSamples } from "@/hooks/useSamples";
import { useBriefings } from "@/hooks/useBriefings";
import type { MediaPlacement, Sample, Briefing } from "@/data/types";

const CONVERSION_WINDOW_DAYS = 90;

export interface ConversionRecord {
  type: "sample" | "briefing";
  id: string;
  client: string;
  reporter: string;
  outlet: string;
  date: string;
  converted: boolean;
  placement?: MediaPlacement;
  daysToCoverage?: number;
  vertical?: string;
  team?: string;
}

export interface ReporterAffinity {
  reporter: string;
  verticals: { vertical: string; placements: number; conversions: number; rate: number }[];
  clients: { client: string; placements: number; conversions: number; rate: number }[];
  overallConversionRate: number;
  totalSamples: number;
  totalBriefings: number;
  totalConversions: number;
}

export interface OutletMomentumEntry {
  outlet: string;
  months: { month: string; count: number }[];
  trend: number; // percentage change last 3 months vs prior 3 months
  totalPlacements: number;
}

export interface IntelligenceSummary {
  sampleConversionRate: number;
  briefingConversionRate: number;
  topConvertingReporter: string;
  conversions: ConversionRecord[];
  reporterAffinities: ReporterAffinity[];
  outletMomentum: OutletMomentumEntry[];
  isLoading: boolean;
  isError: boolean;
}

function matchConversions(
  items: (Sample | Briefing)[],
  placements: MediaPlacement[],
  type: "sample" | "briefing"
): ConversionRecord[] {
  return items.map((item) => {
    const reporter = item.reporter_name?.trim().toLowerCase() || "";
    const client = item.client?.trim().toLowerCase() || "";
    const itemDate = type === "sample"
      ? (item as Sample).date_shipped || (item as Sample).date_requested
      : (item as Briefing).date_met;

    if (!itemDate || !reporter) {
      return {
        type,
        id: item.id,
        client: item.client,
        reporter: item.reporter_name,
        outlet: item.outlet,
        date: itemDate || "",
        converted: false,
        team: type === "sample" ? (item as Sample).team : (item as Briefing).team,
      };
    }

    const itemTime = new Date(itemDate).getTime();
    const windowEnd = itemTime + CONVERSION_WINDOW_DAYS * 86_400_000;

    // Find matching placement: same reporter + client within 90 days after
    const match = placements.find((p) => {
      if (!p.date || !p.reporter_name) return false;
      const pTime = new Date(p.date).getTime();
      if (pTime < itemTime || pTime > windowEnd) return false;
      return (
        p.reporter_name.trim().toLowerCase() === reporter &&
        p.client_name.trim().toLowerCase() === client
      );
    });

    const daysToCoverage = match
      ? Math.round((new Date(match.date).getTime() - itemTime) / 86_400_000)
      : undefined;

    return {
      type,
      id: item.id,
      client: item.client,
      reporter: item.reporter_name,
      outlet: item.outlet || match?.outlet || "",
      date: itemDate,
      converted: !!match,
      placement: match,
      daysToCoverage,
      vertical: match?.vertical,
      team: type === "sample" ? (item as Sample).team : (item as Briefing).team,
    };
  });
}

function computeReporterAffinities(
  conversions: ConversionRecord[],
  placements: MediaPlacement[]
): ReporterAffinity[] {
  const reporters = new Map<string, ConversionRecord[]>();
  conversions.forEach((c) => {
    if (!c.reporter) return;
    const key = c.reporter.trim();
    if (!reporters.has(key)) reporters.set(key, []);
    reporters.get(key)!.push(c);
  });

  // Also build a placement lookup by reporter
  const placementsByReporter = new Map<string, MediaPlacement[]>();
  placements.forEach((p) => {
    if (!p.reporter_name) return;
    const key = p.reporter_name.trim();
    if (!placementsByReporter.has(key)) placementsByReporter.set(key, []);
    placementsByReporter.get(key)!.push(p);
  });

  return [...reporters.entries()].map(([reporter, records]) => {
    const rPlacements = placementsByReporter.get(reporter) || [];
    const samples = records.filter((r) => r.type === "sample");
    const briefings = records.filter((r) => r.type === "briefing");
    const converted = records.filter((r) => r.converted);

    // Vertical breakdown from placements
    const vertMap = new Map<string, { placements: number; conversions: number }>();
    rPlacements.forEach((p) => {
      const v = p.vertical || "Unknown";
      const entry = vertMap.get(v) || { placements: 0, conversions: 0 };
      entry.placements++;
      vertMap.set(v, entry);
    });
    converted.forEach((c) => {
      const v = c.vertical || "Unknown";
      const entry = vertMap.get(v) || { placements: 0, conversions: 0 };
      entry.conversions++;
      vertMap.set(v, entry);
    });

    const verticals = [...vertMap.entries()]
      .map(([vertical, data]) => ({
        vertical,
        ...data,
        rate: data.placements > 0 ? data.conversions / data.placements : 0,
      }))
      .sort((a, b) => b.placements - a.placements);

    // Client breakdown
    const clientMap = new Map<string, { placements: number; conversions: number }>();
    rPlacements.forEach((p) => {
      const c = p.client_name || "Unknown";
      const entry = clientMap.get(c) || { placements: 0, conversions: 0 };
      entry.placements++;
      clientMap.set(c, entry);
    });
    converted.forEach((c) => {
      const cl = c.client || "Unknown";
      const entry = clientMap.get(cl) || { placements: 0, conversions: 0 };
      entry.conversions++;
      clientMap.set(cl, entry);
    });

    const clients = [...clientMap.entries()]
      .map(([client, data]) => ({
        client,
        ...data,
        rate: data.placements > 0 ? data.conversions / data.placements : 0,
      }))
      .sort((a, b) => b.placements - a.placements);

    return {
      reporter,
      verticals,
      clients,
      overallConversionRate: records.length > 0 ? converted.length / records.length : 0,
      totalSamples: samples.length,
      totalBriefings: briefings.length,
      totalConversions: converted.length,
    };
  }).sort((a, b) => b.totalConversions - a.totalConversions);
}

function computeOutletMomentum(placements: MediaPlacement[]): OutletMomentumEntry[] {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const recent = placements.filter((p) => p.date && new Date(p.date) >= sixMonthsAgo);

  const outletMonths = new Map<string, Map<string, number>>();
  recent.forEach((p) => {
    if (!p.outlet) return;
    const month = p.date.slice(0, 7);
    if (!outletMonths.has(p.outlet)) outletMonths.set(p.outlet, new Map());
    const monthMap = outletMonths.get(p.outlet)!;
    monthMap.set(month, (monthMap.get(month) || 0) + 1);
  });

  // Generate last 6 months
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return [...outletMonths.entries()]
    .map(([outlet, monthMap]) => {
      const months = monthKeys.map((m) => ({ month: m, count: monthMap.get(m) || 0 }));
      const recent3 = months.slice(3).reduce((s, m) => s + m.count, 0);
      const prior3 = months.slice(0, 3).reduce((s, m) => s + m.count, 0);
      const trend = prior3 > 0 ? ((recent3 - prior3) / prior3) * 100 : recent3 > 0 ? 100 : 0;
      const totalPlacements = months.reduce((s, m) => s + m.count, 0);

      return { outlet, months, trend, totalPlacements };
    })
    .filter((o) => o.totalPlacements >= 2)
    .sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend));
}

export function useCoverageIntelligence(): IntelligenceSummary {
  const { data: placements = [], isLoading: lp, isError: ep } = usePlacements();
  const { data: samples = [], isLoading: ls, isError: es } = useSamples();
  const { data: briefings = [], isLoading: lb, isError: eb } = useBriefings();

  const isLoading = lp || ls || lb;
  const isError = ep || es || eb;

  return useMemo(() => {
    if (isLoading || isError) {
      return {
        sampleConversionRate: 0,
        briefingConversionRate: 0,
        topConvertingReporter: "–",
        conversions: [],
        reporterAffinities: [],
        outletMomentum: [],
        isLoading,
        isError,
      };
    }

    const sampleConversions = matchConversions(samples, placements, "sample");
    const briefingConversions = matchConversions(briefings, placements, "briefing");
    const allConversions = [...sampleConversions, ...briefingConversions];

    const sampleConverted = sampleConversions.filter((c) => c.converted).length;
    const briefingConverted = briefingConversions.filter((c) => c.converted).length;

    const sampleConversionRate = samples.length > 0 ? sampleConverted / samples.length : 0;
    const briefingConversionRate = briefings.length > 0 ? briefingConverted / briefings.length : 0;

    // Top converting reporter (by total conversions)
    const reporterCounts = new Map<string, number>();
    allConversions.filter((c) => c.converted).forEach((c) => {
      if (!c.reporter) return;
      reporterCounts.set(c.reporter, (reporterCounts.get(c.reporter) || 0) + 1);
    });
    const topConvertingReporter = [...reporterCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "–";

    const reporterAffinities = computeReporterAffinities(allConversions, placements);
    const outletMomentum = computeOutletMomentum(placements);

    return {
      sampleConversionRate,
      briefingConversionRate,
      topConvertingReporter,
      conversions: allConversions,
      reporterAffinities,
      outletMomentum,
      isLoading,
      isError,
    };
  }, [placements, samples, briefings, isLoading, isError]);
}
