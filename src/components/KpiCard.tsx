interface KpiCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-[2px] gradient-brand opacity-60" />
      <p className="min-h-[2.25rem] text-[13px] font-medium leading-snug text-muted-foreground whitespace-normal break-words">{label}</p>
      <p className="mt-1.5 font-tight text-2xl font-bold tracking-tight text-foreground break-words">{value}</p>
      {detail && (
        <p className="mt-1 text-xs font-mono text-muted-foreground/70 truncate">{detail}</p>
      )}
    </div>
  );
}
