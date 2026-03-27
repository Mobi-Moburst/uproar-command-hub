import { formatNumber, formatCurrency } from "@/lib/format";
import { EditableSection } from "./ReportEditControls";
import { useReportEdit } from "@/contexts/ReportEditContext";

interface ReportKpisProps {
  totalPlacements: number;
  totalReach: number;
  totalAdValue: number;
  awardWins: number;
  ytdPlacements: number;
  ytdReach: number;
}

export function ReportKpis({
  totalPlacements,
  totalReach,
  totalAdValue,
  awardWins,
  ytdPlacements,
  ytdReach,
}: ReportKpisProps) {
  const currentYear = new Date().getFullYear();
  const { isEditing, kpiGoals, setKpiGoal } = useReportEdit();

  return (
    <section>
      <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
        Performance Summary
      </h2>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <EditableSection id="kpi-total-placements">
          <KpiBlock label="Total Placements" value={formatNumber(totalPlacements)} sub="All-Time" goal={kpiGoals["kpi-total-placements"]} goalId="kpi-total-placements" isEditing={isEditing} setKpiGoal={setKpiGoal} />
        </EditableSection>
        <EditableSection id="kpi-total-reach">
          <KpiBlock label="Total Reach" value={formatNumber(totalReach)} sub="Impressions" goal={kpiGoals["kpi-total-reach"]} goalId="kpi-total-reach" isEditing={isEditing} setKpiGoal={setKpiGoal} />
        </EditableSection>
        <EditableSection id="kpi-ad-value">
          <KpiBlock label="Ad Value" value={formatCurrency(totalAdValue)} sub="Estimated" goal={kpiGoals["kpi-ad-value"]} goalId="kpi-ad-value" isEditing={isEditing} setKpiGoal={setKpiGoal} />
        </EditableSection>
        <EditableSection id="kpi-awards-won">
          <KpiBlock label="Awards Won" value={String(awardWins)} sub="All-Time" goal={kpiGoals["kpi-awards-won"]} goalId="kpi-awards-won" isEditing={isEditing} setKpiGoal={setKpiGoal} />
        </EditableSection>
      </div>

      {/* YTD callout */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <EditableSection id="kpi-ytd-placements">
          <div className="rounded-lg border border-primary/20 bg-emerald-light p-5">
            <p className="text-xs font-mono text-primary uppercase tracking-wide">{currentYear} YTD Placements</p>
            <p className="mt-1 font-tight text-3xl font-bold text-foreground">{ytdPlacements}</p>
            {kpiGoals["kpi-ytd-placements"] && (
              <p className="mt-1 text-[11px] font-mono text-primary/70">Goal: {kpiGoals["kpi-ytd-placements"]}</p>
            )}
            {isEditing && (
              <input
                type="text"
                placeholder="Set goal (e.g. 10+)"
                value={kpiGoals["kpi-ytd-placements"] || ""}
                onChange={(e) => setKpiGoal("kpi-ytd-placements", e.target.value)}
                className="mt-2 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 print:hidden"
              />
            )}
          </div>
        </EditableSection>
        <EditableSection id="kpi-ytd-reach">
          <div className="rounded-lg border border-primary/20 bg-emerald-light p-5">
            <p className="text-xs font-mono text-primary uppercase tracking-wide">{currentYear} YTD Reach</p>
            <p className="mt-1 font-tight text-3xl font-bold text-foreground">{formatNumber(ytdReach)}</p>
            {kpiGoals["kpi-ytd-reach"] && (
              <p className="mt-1 text-[11px] font-mono text-primary/70">Goal: {kpiGoals["kpi-ytd-reach"]}</p>
            )}
            {isEditing && (
              <input
                type="text"
                placeholder="Set goal (e.g. 1M+)"
                value={kpiGoals["kpi-ytd-reach"] || ""}
                onChange={(e) => setKpiGoal("kpi-ytd-reach", e.target.value)}
                className="mt-2 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 print:hidden"
              />
            )}
          </div>
        </EditableSection>
      </div>
    </section>
  );
}

function KpiBlock({
  label,
  value,
  sub,
  goal,
  goalId,
  isEditing,
  setKpiGoal,
}: {
  label: string;
  value: string;
  sub: string;
  goal?: string;
  goalId: string;
  isEditing: boolean;
  setKpiGoal: (id: string, value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 font-tight text-3xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-[11px] font-mono text-muted-foreground/70">{sub}</p>
      {goal && (
        <p className="mt-1 text-[11px] font-mono text-primary/70">Goal: {goal}</p>
      )}
      {isEditing && (
        <input
          type="text"
          placeholder="Set goal…"
          value={goal || ""}
          onChange={(e) => setKpiGoal(goalId, e.target.value)}
          className="mt-2 w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 print:hidden"
        />
      )}
    </div>
  );
}
