interface KpiCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="min-h-[2.5rem] text-sm font-medium leading-snug text-muted-foreground whitespace-normal break-words">{label}</p>
      <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-foreground break-words">{value}</p>
      {detail && (
        <p className="mt-1 text-sm font-mono text-muted-foreground truncate">{detail}</p>
      )}
    </div>
  );
}
