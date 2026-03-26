import uproarLogo from "@/assets/uproar-moburst-logo.png";

export function ReportFooter() {
  return (
    <footer className="rounded-2xl bg-foreground/90 px-8 py-10 text-center">
      <div className="flex justify-center mb-4">
        <img src={uproarLogo} alt="Uproar PR by Moburst" className="h-8 object-contain" />
      </div>
      <p className="text-xs font-mono uppercase tracking-[0.15em] text-white/50">
        Confidential — Prepared by Uproar PR
      </p>
      <p className="mt-2 text-[11px] font-mono text-white/30">
        Data reflects all-time metrics as of report generation. Reach and ad value figures are estimates based on available data.
      </p>
    </footer>
  );
}
