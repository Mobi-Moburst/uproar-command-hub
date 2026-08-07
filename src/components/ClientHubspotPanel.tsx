import { useState } from "react";
import { Building2, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { useClientHubspot } from "@/hooks/useClientHubspot";
import { useMyRoles } from "@/hooks/useMyRoles";
import { ClientHubspotLinkSheet } from "./ClientHubspotLinkSheet";

export function ClientHubspotPanel({ clientName }: { clientName: string }) {
  const { link, snapshot, portalId, isLoading, linkCompany, sync } = useClientHubspot(clientName);
  const { isViewOnly } = useMyRoles();
  const [pickerOpen, setPickerOpen] = useState(false);

  const companyUrl =
    snapshot && portalId
      ? `https://app.hubspot.com/contacts/${portalId}/company/${snapshot.hubspot_company_id}`
      : "";

  const notInHubspot = link?.matched_by === "none";
  const saving = linkCompany.isPending;

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          CRM Account
        </h3>
        <div className="flex items-center gap-2">
          {snapshot && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="h-7 px-2 text-xs"
            >
              {sync.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="ml-1">Sync now</span>
            </Button>
          )}
          {!isViewOnly && (snapshot || notInHubspot) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPickerOpen(true)}
              className="h-7 px-2 text-xs"
            >
              Change
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm font-mono text-muted-foreground">Loading CRM context...</p>
      ) : snapshot ? (
        <div className="space-y-4">
          <div className="rounded-md border border-[rgba(255,255,255,0.05)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{snapshot.company_name}</p>
                <p className="mt-0.5 text-xs font-mono text-muted-foreground">
                  {[snapshot.domain, snapshot.industry, snapshot.city].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              {companyUrl && (
                <a
                  href={companyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  View in HubSpot <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Stage</p>
                <p className="text-xs font-mono text-foreground">{snapshot.lifecycle_stage || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Owner</p>
                <p className="text-xs font-mono text-foreground">{snapshot.owner_name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Last activity</p>
                <p className="text-xs font-mono text-foreground">
                  {snapshot.last_activity_date ? formatDateShort(snapshot.last_activity_date) : "—"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Key contacts</p>
            {snapshot.contacts.length ? (
              <div className="space-y-2">
                {snapshot.contacts.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-[rgba(255,255,255,0.05)] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{c.name || c.email || "Unnamed"}</p>
                      <p className="truncate text-xs font-mono text-muted-foreground">
                        {[c.title, c.email].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    {c.hubspot_url && (
                      <a
                        href={c.hubspot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={`View ${c.name} in HubSpot`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-mono text-muted-foreground">No contacts on this account.</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Deals</p>
            {snapshot.deals.length ? (
              <div className="space-y-2">
                {snapshot.deals.slice(0, 6).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-[rgba(255,255,255,0.05)] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{d.name || "Untitled deal"}</p>
                      <p className="truncate text-xs font-mono text-muted-foreground">
                        {[d.stage, d.close_date ? formatDateShort(d.close_date) : ""]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    {!isViewOnly && d.amount !== null && (
                      <span className="shrink-0 font-mono text-sm text-foreground">
                        {formatCurrency(d.amount)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-mono text-muted-foreground">No deals on this account.</p>
            )}
          </div>
        </div>
      ) : notInHubspot ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-[rgba(255,255,255,0.05)] p-4">
          <p className="text-sm font-mono text-muted-foreground">This client isn't in HubSpot.</p>
          {!isViewOnly && (
            <Button size="sm" variant="ghost" onClick={() => setPickerOpen(true)} className="h-7 px-2 text-xs">
              Link anyway
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-md border border-[rgba(255,255,255,0.05)] p-4">
          <span className="inline-flex items-center rounded-md bg-[rgba(255,255,255,0.06)] px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
            Not linked to CRM
          </span>
          {!isViewOnly && (
            <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)} className="h-7 px-3 text-xs">
              Link now
            </Button>
          )}
        </div>
      )}

      <ClientHubspotLinkSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        clientName={clientName}
        suggestions={link?.suggestions ?? []}
        saving={saving}
        onPick={(id) => {
          linkCompany.mutate(id, { onSuccess: () => setPickerOpen(false) });
        }}
        onNotInHubspot={() => {
          linkCompany.mutate(null, { onSuccess: () => setPickerOpen(false) });
        }}
      />
    </div>
  );
}
