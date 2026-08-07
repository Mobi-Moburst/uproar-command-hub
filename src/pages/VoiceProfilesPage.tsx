import { useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMyRoles } from "@/hooks/useMyRoles";
import {
  useVoiceProfiles,
  useCampaignClients,
  useVoicePreview,
  type VoiceProfile,
} from "@/hooks/useVoiceProfiles";
import { usePitchCampaigns } from "@/hooks/usePitchPipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Mic, Plus, Trash2, Sparkles } from "lucide-react";

const GLOBAL_PLACEHOLDER = `Paste your Uproar voice guide here.

Examples of what belongs here:
- Register: direct, reporter-first, no agency puffery
- Sentence length, greeting style, sign-off
- Words and phrases we never use
- How we frame data and exclusives`;

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-6">
      {children}
    </section>
  );
}

export default function VoiceProfilesPage() {
  const { isAdmin, loading: rolesLoading } = useMyRoles();
  const { profiles, save, remove } = useVoiceProfiles();
  const { data: clients } = useCampaignClients();
  const { campaigns } = usePitchCampaigns();
  const preview = useVoicePreview();

  const list = profiles.data ?? [];
  const globalProfile = useMemo(() => list.find((p) => !p.client_name) ?? null, [list]);
  const clientProfiles = useMemo(() => list.filter((p) => p.client_name), [list]);

  const [globalDraft, setGlobalDraft] = useState<string | null>(null);
  const globalValue = globalDraft ?? globalProfile?.guidance ?? "";

  const [editing, setEditing] = useState<Partial<VoiceProfile> | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!rolesLoading && !isAdmin) return <Navigate to="/account" replace />;

  const availableClients = (clients ?? []).filter(
    (c) => !clientProfiles.some((p) => p.client_name === c && p.id !== editing?.id),
  );

  const runPreview = () => {
    if (!previewCampaign) return;
    setPreviewOpen(true);
    preview.mutate({ campaign_id: previewCampaign, voice_override: globalValue });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <header className="space-y-4">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to account
          </Link>
          <div className="flex items-center gap-3">
            <Mic className="h-6 w-6 text-[#b9e045]" />
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Pitch Voice</h1>
              <p className="mt-2 text-sm text-muted-foreground font-mono">
                Voice guidance injected into every AI pitch draft
              </p>
            </div>
          </div>
        </header>

        {profiles.isLoading ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <>
            <Panel>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Uproar house voice</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Applied to every draft. Client guardrails always outrank voice guidance.
                  </p>
                </div>
                {globalProfile && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Updated {new Date(globalProfile.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              <Textarea
                value={globalValue}
                onChange={(e) => setGlobalDraft(e.target.value)}
                placeholder={GLOBAL_PLACEHOLDER}
                className="mt-4 min-h-[320px] font-mono text-xs leading-relaxed"
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() =>
                    save.mutate(
                      {
                        id: globalProfile?.id,
                        client_name: null,
                        name: "Uproar house voice",
                        guidance: globalValue,
                      },
                      { onSuccess: () => setGlobalDraft(null) },
                    )
                  }
                  disabled={save.isPending}
                >
                  {save.isPending ? "Saving…" : "Save voice"}
                </Button>

                <div className="ml-auto flex items-center gap-2">
                  <Select value={previewCampaign} onValueChange={setPreviewCampaign}>
                    <SelectTrigger className="w-[240px]">
                      <SelectValue placeholder="Preview against a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {(campaigns.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.client_name} — {c.angle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={!previewCampaign || preview.isPending}
                    onClick={runPreview}
                  >
                    <Sparkles className="h-4 w-4" />
                    {preview.isPending ? "Drafting…" : "Preview"}
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Client overrides</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Layered on top of the house voice for that client only.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    setEditing({ client_name: "", name: "", guidance: "", active: true })
                  }
                >
                  <Plus className="h-4 w-4" /> Add override
                </Button>
              </div>

              <div className="mt-6 space-y-3">
                {clientProfiles.length === 0 && (
                  <p className="text-sm text-muted-foreground">No client overrides yet.</p>
                )}
                {clientProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-[rgba(255,255,255,0.06)] p-4"
                  >
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setEditing(p)}
                      type="button"
                    >
                      <p className="font-medium text-foreground">{p.client_name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {p.guidance || "Empty"}
                      </p>
                      <p className="mt-2 text-[11px] font-mono text-muted-foreground">
                        {p.active ? "Active" : "Paused"} · updated{" "}
                        {new Date(p.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove.mutate(p.id)}
                      title="Delete override"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        )}
      </div>

      {/* Override editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit override" : "New client override"}</DialogTitle>
            <DialogDescription>
              Tone, vocabulary, and structure notes specific to this client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              {editing?.id ? (
                <Input value={editing.client_name ?? ""} disabled />
              ) : (
                <Select
                  value={editing?.client_name || ""}
                  onValueChange={(v) => setEditing((p) => ({ ...p, client_name: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Voice notes</Label>
              <Textarea
                value={editing?.guidance ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, guidance: e.target.value }))}
                className="min-h-[220px] font-mono text-xs leading-relaxed"
                placeholder="e.g. Never use 'revolutionary'. Founder is quoted as Chef, not CEO. Keep it playful but never punny."
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={editing?.active ?? true}
                onCheckedChange={(v) => setEditing((p) => ({ ...p, active: v }))}
              />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editing?.client_name || save.isPending}
              onClick={() =>
                save.mutate(
                  {
                    id: editing?.id,
                    client_name: editing!.client_name!,
                    name: `${editing!.client_name} voice`,
                    guidance: editing?.guidance ?? "",
                    active: editing?.active ?? true,
                  },
                  { onSuccess: () => setEditing(null) },
                )
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Sample pitch</DialogTitle>
            <DialogDescription>
              Generated with the voice text currently in the editor. Nothing is saved.
            </DialogDescription>
          </DialogHeader>
          {preview.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : preview.data ? (
            <div className="space-y-3">
              <p className="text-[11px] font-mono text-muted-foreground">
                Reporter: {preview.data.contact_name}
              </p>
              <p className="font-semibold text-foreground">{preview.data.subject}</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {preview.data.body}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No preview yet.</p>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
