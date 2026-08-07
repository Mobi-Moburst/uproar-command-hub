import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, EyeOff, Undo2 } from "lucide-react";
import type { PitchContact, PitchWarning } from "@/hooks/usePitchPipeline";

const WARNING_STYLES: Record<string, string> = {
  do_not_pitch: "border-[hsl(var(--coral))]/40 bg-[hsl(var(--coral))]/10 text-[hsl(var(--coral))]",
  recently_pitched: "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  podcast_team: "border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  owned_by_sales: "border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] text-muted-foreground",
  owner_unmatched: "border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] text-muted-foreground",
  possible_duplicate: "border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] text-muted-foreground",
  hubspot_error: "border-[hsl(var(--coral))]/40 bg-[hsl(var(--coral))]/10 text-[hsl(var(--coral))]",
};

function WarningBadge({ warning }: { warning: PitchWarning }) {
  const badge = (
    <Badge
      variant="outline"
      className={`whitespace-nowrap text-[11px] font-medium ${
        WARNING_STYLES[warning.kind] ?? "border-[rgba(255,255,255,0.14)] text-muted-foreground"
      }`}
    >
      {warning.label}
    </Badge>
  );
  if (!warning.detail) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{warning.detail}</TooltipContent>
    </Tooltip>
  );
}

interface Props {
  contacts: PitchContact[];
  portalId?: string | null;
  onToggleExclude: (contact: PitchContact) => void;
}

export function PitchContactsTable({ contacts, portalId, onToggleExclude }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-[rgba(255,255,255,0.08)]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Reporter</TableHead>
            <TableHead>Outlet</TableHead>
            <TableHead>Beat</TableHead>
            <TableHead>Flags</TableHead>
            <TableHead className="w-[110px] text-right">CRM</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const warnings = (contact.warnings ?? []).filter(
              (w) => w.kind !== "duplicate_candidates",
            );
            return (
              <TableRow key={contact.id} className={contact.excluded ? "opacity-40" : undefined}>
                <TableCell>
                  <div className="text-sm font-medium text-foreground">{contact.name || "—"}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {contact.email || "no email on file"}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {contact.outlet || "—"}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                  {contact.beat || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {warnings.length ? (
                      warnings.map((w, i) => <WarningBadge key={`${w.kind}-${i}`} warning={w} />)
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">clear</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {contact.hubspot_contact_id && portalId ? (
                    <a
                      href={`https://app.hubspot.com/contacts/${portalId}/contact/${contact.hubspot_contact_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={contact.excluded ? "Include reporter" : "Exclude reporter"}
                    onClick={() => onToggleExclude(contact)}
                  >
                    {contact.excluded ? (
                      <Undo2 className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
