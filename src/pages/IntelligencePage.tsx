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
