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
        "glass hover-lift relative overflow-hidden p-5",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] gradient-brand opacity-60" />
      <p className="min-h-[2.25rem] whitespace-normal break-words text-[13px] font-medium leading-snug text-[#9ca3af]">
        {label}
      </p>
      <p className="mt-1.5 break-words text-[30px] leading-[36px] font-bold tracking-[-0.5px] text-white">{value}</p>
      {detail && <p className="mt-1 truncate text-xs font-mono text-[#9ca3af]/70">{detail}</p>}
    </div>
  );
});
