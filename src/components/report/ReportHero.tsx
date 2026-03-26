import { formatDate } from "@/lib/format";

interface ReportHeroProps {
  clientName: string;
  teamName: string;
  periodLabel?: string;
}

export function ReportHero({ clientName, teamName, periodLabel }: ReportHeroProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <header className="relative overflow-hidden gradient-brand px-6 py-20 text-white">
      {/* Layered geometric accents */}
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-xl" />
      <div className="absolute right-1/4 top-1/3 h-32 w-32 rounded-full bg-white/5" />

      <div className="relative mx-auto max-w-5xl">
        <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/60">
          Media & Awards Performance Report
        </p>
        <h1 className="mt-5 font-tight text-5xl font-bold tracking-tight sm:text-6xl text-white">
          {clientName}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-mono text-white/60">
            Prepared {formatDate(today)}
          </span>
          <span className="text-white/25">·</span>
          <span className="font-mono text-white/60">
            Team: {teamName}
          </span>
          {periodLabel && (
            <>
              <span className="text-white/25">·</span>
              <span className="font-mono text-white/60">
                Period: {periodLabel}
              </span>
            </>
          )}
        </div>

        <div className="mt-10 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/15" />
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/50">
            Uproar PR · Moburst
          </span>
          <div className="h-px flex-1 bg-white/15" />
        </div>
      </div>
    </header>
  );
}
