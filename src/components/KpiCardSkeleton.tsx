import { forwardRef, type HTMLAttributes } from "react";

interface KpiCardSkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export const KpiCardSkeleton = forwardRef<HTMLDivElement, KpiCardSkeletonProps>(function KpiCardSkeleton(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={[
        "relative overflow-hidden rounded-xl border border-border bg-card p-5",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-muted" />
      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
});
