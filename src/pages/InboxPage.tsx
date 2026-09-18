import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/pitch/RichTextEditor";
import { RefreshCw, Inbox as InboxIcon, Send, Clock, CornerUpLeft } from "lucide-react";
import {
  useCheckReplies,
  useInboxConversations,
  useInboxReply,
  useInboxThread,
  type InboxConversation,
} from "@/hooks/usePitchInbox";
import { useGmailConnection } from "@/hooks/useGmailConnection";

type Filter = "all" | "replied" | "awaiting";

const relative = (iso: string | null) => {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

function ConversationRow({
  c,
  active,
  onClick,
}: {
  c: InboxConversation;
  active: boolean;
  onClick: () => void;
}) {
  const unread = c.status === "replied" && !!c.reply_at;
  return (
    <button
      onClick={onClick}
      className={`w-full border-b border-[rgba(255,255,255,0.05)] px-4 py-3 text-left transition-colors ${
        active ? "bg-[rgba(185,224,69,0.08)]" : "hover:bg-[rgba(255,255,255,0.03)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`truncate text-sm ${unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}
        >
          {c.contact_name}
        </p>
        <span className="shrink-0 text-[11px] text-muted-foreground font-mono">
          {relative(c.reply_at ?? c.sent_at)}
        </span>
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {c.contact_outlet}
        {c.client_name ? ` · ${c.client_name}` : ""}
      </p>
      <p className="mt-1 truncate text-xs text-foreground/70">{c.subject}</p>
      <p className="truncate text-xs text-muted-foreground">
        {c.reply_snippet ?? "No reply yet"}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {c.status === "replied" && (
          <Badge className="bg-[#b9e045] text-[10px] text-black hover:bg-[#b9e045]">Replied</Badge>
        )}
        {c.status === "bounced" && (
          <Badge variant="outline" className="text-[10px]">Bounced</Badge>
        )}
        {c.followups_pending > 0 && (
          <Badge variant="outline" className="gap-1 text-[10px] font-normal">
            <Clock className="h-2.5 w-2.5" />
            {c.followups_pending} follow-up{c.followups_pending === 1 ? "" : "s"} queued
          </Badge>
        )}
      </div>
    </button>
  );
}

export default function InboxPage() {
  const { data: conversations, isLoading } = useInboxConversations();
  const { status: gmail } = useGmailConnection();
  const checkReplies = useCheckReplies();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);

  const list = useMemo(() => {
    const all = conversations ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((c) => {
      if (filter === "replied" && c.status !== "replied") return false;
      if (filter === "awaiting" && c.status === "replied") return false;
      if (!q) return true;
      return [c.contact_name, c.contact_outlet, c.client_name, c.subject, c.recipient_email]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [conversations, filter, search]);

  const active = useMemo(
    () => (conversations ?? []).find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  const thread = useInboxThread(activeId);
  const reply = useInboxReply(activeId);

  const openConversation = (id: string) => {
    setActiveId(id);
    setReplying(false);
    setReplyBody("");
  };

  if (!gmail?.connected) {
    return (
      <DashboardLayout>
        <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] p-12 text-center">
          <InboxIcon className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">Connect your Gmail first</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your pitch conversations live in your own inbox. Connect the account you pitch from.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/account">Go to account settings</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Inbox</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every pitch you have sent, with replies as they land in {gmail.accountEmail}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={checkReplies.isPending}
            onClick={() => checkReplies.mutate()}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${checkReplies.isPending ? "animate-spin" : ""}`} />
            {checkReplies.isPending ? "Checking…" : "Check replies"}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="overflow-hidden rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
            <div className="space-y-2 border-b border-[rgba(255,255,255,0.06)] p-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reporters, outlets, subjects"
                className="h-8 text-xs"
              />
              <div className="flex gap-1">
                {(["all", "awaiting", "replied"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-mono capitalize transition-colors ${
                      filter === f
                        ? "bg-[#b9e045] text-black"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : list.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Nothing here yet. Pitches you send show up in this list.
                </p>
              ) : (
                list.map((c) => (
                  <ConversationRow
                    key={c.id}
                    c={c}
                    active={c.id === activeId}
                    onClick={() => openConversation(c.id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
            {!active ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Pick a conversation to read the whole thread.
              </div>
            ) : (
              <div className="flex max-h-[70vh] flex-col">
                <div className="border-b border-[rgba(255,255,255,0.06)] p-4">
                  <h2 className="text-sm font-semibold text-foreground">{active.subject}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {active.contact_name} ({active.recipient_email})
                    {active.contact_outlet ? ` · ${active.contact_outlet}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {active.followups_pending > 0 ? (
                      <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                        <Clock className="h-2.5 w-2.5" />
                        {active.followups_pending} follow-up{active.followups_pending === 1 ? "" : "s"} still scheduled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        No follow-ups queued
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" asChild>
                      <Link to={`/pitch-pipeline/${active.campaign_id}`}>Open campaign</Link>
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {thread.isLoading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : thread.error ? (
                    <p className="text-sm text-muted-foreground">
                      Could not load this thread: {(thread.error as Error).message}
                    </p>
                  ) : (
                    (thread.data ?? []).map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-lg border p-3 ${
                          m.mine
                            ? "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]"
                            : "border-[rgba(185,224,69,0.25)] bg-[rgba(185,224,69,0.05)]"
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium text-foreground">
                            {m.mine ? "You" : m.from}
                          </p>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {m.date ? new Date(m.date).toLocaleString() : ""}
                          </span>
                        </div>
                        {m.html ? (
                          <div
                            className="prose-pitch text-sm text-foreground/90"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(m.html, { FORBID_TAGS: ["style", "img"] }),
                            }}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm text-foreground/90">
                            {m.text || m.snippet}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-[rgba(255,255,255,0.06)] p-4">
                  {replying ? (
                    <div className="space-y-2">
                      <RichTextEditor
                        value={replyBody}
                        onChange={setReplyBody}
                        className="[&_[contenteditable]]:min-h-[140px]"
                        placeholder={`Reply to ${active.contact_name}`}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={reply.isPending || !replyBody.trim()}
                          onClick={() =>
                            reply.mutate(replyBody, {
                              onSuccess: () => {
                                setReplying(false);
                                setReplyBody("");
                              },
                            })
                          }
                        >
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          {reply.isPending ? "Sending…" : "Send reply"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setReplying(false)}>
                          Cancel
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Replying here cancels any follow-ups still queued for this reporter.
                      </p>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setReplying(true)}>
                      <CornerUpLeft className="mr-1.5 h-3.5 w-3.5" /> Reply
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
