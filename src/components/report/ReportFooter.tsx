import uproarLogo from "@/assets/uproar-moburst-logo.png";

export function ReportFooter() {
  return (
    <footer className="border-t border-border pt-8 pb-12 text-center">
      <div className="flex justify-center mb-4">
        <img src={uproarLogo} alt="Uproar PR by Moburst" className="h-8 object-contain dark:invert-0 invert brightness-0" />
      </div>
      <p className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground/60">
        Confidential — Prepared by Uproar PR
      </p>
      <p className="mt-2 text-[11px] font-mono text-muted-foreground/40">
        Data reflects all-time metrics as of report generation. Reach and ad value figures are estimates based on available data.
      </p>
    </footer>
  );
}
