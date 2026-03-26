export function KpiCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-muted" />
      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
}
