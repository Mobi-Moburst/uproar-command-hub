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
        "glass relative overflow-hidden p-5",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-[rgba(255,255,255,0.04)]" />
      <div className="h-4 w-20 animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-[rgba(255,255,255,0.04)]" />
    </div>
  );
});
