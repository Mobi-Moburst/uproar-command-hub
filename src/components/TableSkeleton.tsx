import { forwardRef, type HTMLAttributes } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  columns?: number;
  rows?: number;
}

export const TableSkeleton = forwardRef<HTMLDivElement, TableSkeletonProps>(function TableSkeleton(
  { columns = 6, rows = 8, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={["overflow-x-auto rounded-lg border border-border", className].filter(Boolean).join(" ")}
      {...props}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-border last:border-0">
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <Skeleton className={`h-4 ${c === 0 ? "w-32" : "w-16"}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
