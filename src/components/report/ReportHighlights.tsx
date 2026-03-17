import { formatNumber, formatDateShort } from "@/lib/format";
import { TypeBadge } from "@/components/TypeBadge";
import type { MediaPlacement } from "@/data/types";

interface ReportHighlightsProps {
  placements: MediaPlacement[];
}

export function ReportHighlights({ placements }: ReportHighlightsProps) {
  if (placements.length === 0) return null;

  // First placement as hero highlight
  const hero = placements[0];
  const rest = placements.slice(1);

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Coverage Highlights
      </h2>

      {/* Hero placement */}
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

      {/* Remaining highlights */}
      <div className="mt-3 space-y-2">
        {rest.map((p) => (
          <div key={p.id} className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-3">
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
                {p.outlet} · {formatDateShort(p.date)} · {formatNumber(p.readership_viewership)} reach
              </p>
            </div>
            <TypeBadge type={p.type} />
          </div>
        ))}
      </div>
    </section>
  );
}
