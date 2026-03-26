import { formatNumber } from "@/lib/format";
import type { ConversionRecord } from "@/hooks/useCoverageIntelligence";

interface ReportOutreachSummaryProps {
  sampleConversions: ConversionRecord[];
  briefingConversions: ConversionRecord[];
}

export function ReportOutreachSummary({ sampleConversions, briefingConversions }: ReportOutreachSummaryProps) {
  const samplesSent = sampleConversions.length;
  const samplesConverted = sampleConversions.filter((c) => c.converted).length;
  const sampleRate = samplesSent > 0 ? Math.round((samplesConverted / samplesSent) * 100) : 0;

  const briefingsSent = briefingConversions.length;
  const briefingsConverted = briefingConversions.filter((c) => c.converted).length;
  const briefingRate = briefingsSent > 0 ? Math.round((briefingsConverted / briefingsSent) * 100) : 0;

  const avgDays = (() => {
    const converted = [...sampleConversions, ...briefingConversions].filter((c) => c.converted && c.daysToCoverage != null);
    if (!converted.length) return null;
    return Math.round(converted.reduce((s, c) => s + (c.daysToCoverage || 0), 0) / converted.length);
  })();

  if (samplesSent === 0 && briefingsSent === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Outreach Activity & Conversion
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Sample funnel */}
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Samples Sent</p>
          <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-foreground">{samplesSent}</p>
          <p className="mt-1 text-[11px] font-mono text-muted-foreground/70">{samplesConverted} → coverage</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Sample Conversion</p>
          <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-primary">{sampleRate}%</p>
          <p className="mt-1 text-[11px] font-mono text-muted-foreground/70">Sample → Placement</p>
        </div>

        {/* Briefing funnel */}
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Briefings Held</p>
          <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-foreground">{briefingsSent}</p>
          <p className="mt-1 text-[11px] font-mono text-muted-foreground/70">{briefingsConverted} → coverage</p>
        </div>
      </div>

      {/* Secondary row */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-primary/20 bg-emerald-light p-5">
          <p className="text-xs font-mono text-primary uppercase tracking-wide">Briefing Conversion</p>
          <p className="mt-1 font-tight text-3xl font-bold text-foreground">{briefingRate}%</p>
        </div>
        {avgDays !== null && (
          <div className="rounded-lg border border-primary/20 bg-emerald-light p-5">
            <p className="text-xs font-mono text-primary uppercase tracking-wide">Avg. Days to Coverage</p>
            <p className="mt-1 font-tight text-3xl font-bold text-foreground">{avgDays}</p>
          </div>
        )}
      </div>
    </section>
  );
}
