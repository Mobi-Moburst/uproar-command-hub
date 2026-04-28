import type { ConversionRecord } from "@/hooks/useCoverageIntelligence";
import { formatNumber } from "@/lib/format";

interface ReportTopReportersProps {
  conversions: ConversionRecord[];
}

export function ReportTopReporters({ conversions }: ReportTopReportersProps) {
  // Aggregate by reporter
  const reporterMap = new Map<string, { total: number; converted: number; outlets: Set<string>; avgDays: number[] }>();
  conversions.forEach((c) => {
    if (!c.reporter) return;
    const key = c.reporter.trim();
    const entry = reporterMap.get(key) || { total: 0, converted: 0, outlets: new Set<string>(), avgDays: [] };
    entry.total++;
    if (c.converted) {
      entry.converted++;
      if (c.daysToCoverage != null) entry.avgDays.push(c.daysToCoverage);
    }
    if (c.outlet) entry.outlets.add(c.outlet);
    reporterMap.set(key, entry);
  });

  const reporters = [...reporterMap.entries()]
    .map(([name, data]) => ({
      name,
      total: data.total,
      converted: data.converted,
      rate: data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0,
      avgDays: data.avgDays.length > 0 ? Math.round(data.avgDays.reduce((a, b) => a + b, 0) / data.avgDays.length) : null,
      topOutlet: [...data.outlets][0] || "—",
    }))
    .filter((r) => r.converted > 0)
    .sort((a, b) => b.converted - a.converted || b.rate - a.rate)
    .slice(0, 8);

  if (!reporters.length) return null;

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Top Converting Reporters
      </h2>

      <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.05)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(18,20,24,0.5)]">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reporter</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Outreach</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Covered</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg Days</th>
            </tr>
          </thead>
          <tbody>
            {reporters.map((r) => (
              <tr key={r.name} className="border-b border-[rgba(255,255,255,0.05)] last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{r.total}</td>
                <td className="px-4 py-3 text-right text-foreground font-semibold">{r.converted}</td>
                <td className="px-4 py-3 text-right text-primary font-semibold">{r.rate}%</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{r.avgDays ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
