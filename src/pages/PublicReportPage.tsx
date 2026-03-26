import { useState } from "react";
import { useParams } from "react-router-dom";
import { usePublicReport, verifyReportPassword, type CurationState, type ReportSnapshot } from "@/hooks/useClientReports";
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
import { ReportEditProvider, useReportEdit } from "@/contexts/ReportEditContext";
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
              <img src={uproarLogo} alt="Uproar PR by Moburst" className="h-8 object-contain" />
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
  const snapshot = curation.snapshot as ReportSnapshot | undefined;
  const hiddenSet = new Set(curation.hiddenSections || []);
  const { loadCurationState } = useReportEdit();

  // Load hidden sections into context so child EditableSection components respect them
  useState(() => {
    loadCurationState(curation);
  });

  // If no snapshot exists (legacy reports), show a message
  if (!snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">Report Needs Re-publishing</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            This report was created before data snapshotting was enabled. Please ask the report owner to re-save and publish it.
          </p>
        </div>
      </div>
    );
  }

  const aiSummary = curation.textOverrides?.["ai-summary-text"] || curation.aiSummary || "";
  const placements = snapshot.placements as any[];
  const fromDate = report.from_date || "";
  const toDate = report.to_date || "";

  function SectionDivider() {
    return <div className="mb-12 h-px w-full gradient-brand opacity-20" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ReportHero clientName={snapshot.clientName} teamName={snapshot.teamName} periodLabel={snapshot.periodLabel} />

      <div className="mx-auto max-w-5xl px-6 py-12 space-y-12">
        {!hiddenSet.has("exec-summary") && (
          <ReportExecSummary placements={placements} awardWins={snapshot.awardWins} periodLabel={snapshot.periodLabel} />
        )}

        {!hiddenSet.has("kpis") && (
          <>
            <SectionDivider />
            <ReportKpis
              totalPlacements={snapshot.totalPlacements}
              totalReach={snapshot.totalReach}
              totalAdValue={snapshot.totalAdValue}
              awardWins={snapshot.awardWins}
              ytdPlacements={snapshot.ytdPlacements}
              ytdReach={snapshot.ytdReach}
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
              placements={placements}
              awardWins={snapshot.awardWins}
              sampleConversionRate={snapshot.sampleConversionRate}
              briefingConversionRate={snapshot.briefingConversionRate}
            />
          </>
        )}

        {!hiddenSet.has("timeline") && (
          <>
            <SectionDivider />
            <ReportTimeline placements={placements} />
          </>
        )}

        {!hiddenSet.has("highlights") && (
          <>
            <SectionDivider />
            <ReportHighlights placements={placements} />
          </>
        )}

        {!hiddenSet.has("coverage-breakdown") && (
          <>
            <SectionDivider />
            <ReportCoverageBreakdown
              typeBreakdown={snapshot.typeBreakdown}
              topOutlets={snapshot.topOutlets}
              monthlyReach={snapshot.monthlyReach}
            />
          </>
        )}

        {!hiddenSet.has("outreach") && (
          <>
            <SectionDivider />
            <ReportOutreachSummary
              sampleConversions={snapshot.sampleConversions as any}
              briefingConversions={snapshot.briefingConversions as any}
            />
          </>
        )}

        {!hiddenSet.has("top-reporters") && (
          <>
            <SectionDivider />
            <ReportTopReporters conversions={[...snapshot.sampleConversions, ...snapshot.briefingConversions] as any} />
          </>
        )}

        {!hiddenSet.has("outlet-momentum") && (
          <>
            <SectionDivider />
            <ReportOutletMomentum placements={placements} fromDate={fromDate} toDate={toDate} />
          </>
        )}

        {!hiddenSet.has("awards") && (
          <>
            <SectionDivider />
            <ReportAwards wonAwards={snapshot.wonAwards as any} allAwards={snapshot.allFilteredAwards as any} />
          </>
        )}

        <ReportFooter />
      </div>
    </div>
  );
}
