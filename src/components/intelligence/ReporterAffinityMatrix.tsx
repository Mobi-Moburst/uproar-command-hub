import { useState, useMemo } from "react";
import { FilterBar, SearchInput } from "@/components/FilterBar";
import type { ReporterAffinity } from "@/hooks/useCoverageIntelligence";

interface Props {
  affinities: ReporterAffinity[];
}

export function ReporterAffinityMatrix({ affinities }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCell, setSelectedCell] = useState<{ reporter: string; vertical: string } | null>(null);

  const allVerticals = useMemo(() => {
    const vSet = new Set<string>();
    affinities.forEach((a) => a.verticals.forEach((v) => vSet.add(v.vertical)));
    return [...vSet].sort();
  }, [affinities]);

  const filtered = useMemo(() => {
    if (!search) return affinities.slice(0, 25);
    const q = search.toLowerCase();
    return affinities
      .filter((a) => a.reporter.toLowerCase().includes(q))
      .slice(0, 25);
  }, [affinities, search]);

  const maxPlacements = useMemo(() => {
    let max = 1;
    affinities.forEach((a) => a.verticals.forEach((v) => { if (v.placements > max) max = v.placements; }));
    return max;
  }, [affinities]);

  const getCellData = (reporter: ReporterAffinity, vertical: string) => {
    return reporter.verticals.find((v) => v.vertical === vertical);
  };

  const cellBg = (count: number) => {
    if (count === 0) return "bg-muted/20";
    const intensity = Math.min(count / maxPlacements, 1);
    if (intensity > 0.6) return "bg-primary/25";
    if (intensity > 0.3) return "bg-primary/12";
    return "bg-primary/5";
  };

  const selectedData = selectedCell
    ? affinities.find((a) => a.reporter === selectedCell.reporter)
    : null;
  const selectedVerticalData = selectedData?.verticals.find((v) => v.vertical === selectedCell?.vertical);

  return (
    <div className="space-y-4">
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search reporters..." />
      </FilterBar>

      <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 backdrop-blur-sm px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[160px]">
                Reporter
              </th>
              {allVerticals.map((v) => (
                <th key={v} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {v}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conv. Rate</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {filtered.map((r) => (
              <tr key={r.reporter} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="sticky left-0 z-10 bg-card backdrop-blur-sm whitespace-nowrap px-4 py-2.5 font-sans font-medium text-foreground">
                  {r.reporter}
                </td>
                {allVerticals.map((v) => {
                  const cell = getCellData(r, v);
                  const count = cell?.placements || 0;
                  return (
                    <td
                      key={v}
                      onClick={() => count > 0 && setSelectedCell({ reporter: r.reporter, vertical: v })}
                      className={`px-3 py-2.5 text-center text-xs transition-colors ${cellBg(count)} ${
                        count > 0 ? "cursor-pointer hover:ring-1 hover:ring-primary/40" : ""
                      } ${
                        selectedCell?.reporter === r.reporter && selectedCell?.vertical === v
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                    >
                      {count > 0 ? count : ""}
                    </td>
                  );
                })}
                <td className="px-4 py-2.5 text-right text-xs font-bold text-primary">
                  {r.overallConversionRate > 0 ? `${Math.round(r.overallConversionRate * 100)}%` : "–"}
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                  {r.totalConversions}/{r.totalSamples + r.totalBriefings}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCell && selectedVerticalData && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              {selectedCell.reporter} × {selectedCell.vertical}
            </h4>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Placements</p>
              <p className="font-tight text-lg font-bold">{selectedVerticalData.placements}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversions</p>
              <p className="font-tight text-lg font-bold text-primary">{selectedVerticalData.conversions}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rate</p>
              <p className="font-tight text-lg font-bold">
                {selectedVerticalData.rate > 0 ? `${Math.round(selectedVerticalData.rate * 100)}%` : "–"}
              </p>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-sm font-mono text-muted-foreground text-center py-8">
          No reporters with conversion data found.
        </p>
      )}
    </div>
  );
}
