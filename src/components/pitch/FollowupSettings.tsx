import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/pitch/RichTextEditor";
import { toEditorHtml } from "@/lib/pitchHtml";
import {
  DEFAULT_FOLLOWUP_STEPS,
  MAX_FOLLOWUP_STEPS,
  summarizeSteps,
  useFollowupSettings,
  validateSteps,
  type FollowupStep,
} from "@/hooks/useFollowupSettings";

interface Props {
  campaignId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FollowupSettings({ campaignId, open, onOpenChange }: Props) {
  const { settings, isLoading, save } = useFollowupSettings(campaignId);
  const [enabled, setEnabled] = useState(true);
  const [steps, setSteps] = useState<FollowupStep[]>(DEFAULT_FOLLOWUP_STEPS);
  const [localOpen, setLocalOpen] = useState(false);
  const expanded = open ?? localOpen;
  const setExpanded = (v: boolean) => (onOpenChange ? onOpenChange(v) : setLocalOpen(v));

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.followups_enabled);
    setSteps(settings.steps.map((s) => ({ day: s.day, body: toEditorHtml(s.body) })));
  }, [settings]);

  const dirty =
    !!settings &&
    (enabled !== settings.followups_enabled ||
      JSON.stringify(steps) !==
        JSON.stringify(settings.steps.map((s) => ({ day: s.day, body: toEditorHtml(s.body) }))));

  const summary = summarizeSteps({ followups_enabled: enabled, steps });

  const update = (i: number, patch: Partial<FollowupStep>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const submit = () => {
    if (enabled) {
      const problem = validateSteps(steps);
      if (problem) {
        toast.error(problem);
        return;
      }
    }
    save.mutate({ followups_enabled: enabled, steps });
  };

  return (
    <section className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span>
            <span className="block text-sm font-semibold text-foreground">Follow-ups</span>
            <span className="block text-xs text-muted-foreground font-mono">
              {isLoading
                ? "Loading…"
                : enabled && summary
                  ? `${steps.length} follow-up${steps.length === 1 ? "" : "s"}, ${summary}`
                  : "Off, pitches go out on their own"}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            {enabled ? "On" : "Off"}
          </span>
          <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); setExpanded(true); }} />
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-[rgba(255,255,255,0.06)] p-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-lg" />
          ) : !enabled ? (
            <p className="text-sm text-muted-foreground">
              Follow-ups are switched off. Pitches sent from now on will not queue any.
            </p>
          ) : (
            steps.map((step, i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-[rgba(255,255,255,0.06)] p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">Send</span>
                  <Input
                    type="number"
                    min={1}
                    value={step.day}
                    onChange={(e) => update(i, { day: Number(e.target.value) })}
                    className="h-8 w-20 text-xs"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    days after the pitch
                  </span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove follow-up"
                      onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                      className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <RichTextEditor
                  value={step.body}
                  onChange={(html) => update(i, { body: html })}
                  className="[&_[contenteditable]]:min-h-[110px]"
                  placeholder="Write the follow-up…"
                />
              </div>
            ))
          )}

          <div className="flex flex-wrap items-center gap-2">
            {enabled && steps.length < MAX_FOLLOWUP_STEPS && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSteps((prev) => [
                    ...prev,
                    { day: (prev[prev.length - 1]?.day ?? 0) + 4, body: "" },
                  ])
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add a step
              </Button>
            )}
            <Button size="sm" disabled={!dirty || save.isPending} onClick={submit}>
              {save.isPending ? "Saving…" : "Save follow-ups"}
            </Button>
            {enabled && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSteps(DEFAULT_FOLLOWUP_STEPS.map((s) => ({ ...s })))}
              >
                Reset to default
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Saving applies to pitches sent from here on. Anything already queued keeps its own text,
            and you can edit those from the inbox. Your signature is added automatically, so leave it
            out of the message.
          </p>
        </div>
      )}
    </section>
  );
}
