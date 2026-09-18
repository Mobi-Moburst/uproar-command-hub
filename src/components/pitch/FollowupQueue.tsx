import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { RichTextEditor } from "@/components/pitch/RichTextEditor";
import { toEditorHtml } from "@/lib/pitchHtml";
import { useFollowupQueueActions, useScheduledFollowups } from "@/hooks/usePitchInbox";

const dateValue = (iso: string) => new Date(iso).toISOString().slice(0, 10);

export function FollowupQueue({ sendId }: { sendId: string }) {
  const { data: queue, isLoading } = useScheduledFollowups(sendId);
  const { update, skip, stopAll } = useFollowupQueueActions(sendId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");

  if (isLoading) return null;
  if (!queue || queue.length === 0) return null;

  return (
    <div className="border-b border-[rgba(255,255,255,0.06)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Scheduled follow-ups
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[11px]"
          disabled={stopAll.isPending}
          onClick={() => stopAll.mutate()}
        >
          Stop follow-ups
        </Button>
      </div>

      <div className="mt-2 space-y-2">
        {queue.map((f) => {
          const editing = editingId === f.id;
          return (
            <div
              key={f.id}
              className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground font-mono">
                  Step {f.step} · sends {new Date(f.scheduled_for).toLocaleDateString()}
                </p>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => {
                      if (editing) {
                        setEditingId(null);
                        return;
                      }
                      setEditingId(f.id);
                      setBody(toEditorHtml(f.body ?? ""));
                      setDate(dateValue(f.scheduled_for));
                    }}
                  >
                    {editing ? "Cancel" : "Edit"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    disabled={skip.isPending}
                    onClick={() => skip.mutate(f.id)}
                  >
                    Skip this one
                  </Button>
                </div>
              </div>

              {editing ? (
                <div className="mt-2 space-y-2">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-8 w-40 text-xs"
                  />
                  <RichTextEditor
                    value={body}
                    onChange={setBody}
                    className="[&_[contenteditable]]:min-h-[110px]"
                    placeholder="Write the follow-up…"
                  />
                  <Button
                    size="sm"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate(
                        {
                          id: f.id,
                          body,
                          scheduled_for: date
                            ? new Date(`${date}T09:00:00Z`).toISOString()
                            : undefined,
                        },
                        { onSuccess: () => setEditingId(null) },
                      )
                    }
                  >
                    {update.isPending ? "Saving…" : "Save follow-up"}
                  </Button>
                </div>
              ) : (
                <p className="mt-1 line-clamp-2 text-xs text-foreground/80">
                  {(f.body ?? "").replace(/<[^>]*>/g, " ").trim() || "No message"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
