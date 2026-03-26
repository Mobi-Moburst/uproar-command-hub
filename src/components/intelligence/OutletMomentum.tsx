import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { OutletMomentumEntry } from "@/hooks/useCoverageIntelligence";

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
      month: m.month.slice(5), // "MM" format
      placements: m.count,
    }));
  }, [momentum, selectedOutlet]);

  const TrendIcon = ({ trend }: { trend: number }) => {
    if (Math.abs(trend) < 10) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (trend > 0) return <ArrowUp className="h-3 w-3 text-emerald" />;
    return <ArrowDown className="h-3 w-3 text-destructive" />;
  };

  const trendColor = (trend: number) => {
    if (Math.abs(trend) < 10) return "text-muted-foreground";
    return trend > 0 ? "text-emerald" : "text-destructive";
  };

  return (
    <div className="space-y-4">
      {selectedOutlet && chartData.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground">{selectedOutlet} — 6-Month Trend</h4>
            <button
              onClick={() => setSelectedOutlet(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="placements" stroke="hsl(var(--emerald))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Outlet</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Placements (6mo)</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Trend</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Direction</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {top20.map((o) => (
              <tr
                key={o.outlet}
                onClick={() => setSelectedOutlet(selectedOutlet === o.outlet ? null : o.outlet)}
                className={`cursor-pointer border-b border-border last:border-0 hover:bg-muted/50 ${
                  selectedOutlet === o.outlet ? "bg-emerald-light" : ""
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
