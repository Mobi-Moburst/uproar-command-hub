import { useState, useMemo } from "react";
import { FilterBar, FilterSelect } from "@/components/FilterBar";
import { formatDateShort } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ConversionRecord } from "@/hooks/useCoverageIntelligence";

const tooltipStyle = {
  backgroundColor: "rgba(26, 29, 35, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  color: "#fff",
  backdropFilter: "blur(16px)",
  borderRadius: 12,
  fontSize: 12,
  fontFamily: "Geist Mono, monospace",
  padding: "10px 14px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

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
        <div className="relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] glass p-4">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-muted-foreground/20" />
          <p className="text-xs font-medium text-muted-foreground">Samples Sent</p>
          <p className="mt-1 font-tight text-2xl font-bold text-foreground">{sampleTotal}</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] glass p-4">
          <div className="absolute inset-x-0 top-0 h-[2px] gradient-brand" />
          <p className="text-xs font-medium text-muted-foreground">Samples → Coverage</p>
          <p className="mt-1 font-tight text-2xl font-bold text-primary">{sampleConverted}</p>
          <p className="text-[10px] font-mono text-muted-foreground">
            {sampleTotal > 0 ? `${Math.round((sampleConverted / sampleTotal) * 100)}%` : "–"}
          </p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] glass p-4">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-muted-foreground/20" />
          <p className="text-xs font-medium text-muted-foreground">Briefings Conducted</p>
          <p className="mt-1 font-tight text-2xl font-bold text-foreground">{briefingTotal}</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] glass p-4">
          <div className="absolute inset-x-0 top-0 h-[2px] gradient-brand" />
          <p className="text-xs font-medium text-muted-foreground">Briefings → Coverage</p>
          <p className="mt-1 font-tight text-2xl font-bold text-primary">{briefingConverted}</p>
          <p className="text-[10px] font-mono text-muted-foreground">
            {briefingTotal > 0 ? `${Math.round((briefingConverted / briefingTotal) * 100)}%` : "–"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(255,255,255,0.05)] glass p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-foreground mb-4">Conversion Comparison</h4>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#9ca3af", fontFamily: "Geist, sans-serif" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "Geist Mono, monospace" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255, 255, 255, 0.03)" }} />
            <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Geist, sans-serif" }} iconType="circle" iconSize={8} />
            <Bar dataKey="sent" name="Sent" fill="#9ca3af" radius={[6, 6, 0, 0]} />
            <Bar dataKey="covered" name="Covered" fill="#b9e045" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {recentConversions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Recent Conversions</h4>
          <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.05)] shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(18,20,24,0.5)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reporter</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outlet</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Days to Coverage</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {recentConversions.map((c) => (
                  <tr key={c.id} className="border-b border-[rgba(255,255,255,0.05)] last:border-0 hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.type === "sample"
                          ? "bg-primary/10 text-primary"
                          : "bg-accent/10 text-accent"
                      }`}>
                        {c.type === "sample" ? "Sample" : "Briefing"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans text-foreground">{c.reporter || "–"}</td>
                    <td className="px-4 py-3 font-sans text-foreground">{c.client}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.outlet || "–"}</td>
                    <td className="px-4 py-3 text-right text-primary font-bold">{c.daysToCoverage ?? "–"}</td>
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
