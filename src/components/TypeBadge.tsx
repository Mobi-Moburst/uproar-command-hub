import { cn } from "@/lib/utils";

interface TypeBadgeProps {
  type: string;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-2.5 py-0.5 text-xs font-medium font-mono text-[#9ca3af]",
      className
    )}>
      {type}
    </span>
  );
}
