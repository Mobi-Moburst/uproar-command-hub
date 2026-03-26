import { useMemo, useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePlacements } from "@/hooks/usePlacements";
import { useAwards } from "@/hooks/useAwards";
import { useClients } from "@/hooks/useClients";
import { useSamples } from "@/hooks/useSamples";
import { useBriefings } from "@/hooks/useBriefings";
import { ReportHero } from "@/components/report/ReportHero";
import { ReportExecSummary } from "@/components/report/ReportExecSummary";
import { ReportKpis } from "@/components/report/ReportKpis";
import { ReportHighlights } from "@/components/report/ReportHighlights";
import { ReportCoverageBreakdown } from "@/components/report/ReportCoverageBreakdown";
import { ReportTimeline } from "@/components/report/ReportTimeline";
import { ReportInsights } from "@/components/report/ReportInsights";
import { ReportAwards } from "@/components/report/ReportAwards";
import { ReportOutreachSummary } from "@/components/report/ReportOutreachSummary";
import { ReportTopReporters } from "@/components/report/ReportTopReporters";
import { ReportOutletMomentum } from "@/components/report/ReportOutletMomentum";
import { ReportFooter } from "@/components/report/ReportFooter";
import { ReportDateRange } from "@/components/report/ReportDateRange";
import { ReportAISummary } from "@/components/report/ReportAISummary";
import { ReportEditProvider, useReportEdit } from "@/contexts/ReportEditContext";
import { EditableSection, ReportEditToolbar } from "@/components/report/ReportEditControls";
import { ReportSaveControls } from "@/components/report/ReportSaveControls";
import { useAICoverageSummary } from "@/hooks/useAICoverageSummary";
import { useClientReports, type ClientReport } from "@/hooks/useClientReports";
import type { MediaPlacement, AwardSubmission, Sample, Briefing } from "@/data/types";

function SectionDivider() {
  return <div className="mb-12 h-px w-full gradient-brand opacity-20 print:opacity-40" />;
}

interface ClientReportPageProps {
  embeddedClientName?: string;
  embeddedFromDate?: string;
  embeddedToDate?: string;
  embeddedReportId?: string;
}

export default function ClientReportPage(props: ClientReportPageProps) {
  return (
    <ReportEditProvider>
      <ClientReportContent {...props} />
    </ReportEditProvider>
  );
}

function ClientReportContent({
  embeddedClientName,
  embeddedFromDate,
  embeddedToDate,
  embeddedReportId,
}: ClientReportPageProps) {
  const [params, setParams] = useSearchParams();
  const clientName = embeddedClientName || params.get("client") || "A. Duie Pyle";
  const fromDate = embeddedFromDate || params.get("from") || "";
  const toDate = embeddedToDate || params.get("to") || "";

  const { data: placements = [], isLoading: loadingP } = usePlacements();
  const { data: awards = [], isLoading: loadingA } = useAwards();
  const { data: clients = [], isLoading: loadingC } = useClients();
  const { data: samples = [], isLoading: loadingS } = useSamples();
  const { data: briefings = [], isLoading: loadingB } = useBriefings();

  const isLoading = loadingP || loadingA || loadingC || loadingS || loadingB;

  const client = useMemo(() => clients.find((c) => c.name === clientName), [clients, clientName]);

  const allClientPlacements = useMemo(
    () => placements.filter((p) => p.client_name === clientName).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [placements, clientName]
  );

  const clientPlacements = useMemo(() => {
    return allClientPlacements.filter((p) => {
      if (!p.date) return false;
      if (fromDate && p.date < fromDate) return false;
      if (toDate && p.date > toDate) return false;
      return true;
    });
  }, [allClientPlacements, fromDate, toDate]);

  const clientAwards = useMemo(
    () => awards.filter((a) => a.client_name === clientName),
    [awards, clientName]
  );

  const filteredAwards = useMemo(() => {
    return clientAwards.filter((a) => {
      const d = a.submitted_date || a.due_date || "";
      if (!d) return !fromDate && !toDate;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [clientAwards, fromDate, toDate]);

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

  const { getCurationState, loadCurationState } = useReportEdit();
  const { summary, isGenerating, generate } = useAICoverageSummary();
  const { data: savedReports = [] } = useClientReports(clientName);
  const [activeReport, setActiveReport] = useState<ClientReport | null>(null);

  // Load draft if navigating with report ID
  const reportId = embeddedReportId || params.get("reportId");
  const matchedReport = savedReports.find((r) => r.id === reportId);
  if (matchedReport && !activeReport) {
    setActiveReport(matchedReport);
    loadCurationState(matchedReport.curation_state);
  }



  const handleGetCuration = useCallback(() => {
    const curation = getCurationState(summary);
    const snapshot = {
      clientName,
      teamName: client?.team_name || "",
      periodLabel,
      totalPlacements: clientPlacements.length,
      totalReach: clientPlacements.reduce((s, p) => s + p.readership_viewership, 0),
      totalAdValue: clientPlacements.reduce((s, p) => s + p.ad_value, 0),
      awardWins: wonAwards.length,
      ytdPlacements: clientPlacements.filter((p) => p.date?.startsWith(String(new Date().getFullYear()))).length,
      ytdReach: clientPlacements.filter((p) => p.date?.startsWith(String(new Date().getFullYear()))).reduce((s, p) => s + p.readership_viewership, 0),
      typeBreakdown,
      topOutlets,
      monthlyReach,
      highlights: clientPlacements.slice(0, 20).map((p) => ({
        id: p.id, headline: p.headline, outlet: p.outlet, date: p.date || "", type: p.type, reach: p.readership_viewership, link: p.link,
      })),
      sampleConversions: clientSampleConversions.map((c) => ({
        type: "sample" as const, id: c.id, client: c.client || "", reporter: c.reporter || "", outlet: c.outlet || "", date: c.date, converted: c.converted, daysToCoverage: c.daysToCoverage,
      })),
      briefingConversions: clientBriefingConversions.map((c) => ({
        type: "briefing" as const, id: c.id, client: c.client || "", reporter: c.reporter || "", outlet: c.outlet || "", date: c.date, converted: c.converted, daysToCoverage: c.daysToCoverage,
      })),
      sampleConversionRate,
      briefingConversionRate,
      wonAwards: wonAwards.map((a) => ({
        id: a.id, award_name: a.award_name, submission_title: a.submission_title, status: a.status, submitted_date: a.submitted_date, due_date: a.due_date, client_name: a.client_name,
      })),
      allFilteredAwards: filteredAwards.map((a) => ({
        id: a.id, award_name: a.award_name, submission_title: a.submission_title, status: a.status, submitted_date: a.submitted_date, due_date: a.due_date, client_name: a.client_name,
      })),
      placements: clientPlacements.map((p) => ({
        id: p.id, headline: p.headline, outlet: p.outlet, date: p.date || "", type: p.type, readership_viewership: p.readership_viewership, ad_value: p.ad_value, reporter_name: p.reporter_name, link: p.link, topic_product: p.topic_product, secured_by: p.secured_by,
      })),
    };
    return { ...curation, snapshot };
  }, [getCurationState, summary, clientName, client, periodLabel, clientPlacements, wonAwards, filteredAwards, typeBreakdown, topOutlets, monthlyReach, clientSampleConversions, clientBriefingConversions, sampleConversionRate, briefingConversionRate]);

  const dataDateRange = useMemo(() => {
    const dates = allClientPlacements.map((p) => p.date).filter(Boolean).sort();
    return { earliest: dates[0] || "", latest: dates[dates.length - 1] || "" };
  }, [allClientPlacements]);

  const periodLabel = useMemo(() => {
    return fromDate || toDate
      ? `${fromDate || dataDateRange.earliest} — ${toDate || dataDateRange.latest}`
      : "All-Time";
  }, [fromDate, toDate, dataDateRange]);

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

  const sampleConversionRate = clientSampleConversions.length > 0
    ? Math.round((clientSampleConversions.filter((c) => c.converted).length / clientSampleConversions.length) * 100)
    : 0;
  const briefingConversionRate = clientBriefingConversions.length > 0
    ? Math.round((clientBriefingConversions.filter((c) => c.converted).length / clientBriefingConversions.length) * 100)
    : 0;

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
      sampleConversionRate,
      briefingsHeld: clientBriefingConversions.length,
      briefingsConverted,
      briefingConversionRate,
      topReporters: topReportersForAI,
      monthlyReach,
    });
  }, [clientName, periodLabel, clientPlacements, wonAwards, typeBreakdown, topOutlets, clientSampleConversions, clientBriefingConversions, topReportersForAI, monthlyReach, generate, sampleConversionRate, briefingConversionRate]);

  const handleDateChange = (from: string, to: string) => {
    const next = new URLSearchParams(params);
    if (from) next.set("from", from);
    else next.delete("from");
    if (to) next.set("to", to);
    else next.delete("to");
    setParams(next, { replace: true });
  };

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

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <ReportHero clientName={client.name} teamName={client.team_name} periodLabel={periodLabel} />

      <div className="mx-auto max-w-5xl px-6 py-12 space-y-12 print:space-y-8 print:px-4">
        {/* Controls — hidden in print */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-4">
          <ReportDateRange
            fromDate={fromDate}
            toDate={toDate}
            earliest={dataDateRange.earliest}
            latest={dataDateRange.latest}
            onChange={handleDateChange}
          />
          <div className="flex items-center gap-3">
            <ReportEditToolbar />
            <ReportSaveControls
              clientName={clientName}
              fromDate={fromDate}
              toDate={toDate}
              getCurationState={handleGetCuration}
              existingReport={activeReport}
              onSaved={(r) => setActiveReport(r)}
            />
          </div>
        </div>

        <EditableSection id="exec-summary">
          <ReportExecSummary
            placements={clientPlacements}
            awardWins={wonAwards.length}
            periodLabel={periodLabel}
          />
        </EditableSection>

        <EditableSection id="kpis">
          <SectionDivider />
          <ReportKpis
            totalPlacements={clientPlacements.length}
            totalReach={clientPlacements.reduce((s, p) => s + p.readership_viewership, 0)}
            totalAdValue={clientPlacements.reduce((s, p) => s + p.ad_value, 0)}
            awardWins={wonAwards.length}
            ytdPlacements={clientPlacements.filter((p) => p.date?.startsWith(String(new Date().getFullYear()))).length}
            ytdReach={clientPlacements.filter((p) => p.date?.startsWith(String(new Date().getFullYear()))).reduce((s, p) => s + p.readership_viewership, 0)}
          />
        </EditableSection>

        <EditableSection id="ai-summary">
          <SectionDivider />
          <div className={!summary ? "print:hidden" : ""}>
            <ReportAISummary
              summary={summary}
              isGenerating={isGenerating}
              onGenerate={handleGenerateSummary}
            />
          </div>
        </EditableSection>

        <EditableSection id="insights">
          <SectionDivider />
          <ReportInsights
            placements={clientPlacements}
            awardWins={wonAwards.length}
            sampleConversionRate={sampleConversionRate}
            briefingConversionRate={briefingConversionRate}
          />
        </EditableSection>

        <EditableSection id="timeline">
          <SectionDivider />
          <ReportTimeline placements={clientPlacements} />
        </EditableSection>

        <EditableSection id="highlights">
          <SectionDivider />
          <ReportHighlights placements={clientPlacements} />
        </EditableSection>

        <EditableSection id="coverage-breakdown">
          <SectionDivider />
          <ReportCoverageBreakdown
            typeBreakdown={typeBreakdown}
            topOutlets={topOutlets}
            monthlyReach={monthlyReach}
          />
        </EditableSection>

        <EditableSection id="outreach">
          <SectionDivider />
          <ReportOutreachSummary
            sampleConversions={clientSampleConversions}
            briefingConversions={clientBriefingConversions}
          />
        </EditableSection>

        <EditableSection id="top-reporters">
          <SectionDivider />
          <ReportTopReporters conversions={[...clientSampleConversions, ...clientBriefingConversions]} />
        </EditableSection>

        <EditableSection id="outlet-momentum">
          <SectionDivider />
          <ReportOutletMomentum placements={clientPlacements} fromDate={fromDate} toDate={toDate} />
        </EditableSection>

        <EditableSection id="awards">
          <SectionDivider />
          <ReportAwards wonAwards={wonAwards} allAwards={filteredAwards} />
        </EditableSection>

        <ReportFooter />
      </div>
    </div>
  );
}
