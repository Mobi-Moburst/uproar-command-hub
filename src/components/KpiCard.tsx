interface KpiCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 overflow-hidden">
      <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
      <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-foreground truncate">{value}</p>
      {detail && (
        <p className="mt-1 text-sm font-mono text-muted-foreground truncate">{detail}</p>
      )}
    </div>
  );
}
