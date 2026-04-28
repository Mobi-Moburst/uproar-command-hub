import { useReportEdit } from "@/contexts/ReportEditContext";
import { EditableSection } from "./ReportEditControls";

export function ReportPROverview() {
  const { isEditing, prOverview, setPrOverview } = useReportEdit();

  // In non-editing mode, hide if empty
  if (!isEditing && !prOverview?.trim()) return null;

  return (
    <EditableSection id="pr-overview">
      <section>
        <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-4">
          PR Overview & Tactics
        </h2>
        {isEditing ? (
          <textarea
            value={prOverview || ""}
            onChange={(e) => setPrOverview(e.target.value)}
            placeholder="Describe the PR strategy, key tactics, and approach for this period…"
            className="w-full min-h-[120px] rounded-lg border border-[rgba(255,255,255,0.05)] glass p-5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-y"
          />
        ) : (
          <div className="rounded-lg border border-[rgba(255,255,255,0.05)] glass p-5">
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {prOverview}
            </p>
          </div>
        )}
      </section>
    </EditableSection>
  );
}
