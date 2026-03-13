import { formatNumber, formatCurrency } from "@/lib/format";

interface ReportKpisProps {
  totalPlacements: number;
  totalReach: number;
  totalAdValue: number;
  awardWins: number;
  ytdPlacements: number;
  ytdReach: number;
}

export function ReportKpis({
  totalPlacements,
  totalReach,
  totalAdValue,
  awardWins,
  ytdPlacements,
  ytdReach,
}: ReportKpisProps) {
  const currentYear = new Date().getFullYear();

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Performance Summary
      </h2>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBlock label="Total Placements" value={formatNumber(totalPlacements)} sub="All-Time" />
        <KpiBlock label="Total Reach" value={formatNumber(totalReach)} sub="Impressions" />
        <KpiBlock label="Ad Value" value={formatCurrency(totalAdValue)} sub="Estimated" />
        <KpiBlock label="Awards Won" value={String(awardWins)} sub="All-Time" />
      </div>

      {/* YTD callout */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-primary/20 bg-emerald-light p-5">
          <p className="text-xs font-mono text-primary uppercase tracking-wide">{currentYear} YTD Placements</p>
          <p className="mt-1 font-tight text-3xl font-bold text-foreground">{ytdPlacements}</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-emerald-light p-5">
          <p className="text-xs font-mono text-primary uppercase tracking-wide">{currentYear} YTD Reach</p>
          <p className="mt-1 font-tight text-3xl font-bold text-foreground">{formatNumber(ytdReach)}</p>
        </div>
      </div>
    </section>
  );
}

function KpiBlock({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-[11px] font-mono text-muted-foreground/70">{sub}</p>
    </div>
  );
}
