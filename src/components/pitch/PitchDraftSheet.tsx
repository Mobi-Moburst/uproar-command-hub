import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { PitchContact, PitchDraft } from "@/hooks/usePitchPipeline";

interface Props {
  contact: PitchContact | null;
  draft: PitchDraft | undefined;
  isGenerating: boolean;
  isSaving: boolean;
  onClose: () => void;
  onGenerate: (mode: "custom" | "bulk") => void;
  onSave: (subject: string, body: string) => void;
  onApprove: (approved: boolean) => void;
}

export function PitchDraftSheet({
  contact,
  draft,
  isGenerating,
  isSaving,
  onClose,
  onGenerate,
  onSave,
  onApprove,
}: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSubject(draft?.subject ?? "");
    setBody(draft?.body ?? "");
  }, [draft?.id, draft?.subject, draft?.body]);

  const dirty = !!draft && (subject !== draft.subject || body !== draft.body);
  const approved = draft?.status === "approved";

  const copy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    toast.success("Pitch copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Sheet open={!!contact} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-base">{contact?.name || "Reporter"}</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {[contact?.outlet, contact?.beat].filter(Boolean).join(" · ") || "No outlet on file"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => onGenerate("custom")} disabled={isGenerating}>
              {draft ? <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
              {isGenerating ? "Drafting…" : draft ? "Regenerate" : "Draft pitch"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onGenerate("bulk")}
              disabled={isGenerating}
            >
              Use press release
            </Button>
            {draft && (
              <Badge variant="outline" className="ml-auto text-[11px] font-normal">
                {draft.status} · {draft.mode}
              </Badge>
            )}
          </div>

          {!draft && !isGenerating && (
            <p className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] p-6 text-center text-sm text-muted-foreground">
              No draft yet. Generate one — it uses the campaign angle, the client's hard guardrails,
              recent client emails and 90-day coverage themes.
            </p>
          )}

          {draft && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                  Subject
                </label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                  Body
                </label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[280px] leading-relaxed"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!dirty || isSaving}
                  onClick={() => onSave(subject, body)}
                >
                  {isSaving ? "Saving…" : "Save edits"}
                </Button>
                <Button size="sm" variant="outline" onClick={copy}>
                  {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant={approved ? "outline" : "default"}
                  disabled={dirty}
                  onClick={() => onApprove(!approved)}
                >
                  {approved ? "Unapprove" : "Approve"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Approving marks the pitch ready. Nothing is sent from here — sending lands in the
                next phase.
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
