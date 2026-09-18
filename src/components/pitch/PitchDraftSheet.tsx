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
import { Copy, Check, Sparkles, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import type { PitchContact, PitchDraft } from "@/hooks/usePitchPipeline";

interface Props {
  contact: PitchContact | null;
  draft: PitchDraft | undefined;
  isGenerating: boolean;
  isSaving: boolean;
  isArming?: boolean;
  isSending?: boolean;
  claim?: { claimed_by_email: string | null; claimed_at: string } | null;
  isHolder?: boolean;
  gmailAddress?: string | null;
  gmailConnected?: boolean;
  followupSummary?: string | null;
  send?: {
    status: string;
    sent_at: string;
    reply_at?: string | null;
    reply_snippet: string | null;
  } | null;
  onClose: () => void;
  onGenerate: (mode: "custom" | "bulk") => void;
  onSave: (subject: string, body: string) => void;
  onApprove: (approved: boolean) => void;
  onArm?: () => void;
  onSend?: () => void;
  onRelease?: () => void;
}

export function PitchDraftSheet({
  contact,
  draft,
  isGenerating,
  isSaving,
  isArming,
  isSending,
  claim,
  isHolder,
  gmailAddress,
  gmailConnected,
  followupSummary,
  send,
  onClose,
  onGenerate,
  onSave,
  onApprove,
  onArm,
  onSend,
  onRelease,
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
  const armed = draft?.status === "armed";
  const sentAlready = draft?.status === "sent" || !!send;
  const blockedByOther = !!claim && !isHolder;
  const noEmail = !contact?.email;


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
                  variant={approved || armed ? "outline" : "default"}
                  disabled={dirty || armed}
                  onClick={() => onApprove(!approved)}
                >
                  {approved ? "Unapprove" : "Approve"}
                </Button>
                {approved && !armed && !sentAlready && (
                  <Button
                    size="sm"
                    disabled={dirty || isSending || blockedByOther || !gmailConnected || noEmail}
                    onClick={() => onSend?.()}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    {isSending ? "Sending…" : "Approve and send"}
                  </Button>
                )}
                {SHOW_SEQUENCE_ARMING && approved && !armed && !sentAlready && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={dirty || isArming || blockedByOther}
                    onClick={() => onArm?.()}
                  >
                    {isArming ? "Arming…" : "Arm for sequence"}
                  </Button>
                )}
                {claim && isHolder && (
                  <Button size="sm" variant="outline" onClick={() => onRelease?.()}>
                    Release reporter
                  </Button>
                )}
              </div>
              {blockedByOther && (
                <p className="rounded-lg border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 p-3 text-xs text-[hsl(var(--warning))]">
                  {claim?.claimed_by_email || "Someone else"} has an active pitch on this reporter.
                  Wait for it to finish, or ask an admin to release it.
                </p>
              )}
              {send && (
                <p className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3 text-xs text-muted-foreground">
                  {send.status === "replied"
                    ? `Replied on ${new Date(send.reply_at ?? send.sent_at).toLocaleDateString()}. ${send.reply_snippet ?? ""}`
                    : `Sent ${new Date(send.sent_at).toLocaleDateString()}, waiting on a reply.`}
                </p>
              )}
              <p className="text-xs text-muted-foreground font-mono">
                {sentAlready
                  ? "Sent from your Gmail. Follow-ups stop the moment they reply."
                  : noEmail
                    ? "No email address on this reporter, so it cannot be sent from Gmail."
                    : !gmailConnected
                      ? "Connect your Gmail on the account page to send from your own address."
                      : `Approve, then send. It goes out from ${gmailAddress || "your Gmail"}${followupSummary ? `, with follow-ups on ${followupSummary}` : ""}.`}
              </p>


            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
