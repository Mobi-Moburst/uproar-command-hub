import { formatNumber, formatCurrency } from "@/lib/format";
import { TrendingUp, Award, Newspaper, Eye } from "lucide-react";
import type { MediaPlacement } from "@/data/types";

interface ReportExecSummaryProps {
  placements: MediaPlacement[];
  awardWins: number;
  periodLabel: string;
}

export function ReportExecSummary({ placements, awardWins, periodLabel }: ReportExecSummaryProps) {
  if (placements.length === 0) return null;

  const totalReach = placements.reduce((s, p) => s + p.readership_viewership, 0);
  const featureCount = placements.filter((p) => p.type === "Feature").length;
  const featurePct = Math.round((featureCount / placements.length) * 100);
  const topOutlet = (() => {
    const counts = new Map<string, number>();
    placements.forEach((p) => counts.set(p.outlet, (counts.get(p.outlet) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "–";
  })();

  // One-line verdict
  const verdict = totalReach > 100_000_000
    ? "Exceptional reach — coverage broke through at scale."
    : totalReach > 10_000_000
    ? "Strong visibility — consistent coverage driving brand awareness."
    : placements.length > 20
    ? "Solid volume — broad media footprint across outlets."
    : "Focused coverage — quality placements building momentum.";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card">
      {/* Accent */}
      <div className="absolute inset-x-0 top-0 h-1 gradient-brand" />

      <div className="px-8 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">
            Executive Summary
          </h2>
        </div>
        <p className="text-lg font-semibold text-foreground leading-relaxed">
          {verdict}
        </p>
        <p className="mt-1 text-xs font-mono text-muted-foreground/60">{periodLabel}</p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border/60">
        <StatCell
          icon={<Newspaper className="h-4 w-4 text-primary" />}
          value={formatNumber(placements.length)}
          label="Placements"
        />
        <StatCell
          icon={<Eye className="h-4 w-4 text-primary" />}
          value={formatNumber(totalReach)}
          label="Total Reach"
        />
        <StatCell
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          value={`${featurePct}%`}
          label={`Features (${featureCount})`}
        />
        <StatCell
          icon={<Award className="h-4 w-4 text-primary" />}
          value={topOutlet}
          label="Top Outlet"
          isText
        />
      </div>
    </section>
  );
}

function StatCell({ icon, value, label, isText }: { icon: React.ReactNode; value: string; label: string; isText?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-5 border-r border-border/40 last:border-r-0 text-center">
      <div className="mb-2">{icon}</div>
      <p className={`font-tight font-bold tracking-tight text-foreground ${isText ? "text-sm" : "text-2xl"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wide">{label}</p>
    </div>
  );
}
