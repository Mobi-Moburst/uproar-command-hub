import { Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportEdit } from "@/contexts/ReportEditContext";
import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ReportAISummaryProps {
  summary: string;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function ReportAISummary({ summary, isGenerating, onGenerate }: ReportAISummaryProps) {
  const { isEditing, getTextOverride, setTextOverride } = useReportEdit();
  const contentRef = useRef<HTMLDivElement>(null);

  const overriddenSummary = getTextOverride("ai-summary-text") ?? summary;

  const handleBlur = useCallback(() => {
    if (contentRef.current) {
      const text = contentRef.current.innerText.trim();
      if (text !== summary) {
        setTextOverride("ai-summary-text", text);
      }
    }
  }, [summary, setTextOverride]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="absolute inset-x-0 top-0 h-1 gradient-brand" />

      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">AI Coverage Summary</h2>
            <p className="text-[11px] font-mono text-muted-foreground/70 uppercase tracking-widest">Powered by Lovable AI</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
          className="gap-2 rounded-lg border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all print:hidden"
        >
          {isGenerating ? (
            <>
              <RotateCcw className="h-3.5 w-3.5 animate-spin" />
              Generating…
            </>
          ) : overriddenSummary ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Generate Summary
            </>
          )}
        </Button>
      </div>

      {!overriddenSummary && !isGenerating && (
        <div className="mx-6 mb-6 rounded-xl border border-dashed border-border/60 bg-muted/30 p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No summary generated yet</p>
          <p className="text-xs text-muted-foreground/60 font-mono">
            Click "Generate Summary" to create an AI-powered coverage analysis
          </p>
        </div>
      )}

      {(overriddenSummary || isGenerating) && (
        <div className="px-6 pb-6">
          {!overriddenSummary && isGenerating && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="relative">
                <div className="h-10 w-10 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Analyzing coverage data…</p>
                <p className="text-[11px] font-mono text-muted-foreground/60 mt-1">This may take a few moments</p>
              </div>
            </div>
          )}

          {overriddenSummary && (
            <div className="space-y-4">
              {isEditing ? (
                <div
                  ref={contentRef}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={handleBlur}
                  className="text-[14px] leading-[1.8] text-foreground/85 font-sans outline-none ring-1 ring-primary/20 rounded-lg p-3 -m-3 focus:ring-primary/50 transition-shadow cursor-text"
                  dangerouslySetInnerHTML={{
                    __html: overriddenSummary
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
                      .replace(/\n\n/g, "</p><p class='mt-4 text-[14px] leading-[1.8] text-foreground/85 font-sans'>")
                      .replace(/\n/g, "<br />"),
                  }}
                />
              ) : (
                overriddenSummary.split("\n\n").map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-[14px] leading-[1.8] text-foreground/85 font-sans"
                    dangerouslySetInnerHTML={{
                      __html: paragraph
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
                        .replace(/\n/g, "<br />"),
                    }}
                  />
                ))
              )}

              {isGenerating && (
                <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">Still writing…</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
