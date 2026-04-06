import { forwardRef, type HTMLAttributes } from "react";

interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  detail?: string;
}

export const KpiCard = forwardRef<HTMLDivElement, KpiCardProps>(function KpiCard(
  { label, value, detail, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={[
        "relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] gradient-brand opacity-60" />
      <p className="min-h-[2.25rem] whitespace-normal break-words text-[13px] font-medium leading-snug text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 font-tight break-words text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {detail && <p className="mt-1 truncate text-xs font-mono text-muted-foreground/70">{detail}</p>}
    </div>
  );
});
