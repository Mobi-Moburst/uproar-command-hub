import { Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportAISummaryProps {
  summary: string;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function ReportAISummary({ summary, isGenerating, onGenerate }: ReportAISummaryProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Coverage Summary
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <RotateCcw className="h-3.5 w-3.5 animate-spin" />
              Generating…
            </>
          ) : summary ? (
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

      {!summary && !isGenerating && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            Click "Generate Summary" to create an AI-powered analysis of this client's coverage performance.
          </p>
        </div>
      )}

      {(summary || isGenerating) && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          {summary ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {summary.split("\n\n").map((paragraph, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed text-foreground/90"
                  dangerouslySetInnerHTML={{
                    __html: paragraph
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br />"),
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground font-mono">Analyzing coverage data…</p>
            </div>
          )}

          {isGenerating && summary && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-muted-foreground font-mono">Still writing…</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
