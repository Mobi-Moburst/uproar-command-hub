import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Skeleton(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
});

export { Skeleton };
