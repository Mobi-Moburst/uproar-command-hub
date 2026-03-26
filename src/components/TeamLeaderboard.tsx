import { useMemo } from "react";
import { Trophy, Target, TrendingUp, Award, Zap } from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/format";
import type { MediaPlacement, AwardSubmission } from "@/data/types";
import type { ConversionRecord } from "@/hooks/useCoverageIntelligence";

interface TeamRanking {
  team: string;
  placements: number;
  reach: number;
  adValue: number;
  awardWins: number;
  conversionRate: number;
  totalScore: number;
}

interface TeamLeaderboardProps {
  placements: MediaPlacement[];
  awards: AwardSubmission[];
  conversions: ConversionRecord[];
  fromDate?: Date;
  toDate?: Date;
}

export function TeamLeaderboard({ placements, awards, conversions, fromDate, toDate }: TeamLeaderboardProps) {
  const rankings = useMemo(() => {
    // Filter placements by date
    const filtered = placements.filter((p) => {
      if (!p.date || !p.team_name) return false;
      const d = new Date(p.date);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });

    // Filter awards by date
    const filteredAwards = awards.filter((a) => {
      if (!a.team_name) return false;
      const d = a.submitted_date || a.due_date;
      if (!d) return false;
      const dd = new Date(d);
      if (fromDate && dd < fromDate) return false;
      if (toDate && dd > toDate) return false;
      return true;
    });

    // Filter conversions by date
    const filteredConversions = conversions.filter((c) => {
      if (!c.team || !c.date) return false;
      const d = new Date(c.date);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });

    // Aggregate by team
    const teamMap = new Map<string, { placements: number; reach: number; adValue: number; wins: number; converted: number; totalOutreach: number }>();

    for (const p of filtered) {
      const t = p.team_name;
      if (!teamMap.has(t)) teamMap.set(t, { placements: 0, reach: 0, adValue: 0, wins: 0, converted: 0, totalOutreach: 0 });
      const entry = teamMap.get(t)!;
      entry.placements++;
      entry.reach += p.readership_viewership;
      entry.adValue += p.ad_value;
    }

    for (const a of filteredAwards) {
      const t = a.team_name;
      if (!teamMap.has(t)) teamMap.set(t, { placements: 0, reach: 0, adValue: 0, wins: 0, converted: 0, totalOutreach: 0 });
      if (a.status === "Won") teamMap.get(t)!.wins++;
    }

    for (const c of filteredConversions) {
      const t = c.team || "";
      if (!t) continue;
      if (!teamMap.has(t)) teamMap.set(t, { placements: 0, reach: 0, adValue: 0, wins: 0, converted: 0, totalOutreach: 0 });
      const entry = teamMap.get(t)!;
      entry.totalOutreach++;
      if (c.converted) entry.converted++;
    }

    if (teamMap.size === 0) return [];

    // Normalize and score
    const maxPlacements = Math.max(...[...teamMap.values()].map((t) => t.placements), 1);
    const maxReach = Math.max(...[...teamMap.values()].map((t) => t.reach), 1);
    const maxAdValue = Math.max(...[...teamMap.values()].map((t) => t.adValue), 1);
    const maxWins = Math.max(...[...teamMap.values()].map((t) => t.wins), 1);

    const ranked: TeamRanking[] = [...teamMap.entries()].map(([team, data]) => {
      const convRate = data.totalOutreach > 0 ? data.converted / data.totalOutreach : 0;
      const score =
        (data.placements / maxPlacements) * 0.3 +
        (data.reach / maxReach) * 0.25 +
        (data.adValue / maxAdValue) * 0.15 +
        (data.wins / maxWins) * 0.15 +
        convRate * 0.15;

      return {
        team,
        placements: data.placements,
        reach: data.reach,
        adValue: data.adValue,
        awardWins: data.wins,
        conversionRate: convRate,
        totalScore: score,
      };
    });

    return ranked.sort((a, b) => b.totalScore - a.totalScore);
  }, [placements, awards, conversions, fromDate, toDate]);

  if (rankings.length === 0) return null;

  const medalStyles = [
    "bg-gradient-to-br from-primary to-accent text-white",
    "bg-gradient-to-br from-primary/80 to-brand-yellow text-white",
    "bg-gradient-to-br from-accent to-brand-yellow text-foreground",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-brand-yellow" />
        <h2 className="text-lg font-semibold text-foreground">Team Leaderboard</h2>
      </div>

      {/* Top 3 podium */}
      <div className="grid gap-3 sm:grid-cols-3">
        {rankings.slice(0, 3).map((r, i) => (
          <div
            key={r.team}
            className={`relative overflow-hidden rounded-xl border p-5 transition-shadow hover:shadow-md ${
              i === 0 ? "border-primary/30 shadow-sm" : "border-border"
            }`}
          >
            <div className="absolute inset-x-0 top-0 h-[2px] gradient-brand opacity-60" />
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${medalColors[i]}`}>
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{r.team}</p>
                <p className="text-[10px] font-mono text-muted-foreground">Score: {Math.round(r.totalScore * 100)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-primary" />
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">Placements</span>
                </div>
                <p className="text-lg font-bold text-foreground">{r.placements}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-accent" />
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">Reach</span>
                </div>
                <p className="text-lg font-bold text-foreground">{formatNumber(r.reach)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="flex items-center gap-1">
                  <Award className="h-3 w-3 text-brand-yellow" />
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">Wins</span>
                </div>
                <p className="text-lg font-bold text-foreground">{r.awardWins}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2">
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-primary" />
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">Conv.</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {r.conversionRate > 0 ? `${Math.round(r.conversionRate * 100)}%` : "–"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Remaining teams */}
      {rankings.length > 3 && (
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placements</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reach</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ad Value</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wins</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conv.</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {rankings.slice(3).map((r, i) => (
                <tr key={r.team} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{i + 4}</td>
                  <td className="px-4 py-3 font-sans font-medium text-foreground">{r.team}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{Math.round(r.totalScore * 100)}</td>
                  <td className="px-4 py-3 text-right">{r.placements}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(r.reach)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(r.adValue)}</td>
                  <td className="px-4 py-3 text-right">{r.awardWins}</td>
                  <td className="px-4 py-3 text-right">
                    {r.conversionRate > 0 ? `${Math.round(r.conversionRate * 100)}%` : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
