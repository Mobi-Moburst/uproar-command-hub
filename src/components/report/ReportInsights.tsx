import { CheckCircle2, AlertCircle, Plus, X } from "lucide-react";
import { useReportEdit } from "@/contexts/ReportEditContext";
import { useCallback, useRef, useState, useEffect } from "react";
import type { MediaPlacement } from "@/data/types";

interface ReportInsightsProps {
  placements: MediaPlacement[];
  awardWins: number;
  sampleConversionRate: number;
  briefingConversionRate: number;
}

interface Insight {
  type: "strength" | "opportunity";
  text: string;
}

export function ReportInsights({ placements, awardWins, sampleConversionRate, briefingConversionRate }: ReportInsightsProps) {
  const { isEditing, getTextOverride, setTextOverride } = useReportEdit();
  const [customStrengths, setCustomStrengths] = useState<string[]>([]);
  const [customOpportunities, setCustomOpportunities] = useState<string[]>([]);

  if (placements.length === 0) return null;

  const insights: Insight[] = [];

  // --- Strengths ---
  const featureCount = placements.filter((p) => p.type === "Feature").length;
  const featurePct = Math.round((featureCount / placements.length) * 100);

  if (featurePct >= 40) {
    insights.push({ type: "strength", text: `Feature stories represent ${featurePct}% of coverage — strong narrative-driven media.` });
  }

  const uniqueOutlets = new Set(placements.map((p) => p.outlet)).size;
  if (uniqueOutlets >= 10) {
    insights.push({ type: "strength", text: `Coverage spans ${uniqueOutlets} unique outlets — broad media footprint.` });
  }

  if (sampleConversionRate >= 30) {
    insights.push({ type: "strength", text: `Sample-to-coverage conversion at ${sampleConversionRate}% — outreach is converting well.` });
  }

  if (briefingConversionRate >= 30) {
    insights.push({ type: "strength", text: `Briefing conversion at ${briefingConversionRate}% — reporter meetings are producing results.` });
  }

  if (awardWins >= 2) {
    insights.push({ type: "strength", text: `${awardWins} award wins this period — third-party validation reinforcing brand authority.` });
  }

  const totalReach = placements.reduce((s, p) => s + p.readership_viewership, 0);
  if (totalReach > 50_000_000) {
    insights.push({ type: "strength", text: `Total reach exceeds ${Math.round(totalReach / 1_000_000)}M impressions — exceptional visibility.` });
  }

  // --- Opportunities ---
  if (featurePct < 20 && placements.length >= 5) {
    insights.push({ type: "opportunity", text: `Features represent only ${featurePct}% of coverage. Consider pitching more in-depth story angles.` });
  }

  const contributedCount = placements.filter((p) => p.type === "Contributed content").length;
  if (contributedCount <= 1 && placements.length >= 10) {
    insights.push({ type: "opportunity", text: `Only ${contributedCount} contributed content piece${contributedCount === 1 ? "" : "s"} — thought leadership articles could boost expert positioning.` });
  }

  if (awardWins === 0 && placements.length >= 5) {
    insights.push({ type: "opportunity", text: `No award wins this period. A targeted submission campaign could add third-party credibility.` });
  }

  if (sampleConversionRate > 0 && sampleConversionRate < 15) {
    insights.push({ type: "opportunity", text: `Sample conversion at ${sampleConversionRate}% — consider tightening targeting or follow-up cadence.` });
  }

  if (uniqueOutlets < 5 && placements.length >= 5) {
    insights.push({ type: "opportunity", text: `Coverage concentrated in ${uniqueOutlets} outlet${uniqueOutlets === 1 ? "" : "s"} — diversifying media mix would reduce dependency.` });
  }

  // Check for type diversity
  const types = new Set(placements.map((p) => p.type));
  if (types.size <= 2 && placements.length >= 10) {
    insights.push({ type: "opportunity", text: `Coverage limited to ${types.size} type${types.size === 1 ? "" : "s"}. Expanding to interviews, contributed content, or broadcast could broaden impact.` });
  }

  const strengths = insights.filter((i) => i.type === "strength");
  const opportunities = insights.filter((i) => i.type === "opportunity");

  const allStrengths = [...strengths, ...customStrengths.map((t) => ({ type: "strength" as const, text: t }))];
  const allOpportunities = [...opportunities, ...customOpportunities.map((t) => ({ type: "opportunity" as const, text: t }))];

  if (allStrengths.length === 0 && allOpportunities.length === 0 && !isEditing) return null;

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        What's Working & Opportunities
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 items-start">
        {/* Strengths */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <p className="text-xs font-mono uppercase tracking-wide text-primary font-semibold">What's Working</p>
          </div>
          {allStrengths.length > 0 ? (
            <ul className="space-y-3">
              {allStrengths.map((s, i) => (
                <EditableInsight
                  key={i}
                  id={`insight-strength-${i}`}
                  defaultText={s.text}
                  borderClass="border-primary/30"
                  isEditing={isEditing}
                  getTextOverride={getTextOverride}
                  setTextOverride={setTextOverride}
                  onRemove={i >= strengths.length ? () => setCustomStrengths((prev) => prev.filter((_, j) => j !== i - strengths.length)) : undefined}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground/50">Building momentum — insights will appear with more data.</p>
          )}
          {isEditing && (
            <button
              onClick={() => setCustomStrengths((prev) => [...prev, "New strength…"])}
              className="mt-3 flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add insight
            </button>
          )}
        </div>

        {/* Opportunities */}
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-mono uppercase tracking-wide text-amber-700 font-semibold">Opportunities</p>
          </div>
          {allOpportunities.length > 0 ? (
            <ul className="space-y-3">
              {allOpportunities.map((o, i) => (
                <EditableInsight
                  key={i}
                  id={`insight-opportunity-${i}`}
                  defaultText={o.text}
                  borderClass="border-accent/40"
                  isEditing={isEditing}
                  getTextOverride={getTextOverride}
                  setTextOverride={setTextOverride}
                  onRemove={i >= opportunities.length ? () => setCustomOpportunities((prev) => prev.filter((_, j) => j !== i - opportunities.length)) : undefined}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground/50">No gaps identified — coverage strategy is well-rounded.</p>
          )}
          {isEditing && (
            <button
              onClick={() => setCustomOpportunities((prev) => [...prev, "New opportunity…"])}
              className="mt-3 flex items-center gap-1.5 text-xs text-amber-600/70 hover:text-amber-600 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add insight
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function EditableInsight({
  id,
  defaultText,
  borderClass,
  isEditing,
  getTextOverride,
  setTextOverride,
  onRemove,
}: {
  id: string;
  defaultText: string;
  borderClass: string;
  isEditing: boolean;
  getTextOverride: (id: string) => string | undefined;
  setTextOverride: (id: string, value: string) => void;
  onRemove?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const displayText = getTextOverride(id) ?? defaultText;

  const handleBlur = useCallback(() => {
    if (ref.current) {
      const text = ref.current.innerText.trim();
      if (text !== defaultText) {
        setTextOverride(id, text);
      }
    }
  }, [id, defaultText, setTextOverride]);

  return (
    <li className="relative group">
      <div
        ref={ref}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={handleBlur}
        className={`text-sm text-foreground/85 leading-relaxed pl-4 border-l-2 ${borderClass} ${
          isEditing ? "outline-none ring-1 ring-primary/20 rounded px-3 py-1 -mx-1 focus:ring-primary/50 transition-shadow cursor-text" : ""
        }`}
      >
        {displayText}
      </div>
      {isEditing && onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </li>
  );
}
