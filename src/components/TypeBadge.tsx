import { cn } from "@/lib/utils";

interface TypeBadgeProps {
  type: string;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border border-border bg-background px-2.5 py-0.5 text-xs font-medium font-mono text-muted-foreground",
      className
    )}>
      {type}
    </span>
  );
}
