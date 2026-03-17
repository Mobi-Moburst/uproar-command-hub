import { formatDate } from "@/lib/format";

interface ReportHeroProps {
  clientName: string;
  teamName: string;
  periodLabel?: string;
}

export function ReportHero({ clientName, teamName, periodLabel }: ReportHeroProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <header className="relative overflow-hidden border-b border-border bg-foreground px-6 py-16 text-primary-foreground">
      {/* Subtle geometric accent */}
      <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/10" />
      <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-primary/5" />

      <div className="relative mx-auto max-w-5xl">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-primary/80">
          Media & Awards Performance Report
        </p>
        <h1 className="mt-4 font-tight text-5xl font-bold tracking-tight sm:text-6xl">
          {clientName}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-mono text-primary-foreground/60">
            Prepared {formatDate(today)}
          </span>
          <span className="text-primary-foreground/30">·</span>
          <span className="font-mono text-primary-foreground/60">
            Team: {teamName}
          </span>
          {periodLabel && (
            <>
              <span className="text-primary-foreground/30">·</span>
              <span className="font-mono text-primary-foreground/60">
                Period: {periodLabel}
              </span>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-primary-foreground/10" />
          <span className="text-xs font-mono uppercase tracking-[0.15em] text-primary/70">
            Uproar PR
          </span>
          <div className="h-px flex-1 bg-primary-foreground/10" />
        </div>
      </div>
    </header>
  );
}
