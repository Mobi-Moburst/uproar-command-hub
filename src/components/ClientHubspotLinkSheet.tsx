import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { useHubspotSearch, type HubspotSuggestion } from "@/hooks/useClientHubspot";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  suggestions: HubspotSuggestion[];
  onPick: (companyId: string) => void;
  onNotInHubspot: () => void;
  saving: boolean;
}

function CompanyCard({
  company,
  onPick,
  disabled,
}: {
  company: HubspotSuggestion;
  onPick: () => void;
  disabled: boolean;
}) {
  const details = [company.domain, company.city, company.industry].filter(Boolean).join(" · ");
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted/40">
      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        className="flex-1 text-left disabled:opacity-50"
      >
        <p className="text-sm font-medium text-foreground">{company.name || "Unnamed company"}</p>
        {details && <p className="mt-0.5 text-xs font-mono text-muted-foreground">{details}</p>}
        {company.owner_name && (
          <p className="mt-0.5 text-xs font-mono text-muted-foreground">Owner: {company.owner_name}</p>
        )}
      </button>
      <div className="flex flex-col items-end gap-2">
        {company.hubspot_url && (
          <a
            href={company.hubspot_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            View in HubSpot <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <Button size="sm" variant="secondary" onClick={onPick} disabled={disabled}>
          This one
        </Button>
      </div>
    </div>
  );
}

export function ClientHubspotLinkSheet({
  open,
  onOpenChange,
  clientName,
  suggestions,
  onPick,
  onNotInHubspot,
  saving,
}: Props) {
  const [term, setTerm] = useState("");
  const search = useHubspotSearch();

  useEffect(() => {
    if (open) {
      setTerm("");
      search.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientName]);

  const results = search.data?.results ?? suggestions;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Which company is {clientName} in HubSpot?</SheetTitle>
          <SheetDescription>
            Pick the company that matches this client. You only have to do this once.
          </SheetDescription>
        </SheetHeader>

        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (term.trim()) search.mutate(term.trim());
          }}
        >
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by a different name..."
          />
          <Button type="submit" variant="secondary" disabled={search.isPending || !term.trim()}>
            {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          {results.length === 0 ? (
            <p className="text-sm font-mono text-muted-foreground">
              No suggestions yet — try searching above.
            </p>
          ) : (
            results.map((c) => (
              <CompanyCard key={c.id} company={c} onPick={() => onPick(c.id)} disabled={saving} />
            ))
          )}
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <Button variant="ghost" className="w-full" onClick={onNotInHubspot} disabled={saving}>
            This client isn't in HubSpot
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
