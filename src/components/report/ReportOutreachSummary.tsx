import { X } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { useReportEdit } from "@/contexts/ReportEditContext";
import type { ConversionRecord } from "@/hooks/useCoverageIntelligence";

interface ReportOutreachSummaryProps {
  sampleConversions: ConversionRecord[];
  briefingConversions: ConversionRecord[];
}

function DismissibleCard({
  id,
  dismissedCards,
  onDismiss,
  isEditing,
  children,
  className = "",
}: {
  id: string;
  dismissedCards: Set<string>;
  onDismiss: (id: string) => void;
  isEditing: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (dismissedCards.has(id)) return null;
  return (
    <div className={`relative group ${className}`}>
      {children}
      {isEditing && (
        <button
          onClick={() => onDismiss(id)}
          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-muted text-muted-foreground hover:bg-muted-foreground hover:text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function ReportOutreachSummary({ sampleConversions, briefingConversions }: ReportOutreachSummaryProps) {
  const { isEditing, dismissedCards, dismissCard } = useReportEdit();
  const dismiss = (id: string) => dismissCard(id);

  const CONVERSION_WINDOW = 90 * 86_400_000;
  const now = Date.now();

  const samplesSent = sampleConversions.length;
  const samplesConverted = sampleConversions.filter((c) => c.converted).length;
  const samplesPending = sampleConversions.filter((c) => !c.converted && c.date && (now - new Date(c.date).getTime()) < CONVERSION_WINDOW).length;
  const sampleRate = samplesSent > 0 ? Math.round((samplesConverted / samplesSent) * 100) : 0;
  const samplePendingRate = samplesSent > 0 ? Math.round((samplesPending / samplesSent) * 100) : 0;

  const briefingsSent = briefingConversions.length;
  const briefingsConverted = briefingConversions.filter((c) => c.converted).length;
  const briefingRate = briefingsSent > 0 ? Math.round((briefingsConverted / briefingsSent) * 100) : 0;

  const avgDays = (() => {
    const converted = [...sampleConversions, ...briefingConversions].filter((c) => c.converted && c.daysToCoverage != null);
    if (!converted.length) return null;
    return Math.round(converted.reduce((s, c) => s + (c.daysToCoverage || 0), 0) / converted.length);
  })();

  if (samplesSent === 0 && briefingsSent === 0) return null;

  const topCards = [
    { id: "outreach-samples-sent", content: (
      <>
        <p className="text-xs font-medium text-muted-foreground">Samples Sent</p>
        <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-foreground">{samplesSent}</p>
        <p className="mt-1 text-[11px] font-mono text-muted-foreground/70">{samplesConverted} → coverage</p>
      </>
    )},
    { id: "outreach-sample-conversion", content: (
      <>
        <p className="text-xs font-medium text-muted-foreground">Sample Conversion</p>
        <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-primary">{sampleRate}%</p>
        <p className="mt-1 text-[11px] font-mono text-muted-foreground/70">
          {samplesConverted} converted · {samplePendingRate}% pending
        </p>
      </>
    )},
    { id: "outreach-briefings-sent", content: (
      <>
        <p className="text-xs font-medium text-muted-foreground">Briefings Sent</p>
        <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-foreground">{briefingsSent}</p>
        <p className="mt-1 text-[11px] font-mono text-muted-foreground/70">{briefingsConverted} → coverage</p>
      </>
    )},
  ];

  const visibleTop = topCards.filter((c) => !dismissed.has(c.id));

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Outreach Activity & Conversion
      </h2>

      {visibleTop.length > 0 && (
        <div className={`grid gap-4 ${visibleTop.length === 1 ? "grid-cols-1" : visibleTop.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
          {topCards.map((card) => (
            <DismissibleCard key={card.id} id={card.id} dismissedCards={dismissedCards} onDismiss={dismiss} isEditing={isEditing} className="rounded-lg border border-border bg-card p-5">
              {card.content}
            </DismissibleCard>
          ))}
        </div>
      )}

      {/* Secondary row */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <DismissibleCard id="outreach-briefing-conversion" dismissedCards={dismissedCards} onDismiss={dismiss} isEditing={isEditing} className="rounded-lg border border-primary/20 bg-emerald-light p-5">
          <p className="text-xs font-mono text-primary uppercase tracking-wide">Briefing Conversion</p>
          <p className="mt-1 font-tight text-3xl font-bold text-foreground">{briefingRate}%</p>
        </DismissibleCard>
        {avgDays !== null && (
          <DismissibleCard id="outreach-avg-days" dismissedCards={dismissedCards} onDismiss={dismiss} isEditing={isEditing} className="rounded-lg border border-primary/20 bg-emerald-light p-5">
            <p className="text-xs font-mono text-primary uppercase tracking-wide">Avg. Days to Coverage</p>
            <p className="mt-1 font-tight text-3xl font-bold text-foreground">{avgDays}</p>
          </DismissibleCard>
        )}
      </div>
    </section>
  );
}
