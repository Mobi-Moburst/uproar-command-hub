import { useReportEdit } from "@/contexts/ReportEditContext";
import { EditableSection } from "./ReportEditControls";
import { Plus, X } from "lucide-react";
import { useState, useCallback } from "react";

export function ReportWrapUp() {
  const { isEditing, takeaways, setTakeaways, upcomingInitiatives, setUpcomingInitiatives } = useReportEdit();
  const [newTakeaway, setNewTakeaway] = useState("");
  const [newInitiative, setNewInitiative] = useState("");

  const addTakeaway = useCallback(() => {
    if (!newTakeaway.trim()) return;
    setTakeaways((prev) => [...prev, newTakeaway.trim()]);
    setNewTakeaway("");
  }, [newTakeaway, setTakeaways]);

  const addInitiative = useCallback(() => {
    if (!newInitiative.trim()) return;
    setUpcomingInitiatives((prev) => [...prev, newInitiative.trim()]);
    setNewInitiative("");
  }, [newInitiative, setUpcomingInitiatives]);

  const removeTakeaway = useCallback((index: number) => {
    setTakeaways((prev) => prev.filter((_, i) => i !== index));
  }, [setTakeaways]);

  const removeInitiative = useCallback((index: number) => {
    setUpcomingInitiatives((prev) => prev.filter((_, i) => i !== index));
  }, [setUpcomingInitiatives]);

  // Hide entirely if not editing and both lists are empty
  if (!isEditing && takeaways.length === 0 && upcomingInitiatives.length === 0) return null;

  return (
    <EditableSection id="wrap-up">
      <section>
        <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground mb-6">
          Wrap-Up
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Takeaways */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Key Takeaways</h3>
            {takeaways.length === 0 && !isEditing && (
              <p className="text-sm text-muted-foreground italic">No takeaways added.</p>
            )}
            <ul className="space-y-2">
              {takeaways.map((item, i) => (
                <li key={i} className="flex items-start gap-2 group">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {isEditing ? (
                    <>
                      <input
                        className="flex-1 bg-transparent text-sm text-foreground border-b border-transparent focus:border-border focus:outline-none"
                        value={item}
                        onChange={(e) =>
                          setTakeaways((prev) => prev.map((t, idx) => (idx === i ? e.target.value : t)))
                        }
                      />
                      <button
                        onClick={() => removeTakeaway(i)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground print:hidden"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-foreground leading-relaxed">{item}</span>
                  )}
                </li>
              ))}
            </ul>
            {isEditing && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Add takeaway…"
                  value={newTakeaway}
                  onChange={(e) => setNewTakeaway(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTakeaway()}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <button
                  onClick={addTakeaway}
                  disabled={!newTakeaway.trim()}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed print:hidden"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Upcoming Initiatives */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming Initiatives</h3>
            {upcomingInitiatives.length === 0 && !isEditing && (
              <p className="text-sm text-muted-foreground italic">No initiatives added.</p>
            )}
            <ul className="space-y-2">
              {upcomingInitiatives.map((item, i) => (
                <li key={i} className="flex items-start gap-2 group">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-foreground/40 shrink-0" />
                  {isEditing ? (
                    <>
                      <input
                        className="flex-1 bg-transparent text-sm text-foreground border-b border-transparent focus:border-border focus:outline-none"
                        value={item}
                        onChange={(e) =>
                          setUpcomingInitiatives((prev) => prev.map((t, idx) => (idx === i ? e.target.value : t)))
                        }
                      />
                      <button
                        onClick={() => removeInitiative(i)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground print:hidden"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-foreground leading-relaxed">{item}</span>
                  )}
                </li>
              ))}
            </ul>
            {isEditing && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Add initiative…"
                  value={newInitiative}
                  onChange={(e) => setNewInitiative(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addInitiative()}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <button
                  onClick={addInitiative}
                  disabled={!newInitiative.trim()}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed print:hidden"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </EditableSection>
  );
}
