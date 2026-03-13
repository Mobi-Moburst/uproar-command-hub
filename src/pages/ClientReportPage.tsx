import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { usePlacements } from "@/hooks/usePlacements";
import { useAwards } from "@/hooks/useAwards";
import { useClients } from "@/hooks/useClients";
import { ReportHero } from "@/components/report/ReportHero";
import { ReportKpis } from "@/components/report/ReportKpis";
import { ReportHighlights } from "@/components/report/ReportHighlights";
import { ReportCoverageBreakdown } from "@/components/report/ReportCoverageBreakdown";
import { ReportAwards } from "@/components/report/ReportAwards";
import { ReportFooter } from "@/components/report/ReportFooter";
import type { MediaPlacement, AwardSubmission } from "@/data/types";

export default function ClientReportPage() {
  const [params] = useSearchParams();
  const clientName = params.get("client") || "A. Duie Pyle";

  const { data: placements = [], isLoading: loadingP } = usePlacements();
  const { data: awards = [], isLoading: loadingA } = useAwards();
  const { data: clients = [], isLoading: loadingC } = useClients();

  const isLoading = loadingP || loadingA || loadingC;

  const client = useMemo(() => clients.find((c) => c.name === clientName), [clients, clientName]);

  const clientPlacements = useMemo(
    () => placements.filter((p) => p.client_name === clientName).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
    [placements, clientName]
  );

  const clientAwards = useMemo(
    () => awards.filter((a) => a.client_name === clientName),
    [awards, clientName]
  );

  // Current year stats
  const currentYear = new Date().getFullYear();
  const currentYearPlacements = clientPlacements.filter((p) => p.date?.startsWith(String(currentYear)));

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

  // Monthly reach trend (last 12 months)
  const monthlyReach = useMemo(() => {
    const months: { label: string; reach: number; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const monthPlacements = clientPlacements.filter((p) => p.date?.startsWith(key));
      months.push({
        label,
        reach: monthPlacements.reduce((sum, p) => sum + p.readership_viewership, 0),
        count: monthPlacements.length,
      });
    }
    return months;
  }, [clientPlacements]);

  const wonAwards = clientAwards.filter((a) => a.status === "Won");

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
    <div className="min-h-screen bg-background">
      <ReportHero clientName={client.name} teamName={client.team_name} />

      <div className="mx-auto max-w-5xl px-6 py-12 space-y-16">
        <ReportKpis
          totalPlacements={client.total_placements}
          totalReach={client.total_reach}
          totalAdValue={client.total_ad_value}
          awardWins={client.total_award_wins}
          ytdPlacements={currentYearPlacements.length}
          ytdReach={currentYearPlacements.reduce((s, p) => s + p.readership_viewership, 0)}
        />

        <ReportHighlights placements={clientPlacements.slice(0, 10)} />

        <ReportCoverageBreakdown
          typeBreakdown={typeBreakdown}
          topOutlets={topOutlets}
          monthlyReach={monthlyReach}
        />

        <ReportAwards wonAwards={wonAwards} allAwards={clientAwards} />

        <ReportFooter />
      </div>
    </div>
  );
}
