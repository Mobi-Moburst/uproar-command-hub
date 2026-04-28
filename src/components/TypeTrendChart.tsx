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

/* Brand-aligned palette: blue → lime → yellow → coral spectrum */
const TYPE_COLORS: Record<string, string> = {
  Feature:              "hsl(160, 65%, 38%)",
  Interview:            "hsl(38, 85%, 52%)",
  Broadcast:            "hsl(350, 68%, 55%)",
  "Product review":     "hsl(140, 55%, 42%)",
  "Contributed content": "hsl(280, 50%, 55%)",
  Announcement:         "hsl(199, 80%, 50%)",
  Data:                 "hsl(100, 50%, 45%)",
  Award:                "hsl(50, 85%, 52%)",
  "Calendar listing":   "hsl(180, 50%, 48%)",
  Mention:              "hsl(217, 75%, 58%)",
  Online:               "hsl(25, 80%, 52%)",
  Other:                "hsl(220, 12%, 62%)",
  Roundup:              "hsl(270, 50%, 58%)",
  "Social media":       "hsl(345, 65%, 55%)",
  Syndication:          "hsl(190, 60%, 42%)",
};

const DEFAULT_COLOR = "hsl(220, 15%, 58%)";

/* Intercept dark glass tooltip */
const tooltipStyle = {
  backgroundColor: "rgba(26, 29, 35, 0.95)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 12,
  fontSize: 12,
  fontFamily: "Geist Mono, monospace",
  padding: "10px 14px",
  color: "#fff",
  backdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

export function TypeTrendChart({ placements }: TypeTrendChartProps) {
  const { chartData, types } = useMemo(() => {
    const monthMap = new Map<string, Record<string, number>>();
    const typeSet = new Set<string>();

    for (const p of placements) {
      if (!p.date) continue;
      const month = p.date.slice(0, 7);
      const type = p.type || "Other";
      typeSet.add(type);

      if (!monthMap.has(month)) monthMap.set(month, {});
      const bucket = monthMap.get(month)!;
      bucket[type] = (bucket[type] || 0) + 1;
    }

    const sortedMonths = [...monthMap.keys()].sort();
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
    <div className="glass p-6">
      <h3 className="text-[18px] leading-[28px] font-semibold tracking-[-0.5px] text-white mb-6">
        Coverage Type Breakdown Over Time
      </h3>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
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
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255, 255, 255, 0.03)" }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12, fontFamily: "Geist, sans-serif" }}
              iconType="circle"
              iconSize={8}
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
