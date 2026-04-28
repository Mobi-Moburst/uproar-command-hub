import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Zap, Radar, ExternalLink, UserCheck, X, Plus, Save, Loader2, Info, Tag } from "lucide-react";
import { usePulseSignals, useClaimSignal, useDismissSignal, useScanPulse, useClientEnrichments, useSaveEnrichment, type PulseSignal } from "@/hooks/usePulse";
import { useAuthContext } from "@/contexts/AuthContext";
import { useClients } from "@/hooks/useClients";
import { EmptyState } from "@/components/EmptyState";

function SignalCard({ signal }: { signal: PulseSignal }) {
  const { user } = useAuthContext();
  const claimMutation = useClaimSignal();
  const dismissMutation = useDismissSignal();

  const isClaimed = !!signal.claimed_by;
  const isClaimedByMe = signal.claimed_by === user?.id;

  const scoreColor = signal.relevance_score >= 75
    ? "text-accent"
    : signal.relevance_score >= 50
    ? "text-brand-yellow"
    : "text-muted-foreground";

  return (
    <Card className="group relative overflow-hidden transition-all hover-lift">
      {/* Relevance indicator bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{
          background: signal.relevance_score >= 75
            ? "hsl(var(--accent))"
            : signal.relevance_score >= 50
            ? "hsl(var(--brand-yellow))"
            : "hsl(var(--muted-foreground))",
        }}
      />

      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="text-[10px] font-mono uppercase shrink-0">
                {signal.client_name}
              </Badge>
              {signal.industry && (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  <Tag className="h-2.5 w-2.5 mr-1" />
                  {signal.industry}
                </Badge>
              )}
              <span className={`ml-auto text-xs font-mono font-semibold ${scoreColor}`}>
                {signal.relevance_score}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-foreground mb-1 leading-tight">
              {signal.headline}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {signal.hook}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[rgba(255,255,255,0.05)]/50">
          {signal.source_url && (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Source
            </a>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {isClaimed ? (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[8px] bg-accent/20 text-accent">
                    {isClaimedByMe ? "ME" : "??"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-muted-foreground">
                  {isClaimedByMe ? "You claimed this" : "Claimed"}
                </span>
              </div>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                  onClick={() => dismissMutation.mutate(signal.id)}
                  disabled={dismissMutation.isPending}
                >
                  <X className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-[11px]"
                  onClick={() => user && claimMutation.mutate({ signalId: signal.id, userId: user.id })}
                  disabled={claimMutation.isPending}
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  Claim
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EnrichmentManager() {
  const { data: enrichments = [] } = useClientEnrichments();
  const { data: clients = [] } = useClients();
  const saveMutation = useSaveEnrichment();

  const [editClient, setEditClient] = useState("");
  const [industries, setIndustries] = useState("");
  const [keywords, setKeywords] = useState("");
  const [competitors, setCompetitors] = useState("");

  // Get client names from placements data, deduplicated
  const clientNames = [...new Set(clients.map((c) => c.name))].sort();

  const handleSelectClient = (name: string) => {
    setEditClient(name);
    // Pre-fill if enrichment already exists
    const found = enrichments.find((en) => en.client_name === name);
    if (found) {
      setIndustries(found.industries.join(", "));
      setKeywords(found.keywords.join(", "));
      setCompetitors(found.competitors.join(", "));
    } else {
      setIndustries("");
      setKeywords("");
      setCompetitors("");
    }
  };

  const handleEdit = (e: any) => {
    handleSelectClient(e.client_name);
  };

  const handleSave = () => {
    if (!editClient.trim()) return;
    saveMutation.mutate({
      client_name: editClient.trim(),
      industries: industries.split(",").map((s) => s.trim()).filter(Boolean),
      keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
      competitors: competitors.split(",").map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            Add industries, keywords, and competitors for each client. The Pulse scanner uses these to find relevant news and generate pitch angles.
          </TooltipContent>
        </Tooltip>
        <span className="text-sm text-muted-foreground">
          Configure what the scanner looks for per client.
        </span>
      </div>

      {/* Enrichment form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Client Name</label>
            <Select value={editClient} onValueChange={handleSelectClient}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clientNames.map((name) => {
                  const hasEnrichment = enrichments.some((en) => en.client_name === name);
                  return (
                    <SelectItem key={name} value={name}>
                      <span className="flex items-center gap-2">
                        {name}
                        {hasEnrichment && (
                          <span className="text-[10px] text-accent">● configured</span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Industries</label>
            <Input
              value={industries}
              onChange={(e) => setIndustries(e.target.value)}
              placeholder="e.g. fintech, payments, crypto"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Keywords</label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. mobile banking, digital wallet"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Competitors</label>
            <Input
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder="e.g. Stripe, Square, PayPal"
              className="h-8 text-sm"
            />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending || !editClient.trim()}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saveMutation.isPending ? "Saving..." : "Save Enrichment"}
          </Button>
        </CardContent>
      </Card>

      {/* Existing enrichments */}
      {enrichments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Configured Clients</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {enrichments.map((e) => (
              <Card
                key={e.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => handleEdit(e)}
              >
                <CardContent className="p-3">
                  <p className="text-sm font-semibold text-foreground mb-1">{e.client_name}</p>
                  <div className="flex flex-wrap gap-1">
                    {e.industries.map((ind) => (
                      <Badge key={ind} variant="secondary" className="text-[10px]">{ind}</Badge>
                    ))}
                    {e.keywords.slice(0, 3).map((kw) => (
                      <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>
                    ))}
                    {e.keywords.length > 3 && (
                      <Badge variant="outline" className="text-[10px]">+{e.keywords.length - 3}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PulsePage() {
  const { data: signals = [], isLoading } = usePulseSignals();
  const { scan, isScanning } = useScanPulse();

  const activeSignals = signals.filter((s) => !s.dismissed);
  const claimedSignals = activeSignals.filter((s) => s.claimed_by);
  const unclaimedSignals = activeSignals.filter((s) => !s.claimed_by);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Pulse Center</h1>
                <p className="text-xs text-muted-foreground">
                  Today's industry signals & pitch opportunities
                </p>
              </div>
            </div>
          </div>

          <Button onClick={scan} disabled={isScanning} className="gap-2">
            {isScanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radar className="h-4 w-4" />
            )}
            {isScanning ? "Scanning..." : "Scan Now"}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="signals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="signals" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Signals
              {unclaimedSignals.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {unclaimedSignals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="claimed" className="gap-1.5">
              <UserCheck className="h-3.5 w-3.5" />
              Claimed
              {claimedSignals.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {claimedSignals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="enrichment" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Client Targeting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : unclaimedSignals.length === 0 ? (
              <EmptyState message="No signals yet — configure client targeting and run a scan to generate today's signals." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {unclaimedSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="claimed" className="space-y-3">
            {claimedSignals.length === 0 ? (
              <EmptyState message="No claimed signals — claim a signal to mark it as yours." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {claimedSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enrichment">
            <EnrichmentManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
