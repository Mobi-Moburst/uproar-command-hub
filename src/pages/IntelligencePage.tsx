import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { KpiCardSkeleton } from "@/components/KpiCardSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversionFunnel } from "@/components/intelligence/ConversionFunnel";
import { ReporterAffinityMatrix } from "@/components/intelligence/ReporterAffinityMatrix";
import { OutletMomentum } from "@/components/intelligence/OutletMomentum";
import { useCoverageIntelligence } from "@/hooks/useCoverageIntelligence";

export default function IntelligencePage() {
  const {
    sampleConversionRate,
    briefingConversionRate,
    topConvertingReporter,
    conversions,
    reporterAffinities,
    outletMomentum,
    isLoading,
  } = useCoverageIntelligence();

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Coverage Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            Cross-cutting analysis — conversion funnels, reporter affinity, outlet momentum
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Sample Conversion Rate"
                value={`${Math.round(sampleConversionRate * 100)}%`}
                detail="90-day window"
              />
              <KpiCard
                label="Briefing Conversion Rate"
                value={`${Math.round(briefingConversionRate * 100)}%`}
                detail="90-day window"
              />
              <KpiCard
                label="Top Converting Reporter"
                value={topConvertingReporter}
                detail="By total conversions"
              />
            </>
          )}
        </div>

        {/* Coming Soon — HubSpot-powered metrics */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            Pitch Intelligence
            <span className="inline-flex items-center rounded-full bg-status-drafting/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-status-drafting">
              Coming Soon
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="relative rounded-lg border border-dashed border-border bg-card/50 p-6 opacity-60">
              <p className="min-h-[2.5rem] text-sm font-medium leading-snug text-muted-foreground">Pitch → Response Rate</p>
              <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-muted-foreground/40">—</p>
              <p className="mt-1 text-sm font-mono text-muted-foreground/40">HubSpot integration</p>
            </div>
            <div className="relative rounded-lg border border-dashed border-border bg-card/50 p-6 opacity-60">
              <p className="min-h-[2.5rem] text-sm font-medium leading-snug text-muted-foreground">Pitch → Coverage Rate</p>
              <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-muted-foreground/40">—</p>
              <p className="mt-1 text-sm font-mono text-muted-foreground/40">Full funnel tracking</p>
            </div>
            <div className="relative rounded-lg border border-dashed border-border bg-card/50 p-6 opacity-60">
              <p className="min-h-[2.5rem] text-sm font-medium leading-snug text-muted-foreground">Avg. Open Rate</p>
              <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-muted-foreground/40">—</p>
              <p className="mt-1 text-sm font-mono text-muted-foreground/40">Email engagement</p>
            </div>
            <div className="relative rounded-lg border border-dashed border-border bg-card/50 p-6 opacity-60">
              <p className="min-h-[2.5rem] text-sm font-medium leading-snug text-muted-foreground">Best Outreach Window</p>
              <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-muted-foreground/40">—</p>
              <p className="mt-1 text-sm font-mono text-muted-foreground/40">Optimal send timing</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="funnel" className="space-y-6">
          <TabsList>
            <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
            <TabsTrigger value="affinity">Reporter Affinity</TabsTrigger>
            <TabsTrigger value="momentum">Outlet Momentum</TabsTrigger>
          </TabsList>

          <TabsContent value="funnel">
            <ConversionFunnel conversions={conversions} />
          </TabsContent>

          <TabsContent value="affinity">
            <ReporterAffinityMatrix affinities={reporterAffinities} />
          </TabsContent>

          <TabsContent value="momentum">
            <OutletMomentum momentum={outletMomentum} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
