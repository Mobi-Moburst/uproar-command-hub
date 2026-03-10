import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TypeBadge } from "@/components/TypeBadge";
import { placements } from "@/data/mockData";
import { formatDateShort } from "@/lib/format";

export default function WeeklyWinsPage() {
  const [copyReady, setCopyReady] = useState(false);
  const [copied, setCopied] = useState(false);

  const weeklyWins = placements.filter((p) => p.weekly_wins_trigger);

  // Group by client
  const grouped = weeklyWins.reduce<Record<string, typeof weeklyWins>>((acc, p) => {
    if (!acc[p.client_name]) acc[p.client_name] = [];
    acc[p.client_name].push(p);
    return acc;
  }, {});

  const handleCopy = () => {
    const lines: string[] = ["Weekly Wins — Week of March 10, 2026", ""];
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

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Weekly Wins</h1>
            <p className="mt-1 text-sm text-muted-foreground font-mono">Week of March 10, 2026 · {weeklyWins.length} wins</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCopyReady(!copyReady)}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                copyReady
                  ? "border-emerald bg-emerald text-primary-foreground"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              {copyReady ? "Exit Copy-Ready View" : "Copy-Ready View"}
            </button>
          </div>
        </div>

        {copyReady ? (
          /* Copy-Ready View — clean text block */
          <div className="section-gap">
            <div className="flex justify-end">
              <button
                onClick={handleCopy}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {copied ? "Copied" : "Copy to Clipboard"}
              </button>
            </div>
            <div className="rounded-lg border border-border bg-card p-8">
              <h2 className="text-lg font-semibold text-foreground mb-6">Weekly Wins — Week of March 10, 2026</h2>
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
          /* Card View */
          <div className="space-y-10">
            {Object.entries(grouped).map(([client, wins]) => (
              <div key={client}>
                <h2 className="text-base font-semibold text-foreground mb-3">{client}</h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {wins.map((w) => (
                    <div key={w.id} className="rounded-lg border border-border bg-card p-5">
                      <div className="flex items-start justify-between gap-2">
                        <a href={w.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald hover:underline leading-snug">
                          {w.headline}
                        </a>
                        <TypeBadge type={w.type} />
                      </div>
                      <p className="mt-3 text-xs font-mono text-muted-foreground">
                        {w.outlet} · {formatDateShort(w.date)} · {w.team_name}
                      </p>
                      {w.notes && (
                        <p className="mt-2 text-xs text-muted-foreground">{w.notes}</p>
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
