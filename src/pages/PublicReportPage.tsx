import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { usePublicReport, verifyReportPassword, type CurationState } from "@/hooks/useClientReports";
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
import { ReportAISummary } from "@/components/report/ReportAISummary";
import { ReportEditProvider } from "@/contexts/ReportEditContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import uproarLogo from "@/assets/uproar-moburst-logo.png";

export default function PublicReportPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: report, isLoading: loadingReport } = usePublicReport(slug || "");
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  if (loadingReport) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground font-mono">Loading report…</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Report Not Found</h1>
          <p className="mt-2 text-muted-foreground">This report may have been removed or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  // Password gate
  if (report.password_hash && !authenticated) {
    const handleVerify = async () => {
      setVerifying(true);
      setError("");
      try {
        const match = await verifyReportPassword(password, report.password_hash!);
        if (match) {
          setAuthenticated(true);
        } else {
          setError("Incorrect password");
        }
      } catch {
        setError("Verification failed. Please try again.");
      } finally {
        setVerifying(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm mx-auto px-6">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="rounded-xl bg-foreground/90 px-6 py-3">
                <img src={uproarLogo} alt="Uproar PR by Moburst" className="h-6 object-contain" />
              </div>
            </div>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {report.title || `${report.client_name} Report`}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the password to view this report
            </p>
          </div>

          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button
              onClick={handleVerify}
              disabled={verifying || !password}
              className="w-full"
              variant="brand"
            >
              {verifying ? "Verifying…" : "View Report"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReportEditProvider>
      <PublicReportContent report={report} />
    </ReportEditProvider>
  );
}

function PublicReportContent({ report }: { report: NonNullable<ReturnType<typeof usePublicReport>["data"]> }) {
  const curation = report.curation_state as CurationState;
  const clientName = report.client_name;
  const fromDate = report.from_date || "";
  const toDate = report.to_date || "";

  const { data: placements = [] } = usePlacements();
  const { data: awards = [] } = useAwards();
  const { data: clients = [] } = useClients();
  const { data: samples = [] } = useSamples();
  const { data: briefings = [] } = useBriefings();

  const client = useMemo(() => clients.find((c) => c.name === clientName), [clients, clientName]);

  const clientPlacements = useMemo(() => {
    return placements
      .filter((p) => p.client_name === clientName)
      .filter((p) => {
        if (!p.date) return false;
        if (fromDate && p.date < fromDate) return false;
        if (toDate && p.date > toDate) return false;
        return true;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [placements, clientName, fromDate, toDate]);

  const clientAwards = useMemo(() => awards.filter((a) => a.client_name === clientName), [awards, clientName]);
  const filteredAwards = useMemo(() => {
    return clientAwards.filter((a) => {
      const d = a.submitted_date || a.due_date || "";
      if (!d) return !fromDate && !toDate;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [clientAwards, fromDate, toDate]);
  const wonAwards = filteredAwards.filter((a) => a.status === "Won");

  const hiddenSet = new Set(curation.hiddenSections || []);

  const periodLabel = useMemo(() => {
    return fromDate || toDate ? `${fromDate} — ${toDate}` : "All-Time";
  }, [fromDate, toDate]);

  const typeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    clientPlacements.forEach((p) => counts.set(p.type || "Other", (counts.get(p.type || "Other") || 0) + 1));
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
      const mp = clientPlacements.filter((p) => p.date?.startsWith(key));
      months.push({ label, reach: mp.reduce((s, p) => s + p.readership_viewership, 0), count: mp.length });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }, [clientPlacements, fromDate, toDate]);

  const CONVERSION_WINDOW = 90 * 86_400_000;
  const clientSampleConversions = useMemo(() => {
    return samples
      .filter((s) => s.client?.trim().toLowerCase() === clientName.trim().toLowerCase())
      .map((s) => {
        const reporter = s.reporter_name?.trim().toLowerCase() || "";
        const itemDate = s.date_shipped || s.date_requested;
        if (!itemDate || !reporter) return { type: "sample" as const, id: s.id, client: s.client, reporter: s.reporter_name, outlet: s.outlet, date: itemDate || "", converted: false, daysToCoverage: undefined };
        const t = new Date(itemDate).getTime();
        const match = clientPlacements.find((p) => p.date && p.reporter_name?.trim().toLowerCase() === reporter && new Date(p.date).getTime() >= t && new Date(p.date).getTime() <= t + CONVERSION_WINDOW);
        return { type: "sample" as const, id: s.id, client: s.client, reporter: s.reporter_name, outlet: s.outlet || match?.outlet || "", date: itemDate, converted: !!match, placement: match, daysToCoverage: match ? Math.round((new Date(match.date).getTime() - t) / 86_400_000) : undefined };
      });
  }, [samples, clientName, clientPlacements]);

  const clientBriefingConversions = useMemo(() => {
    return briefings
      .filter((b) => b.client?.trim().toLowerCase() === clientName.trim().toLowerCase())
      .map((b) => {
        const reporter = b.reporter_name?.trim().toLowerCase() || "";
        const itemDate = b.date_met;
        if (!itemDate || !reporter) return { type: "briefing" as const, id: b.id, client: b.client, reporter: b.reporter_name, outlet: b.outlet, date: itemDate || "", converted: false, daysToCoverage: undefined };
        const t = new Date(itemDate).getTime();
        const match = clientPlacements.find((p) => p.date && p.reporter_name?.trim().toLowerCase() === reporter && new Date(p.date).getTime() >= t && new Date(p.date).getTime() <= t + CONVERSION_WINDOW);
        return { type: "briefing" as const, id: b.id, client: b.client, reporter: b.reporter_name, outlet: b.outlet || match?.outlet || "", date: itemDate, converted: !!match, placement: match, daysToCoverage: match ? Math.round((new Date(match.date).getTime() - t) / 86_400_000) : undefined };
      });
  }, [briefings, clientName, clientPlacements]);

  const sampleConversionRate = clientSampleConversions.length > 0
    ? Math.round((clientSampleConversions.filter((c) => c.converted).length / clientSampleConversions.length) * 100)
    : 0;
  const briefingConversionRate = clientBriefingConversions.length > 0
    ? Math.round((clientBriefingConversions.filter((c) => c.converted).length / clientBriefingConversions.length) * 100)
    : 0;

  const aiSummary = curation.textOverrides?.["ai-summary-text"] || curation.aiSummary || "";

  function SectionDivider() {
    return <div className="mb-12 h-px w-full gradient-brand opacity-20" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ReportHero clientName={clientName} teamName={client?.team_name || ""} periodLabel={periodLabel} />

      <div className="mx-auto max-w-5xl px-6 py-12 space-y-12">
        {!hiddenSet.has("exec-summary") && (
          <>
            <ReportExecSummary placements={clientPlacements} awardWins={wonAwards.length} periodLabel={periodLabel} />
          </>
        )}

        {!hiddenSet.has("kpis") && (
          <>
            <SectionDivider />
            <ReportKpis
              totalPlacements={clientPlacements.length}
              totalReach={clientPlacements.reduce((s, p) => s + p.readership_viewership, 0)}
              totalAdValue={clientPlacements.reduce((s, p) => s + p.ad_value, 0)}
              awardWins={wonAwards.length}
              ytdPlacements={clientPlacements.filter((p) => p.date?.startsWith(String(new Date().getFullYear()))).length}
              ytdReach={clientPlacements.filter((p) => p.date?.startsWith(String(new Date().getFullYear()))).reduce((s, p) => s + p.readership_viewership, 0)}
            />
          </>
        )}

        {!hiddenSet.has("ai-summary") && aiSummary && (
          <>
            <SectionDivider />
            <ReportAISummary summary={aiSummary} isGenerating={false} onGenerate={() => {}} />
          </>
        )}

        {!hiddenSet.has("insights") && (
          <>
            <SectionDivider />
            <ReportInsights
              placements={clientPlacements}
              awardWins={wonAwards.length}
              sampleConversionRate={sampleConversionRate}
              briefingConversionRate={briefingConversionRate}
            />
          </>
        )}

        {!hiddenSet.has("timeline") && (
          <>
            <SectionDivider />
            <ReportTimeline placements={clientPlacements} />
          </>
        )}

        {!hiddenSet.has("highlights") && (
          <>
            <SectionDivider />
            <ReportHighlights placements={clientPlacements} />
          </>
        )}

        {!hiddenSet.has("coverage-breakdown") && (
          <>
            <SectionDivider />
            <ReportCoverageBreakdown typeBreakdown={typeBreakdown} topOutlets={topOutlets} monthlyReach={monthlyReach} />
          </>
        )}

        {!hiddenSet.has("outreach") && (
          <>
            <SectionDivider />
            <ReportOutreachSummary sampleConversions={clientSampleConversions} briefingConversions={clientBriefingConversions} />
          </>
        )}

        {!hiddenSet.has("top-reporters") && (
          <>
            <SectionDivider />
            <ReportTopReporters conversions={[...clientSampleConversions, ...clientBriefingConversions]} />
          </>
        )}

        {!hiddenSet.has("outlet-momentum") && (
          <>
            <SectionDivider />
            <ReportOutletMomentum placements={clientPlacements} fromDate={fromDate} toDate={toDate} />
          </>
        )}

        {!hiddenSet.has("awards") && (
          <>
            <SectionDivider />
            <ReportAwards wonAwards={wonAwards} allAwards={filteredAwards} />
          </>
        )}

        <ReportFooter />
      </div>
    </div>
  );
}
