import { formatNumber, formatDateShort } from "@/lib/format";
import { TypeBadge } from "@/components/TypeBadge";
import { EditableSection } from "./ReportEditControls";
import type { MediaPlacement } from "@/data/types";

interface ReportHighlightsProps {
  placements: MediaPlacement[];
}

export function ReportHighlights({ placements }: ReportHighlightsProps) {
  if (placements.length === 0) return null;

  // Hero = highest reach placement
  const sorted = [...placements].sort((a, b) => b.readership_viewership - a.readership_viewership);
  const hero = sorted[0];
  const rest = placements.filter((p) => p.id !== hero.id);

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Coverage Highlights
      </h2>

      {/* Hero placement */}
      <EditableSection id={`highlight-${hero.id}`}>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono text-muted-foreground mb-1">
                {hero.outlet} · {formatDateShort(hero.date)}
              </p>
              <a
                href={hero.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-foreground hover:text-primary transition-colors leading-snug"
              >
                {hero.headline}
              </a>
              <p className="mt-2 text-sm font-mono text-muted-foreground">
                {hero.readership_viewership > 0 ? `${formatNumber(hero.readership_viewership)} impressions` : "N/A impressions"}
              </p>
            </div>
            <TypeBadge type={hero.type} />
          </div>
        </div>
      </EditableSection>

      {/* Remaining highlights */}
      <div className="mt-3 space-y-2">
        {rest.map((p) => (
          <EditableSection key={p.id} id={`highlight-${p.id}`}>
            <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-3">
              <div className="min-w-0 flex-1">
                <a
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                >
                  {p.headline}
                </a>
                <p className="mt-0.5 text-xs font-mono text-muted-foreground">
                  {p.outlet} · {formatDateShort(p.date)} · {p.readership_viewership > 0 ? `${formatNumber(p.readership_viewership)} reach` : "N/A reach"}
                </p>
              </div>
              <TypeBadge type={p.type} />
            </div>
          </EditableSection>
        ))}
      </div>
    </section>
  );
}
