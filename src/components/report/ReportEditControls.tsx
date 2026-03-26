import { useReportEdit } from "@/contexts/ReportEditContext";
import { X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, useRef, useCallback } from "react";

/* ── Dismissable section wrapper ─────────────────────── */
export function EditableSection({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { isEditing, hiddenSections, hideSection } = useReportEdit();
  const isHidden = hiddenSections.has(id);

  if (isHidden) return null;

  return (
    <div className={cn("relative group", className)}>
      {isEditing && (
        <button
          onClick={() => hideSection(id)}
          className={cn(
            "absolute -right-3 -top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all opacity-0 group-hover:opacity-100 hover:scale-110 hover:text-foreground",
            isHidden && "opacity-50"
          )}
          title="Remove from report"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {children}
    </div>
  );
}

/* ── Editable text block ─────────────────────────────── */
export function EditableText({
  id,
  defaultValue,
  className,
  as: Tag = "p",
}: {
  id: string;
  defaultValue: string;
  className?: string;
  as?: "p" | "span" | "h1" | "h2" | "h3";
}) {
  const { isEditing, getTextOverride, setTextOverride } = useReportEdit();
  const ref = useRef<HTMLElement>(null);
  const displayValue = getTextOverride(id) ?? defaultValue;

  const handleBlur = useCallback(() => {
    if (ref.current) {
      const text = ref.current.innerText.trim();
      if (text !== defaultValue) {
        setTextOverride(id, text);
      }
    }
  }, [id, defaultValue, setTextOverride]);

  if (!isEditing) {
    return <Tag className={className}>{displayValue}</Tag>;
  }

  return (
    <Tag
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={cn(
        className,
        "outline-none ring-1 ring-primary/20 rounded px-1 -mx-1 focus:ring-primary/50 transition-shadow cursor-text"
      )}
    >
      {displayValue}
    </Tag>
  );
}

/* ── Edit mode toolbar ───────────────────────────────── */
export function ReportEditToolbar() {
  const { isEditing, toggleEdit, hiddenSections, resetHidden } = useReportEdit();

  return (
    <div className="print:hidden flex items-center gap-3">
      <button
        onClick={toggleEdit}
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-medium transition-all",
          isEditing
            ? "bg-primary text-white shadow-md"
            : "border border-border bg-card text-foreground hover:bg-muted"
        )}
      >
        {isEditing ? "Done Editing" : "✏️ Edit Report"}
      </button>

      {isEditing && hiddenSections.size > 0 && (
        <button
          onClick={resetHidden}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Restore {hiddenSections.size} hidden
        </button>
      )}

      {isEditing && (
        <span className="text-[11px] font-mono text-muted-foreground/50">
          Click text to edit · Hover sections to dismiss
        </span>
      )}
    </div>
  );
}
