import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { OutletMomentumEntry } from "@/hooks/useCoverageIntelligence";

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
  momentum: OutletMomentumEntry[];
}

export function OutletMomentum({ momentum }: Props) {
  const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);

  const top20 = momentum.slice(0, 20);

  const chartData = useMemo(() => {
    if (!selectedOutlet) return [];
    const entry = momentum.find((o) => o.outlet === selectedOutlet);
    if (!entry) return [];
    return entry.months.map((m) => ({
      month: m.month.slice(5),
      placements: m.count,
    }));
  }, [momentum, selectedOutlet]);

  const TrendIcon = ({ trend }: { trend: number }) => {
    if (Math.abs(trend) < 10) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (trend > 0) return <ArrowUp className="h-3 w-3 text-accent" />;
    return <ArrowDown className="h-3 w-3 text-destructive" />;
  };

  const trendColor = (trend: number) => {
    if (Math.abs(trend) < 10) return "text-muted-foreground";
    return trend > 0 ? "text-accent" : "text-destructive";
  };

  return (
    <div className="space-y-4">
      {selectedOutlet && chartData.length > 0 && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.05)] glass p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground">{selectedOutlet} — 6-Month Trend</h4>
            <button
              onClick={() => setSelectedOutlet(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "Geist Mono, monospace" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "Geist Mono, monospace" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="placements"
                stroke="#b9e045"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#b9e045", strokeWidth: 2, stroke: "rgba(26, 29, 35, 0.95)" }}
                activeDot={{ r: 6, fill: "#b9e045", strokeWidth: 2, stroke: "rgba(26, 29, 35, 0.95)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.05)] shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(18,20,24,0.5)]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outlet</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placements (6mo)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trend</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Direction</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {top20.map((o) => (
              <tr
                key={o.outlet}
                onClick={() => setSelectedOutlet(selectedOutlet === o.outlet ? null : o.outlet)}
                className={`cursor-pointer border-b border-[rgba(255,255,255,0.05)] last:border-0 transition-colors ${
                  selectedOutlet === o.outlet
                    ? "bg-primary/8"
                    : "hover:bg-[rgba(255,255,255,0.03)]"
                }`}
              >
                <td className="px-4 py-3 font-sans font-medium text-foreground">{o.outlet}</td>
                <td className="px-4 py-3 text-right">{o.totalPlacements}</td>
                <td className={`px-4 py-3 text-right font-bold ${trendColor(o.trend)}`}>
                  {o.trend > 0 ? "+" : ""}{Math.round(o.trend)}%
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center">
                    <TrendIcon trend={o.trend} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {top20.length === 0 && (
        <p className="text-sm font-mono text-muted-foreground text-center py-8">
          Not enough data to compute outlet momentum.
        </p>
      )}
    </div>
  );
}
