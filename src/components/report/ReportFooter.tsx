import uproarLogo from "@/assets/uproar-moburst-logo.png";

export function ReportFooter() {
  return (
    <footer className="relative overflow-hidden gradient-brand rounded-2xl px-8 py-10 text-center">
      {/* Geometric accents matching hero */}
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -left-12 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-xl" />

      <div className="relative">
        <div className="flex justify-center mb-4">
          <img src={uproarLogo} alt="Uproar PR by Moburst" className="h-8 object-contain" />
        </div>
        <p className="text-xs font-mono uppercase tracking-[0.15em] text-white/50">
          Confidential — Prepared by Uproar PR
        </p>
        <p className="mt-2 text-[11px] font-mono text-white/30">
          Data reflects all-time metrics as of report generation. Reach and ad value figures are estimates based on available data.
        </p>
      </div>
    </footer>
  );
}
