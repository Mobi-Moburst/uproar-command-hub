import { useState, useMemo } from "react";
import { FilterBar, FilterSelect, SearchInput } from "@/components/FilterBar";
import { TypeBadge } from "@/components/TypeBadge";
import { formatDateShort } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ConversionRecord } from "@/hooks/useCoverageIntelligence";

interface Props {
  conversions: ConversionRecord[];
}

export function ConversionFunnel({ conversions }: Props) {
  const [clientFilter, setClientFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const clients = [...new Set(conversions.map((c) => c.client).filter(Boolean))].sort();
  const teams = [...new Set(conversions.map((c) => c.team).filter(Boolean))].sort();

  const filtered = useMemo(() => {
    return conversions.filter((c) => {
      if (clientFilter && c.client !== clientFilter) return false;
      if (teamFilter && c.team !== teamFilter) return false;
      if (typeFilter && c.type !== typeFilter) return false;
      return true;
    });
  }, [conversions, clientFilter, teamFilter, typeFilter]);

  const sampleTotal = filtered.filter((c) => c.type === "sample").length;
  const sampleConverted = filtered.filter((c) => c.type === "sample" && c.converted).length;
  const briefingTotal = filtered.filter((c) => c.type === "briefing").length;
  const briefingConverted = filtered.filter((c) => c.type === "briefing" && c.converted).length;

  const chartData = [
    { name: "Samples", sent: sampleTotal, covered: sampleConverted },
    { name: "Briefings", sent: briefingTotal, covered: briefingConverted },
  ];

  const recentConversions = filtered
    .filter((c) => c.converted)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <FilterBar>
        <FilterSelect label="All Clients" value={clientFilter} options={clients} onChange={setClientFilter} />
        <FilterSelect label="All Teams" value={teamFilter} options={teams} onChange={setTeamFilter} />
        <FilterSelect
          label="All Types"
          value={typeFilter}
          options={["sample", "briefing"]}
          onChange={setTypeFilter}
        />
      </FilterBar>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Samples Sent</p>
          <p className="mt-1 font-tight text-2xl font-bold text-foreground">{sampleTotal}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Samples → Coverage</p>
          <p className="mt-1 font-tight text-2xl font-bold text-emerald">{sampleConverted}</p>
          <p className="text-[10px] font-mono text-muted-foreground">
            {sampleTotal > 0 ? `${Math.round((sampleConverted / sampleTotal) * 100)}%` : "–"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Briefings Conducted</p>
          <p className="mt-1 font-tight text-2xl font-bold text-foreground">{briefingTotal}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Briefings → Coverage</p>
          <p className="mt-1 font-tight text-2xl font-bold text-emerald">{briefingConverted}</p>
          <p className="text-[10px] font-mono text-muted-foreground">
            {briefingTotal > 0 ? `${Math.round((briefingConverted / briefingTotal) * 100)}%` : "–"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-4">Conversion Comparison</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="sent" name="Sent" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="covered" name="Covered" fill="hsl(var(--emerald))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {recentConversions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Recent Conversions</h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reporter</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Outlet</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Days to Coverage</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {recentConversions.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.type === "sample" ? "bg-emerald-light text-emerald" : "bg-muted text-muted-foreground"
                      }`}>
                        {c.type === "sample" ? "Sample" : "Briefing"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans text-foreground">{c.reporter || "–"}</td>
                    <td className="px-4 py-3 font-sans text-foreground">{c.client}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.outlet || "–"}</td>
                    <td className="px-4 py-3 text-right text-emerald font-bold">{c.daysToCoverage ?? "–"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatDateShort(c.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
