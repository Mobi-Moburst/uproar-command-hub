import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { MediaPlacement } from "@/data/types";

interface TypeTrendChartProps {
  placements: MediaPlacement[];
}

const TYPE_COLORS: Record<string, string> = {
  Feature: "hsl(160, 84%, 30%)",
  Mention: "hsl(217, 91%, 60%)",
  Quote: "hsl(262, 83%, 58%)",
  Interview: "hsl(38, 92%, 50%)",
  Byline: "hsl(0, 84%, 60%)",
  Broadcast: "hsl(340, 65%, 55%)",
};

const DEFAULT_COLOR = "hsl(220, 9%, 46%)";

export function TypeTrendChart({ placements }: TypeTrendChartProps) {
  const { chartData, types } = useMemo(() => {
    const monthMap = new Map<string, Record<string, number>>();
    const typeSet = new Set<string>();

    for (const p of placements) {
      if (!p.date) continue;
      const month = p.date.slice(0, 7); // YYYY-MM
      const type = p.type || "Other";
      typeSet.add(type);

      if (!monthMap.has(month)) monthMap.set(month, {});
      const bucket = monthMap.get(month)!;
      bucket[type] = (bucket[type] || 0) + 1;
    }

    const sortedMonths = [...monthMap.keys()].sort();
    // Show last 18 months max
    const recent = sortedMonths.slice(-18);

    const types = [...typeSet].sort();
    const chartData = recent.map((month) => {
      const row: Record<string, string | number> = {
        month: formatMonth(month),
      };
      for (const t of types) {
        row[t] = monthMap.get(month)?.[t] || 0;
      }
      return row;
    });

    return { chartData, types };
  }, [placements]);

  if (chartData.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Coverage Type Breakdown Over Time
      </h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(210, 20%, 98%)",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            {types.map((type) => (
              <Bar
                key={type}
                dataKey={type}
                stackId="types"
                fill={TYPE_COLORS[type] || DEFAULT_COLOR}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}
