import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { usePlacements } from "@/hooks/usePlacements";
import { useAwards } from "@/hooks/useAwards";
import { useClients } from "@/hooks/useClients";
import { useSamples } from "@/hooks/useSamples";
import { useBriefings } from "@/hooks/useBriefings";
import { ReportHero } from "@/components/report/ReportHero";
import { ReportKpis } from "@/components/report/ReportKpis";
import { ReportHighlights } from "@/components/report/ReportHighlights";
import { ReportCoverageBreakdown } from "@/components/report/ReportCoverageBreakdown";
import { ReportAwards } from "@/components/report/ReportAwards";
import { ReportOutreachSummary } from "@/components/report/ReportOutreachSummary";
import { ReportTopReporters } from "@/components/report/ReportTopReporters";
import { ReportOutletMomentum } from "@/components/report/ReportOutletMomentum";
import { ReportFooter } from "@/components/report/ReportFooter";
import { ReportDateRange } from "@/components/report/ReportDateRange";
import { ReportAISummary } from "@/components/report/ReportAISummary";
import { useAICoverageSummary } from "@/hooks/useAICoverageSummary";
import type { MediaPlacement, AwardSubmission, Sample, Briefing } from "@/data/types";

export default function ClientReportPage() {
  const [params, setParams] = useSearchParams();
  const clientName = params.get("client") || "A. Duie Pyle";
  const fromDate = params.get("from") || "";
  const toDate = params.get("to") || "";

  const { data: placements = [], isLoading: loadingP } = usePlacements();
  const { data: awards = [], isLoading: loadingA } = useAwards();
  const { data: clients = [], isLoading: loadingC } = useClients();
  const { data: samples = [], isLoading: loadingS } = useSamples();
  const { data: briefings = [], isLoading: loadingB } = useBriefings();

  const isLoading = loadingP || loadingA || loadingC || loadingS || loadingB;

  const client = useMemo(() => clients.find((c) => c.name === clientName), [clients, clientName]);

  // All placements for this client (unfiltered by date)
  const allClientPlacements = useMemo(
    () => placements.filter((p) => p.client_name === clientName).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [placements, clientName]
  );

  // Date-filtered placements
  const clientPlacements = useMemo(() => {
    return allClientPlacements.filter((p) => {
      if (!p.date) return false;
      if (fromDate && p.date < fromDate) return false;
      if (toDate && p.date > toDate) return false;
      return true;
    });
  }, [allClientPlacements, fromDate, toDate]);

  // All awards for this client
  const clientAwards = useMemo(
    () => awards.filter((a) => a.client_name === clientName),
    [awards, clientName]
  );

  // Date-filtered awards
  const filteredAwards = useMemo(() => {
    return clientAwards.filter((a) => {
      const d = a.submitted_date || a.due_date || "";
      if (!d) return !fromDate && !toDate;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [clientAwards, fromDate, toDate]);

  // Coverage type breakdown
  const typeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    clientPlacements.forEach((p) => {
      const type = p.type || "Other";
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count, pct: Math.round((count / clientPlacements.length) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [clientPlacements]);

  // Top outlets
  const topOutlets = useMemo(() => {
    const counts = new Map<string, { count: number; reach: number }>();
    clientPlacements.forEach((p) => {
      const outlet = p.outlet || "Unknown";
      const existing = counts.get(outlet) || { count: 0, reach: 0 };
      counts.set(outlet, { count: existing.count + 1, reach: existing.reach + p.readership_viewership });
    });
    return Array.from(counts.entries())
      .map(([outlet, { count, reach }]) => ({ outlet, count, reach }))
      .sort((a, b) => b.reach - a.reach)
      .slice(0, 8);
  }, [clientPlacements]);

  // Monthly reach trend within the date range
  const monthlyReach = useMemo(() => {
    const months: { label: string; reach: number; count: number }[] = [];
    const now = new Date();
    const endDate = toDate ? new Date(toDate) : now;
    const startDate = fromDate ? new Date(fromDate) : new Date(now.getFullYear(), now.getMonth() - 11, 1);
    
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cursor <= endDate) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      const label = cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const monthPlacements = clientPlacements.filter((p) => p.date?.startsWith(key));
      months.push({
        label,
        reach: monthPlacements.reduce((sum, p) => sum + p.readership_viewership, 0),
        count: monthPlacements.length,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }, [clientPlacements, fromDate, toDate]);

  // Client samples & briefings with conversion matching
  const CONVERSION_WINDOW = 90 * 86_400_000;

  const clientSampleConversions = useMemo(() => {
    const clientSamples = samples.filter((s) => s.client?.trim().toLowerCase() === clientName.trim().toLowerCase());
    return clientSamples.map((s) => {
      const reporter = s.reporter_name?.trim().toLowerCase() || "";
      const itemDate = s.date_shipped || s.date_requested;
      if (!itemDate || !reporter) return { type: "sample" as const, id: s.id, client: s.client, reporter: s.reporter_name, outlet: s.outlet, date: itemDate || "", converted: false, daysToCoverage: undefined };
      const t = new Date(itemDate).getTime();
      const match = clientPlacements.find((p) => p.date && p.reporter_name?.trim().toLowerCase() === reporter && new Date(p.date).getTime() >= t && new Date(p.date).getTime() <= t + CONVERSION_WINDOW);
      return { type: "sample" as const, id: s.id, client: s.client, reporter: s.reporter_name, outlet: s.outlet || match?.outlet || "", date: itemDate, converted: !!match, placement: match, daysToCoverage: match ? Math.round((new Date(match.date).getTime() - t) / 86_400_000) : undefined };
    });
  }, [samples, clientName, clientPlacements]);

  const clientBriefingConversions = useMemo(() => {
    const clientBriefings = briefings.filter((b) => b.client?.trim().toLowerCase() === clientName.trim().toLowerCase());
    return clientBriefings.map((b) => {
      const reporter = b.reporter_name?.trim().toLowerCase() || "";
      const itemDate = b.date_met;
      if (!itemDate || !reporter) return { type: "briefing" as const, id: b.id, client: b.client, reporter: b.reporter_name, outlet: b.outlet, date: itemDate || "", converted: false, daysToCoverage: undefined };
      const t = new Date(itemDate).getTime();
      const match = clientPlacements.find((p) => p.date && p.reporter_name?.trim().toLowerCase() === reporter && new Date(p.date).getTime() >= t && new Date(p.date).getTime() <= t + CONVERSION_WINDOW);
      return { type: "briefing" as const, id: b.id, client: b.client, reporter: b.reporter_name, outlet: b.outlet || match?.outlet || "", date: itemDate, converted: !!match, placement: match, daysToCoverage: match ? Math.round((new Date(match.date).getTime() - t) / 86_400_000) : undefined };
    });
  }, [briefings, clientName, clientPlacements]);

  const wonAwards = filteredAwards.filter((a) => a.status === "Won");

  const { summary, isGenerating, generate } = useAICoverageSummary();

  // Top reporters for AI summary
  const topReportersForAI = useMemo(() => {
    const reporterMap = new Map<string, number>();
    [...clientSampleConversions, ...clientBriefingConversions]
      .filter((c) => c.converted && c.reporter)
      .forEach((c) => reporterMap.set(c.reporter!, (reporterMap.get(c.reporter!) || 0) + 1));
    return [...reporterMap.entries()]
      .map(([name, conversions]) => ({ name, conversions }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);
  }, [clientSampleConversions, clientBriefingConversions]);

  const handleGenerateSummary = useCallback(() => {
    const samplesConverted = clientSampleConversions.filter((c) => c.converted).length;
    const briefingsConverted = clientBriefingConversions.filter((c) => c.converted).length;

    generate(clientName, periodLabel, {
      totalPlacements: clientPlacements.length,
      totalReach: clientPlacements.reduce((s, p) => s + p.readership_viewership, 0),
      totalAdValue: clientPlacements.reduce((s, p) => s + p.ad_value, 0),
      awardWins: wonAwards.length,
      ytdPlacements: clientPlacements.filter((p) => p.date?.startsWith(String(new Date().getFullYear()))).length,
      typeBreakdown,
      topOutlets,
      samplesSent: clientSampleConversions.length,
      samplesConverted,
      sampleConversionRate: clientSampleConversions.length > 0 ? Math.round((samplesConverted / clientSampleConversions.length) * 100) : 0,
      briefingsHeld: clientBriefingConversions.length,
      briefingsConverted,
      briefingConversionRate: clientBriefingConversions.length > 0 ? Math.round((briefingsConverted / clientBriefingConversions.length) * 100) : 0,
      topReporters: topReportersForAI,
      monthlyReach,
    });
  }, [clientName, periodLabel, clientPlacements, wonAwards, typeBreakdown, topOutlets, clientSampleConversions, clientBriefingConversions, topReportersForAI, monthlyReach, generate]);

  const handleDateChange = (from: string, to: string) => {
    const next = new URLSearchParams(params);
    if (from) next.set("from", from);
    else next.delete("from");
    if (to) next.set("to", to);
    else next.delete("to");
    setParams(next, { replace: true });
  };

  // Derive date range from data if not set
  const dataDateRange = useMemo(() => {
    const dates = allClientPlacements.map((p) => p.date).filter(Boolean).sort();
    return { earliest: dates[0] || "", latest: dates[dates.length - 1] || "" };
  }, [allClientPlacements]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground font-mono">Preparing report…</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Client not found.</p>
      </div>
    );
  }

  const periodLabel = fromDate || toDate
    ? `${fromDate || dataDateRange.earliest} — ${toDate || dataDateRange.latest}`
    : "All-Time";

  return (
    <div className="min-h-screen bg-background">
      <ReportHero clientName={client.name} teamName={client.team_name} periodLabel={periodLabel} />

      <div className="mx-auto max-w-5xl px-6 py-12 space-y-16">
        <ReportDateRange
          fromDate={fromDate}
          toDate={toDate}
          earliest={dataDateRange.earliest}
          latest={dataDateRange.latest}
          onChange={handleDateChange}
        />

        <ReportKpis
          totalPlacements={clientPlacements.length}
          totalReach={clientPlacements.reduce((s, p) => s + p.readership_viewership, 0)}
          totalAdValue={clientPlacements.reduce((s, p) => s + p.ad_value, 0)}
          awardWins={wonAwards.length}
          ytdPlacements={clientPlacements.filter((p) => p.date?.startsWith(String(new Date().getFullYear()))).length}
          ytdReach={clientPlacements.filter((p) => p.date?.startsWith(String(new Date().getFullYear()))).reduce((s, p) => s + p.readership_viewership, 0)}
        />

        <ReportHighlights placements={clientPlacements.slice(0, 10)} />

        <ReportCoverageBreakdown
          typeBreakdown={typeBreakdown}
          topOutlets={topOutlets}
          monthlyReach={monthlyReach}
        />

        <ReportOutreachSummary
          sampleConversions={clientSampleConversions}
          briefingConversions={clientBriefingConversions}
        />

        <ReportTopReporters conversions={[...clientSampleConversions, ...clientBriefingConversions]} />

        <ReportOutletMomentum placements={clientPlacements} />

        <ReportAwards wonAwards={wonAwards} allAwards={filteredAwards} />

        <ReportFooter />
      </div>
    </div>
  );
}
