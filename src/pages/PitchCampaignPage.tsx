import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, X, Sparkles } from "lucide-react";
import {
  usePitchCampaign,
  usePitchContacts,
  useClientGuardrails,
  useHubspotPortalId,
  usePitchDrafts,
  type PitchContact,
} from "@/hooks/usePitchPipeline";
import { MediaListImport } from "@/components/pitch/MediaListImport";
import { PitchContactsTable } from "@/components/pitch/PitchContactsTable";
import { PitchDraftSheet } from "@/components/pitch/PitchDraftSheet";

export default function PitchCampaignPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { data: campaign, isLoading } = usePitchCampaign(campaignId);
  const { contacts, isLoading: contactsLoading, importRows, setExcluded } =
    usePitchContacts(campaignId);
  const { guardrails, addGuardrail, removeGuardrail } = useClientGuardrails(campaign?.client_name);
  const { data: portal } = useHubspotPortalId();
  const [newRule, setNewRule] = useState("");
  const [draftContact, setDraftContact] = useState<PitchContact | null>(null);
  const contactIds = useMemo(() => contacts.map((c) => c.id), [contacts]);
  const { drafts, generate, saveDraft, setStatus } = usePitchDrafts(campaignId, contactIds);
  const activeDraft = draftContact ? drafts[draftContact.id] : undefined;
  const needsDraft = useMemo(
    () => contacts.filter((c) => !c.excluded && !drafts[c.id]).map((c) => c.id),
    [contacts, drafts],
  );

  const counts = useMemo(() => {
    const active = contacts.filter((c) => !c.excluded);
    const flagged = active.filter(
      (c) => (c.warnings ?? []).filter((w) => w.kind !== "duplicate_candidates").length > 0,
    );
    return { total: contacts.length, active: active.length, flagged: flagged.length };
  }, [contacts]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="stripe-gap">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] p-12 text-center">
          <p className="text-sm font-medium text-foreground">Campaign not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/pitch-pipeline")}>
            Back to Pitch Pipeline
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <button
            onClick={() => navigate("/pitch-pipeline")}
            className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono"
          >
            <ArrowLeft className="h-3 w-3" /> Pitch Pipeline
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {campaign.client_name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{campaign.angle}</p>
            </div>
            <MediaListImport
              isImporting={importRows.isPending}
              onImport={(rows) => importRows.mutate(rows)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Reporters", value: counts.total },
            { label: "In play", value: counts.active },
            { label: "Flagged", value: counts.flagged },
            { label: "Drafted", value: Object.keys(drafts).length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Client guardrails</h2>
            <p className="text-xs text-muted-foreground font-mono">
              Explicit do-not-pitch rules for {campaign.client_name} — these outrank anything inferred from email
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="e.g. Never pitch pricing or discount stories"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newRule.trim()) {
                  addGuardrail.mutate({ rule: newRule.trim(), scope: "do_not_pitch" });
                  setNewRule("");
                }
              }}
            />
            <Button
              variant="outline"
              disabled={!newRule.trim()}
              onClick={() => {
                addGuardrail.mutate({ rule: newRule.trim(), scope: "do_not_pitch" });
                setNewRule("");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {guardrails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {guardrails.map((g) => (
                <Badge
                  key={g.id}
                  variant="outline"
                  className="gap-1 border-[rgba(255,255,255,0.14)] py-1 text-xs font-normal"
                >
                  {g.rule}
                  <button
                    aria-label="Remove guardrail"
                    onClick={() => removeGuardrail.mutate(g.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Media list</h2>
            {needsDraft.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={generate.isPending}
                  onClick={() => generate.mutate({ contact_ids: needsDraft, mode: "custom" })}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {generate.isPending ? "Drafting…" : `Draft all (${needsDraft.length})`}
                </Button>
                {campaign.press_release_body && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={generate.isPending}
                    onClick={() => generate.mutate({ contact_ids: needsDraft, mode: "bulk" })}
                  >
                    Bulk from release
                  </Button>
                )}
              </div>
            )}
          </div>
          {contactsLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : contacts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-12 text-center">
              <p className="text-sm font-medium text-foreground">No reporters yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Import a Muck Rack CSV or XLSX. Each reporter is matched or created in the CRM on import,
                so conflicts show up before anyone pitches.
              </p>
            </div>
          ) : (
            <PitchContactsTable
              contacts={contacts}
              portalId={portal?.portal_id}
              drafts={drafts}
              onOpenDraft={(contact) => setDraftContact(contact)}
              onToggleExclude={(contact) =>
                setExcluded.mutate({ id: contact.id, excluded: !contact.excluded })
              }
            />
          )}
        </section>

        <PitchDraftSheet
          contact={draftContact}
          draft={activeDraft}
          isGenerating={generate.isPending}
          isSaving={saveDraft.isPending}
          onClose={() => setDraftContact(null)}
          onGenerate={(mode) =>
            draftContact && generate.mutate({ contact_ids: [draftContact.id], mode })
          }
          onSave={(subject, body) =>
            activeDraft && saveDraft.mutate({ id: activeDraft.id, subject, body })
          }
          onApprove={(approved) =>
            activeDraft &&
            setStatus.mutate({ id: activeDraft.id, status: approved ? "approved" : "draft" })
          }
        />
      </div>
    </DashboardLayout>
  );
}
