import { cn } from "@/lib/utils";

type StatusVariant = "active" | "inactive" | "onboarding" | "drafting" | "submitted" | "finalist" | "won" | "lost" | "coverage live" | "pending" | "fell through" | "interview occurred, pending coverage" | "sample delivered, pending coverage" | "default";

const variantClasses: Record<StatusVariant, string> = {
  active: "bg-[rgba(16,185,129,0.10)] text-[#10b981]",
  inactive: "bg-[rgba(255,255,255,0.06)] text-[#9ca3af]",
  onboarding: "bg-[rgba(255,255,255,0.06)] text-white",
  drafting: "bg-[rgba(250,204,21,0.10)] text-[#facc15]",
  submitted: "bg-[rgba(56,189,248,0.10)] text-[#38bdf8]",
  finalist: "bg-[rgba(192,132,252,0.10)] text-[#c084fc]",
  won: "bg-[rgba(185,224,69,0.12)] text-[#b9e045]",
  lost: "bg-[rgba(239,68,68,0.10)] text-red-400",
  "coverage live": "bg-[rgba(16,185,129,0.10)] text-[#10b981]",
  "pending": "bg-[rgba(250,204,21,0.10)] text-[#facc15]",
  "fell through": "bg-[rgba(239,68,68,0.10)] text-red-400",
  "interview occurred, pending coverage": "bg-[rgba(56,189,248,0.10)] text-[#38bdf8]",
  "sample delivered, pending coverage": "bg-[rgba(56,189,248,0.10)] text-[#38bdf8]",
  default: "bg-[rgba(255,255,255,0.06)] text-[#9ca3af]",
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
