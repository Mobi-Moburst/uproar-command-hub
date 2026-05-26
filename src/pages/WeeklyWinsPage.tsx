import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TypeBadge } from "@/components/TypeBadge";

import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { useWeeklyWins } from "@/hooks/usePlacements";
import { formatDateShort } from "@/lib/format";
import { startOfWeek, endOfWeek, format, subWeeks, addWeeks, isSameWeek } from "date-fns";

export default function WeeklyWinsPage() {
  const { data: weeklyWins = [], isLoading, isError, refetch } = useWeeklyWins();
  const queryClient = useQueryClient();

  // Fire-and-forget: snapshot currently-flagged Airtable wins into the DB
  // so a permanent history accumulates over time.
  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke("snapshot-weekly-wins")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("snapshot-weekly-wins failed:", error.message);
          return;
        }
        if (data?.upserted > 0) {
          queryClient.invalidateQueries({ queryKey: ["weeklyWins"] });
        }
      })
      .catch((e) => console.warn("snapshot-weekly-wins error:", e));
    return () => {
      cancelled = true;
    };
  }, [queryClient]);


  const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [copyReady, setCopyReady] = useState(false);
  const [copied, setCopied] = useState(false);

  const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(selectedWeekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  // Available weeks from the data
  const availableWeeks = useMemo(() => {
    const weeks = new Set<string>();
    weeklyWins.forEach((w) => {
      if (w.date) {
        const ws = startOfWeek(new Date(w.date), { weekStartsOn: 1 });
        weeks.add(ws.toISOString());
      }
    });
    return Array.from(weeks)
      .sort((a, b) => b.localeCompare(a))
      .map((iso) => new Date(iso));
  }, [weeklyWins]);

  // Filter wins to selected week
  const filtered = useMemo(() => {
    return weeklyWins.filter((w) => {
      if (!w.date) return false;
      return isSameWeek(new Date(w.date), selectedWeekStart, { weekStartsOn: 1 });
    });
  }, [weeklyWins, selectedWeekStart]);

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, p) => {
    if (!acc[p.client_name]) acc[p.client_name] = [];
    acc[p.client_name].push(p);
    return acc;
  }, {});

  const handleCopy = () => {
    const lines: string[] = [`Weekly Wins — Week of ${format(selectedWeekStart, "MMMM d, yyyy")}`, ""];
    Object.entries(grouped).forEach(([client, wins]) => {
      lines.push(client);
      wins.forEach((w) => {
        lines.push(`  • "${w.headline}" — ${w.outlet} (${formatDateShort(w.date)})`);
      });
      lines.push("");
    });
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goPrev = () => setSelectedWeekStart(subWeeks(selectedWeekStart, 1));
  const goNext = () => setSelectedWeekStart(addWeeks(selectedWeekStart, 1));

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Weekly Wins</h1>
            <p className="mt-1 text-sm text-muted-foreground font-mono">
              {isLoading ? "Loading..." : `${filtered.length} wins`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCopyReady(!copyReady)}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                copyReady
                  ? "border-emerald bg-emerald text-primary-foreground"
                  : "border-[rgba(255,255,255,0.05)] text-foreground hover:bg-[rgba(255,255,255,0.06)]"
              }`}
            >
              {copyReady ? "Exit Copy-Ready View" : "Copy-Ready View"}
            </button>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={goPrev}
            className="rounded-md border border-[rgba(255,255,255,0.05)] px-3 py-1.5 text-sm font-medium text-foreground hover:bg-[rgba(255,255,255,0.06)]"
          >
            ← Prev
          </button>
          <span className="text-sm font-medium text-foreground">{weekLabel}</span>
          <button
            onClick={goNext}
            className="rounded-md border border-[rgba(255,255,255,0.05)] px-3 py-1.5 text-sm font-medium text-foreground hover:bg-[rgba(255,255,255,0.06)]"
          >
            Next →
          </button>
          {availableWeeks.length > 0 && (
            <select
              value={selectedWeekStart.toISOString()}
              onChange={(e) => setSelectedWeekStart(new Date(e.target.value))}
              className="rounded-md border border-[rgba(255,255,255,0.05)] bg-background px-3 py-1.5 text-sm text-foreground"
            >
              {availableWeeks.map((ws) => (
                <option key={ws.toISOString()} value={ws.toISOString()}>
                  Week of {format(ws, "MMM d, yyyy")}
                </option>
              ))}
            </select>
          )}
        </div>

        {isError ? (
          <ErrorState message="Failed to load weekly wins." onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-[rgba(255,255,255,0.05)] glass p-5 space-y-3">
                <div className="h-4 w-24 animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
                <div className="h-4 w-full animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
                <div className="h-3 w-32 animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState message="No wins flagged for this week." />
        ) : copyReady ? (
          <div className="section-gap">
            <div className="flex justify-end">
              <button
                onClick={handleCopy}
                className="rounded-md border border-[rgba(255,255,255,0.05)] px-4 py-2 text-sm font-medium text-foreground hover:bg-[rgba(255,255,255,0.06)]"
              >
                {copied ? "Copied" : "Copy to Clipboard"}
              </button>
            </div>
            <div className="rounded-lg border border-[rgba(255,255,255,0.05)] glass p-8">
              <h2 className="text-lg font-semibold text-foreground mb-6">Weekly Wins — Week of {format(selectedWeekStart, "MMMM d, yyyy")}</h2>
              {Object.entries(grouped).map(([client, wins]) => (
                <div key={client} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-semibold text-foreground">{client}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {wins.map((w) => (
                      <li key={w.id} className="text-sm text-foreground leading-relaxed">
                        • "{w.headline}" — <em className="text-muted-foreground">{w.outlet}</em> ({formatDateShort(w.date)})
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([client, wins]) => (
              <div key={client}>
                <h2 className="text-base font-semibold text-foreground mb-3">{client}</h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {wins.map((w) => (
                    <div key={w.id} className="rounded-lg border border-[rgba(255,255,255,0.05)] glass p-5 overflow-hidden">
                      <div className="flex items-start justify-between gap-2">
                        <a href={w.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald hover:underline leading-snug min-w-0 break-words">
                          {w.headline}
                        </a>
                        <TypeBadge type={w.type} />
                      </div>
                      <p className="mt-3 text-xs font-mono text-muted-foreground truncate">
                        {w.outlet} · {formatDateShort(w.date)} · {w.team_name}
                        {w.topic_product && ` · ${w.topic_product}`}
                      </p>
                      {w.notes && (
                        <p className="mt-2 text-xs text-muted-foreground break-words line-clamp-2">{w.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
