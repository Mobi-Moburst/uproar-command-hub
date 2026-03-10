import { cn } from "@/lib/utils";

type StatusVariant = "active" | "inactive" | "onboarding" | "drafting" | "submitted" | "finalist" | "won" | "lost" | "default";

const variantClasses: Record<StatusVariant, string> = {
  active: "bg-emerald-light text-emerald",
  inactive: "bg-muted text-muted-foreground",
  onboarding: "bg-muted text-foreground",
  drafting: "bg-[hsl(38,92%,93%)] text-status-drafting",
  submitted: "bg-[hsl(217,91%,93%)] text-status-submitted",
  finalist: "bg-[hsl(262,83%,93%)] text-status-finalist",
  won: "bg-emerald-light text-emerald",
  lost: "bg-[hsl(0,84%,95%)] text-status-lost",
  default: "bg-muted text-muted-foreground",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

function getVariant(status: string): StatusVariant {
  const lower = status.toLowerCase();
  if (lower in variantClasses) return lower as StatusVariant;
  return "default";
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium font-mono",
      variantClasses[getVariant(status)],
      className
    )}>
      {status}
    </span>
  );
}
